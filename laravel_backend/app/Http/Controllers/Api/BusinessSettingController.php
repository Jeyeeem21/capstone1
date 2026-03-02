<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BusinessSettingService;
use App\Http\Resources\BusinessSettingResource;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BusinessSettingController extends Controller
{
    use ApiResponse, AuditLogger;

    protected BusinessSettingService $settingService;

    public function __construct(BusinessSettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    /**
     * Get all business settings
     */
    public function index(): JsonResponse
    {
        try {
            $settings = $this->settingService->getAllSettings();
            $settings['business_hours_formatted'] = $this->settingService->getFormattedBusinessHours();

            return $this->successResponse($settings);
        } catch (\Exception $e) {
            return $this->serverErrorResponse('Failed to fetch business settings: ' . $e->getMessage());
        }
    }

    /**
     * Update business settings
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'business_name' => 'nullable|string|max:255',
                'business_tagline' => 'nullable|string|max:100',
                'business_email' => 'nullable|email|max:255',
                'business_phone' => 'nullable|string|max:50',
                'business_address' => 'nullable|string|max:500',
                'business_open_days' => 'nullable|string|max:100',
                'business_open_time' => 'nullable|string|max:10',
                'business_close_time' => 'nullable|string|max:10',
                'footer_tagline' => 'nullable|string|max:500',
                'footer_copyright' => 'nullable|string|max:255',
                'footer_powered_by' => 'nullable|string|max:255',
                'social_facebook' => 'nullable|string|max:500',
                'social_twitter' => 'nullable|string|max:500',
                'social_instagram' => 'nullable|string|max:500',
                'social_linkedin' => 'nullable|string|max:500',
            ]);

            $settings = $this->settingService->updateSettings($validated);
            $settings['business_hours_formatted'] = $this->settingService->getFormattedBusinessHours();

            $this->logAudit('UPDATE', 'Business Settings', 'Updated business settings', [
                'updated_fields' => array_keys($validated),
            ]);

            return $this->successResponse($settings, 'Business settings updated successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->errors());
        } catch (\Exception $e) {
            return $this->serverErrorResponse('Failed to update business settings: ' . $e->getMessage());
        }
    }

    /**
     * Upload business logo
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'logo' => 'required|file|mimes:png,jpg,jpeg,svg,webp|max:10240',
            ]);

            if (!$request->hasFile('logo')) {
                return $this->errorResponse('No file uploaded', 400);
            }

            $logoUrl = $this->settingService->uploadLogo($request->file('logo'));

            $this->logAudit('UPDATE', 'Business Settings', 'Uploaded new business logo', [
                'logo_url' => $logoUrl,
            ]);

            return $this->successResponse(['logo_url' => $logoUrl], 'Logo uploaded successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->errors());
        } catch (\Exception $e) {
            return $this->serverErrorResponse('Failed to upload logo: ' . $e->getMessage());
        }
    }
}
