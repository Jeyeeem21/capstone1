<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use ApiResponse, AuditLogger;

    public function __construct(private EmailService $emailService)
    {
    }

    /**
     * List users with optional role filter and search.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Filter by role
        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('position', 'like', "%{$search}%");
            });
        }

        // Never show super_admin accounts to non-super-admins
        $currentUser = Auth::user();
        if (!$currentUser->isSuperAdmin()) {
            $query->where('role', '!=', User::ROLE_SUPER_ADMIN);
        }

        // Exclude the current user from the list
        $query->where('id', '!=', $currentUser->id);

        $users = $query->orderBy('created_at', 'desc')->get();

        return $this->successResponse(
            $users->map(fn ($user) => $this->formatUser($user)),
            'Users retrieved successfully'
        );
    }

    /**
     * Get a single user.
     */
    public function show(string $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        return $this->successResponse(
            $this->formatUser($user),
            'User retrieved successfully'
        );
    }

    /**
     * Create a new user (staff or admin).
     */
    public function store(Request $request): JsonResponse
    {
        $currentUser = Auth::user();

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name'  => 'nullable|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:8',
            'role'       => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_STAFF])],
            'position'   => 'nullable|string|max:50',
            'truck_plate_number' => 'nullable|string|max:20',
            'phone'      => 'nullable|string|max:50',
            'status'     => 'nullable|string|in:active,inactive',
            'date_hired' => 'nullable|date',
        ]);

        // Only super_admin can create admin accounts
        if ($validated['role'] === User::ROLE_ADMIN && !$currentUser->isSuperAdmin()) {
            return $this->errorResponse('Only Super Admin can create admin accounts', 403);
        }

        // Require email verification before account creation
        $verifiedKey = "user_email_verified_" . md5($validated['email']);
        if (!Cache::get($verifiedKey)) {
            return $this->errorResponse('Email must be verified before creating an account.', 422);
        }
        Cache::forget($verifiedKey);

        $validated['status'] = $validated['status'] ?? 'active';

        $user = User::create($validated);

        $this->logAudit('CREATE', 'Users', "Created {$user->role} account: {$user->name}", [
            'user_id'  => $user->id,
            'name'     => $user->name,
            'email'    => $user->email,
            'role'     => $user->role,
            'position' => $user->position,
        ]);

        return $this->successResponse(
            $this->formatUser($user),
            'User created successfully',
            201
        );
    }

    /**
     * Send email verification code before user creation.
     */
    public function sendVerificationCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = $request->email;

        // Check if email already exists
        if (User::where('email', $email)->exists()) {
            return $this->errorResponse('An account with this email already exists.', 422);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store in cache for 10 minutes
        $cacheKey = "user_email_verify_" . md5($email);
        Cache::put($cacheKey, [
            'code' => $code,
            'email' => $email,
            'attempts' => 0,
        ], now()->addMinutes(10));

        try {
            $this->emailService->sendVerificationCode($email, $code);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to send verification email. Error: ' . $e->getMessage(), 500);
        }

        return $this->successResponse(
            ['sent' => true],
            'Verification code sent to ' . $email
        );
    }

    /**
     * Verify the code entered for user creation.
     */
    public function verifyEmailCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        $cacheKey = "user_email_verify_" . md5($request->email);
        $cached = Cache::get($cacheKey);

        if (!$cached) {
            return $this->errorResponse('Verification code has expired. Please request a new one.', 422);
        }

        if ($cached['attempts'] >= 5) {
            Cache::forget($cacheKey);
            return $this->errorResponse('Too many failed attempts. Please request a new code.', 429);
        }

        if ($cached['code'] !== $request->code) {
            $cached['attempts']++;
            Cache::put($cacheKey, $cached, now()->addMinutes(10));
            $remaining = 5 - $cached['attempts'];
            return $this->errorResponse("Invalid verification code. {$remaining} attempts remaining.", 422);
        }

        // Code is valid — mark as verified in cache (keep for 15 min)
        Cache::forget($cacheKey);
        Cache::put("user_email_verified_" . md5($request->email), true, now()->addMinutes(15));

        return $this->successResponse(
            ['verified' => true, 'email' => $request->email],
            'Email verified successfully'
        );
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);
        $currentUser = Auth::user();

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        // Cannot edit super_admin accounts (except by super_admin themselves)
        if ($user->isSuperAdmin() && $currentUser->id !== $user->id) {
            return $this->errorResponse('Cannot modify Super Admin account', 403);
        }

        // Only super_admin can edit admin accounts
        if ($user->isAdmin() && !$currentUser->isSuperAdmin()) {
            return $this->errorResponse('Only Super Admin can modify admin accounts', 403);
        }

        $validated = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name'  => 'nullable|string|max:255',
            'email'      => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'password'   => 'sometimes|string|min:8',
            'role'       => ['sometimes', Rule::in([User::ROLE_ADMIN, User::ROLE_STAFF])],
            'position'   => 'nullable|string|max:50',
            'truck_plate_number' => 'nullable|string|max:20',
            'phone'      => 'nullable|string|max:50',
            'status'     => 'sometimes|string|in:active,inactive',
            'date_hired' => 'nullable|date',
        ]);

        // Cannot change role of super_admin
        if ($user->isSuperAdmin() && isset($validated['role'])) {
            unset($validated['role']);
        }

        $oldValues = $user->only(['name', 'email', 'role', 'position', 'phone', 'status']);

        // Track changes before updating
        $changes = [];
        $fieldLabels = [
            'name' => 'Name', 'first_name' => 'First Name', 'last_name' => 'Last Name',
            'email' => 'Email', 'role' => 'Role', 'position' => 'Position',
            'phone' => 'Phone', 'status' => 'Status',
        ];
        foreach ($validated as $field => $newValue) {
            if ($field === 'password') continue;
            $oldValue = $user->$field;
            if ((string) $oldValue !== (string) $newValue) {
                $label = $fieldLabels[$field] ?? ucfirst($field);
                $changes[] = "{$label}: \"{$oldValue}\" → \"{$newValue}\"";
            }
        }

        $user->update($validated);

        $this->logAudit('UPDATE', 'Users', "Updated user: {$user->name}", [
            'user_id'    => $user->id,
            'old_values' => $oldValues,
            'new_values' => $user->only(['name', 'email', 'role', 'position', 'phone', 'status']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $this->formatUser($user),
            '_changes' => $changes,
        ]);
    }

    /**
     * Delete / deactivate a user.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = User::find($id);
        $currentUser = Auth::user();

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        // Cannot delete super_admin
        if ($user->isSuperAdmin()) {
            return $this->errorResponse('Cannot delete Super Admin account', 403);
        }

        // Only super_admin can delete admin accounts
        if ($user->isAdmin() && !$currentUser->isSuperAdmin()) {
            return $this->errorResponse('Only Super Admin can delete admin accounts', 403);
        }

        // Cannot delete yourself
        if ($user->id === $currentUser->id) {
            return $this->errorResponse('Cannot delete your own account', 403);
        }

        $this->logAudit('ARCHIVE', 'Users', "Archived user: {$user->name}", [
            'user_id' => $user->id,
            'name'    => $user->name,
            'email'   => $user->email,
            'role'    => $user->role,
        ]);

        // Revoke all tokens before archiving
        $user->tokens()->delete();
        $user->status = 'inactive';
        $user->archive(); // Archive — record moves to Archives page

        return $this->successResponse(null, 'User archived successfully');
    }

    /**
     * Get user statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $currentUser = Auth::user();
        $query = User::query();

        if (!$currentUser->isSuperAdmin()) {
            $query->where('role', '!=', User::ROLE_SUPER_ADMIN);
        }

        // Exclude current user
        $query->where('id', '!=', $currentUser->id);

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        $users = $query->get();

        return $this->successResponse([
            'total'      => $users->count(),
            'active'     => $users->where('status', 'active')->count(),
            'inactive'   => $users->where('status', 'inactive')->count(),
            'positions'  => $users->whereNotNull('position')->pluck('position')->unique()->count(),
            'by_role'    => [
                'admin' => $users->where('role', User::ROLE_ADMIN)->count(),
                'staff' => $users->where('role', User::ROLE_STAFF)->count(),
            ],
        ], 'User statistics retrieved successfully');
    }

    /**
     * Format user for API response.
     */
    /**
     * Fire-and-forget: send welcome email after user creation.
     */
    public function sendWelcomeEmailEndpoint(string $id): JsonResponse
    {
        $user = User::find($id);
        if ($user) {
            try {
                $this->emailService->sendWelcomeEmail($user);
            } catch (\Throwable $e) { /* silent */ }
        }
        return response()->json(['success' => true]);
    }

    /**
     * Fire-and-forget: send update notification emails.
     */
    public function sendUpdateEmail(string $id, Request $request): JsonResponse
    {
        $user = User::find($id);
        if (!$user) return response()->json(['success' => true]);

        $changes = $request->input('changes', []);
        if (empty($changes)) return response()->json(['success' => true]);

        $changesSummary = "Changes made:\n" . implode("\n", $changes);

        try {
            $this->emailService->sendAdminAlert(
                "User Updated — {$user->name}",
                'User Information Updated',
                "The user \"{$user->name}\" ({$user->email}) has been updated.\n\n{$changesSummary}"
            );

            $this->emailService->sendAlertTo(
                $user->email,
                'Your Account Information Has Been Updated',
                'Your Account Was Updated',
                "Hi {$user->name},\n\nYour account information has been updated by the administrator.\n\n{$changesSummary}\n\nIf you did not expect these changes, please contact us immediately."
            );
        } catch (\Throwable $e) { /* silent */ }

        return response()->json(['success' => true]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'email'      => $user->email,
            'role'       => $user->role,
            'position'   => $user->position,
            'truck_plate_number' => $user->truck_plate_number,
            'phone'      => $user->phone,
            'status'     => $user->status,
            'date_hired' => $user->date_hired,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
