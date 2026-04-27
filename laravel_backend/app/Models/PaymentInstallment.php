<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PaymentInstallment extends Model
{
    protected $fillable = [
        'sale_id',
        'installment_number',
        'amount_expected',
        'amount_paid',
        'payment_method',
        'due_date',
        'paid_date',
        'status',
        'pdo_check_number',
        'pdo_check_bank',
        'pdo_check_image',
        'pdo_approval_status',
        'pdo_approved_by',
        'payment_id',
        'notes',
    ];

    protected $casts = [
        'amount_expected' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'pdo_check_image' => 'array',
        'due_date' => 'date',
        'paid_date' => 'date',
    ];

    /**
     * Relationships
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'id', 'payment_id');
    }

    public function pdoApprovedBy()
    {
        return $this->belongsTo(User::class, 'pdo_approved_by');
    }

    /**
     * Scopes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeNeedsVerification($query)
    {
        return $query->where('status', 'needs_verification');
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')
                  ->whereNotNull('due_date')
                  ->where('due_date', '<', Carbon::today());
            });
    }

    /**
     * Helper Methods
     */
    public function isDue()
    {
        if (!$this->due_date) {
            return false;
        }

        return Carbon::parse($this->due_date)->isPast();
    }

    public function isOverdue()
    {
        return $this->status === 'overdue' || 
               ($this->status === 'pending' && $this->isDue());
    }

    public function isPDO()
    {
        return $this->payment_method === 'pdo';
    }

    public function requiresApproval()
    {
        return $this->isPDO() && 
               $this->pdo_approval_status === 'pending';
    }

    /**
     * Accessors
     */
    public function getPdoCheckImageUrlsAttribute()
    {
        if (!$this->pdo_check_image) {
            return [];
        }

        return array_map(function ($path) {
            return asset('storage/' . $path);
        }, $this->pdo_check_image);
    }
}
