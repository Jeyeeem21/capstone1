<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

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
}
