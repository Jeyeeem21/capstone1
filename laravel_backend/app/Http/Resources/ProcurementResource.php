<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProcurementResource extends JsonResource
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
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier', function () {
                return [
                    'id' => $this->supplier->id,
                    'name' => $this->supplier->name,
                    'contact' => $this->supplier->contact,
                    'phone' => $this->supplier->phone,
                    'email' => $this->supplier->email,
                ];
            }),
            'supplier_name' => $this->supplier?->name ?? 'Unknown',
            'quantity_kg' => (float) $this->quantity_kg,
            'quantity_out' => (float) $this->quantity_out,
            'remaining_quantity' => (float) ($this->quantity_kg - $this->quantity_out),
            'price_per_kg' => (float) $this->price_per_kg,
            'description' => $this->description,
            'total_cost' => (float) $this->total_cost,
            'status' => $this->status,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
