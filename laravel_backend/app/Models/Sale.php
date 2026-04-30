<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $transaction_id
 * @property int|null $customer_id
 * @property string|null $subtotal
 * @property string|null $discount
 * @property string|null $delivery_fee
 * @property string|null $total
 * @property string|null $amount_tendered
 * @property string|null $change_amount
 * @property string $payment_method
 * @property string $payment_status
 * @property string|null $reference_number
 * @property array|null $payment_proof
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property string $status
 * @property string|null $notes
 * @property string|null $delivery_address
 * @property string|null $distance_km
 * @property string|null $driver_name
 * @property string|null $driver_plate_number
 * @property array|null $delivery_proof
 * @property string|null $return_reason
 * @property string|null $return_notes
 * @property array|null $return_proof
 * @property string|null $return_pickup_driver
 * @property string|null $return_pickup_plate
 * @property \Illuminate\Support\Carbon|null $return_pickup_date
 * @property int|null $voided_by
 * @property int|null $authorized_by
 * @property bool $is_staggered
 * @property string|null $primary_method
 * @property string|null $amount_paid
 * @property string|null $balance_remaining
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
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
        'payment_status',
        'reference_number',
        'payment_proof',
        'paid_at',
        'status',
        'notes',
        'delivery_address',
        'distance_km',
        'driver_name',
        'driver_plate_number',
        'delivery_proof',
        'return_reason',
        'return_notes',
        'return_proof',
        'return_pickup_driver',
        'return_pickup_plate',
        'return_pickup_date',
        'voided_by',
        'authorized_by',
        'is_staggered',
        'primary_method',
        'amount_paid',
        'balance_remaining',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'distance_km' => 'decimal:2',
        'return_proof' => 'array',
        'delivery_proof' => 'array',
        'return_pickup_date' => 'date',
        'payment_proof' => 'array',
        'paid_at' => 'datetime',
        'amount_paid' => 'decimal:2',
        'balance_remaining' => 'decimal:2',
        'is_staggered' => 'boolean',
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

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentInstallments()
    {
        return $this->hasMany(PaymentInstallment::class);
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

    /**
     * Payment Helper Methods
     */
    public function isFullyPaid()
    {
        return $this->balance_remaining <= 0;
    }

    public function isPartiallyPaid()
    {
        return $this->amount_paid > 0 && $this->balance_remaining > 0;
    }

    public function verifiedPaymentsTotal()
    {
        return $this->payments()->verified()->sum('amount');
    }

    public function calculatePaymentStatus()
    {
        if ($this->balance_remaining <= 0) {
            return 'paid';
        } elseif ($this->amount_paid > 0) {
            return 'partial';
        } else {
            return 'not_paid';
        }
    }
}
