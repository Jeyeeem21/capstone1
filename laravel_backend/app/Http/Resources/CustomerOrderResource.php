<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'total' => (float) $this->total,
            'amount_paid' => (float) $this->amount_paid,
            'balance_remaining' => (float) $this->balance_remaining,
            'payment_status' => $this->payment_status,
            'is_staggered' => $this->is_staggered,
            'primary_method' => $this->primary_method,
            'created_at' => $this->created_at?->toISOString(),
            
            // Include installments if loaded
            'installments' => CustomerPaymentInstallmentResource::collection(
                $this->whenLoaded('paymentInstallments')
            ),
            
            // Include order items if loaded
            'items' => $this->when(
                $this->relationLoaded('items'),
                function() {
                    return $this->items->map(function($item) {
                        return [
                            'product_name' => $item->product?->name ?? 'Unknown Product',
                            'variety' => $item->variety ?? null,
                            'quantity' => (float) $item->quantity,
                            'unit_price' => (float) $item->unit_price,
                            'subtotal' => (float) $item->subtotal,
                        ];
                    });
                }
            ),
            
            // Include payment history if loaded
            'payment_history' => $this->when(
                $this->relationLoaded('payments'),
                function() {
                    return $this->payments->map(function($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'payment_method' => $payment->payment_method,
                            'status' => $payment->status,
                            'paid_at' => $payment->paid_at?->toISOString(),
                            'verified_at' => $payment->verified_at?->toISOString(),
                        ];
                    });
                }
            ),
            
            // Next due date and amount
            'next_due_date' => $this->getNextDueDate(),
            'next_due_amount' => $this->getNextDueAmount(),
        ];
    }

    /**
     * Get the next due date for pending installments
     */
    private function getNextDueDate(): ?string
    {
        if (!$this->relationLoaded('paymentInstallments')) {
            return null;
        }

        $nextInstallment = $this->paymentInstallments
            ->where('status', 'pending')
            ->sortBy('due_date')
            ->first();
        
        return $nextInstallment?->due_date?->format('Y-m-d');
    }

    /**
     * Get the next due amount for pending installments
     */
    private function getNextDueAmount(): ?float
    {
        if (!$this->relationLoaded('paymentInstallments')) {
            return null;
        }

        $nextInstallment = $this->paymentInstallments
            ->where('status', 'pending')
            ->sortBy('due_date')
            ->first();
        
        return $nextInstallment ? (float) $nextInstallment->amount_expected : null;
    }
}
