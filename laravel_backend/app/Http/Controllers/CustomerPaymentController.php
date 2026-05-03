<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitGCashPaymentRequest;
use App\Http\Requests\SubmitPDOPaymentRequest;
use App\Http\Resources\CustomerOrderResource;
use App\Models\PaymentInstallment;
use App\Models\Sale;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomerPaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService
    ) {
        // Middleware is applied in routes/api.php
    }

    /**
     * Get all orders for the authenticated customer
     */
    public function getOrders(Request $request)
    {
        try {
            $customer = auth()->user()->customer;
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer profile not found'
                ], 404);
            }

            $query = Sale::with(['paymentInstallments', 'payments'])
                ->where('customer_id', $customer->id)
                ->where('is_staggered', true);

            // Filter by payment status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('payment_status', $request->status);
            }

            // Paginate results
            $perPage = $request->get('per_page', 10);
            $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => CustomerOrderResource::collection($orders->items()),
                    'pagination' => [
                        'current_page' => $orders->currentPage(),
                        'per_page' => $orders->perPage(),
                        'total' => $orders->total(),
                        'last_page' => $orders->lastPage(),
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch customer orders', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load orders'
            ], 500);
        }
    }

    /**
     * Get detailed information for a specific order
     */
    public function getOrderDetails($orderId)
    {
        try {
            $customer = auth()->user()->customer;
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer profile not found'
                ], 404);
            }

            $order = Sale::with([
                'items.product',
                'paymentInstallments' => function($query) {
                    $query->orderBy('due_date', 'asc');
                },
                'payments' => function($query) {
                    $query->where('status', 'verified')->orderBy('paid_at', 'desc');
                }
            ])
            ->where('id', $orderId)
            ->where('customer_id', $customer->id)
            ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order not found or you do not have permission to access it'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'order' => new CustomerOrderResource($order)
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch order details', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load order details'
            ], 500);
        }
    }

    /**
     * Submit GCash payment for an installment
     */
    public function submitGCashPayment($installmentId, SubmitGCashPaymentRequest $request)
    {
        try {
            $customer = auth()->user()->customer;
            $installment = $this->validateInstallmentOwnership($installmentId, $customer->id);

            // Validate amount matches installment
            if ($request->amount != $installment->amount_expected) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount must match installment amount of ₱' . number_format($installment->amount_expected, 2)
                ], 422);
            }

            // Validate installment is not already paid
            if (in_array($installment->status, ['paid', 'verified'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'This installment has already been paid'
                ], 409);
            }

            // Block payment if order shipping is still pending
            if ($installment->sale?->shipping_fee_status === 'pending') {
                return response()->json(['success' => false, 'message' => 'Cannot accept payment yet. Shipping fee is still pending.'], 422);
            }

            // Record GCash payment
            $payment = $this->paymentService->recordGCashPayment(
                $installment->sale,
                [
                    'installment_id' => $installment->id,
                    'amount' => $request->amount,
                    'reference_number' => $request->reference_number,
                    'payment_proof' => [$request->payment_proof],
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'payment' => [
                        'id' => $payment->id,
                        'amount' => (float) $payment->amount,
                        'payment_method' => $payment->payment_method,
                        'reference_number' => $payment->reference_number,
                        'status' => $payment->status,
                        'paid_at' => $payment->paid_at?->toISOString(),
                    ],
                    'installment' => [
                        'id' => $installment->id,
                        'status' => $installment->fresh()->status,
                        'amount_expected' => (float) $installment->amount_expected,
                    ]
                ],
                'message' => 'Payment submitted successfully. Your payment will be verified by our team within 24 hours.'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to submit GCash payment', [
                'installment_id' => $installmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit payment. Please try again.'
            ], 500);
        }
    }

    /**
     * Submit PDO payment for an installment
     */
    public function submitPDOPayment($installmentId, SubmitPDOPaymentRequest $request)
    {
        try {
            $customer = auth()->user()->customer;
            $installment = $this->validateInstallmentOwnership($installmentId, $customer->id);

            // Validate amount matches installment
            if ($request->amount != $installment->amount_expected) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount must match installment amount of ₱' . number_format($installment->amount_expected, 2)
                ], 422);
            }

            // Validate installment is not already paid or has pending PDO
            if (in_array($installment->status, ['paid', 'verified'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'This installment has already been paid'
                ], 409);
            }

            if ($installment->pdo_approval_status === 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This installment already has a pending PDO submission'
                ], 409);
            }

            // Block payment if order shipping is still pending
            if ($installment->sale?->shipping_fee_status === 'pending') {
                return response()->json(['success' => false, 'message' => 'Cannot accept payment yet. Shipping fee is still pending.'], 422);
            }

            // Record PDO payment
            $this->paymentService->recordPDOPayment(
                $installment->sale,
                $installment,
                [
                    'check_number' => $request->check_number,
                    'bank_name' => $request->bank_name,
                    'check_date' => $request->check_date,
                    'check_image' => [$request->check_image],
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'installment' => [
                        'id' => $installment->id,
                        'status' => $installment->fresh()->status,
                        'pdo_approval_status' => $installment->fresh()->pdo_approval_status,
                        'pdo_check_number' => $installment->fresh()->pdo_check_number,
                        'pdo_check_bank' => $installment->fresh()->pdo_check_bank,
                        'amount_expected' => (float) $installment->amount_expected,
                    ]
                ],
                'message' => 'PDO check submitted successfully. Your check will be reviewed by our team for approval.'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to submit PDO payment', [
                'installment_id' => $installmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit PDO payment. Please try again.'
            ], 500);
        }
    }

    /**
     * Validate that the installment belongs to the customer
     */
    private function validateInstallmentOwnership($installmentId, $customerId)
    {
        $installment = PaymentInstallment::with('sale')
            ->where('id', $installmentId)
            ->whereHas('sale', function($query) use ($customerId) {
                $query->where('customer_id', $customerId);
            })
            ->first();

        if (!$installment) {
            abort(403, 'You do not have permission to access this installment');
        }

        return $installment;
    }
}
