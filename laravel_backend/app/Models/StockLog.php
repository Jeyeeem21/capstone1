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
        'source_processing_ids',
        'notes',
        'procurement_cost',
        'hauling_cost',
        'twines_cost',
        'drying_cost',
        'milling_cost',
        'sack_cost',
        'packaging_twines_cost',
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
        'hauling_cost' => 'decimal:2',
        'twines_cost' => 'decimal:2',
        'drying_cost' => 'decimal:2',
        'milling_cost' => 'decimal:2',
        'sack_cost' => 'decimal:2',
        'packaging_twines_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'cost_per_unit' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'profit_per_unit' => 'decimal:2',
        'profit_margin' => 'decimal:2',
        'source_processing_ids' => 'array',
    ];

    /**
     * Relationships.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
