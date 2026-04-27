<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'sale_id',
        'installment_id',
        'amount',
        'payment_method',
        'reference_number',
        'payment_proof',
        'status',
        'hold_reason',
        'cancel_reason',
        'notes',
        'received_by',
        'verified_by',
        'verified_at',
        'paid_at',
        'pdo_check_number',
        'pdo_check_bank',
        'pdo_check_date',
        'pdo_check_image',
        'pdo_approval_status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_proof' => 'array',
        'pdo_check_image' => 'array',
        'paid_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function installment()
    {
        return $this->belongsTo(PaymentInstallment::class, 'installment_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Scopes
     */
    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'needs_verification');
    }

    public function scopeOnHold($query)
    {
        return $query->where('status', 'on_hold');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Accessors
     */
    public function getPaymentProofUrlsAttribute()
    {
        if (!$this->payment_proof) {
            return [];
        }

        return array_map(function ($path) {
            return asset('storage/' . $path);
        }, $this->payment_proof);
    }
}
