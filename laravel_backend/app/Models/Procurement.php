<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasArchiving;

class Procurement extends Model
{
    use SoftDeletes, HasArchiving;

    protected $fillable = [
        'supplier_id',
        'variety_id',
        'batch_id',
        'quantity_kg',
        'sacks',
        'price_per_kg',
        'hauling_price_per_sack',
        'hauling_sacks',
        'twines_price',
        'description',
        'total_cost',
        'status',
        'is_archived',
        'archived_at',
    ];

    protected $casts = [
        'quantity_kg' => 'decimal:2',
        'sacks' => 'integer',
        'price_per_kg' => 'decimal:2',
        'hauling_price_per_sack' => 'decimal:2',
        'hauling_sacks' => 'integer',
        'twines_price'            => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    protected $attributes = [
        'quantity_kg' => 0,
        'sacks' => 0,
        'price_per_kg' => 0,
        'total_cost' => 0,
        'status' => 'Pending',
    ];

    /**
     * Get the batch this procurement belongs to (if any).
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProcurementBatch::class, 'batch_id');
    }

    /**
     * Get the supplier that owns the procurement.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the variety for this procurement.
     */
    public function variety(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Variety::class);
    }

    /**
     * Get the drying processes for this procurement.
     */
    public function dryingProcesses(): HasMany
    {
        return $this->hasMany(DryingProcess::class);
    }

    /**
     * Get the batch-drying allocations for this procurement.
     * These are created when a batch is sent to drying and sacks are proportionally
     * distributed across the batch's procurements.
     */
    public function dryingBatchAllocations(): HasMany
    {
        return $this->hasMany(DryingBatchProcurement::class);
    }

    /**
     * Auto-calculate total cost when quantity or price changes.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($procurement) {
            // hauling_sacks defaults to sacks when not explicitly set
            $haulingCount = $procurement->hauling_sacks ?? $procurement->sacks ?? 0;
            $haulingCost  = $haulingCount * ($procurement->hauling_price_per_sack ?? 0);
            // twines always uses the procurement sacks count
            $twinesCost   = (float) ($procurement->twines_price ?? 0);
            $procurement->total_cost = ($procurement->quantity_kg * $procurement->price_per_kg) + $haulingCost + $twinesCost;
        });
    }


}
