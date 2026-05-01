<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\PaymentInstallment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StaggeredPaymentService
{
    protected PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Create payment schedule for a sale
     */
    public function createPaymentSchedule(Sale $sale, array $installmentsData)
    {
        // Validate total
        $this->validateScheduleTotal($sale, $installmentsData);

        return DB::transaction(function () use ($sale, $installmentsData) {
            $installments = [];

            foreach ($installmentsData as $data) {
                $installment = PaymentInstallment::create([
                    'sale_id' => $sale->id,
                    'installment_number' => $data['installment_number'],
                    'amount_expected' => $data['amount'],
                    'payment_method' => null, // Will be set when customer pays
                    'due_date' => $data['due_date'] ?? null,
                    'status' => 'pending',
                ]);

                $installments[] = $installment;
            }

            // Update sale
            $sale->update([
                'is_staggered' => true,
                'primary_method' => 'mixed',
            ]);

            // Check if approval required
            $requiresApproval = $this->checkApprovalRequired($sale, $installments);

            return [
                'sale' => $sale->fresh(),
                'installments' => $installments,
                'requires_approval' => $requiresApproval,
            ];
        });
    }

    /**
     * Validate that installment total equals order total
     */
    public function validateScheduleTotal(Sale $sale, array $installmentsData)
    {
        $total = array_reduce($installmentsData, function ($sum, $item) {
            return $sum + $item['amount'];
        }, 0);

        if (abs($total - $sale->total) > 0.01) {
            throw new \Exception("Installment total (₱{$total}) does not match order total (₱{$sale->total})");
        }

        return true;
    }

    /**
     * Process immediate payment for installment
     */
    protected function processImmediatePayment(PaymentInstallment $installment, array $data)
    {
        $method = $data['payment_method'];

        switch ($method) {
            case 'cash':
                $payment = $this->paymentService->recordCashPayment($installment->sale, [
                    'installment_id' => $installment->id,
                    'amount' => $data['amount'],
                    'notes' => 'Immediate payment for installment #' . $installment->installment_number,
                ]);
                
                $installment->update([
                    'amount_paid' => $data['amount'],
                    'status' => 'paid',
                    'paid_date' => now(),
                    'payment_id' => $payment->id,
                ]);
                break;

            case 'gcash':
                $payment = $this->paymentService->recordGCashPayment($installment->sale, [
                    'installment_id' => $installment->id,
                    'amount' => $data['amount'],
                    'reference_number' => $data['reference_number'] ?? null,
                    'payment_proof' => $data['payment_proof'] ?? [],
                    'notes' => 'Immediate payment for installment #' . $installment->installment_number,
                ]);
                
                $installment->update([
                    'status' => 'needs_verification',
                ]);
                break;

            case 'pdo':
                $this->paymentService->recordPDOPayment($installment->sale, $installment, [
                    'check_number' => $data['pdo_check_number'] ?? null,
                    'bank_name' => $data['pdo_check_bank'] ?? null,
                    'check_image' => $data['pdo_check_image'] ?? [],
                ]);
                break;

            case 'credit':
                // Credit means pay later, so just mark as pending
                $installment->update([
                    'status' => 'pending',
                ]);
                break;
        }
    }

    /**
     * Check if payment plan requires approval
     */
    public function checkApprovalRequired(Sale $sale, array $installments)
    {
        // Require approval if order >= 50,000
        if ($sale->total >= 50000) {
            return true;
        }

        // Require approval if any installment is PDO
        foreach ($installments as $installment) {
            if ($installment->payment_method === 'pdo') {
                return true;
            }
        }

        return false;
    }

    /**
     * Approve payment plan
     */
    public function approvePaymentPlan(Sale $sale)
    {
        // Mark all PDO installments as approved
        $sale->paymentInstallments()
            ->where('payment_method', 'pdo')
            ->where('pdo_approval_status', 'pending')
            ->update([
                'pdo_approval_status' => 'approved',
                'pdo_approved_by' => Auth::id(),
            ]);

        return $sale->fresh();
    }

    /**
     * Record payment for an installment
     */
    public function recordInstallmentPayment(PaymentInstallment $installment, array $data)
    {
        $method = $data['payment_method'] ?? $installment->payment_method;
        $amount = (float) $data['amount'];

        // Calculate change based on installment amount, not total
        $sale = $installment->sale;
        $changeAmount = max(0, $amount - $installment->amount_expected);
        
        // Update sale's change_amount
        $sale->update([
            'change_amount' => $changeAmount,
        ]);

        switch ($method) {
            case 'cash':
                return $this->paymentService->recordCashPayment($installment->sale, [
                    'installment_id' => $installment->id,
                    'amount' => $amount,
                    'notes' => $data['notes'] ?? null,
                ]);

            case 'gcash':
                $payment = $this->paymentService->recordGCashPayment($installment->sale, [
                    'installment_id' => $installment->id,
                    'amount' => $amount,
                    'reference_number' => $data['reference_number'],
                    'payment_proof' => $data['payment_proof'] ?? [],
                    'notes' => $data['notes'] ?? null,
                ]);
                // Mark installment as needs_verification so Payment Plans reflects status
                $installment->update([
                    'status'     => 'needs_verification',
                    'payment_id' => $payment->id,
                    'payment_method' => 'gcash',
                ]);
                return $payment;

            case 'pdo':
                return $this->paymentService->recordPDOPayment($installment->sale, $installment, [
                    'check_number' => $data['pdo_check_number'] ?? null,
                    'bank_name' => $data['pdo_check_bank'] ?? null,
                    'check_date' => $data['pdo_check_date'] ?? null,
                    'check_image' => $data['pdo_check_image'] ?? [],
                ]);

            default:
                throw new \Exception('Invalid payment method');
        }
    }

    /**
     * Calculate installment status
     */
    public function calculateInstallmentStatus(PaymentInstallment $installment)
    {
        if ($installment->amount_paid >= $installment->amount_expected) {
            return 'paid';
        } elseif ($installment->amount_paid > 0) {
            return 'partial';
        } elseif ($installment->isOverdue()) {
            return 'overdue';
        } else {
            return 'pending';
        }
    }
}
