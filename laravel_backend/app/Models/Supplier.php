<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'contact',
        'phone',
        'email',
        'address',
        'status',
        'products',
    ];

    protected $casts = [
        'products' => 'integer',
    ];

    /**
     * Get all procurements from this supplier.
     */
    public function procurements()
    {
        return $this->hasMany(Procurement::class);
    }
}
