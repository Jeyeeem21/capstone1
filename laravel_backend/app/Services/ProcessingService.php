<?php

namespace App\Services;

use App\Models\Processing;
use App\Models\Procurement;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

/**
 * Service class for Processing
 * Handles all business logic related to rice processing
 * Ultra-fast caching with proper invalidation for instant loading
 */
class ProcessingService
{
    private const CACHE_KEY = 'processings_all';
    private const CACHE_KEY_ACTIVE = 'processings_active';
    private const CACHE_KEY_COMPLETED = 'processings_completed';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all processings with procurement - cached for speed
     */
    public function getAllProcessings(): Collection
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return Processing::with(['procurement:id,supplier_id,quantity_kg,quantity_out', 'procurement.supplier:id,name'])
                ->select(['id', 'procurement_id', 'input_kg', 'output_kg', 'stock_out', 'husk_kg', 'yield_percent', 'operator_name', 'status', 'processing_date', 'completed_date', 'created_at'])
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Get active processings (Pending + Processing status) - cached
     */
    public function getActiveProcessings(): Collection
    {
        return Cache::remember(self::CACHE_KEY_ACTIVE, self::CACHE_TTL, function () {
            return Processing::with(['procurement:id,supplier_id,quantity_kg,quantity_out', 'procurement.supplier:id,name'])
                ->select(['id', 'procurement_id', 'input_kg', 'output_kg', 'stock_out', 'husk_kg', 'yield_percent', 'operator_name', 'status', 'processing_date', 'completed_date', 'created_at'])
                ->active()
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    /**
     * Get completed processings - cached
     */
    public function getCompletedProcessings(): Collection
    {
        return Cache::remember(self::CACHE_KEY_COMPLETED, self::CACHE_TTL, function () {
            return Processing::with(['procurement:id,supplier_id,quantity_kg,quantity_out', 'procurement.supplier:id,name'])
                ->select(['id', 'procurement_id', 'input_kg', 'output_kg', 'stock_out', 'husk_kg', 'yield_percent', 'operator_name', 'status', 'processing_date', 'completed_date', 'created_at'])
                ->completed()
                ->orderBy('completed_date', 'desc')
                ->get();
        });
    }

    /**
     * Get a single processing with procurement
     */
    public function getProcessingById(int $id): ?Processing
    {
        return Processing::with('procurement.supplier')->find($id);
    }

    /**
     * Create a new processing record
     * Also updates procurement's quantity_out to track what's been sent to processing
     */
    public function createProcessing(array $data): Processing
    {
        return DB::transaction(function () use ($data) {
            $processing = Processing::create([
                'procurement_id' => $data['procurement_id'] ?? null,
                'input_kg' => $data['input_kg'],
                'operator_name' => $data['operator_name'] ?? null,
                'status' => Processing::STATUS_PENDING,
                'processing_date' => $data['processing_date'] ?? now()->toDateString(),
            ]);
            
            // Update procurement's quantity_out if linked to a procurement
            if ($processing->procurement_id) {
                $procurement = Procurement::find($processing->procurement_id);
                if ($procurement) {
                    $procurement->increment('quantity_out', $data['input_kg']);
                }
            }
            
            $this->clearCache();
            return $processing->load('procurement.supplier');
        });
    }

    /**
     * Update an existing processing
     */
    public function updateProcessing(Processing $processing, array $data): Processing
    {
        return DB::transaction(function () use ($processing, $data) {
            $oldInputKg = (float)$processing->input_kg;
            $newInputKg = isset($data['input_kg']) ? (float)$data['input_kg'] : $oldInputKg;
            
            // If input_kg changed and linked to procurement, update quantity_out
            if ($processing->procurement_id && $oldInputKg !== $newInputKg) {
                $difference = $newInputKg - $oldInputKg;
                $procurement = Procurement::find($processing->procurement_id);
                if ($procurement) {
                    $procurement->increment('quantity_out', $difference);
                }
            }
            
            $processing->update($data);
            $this->clearCache();
            return $processing->fresh()->load('procurement.supplier');
        });
    }

    /**
     * Start processing - change status to Processing
     */
    public function startProcessing(Processing $processing): Processing
    {
        $processing->update([
            'status' => Processing::STATUS_PROCESSING,
        ]);
        $this->clearCache();
        return $processing->fresh()->load('procurement.supplier');
    }

    /**
     * Complete processing - set output, calculate husk & yield, change status
     */
    public function completeProcessing(Processing $processing, float $outputKg): Processing
    {
        return DB::transaction(function () use ($processing, $outputKg) {
            $processing->calculateResults($outputKg);
            $processing->status = Processing::STATUS_COMPLETED;
            $processing->completed_date = now()->toDateString();
            $processing->stock_out = 0; // Reset stock_out when completing
            $processing->save();
            
            $this->clearCache();
            return $processing->fresh()->load('procurement.supplier');
        });
    }

    /**
     * Return a completed processing back to processing status
     * Only allowed when stock_out is 0
     */
    public function returnToProcessing(Processing $processing): Processing
    {
        if ($processing->status !== Processing::STATUS_COMPLETED) {
            throw new \Exception('Only completed batches can be returned to processing.');
        }
        
        if ((float)$processing->stock_out > 0) {
            throw new \Exception('Cannot return to processing: stock has already been distributed.');
        }
        
        return DB::transaction(function () use ($processing) {
            $processing->update([
                'status' => Processing::STATUS_PROCESSING,
                'completed_date' => null,
                'output_kg' => null,
                'husk_kg' => null,
                'yield_percent' => null,
            ]);
            
            $this->clearCache();
            return $processing->fresh()->load('procurement.supplier');
        });
    }

    /**
     * Delete a processing (soft delete)
     * Returns the input_kg back to procurement's quantity_out
     */
    public function deleteProcessing(Processing $processing): bool
    {
        return DB::transaction(function () use ($processing) {
            // Return input_kg to procurement if linked
            if ($processing->procurement_id) {
                $procurement = Procurement::find($processing->procurement_id);
                if ($procurement) {
                    $procurement->decrement('quantity_out', (float)$processing->input_kg);
                }
            }
            
            $deleted = $processing->delete();
            $this->clearCache();
            return $deleted;
        });
    }

    /**
     * Clear all processing caches AND procurement cache (since processing affects quantity_out)
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::CACHE_KEY_ACTIVE);
        Cache::forget(self::CACHE_KEY_COMPLETED);
        // Also clear procurement cache since processing affects quantity_out
        Cache::forget('procurements_all');
    }

    /**
     * Get statistics for dashboard
     */
    public function getStatistics(): array
    {
        $all = $this->getAllProcessings();
        $completed = $all->where('status', Processing::STATUS_COMPLETED);
        
        return [
            'total' => $all->count(),
            'pending' => $all->where('status', Processing::STATUS_PENDING)->count(),
            'processing' => $all->where('status', Processing::STATUS_PROCESSING)->count(),
            'completed' => $completed->count(),
            'total_input' => $all->sum('input_kg'),
            'total_output' => $completed->sum('output_kg'),
            'total_husk' => $completed->sum('husk_kg'),
            'total_stock_out' => $completed->sum('stock_out'),
            'avg_yield' => $completed->count() > 0 ? round($completed->avg('yield_percent'), 2) : 0,
        ];
    }
}
