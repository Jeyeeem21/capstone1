<?php

namespace App\Http\Controllers;

use App\Models\Processing;
use App\Services\ProcessingService;
use App\Http\Resources\ProcessingResource;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ProcessingController extends Controller
{
    use ApiResponse;

    public function __construct(
        private ProcessingService $processingService
    ) {}

    /**
     * Get all processings
     */
    public function index(): JsonResponse
    {
        $processings = $this->processingService->getAllProcessings();
        
        return $this->successResponse(
            ProcessingResource::collection($processings),
            'Processings retrieved successfully'
        );
    }

    /**
     * Get active processings (Pending + Processing)
     */
    public function active(): JsonResponse
    {
        $processings = $this->processingService->getActiveProcessings();
        
        return $this->successResponse(
            ProcessingResource::collection($processings),
            'Active processings retrieved successfully'
        );
    }

    /**
     * Get completed processings
     */
    public function completed(): JsonResponse
    {
        $processings = $this->processingService->getCompletedProcessings();
        
        return $this->successResponse(
            ProcessingResource::collection($processings),
            'Completed processings retrieved successfully'
        );
    }

    /**
     * Get processing statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = $this->processingService->getStatistics();
        
        return $this->successResponse($stats, 'Statistics retrieved successfully');
    }

    /**
     * Store a new processing
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'drying_process_id' => 'nullable|exists:drying_processes,id',
            'drying_process_ids' => 'nullable|array',
            'drying_process_ids.*' => 'exists:drying_processes,id',
            'procurement_id' => 'nullable|exists:procurements,id',
            'input_kg' => 'required|numeric|min:0.01',
            'operator_name' => 'nullable|string|max:255',
            'processing_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $processing = $this->processingService->createProcessing($validator->validated());

            return $this->createdResponse(
                new ProcessingResource($processing),
                'Processing record created successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create processing record: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Show a single processing
     */
    public function show(Processing $processing): JsonResponse
    {
        $processing->load(['procurement:id,supplier_id,quantity_kg,sacks', 'procurement.supplier:id,name']);
        
        return $this->successResponse(
            new ProcessingResource($processing),
            'Processing retrieved successfully'
        );
    }

    /**
     * Update a processing
     */
    public function update(Request $request, Processing $processing): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'drying_process_id' => 'nullable|exists:drying_processes,id',
            'procurement_id' => 'nullable|exists:procurements,id',
            'input_kg' => 'sometimes|required|numeric|min:0.01',
            'operator_name' => 'nullable|string|max:255',
            'processing_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $processing = $this->processingService->updateProcessing($processing, $validator->validated());

            return $this->successResponse(
                new ProcessingResource($processing),
                'Processing record updated successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update processing record: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Start processing - change status to Processing
     */
    public function process(Processing $processing): JsonResponse
    {
        if ($processing->status !== Processing::STATUS_PENDING) {
            return $this->errorResponse('Only pending records can be started', 422);
        }

        try {
            $processing = $this->processingService->startProcessing($processing);

            return $this->successResponse(
                new ProcessingResource($processing),
                'Processing started'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to start processing: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Complete processing - set output and finalize
     */
    public function complete(Request $request, Processing $processing): JsonResponse
    {
        if ($processing->status !== Processing::STATUS_PROCESSING) {
            return $this->errorResponse('Only processing records can be completed', 422);
        }

        $validator = Validator::make($request->all(), [
            'output_kg' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $processing = $this->processingService->completeProcessing(
                $processing, 
                (float) $request->output_kg
            );

            return $this->successResponse(
                new ProcessingResource($processing),
                'Processing completed'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to complete processing: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Return a completed batch back to processing status
     * Only allowed when stock_out is 0 (no stock has been distributed)
     */
    public function returnToProcessing(Processing $processing): JsonResponse
    {
        if ($processing->status !== Processing::STATUS_COMPLETED) {
            return $this->errorResponse('Only completed batches can be returned to processing', 422);
        }

        if ((float)$processing->stock_out > 0) {
            return $this->errorResponse('Cannot return to processing: stock has already been distributed', 422);
        }

        try {
            $processing = $this->processingService->returnToProcessing($processing);

            return $this->successResponse(
                new ProcessingResource($processing),
                'Batch returned to processing'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to return to processing: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a processing (soft delete)
     */
    public function destroy(Processing $processing): JsonResponse
    {
        try {
            $this->processingService->deleteProcessing($processing);

            return $this->successResponse(null, 'Processing record removed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to remove processing record: ' . $e->getMessage(), 500);
        }
    }
}
