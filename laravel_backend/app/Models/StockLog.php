<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockLog extends Model
{
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'product_id',
        'type',
        'quantity_before',
        'quantity_change',
        'quantity_after',
        'kg_amount',
        'source_type',
        'source_id',
        'notes',
        'procurement_cost',
        'drying_cost',
        'total_cost',
        'cost_per_unit',
        'selling_price',
        'profit_per_unit',
        'profit_margin',
    ];

    /**
     * Casts.
     */
    protected $casts = [
        'kg_amount' => 'decimal:2',
        'quantity_before' => 'integer',
        'quantity_change' => 'integer',
        'quantity_after' => 'integer',
        'procurement_cost' => 'decimal:2',
        'drying_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'cost_per_unit' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'profit_per_unit' => 'decimal:2',
        'profit_margin' => 'decimal:2',
    ];

    /**
     * Relationships.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
