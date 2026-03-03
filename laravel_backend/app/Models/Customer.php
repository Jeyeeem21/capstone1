<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'contact',
        'phone',
        'email',
        'address',
        'status',
        'orders',
    ];

    protected $casts = [
        'orders' => 'integer',
    ];

    /**
     * Get all sales/orders for this customer.
     */
    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    /**
     * Get the user account linked to this customer (if any).
     */
    public function user()
    {
        return $this->hasOne(User::class, 'email', 'email');
    }
}
