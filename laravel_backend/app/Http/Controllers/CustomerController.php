<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use App\Models\Sale;
use App\Services\CustomerService;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\SaleResource;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use App\Traits\HasCaching;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;

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

        $this->logAudit('ARCHIVE', 'Customer', "Archived customer: {$customer->name}", [
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

    /**
     * Get all orders/sales for a specific customer
     */
    public function orders(string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $sales = Sale::where('customer_id', $customer->id)
            ->with(['items.product.variety'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(
            SaleResource::collection($sales),
            'Customer orders retrieved successfully'
        );
    }

    /**
     * Send email verification code to customer's email
     */
    public function sendVerificationCode(Request $request, string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        if (!$customer->email) {
            return $this->errorResponse('Customer has no email address.', 422);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store in cache for 10 minutes
        $cacheKey = "email_verify_{$customer->id}";
        Cache::put($cacheKey, [
            'code' => $code,
            'email' => $customer->email,
            'attempts' => 0,
        ], now()->addMinutes(10));

        // Send email
        try {
            Mail::raw(
                "Your KJP Ricemill email verification code is: {$code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.",
                function ($message) use ($customer) {
                    $message->to($customer->email)
                            ->subject('KJP Ricemill - Email Verification Code');
                }
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to send verification email. Please check mail configuration. Error: ' . $e->getMessage(), 500);
        }

        $this->logAudit('VERIFY_EMAIL', 'Customer', "Sent verification code to {$customer->email}", [
            'customer_id' => $customer->id,
            'email' => $customer->email,
        ]);

        return $this->successResponse(
            ['sent' => true],
            'Verification code sent to ' . $customer->email
        );
    }

    /**
     * Verify the code entered by admin
     */
    public function verifyCode(Request $request, string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $cacheKey = "email_verify_{$customer->id}";
        $cached = Cache::get($cacheKey);

        if (!$cached) {
            return $this->errorResponse('Verification code has expired. Please request a new one.', 422);
        }

        if ($cached['attempts'] >= 5) {
            Cache::forget($cacheKey);
            return $this->errorResponse('Too many failed attempts. Please request a new code.', 429);
        }

        if ($cached['code'] !== $request->code) {
            // Increment attempts
            $cached['attempts']++;
            Cache::put($cacheKey, $cached, now()->addMinutes(10));
            $remaining = 5 - $cached['attempts'];
            return $this->errorResponse("Invalid verification code. {$remaining} attempts remaining.", 422);
        }

        // Code is valid — clear it
        Cache::forget($cacheKey);

        $this->logAudit('EMAIL_VERIFIED', 'Customer', "Email verified for {$customer->email}", [
            'customer_id' => $customer->id,
            'email' => $customer->email,
        ]);

        return $this->successResponse(
            ['verified' => true, 'email' => $customer->email],
            'Email verified successfully'
        );
    }

    /**
     * Create a user account for a customer
     */
    public function createAccount(Request $request, string $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        // Check if account already exists
        $existingUser = User::where('email', $customer->email)->first();
        if ($existingUser) {
            return $this->errorResponse('An account with this email already exists.', 422);
        }

        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
        ]);

        $user = User::create([
            'name' => $customer->name,
            'first_name' => $customer->contact ? explode(' ', $customer->contact)[0] : null,
            'last_name' => $customer->contact ? (count(explode(' ', $customer->contact)) > 1 ? implode(' ', array_slice(explode(' ', $customer->contact), 1)) : null) : null,
            'email' => $customer->email,
            'password' => Hash::make($validated['password']),
            'role' => 'client',
            'phone' => $customer->phone,
            'status' => 'active',
        ]);

        $this->logAudit('CREATE_ACCOUNT', 'Customer', "Created client account for {$customer->name} ({$customer->email})", [
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'email' => $customer->email,
        ]);

        return $this->successResponse(
            [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'Client account created successfully'
        );
    }
}
