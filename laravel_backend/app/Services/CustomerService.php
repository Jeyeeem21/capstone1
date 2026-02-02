<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Collection;

/**
 * Service class for Customer
 * Handles all business logic related to customers
 * Fast caching with proper invalidation for instant loading
 */
class CustomerService
{
    private const CACHE_KEY = 'customers_all';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all customers - cached for speed, invalidated on changes
     */
    public function getAllCustomers(): Collection
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Customer::orderBy('created_at', 'desc')->get();
        });
    }

    /**
     * Get a single customer
     */
    public function getCustomerById(int $id): ?Customer
    {
        return Customer::find($id);
    }

    /**
     * Create a new customer
     */
    public function createCustomer(array $data): Customer
    {
        $customer = Customer::create($data);
        $this->clearCache();
        return $customer;
    }

    /**
     * Update an existing customer
     */
    public function updateCustomer(Customer $customer, array $data): Customer
    {
        $customer->update($data);
        $this->clearCache();
        return $customer->fresh();
    }

    /**
     * Delete a customer (soft delete)
     */
    public function deleteCustomer(Customer $customer): bool
    {
        $result = $customer->delete();
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
     * Get customer statistics
     */
    public function getStatistics(): array
    {
        $customers = $this->getAllCustomers();
        
        return [
            'total' => $customers->count(),
            'active' => $customers->where('status', 'Active')->count(),
            'inactive' => $customers->where('status', 'Inactive')->count(),
            'total_orders' => $customers->sum('orders'),
        ];
    }
}
