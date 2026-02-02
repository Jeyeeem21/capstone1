<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Procurement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'quantity_kg',
        'quantity_out',
        'price_per_kg',
        'description',
        'total_cost',
        'status',
    ];

    protected $casts = [
        'quantity_kg' => 'decimal:2',
        'quantity_out' => 'decimal:2',
        'price_per_kg' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    protected $attributes = [
        'quantity_kg' => 0,
        'quantity_out' => 0,
        'price_per_kg' => 0,
        'total_cost' => 0,
        'status' => 'Pending',
    ];

    /**
     * Get the supplier that owns the procurement.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Auto-calculate total cost when quantity or price changes.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($procurement) {
            $procurement->total_cost = $procurement->quantity_kg * $procurement->price_per_kg;
        });
    }

    /**
     * Get remaining quantity (quantity_kg - quantity_out)
     */
    public function getRemainingQuantityAttribute(): float
    {
        return $this->quantity_kg - $this->quantity_out;
    }
}
