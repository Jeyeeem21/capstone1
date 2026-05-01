<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\PaymentInstallment;
use App\Services\StaggeredPaymentService;
use App\Services\PaymentService;
use App\Services\EmailService;
use App\Http\Resources\PaymentInstallmentResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StaggeredPaymentController extends Controller
{
    protected $staggeredPaymentService;
    protected $paymentService;
    protected $emailService;

    public function __construct(
        StaggeredPaymentService $staggeredPaymentService,
        PaymentService $paymentService,
        EmailService $emailService
    ) {
        $this->staggeredPaymentService = $staggeredPaymentService;
        $this->paymentService = $paymentService;
        $this->emailService = $emailService;
    }

    /**
     * List all payment plans
     */
    public function index(Request $request)
    {
        $query = Sale::where('is_staggered', true)
            ->with(['customer', 'paymentInstallments']);

        // Filters
        if ($request->has('status')) {
            $query->where('payment_status', $request->status);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('from') && $request->has('to')) {
            $query->whereBetween('created_at', [$request->from, $request->to]);
        }

        $sales = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        // Transform data to include installments
        $data = collect($sales->items())->map(function ($sale) {
            return [
                'id' => $sale->id,
                'transaction_id' => $sale->transaction_id,
                'customer' => $sale->customer,
                'customer_name' => $sale->customer->name ?? 'Walk-in',
                'total' => $sale->total,
                'amount_paid' => $sale->amount_paid,
                'balance_remaining' => $sale->balance_remaining,
                'payment_status' => $sale->payment_status,
                'payment_installments' => PaymentInstallmentResource::collection($sale->paymentInstallments),
                'created_at' => $sale->created_at,
                'updated_at' => $sale->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'total' => $sales->total(),
                'per_page' => $sales->perPage(),
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
            ],
        ]);
    }

    /**
     * Create payment schedule
     */
    public function store(Request $request, Sale $sale)
    {
        $validator = Validator::make($request->all(), [
            'installments' => 'required|array|min:1',
            'installments.*.installment_number' => 'required|integer|min:1',
            'installments.*.amount' => 'required|numeric|min:0.01',
            'installments.*.payment_method' => 'required|in:cash,gcash,pdo,credit',
            'installments.*.due_date' => 'nullable|date',
            'installments.*.pay_now' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->staggeredPaymentService->createPaymentSchedule(
                $sale,
                $request->installments
            );

            return response()->json([
                'success' => true,
                'message' => 'Payment schedule created successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Show payment plan details
     */
    public function show(Sale $sale)
    {
        if (!$sale->is_staggered) {
            return response()->json([
                'success' => false,
                'message' => 'Sale does not have staggered payment',
            ], 400);
        }

        $sale->load(['customer', 'paymentInstallments.payment']);

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    /**
     * Approve payment plan
     */
    public function approve(Sale $sale)
    {
        try {
            $this->staggeredPaymentService->approvePaymentPlan($sale);

            return response()->json([
                'success' => true,
                'message' => 'Payment plan approved',
                'data' => $sale->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Record payment for an installment
     */
    public function recordInstallmentPayment(Request $request, PaymentInstallment $installment)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,gcash',
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

        try {
            $payment = $this->staggeredPaymentService->recordInstallmentPayment(
                $installment,
                $request->all()
            );

            return response()->json([
                'success' => true,
                'message' => 'Installment payment recorded',
                'data' => [
                    'payment' => $payment,
                    'installment' => $installment->fresh(),
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
     * Approve PDO installment
     */
    public function approvePDO(PaymentInstallment $installment)
    {
        try {
            $this->paymentService->approvePDO($installment);

            // Send email notification for installment-based PDO approval
            try {
                $userName = Auth::user()->name ?? 'Admin';
                // Create a temporary payment object with installment data for email
                if ($installment->payment) {
                    $this->emailService->notifyPDOApproved($installment->payment->fresh(), $userName);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send installment PDO approved email: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'PDO approved',
                'data' => new PaymentInstallmentResource($installment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject PDO installment
     */
    public function rejectPDO(Request $request, PaymentInstallment $installment)
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
            $this->paymentService->rejectPDO($installment, $request->reason);

            // Send email notification for installment-based PDO rejection
            try {
                $userName = Auth::user()->name ?? 'Admin';
                // Create a temporary payment object with installment data for email
                if ($installment->payment) {
                    $this->emailService->notifyPaymentRejected($installment->payment->fresh(), $request->reason, $userName);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send installment PDO rejected email: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'PDO rejected',
                'data' => new PaymentInstallmentResource($installment->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Mark PDO as paid
     */
    public function markPDOAsPaid(PaymentInstallment $installment)
    {
        try {
            $payment = $this->paymentService->markPDOAsPaid($installment);

            return response()->json([
                'success' => true,
                'message' => 'PDO marked as paid',
                'data' => [
                    'payment' => $payment,
                    'installment' => $installment->fresh(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get pending PDO installments
     */
    public function getPendingPDOs()
    {
        $installments = PaymentInstallment::where('payment_method', 'pdo')
            ->where('pdo_approval_status', 'pending')
            ->whereNotIn('status', ['paid', 'verified', 'rejected'])
            ->with(['sale.customer'])
            ->orderBy('due_date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => PaymentInstallmentResource::collection($installments),
        ]);
    }

    /**
     * Get PDO installments awaiting payment (approved but not paid)
     */
    public function getAwaitingPayment()
    {
        $installments = PaymentInstallment::where('payment_method', 'pdo')
            ->where('pdo_approval_status', 'approved')
            ->whereIn('status', ['awaiting_payment', 'pending'])
            ->with(['sale.customer'])
            ->orderBy('due_date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => PaymentInstallmentResource::collection($installments),
        ]);
    }
}
