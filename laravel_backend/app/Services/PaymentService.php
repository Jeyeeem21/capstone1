<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Payment;
use App\Models\PaymentInstallment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class PaymentService
{
    /**
     * Record a cash payment
     */
    public function recordCashPayment(Sale $sale, array $data)
    {
        return DB::transaction(function () use ($sale, $data) {
            $payment = Payment::create([
                'sale_id' => $sale->id,
                'installment_id' => $data['installment_id'] ?? null,
                'amount' => $data['amount'],
                'payment_method' => 'cash',
                'status' => 'verified', // Cash is auto-verified
                'notes' => $data['notes'] ?? null,
                'received_by' => auth()->id(),
                'verified_by' => auth()->id(),
                'verified_at' => now(),
                'paid_at' => now(),
            ]);

            // Update sale balances immediately
            $this->updateSaleBalances($sale, $data['amount']);

            // If linked to installment, update it
            if (!empty($data['installment_id'])) {
                $installment = PaymentInstallment::find($data['installment_id']);
                if ($installment) {
                    $installment->update([
                        'amount_paid' => $installment->amount_paid + $data['amount'],
                        'status' => 'verified',
                        'paid_date' => now(),
                        'payment_id' => $payment->id,
                        'payment_method' => 'cash',
                    ]);
                }
            }

            return $payment;
        });
    }

    /**
     * Record a GCash payment (needs verification)
     */
    public function recordGCashPayment(Sale $sale, array $data)
    {
        return DB::transaction(function () use ($sale, $data) {
            // Handle payment proof - can be file paths (already uploaded) or base64
            $proofPaths = [];
            if (isset($data['payment_proof']) && is_array($data['payment_proof'])) {
                foreach ($data['payment_proof'] as $proof) {
                    if (is_string($proof)) {
                        if (str_starts_with($proof, 'data:image')) {
                            // Base64 image - store it
                            $proofPaths[] = $this->storeBase64Image($proof, 'payment_proofs');
                        } else {
                            // Already a file path from controller upload
                            $proofPaths[] = $proof;
                        }
                    }
                }
            }

            $payment = Payment::create([
                'sale_id' => $sale->id,
                'installment_id' => $data['installment_id'] ?? null,
                'amount' => $data['amount'],
                'payment_method' => 'gcash',
                'reference_number' => $data['reference_number'],
                'payment_proof' => $proofPaths,
                'status' => 'needs_verification', // Needs admin verification
                'notes' => $data['notes'] ?? null,
                'received_by' => auth()->id(),
                'paid_at' => now(),
            ]);

            // Don't update sale balances yet - wait for verification

            return $payment;
        });
    }

    /**
     * Record a PDO payment (needs approval)
     */
    public function recordPDOPayment(Sale $sale, PaymentInstallment $installment, array $data)
    {
        return DB::transaction(function () use ($sale, $installment, $data) {
            // Handle check image upload
            $checkImagePaths = [];
            if (isset($data['check_image']) && is_array($data['check_image'])) {
                foreach ($data['check_image'] as $image) {
                    if (is_string($image) && str_starts_with($image, 'data:image')) {
                        $checkImagePaths[] = $this->storeBase64Image($image, 'pdo_checks');
                    }
                }
            }

            // Update installment with PDO details
            $installment->update([
                'pdo_check_number' => $data['check_number'],
                'pdo_check_bank' => $data['bank_name'],
                'pdo_check_image' => $checkImagePaths,
                'pdo_approval_status' => 'pending',
                'status' => 'pending',
            ]);

            return $installment;
        });
    }

    /**
     * Verify a GCash payment
     */
    public function verifyPayment(Payment $payment)
    {
        if ($payment->status !== 'needs_verification' && $payment->status !== 'on_hold') {
            throw new \Exception('Payment cannot be verified');
        }

        return DB::transaction(function () use ($payment) {
            $payment->update([
                'status' => 'verified',
                'verified_by' => auth()->id(),
                'verified_at' => now(),
            ]);

            // Now update sale balances
            $this->updateSaleBalances($payment->sale, $payment->amount);

            // If linked to installment, update it
            if ($payment->installment_id) {
                $installment = $payment->installment;
                $installment->update([
                    'amount_paid' => $installment->amount_paid + $payment->amount,
                    'status' => 'verified',
                    'paid_date' => now(),
                    'payment_id' => $payment->id,
                ]);
            }

            return $payment;
        });
    }

    /**
     * Hold a payment for review
     */
    public function holdPayment(Payment $payment, string $reason)
    {
        if ($payment->status !== 'needs_verification') {
            throw new \Exception('Only pending payments can be put on hold');
        }

        $payment->update([
            'status' => 'on_hold',
            'hold_reason' => $reason,
        ]);

        return $payment;
    }

    /**
     * Cancel/reject a payment
     */
    public function cancelPayment(Payment $payment, string $reason)
    {
        return DB::transaction(function () use ($payment, $reason) {
            // If payment was verified, reverse the sale balances
            if ($payment->status === 'verified') {
                $sale = $payment->sale;
                $sale->amount_paid -= $payment->amount;
                $sale->balance_remaining += $payment->amount;
                $sale->payment_status = $sale->calculatePaymentStatus();
                $sale->save();

                // If linked to installment, update it
                if ($payment->installment_id) {
                    $installment = $payment->installment;
                    $installment->amount_paid -= $payment->amount;
                    $installment->status = 'pending';
                    $installment->paid_date = null;
                    $installment->payment_id = null;
                    $installment->save();
                }
            }

            $payment->update([
                'status' => 'cancelled',
                'cancel_reason' => $reason,
            ]);

            return $payment;
        });
    }

    /**
     * Approve a PDO
     */
    public function approvePDO(PaymentInstallment $installment)
    {
        if (!$installment->isPDO() || $installment->pdo_approval_status !== 'pending') {
            throw new \Exception('Invalid PDO for approval');
        }

        $installment->update([
            'pdo_approval_status' => 'approved',
            'pdo_approved_by' => auth()->id(),
            'status' => 'awaiting_payment',
        ]);

        return $installment;
    }

    /**
     * Reject a PDO
     */
    public function rejectPDO(PaymentInstallment $installment, string $reason)
    {
        if (!$installment->isPDO() || $installment->pdo_approval_status !== 'pending') {
            throw new \Exception('Invalid PDO for rejection');
        }

        $installment->update([
            'pdo_approval_status' => 'rejected',
            'pdo_approved_by' => auth()->id(),
            'status' => 'rejected',
            'notes' => $reason,
        ]);

        return $installment;
    }

    /**
     * Mark PDO as paid (when check clears)
     */
    public function markPDOAsPaid(PaymentInstallment $installment)
    {
        if (!$installment->isPDO() || $installment->pdo_approval_status !== 'approved') {
            throw new \Exception('PDO must be approved first');
        }

        return DB::transaction(function () use ($installment) {
            // Create payment record
            $payment = Payment::create([
                'sale_id' => $installment->sale_id,
                'installment_id' => $installment->id,
                'amount' => $installment->amount_expected,
                'payment_method' => 'pdo',
                'status' => 'verified',
                'received_by' => auth()->id(),
                'verified_by' => auth()->id(),
                'verified_at' => now(),
                'paid_at' => now(),
            ]);

            // Update installment
            $installment->update([
                'amount_paid' => $installment->amount_expected,
                'status' => 'paid',
                'paid_date' => now(),
                'payment_id' => $payment->id,
            ]);

            // Update sale balances
            $this->updateSaleBalances($installment->sale, $installment->amount_expected);

            return $payment;
        });
    }

    /**
     * Update sale balances after payment
     */
    protected function updateSaleBalances(Sale $sale, float $amount)
    {
        $sale->amount_paid += $amount;
        $sale->balance_remaining -= $amount;

        // Ensure balance doesn't go negative
        if ($sale->balance_remaining < 0) {
            $sale->balance_remaining = 0;
        }

        // Update payment status
        $sale->payment_status = $sale->calculatePaymentStatus();

        // Set paid_at if fully paid
        if ($sale->isFullyPaid() && !$sale->paid_at) {
            $sale->paid_at = now();
        }

        $sale->save();
    }

    /**
     * Store base64 image
     */
    protected function storeBase64Image(string $base64, string $folder)
    {
        // Extract image data
        preg_match('/^data:image\/(\w+);base64,/', $base64, $matches);
        $extension = $matches[1] ?? 'png';
        $imageData = substr($base64, strpos($base64, ',') + 1);
        $imageData = base64_decode($imageData);

        // Generate filename
        $filename = uniqid() . '.' . $extension;
        $path = $folder . '/' . date('Y/m/d') . '/' . $filename;

        // Store file
        Storage::disk('public')->put($path, $imageData);

        return $path;
    }
}
