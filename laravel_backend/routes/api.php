<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AppearanceSettingController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\DatabaseBackupController;
use App\Http\Controllers\Api\WebsiteContentController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\VarietyController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\DryingProcessController;
use App\Http\Controllers\ProcessingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProcurementBatchController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Product Routes (Admin CRUD)
Route::prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']); // Get all products
    Route::get('/featured', [ProductController::class, 'featured']); // Get featured products
    Route::post('/', [ProductController::class, 'store']); // Create product
    Route::get('/{id}', [ProductController::class, 'show']); // Get single product
    Route::put('/{id}', [ProductController::class, 'update']); // Update product
    Route::delete('/{id}', [ProductController::class, 'destroy']); // Delete product (soft)
    Route::post('/{id}/restore', [ProductController::class, 'restore']); // Restore deleted product
    Route::post('/{id}/stock', [ProductController::class, 'updateStock']); // Update stock
    Route::post('/{id}/toggle-status', [ProductController::class, 'toggleStatus']); // Toggle status
});

// Appearance Settings Routes (public - no auth required for reading)
Route::prefix('appearance')->group(function () {
    Route::get('/', [AppearanceSettingController::class, 'index']); // Get key-value pairs
    Route::get('/all', [AppearanceSettingController::class, 'getAll']); // Get all with details
    Route::get('/grouped', [AppearanceSettingController::class, 'getGrouped']); // Get grouped by category
    Route::put('/', [AppearanceSettingController::class, 'update']); // Update multiple
    Route::put('/{key}', [AppearanceSettingController::class, 'updateSingle']); // Update single
    Route::post('/reset', [AppearanceSettingController::class, 'reset']); // Reset to defaults
});

// Website Content Routes (public pages content)
Route::prefix('website-content')->group(function () {
    Route::get('/', [WebsiteContentController::class, 'getAllContent']); // Get all content
    Route::get('/home', [WebsiteContentController::class, 'getHomeContent']); // Get home page content
    Route::get('/about', [WebsiteContentController::class, 'getAboutContent']); // Get about page content
    Route::post('/home', [WebsiteContentController::class, 'saveHomeContent']); // Save home page content
    Route::post('/about', [WebsiteContentController::class, 'saveAboutContent']); // Save about page content
    Route::post('/hero-image', [WebsiteContentController::class, 'uploadHeroImage']); // Upload hero image
    Route::post('/seed', [WebsiteContentController::class, 'seedDefaults']); // Seed default content
});

// Business Settings Routes
Route::prefix('business-settings')->group(function () {
    Route::get('/', [BusinessSettingController::class, 'index']); // Get all business settings
    Route::put('/', [BusinessSettingController::class, 'update']); // Update business settings
    Route::post('/logo', [BusinessSettingController::class, 'uploadLogo']); // Upload business logo
});

// Database Backup Routes
Route::prefix('database')->group(function () {
    Route::get('/export', [DatabaseBackupController::class, 'export']); // Export database as SQL
    Route::get('/info', [DatabaseBackupController::class, 'info']); // Get database info
});

// Customer Routes
Route::prefix('customers')->group(function () {
    Route::get('/', [CustomerController::class, 'index']); // Get all customers
    Route::post('/', [CustomerController::class, 'store']); // Create customer
    Route::post('/check-email', [CustomerController::class, 'checkEmail']); // Check email availability
    Route::get('/{id}', [CustomerController::class, 'show']); // Get single customer
    Route::put('/{id}', [CustomerController::class, 'update']); // Update customer
    Route::delete('/{id}', [CustomerController::class, 'destroy']); // Delete customer
});

// Supplier Routes
Route::prefix('suppliers')->group(function () {
    Route::get('/', [SupplierController::class, 'index']); // Get all suppliers
    Route::post('/', [SupplierController::class, 'store']); // Create supplier
    Route::post('/check-email', [SupplierController::class, 'checkEmail']); // Check email availability
    Route::get('/{id}', [SupplierController::class, 'show']); // Get single supplier
    Route::put('/{id}', [SupplierController::class, 'update']); // Update supplier
    Route::delete('/{id}', [SupplierController::class, 'destroy']); // Delete supplier
});

// Variety Routes
Route::prefix('varieties')->group(function () {
    Route::get('/', [VarietyController::class, 'index']); // Get all varieties
    Route::post('/', [VarietyController::class, 'store']); // Create variety
    Route::get('/{id}', [VarietyController::class, 'show']); // Get single variety
    Route::put('/{id}', [VarietyController::class, 'update']); // Update variety
    Route::delete('/{id}', [VarietyController::class, 'destroy']); // Delete variety
});

// Procurement Routes
Route::prefix('procurements')->group(function () {
    Route::get('/', [ProcurementController::class, 'index']); // Get all procurements
    Route::get('/statistics', [ProcurementController::class, 'statistics']); // Get statistics
    Route::post('/', [ProcurementController::class, 'store']); // Create procurement
    Route::get('/{id}', [ProcurementController::class, 'show']); // Get single procurement
    Route::put('/{id}', [ProcurementController::class, 'update']); // Update procurement
    Route::delete('/{id}', [ProcurementController::class, 'destroy']); // Delete procurement
});

// Drying Process Routes
Route::prefix('drying-processes')->group(function () {
    Route::get('/', [DryingProcessController::class, 'index']); // Get all drying processes
    Route::get('/statistics', [DryingProcessController::class, 'statistics']); // Get statistics
    Route::post('/', [DryingProcessController::class, 'store']); // Create drying process from procurement
    Route::get('/{dryingProcess}', [DryingProcessController::class, 'show']); // Get single drying process
    Route::put('/{dryingProcess}', [DryingProcessController::class, 'update']); // Update drying process
    Route::post('/{dryingProcess}/increment-day', [DryingProcessController::class, 'incrementDay']); // Add a day
    Route::post('/{dryingProcess}/mark-dried', [DryingProcessController::class, 'markAsDried']); // Mark as dried
    Route::post('/{dryingProcess}/postpone', [DryingProcessController::class, 'postpone']); // Cancel drying
    Route::delete('/{dryingProcess}', [DryingProcessController::class, 'destroy']); // Delete drying process
});

// Procurement Batch Routes
Route::prefix('procurement-batches')->group(function () {
    Route::get('/', [ProcurementBatchController::class, 'index']);                                           // Get all batches
    Route::get('/open', [ProcurementBatchController::class, 'open']);                                        // Get open batches (for dropdowns)
    Route::post('/', [ProcurementBatchController::class, 'store']);                                          // Create batch
    Route::get('/{id}', [ProcurementBatchController::class, 'show']);                                        // Get single batch
    Route::put('/{id}', [ProcurementBatchController::class, 'update']);                                      // Update batch
    Route::delete('/{id}', [ProcurementBatchController::class, 'destroy']);                                  // Delete batch
    Route::post('/{batchId}/assign/{procurementId}', [ProcurementBatchController::class, 'assignProcurement']);  // Assign procurement
    Route::delete('/remove-procurement/{procurementId}', [ProcurementBatchController::class, 'removeProcurement']); // Remove procurement
    Route::get('/{batchId}/drying-distribution', [ProcurementBatchController::class, 'dryingDistribution']); // Preview distribution
});

// Processing Routes
Route::prefix('processings')->group(function () {
    Route::get('/', [ProcessingController::class, 'index']); // Get all processings
    Route::get('/active', [ProcessingController::class, 'active']); // Get active (Pending + Processing)
    Route::get('/completed', [ProcessingController::class, 'completed']); // Get completed
    Route::get('/statistics', [ProcessingController::class, 'statistics']); // Get statistics
    Route::post('/', [ProcessingController::class, 'store']); // Create processing
    Route::get('/{processing}', [ProcessingController::class, 'show']); // Get single processing
    Route::put('/{processing}', [ProcessingController::class, 'update']); // Update processing
    Route::post('/{processing}/process', [ProcessingController::class, 'process']); // Start processing
    Route::post('/{processing}/complete', [ProcessingController::class, 'complete']); // Complete processing
    Route::post('/{processing}/return-to-processing', [ProcessingController::class, 'returnToProcessing']); // Return completed to processing
    Route::delete('/{processing}', [ProcessingController::class, 'destroy']); // Delete processing
});
