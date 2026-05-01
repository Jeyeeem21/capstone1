<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Payment;
use App\Models\PaymentInstallment;
use Illuminate\Support\Facades\Auth;
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
                'received_by' => Auth::id(),
                'verified_by' => Auth::id(),
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
                'received_by' => Auth::id(),
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
                'payment_method' => 'pdo', // Set payment_method so queries can find this installment
                'due_date' => isset($data['check_date']) ? $data['check_date'] : $installment->due_date,
            ]);

            // Store check_date on installment for reference (reuse due_date)
            // Also store on a Payment record stub so pdo_check_date is tracked
            Payment::create([
                'sale_id' => $installment->sale_id,
                'installment_id' => $installment->id,
                'amount' => $installment->amount_expected,
                'payment_method' => 'pdo',
                'status' => 'needs_verification',
                'pdo_check_number' => $data['check_number'],
                'pdo_check_bank' => $data['bank_name'],
                'pdo_check_date' => $data['check_date'] ?? null,
                'pdo_check_image' => $checkImagePaths,
                'pdo_approval_status' => 'pending',
                'received_by' => Auth::id(),
                'paid_at' => now(),
            ]);

            return $installment;
        });
    }

    /**
     * Verify a GCash payment or approve a PDO payment
     */
    public function verifyPayment(Payment $payment)
    {
        // Allow verification for: needs_verification, on_hold, or pending (for PDO)
        if (!in_array($payment->status, ['needs_verification', 'on_hold', 'pending'])) {
            throw new \Exception('Payment cannot be verified. Current status: ' . $payment->status);
        }

        return DB::transaction(function () use ($payment) {
            $updateData = [
                'status' => 'verified',
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ];

            // If it's a PDO payment, also approve it
            if ($payment->payment_method === 'pdo') {
                $updateData['pdo_approval_status'] = 'approved';
            }

            $payment->update($updateData);

            // Now update sale balances
            $this->updateSaleBalances($payment->sale, $payment->amount);

            // If linked to installment, update it
            if ($payment->installment_id) {
                $installment = $payment->installment;
                if ($installment) {
                    $installment->update([
                        'amount_paid' => $installment->amount_paid + $payment->amount,
                        'status' => 'verified',
                        'paid_date' => now(),
                        'payment_id' => $payment->id,
                        'pdo_approval_status' => $payment->payment_method === 'pdo' ? 'approved' : $installment->pdo_approval_status,
                    ]);
                }
            }

            return $payment;
        });
    }

    /**
     * Hold a payment for review
     */
    public function holdPayment(Payment $payment, string $reason)
    {
        // Allow holding for: needs_verification, pending (for PDO), or verified payments
        if (!in_array($payment->status, ['needs_verification', 'pending', 'verified'])) {
            throw new \Exception('Payment cannot be put on hold. Current status: ' . $payment->status);
        }

        $payment->update([
            'status' => 'on_hold',
            'hold_reason' => $reason,
        ]);

        // Sync installment status so Payment Plans reflects the hold
        if ($payment->installment_id) {
            $installment = $payment->installment;
            if ($installment && !in_array($installment->status, ['verified', 'paid'])) {
                $installment->update(['status' => 'on_hold']);
            }
        }

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

                // If linked to installment, revert it
                if ($payment->installment_id) {
                    $installment = $payment->installment;
                    $installment->amount_paid = max(0, $installment->amount_paid - $payment->amount);
                    $installment->status = 'pending';
                    $installment->paid_date = null;
                    $installment->payment_id = null;
                    $installment->save();
                }
            } elseif (in_array($payment->status, ['needs_verification', 'on_hold'])) {
                // Payment was submitted but not yet verified — revert installment so customer can pay again
                if ($payment->installment_id) {
                    $installment = $payment->installment;
                    if ($installment) {
                        $installment->update([
                            'status'     => 'pending',
                            'payment_id' => null,
                        ]);
                    }
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
            'pdo_approved_by' => Auth::id(),
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
            'pdo_approved_by' => Auth::id(),
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
                'received_by' => Auth::id(),
                'verified_by' => Auth::id(),
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
    protected function updateSaleBalances(Sale $sale, float|string $amount)
    {
        $amount = (float) $amount;
        $sale->amount_paid = (float) $sale->amount_paid + $amount;
        $sale->balance_remaining = (float) $sale->balance_remaining - $amount;

        // Ensure balance doesn't go negative
        if ((float) $sale->balance_remaining < 0) {
            $sale->balance_remaining = 0.0;
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
        preg_match('/^data:image\/([a-zA-Z]+);base64,/', $base64, $matches);
        $rawExtension = strtolower($matches[1] ?? '');
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        $extension = in_array($rawExtension, $allowedExtensions) ? $rawExtension : 'png';
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
