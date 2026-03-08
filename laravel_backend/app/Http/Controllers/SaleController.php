<?php

namespace App\Http\Controllers;

use App\Http\Resources\SaleResource;
use App\Services\SaleService;
use App\Traits\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    use AuditLogger;
    public function __construct(
        private SaleService $saleService
    ) {}

    /**
     * Get all sales.
     */
    public function index(): JsonResponse
    {
        try {
            $sales = $this->saleService->getAllSales();
            return response()->json([
                'success' => true,
                'data' => SaleResource::collection($sales),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sales',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new order (POS — pending, no stock deduction).
     */
    public function storeOrder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|integer|exists:products,product_id',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'required|numeric|min:0.01',
                'customer_id' => 'nullable|integer|exists:customers,id',
                'new_customer_name' => 'nullable|string|max:255',
                'new_customer_contact' => 'nullable|string|max:255',
                'new_customer_email' => 'nullable|email|max:255',
                'discount' => 'nullable|numeric|min:0',
                'amount_tendered' => 'nullable|numeric|min:0',
                'payment_method' => 'nullable|string|in:cash,gcash,cod,pay_later',
                'reference_number' => 'nullable|string',
                'payment_proof' => 'nullable|array',
                'payment_proof.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'notes' => 'nullable|string|max:500',
                'delivery_address' => 'nullable|string|max:500',
                'delivery_fee' => 'nullable|numeric|min:0',
                'distance_km' => 'nullable|numeric|min:0',
            ]);

            // Handle payment proof file uploads (GCash screenshots)
            if ($request->hasFile('payment_proof')) {
                $proofPaths = [];
                foreach ($request->file('payment_proof') as $file) {
                    $proofPaths[] = $file->store('payment_proofs', 'public');
                }
                $validated['payment_proof'] = $proofPaths;
            }

            $newCustomerName = $validated['new_customer_name'] ?? null;
            $newCustomerContact = $validated['new_customer_contact'] ?? null;
            $newCustomerEmail = $validated['new_customer_email'] ?? null;
            unset($validated['new_customer_name'], $validated['new_customer_contact'], $validated['new_customer_email']);

            $sale = $this->saleService->createOrder($validated, $newCustomerName, $newCustomerContact, $newCustomerEmail);

            // Log audit for inline customer creation
            if ($newCustomerName && $sale->customer_id) {
                $this->logAudit('CREATE', 'Customer', "Created customer (via POS): {$newCustomerName}", [
                    'customer_id' => $sale->customer_id,
                    'name' => $newCustomerName,
                    'source' => 'inline_pos',
                ]);
            }

            $this->logAudit('CREATE', 'Orders', "Created order #{$sale->transaction_id} — ₱" . number_format($sale->total, 2), [
                'sale_id' => $sale->id,
                'total' => $sale->total,
                'items_count' => count($validated['items']),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => new SaleResource($sale),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Update order status.
     */
    public function updateStatus(int $id, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|string|in:pending,processing,shipped,delivered,completed,return_requested,picking_up,returned,cancelled',
                'driver_name' => 'nullable|string|max:255',
                'driver_plate_number' => 'nullable|string|max:20',
            ]);

            $sale = $this->saleService->updateOrderStatus($id, $validated['status']);

            // Save driver info when shipping
            if ($validated['status'] === 'shipped') {
                $sale->update([
                    'driver_name' => $validated['driver_name'] ?? null,
                    'driver_plate_number' => $validated['driver_plate_number'] ?? null,
                ]);
            }

            $this->logAudit('UPDATE', 'Orders', "Updated order #{$sale->transaction_id} status to {$validated['status']}", [
                'sale_id' => $sale->id,
                'new_status' => $validated['status'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order status updated successfully',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Request a return (sets status to return_requested).
     */
    public function processReturn(int $id, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'return_reason' => 'required|string|max:255',
                'return_notes' => 'nullable|string|max:500',
                'return_proof' => 'nullable|array',
                'return_proof.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            ]);

            $proofPaths = [];
            if ($request->hasFile('return_proof')) {
                foreach ($request->file('return_proof') as $file) {
                    $proofPaths[] = $file->store('return-proofs', 'public');
                }
            }

            $sale = $this->saleService->processReturn($id, $validated['return_reason'], $validated['return_notes'] ?? null, $proofPaths ?: null);

            $this->logAudit('UPDATE', 'Orders', "Return requested for order #{$sale->transaction_id}", [
                'sale_id' => $sale->id,
                'reason' => $validated['return_reason'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Return request submitted successfully',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Accept a return — assign pickup driver, restore stock, mark returned.
     */
    public function acceptReturn(int $id, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'pickup_driver' => 'nullable|string|max:255',
                'pickup_plate' => 'nullable|string|max:20',
                'pickup_date' => 'nullable|date',
            ]);

            $sale = $this->saleService->acceptReturn(
                $id,
                $validated['pickup_driver'] ?? null,
                $validated['pickup_plate'] ?? null,
                $validated['pickup_date'] ?? null
            );

            $this->logAudit('UPDATE', 'Orders', "Return accepted for order #{$sale->transaction_id}. Pickup assigned.", [
                'sale_id' => $sale->id,
                'pickup_driver' => $validated['pickup_driver'] ?? null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Return accepted. Pickup driver assigned.',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Reject a return — revert to delivered.
     */
    public function rejectReturn(int $id): JsonResponse
    {
        try {
            $sale = $this->saleService->rejectReturn($id);

            $this->logAudit('UPDATE', 'Orders', "Return rejected for order #{$sale->transaction_id}. Reverted to delivered.", [
                'sale_id' => $sale->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Return rejected. Order reverted to delivered.',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get a single sale.
     */
    public function markReturned(int $id): JsonResponse
    {
        try {
            $sale = $this->saleService->markReturned($id);

            $this->logAudit('UPDATE', 'Orders', "Order #{$sale->transaction_id} marked as returned. Stock not yet restored — awaiting manual restock.", [
                'sale_id' => $sale->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order marked as returned. Use "Restock Items" to restore stock for items in good condition.',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Restock selected items from a returned order.
     */
    public function restockItems(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.id' => 'required|integer|exists:sale_items,id',
                'items.*.quantity' => 'required|integer|min:1',
            ]);

            $sale = $this->saleService->restockItems($id, $validated['items']);

            $this->logAudit('UPDATE', 'Orders', "Restocked " . count($validated['items']) . " item(s) from returned order #{$sale->transaction_id}.", [
                'sale_id' => $sale->id,
                'items' => $validated['items'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Selected items have been restocked.',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get a single sale.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $sale = \App\Models\Sale::with(['customer', 'items.product.variety'])->findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => new SaleResource($sale),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sale not found',
            ], 404);
        }
    }

    /**
     * Mark an order as paid.
     */
    public function markPaid(int $id, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'payment_method' => 'required|string|in:cash,gcash',
                'reference_number' => 'nullable|string',
                'amount_tendered' => 'nullable|numeric|min:0',
                'payment_proof' => 'nullable|array',
                'payment_proof.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            $data = [
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'amount_tendered' => $validated['amount_tendered'] ?? null,
            ];

            // Handle payment proof file uploads
            if ($request->hasFile('payment_proof')) {
                $proofPaths = [];
                foreach ($request->file('payment_proof') as $file) {
                    $proofPaths[] = $file->store('payment_proofs', 'public');
                }
                $data['payment_proof'] = $proofPaths;
            }

            $sale = $this->saleService->markPaid($id, $data);

            $this->logAudit('UPDATE', 'Orders', "Marked order #{$sale->transaction_id} as paid via {$validated['payment_method']}", [
                'sale_id' => $sale->id,
                'payment_method' => $validated['payment_method'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Void a sale.
     */
    public function void(int $id, Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            // Super Admin & Admin can use their own password; Secretary needs admin/super_admin password
            if ($user->role === 'super_admin' || $user->role === 'admin') {
                // Admin or Super Admin must confirm with their own password
                $request->validate([
                    'admin_password' => 'required|string',
                ]);

                if (!\Illuminate\Support\Facades\Hash::check($request->admin_password, $user->password)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Incorrect password.',
                    ], 403);
                }
            } else {
                // Staff/Secretary must provide an admin or super_admin password
                $request->validate([
                    'admin_password' => 'required|string',
                ]);

                // Try to match against any super_admin or admin user
                $authorizedUser = \App\Models\User::whereIn('role', ['super_admin', 'admin'])
                    ->where('status', 'active')
                    ->get()
                    ->first(function ($admin) use ($request) {
                        return \Illuminate\Support\Facades\Hash::check($request->admin_password, $admin->password);
                    });

                if (!$authorizedUser) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid Admin/Super Admin password.',
                    ], 403);
                }
            }

            $voidedBy = $user->name;
            $authorizedBy = isset($authorizedUser) ? $authorizedUser->name : $user->name;

            $sale = $this->saleService->voidSale($id, $request->reason, $voidedBy, $authorizedBy);

            $this->logAudit('DELETE', 'Sales', "Voided order #{$sale->transaction_id}" . ($request->reason ? " — Reason: {$request->reason}" : ''), [
                'sale_id' => $sale->id,
                'transaction_id' => $sale->transaction_id,
                'reason' => $request->reason,
                'voided_by' => $voidedBy,
                'authorized_by' => $authorizedBy,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sale voided successfully',
                'data' => new SaleResource($sale),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get sales statistics.
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = $this->saleService->getStats();
            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats',
            ], 500);
        }
    }

    /**
     * Get per-product sales for growth analysis.
     */
    public function productGrowth(Request $request): JsonResponse
    {
        try {
            $period = $request->query('period', 'monthly');
            $customStart = $request->query('custom_start');
            $customEnd = $request->query('custom_end');
            $data = $this->saleService->getProductSalesGrowth($period, $customStart, $customEnd);
            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch product growth data',
            ], 500);
        }
    }

    /**
     * Check if a GCash reference number is already used.
     */
    public function checkReference(Request $request): JsonResponse
    {
        $request->validate(['reference_number' => 'required|string']);
        $exists = \App\Models\Sale::where('reference_number', $request->reference_number)->exists();
        return response()->json([
            'success' => true,
            'data' => ['available' => !$exists],
        ]);
    }
}
