<?php

namespace App\Services;

use App\Models\Procurement;
use App\Models\Supplier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

/**
 * Service class for Procurement
 * Handles all business logic related to procurements
 * Fast caching with proper invalidation for instant loading
 */
class ProcurementService
{
    private const CACHE_KEY = 'procurements_all';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all procurements with supplier - cached for speed
     */
    public function getAllProcurements(): Collection
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Procurement::with(['supplier', 'variety', 'batch:id,batch_number,status', 'dryingProcesses:id,procurement_id,sacks,quantity_kg', 'dryingBatchAllocations:id,procurement_id,sacks_taken,quantity_kg'])                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Get a single procurement with supplier
     */
    public function getProcurementById(int $id): ?Procurement
    {
        return Procurement::with(['supplier', 'variety'])->find($id);
    }

    /**
     * Create a new procurement with optional new supplier
     */
    public function createProcurement(array $data, ?string $newSupplierName = null): Procurement
    {
        return DB::transaction(function () use ($data, $newSupplierName) {
            // If new supplier name is provided, create the supplier first
            if ($newSupplierName && !isset($data['supplier_id'])) {
                $supplier = Supplier::create([
                    'name' => $newSupplierName,
                    'contact' => null,
                    'phone' => null,
                    'email' => null,
                    'address' => null,
                    'status' => 'Active',
                ]);
                $data['supplier_id'] = $supplier->id;
                
                // Clear supplier cache too
                Cache::forget('suppliers_all');
            }
            
            $procurement = Procurement::create($data);
            $this->clearCache();
            return $procurement->load('supplier');
        });
    }

    /**
     * Update an existing procurement
     */
    public function updateProcurement(Procurement $procurement, array $data): Procurement
    {
        $procurement->update($data);
        $this->clearCache();
        return $procurement->fresh()->load('supplier');
    }

    /**
     * Delete a procurement (soft delete)
     */
    public function deleteProcurement(Procurement $procurement): bool
    {
        $result = $procurement->delete();
        $this->clearCache();
        return $result;
    }

    /**
     * Get procurement statistics
     */
    public function getStatistics(): array
    {
        $procurements = $this->getAllProcurements();
        
        return [
            'total' => $procurements->count(),
            'pending' => $procurements->where('status', 'Pending')->count(),
            'completed' => $procurements->where('status', 'Completed')->count(),
            'cancelled' => $procurements->where('status', 'Cancelled')->count(),
            'total_cost' => $procurements->sum('total_cost'),
            'total_quantity' => $procurements->sum('quantity_kg'),
        ];
    }

    /**
     * Clear cache - called after any data modification
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
