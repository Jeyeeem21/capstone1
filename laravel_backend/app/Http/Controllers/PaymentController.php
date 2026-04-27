<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Sale;
use App\Services\PaymentService;
use App\Http\Resources\PaymentResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * List all payments with filters
     */
    public function index(Request $request)
    {
        $query = Payment::with(['sale.customer', 'installment', 'receivedBy', 'verifiedBy']);

        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('method')) {
            $query->where('payment_method', $request->method);
        }

        if ($request->has('customer_id')) {
            $query->whereHas('sale', function ($q) use ($request) {
                $q->where('customer_id', $request->customer_id);
            });
        }

        if ($request->has('from') && $request->has('to')) {
            $query->whereBetween('paid_at', [$request->from, $request->to]);
        }

        $payments = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => PaymentResource::collection($payments)->response()->getData(true)['data'],
            'meta' => [
                'total' => $payments->total(),
                'per_page' => $payments->perPage(),
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
            ],
        ]);
    }

    /**
     * Show single payment
     */
    public function show(Payment $payment)
    {
        $payment->load(['sale.customer', 'receivedBy', 'verifiedBy', 'installment']);
        return new PaymentResource($payment);
    }

    /**
     * Verify a payment
     */
    public function verify(Request $request, Payment $payment)
    {
        try {
            $this->paymentService->verifyPayment($payment);

            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully',
                'data' => new PaymentResource($payment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Hold a payment
     */
    public function hold(Request $request, Payment $payment)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required_without:notes|string',
            'notes' => 'required_without:reason|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $reason = $request->reason ?? $request->notes;
            $this->paymentService->holdPayment($payment, $reason);

            return response()->json([
                'success' => true,
                'message' => 'Payment put on hold',
                'data' => new PaymentResource($payment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Cancel a payment
     */
    public function cancel(Request $request, Payment $payment)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $this->paymentService->cancelPayment($payment, $request->reason);

            return response()->json([
                'success' => true,
                'message' => 'Payment cancelled',
                'data' => new PaymentResource($payment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Record payment for a sale
     */
    public function recordPayment(Request $request, Sale $sale)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,gcash',
            'reference_number' => 'required_if:payment_method,gcash',
            'payment_proof' => 'array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if amount exceeds balance
        if ($request->amount > $sale->balance_remaining) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount exceeds balance remaining',
            ], 400);
        }

        try {
            $payment = $request->payment_method === 'cash'
                ? $this->paymentService->recordCashPayment($sale, $request->all())
                : $this->paymentService->recordGCashPayment($sale, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'data' => [
                    'payment' => new PaymentResource($payment),
                    'sale' => $sale->fresh(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payment history for a sale
     */
    public function paymentHistory(Sale $sale)
    {
        $payments = $sale->payments()
            ->with(['receivedBy', 'verifiedBy'])
            ->orderBy('paid_at', 'desc')
            ->get();

        return PaymentResource::collection($payments);
    }

    /**
     * Approve a PDO payment
     */
    public function approvePDO(Request $request, Payment $payment)
    {
        if ($payment->payment_method !== 'pdo') {
            return response()->json([
                'success' => false,
                'message' => 'This is not a PDO payment',
            ], 400);
        }

        try {
            $payment->update([
                'pdo_approval_status' => 'approved',
                'verified_by' => auth()->id(),
                'verified_at' => now(),
                'notes' => $request->notes ?? 'PDO approved by admin',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'PDO approved successfully',
                'data' => new PaymentResource($payment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a PDO payment
     */
    public function rejectPDO(Request $request, Payment $payment)
    {
        $validator = Validator::make($request->all(), [
            'notes' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($payment->payment_method !== 'pdo') {
            return response()->json([
                'success' => false,
                'message' => 'This is not a PDO payment',
            ], 400);
        }

        try {
            $payment->update([
                'pdo_approval_status' => 'rejected',
                'status' => 'cancelled',
                'cancel_reason' => $request->notes,
                'verified_by' => auth()->id(),
                'verified_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'PDO rejected',
                'data' => new PaymentResource($payment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
