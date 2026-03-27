<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailService;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use AuditLogger;

    public function __construct(private EmailService $emailService)
    {
    }

    /**
     * Login and return token + user data
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error' => 'The provided credentials are incorrect.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'error' => 'Your account has been deactivated. Please contact an administrator.',
            ], 403);
        }

        // Revoke all existing tokens for this user
        $user->tokens()->delete();

        // Create new token with role-based abilities
        $abilities = $this->getAbilitiesForRole($user->role);
        $token = $user->createToken('auth-token', $abilities)->plainTextToken;

        // Log the login (manually set user_id since Auth::id() may not be set yet)
        \App\Models\AuditTrail::create([
            'user_id'    => $user->id,
            'action'     => 'LOGIN',
            'module'     => 'Authentication',
            'description'=> "User {$user->name} logged in",
            'details'    => ['role' => $user->role],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $this->formatUser($user),
            'message' => 'Login successful',
        ]);
    }

    /**
     * Send login notification emails — called fire-and-forget from frontend after login.
     */
    public function sendLoginEmail(Request $request)
    {
        $user = $request->user();
        $ip = $request->ip();

        try {
            $this->emailService->sendLoginNotification($user, $ip);
            if ($user->role === 'customer') {
                $this->emailService->sendCustomerLoginNotification($user, $ip);
            }
        } catch (\Throwable $e) {
            // Silent — don't fail the request
        }

        return response()->json(['success' => true]);
    }

    /**
     * Logout (revoke current token)
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        $this->logAudit('LOGOUT', 'Authentication', "User {$user->name} logged out", [
            'role' => $user->role,
        ]);

        $user->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $this->formatUser($request->user()),
        ]);
    }

    /**
     * Format user data for frontend
     */
    private function formatUser(User $user): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'position' => $user->position,
            'status' => $user->status,
            'created_at' => $user->created_at,
        ];

        // Include customer address for customer-role users
        if ($user->role === 'customer') {
            $customer = $user->customer;
            $data['address'] = $customer?->address;
        }

        // Include truck plate number for driver staff
        if ($user->role === 'staff' && $user->position === 'Driver') {
            $data['truck_plate_number'] = $user->truck_plate_number;
            $data['date_hired'] = $user->date_hired;
        }

        return $data;
    }

    /**
     * Update own profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email'      => [
                'sometimes',
                'email',
                Rule::unique('users')->ignore($user->id),
                function ($attribute, $value, $fail) use ($user) {
                    // Check customers table but allow the linked customer record
                    $query = \App\Models\Customer::where('email', $value);
                    if ($user->role === 'customer') {
                        $query->where('email', '!=', $user->email);
                    }
                    if ($query->exists()) {
                        $fail('This email is already registered.');
                    }
                    // Check suppliers table
                    if (\App\Models\Supplier::where('email', $value)->exists()) {
                        $fail('This email is already registered.');
                    }
                },
            ],
            'phone'      => 'nullable|string|max:50',
            'address'    => 'nullable|string|max:500',
        ]);

        // Build the name from first_name + last_name
        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $firstName = $validated['first_name'] ?? $user->first_name ?? '';
            $lastName  = $validated['last_name'] ?? $user->last_name ?? '';
            $validated['name'] = trim("$firstName $lastName");
        }

        // Handle address for customer users
        $address = $validated['address'] ?? null;
        unset($validated['address']);

        $oldEmail = $user->email;
        $user->update($validated);

        // Sync all changed fields to linked customer record
        if ($user->role === 'customer') {
            $customer = \App\Models\Customer::where('email', $oldEmail)->first();
            if ($customer) {
                $customerUpdates = [
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'phone'   => $validated['phone'] ?? $customer->phone,
                    'contact' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                ];
                if ($address !== null) {
                    $customerUpdates['address'] = $address;
                }
                $customer->update($customerUpdates);
            }
        }

        return response()->json([
            'success' => true,
            'user'    => $this->formatUser($user->fresh()),
            'message' => 'Profile updated successfully',
        ]);
    }

    /**
     * Change own password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    /**
     * Get token abilities based on role
     */
    private function getAbilitiesForRole(string $role): array
    {
        return match ($role) {
            User::ROLE_SUPER_ADMIN => ['*'],
            User::ROLE_ADMIN => [
                'products:*', 'varieties:*',
                'suppliers:*', 'customers:*',
                'procurements:*', 'processings:*', 'drying:*',
                'sales:*', 'orders:*', 'drivers:*', 'deliveries:*',
                'staff:*', 'settings:*', 'pos:*',
            ],
            User::ROLE_STAFF => [
                'products:read', 'sales:create', 'pos:*',
                'orders:read',
            ],
            default => [],
        };
    }
}
