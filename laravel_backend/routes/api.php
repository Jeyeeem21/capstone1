<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\AppearanceSettingController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\DatabaseBackupController;
use App\Http\Controllers\Api\WebsiteContentController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\DriverPortalController;
use App\Http\Controllers\DeliveryAssignmentController;
use App\Http\Controllers\VarietyController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\DryingProcessController;
use App\Http\Controllers\ProcessingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProcurementBatchController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalesPredictionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\AuditTrailController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\NotificationController;

// ========================================
// Public Routes (no auth required)
// ========================================

// Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Public-facing data (for the public website)
Route::get('/products/featured', [ProductController::class, 'featured']);

Route::prefix('appearance')->group(function () {
    Route::get('/', [AppearanceSettingController::class, 'index']);
    Route::get('/all', [AppearanceSettingController::class, 'getAll']);
    Route::get('/grouped', [AppearanceSettingController::class, 'getGrouped']);
});

Route::prefix('website-content')->group(function () {
    Route::get('/', [WebsiteContentController::class, 'getAllContent']);
    Route::get('/home', [WebsiteContentController::class, 'getHomeContent']);
    Route::get('/about', [WebsiteContentController::class, 'getAboutContent']);
    Route::get('/products', [WebsiteContentController::class, 'getProductsContent']);
    Route::get('/contact', [WebsiteContentController::class, 'getContactContent']);
});

Route::prefix('business-settings')->group(function () {
    Route::get('/', [BusinessSettingController::class, 'index']);
});

// ========================================
// Authenticated Routes (require auth:sanctum)
// ========================================
Route::middleware('auth:sanctum')->group(function () {

    // Dashboard Routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/recent-activity', [DashboardController::class, 'recentActivity']);
        Route::post('/refresh', [DashboardController::class, 'refresh']);
    });

    // Auth - authenticated user actions
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/login-email', [AuthController::class, 'sendLoginEmail']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
    });

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Notification Routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // Product Routes
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::post('/', [ProductController::class, 'store']);
        Route::get('/{id}', [ProductController::class, 'show']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
        Route::post('/{id}/restore', [ProductController::class, 'restore']);
        Route::post('/{id}/stock', [ProductController::class, 'updateStock']);
        Route::get('/{id}/completed-processings', [ProductController::class, 'completedProcessingsByVariety']);
        Route::post('/{id}/distribute-stock', [ProductController::class, 'distributeStock']);
        Route::get('/{id}/cost-analysis', [ProductController::class, 'costAnalysis']);
        Route::get('/{id}/order-history', [ProductController::class, 'orderHistory']);
        Route::post('/{id}/toggle-status', [ProductController::class, 'toggleStatus']);
    });

    Route::get('/stock-logs', [ProductController::class, 'stockLogs']);

    // Sales / POS / Orders Routes
    Route::prefix('sales')->group(function () {
        Route::get('/', [SaleController::class, 'index']);
        Route::get('/my-orders', [SaleController::class, 'myOrders']);
        Route::post('/order', [SaleController::class, 'storeOrder']);
        Route::post('/check-reference', [SaleController::class, 'checkReference']);
        Route::get('/stats', [SaleController::class, 'stats']);
        Route::get('/product-growth', [SaleController::class, 'productGrowth']);
        Route::get('/{id}', [SaleController::class, 'show']);
        Route::post('/{id}/void', [SaleController::class, 'void']);
        Route::put('/{id}/status', [SaleController::class, 'updateStatus']);
        Route::post('/{id}/notify', [SaleController::class, 'sendOrderEmail']);
        Route::post('/{id}/status-email', [SaleController::class, 'sendStatusEmail']);
        Route::post('/{id}/payment-email', [SaleController::class, 'sendPaymentEmail']);
        Route::post('/{id}/return', [SaleController::class, 'processReturn']);
        Route::post('/{id}/return/accept', [SaleController::class, 'acceptReturn']);
        Route::post('/{id}/return/reject', [SaleController::class, 'rejectReturn']);
        Route::post('/{id}/return/complete', [SaleController::class, 'markReturned']);
        Route::post('/{id}/restock', [SaleController::class, 'restockItems']);
        Route::post('/{id}/pay', [SaleController::class, 'markPaid']);
    });

    // Sales Predictive Analysis Routes
    Route::prefix('sales-predictions')->group(function () {
        Route::get('/', [SalesPredictionController::class, 'predictions']);
        Route::post('/refresh', [SalesPredictionController::class, 'refresh']);
    });

    // ========================================
    // Super Admin Only Routes
    // ========================================

    // Appearance Settings (write operations) - Super Admin only
    Route::middleware('role:super_admin')->group(function () {
        Route::prefix('appearance')->group(function () {
            Route::put('/', [AppearanceSettingController::class, 'update']);
            Route::put('/{key}', [AppearanceSettingController::class, 'updateSingle']);
            Route::post('/reset', [AppearanceSettingController::class, 'reset']);
        });

        // Website Content (write operations)
        Route::prefix('website-content')->group(function () {
            Route::post('/home', [WebsiteContentController::class, 'saveHomeContent']);
            Route::post('/about', [WebsiteContentController::class, 'saveAboutContent']);
            Route::post('/products', [WebsiteContentController::class, 'saveProductsContent']);
            Route::post('/contact', [WebsiteContentController::class, 'saveContactContent']);
            Route::post('/hero-image', [WebsiteContentController::class, 'uploadHeroImage']);
            Route::post('/seed', [WebsiteContentController::class, 'seedDefaults']);
        });

        // Business Settings (write operations)
        Route::prefix('business-settings')->group(function () {
            Route::put('/', [BusinessSettingController::class, 'update']);
            Route::post('/logo', [BusinessSettingController::class, 'uploadLogo']);
            Route::post('/test-email', [BusinessSettingController::class, 'testEmail']);
        });

        // Database Backup Routes
        Route::prefix('database')->group(function () {
            Route::get('/export', [DatabaseBackupController::class, 'export']);
            Route::get('/info', [DatabaseBackupController::class, 'info']);
            Route::get('/export-csv', [DatabaseBackupController::class, 'exportCsv']);
            Route::post('/import-csv', [DatabaseBackupController::class, 'importCsv']);
        });

        // Archive Routes
        Route::prefix('archives')->group(function () {
            Route::get('/', [ArchiveController::class, 'index']);
            Route::get('/statistics', [ArchiveController::class, 'statistics']);
            Route::post('/{module}/{id}/restore', [ArchiveController::class, 'restore']);
            Route::delete('/{module}/{id}', [ArchiveController::class, 'softDelete']);
            Route::delete('/{module}/all/soft-delete', [ArchiveController::class, 'softDeleteAll']);
        });

        // Audit Trail Routes
        Route::prefix('audit-trails')->group(function () {
            Route::get('/', [AuditTrailController::class, 'index']);
            Route::get('/statistics', [AuditTrailController::class, 'statistics']);
            Route::get('/{auditTrail}', [AuditTrailController::class, 'show']);
        });
    });
    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::post('/check-email', [CustomerController::class, 'checkEmail']);
        Route::get('/{id}', [CustomerController::class, 'show']);
        Route::put('/{id}', [CustomerController::class, 'update']);
        Route::delete('/{id}', [CustomerController::class, 'destroy']);
        Route::get('/{id}/orders', [CustomerController::class, 'orders']);
        Route::post('/{id}/send-verification', [CustomerController::class, 'sendVerificationCode']);
        Route::post('/{id}/verify-code', [CustomerController::class, 'verifyCode']);
        Route::post('/{id}/create-account', [CustomerController::class, 'createAccount']);
        Route::post('/{id}/store-email', [CustomerController::class, 'sendStoreEmail']);
        Route::post('/{id}/update-email', [CustomerController::class, 'sendUpdateEmail']);
    });

    // Supplier Routes
    Route::prefix('suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::post('/', [SupplierController::class, 'store']);
        Route::post('/check-email', [SupplierController::class, 'checkEmail']);
        Route::get('/{id}', [SupplierController::class, 'show']);
        Route::put('/{id}', [SupplierController::class, 'update']);
        Route::delete('/{id}', [SupplierController::class, 'destroy']);
        Route::get('/{id}/procurements', [SupplierController::class, 'procurements']);
        Route::post('/{id}/store-email', [SupplierController::class, 'sendStoreEmail']);
        Route::post('/{id}/update-email', [SupplierController::class, 'sendUpdateEmail']);
    });

    // Variety Routes
    Route::prefix('varieties')->group(function () {
        Route::get('/', [VarietyController::class, 'index']);
        Route::post('/', [VarietyController::class, 'store']);
        Route::get('/{id}', [VarietyController::class, 'show']);
        Route::put('/{id}', [VarietyController::class, 'update']);
        Route::delete('/{id}', [VarietyController::class, 'destroy']);
    });

    // Procurement Routes
    Route::prefix('procurements')->group(function () {
        Route::get('/', [ProcurementController::class, 'index']);
        Route::get('/statistics', [ProcurementController::class, 'statistics']);
        Route::post('/', [ProcurementController::class, 'store']);
        Route::get('/{id}', [ProcurementController::class, 'show']);
        Route::put('/{id}', [ProcurementController::class, 'update']);
        Route::delete('/{id}', [ProcurementController::class, 'destroy']);
    });

    // Drying Process Routes
    Route::prefix('drying-processes')->group(function () {
        Route::get('/', [DryingProcessController::class, 'index']);
        Route::get('/statistics', [DryingProcessController::class, 'statistics']);
        Route::post('/', [DryingProcessController::class, 'store']);
        Route::get('/{dryingProcess}', [DryingProcessController::class, 'show']);
        Route::put('/{dryingProcess}', [DryingProcessController::class, 'update']);
        Route::post('/{dryingProcess}/increment-day', [DryingProcessController::class, 'incrementDay']);
        Route::post('/{dryingProcess}/mark-dried', [DryingProcessController::class, 'markAsDried']);
        Route::post('/{dryingProcess}/postpone', [DryingProcessController::class, 'postpone']);
        Route::delete('/{dryingProcess}', [DryingProcessController::class, 'destroy']);
    });

    // Procurement Batch Routes
    Route::prefix('procurement-batches')->group(function () {
        Route::get('/', [ProcurementBatchController::class, 'index']);
        Route::get('/open', [ProcurementBatchController::class, 'open']);
        Route::post('/', [ProcurementBatchController::class, 'store']);
        Route::get('/{id}', [ProcurementBatchController::class, 'show']);
        Route::put('/{id}', [ProcurementBatchController::class, 'update']);
        Route::delete('/{id}', [ProcurementBatchController::class, 'destroy']);
        Route::post('/{batchId}/assign/{procurementId}', [ProcurementBatchController::class, 'assignProcurement']);
        Route::delete('/remove-procurement/{procurementId}', [ProcurementBatchController::class, 'removeProcurement']);
        Route::get('/{batchId}/drying-distribution', [ProcurementBatchController::class, 'dryingDistribution']);
    });

    // Processing Routes
    Route::prefix('processings')->group(function () {
        Route::get('/', [ProcessingController::class, 'index']);
        Route::get('/active', [ProcessingController::class, 'active']);
        Route::get('/completed', [ProcessingController::class, 'completed']);
        Route::get('/statistics', [ProcessingController::class, 'statistics']);
        Route::post('/', [ProcessingController::class, 'store']);
        Route::get('/{processing}', [ProcessingController::class, 'show']);
        Route::put('/{processing}', [ProcessingController::class, 'update']);
        Route::post('/{processing}/process', [ProcessingController::class, 'process']);
        Route::post('/{processing}/complete', [ProcessingController::class, 'complete']);
        Route::post('/{processing}/return-to-processing', [ProcessingController::class, 'returnToProcessing']);
        Route::delete('/{processing}', [ProcessingController::class, 'destroy']);
    });

    // Driver Portal Routes (for logged-in driver users)
    Route::prefix('driver-portal')->group(function () {
        Route::get('/dashboard', [DriverPortalController::class, 'dashboard']);
        Route::get('/my-deliveries', [DriverPortalController::class, 'myDeliveries']);
        Route::post('/orders/{id}/status', [DriverPortalController::class, 'updateOrderStatus']);
        Route::post('/orders/{id}/pay', [DriverPortalController::class, 'markOrderPaid']);
    });

    // Driver Routes
    Route::prefix('drivers')->group(function () {
        Route::get('/', [DriverController::class, 'index']);
        Route::get('/statistics', [DriverController::class, 'statistics']);
        Route::post('/', [DriverController::class, 'store']);
        Route::get('/{id}', [DriverController::class, 'show']);
        Route::put('/{id}', [DriverController::class, 'update']);
        Route::delete('/{id}', [DriverController::class, 'destroy']);
    });

    // Delivery Assignment Routes
    Route::prefix('deliveries')->group(function () {
        Route::get('/', [DeliveryAssignmentController::class, 'index']);
        Route::get('/statistics', [DeliveryAssignmentController::class, 'statistics']);
        Route::post('/', [DeliveryAssignmentController::class, 'store']);
        Route::get('/driver/{driverId}', [DeliveryAssignmentController::class, 'byDriver']);
        Route::get('/{id}', [DeliveryAssignmentController::class, 'show']);
        Route::put('/{id}', [DeliveryAssignmentController::class, 'update']);
        Route::post('/{id}/status', [DeliveryAssignmentController::class, 'updateStatus']);
        Route::delete('/{id}', [DeliveryAssignmentController::class, 'destroy']);
    });

    // User Management Routes
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/statistics', [UserController::class, 'statistics']);
        Route::post('/send-verification', [UserController::class, 'sendVerificationCode']);
        Route::post('/verify-code', [UserController::class, 'verifyEmailCode']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::post('/{id}/welcome-email', [UserController::class, 'sendWelcomeEmailEndpoint']);
        Route::post('/{id}/update-email', [UserController::class, 'sendUpdateEmail']);
    });
});
