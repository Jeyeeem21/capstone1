<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        private DashboardService $dashboardService
    ) {}

    /**
     * Get comprehensive dashboard statistics
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $period = $request->query('period', 'monthly');

            if (!in_array($period, ['daily', 'monthly', 'yearly'])) {
                $period = 'monthly';
            }

            $stats = $this->dashboardService->getStats($period);

            return $this->successResponse($stats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to fetch dashboard statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get recent activity for the dashboard
     */
    public function recentActivity(Request $request): JsonResponse
    {
        try {
            $limit = min((int) $request->query('limit', 15), 50);
            $activity = $this->dashboardService->getRecentActivity($limit);

            return $this->successResponse($activity, 'Recent activity retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to fetch recent activity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Refresh dashboard data (clear cache)
     */
    public function refresh(): JsonResponse
    {
        try {
            $this->dashboardService->clearCache();

            return $this->successResponse(null, 'Dashboard cache cleared successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to refresh dashboard: ' . $e->getMessage(), 500);
        }
    }
}
