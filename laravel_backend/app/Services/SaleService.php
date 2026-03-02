<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
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
            return Sale::with(['customer', 'items.product.variety'])
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Create a new order (POS — no stock deduction, starts as pending).
     */
    public function createOrder(array $data, ?string $newCustomerName = null, ?string $newCustomerContact = null, ?string $newCustomerEmail = null): Sale
    {
        return DB::transaction(function () use ($data, $newCustomerName, $newCustomerContact, $newCustomerEmail) {
            // If new customer name is provided, create the customer first
            if ($newCustomerName && empty($data['customer_id'])) {
                $customer = Customer::create([
                    'name' => $newCustomerName,
                    'contact' => $newCustomerContact ?? $newCustomerName,
                    'phone' => $newCustomerContact,
                    'email' => $newCustomerEmail,
                    'address' => null,
                    'status' => 'Active',
                ]);
                $data['customer_id'] = $customer->id;

                // Clear customer cache
                Cache::forget('customers_all');
            }

            // Generate transaction ID: ORD-YYYYMMDD-NNN
            $today = now()->format('Ymd');
            $count = Sale::whereDate('created_at', now()->toDateString())->count() + 1;
            $transactionId = 'ORD-' . $today . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);

            // Create order header — status = pending, no stock deduction
            $sale = Sale::create([
                'transaction_id' => $transactionId,
                'customer_id' => $data['customer_id'] ?? null,
                'subtotal' => 0,
                'discount' => (float) ($data['discount'] ?? 0),
                'total' => 0,
                'amount_tendered' => (float) ($data['amount_tendered'] ?? 0),
                'change_amount' => 0,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_number' => $data['reference_number'] ?? null,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
            ]);

            $subtotal = 0;

            // Create items — NO stock deduction
            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                $qty = (int) $itemData['quantity'];
                $unitPrice = (float) ($itemData['unit_price'] ?? $product->price);
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

            // Update totals
            $discount = (float) ($data['discount'] ?? 0);
            $total = $subtotal - $discount;
            $amountTendered = (float) ($data['amount_tendered'] ?? 0);
            $changeAmount = $amountTendered > 0 ? max(0, $amountTendered - $total) : 0;

            $sale->update([
                'subtotal' => $subtotal,
                'total' => $total,
                'amount_tendered' => $amountTendered,
                'change_amount' => $changeAmount,
            ]);

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

            // Valid transitions
            $validTransitions = [
                'pending' => ['processing', 'cancelled'],
                'processing' => ['shipped', 'cancelled'],
                'shipped' => ['delivered', 'cancelled'],
                'delivered' => ['return_requested'],
                'return_requested' => ['returned', 'delivered'],
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

            // Update customer order count on delivery
            if ($newStatus === 'delivered' && $sale->customer_id) {
                $sale->customer()->increment('orders');
            }

            $sale->update(['status' => $newStatus]);
            $this->clearCache();

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Process a return — restore stock + mark returned.
     */
    public function processReturn(int $saleId, string $reason, ?string $notes = null): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $notes) {
            $sale = Sale::with('items.product')->findOrFail($saleId);

            if (!in_array($sale->status, ['delivered', 'return_requested'])) {
                throw new \Exception('Only delivered or return-requested orders can be returned.');
            }

            // Restore stock
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
                    'source_type' => 'order_return',
                    'source_id' => $sale->id,
                    'notes' => "Order returned ({$sale->transaction_id}) — {$reason}",
                ]);
            }

            // Decrement customer orders
            if ($sale->customer_id) {
                $sale->customer()->decrement('orders');
            }

            $sale->update([
                'status' => 'returned',
                'return_reason' => $reason,
                'return_notes' => $notes,
            ]);

            $this->clearCache();
            Cache::forget('products_all');
            Cache::forget('products_featured');
            Cache::forget('stock_logs_all');

            return $sale->load(['customer', 'items.product.variety']);
        });
    }

    /**
     * Void a sale — restore stock.
     */
    public function voidSale(int $saleId): Sale
    {
        return DB::transaction(function () use ($saleId) {
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
            $sale->update(['status' => 'voided']);

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
    public function getProductSalesGrowth(): array
    {
        $sales = Sale::with(['items.product.variety'])
            ->whereIn('status', ['completed', 'delivered'])
            ->orderBy('created_at', 'desc')
            ->get();

        $productData = [];
        foreach ($sales as $sale) {
            foreach ($sale->items as $item) {
                $pid = $item->product_id;
                if (!isset($productData[$pid])) {
                    $productData[$pid] = [
                        'product_id' => $pid,
                        'product_name' => $item->product?->product_name ?? 'Unknown',
                        'variety_name' => $item->product?->variety?->name ?? 'Unknown',
                        'variety_color' => $item->product?->variety?->color ?? '#6B7280',
                        'current_stock' => (int) ($item->product?->stocks ?? 0),
                        'sales' => [],
                    ];
                }
                $productData[$pid]['sales'][] = [
                    'quantity' => (int) $item->quantity,
                    'subtotal' => (float) $item->subtotal,
                    'date' => $sale->created_at->toISOString(),
                ];
            }
        }

        return array_values($productData);
    }

    /**
     * Clear sales cache.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
