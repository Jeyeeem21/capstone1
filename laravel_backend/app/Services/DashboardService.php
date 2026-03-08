<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Procurement;
use App\Models\Processing;
use App\Models\DryingProcess;
use App\Models\StockLog;
use App\Models\AuditTrail;
use App\Models\DeliveryAssignment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Carbon;

class DashboardService
{
    private const CACHE_KEY = 'dashboard_stats';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all dashboard statistics in a single call
     */
    public function getStats(string $period = 'monthly', array $chartParams = []): array
    {
        $paramKey = md5(json_encode($chartParams));
        $cacheKey = self::CACHE_KEY . "_{$period}_{$paramKey}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($period, $chartParams) {
            return [
                'overview' => $this->getOverviewStats(),
                'revenue' => $this->getRevenueData($period, $chartParams),
                'processing' => $this->getProcessingData($period, $chartParams),
                'procurement' => $this->getProcurementSummary(),
                'inventory' => $this->getInventorySummary(),
                'top_products' => $this->getTopProducts(),
                'recent_sales' => $this->getRecentSales(),
                'low_stock' => $this->getLowStockProducts(),
                'payment_breakdown' => $this->getPaymentBreakdown(),
                'status_breakdown' => $this->getOrderStatusBreakdown(),
                'pipeline' => $this->getPipelineSummary(),
                'period' => $period,
                'generated_at' => now()->toISOString(),
            ];
        });
    }

    /**
     * Get recent activity from audit trail
     */
    public function getRecentActivity(int $limit = 15): array
    {
        return Cache::remember('dashboard_recent_activity', 120, function () use ($limit) {
            return AuditTrail::with('user:id,name,first_name,last_name')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($audit) {
                    return [
                        'id' => $audit->id,
                        'action' => $audit->action,
                        'module' => $audit->module,
                        'description' => $audit->description,
                        'user' => $audit->user?->name ?? $audit->user?->first_name . ' ' . $audit->user?->last_name ?? 'System',
                        'time' => $audit->created_at->diffForHumans(),
                        'created_at' => $audit->created_at->toISOString(),
                    ];
                })
                ->toArray();
        });
    }

    /**
     * Overview cards: revenue, orders, customers, products
     */
    private function getOverviewStats(): array
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // SALES — delivered/completed only
        $completedStatuses = ['delivered', 'completed'];

        $currentMonthSales = Sale::whereIn('status', $completedStatuses)
            ->where('created_at', '>=', $startOfMonth)
            ->get();
        $lastMonthSales = Sale::whereIn('status', $completedStatuses)
            ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->get();

        $currentRevenue = (float) $currentMonthSales->sum('total');
        $lastRevenue = (float) $lastMonthSales->sum('total');
        $revenueTrend = $lastRevenue > 0
            ? round((($currentRevenue - $lastRevenue) / $lastRevenue) * 100, 1)
            : ($currentRevenue > 0 ? 100 : 0);

        $currentOrders = $currentMonthSales->count();
        $lastOrders = $lastMonthSales->count();
        $ordersTrend = $lastOrders > 0
            ? round((($currentOrders - $lastOrders) / $lastOrders) * 100, 1)
            : ($currentOrders > 0 ? 100 : 0);

        // ALL-TIME totals
        $totalRevenue = (float) Sale::whereIn('status', $completedStatuses)->sum('total');
        $totalOrders = Sale::whereIn('status', $completedStatuses)->count();

        // CUSTOMERS
        $totalCustomers = Customer::count();
        $newCustomersThisMonth = Customer::where('created_at', '>=', $startOfMonth)->count();
        $newCustomersLastMonth = Customer::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
        $customersTrend = $newCustomersLastMonth > 0
            ? round((($newCustomersThisMonth - $newCustomersLastMonth) / $newCustomersLastMonth) * 100, 1)
            : ($newCustomersThisMonth > 0 ? 100 : 0);

        // PRODUCTS
        $totalProducts = Product::count();
        $activeProducts = Product::where('status', 'active')->count();
        $totalStock = (int) Product::sum('stocks');

        // ITEMS SOLD
        $totalItemsSold = (int) SaleItem::whereHas('sale', function ($q) use ($completedStatuses) {
            $q->whereIn('status', $completedStatuses);
        })->sum('quantity');

        return [
            'total_revenue' => $totalRevenue,
            'current_month_revenue' => $currentRevenue,
            'revenue_trend' => $revenueTrend,
            'total_orders' => $totalOrders,
            'current_month_orders' => $currentOrders,
            'orders_trend' => $ordersTrend,
            'total_customers' => $totalCustomers,
            'new_customers_this_month' => $newCustomersThisMonth,
            'customers_trend' => $customersTrend,
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'total_stock' => $totalStock,
            'total_items_sold' => $totalItemsSold,
            'avg_order_value' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
        ];
    }

    /**
     * Revenue chart data — daily/weekly/monthly/bi-annually/annually
     */
    private function getRevenueData(string $period, array $chartParams = []): array
    {
        $completedStatuses = ['delivered', 'completed'];
        $sales = Sale::with('items')
            ->whereIn('status', $completedStatuses)
            ->orderBy('created_at')
            ->get();

        $now = Carbon::now();
        $result = [];
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if ($period === 'daily') {
            $targetYear = $now->year;
            $targetMonth = $now->month;
            if (!empty($chartParams['month'])) {
                $parts = explode('-', $chartParams['month']);
                if (count($parts) === 2) {
                    $targetYear = (int) $parts[0];
                    $targetMonth = (int) $parts[1];
                }
            }
            $daysInMonth = Carbon::create($targetYear, $targetMonth, 1)->daysInMonth;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $dateStr = Carbon::create($targetYear, $targetMonth, $day)->toDateString();
                $daySales = $sales->filter(fn($s) => $s->created_at->toDateString() === $dateStr);
                $result[] = [
                    'name' => (string) $day,
                    'revenue' => round((float) $daySales->sum('total'), 2),
                    'orders' => $daySales->count(),
                    'items' => $daySales->sum(fn($s) => $s->items->sum('quantity')),
                ];
            }
        } elseif ($period === 'weekly') {
            $targetYear = $now->year;
            $targetMonth = $now->month;
            if (!empty($chartParams['month'])) {
                $parts = explode('-', $chartParams['month']);
                if (count($parts) === 2) {
                    $targetYear = (int) $parts[0];
                    $targetMonth = (int) $parts[1];
                }
            }
            $weeks = $this->getWeeksInMonth($targetYear, $targetMonth);
            foreach ($weeks as $week) {
                $weekSales = $sales->filter(fn($s) =>
                    $s->created_at->gte($week['start']) && $s->created_at->lte($week['end'])
                );
                $result[] = [
                    'name' => $week['label'],
                    'revenue' => round((float) $weekSales->sum('total'), 2),
                    'orders' => $weekSales->count(),
                    'items' => $weekSales->sum(fn($s) => $s->items->sum('quantity')),
                ];
            }
        } elseif ($period === 'monthly') {
            $targetYear = $chartParams['year'] ?? $now->year;
            foreach ($months as $idx => $monthName) {
                $monthSales = $sales->filter(fn($s) =>
                    $s->created_at->year === $targetYear &&
                    $s->created_at->month === ($idx + 1)
                );
                $result[] = [
                    'name' => $monthName,
                    'revenue' => round((float) $monthSales->sum('total'), 2),
                    'orders' => $monthSales->count(),
                    'items' => $monthSales->sum(fn($s) => $s->items->sum('quantity')),
                ];
            }
        } elseif ($period === 'bi-annually') {
            $targetYear = $chartParams['year'] ?? $now->year;
            $h1Sales = $sales->filter(fn($s) => $s->created_at->year === $targetYear && $s->created_at->month <= 6);
            $h2Sales = $sales->filter(fn($s) => $s->created_at->year === $targetYear && $s->created_at->month > 6);
            $result = [
                ['name' => 'H1', 'fullName' => "Jan - Jun {$targetYear}", 'revenue' => round((float) $h1Sales->sum('total'), 2), 'orders' => $h1Sales->count(), 'items' => $h1Sales->sum(fn($s) => $s->items->sum('quantity'))],
                ['name' => 'H2', 'fullName' => "Jul - Dec {$targetYear}", 'revenue' => round((float) $h2Sales->sum('total'), 2), 'orders' => $h2Sales->count(), 'items' => $h2Sales->sum(fn($s) => $s->items->sum('quantity'))],
            ];
        } else { // annually
            $yearFrom = $chartParams['year_from'] ?? ($now->year - 4);
            $yearTo = $chartParams['year_to'] ?? $now->year;
            for ($year = $yearFrom; $year <= $yearTo; $year++) {
                $yearSales = $sales->filter(fn($s) => $s->created_at->year === $year);
                $result[] = [
                    'name' => (string) $year,
                    'revenue' => round((float) $yearSales->sum('total'), 2),
                    'orders' => $yearSales->count(),
                    'items' => $yearSales->sum(fn($s) => $s->items->sum('quantity')),
                ];
            }
        }

        return $result;
    }

    /**
     * Processing performance data (milling operations)
     */
    private function getProcessingData(string $period, array $chartParams = []): array
    {
        $processings = Processing::where('status', Processing::STATUS_COMPLETED)
            ->orderBy('completed_date')
            ->get();

        $now = Carbon::now();
        $result = [];
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if ($period === 'daily') {
            $targetYear = $now->year;
            $targetMonth = $now->month;
            if (!empty($chartParams['month'])) {
                $parts = explode('-', $chartParams['month']);
                if (count($parts) === 2) {
                    $targetYear = (int) $parts[0];
                    $targetMonth = (int) $parts[1];
                }
            }
            $daysInMonth = Carbon::create($targetYear, $targetMonth, 1)->daysInMonth;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $dateStr = Carbon::create($targetYear, $targetMonth, $day)->toDateString();
                $dayProcessings = $processings->filter(fn($p) => $p->completed_date?->toDateString() === $dateStr);
                $result[] = [
                    'name' => (string) $day,
                    'input' => round((float) $dayProcessings->sum('input_kg'), 2),
                    'output' => round((float) $dayProcessings->sum('output_kg'), 2),
                ];
            }
        } elseif ($period === 'weekly') {
            $targetYear = $now->year;
            $targetMonth = $now->month;
            if (!empty($chartParams['month'])) {
                $parts = explode('-', $chartParams['month']);
                if (count($parts) === 2) {
                    $targetYear = (int) $parts[0];
                    $targetMonth = (int) $parts[1];
                }
            }
            $weeks = $this->getWeeksInMonth($targetYear, $targetMonth);
            foreach ($weeks as $week) {
                $weekProcessings = $processings->filter(fn($p) =>
                    $p->completed_date && $p->completed_date->gte($week['start']) && $p->completed_date->lte($week['end'])
                );
                $result[] = [
                    'name' => $week['label'],
                    'input' => round((float) $weekProcessings->sum('input_kg'), 2),
                    'output' => round((float) $weekProcessings->sum('output_kg'), 2),
                ];
            }
        } elseif ($period === 'monthly') {
            $targetYear = $chartParams['year'] ?? $now->year;
            foreach ($months as $idx => $monthName) {
                $monthProcessings = $processings->filter(fn($p) =>
                    $p->completed_date?->year === $targetYear &&
                    $p->completed_date?->month === ($idx + 1)
                );
                $result[] = [
                    'name' => $monthName,
                    'input' => round((float) $monthProcessings->sum('input_kg'), 2),
                    'output' => round((float) $monthProcessings->sum('output_kg'), 2),
                ];
            }
        } elseif ($period === 'bi-annually') {
            $targetYear = $chartParams['year'] ?? $now->year;
            $h1 = $processings->filter(fn($p) => $p->completed_date?->year === $targetYear && $p->completed_date?->month <= 6);
            $h2 = $processings->filter(fn($p) => $p->completed_date?->year === $targetYear && $p->completed_date?->month > 6);
            $result = [
                ['name' => 'H1', 'fullName' => "Jan - Jun {$targetYear}", 'input' => round((float) $h1->sum('input_kg'), 2), 'output' => round((float) $h1->sum('output_kg'), 2)],
                ['name' => 'H2', 'fullName' => "Jul - Dec {$targetYear}", 'input' => round((float) $h2->sum('input_kg'), 2), 'output' => round((float) $h2->sum('output_kg'), 2)],
            ];
        } else { // annually
            $yearFrom = $chartParams['year_from'] ?? ($now->year - 4);
            $yearTo = $chartParams['year_to'] ?? $now->year;
            for ($year = $yearFrom; $year <= $yearTo; $year++) {
                $yearProcessings = $processings->filter(fn($p) => $p->completed_date?->year === $year);
                $result[] = [
                    'name' => (string) $year,
                    'input' => round((float) $yearProcessings->sum('input_kg'), 2),
                    'output' => round((float) $yearProcessings->sum('output_kg'), 2),
                ];
            }
        }

        // Summary stats
        $totalInput = (float) Processing::sum('input_kg');
        $totalOutput = (float) Processing::where('status', Processing::STATUS_COMPLETED)->sum('output_kg');
        $avgYield = Processing::where('status', Processing::STATUS_COMPLETED)->count() > 0
            ? round(Processing::where('status', Processing::STATUS_COMPLETED)->avg('yield_percent'), 2)
            : 0;

        return [
            'chart' => $result,
            'total_input' => $totalInput,
            'total_output' => $totalOutput,
            'avg_yield' => $avgYield,
            'total_records' => Processing::count(),
        ];
    }

    /**
     * Helper: get week ranges in a month (matches frontend getWeeksInMonth)
     */
    private function getWeeksInMonth(int $year, int $month): array
    {
        $weeks = [];
        $monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        $firstDay = Carbon::create($year, $month, 1)->startOfDay();
        $start = $firstDay->copy();
        $dayOfWeek = $start->dayOfWeek; // 0=Sunday
        $diff = $dayOfWeek === 0 ? -6 : 1 - $dayOfWeek;
        $start->addDays($diff);

        while ($start->month <= $month || ($start->month > $month && $start->year < $year) || count($weeks) === 0) {
            $end = $start->copy()->addDays(6);
            $label = $monthNames[$start->month - 1] . ' ' . $start->day . ' - ' . $monthNames[$end->month - 1] . ' ' . $end->day;
            $weeks[] = [
                'start' => $start->copy()->startOfDay(),
                'end' => $end->copy()->endOfDay(),
                'label' => $label,
            ];
            $start->addDays(7);
            if ($start->month > $month && $start->year === $year) break;
            if ($start->year > $year) break;
            if (count($weeks) >= 6) break;
        }

        return $weeks;
    }

    /**
     * Procurement summary
     */
    private function getProcurementSummary(): array
    {
        $total = Procurement::count();
        $totalCost = (float) Procurement::sum('total_cost');
        $totalKg = (float) Procurement::sum('quantity_kg');
        $totalSacks = (int) Procurement::sum('sacks');
        $pending = Procurement::where('status', 'Pending')->count();
        $suppliers = Supplier::where('status', 'active')->count();

        return [
            'total' => $total,
            'total_cost' => round($totalCost, 2),
            'total_kg' => round($totalKg, 2),
            'total_sacks' => $totalSacks,
            'pending' => $pending,
            'active_suppliers' => $suppliers,
        ];
    }

    /**
     * Inventory summary — stock health
     */
    private function getInventorySummary(): array
    {
        $products = Product::where('status', 'active')->get();

        $totalStock = $products->sum('stocks');
        $lowStock = $products->filter(fn($p) => $p->stocks > 0 && $p->stocks <= $p->stock_floor)->count();
        $outOfStock = $products->filter(fn($p) => $p->stocks <= 0)->count();
        $healthy = $products->filter(fn($p) => $p->stocks > $p->stock_floor)->count();

        return [
            'total_stock' => (int) $totalStock,
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
            'healthy' => $healthy,
            'total_products' => $products->count(),
        ];
    }

    /**
     * Top selling products
     */
    private function getTopProducts(): array
    {
        $completedStatuses = ['delivered', 'completed'];

        return SaleItem::selectRaw('product_id, SUM(quantity) as total_qty, SUM(subtotal) as total_revenue')
            ->whereHas('sale', fn($q) => $q->whereIn('status', $completedStatuses))
            ->groupBy('product_id')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $product = Product::find($item->product_id);
                return [
                    'product_id' => $item->product_id,
                    'product_name' => $product?->product_name ?? 'Unknown',
                    'variety' => $product?->variety?->name ?? '—',
                    'variety_color' => $product?->variety?->color ?? '#6B7280',
                    'total_qty' => (int) $item->total_qty,
                    'total_revenue' => round((float) $item->total_revenue, 2),
                    'current_stock' => (int) ($product?->stocks ?? 0),
                    'price' => (float) ($product?->price ?? 0),
                ];
            })
            ->toArray();
    }

    /**
     * Most recent sales
     */
    private function getRecentSales(): array
    {
        return Sale::with(['customer:id,name', 'items'])
            ->orderBy('created_at', 'desc')
            ->limit(8)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'transaction_id' => $sale->transaction_id,
                    'customer' => $sale->customer?->name ?? 'Walk-in',
                    'total' => round((float) $sale->total, 2),
                    'items_count' => $sale->items->count(),
                    'payment_method' => $sale->payment_method === 'gcash' ? 'GCash'
                        : ($sale->payment_method === 'cod' ? 'COD'
                        : ($sale->payment_method === 'pay_later' ? 'Pay Later'
                        : 'Cash')),
                    'status' => $sale->status,
                    'date' => $sale->created_at->format('M d, Y'),
                    'time' => $sale->created_at->format('h:i A'),
                    'created_at' => $sale->created_at->toISOString(),
                ];
            })
            ->toArray();
    }

    /**
     * Products with low stock
     */
    private function getLowStockProducts(): array
    {
        return Product::where('status', 'active')
            ->where(function ($q) {
                $q->where('stocks', '<=', 0)
                    ->orWhereColumn('stocks', '<=', 'stock_floor');
            })
            ->orderBy('stocks')
            ->limit(5)
            ->get()
            ->map(function ($p) {
                return [
                    'product_id' => $p->product_id,
                    'product_name' => $p->product_name,
                    'variety' => $p->variety?->name ?? '—',
                    'variety_color' => $p->variety?->color ?? '#6B7280',
                    'stocks' => (int) $p->stocks,
                    'stock_floor' => (int) $p->stock_floor,
                    'price' => (float) $p->price,
                    'status' => $p->stocks <= 0 ? 'Out of Stock' : 'Low Stock',
                ];
            })
            ->toArray();
    }

    /**
     * Payment method breakdown
     */
    private function getPaymentBreakdown(): array
    {
        $completedStatuses = ['delivered', 'completed'];

        return Sale::selectRaw("payment_method, COUNT(*) as count, SUM(total) as total_amount")
            ->whereIn('status', $completedStatuses)
            ->groupBy('payment_method')
            ->get()
            ->map(function ($row) {
                $label = match ($row->payment_method) {
                    'cash' => 'Cash',
                    'gcash' => 'GCash',
                    'cod' => 'COD',
                    'pay_later' => 'Pay Later',
                    default => ucfirst($row->payment_method ?? 'Cash'),
                };
                $color = match ($row->payment_method) {
                    'cash' => '#22c55e',
                    'gcash' => '#3b82f6',
                    'cod' => '#f59e0b',
                    'pay_later' => '#8b5cf6',
                    default => '#6b7280',
                };
                return [
                    'name' => $label,
                    'value' => (int) $row->count,
                    'amount' => round((float) $row->total_amount, 2),
                    'color' => $color,
                ];
            })
            ->toArray();
    }

    /**
     * Order status breakdown
     */
    private function getOrderStatusBreakdown(): array
    {
        $statuses = [
            'pending' => ['label' => 'Pending', 'color' => '#f59e0b'],
            'processing' => ['label' => 'Processing', 'color' => '#3b82f6'],
            'shipped' => ['label' => 'Shipped', 'color' => '#8b5cf6'],
            'delivered' => ['label' => 'Delivered', 'color' => '#22c55e'],
            'completed' => ['label' => 'Completed', 'color' => '#10b981'],
            'returned' => ['label' => 'Returned', 'color' => '#f97316'],
            'cancelled' => ['label' => 'Cancelled', 'color' => '#ef4444'],
            'voided' => ['label' => 'Voided', 'color' => '#6b7280'],
        ];

        $counts = Sale::selectRaw("status, COUNT(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $result = [];
        foreach ($statuses as $key => $meta) {
            if (isset($counts[$key]) && $counts[$key] > 0) {
                $result[] = [
                    'name' => $meta['label'],
                    'value' => (int) $counts[$key],
                    'color' => $meta['color'],
                ];
            }
        }

        return $result;
    }

    /**
     * Pipeline summary — active work across all stages
     */
    private function getPipelineSummary(): array
    {
        $procurementPending = Procurement::where('status', 'Pending')->count();
        $dryingActive = DryingProcess::whereIn('status', ['Drying', 'Postponed'])->count();
        $processingActive = Processing::whereIn('status', ['Pending', 'Processing'])->count();
        $ordersPending = Sale::whereIn('status', ['pending', 'processing', 'shipped'])->count();
        $deliveriesActive = DeliveryAssignment::whereIn('status', ['assigned', 'picked_up', 'in_transit'])->count();

        return [
            'procurement_pending' => $procurementPending,
            'drying_active' => $dryingActive,
            'processing_active' => $processingActive,
            'orders_pending' => $ordersPending,
            'deliveries_active' => $deliveriesActive,
        ];
    }

    /**
     * Clear all dashboard caches
     */
    public function clearCache(): void
    {
        static::clearStatsCache();
    }

    /**
     * Static helper to clear all dashboard stats cache.
     * Can be called from any service or controller without needing an instance.
     */
    public static function clearStatsCache(): void
    {
        $cacheKey = 'dashboard_stats';

        // Clear known base keys
        $periods = ['daily', 'weekly', 'monthly', 'bi-annually', 'annually'];
        $emptyParamKey = md5(json_encode(['month' => null, 'year' => null, 'year_from' => null, 'year_to' => null]));
        foreach ($periods as $p) {
            Cache::forget("{$cacheKey}_{$p}_{$emptyParamKey}");
        }
        // Also clear legacy keys
        Cache::forget("{$cacheKey}_daily");
        Cache::forget("{$cacheKey}_monthly");
        Cache::forget("{$cacheKey}_yearly");
        Cache::forget('dashboard_recent_activity');

        // For file cache driver: clear ALL dashboard_stats keys by scanning cache directory
        try {
            $cachePath = storage_path('framework/cache/data');
            if (is_dir($cachePath)) {
                $iterator = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($cachePath, \RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach ($iterator as $file) {
                    if ($file->isFile()) {
                        $contents = @file_get_contents($file->getPathname());
                        if ($contents && str_contains($contents, $cacheKey)) {
                            @unlink($file->getPathname());
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            // Ignore — fallback keys above should handle most cases
        }
    }
}
