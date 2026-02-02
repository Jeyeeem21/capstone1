<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Collection;

/**
 * Service class for Category
 * Handles all business logic related to categories
 * Fast caching with proper invalidation for instant loading
 */
class CategoryService
{
    private const CACHE_KEY = 'categories_all';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all categories - cached for speed, invalidated on changes
     */
    public function getAllCategories(): Collection
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Category::orderBy('name')->get();
        });
    }

    /**
     * Get a single category
     */
    public function getCategoryById(int $id): ?Category
    {
        return Category::find($id);
    }

    /**
     * Create a new category
     */
    public function createCategory(array $data): Category
    {
        // Set defaults
        $data['color'] = $data['color'] ?? '#22c55e';
        
        $category = Category::create($data);
        $this->clearCache();
        return $category;
    }

    /**
     * Update an existing category
     */
    public function updateCategory(Category $category, array $data): Category
    {
        $category->update($data);
        $this->clearCache();
        return $category->fresh();
    }

    /**
     * Delete a category (soft delete)
     */
    public function deleteCategory(Category $category): bool
    {
        $result = $category->delete();
        $this->clearCache();
        return $result;
    }

    /**
     * Clear cache - called after any data modification
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Get category statistics
     */
    public function getStatistics(): array
    {
        $categories = $this->getAllCategories();
        
        return [
            'total' => $categories->count(),
            'active' => $categories->where('status', 'Active')->count(),
            'inactive' => $categories->where('status', 'Inactive')->count(),
            'total_products' => $categories->sum('products_count'),
        ];
    }
}
