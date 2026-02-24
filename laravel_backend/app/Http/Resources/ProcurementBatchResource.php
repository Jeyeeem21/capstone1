<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProcurementBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'batch_number'     => $this->batch_number,
            'variety_id'       => $this->variety_id,
            'variety_name'     => $this->variety?->name,
            'variety_color'    => $this->variety?->color,
            'season_date'      => $this->season_date?->format('Y-m-d'),
            'total_sacks'      => (int) $this->total_sacks,
            'total_kg'         => (float) $this->total_kg,
            'remaining_sacks'  => (int) $this->remaining_sacks,
            'remaining_kg'     => (float) $this->remaining_kg,
            'used_sacks'       => (int) $this->total_sacks - (int) $this->remaining_sacks,
            'used_kg'          => (float) $this->total_kg - (float) $this->remaining_kg,
            'total_cost'       => (float) ($this->procurements_sum_total_cost ?? $this->procurements->sum('total_cost')),
            'status'           => $this->status,
            'notes'            => $this->notes,
            'procurements_count' => $this->whenCounted('procurements'),
            // Full procurement list — only when loaded (detail view)
            'procurements'     => $this->when(
                $this->relationLoaded('procurements'),
                fn() => $this->procurements->map(fn($p) => [
                    'id'           => $p->id,
                    'supplier_id'  => $p->supplier_id,
                    'supplier_name'=> $p->supplier?->name ?? 'Unknown',
                    'sacks'        => (int) $p->sacks,
                    'quantity_kg'  => (float) $p->quantity_kg,
                    'price_per_kg' => (float) $p->price_per_kg,
                    'total_cost'   => (float) $p->total_cost,
                    'status'       => $p->status,
                ])
            ),
            'created_at'  => $this->created_at?->toISOString(),
            'updated_at'  => $this->updated_at?->toISOString(),
        ];
    }
}
