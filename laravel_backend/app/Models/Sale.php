<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'transaction_id',
        'customer_id',
        'subtotal',
        'discount',
        'delivery_fee',
        'total',
        'amount_tendered',
        'change_amount',
        'payment_method',
        'reference_number',
        'status',
        'notes',
        'delivery_address',
        'distance_km',
        'driver_name',
        'driver_plate_number',
        'return_reason',
        'return_notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'distance_km' => 'decimal:2',
    ];

    /**
     * Relationships
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * Scopes
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeVoided($query)
    {
        return $query->where('status', 'voided');
    }
}
