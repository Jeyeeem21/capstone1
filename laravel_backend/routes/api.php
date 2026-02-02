<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AppearanceSettingController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\DatabaseBackupController;
use App\Http\Controllers\Api\WebsiteContentController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\ProcessingController;
use App\Http\Controllers\ProductController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Product Routes (Admin CRUD)
Route::prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']); // Get all products
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

// Category Routes
Route::prefix('categories')->group(function () {
    Route::get('/', [CategoryController::class, 'index']); // Get all categories
    Route::post('/', [CategoryController::class, 'store']); // Create category
    Route::get('/{id}', [CategoryController::class, 'show']); // Get single category
    Route::put('/{id}', [CategoryController::class, 'update']); // Update category
    Route::delete('/{id}', [CategoryController::class, 'destroy']); // Delete category
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
