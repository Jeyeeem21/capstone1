<?php

namespace App\Http\Controllers;

use App\Models\Procurement;
use App\Services\ProcurementService;
use App\Http\Resources\ProcurementResource;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProcurementController extends Controller
{
    use ApiResponse;

    protected ProcurementService $procurementService;

    public function __construct(ProcurementService $procurementService)
    {
        $this->procurementService = $procurementService;
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
            'quantity_kg' => 'required|numeric|min:0',
            'quantity_out' => 'nullable|numeric|min:0',
            'price_per_kg' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'required|in:Pending,Completed,Cancelled',
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
            'quantity_kg' => 'required|numeric|min:0',
            'quantity_out' => 'nullable|numeric|min:0',
            'price_per_kg' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'required|in:Pending,Completed,Cancelled',
        ], [
            'supplier_id.required' => 'Supplier is required.',
            'quantity_kg.required' => 'Quantity is required.',
            'price_per_kg.required' => 'Price per kg is required.',
        ]);

        $procurement = $this->procurementService->updateProcurement($procurement, $validated);

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
