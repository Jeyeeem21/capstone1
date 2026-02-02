<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->product_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name ?? 'Uncategorized',
            'category_color' => $this->category?->color ?? '#6B7280',
            'price' => (float) $this->price,
            'price_formatted' => '₱' . number_format($this->price, 2),
            'stocks' => (int) $this->stocks,
            'unit' => $this->unit,
            'weight' => $this->weight ? (float) $this->weight : null,
            'weight_formatted' => $this->weight ? number_format($this->weight, 2) . ' ' . $this->unit : null,
            'status' => $this->status,
            'is_active' => $this->status === 'active',
            'is_in_stock' => $this->stocks > 0,
            'stock_status' => $this->stocks > 0 ? 'In Stock' : 'Out of Stock',
            'is_deleted' => (bool) $this->is_deleted,
            'created_at' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
            'updated_at' => $this->updated_at ? $this->updated_at->format('Y-m-d H:i:s') : null,
            'created_date' => $this->created_at ? $this->created_at->format('M d, Y') : null,
        ];
    }
}
