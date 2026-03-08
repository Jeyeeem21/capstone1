<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use ApiResponse, AuditLogger;

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

        $user->update($validated);

        $this->logAudit('UPDATE', 'Users', "Updated user: {$user->name}", [
            'user_id'    => $user->id,
            'old_values' => $oldValues,
            'new_values' => $user->only(['name', 'email', 'role', 'position', 'phone', 'status']),
        ]);

        return $this->successResponse(
            $this->formatUser($user),
            'User updated successfully'
        );
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
