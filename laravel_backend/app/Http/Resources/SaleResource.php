<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer?->name ?? 'Walk-in',
            'subtotal' => (float) $this->subtotal,
            'discount' => (float) $this->discount,
            'delivery_fee' => (float) ($this->delivery_fee ?? 0),
            'total' => (float) $this->total,
            'total_formatted' => '₱' . number_format($this->total, 2),
            'amount_tendered' => (float) $this->amount_tendered,
            'change_amount' => (float) $this->change_amount,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status ?? 'paid',
            'reference_number' => $this->reference_number,
            'payment_proof' => $this->payment_proof
                ? collect($this->payment_proof)->map(fn($path) => '/storage/' . $path)->values()->toArray()
                : [],
            'paid_at' => $this->paid_at?->toISOString(),
            'paid_at_formatted' => $this->paid_at?->format('M d, Y h:i A'),
            'status' => $this->status,
            'notes' => $this->notes,
            'items_count' => $this->items_count ?? $this->items->count(),
            'total_quantity' => $this->items->sum('quantity'),
            'items' => $this->items->map(function ($item) {
                $product = $item->product;
                $weight = $product?->weight;
                $weightFormatted = $weight
                    ? (intval($weight) == $weight ? intval($weight) . ' kg' : number_format($weight, 2) . ' kg')
                    : null;

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $product?->product_name ?? 'Unknown',
                    'variety_name' => $product?->variety?->name ?? 'Unknown',
                    'variety_color' => $product?->variety?->color ?? '#6B7280',
                    'weight_formatted' => $weightFormatted,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ];
            }),
            'delivery_address' => $this->delivery_address,
            'distance_km' => $this->distance_km ? (float) $this->distance_km : null,
            'driver_name' => $this->driver_name,
            'driver_plate_number' => $this->driver_plate_number,
            'return_reason' => $this->return_reason,
            'return_notes' => $this->return_notes,
            'return_proof' => $this->return_proof
                ? collect($this->return_proof)->map(fn($path) => '/storage/' . $path)->values()->toArray()
                : [],
            'return_pickup_driver' => $this->return_pickup_driver,
            'return_pickup_plate' => $this->return_pickup_plate,
            'return_pickup_date' => $this->return_pickup_date?->format('Y-m-d'),
            'return_pickup_date_formatted' => $this->return_pickup_date?->format('M d, Y'),
            'created_at' => $this->created_at?->toISOString(),
            'date_formatted' => $this->created_at?->format('M d, Y h:i A'),
            'date_short' => $this->created_at?->format('Y-m-d'),
        ];
    }
}
