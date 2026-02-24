<?php

namespace App\Http\Controllers;

use App\Models\Procurement;
use App\Models\ProcurementBatch;
use App\Services\ProcurementService;
use App\Services\ProcurementBatchService;
use App\Http\Resources\ProcurementResource;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProcurementController extends Controller
{
    use ApiResponse;

    protected ProcurementService $procurementService;
    protected ProcurementBatchService $batchService;

    public function __construct(ProcurementService $procurementService, ProcurementBatchService $batchService)
    {
        $this->procurementService = $procurementService;
        $this->batchService = $batchService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $procurements = $this->procurementService->getAllProcurements();
        
        return $this->successResponse(
            ProcurementResource::collection($procurements),
            'Procurements retrieved successfully'
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'new_supplier_name' => 'nullable|string|max:255',
            'variety_id' => 'required|exists:varieties,id',
            'quantity_kg' => 'required|numeric|min:0',
            'sacks' => 'required|integer|min:0',
            'price_per_kg' => 'required|numeric|min:0',
            'description' => 'required|string',
            'status' => 'required|in:Pending,Drying,Dried,Completed,Cancelled',
            'batch_id' => 'nullable|integer|exists:procurement_batches,id',
        ], [
            'quantity_kg.required' => 'Quantity is required.',
            'price_per_kg.required' => 'Price per kg is required.',
        ]);

        // Must have either supplier_id or new_supplier_name
        if (empty($validated['supplier_id']) && empty($validated['new_supplier_name'])) {
            return $this->errorResponse('Please select a supplier or enter a new supplier name.', 422);
        }

        $newSupplierName = $validated['new_supplier_name'] ?? null;
        unset($validated['new_supplier_name']);

        $procurement = $this->procurementService->createProcurement($validated, $newSupplierName);

        // If batch_id is set, validate variety match + batch status and recalculate totals
        if (!empty($validated['batch_id'])) {
            $batch = ProcurementBatch::findOrFail($validated['batch_id']);

            if ($batch->status === ProcurementBatch::STATUS_COMPLETED) {
                return $this->errorResponse("Batch {$batch->batch_number} is Completed. Cannot add procurements.", 422);
            }

            if ((int) $validated['variety_id'] !== (int) $batch->variety_id) {
                // Rollback: remove batch_id from the just-created procurement
                $procurement->update(['batch_id' => null]);
                return $this->errorResponse('Procurement variety does not match batch variety.', 422);
            }

            $batch->recalculateTotals();
            $this->batchService->clearCache();
        }

        return $this->successResponse(
            new ProcurementResource($procurement),
            'Procurement created successfully',
            201
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $procurement = $this->procurementService->getProcurementById((int) $id);
        
        if (!$procurement) {
            return $this->errorResponse('Procurement not found', 404);
        }
        
        return $this->successResponse(
            new ProcurementResource($procurement),
            'Procurement retrieved successfully'
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $procurement = Procurement::findOrFail($id);
        
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'variety_id' => 'required|exists:varieties,id',
            'quantity_kg' => 'required|numeric|min:0',
            'sacks' => 'required|integer|min:0',
            'price_per_kg' => 'required|numeric|min:0',
            'description' => 'required|string',
            'status' => 'required|in:Pending,Drying,Dried,Completed,Cancelled',
            'batch_id' => 'nullable|integer|exists:procurement_batches,id',
        ], [
            'supplier_id.required' => 'Supplier is required.',
            'quantity_kg.required' => 'Quantity is required.',
            'price_per_kg.required' => 'Price per kg is required.',
        ]);

        // Block variety change if procurement belongs to a batch
        if ($procurement->batch_id && isset($validated['variety_id'])) {
            $batch = ProcurementBatch::find($procurement->batch_id);
            if ($batch && (int) $validated['variety_id'] !== (int) $batch->variety_id) {
                return $this->errorResponse('Cannot change variety — procurement is assigned to batch ' . $batch->batch_number . ' which requires variety match.', 422);
            }
        }

        // If batch_id is changing, validate the new batch
        if (isset($validated['batch_id']) && $validated['batch_id'] != $procurement->batch_id) {
            if ($validated['batch_id']) {
                $newBatch = ProcurementBatch::findOrFail($validated['batch_id']);
                if ($newBatch->status !== ProcurementBatch::STATUS_OPEN) {
                    return $this->errorResponse("Batch {$newBatch->batch_number} is {$newBatch->status}. Cannot add procurements.", 422);
                }
                if ((int) ($validated['variety_id'] ?? $procurement->variety_id) !== (int) $newBatch->variety_id) {
                    return $this->errorResponse('Procurement variety does not match target batch variety.', 422);
                }
            }
        }

        $oldBatchId = $procurement->batch_id;

        $procurement = $this->procurementService->updateProcurement($procurement, $validated);

        // Recalculate batch totals if batch changed
        if (isset($validated['batch_id'])) {
            if ($oldBatchId && $oldBatchId != ($validated['batch_id'] ?? null)) {
                $oldBatch = ProcurementBatch::find($oldBatchId);
                $oldBatch?->recalculateTotals();
            }
            if ($validated['batch_id']) {
                $newBatch = ProcurementBatch::find($validated['batch_id']);
                $newBatch?->recalculateTotals();
            }
            $this->batchService->clearCache();
        } elseif ($procurement->batch_id) {
            // Quantity/sacks may have changed, recalculate batch
            $batch = ProcurementBatch::find($procurement->batch_id);
            $batch?->recalculateTotals();
            $this->batchService->clearCache();
        }

        return $this->successResponse(
            new ProcurementResource($procurement),
            'Procurement updated successfully'
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $procurement = Procurement::findOrFail($id);
        
        // Set status to Cancelled before soft deleting
        $procurement->status = 'Cancelled';
        $procurement->saveQuietly();
        
        // Now soft delete
        $this->procurementService->deleteProcurement($procurement);

        return $this->successResponse(
            null,
            'Procurement deleted successfully'
        );
    }

    /**
     * Get procurement statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = $this->procurementService->getStatistics();
        
        return $this->successResponse($stats, 'Statistics retrieved successfully');
    }
}
