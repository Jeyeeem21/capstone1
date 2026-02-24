<?php

namespace App\Http\Controllers;

use App\Models\Variety;
use App\Services\VarietyService;
use App\Http\Resources\VarietyResource;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VarietyController extends Controller
{
    use ApiResponse;

    protected VarietyService $varietyService;

    public function __construct(VarietyService $varietyService)
    {
        $this->varietyService = $varietyService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $varieties = $this->varietyService->getAllVarieties();

        return $this->successResponse(
            VarietyResource::collection($varieties),
            'Varieties retrieved successfully'
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:20',
            'status'      => 'required|in:Active,Inactive',
        ], [
            'name.required' => 'Variety name is required.',
        ]);

        $variety = $this->varietyService->createVariety($validated);

        return $this->successResponse(
            new VarietyResource($variety),
            'Variety created successfully',
            201
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $variety = $this->varietyService->getVarietyById((int) $id);

        if (!$variety) {
            return $this->errorResponse('Variety not found', 404);
        }

        return $this->successResponse(
            new VarietyResource($variety),
            'Variety retrieved successfully'
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $variety = Variety::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:20',
            'status'      => 'required|in:Active,Inactive',
        ], [
            'name.required' => 'Variety name is required.',
        ]);

        $variety = $this->varietyService->updateVariety($variety, $validated);

        return $this->successResponse(
            new VarietyResource($variety),
            'Variety updated successfully'
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $variety = Variety::findOrFail($id);

        // Set status to Inactive before soft deleting
        $variety->status = 'Inactive';
        $variety->saveQuietly();

        $this->varietyService->deleteVariety($variety);

        return $this->successResponse(
            null,
            'Variety deleted successfully'
        );
    }
}
