<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\Procurement;
use App\Services\SupplierService;
use App\Http\Resources\SupplierResource;
use App\Http\Resources\ProcurementResource;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    use ApiResponse, AuditLogger;

    protected SupplierService $supplierService;

    public function __construct(SupplierService $supplierService)
    {
        $this->supplierService = $supplierService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $suppliers = $this->supplierService->getAllSuppliers();
        
        return $this->successResponse(
            SupplierResource::collection($suppliers),
            'Suppliers retrieved successfully'
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        // Strip spaces from phone number before validation
        $data = $request->all();
        if (isset($data['phone'])) {
            $data['phone'] = preg_replace('/\s+/', '', $data['phone']);
        }
        $request->merge(['phone' => $data['phone'] ?? '']);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'regex:/^(\+63\d{10}|09\d{9})$/'
            ],
            'email' => 'required|email|unique:suppliers,email',
            'address' => 'required|string',
            'status' => 'required|in:Active,Inactive',
        ], [
            'email.unique' => 'This email is already registered.',
            'email.email' => 'Please enter a valid email address.',
            'phone.regex' => 'Phone must be in format: +63 followed by 10 digits (e.g., +63 912 345 6789) or 09 followed by 9 digits (e.g., 09171234567).',
        ]);

        $supplier = $this->supplierService->createSupplier($validated);

        $this->logAudit('CREATE', 'Supplier', "Created supplier: {$supplier->name}", [
            'supplier_id' => $supplier->id,
            'name' => $supplier->name,
        ]);

        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier created successfully',
            201
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $supplier = $this->supplierService->getSupplierById((int) $id);
        
        if (!$supplier) {
            return $this->errorResponse('Supplier not found', 404);
        }
        
        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier retrieved successfully'
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        
        // Strip spaces from phone number before validation
        $data = $request->all();
        if (isset($data['phone'])) {
            $data['phone'] = preg_replace('/\s+/', '', $data['phone']);
        }
        $request->merge(['phone' => $data['phone'] ?? '']);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'regex:/^(\+63\d{10}|09\d{9})$/'
            ],
            'email' => [
                'required',
                'email',
                Rule::unique('suppliers', 'email')->ignore($supplier->id)
            ],
            'address' => 'required|string',
            'status' => 'required|in:Active,Inactive',
        ], [
            'email.unique' => 'This email is already registered.',
            'email.email' => 'Please enter a valid email address.',
            'phone.regex' => 'Phone must be in format: +63 followed by 10 digits (e.g., +63 912 345 6789) or 09 followed by 9 digits (e.g., 09171234567).',
        ]);

        $supplier = $this->supplierService->updateSupplier($supplier, $validated);

        $this->logAudit('UPDATE', 'Supplier', "Updated supplier: {$supplier->name}", [
            'supplier_id' => $supplier->id,
            'changes' => $validated,
        ]);

        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier updated successfully'
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        
        // Set status to Inactive before soft deleting
        $supplier->status = 'Inactive';
        $supplier->saveQuietly(); // Use saveQuietly to avoid double events
        
        // Now soft delete (sets deleted_at)
        $this->supplierService->deleteSupplier($supplier);

        $this->logAudit('ARCHIVE', 'Supplier', "Archived supplier: {$supplier->name}", [
            'supplier_id' => $supplier->id,
        ]);

        return $this->successResponse(
            null,
            'Supplier archived successfully'
        );
    }

    /**
     * Check if email is already taken
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'supplier_id' => 'nullable|integer', // For edit mode, to exclude current supplier
        ]);

        $email = $request->email;
        $supplierId = $request->supplier_id;

        // SoftDeletes trait automatically excludes soft-deleted records
        $exists = Supplier::where('email', $email)
            ->when($supplierId, function ($query) use ($supplierId) {
                return $query->where('id', '!=', $supplierId);
            })
            ->exists();

        return $this->successResponse(
            ['available' => !$exists],
            $exists ? 'Email is already taken' : 'Email is available'
        );
    }

    /**
     * Get all procurements for a specific supplier
     */
    public function procurements(string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        
        $procurements = Procurement::with(['variety', 'batch', 'dryingProcesses', 'dryingBatchAllocations'])
            ->where('supplier_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(
            ProcurementResource::collection($procurements),
            "Procurements for {$supplier->name} retrieved successfully"
        );
    }
}
