<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\CustomerService;
use App\Http\Resources\CustomerResource;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use App\Traits\HasCaching;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    use ApiResponse, AuditLogger, HasCaching;

    protected CustomerService $customerService;

    public function __construct(CustomerService $customerService)
    {
        $this->customerService = $customerService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $customers = $this->customerService->getAllCustomers();
        
        return $this->successResponse(
            CustomerResource::collection($customers),
            'Customers retrieved successfully'
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
            'email' => 'required|email|unique:customers,email',
            'address' => 'required|string',
            'status' => 'required|in:Active,Inactive',
        ], [
            'email.unique' => 'This email is already registered.',
            'email.email' => 'Please enter a valid email address.',
            'phone.regex' => 'Phone must be in format: +63 followed by 10 digits (e.g., +63 912 345 6789) or 09 followed by 9 digits (e.g., 09171234567).',
        ]);

        $customer = $this->customerService->createCustomer($validated);

        $this->logAudit('CREATE', 'Customer', "Created customer: {$customer->name}", [
            'customer_id' => $customer->id,
            'name' => $customer->name,
        ]);

        return $this->successResponse(
            new CustomerResource($customer),
            'Customer created successfully',
            201
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $customer = $this->customerService->getCustomerById((int) $id);
        
        if (!$customer) {
            return $this->errorResponse('Customer not found', 404);
        }
        
        return $this->successResponse(
            new CustomerResource($customer),
            'Customer retrieved successfully'
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);
        
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
                Rule::unique('customers', 'email')->ignore($customer->id)
            ],
            'address' => 'required|string',
            'status' => 'required|in:Active,Inactive',
        ], [
            'email.unique' => 'This email is already registered.',
            'email.email' => 'Please enter a valid email address.',
            'phone.regex' => 'Phone must be in format: +63 followed by 10 digits (e.g., +63 912 345 6789) or 09 followed by 9 digits (e.g., 09171234567).',
        ]);

        $customer = $this->customerService->updateCustomer($customer, $validated);

        $this->logAudit('UPDATE', 'Customer', "Updated customer: {$customer->name}", [
            'customer_id' => $customer->id,
            'changes' => $validated,
        ]);

        return $this->successResponse(
            new CustomerResource($customer),
            'Customer updated successfully'
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);
        
        // Set status to Inactive before soft deleting
        $customer->status = 'Inactive';
        $customer->save();
        
        // Now soft delete (sets deleted_at)
        $this->customerService->deleteCustomer($customer);

        $this->logAudit('DELETE', 'Customer', "Archived customer: {$customer->name}", [
            'customer_id' => $customer->id,
        ]);

        return $this->successResponse(
            null,
            'Customer archived successfully'
        );
    }

    /**
     * Check if email is already taken
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'customer_id' => 'nullable|integer', // For edit mode, to exclude current customer
        ]);

        $email = $request->email;
        $customerId = $request->customer_id;

        $exists = Customer::where('email', $email)
            ->when($customerId, function ($query) use ($customerId) {
                return $query->where('id', '!=', $customerId);
            })
            ->exists();

        return $this->successResponse(
            ['available' => !$exists],
            $exists ? 'Email is already taken' : 'Email is available'
        );
    }
}
