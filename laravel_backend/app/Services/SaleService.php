<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Customer;
use App\Models\StockLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SaleService
{
    private const CACHE_KEY = 'sales_all';
    private const CACHE_TTL = 300;

    /**
     * Get all sales with caching.
     */
    public function getAllSales()
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Sale::with(['customer:id,name', 'items.product.variety', 'payments'])
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Create a new order (POS — no stock deduction, starts as pending).
     */
    public function createOrder(array $data, ?string $newCustomerName = null, ?string $newCustomerContact = null, ?string $newCustomerEmail = null, ?string $newCustomerAddress = null, ?string $newCustomerLandmark = null): Sale
    {
        return DB::transaction(function () use ($data, $newCustomerName, $newCustomerContact, $newCustomerEmail, $newCustomerAddress, $newCustomerLandmark) {
            // If new customer name is provided, create the customer first
            if ($newCustomerName && empty($data['customer_id'])) {
                $customer = Customer::create([
                    'name' => $newCustomerName,
                    'contact' => $newCustomerContact ?? $newCustomerName,
                    'phone' => $newCustomerContact,
                    'email' => $newCustomerEmail,
                    'address' => $newCustomerAddress,
                    'address_landmark' => $newCustomerLandmark,
                    'status' => 'Active',
                ]);
                $data['customer_id'] = $customer->id;

                // Clear customer cache
                Cache::forget('customers_all');
            }

            // Generate transaction ID: ORD-YYYYMMDD-NNN (counter resets yearly, min 3 digits)
            $today = now()->format('Ymd');
            $year = now()->format('Y');
            $count = Sale::whereYear('created_at', $year)->count() + 1;
            $padLength = max(3, strlen((string) $count));
            $transactionId = 'ORD-' . $today . '-' . str_pad($count, $padLength, '0', STR_PAD_LEFT);

            $paymentMethod = $data['payment_method'] ?? 'cash';
            $amountTendered = (float) ($data['amount_tendered'] ?? 0);
            $isStaggered = !empty($data['is_staggered']);

            // Create order header — status = pending, no stock deduction
            $sale = Sale::create([
                'transaction_id' => $transactionId,
                'customer_id' => $data['customer_id'] ?? null,
                'subtotal' => 0,
                'discount' => (float) ($data['discount'] ?? 0),
                'delivery_fee' => (float) ($data['delivery_fee'] ?? 0),
                'total' => 0,
                'amount_tendered' => $amountTendered,
                'change_amount' => 0,
                'payment_method' => $paymentMethod,
                'payment_status' => 'not_paid', // will be updated after total is calculated
                'reference_number' => $data['reference_number'] ?? null,
                // Only save payment_proof to sale if NOT staggered (for backward compatibility)
                // For staggered orders, proof is saved to payments table
                'payment_proof' => !$isStaggered ? ($data['payment_proof'] ?? null) : null,
                'paid_at' => null, // will be set if fully paid
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'distance_km' => $data['distance_km'] ?? null,
                'is_staggered' => $isStaggered,
                'primary_method' => $paymentMethod,
                'amount_paid' => 0,
                'balance_remaining' => 0,
            ]);

            $subtotal = 0;

            // Create items — NO stock deduction
            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                $unitPrice = (float) ($itemData['unit_price'] ?? $product->price);
                if ($unitPrice <= 0) {
                    throw new \Exception("Cannot order \"{$product->name}\" — price is not yet set.");
                }

                $qty = (int) $itemData['quantity'];
                $itemSubtotal = $unitPrice * $qty;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->product_id,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSubtotal,
                ]);

                $subtotal += $itemSubtotal;
            }

            // Compute final totals
            $discount = (float) ($data['discount'] ?? 0);
            $deliveryFee = (float) ($data['delivery_fee'] ?? 0);
            $total = $subtotal - $discount + $deliveryFee;
            
            // For staggered payments, change is calculated against first installment, not total
            // Change will be recalculated after installments are created
            $changeAmount = 0;

            // Determine payment status and balances
            // Staggered orders: balance managed per-installment; skip here
            if ($isStaggered) {
                $paymentStatus = 'not_paid';
                $amountPaid = 0;
                $balanceRemaining = $total;
                $paidAt = null;
            } elseif (in_array($paymentMethod, ['cod', 'pay_later', 'credit', 'pdo'])) {
                // Deferred payment — balance is the full total
                $paymentStatus = 'not_paid';
                $amountPaid = 0;
                $balanceRemaining = $total;
                $paidAt = null;
            } elseif ($amountTendered >= $total && $amountTendered > 0) {
                // Fully paid
                $paymentStatus = 'paid';
                $amountPaid = $total;
                $balanceRemaining = 0;
                $paidAt = now();
            } elseif ($amountTendered > 0) {
                // Partially paid
                $paymentStatus = 'partial';
                $amountPaid = $amountTendered;
                $balanceRemaining = $total - $amountTendered;
                $paidAt = null;
            } else {
                // No payment yet (gcash proof uploaded = needs_verification)
                $paymentStatus = 'not_paid';
                $amountPaid = 0;
                $balanceRemaining = $total;
                $paidAt = null;
            }

            $sale->update([
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'total' => $total,
                'amount_tendered' => $amountTendered,
                'change_amount' => $changeAmount,
                'payment_status' => $paymentStatus,
                'amount_paid' => $amountPaid,
                'balance_remaining' => $balanceRemaining,
                'paid_at' => $paidAt,
            ]);

            // Create initial Payment record (cash/partial cash only)
            // GCash payments will be created via the GCash upload flow with proof
            // PDO payments will be created with check details for admin approval
            if (!$isStaggered && $amountPaid > 0 && $paymentMethod === 'cash') {
                Payment::create([
                    'sale_id' => $sale->id,
                    'amount' => $amountPaid,
                    'payment_method' => 'cash',
                    'status' => 'verified',
                    'received_by' => auth()->id(),
                    'verified_by' => auth()->id(),
                    'verified_at' => now(),
                    'paid_at' => now(),
                    'notes' => 'Initial payment at POS',
                ]);
            } elseif ($paymentMethod === 'pdo' && !empty($data['pdo_check_number'])) {
                // Create PDO payment record for admin approval
                Payment::create([
                    'sale_id' => $sale->id,
                    'amount' => (float) ($data['pdo_amount'] ?? $total),
                    'payment_method' => 'pdo',
                    'status' => 'pending',
                    'pdo_check_number' => $data['pdo_check_number'],
                    'pdo_check_bank' => $data['pdo_bank_name'] ?? null,
                    'pdo_check_date' => $data['pdo_check_date'] ?? null,
                    'pdo_check_image' => $data['pdo_check_image'] ?? null,
                    'pdo_approval_status' => 'pending',
                    'received_by' => auth()->id(),
                    'paid_at' => now(),
                    'notes' => 'PDO payment from POS - awaiting admin approval',
                ]);
            }

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Mark an order as paid (for pay_later / COD orders).
     */
    public function markPaid(int $id, array $data): Sale
    {
        return DB::transaction(function () use ($id, $data) {
            $sale = Sale::findOrFail($id);

            if ($sale->payment_status === 'paid') {
                throw new \Exception('This order is already marked as paid.');
            }

            $updateData = [
                'payment_status' => 'paid',
                'paid_at' => now(),
            ];

            // Allow changing payment method when paying (e.g., pay_later → cash)
            if (!empty($data['payment_method'])) {
                $updateData['payment_method'] = $data['payment_method'];
            }

            if (!empty($data['reference_number'])) {
                $updateData['reference_number'] = $data['reference_number'];
            }

            if (!empty($data['amount_tendered'])) {
                $updateData['amount_tendered'] = (float) $data['amount_tendered'];
                $updateData['change_amount'] = max(0, (float) $data['amount_tendered'] - (float) $sale->total);
            }

            if (!empty($data['payment_proof'])) {
                $updateData['payment_proof'] = $data['payment_proof'];
            }

            $sale->update($updateData);

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Update order status with business logic.
     * Stock is deducted when status changes to 'processing'.
     * Stock is restored when cancelled (if was already deducted).
     */
    public function updateOrderStatus(int $saleId, string $newStatus): Sale
    {
        return DB::transaction(function () use ($saleId, $newStatus) {
            $sale = Sale::with('items.product')->findOrFail($saleId);
            $oldStatus = $sale->status;

            // Idempotent: if already at requested status, return as-is (handles offline sync duplicates)
            if ($oldStatus === $newStatus) {
                return $sale;
            }

            // Valid transitions
            $validTransitions = [
                'pending' => ['processing', 'cancelled'],
                'processing' => ['shipped', 'completed', 'cancelled'],
                'shipped' => ['delivered', 'cancelled'],
                'delivered' => ['return_requested'],
                'picking_up' => ['picked_up'],
                'picked_up' => ['returned'],
            ];

            $allowed = $validTransitions[$oldStatus] ?? [];
            if (!in_array($newStatus, $allowed)) {
                throw new \Exception("Cannot change status from '{$oldStatus}' to '{$newStatus}'.");
            }

            // Deduct stock when moving to 'processing'
            if ($newStatus === 'processing' && $oldStatus === 'pending') {
                foreach ($sale->items as $item) {
                    $product = Product::lockForUpdate()->findOrFail($item->product_id);

                    if ($product->stocks < $item->quantity) {
                        throw new \Exception("Insufficient stock for {$product->product_name}. Available: {$product->stocks}, Requested: {$item->quantity}");
                    }

                    $stockBefore = (int) $product->stocks;
                    $product->stocks -= $item->quantity;
                    $product->save();

                    StockLog::create([
                        'product_id' => $product->product_id,
                        'type' => 'out',
                        'quantity_before' => $stockBefore,
                        'quantity_change' => $item->quantity,
                        'quantity_after' => (int) $product->stocks,
                        'kg_amount' => $product->weight ? $item->quantity * (float) $product->weight : null,
                        'source_type' => 'order',
                        'source_id' => $sale->id,
                        'notes' => "Order processing ({$sale->transaction_id})",
                    ]);
                }

                Cache::forget('products_all');
                Cache::forget('products_featured');
                Cache::forget('stock_logs_all');
            }

            // Restore stock when cancelled (only if stock was already deducted = was processing or beyond)
            if ($newStatus === 'cancelled' && in_array($oldStatus, ['processing', 'shipped'])) {
                foreach ($sale->items as $item) {
                    $product = Product::lockForUpdate()->findOrFail($item->product_id);
                    $stockBefore = (int) $product->stocks;
                    $product->stocks += $item->quantity;
                    $product->save();

                    StockLog::create([
                        'product_id' => $product->product_id,
                        'type' => 'in',
                        'quantity_before' => $stockBefore,
                        'quantity_change' => $item->quantity,
                        'quantity_after' => (int) $product->stocks,
                        'kg_amount' => $product->weight ? $item->quantity * (float) $product->weight : null,
                        'source_type' => 'order_cancelled',
                        'source_id' => $sale->id,
                        'notes' => "Order cancelled ({$sale->transaction_id})",
                    ]);
                }

                Cache::forget('products_all');
                Cache::forget('products_featured');
                Cache::forget('stock_logs_all');
            }

            // Update customer order count on delivery or completion
            if (in_array($newStatus, ['delivered', 'completed']) && $sale->customer_id) {
                $sale->customer()->increment('orders');
            }

            $sale->update(['status' => $newStatus]);
            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Request a return — mark as return_requested (no stock restore yet).
     */
    public function processReturn(int $saleId, string $reason, ?string $notes = null, ?array $proofPaths = null): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $notes, $proofPaths) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if ($sale->status !== 'delivered') {
                throw new \Exception('Only delivered orders can request a return.');
            }

            $sale->update([
                'status' => 'return_requested',
                'return_reason' => $reason,
                'return_notes' => $notes,
                'return_proof' => $proofPaths,
            ]);

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Accept a return — assign pickup driver & date, mark as picking_up.
     * Stock is NOT restored yet — that happens when markReturned is called.
     */
    public function acceptReturn(int $saleId, ?string $pickupDriver = null, ?string $pickupPlate = null, ?string $pickupDate = null): Sale
    {
        return DB::transaction(function () use ($saleId, $pickupDriver, $pickupPlate, $pickupDate) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if ($sale->status !== 'return_requested') {
                throw new \Exception('Only return-requested orders can be accepted.');
            }

            $sale->update([
                'status' => 'picking_up',
                'return_pickup_driver' => $pickupDriver,
                'return_pickup_plate' => $pickupPlate,
                'return_pickup_date' => $pickupDate,
            ]);

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Mark a picked_up order as returned — decrement customer orders.
     */
    public function markReturned(int $saleId): Sale
    {
        return DB::transaction(function () use ($saleId) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if ($sale->status !== 'picked_up') {
                throw new \Exception('Only orders that have been picked up can be marked as returned.');
            }

            // Decrement customer orders
            if ($sale->customer_id) {
                $sale->customer()->decrement('orders');
            }

            $sale->update([
                'status' => 'returned',
            ]);

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Restock selected items from a returned order.
     * Only items that haven't been restocked yet can be restocked.
     */
    public function restockItems(int $saleId, array $items): Sale
    {
        return DB::transaction(function () use ($saleId, $items) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if ($sale->status !== 'returned') {
                throw new \Exception('Only returned orders can have items restocked.');
            }

            // Build lookup: itemId => quantity
            $quantityMap = collect($items)->keyBy('id')->map(fn($i) => (int) $i['quantity']);

            $itemsToRestock = $sale->items->filter(function ($item) use ($quantityMap) {
                return $quantityMap->has($item->id) && !$item->restocked && $quantityMap[$item->id] > 0;
            });

            if ($itemsToRestock->isEmpty()) {
                throw new \Exception('No eligible items to restock.');
            }

            foreach ($itemsToRestock as $item) {
                $quantity = min($quantityMap[$item->id], $item->quantity);
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                $stockBefore = (int) $product->stocks;
                $product->stocks += $quantity;
                $product->save();

                StockLog::create([
                    'product_id' => $product->product_id,
                    'type' => 'in',
                    'quantity_before' => $stockBefore,
                    'quantity_change' => $quantity,
                    'quantity_after' => (int) $product->stocks,
                    'kg_amount' => $product->weight ? $quantity * (float) $product->weight : null,
                    'source_type' => 'order_return',
                    'source_id' => $sale->id,
                    'notes' => "Restocked from return ({$sale->transaction_id}) — {$sale->return_reason}",
                ]);

                $item->update(['restocked' => true]);
            }

            // Log return losses — items returned but not restocked (damaged/unsellable)
            foreach ($sale->items as $item) {
                if ($item->restocked) {
                    $restockedQty = $quantityMap->has($item->id) ? min($quantityMap[$item->id], $item->quantity) : 0;
                    $lossQty = $item->quantity - $restockedQty;
                    if ($lossQty > 0) {
                        $product = Product::find($item->product_id);
                        $currentStock = $product ? (int) $product->stocks : 0;
                        StockLog::create([
                            'product_id' => $item->product_id,
                            'type' => 'out',
                            'quantity_before' => $currentStock,
                            'quantity_change' => $lossQty,
                            'quantity_after' => $currentStock,
                            'kg_amount' => $product && $product->weight ? $lossQty * (float) $product->weight : null,
                            'source_type' => 'return_loss',
                            'source_id' => $sale->id,
                            'notes' => "Damaged/unsellable from return ({$sale->transaction_id}) — {$sale->return_reason}",
                        ]);
                    }
                }
            }

            // Also log items that were skipped entirely (qty set to 0 / unchecked)
            foreach ($sale->items as $item) {
                if (!$item->restocked && !$quantityMap->has($item->id)) {
                    $product = Product::find($item->product_id);
                    $currentStock = $product ? (int) $product->stocks : 0;
                    StockLog::create([
                        'product_id' => $item->product_id,
                        'type' => 'out',
                        'quantity_before' => $currentStock,
                        'quantity_change' => $item->quantity,
                        'quantity_after' => $currentStock,
                        'kg_amount' => $product && $product->weight ? $item->quantity * (float) $product->weight : null,
                        'source_type' => 'return_loss',
                        'source_id' => $sale->id,
                        'notes' => "Damaged/unsellable from return ({$sale->transaction_id}) — {$sale->return_reason}",
                    ]);
                    $item->update(['restocked' => true]); // Mark as handled
                }
            }

            $this->clearCache();
            Cache::forget('products_all');
            Cache::forget('products_featured');
            Cache::forget('stock_logs_all');

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Reject a return — revert to delivered status.
     */
    public function rejectReturn(int $saleId): Sale
    {
        return DB::transaction(function () use ($saleId) {
            $sale = Sale::findOrFail($saleId);

            if ($sale->status !== 'return_requested') {
                throw new \Exception('Only return-requested orders can be rejected.');
            }

            $sale->update([
                'status' => 'delivered',
                'return_reason' => null,
                'return_notes' => null,
                'return_proof' => null,
            ]);

            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Void a sale — restore stock.
     */
    public function voidSale(int $saleId, ?string $reason = null, ?string $voidedBy = null, ?string $authorizedBy = null): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $voidedBy, $authorizedBy) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if ($sale->status === 'voided') {
                throw new \Exception('This sale is already voided.');
            }

            // Restore stock for each item
            foreach ($sale->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                $stockBefore = (int) $product->stocks;
                $product->stocks += $item->quantity;
                $product->save();

                // Log stock return
                StockLog::create([
                    'product_id' => $product->product_id,
                    'type' => 'in',
                    'quantity_before' => $stockBefore,
                    'quantity_change' => $item->quantity,
                    'quantity_after' => (int) $product->stocks,
                    'kg_amount' => $product->weight ? $item->quantity * (float) $product->weight : null,
                    'source_type' => 'sale_void',
                    'source_id' => $sale->id,
                    'notes' => "Voided sale ({$sale->transaction_id})",
                ]);
            }

            // Mark voided
            $sale->update([
                'status' => 'voided',
                'notes' => $reason,
                'voided_by' => $voidedBy,
                'authorized_by' => $authorizedBy,
            ]);

            // Decrement customer orders
            if ($sale->customer_id) {
                $sale->customer()->decrement('orders');
            }

            $this->clearCache();
            Cache::forget('products_all');
            Cache::forget('products_featured');
            Cache::forget('stock_logs_all');

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Get sales stats summary.
     */
    public function getStats(): array
    {
        $sales = $this->getAllSales();
        $completed = $sales->whereIn('status', ['completed', 'delivered']);

        return [
            'total_sales' => (float) $completed->sum('total'),
            'total_transactions' => $completed->count(),
            'total_items_sold' => $completed->sum(fn ($s) => $s->items->sum('quantity')),
            'avg_transaction' => $completed->count() > 0
                ? round((float) $completed->sum('total') / $completed->count(), 2)
                : 0,
            'voided_count' => $sales->where('status', 'voided')->count(),
            'returned_count' => $sales->where('status', 'returned')->count(),
            'cancelled_count' => $sales->where('status', 'cancelled')->count(),
        ];
    }

    /**
     * Get per-product sales data for growth analysis.
     */
    public function getProductSalesGrowth(string $period = 'monthly', ?string $customStart = null, ?string $customEnd = null, ?string $month = null, ?int $year = null, ?int $yearFrom = null, ?int $yearTo = null): array
    {
        // Determine current and previous period date ranges
        $now = now();

        if ($period === 'custom' && $customStart && $customEnd) {
            $currentStart = \Carbon\Carbon::parse($customStart)->startOfDay();
            $currentEnd   = \Carbon\Carbon::parse($customEnd)->endOfDay();
            // Previous period = same duration before the custom range
            $durationDays = $currentStart->diffInDays($currentEnd) + 1;
            $previousEnd   = $currentStart->copy()->subDay()->endOfDay();
            $previousStart = $previousEnd->copy()->subDays($durationDays - 1)->startOfDay();
        } else {
            switch ($period) {
                case 'daily':
                case 'weekly':
                    // If month param provided, compare that month vs previous month
                    if ($month) {
                        $parts = explode('-', $month);
                        $ref = \Carbon\Carbon::create((int)$parts[0], (int)$parts[1], 1);
                        $currentStart = $ref->copy()->startOfMonth();
                        $currentEnd   = $ref->copy()->endOfMonth();
                        $previousStart = $ref->copy()->subMonth()->startOfMonth();
                        $previousEnd   = $ref->copy()->subMonth()->endOfMonth();
                    } else {
                        if ($period === 'daily') {
                            $currentStart = $now->copy()->startOfDay();
                            $currentEnd   = $now->copy()->endOfDay();
                            $previousStart = $now->copy()->subDay()->startOfDay();
                            $previousEnd   = $now->copy()->subDay()->endOfDay();
                        } else {
                            $currentStart = $now->copy()->startOfWeek();
                            $currentEnd   = $now->copy()->endOfWeek();
                            $previousStart = $now->copy()->subWeek()->startOfWeek();
                            $previousEnd   = $now->copy()->subWeek()->endOfWeek();
                        }
                    }
                    break;
                case 'monthly':
                    $refYear = $year ?? $now->year;
                    $currentStart = \Carbon\Carbon::create($refYear, 1, 1)->startOfYear();
                    $currentEnd   = \Carbon\Carbon::create($refYear, 12, 31)->endOfYear();
                    $previousStart = \Carbon\Carbon::create($refYear - 1, 1, 1)->startOfYear();
                    $previousEnd   = \Carbon\Carbon::create($refYear - 1, 12, 31)->endOfYear();
                    break;
                case 'bi-annually':
                    $refYear = $year ?? $now->year;
                    $refMonth = $year ? 7 : $now->month; // If explicit year, default to H2 comparison
                    if ($refMonth <= 6) {
                        $currentStart = \Carbon\Carbon::create($refYear, 1, 1)->startOfDay();
                        $currentEnd   = \Carbon\Carbon::create($refYear, 6, 30)->endOfDay();
                        $previousStart = \Carbon\Carbon::create($refYear - 1, 7, 1)->startOfDay();
                        $previousEnd   = \Carbon\Carbon::create($refYear - 1, 12, 31)->endOfDay();
                    } else {
                        $currentStart = \Carbon\Carbon::create($refYear, 7, 1)->startOfDay();
                        $currentEnd   = \Carbon\Carbon::create($refYear, 12, 31)->endOfDay();
                        $previousStart = \Carbon\Carbon::create($refYear, 1, 1)->startOfDay();
                        $previousEnd   = \Carbon\Carbon::create($refYear, 6, 30)->endOfDay();
                    }
                    break;
                case 'annually':
                default:
                    $fromY = $yearFrom ?? ($now->year - 1);
                    $toY   = $yearTo ?? $now->year;
                    $currentStart = \Carbon\Carbon::create($toY, 1, 1)->startOfYear();
                    $currentEnd   = \Carbon\Carbon::create($toY, 12, 31)->endOfYear();
                    $previousStart = \Carbon\Carbon::create($fromY, 1, 1)->startOfYear();
                    $previousEnd   = \Carbon\Carbon::create($fromY, 12, 31)->endOfYear();
                    break;
            }
        }

        // Fetch sales covering both periods
        $sales = Sale::with(['items.product.variety'])
            ->whereIn('status', ['completed', 'delivered'])
            ->where('created_at', '>=', $previousStart)
            ->orderBy('created_at', 'desc')
            ->get();

        $productData = [];
        foreach ($sales as $sale) {
            $saleDate = $sale->created_at;
            $isCurrent  = $saleDate->between($currentStart, $currentEnd);
            $isPrevious = $saleDate->between($previousStart, $previousEnd);

            if (!$isCurrent && !$isPrevious) continue;

            foreach ($sale->items as $item) {
                $pid = $item->product_id;
                if (!isset($productData[$pid])) {
                    $productData[$pid] = [
                        'product_id'    => $pid,
                        'product_name'  => $item->product?->product_name ?? 'Unknown',
                        'variety_name'  => $item->product?->variety?->name ?? 'Unknown',
                        'variety_color' => $item->product?->variety?->color ?? '#6B7280',
                        'current_stock' => (int) ($item->product?->stocks ?? 0),
                        'current_qty'   => 0,
                        'previous_qty'  => 0,
                        'current_revenue'  => 0,
                        'previous_revenue' => 0,
                    ];
                }

                if ($isCurrent) {
                    $productData[$pid]['current_qty']     += (int) $item->quantity;
                    $productData[$pid]['current_revenue'] += (float) $item->subtotal;
                } elseif ($isPrevious) {
                    $productData[$pid]['previous_qty']     += (int) $item->quantity;
                    $productData[$pid]['previous_revenue'] += (float) $item->subtotal;
                }
            }
        }

        // Calculate growth percentages and stock_before
        foreach ($productData as &$p) {
            // stock_before = current stock + units sold in current period
            // (because selling reduced the stock, adding back gives us stock before sales)
            $p['stock_before'] = $p['current_stock'] + $p['current_qty'];

            // Quantity growth
            if ($p['previous_qty'] > 0) {
                $p['qty_growth'] = round((($p['current_qty'] - $p['previous_qty']) / $p['previous_qty']) * 100, 1);
            } else {
                $p['qty_growth'] = $p['current_qty'] > 0 ? 100.0 : 0.0;
            }

            // Revenue growth
            if ($p['previous_revenue'] > 0) {
                $p['revenue_growth'] = round((($p['current_revenue'] - $p['previous_revenue']) / $p['previous_revenue']) * 100, 1);
            } else {
                $p['revenue_growth'] = $p['current_revenue'] > 0 ? 100.0 : 0.0;
            }

            // Trend: up, down, stable
            $p['trend'] = $p['qty_growth'] > 0 ? 'up' : ($p['qty_growth'] < 0 ? 'down' : 'stable');
        }
        unset($p);

        // Sort by current revenue descending
        $result = array_values($productData);
        usort($result, fn($a, $b) => $b['current_revenue'] <=> $a['current_revenue']);

        return [
            'products' => $result,
            'period' => $period,
            'current_range' => [
                'start' => $currentStart->toDateString(),
                'end'   => $currentEnd->toDateString(),
            ],
            'previous_range' => [
                'start' => $previousStart->toDateString(),
                'end'   => $previousEnd->toDateString(),
            ],
        ];
    }

    /**
     * Clear sales cache.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        DashboardService::clearStatsCache();
    }
}
