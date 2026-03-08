<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Http\Resources\AuditTrailResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditTrailController extends Controller
{
    use ApiResponse;

    /**
     * Get paginated audit trail logs with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditTrail::with('user:id,name,role')
            ->orderBy('created_at', 'desc');

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by module
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        // Filter by date range
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $logs = $query->get();

        return $this->successResponse(
            AuditTrailResource::collection($logs),
            'Audit trail retrieved successfully'
        );
    }

    /**
     * Get a single audit trail entry.
     */
    public function show(AuditTrail $auditTrail): JsonResponse
    {
        $auditTrail->load('user:id,name,role');

        return $this->successResponse(
            new AuditTrailResource($auditTrail),
            'Audit trail entry retrieved successfully'
        );
    }

    /**
     * Get audit trail statistics.
     */
    public function statistics(): JsonResponse
    {
        $today = now()->toDateString();

        $stats = [
            'today'    => AuditTrail::whereDate('created_at', $today)->count(),
            'created'  => AuditTrail::where('action', 'CREATE')->count(),
            'updated'  => AuditTrail::where('action', 'UPDATE')->count(),
            'deleted'  => AuditTrail::where('action', 'DELETE')->count(),
            'archived' => AuditTrail::where('action', 'ARCHIVE')->count(),
            'restored' => AuditTrail::where('action', 'RESTORE')->count(),
            'soft_deleted' => AuditTrail::whereIn('action', ['SOFT_DELETE', 'SOFT_DELETE_ALL'])->count(),
        ];

        return $this->successResponse($stats, 'Statistics retrieved successfully');
    }
}
