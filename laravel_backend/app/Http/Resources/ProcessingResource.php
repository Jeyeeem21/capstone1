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
            'drying_process_id' => $this->drying_process_id,
            'procurement_info' => $this->procurement ? [
                'id' => $this->procurement->id,
                'supplier_name' => $this->procurement->supplier->name ?? 'Unknown',
                'quantity_kg' => $this->procurement->quantity_kg,
                'sacks' => (int) $this->procurement->sacks,
            ] : null,
            'drying_process_info' => $this->dryingProcess ? [
                'id' => $this->dryingProcess->id,
                'supplier_name' => $this->dryingProcess->procurement->supplier->name ?? ($this->dryingProcess->batch_id ? 'Batch' : 'Unknown'),
                'quantity_kg' => (float) $this->dryingProcess->quantity_kg,
                'sacks' => (int) $this->dryingProcess->sacks,
                'quantity_out' => (float) $this->dryingProcess->quantity_out,
                'remaining_kg' => (float) ($this->dryingProcess->quantity_kg - $this->dryingProcess->quantity_out),
                'days' => (int) $this->dryingProcess->days,
                'status' => $this->dryingProcess->status,
                'batch_id' => $this->dryingProcess->batch_id,
                'batch_number' => $this->dryingProcess->batch?->batch_number,
            ] : null,
            // Multi-source drying sources
            'drying_sources' => $this->whenLoaded('dryingSources', function () {
                return $this->dryingSources->map(fn($ds) => [
                    'id' => $ds->id,
                    'quantity_kg_taken' => (float) $ds->pivot->quantity_kg,
                    'total_quantity_kg' => (float) $ds->quantity_kg,
                    'batch_id' => $ds->batch_id,
                    'batch_number' => $ds->batch?->batch_number,
                    'variety_name' => $ds->batch?->variety?->name ?? ($ds->procurement?->supplier?->name ?? null),
                    'variety_color' => $ds->batch?->variety?->color ?? null,
                    'supplier_name' => $ds->procurement?->supplier?->name ?? ($ds->batch_id ? 'Batch' : 'Unknown'),
                ]);
            }),
            'input_kg' => (float) $this->input_kg,
            'output_kg' => $this->output_kg ? (float) $this->output_kg : null,
            'stock_out' => (float) ($this->stock_out ?? 0),
            'remaining_stock' => $this->remaining_stock,
            'husk_kg' => $this->husk_kg ? (float) $this->husk_kg : null,
            'yield_percent' => $this->yield_percent ? (float) $this->yield_percent : null,
            'operator_name' => $this->operator_name,
            'status' => $this->status,
            'stock_status' => $this->stock_status,
            'processing_date' => $this->processing_date?->format('Y-m-d'),
            'completed_date' => $this->completed_date?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
