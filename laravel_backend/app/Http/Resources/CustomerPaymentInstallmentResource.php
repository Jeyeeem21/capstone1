<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;

class CustomerPaymentInstallmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'installment_number' => $this->installment_number,
            'amount_expected' => (float) $this->amount_expected,
            'amount_paid' => (float) $this->amount_paid,
            'payment_method' => $this->payment_method,
            'due_date' => $this->due_date?->format('Y-m-d'),
            'paid_date' => $this->paid_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
            'can_pay' => $this->canCustomerPay(),
            
            // Include PDO approval status if it's a PDO payment
            'pdo_approval_status' => $this->when(
                $this->isPDO(),
                $this->pdo_approval_status
            ),
        ];
    }

    /**
     * Check if the installment is overdue
     */
    private function isOverdue(): bool
    {
        if (!$this->due_date || $this->status !== 'pending') {
            return false;
        }

        return Carbon::parse($this->due_date)->isPast();
    }

    /**
     * Check if customer can pay this installment
     */
    private function canCustomerPay(): bool
    {
        // Customer can pay if:
        // 1. Status is pending
        // 2. Not already paid
        // 3. Not a PDO with pending approval (PDO is submitted, not paid directly)
        
        if ($this->status !== 'pending') {
            return false;
        }

        if ($this->amount_paid > 0) {
            return false;
        }

        // If it's a PDO payment method and already has pending approval, can't submit again
        if ($this->isPDO() && $this->pdo_approval_status === 'pending') {
            return false;
        }

        return true;
    }

    /**
     * Check if this is a PDO payment
     */
    private function isPDO(): bool
    {
        return $this->payment_method === 'pdo';
    }
}
