<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProcessingResource extends JsonResource
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
            'procurement_id' => $this->procurement_id,
            'procurement_info' => $this->procurement ? [
                'id' => $this->procurement->id,
                'supplier_name' => $this->procurement->supplier->name ?? 'Unknown',
                'quantity_kg' => $this->procurement->quantity_kg,
                'quantity_out' => $this->procurement->quantity_out,
                'remaining_kg' => $this->procurement->quantity_kg - $this->procurement->quantity_out,
            ] : null,
            'input_kg' => (float) $this->input_kg,
            'output_kg' => $this->output_kg ? (float) $this->output_kg : null,
            'stock_out' => (float) ($this->stock_out ?? 0),
            'remaining_stock' => $this->remaining_stock,
            'husk_kg' => $this->husk_kg ? (float) $this->husk_kg : null,
            'yield_percent' => $this->yield_percent ? (float) $this->yield_percent : null,
            'operator_name' => $this->operator_name,
            'status' => $this->status,
            'stock_status' => $this->stock_status, // Pending, Partial, Distributed for completed batches
            'processing_date' => $this->processing_date?->format('Y-m-d'),
            'completed_date' => $this->completed_date?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
