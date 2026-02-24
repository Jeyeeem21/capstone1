<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProcurementBatchResource;
use App\Models\Procurement;
use App\Models\ProcurementBatch;
use App\Services\ProcurementBatchService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ProcurementBatchController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly ProcurementBatchService $service) {}

    /** GET /api/procurement-batches */
    public function index(): JsonResponse
    {
        try {
            $batches = $this->service->getAllBatches();
            return $this->successResponse(ProcurementBatchResource::collection($batches));
        } catch (Throwable $e) {
            return $this->errorResponse('Failed to fetch batches: ' . $e->getMessage(), 500);
        }
    }

    /** GET /api/procurement-batches/open  – for dropdowns */
    public function open(): JsonResponse
    {
        try {
            $batches = $this->service->getOpenBatches();
            return $this->successResponse(ProcurementBatchResource::collection($batches));
        } catch (Throwable $e) {
            return $this->errorResponse('Failed to fetch open batches: ' . $e->getMessage(), 500);
        }
    }

    /** GET /api/procurement-batches/{id} */
    public function show(int $id): JsonResponse
    {
        try {
            $batch = $this->service->getBatchById($id);
            return $this->successResponse(new ProcurementBatchResource($batch));
        } catch (Throwable $e) {
            return $this->errorResponse('Batch not found: ' . $e->getMessage(), 404);
        }
    }

    /** POST /api/procurement-batches */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'variety_id'  => 'required|integer|exists:varieties,id',
            'season_date' => 'nullable|date',
            'notes'       => 'nullable|string|max:1000',
        ]);

        try {
            $batch = $this->service->createBatch($data);
            return $this->successResponse(new ProcurementBatchResource($batch), 201);
        } catch (Throwable $e) {
            return $this->errorResponse('Failed to create batch: ' . $e->getMessage(), 500);
        }
    }

    /** PUT /api/procurement-batches/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'variety_id'  => 'sometimes|integer|exists:varieties,id',
            'season_date' => 'nullable|date',
            'notes'       => 'nullable|string|max:1000',
            'status'      => 'sometimes|in:Open,Closed,Completed',
        ]);

        try {
            $batch = ProcurementBatch::findOrFail($id);
            $batch = $this->service->updateBatch($batch, $data);
            return $this->successResponse(new ProcurementBatchResource($batch));
        } catch (Throwable $e) {
            return $this->errorResponse('Failed to update batch: ' . $e->getMessage(), 500);
        }
    }

    /** DELETE /api/procurement-batches/{id} */
    public function destroy(int $id): JsonResponse
    {
        try {
            $batch = ProcurementBatch::findOrFail($id);
            $this->service->deleteBatch($batch);
            return $this->successResponse(['message' => 'Batch deleted successfully']);
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /** POST /api/procurement-batches/{batchId}/assign/{procurementId} */
    public function assignProcurement(int $batchId, int $procurementId): JsonResponse
    {
        try {
            $batch = ProcurementBatch::findOrFail($batchId);
            $procurement = Procurement::findOrFail($procurementId);
            $this->service->assignProcurement($batch, $procurement);
            // Reload batch with relations for response
            $batch = $this->service->getBatchById($batchId);
            return $this->successResponse(new ProcurementBatchResource($batch));
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /** DELETE /api/procurement-batches/remove-procurement/{procurementId} */
    public function removeProcurement(int $procurementId): JsonResponse
    {
        try {
            $procurement = Procurement::findOrFail($procurementId);
            $batchId = $procurement->batch_id;
            $this->service->removeProcurement($procurement);
            return $this->successResponse(['message' => 'Procurement removed from batch successfully']);
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/procurement-batches/{batchId}/drying-distribution?sacks=X
     * Returns proportional distribution preview before committing.
     */
    public function dryingDistribution(Request $request, int $batchId): JsonResponse
    {
        $request->validate([
            'sacks' => 'required|integer|min:1',
        ]);

        try {
            $batch = $this->service->getBatchById($batchId);
            $result = $this->service->calculateDryingDistribution($batch, (int) $request->sacks);
            return $this->successResponse($result);
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}
