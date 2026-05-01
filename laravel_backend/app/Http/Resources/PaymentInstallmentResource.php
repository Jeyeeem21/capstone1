<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentInstallmentResource extends JsonResource
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
            'installment_number' => $this->installment_number,
            'amount_expected' => (float) $this->amount_expected,
            'amount_paid' => (float) $this->amount_paid,
            'balance' => (float) ($this->amount_expected - $this->amount_paid),
            'payment_method' => $this->payment_method,
            'due_date' => $this->due_date?->toDateString(),
            'paid_date' => $this->paid_date?->toDateString(),
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
            'is_due' => $this->isDue(),
            'pdo_check_number' => $this->pdo_check_number,
            'pdo_check_bank' => $this->pdo_check_bank,
            'pdo_check_image' => $this->pdo_check_image,
            'pdo_check_image_urls' => $this->pdo_check_image_urls,
            'pdo_approval_status' => $this->pdo_approval_status,
            'pdo_approved_by' => $this->pdoApprovedBy ? [
                'id' => $this->pdoApprovedBy->id,
                'name' => $this->pdoApprovedBy->name,
            ] : null,
            'payment_id' => $this->payment_id,
            'payment' => $this->payment ? new PaymentResource($this->payment) : null,
            'sale' => $this->whenLoaded('sale', function () {
                return [
                    'id' => $this->sale->id,
                    'transaction_id' => $this->sale->transaction_id,
                    'customer' => $this->sale->customer ? [
                        'id' => $this->sale->customer->id,
                        'name' => $this->sale->customer->name,
                    ] : null,
                ];
            }),
            'notes' => $this->notes,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
