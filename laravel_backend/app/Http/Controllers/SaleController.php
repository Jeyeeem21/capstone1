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
                'items.*.unit_price' => 'required|numeric|min:0',
                'customer_id' => 'nullable|integer|exists:customers,id',
                'new_customer_name' => 'nullable|string|max:255',
                'new_customer_contact' => 'nullable|string|max:255',
                'new_customer_email' => 'nullable|email|max:255',
                'discount' => 'nullable|numeric|min:0',
                'amount_tendered' => 'nullable|numeric|min:0',
                'payment_method' => 'nullable|string|in:cash,gcash,cod,pay_later',
                'reference_number' => 'nullable|string',
                'notes' => 'nullable|string|max:500',
                'delivery_address' => 'nullable|string|max:500',
            ]);

            $newCustomerName = $validated['new_customer_name'] ?? null;
            $newCustomerContact = $validated['new_customer_contact'] ?? null;
            $newCustomerEmail = $validated['new_customer_email'] ?? null;
            unset($validated['new_customer_name'], $validated['new_customer_contact'], $validated['new_customer_email']);

            $sale = $this->saleService->createOrder($validated, $newCustomerName, $newCustomerContact, $newCustomerEmail);

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
                'status' => 'required|string|in:pending,processing,shipped,delivered,return_requested,returned,cancelled',
            ]);

            $sale = $this->saleService->updateOrderStatus($id, $validated['status']);

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
     * Process a return.
     */
    public function processReturn(int $id, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'return_reason' => 'required|string|max:255',
                'return_notes' => 'nullable|string|max:500',
            ]);

            $sale = $this->saleService->processReturn($id, $validated['return_reason'], $validated['return_notes'] ?? null);

            $this->logAudit('UPDATE', 'Orders', "Processed return for order #{$sale->transaction_id}", [
                'sale_id' => $sale->id,
                'reason' => $validated['return_reason'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Return processed successfully',
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
     * Void a sale.
     */
    public function void(int $id, Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            // If user is NOT super_admin, require super admin password
            if ($user->role !== 'super_admin') {
                $request->validate([
                    'admin_password' => 'required|string',
                ]);

                // Find a super_admin user and verify the password
                $superAdmin = \App\Models\User::where('role', 'super_admin')->first();
                if (!$superAdmin || !\Illuminate\Support\Facades\Hash::check($request->admin_password, $superAdmin->password)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid Super Admin password.',
                    ], 403);
                }
            }

            $sale = $this->saleService->voidSale($id);

            $this->logAudit('DELETE', 'Sales', "Voided sale #{$sale->id}", [
                'sale_id' => $sale->id,
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
    public function productGrowth(): JsonResponse
    {
        try {
            $data = $this->saleService->getProductSalesGrowth();
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
}
