<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Variety extends Model
{
    use SoftDeletes;

    protected $table = 'varieties';

    protected $fillable = [
        'name',
        'description',
        'color',
        'status',
        'products_count',
    ];

    protected $casts = [
        'products_count' => 'integer',
    ];

    protected $attributes = [
        'color' => '#22c55e',
        'status' => 'Active',
    ];

    /**
     * Get the procurements that use this variety.
     */
    public function procurements(): HasMany
    {
        return $this->hasMany(Procurement::class);
    }
}
