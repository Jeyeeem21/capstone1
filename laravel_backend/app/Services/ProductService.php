<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductService
{
    /**
     * Cache key for products.
     */
    private const CACHE_KEY = 'products_all';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all products with caching.
     */
    public function getAllProducts()
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Product::with('category')
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Get featured products (active with stock).
     */
    public function getFeaturedProducts()
    {
        return Cache::remember('products_featured', self::CACHE_TTL, function () {
            return Product::with('category')
                ->where('status', 'active')
                ->where('stocks', '>', 0)
                ->orderBy('created_at', 'desc')
                ->limit(12)
                ->get();
        });
    }

    /**
     * Get products with stats.
     */
    public function getProductsWithStats(): array
    {
        $products = $this->getAllProducts();
        
        return [
            'products' => $products,
            'stats' => [
                'total' => count($products),
                'active' => count(array_filter($products, fn($p) => $p['status'] === 'active')),
                'inactive' => count(array_filter($products, fn($p) => $p['status'] === 'inactive')),
                'in_stock' => count(array_filter($products, fn($p) => ($p['stocks'] ?? 0) > 0)),
                'out_of_stock' => count(array_filter($products, fn($p) => ($p['stocks'] ?? 0) <= 0)),
            ]
        ];
    }

    /**
     * Get a single product by ID.
     */
    public function getProduct(int $id): ?Product
    {
        return Product::with('category')->find($id);
    }

    /**
     * Create a new product.
     */
    public function createProduct(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $product = Product::create([
                'product_name' => $data['product_name'],
                'category_id' => $data['category_id'],
                'price' => $data['price'] ?? 0,
                'stocks' => $data['stocks'] ?? 0,
                'unit' => $data['unit'] ?? 'kg',
                'weight' => $data['weight'] ?? null,
                'status' => $data['status'] ?? 'active',
            ]);

            // Refresh to get timestamps as Carbon instances
            $product->refresh();
            
            // Load the category relationship
            $product->load('category');
            
            $this->clearCache();
            
            return $product;
        });
    }

    /**
     * Update a product.
     */
    public function updateProduct(int $id, array $data): Product
    {
        return DB::transaction(function () use ($id, $data) {
            $product = Product::findOrFail($id);
            
            $product->update([
                'product_name' => $data['product_name'] ?? $product->product_name,
                'category_id' => $data['category_id'] ?? $product->category_id,
                'price' => $data['price'] ?? $product->price,
                'stocks' => $data['stocks'] ?? $product->stocks,
                'unit' => $data['unit'] ?? $product->unit,
                'weight' => $data['weight'] ?? $product->weight,
                'status' => $data['status'] ?? $product->status,
            ]);

            $product->load('category');
            
            $this->clearCache();
            
            return $product;
        });
    }

    /**
     * Soft delete a product.
     */
    public function deleteProduct(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $product = Product::findOrFail($id);
            $result = $product->softDelete();
            
            $this->clearCache();
            
            return $result;
        });
    }

    /**
     * Restore a deleted product.
     */
    public function restoreProduct(int $id): Product
    {
        return DB::transaction(function () use ($id) {
            $product = Product::withDeleted()->findOrFail($id);
            $product->restore();
            $product->load('category');
            
            $this->clearCache();
            
            return $product;
        });
    }

    /**
     * Update product stock.
     */
    public function updateStock(int $id, int $quantity, string $operation = 'add'): Product
    {
        return DB::transaction(function () use ($id, $quantity, $operation) {
            $product = Product::findOrFail($id);
            
            if ($operation === 'add') {
                $product->stocks += $quantity;
            } elseif ($operation === 'subtract') {
                $product->stocks = max(0, $product->stocks - $quantity);
            } else {
                $product->stocks = $quantity;
            }
            
            $product->save();
            $product->load('category');
            
            $this->clearCache();
            
            return $product;
        });
    }

    /**
     * Toggle product status.
     */
    public function toggleStatus(int $id): Product
    {
        return DB::transaction(function () use ($id) {
            $product = Product::findOrFail($id);
            $product->status = $product->status === 'active' ? 'inactive' : 'active';
            $product->save();
            $product->load('category');
            
            $this->clearCache();
            
            return $product;
        });
    }

    /**
     * Clear the products cache.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        // Also clear categories cache since they might show product counts
        Cache::forget('categories_all');
    }
}
