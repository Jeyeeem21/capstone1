<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use AuditLogger;
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
        return [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'created_at' => $user->created_at,
        ];
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
