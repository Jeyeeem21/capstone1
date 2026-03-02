<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'contact',
        'phone',
        'email',
        'license_number',
        'vehicle_type',
        'plate_number',
        'address',
        'status',
        'total_deliveries',
    ];

    protected $casts = [
        'total_deliveries' => 'integer',
    ];

    /**
     * Get all delivery assignments for this driver
     */
    public function deliveryAssignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class);
    }

    /**
     * Increment total deliveries count
     */
    public function incrementDeliveries(): void
    {
        $this->increment('total_deliveries');
    }
}
