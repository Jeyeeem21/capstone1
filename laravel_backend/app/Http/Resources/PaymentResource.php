<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'transaction_id' => $this->sale?->transaction_id,
            'customer_name' => $this->sale?->customer?->name ?? 'Walk-in Customer',
            'installment_id' => $this->installment_id,
            'installment_number' => $this->installment?->installment_number,
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'payment_proof' => $this->payment_proof,
            'payment_proof_urls' => $this->payment_proof_urls,
            'status' => $this->status,
            'hold_reason' => $this->hold_reason,
            'cancel_reason' => $this->cancel_reason,
            'notes' => $this->notes,
            'pdo_check_number' => $this->pdo_check_number,
            'pdo_check_bank' => $this->pdo_check_bank,
            'pdo_check_date' => $this->pdo_check_date,
            'pdo_check_image' => $this->pdo_check_image,
            'pdo_approval_status' => $this->pdo_approval_status,
            'received_by' => $this->receivedBy ? [
                'id' => $this->receivedBy->id,
                'name' => $this->receivedBy->name,
            ] : null,
            'verified_by' => $this->verifiedBy ? [
                'id' => $this->verifiedBy->id,
                'name' => $this->verifiedBy->name,
            ] : null,
            'verified_at' => $this->verified_at?->toISOString(),
            'paid_at' => $this->paid_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'sale' => $this->whenLoaded('sale', function () {
                if (!$this->sale) {
                    return null;
                }
                return [
                    'id' => $this->sale->id,
                    'transaction_id' => $this->sale->transaction_id,
                    'customer' => $this->sale->customer ? [
                        'id' => $this->sale->customer->id,
                        'name' => $this->sale->customer->name,
                    ] : null,
                ];
            }),
        ];
    }
}
