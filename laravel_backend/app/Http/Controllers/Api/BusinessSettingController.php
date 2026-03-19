<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Services\BusinessSettingService;
use App\Services\EmailService;
use App\Http\Resources\BusinessSettingResource;
use App\Traits\ApiResponse;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

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

            // Never expose SMTP password — mask it if present
            if (!empty($settings['smtp_password'])) {
                $settings['smtp_password'] = '••••••••';
            }

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
                'business_start_year' => 'nullable|integer|min:1900|max:2100',
                'business_email' => 'nullable|email|max:255',
                'business_phone' => 'nullable|string|max:50',
                'business_address' => 'nullable|string|max:500',
                'business_open_days' => 'nullable|string|max:100',
                'business_open_time' => 'nullable|string|max:10',
                'business_close_time' => 'nullable|string|max:10',
                'business_hours_json' => 'nullable|string|max:5000',
                'footer_tagline' => 'nullable|string|max:500',
                'footer_copyright' => 'nullable|string|max:255',
                'footer_powered_by' => 'nullable|string|max:255',
                'footer_badge1' => 'nullable|string|max:100',
                'footer_badge2' => 'nullable|string|max:100',
                'social_facebook' => 'nullable|string|max:500',
                'social_twitter' => 'nullable|string|max:500',
                'social_instagram' => 'nullable|string|max:500',
                'social_linkedin' => 'nullable|string|max:500',
                // Shipping fee settings
                'shipping_rate_per_sack' => 'nullable|numeric|min:0',
                'shipping_rate_per_km' => 'nullable|numeric|min:0',
                'shipping_base_km' => 'nullable|numeric|min:0',
                'warehouse_address' => 'nullable|string|max:500',
                'google_maps_embed' => 'nullable|string|max:2000',
                // SMTP / Email settings
                'smtp_password' => 'nullable|string|max:255',
            ]);

            // Don't overwrite smtp_password if user sent the masked placeholder
            if (isset($validated['smtp_password']) && $validated['smtp_password'] === '••••••••') {
                unset($validated['smtp_password']);
            }

            $settings = $this->settingService->updateSettings($validated);
            $settings['business_hours_formatted'] = $this->settingService->getFormattedBusinessHours();

            // Mask smtp_password in the response
            if (!empty($settings['smtp_password'])) {
                $settings['smtp_password'] = '••••••••';
            }

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

    /**
     * Send a test email to verify SMTP configuration
     */
    public function testEmail(Request $request): JsonResponse
    {
        try {
            $email = BusinessSetting::getValue('business_email');
            $businessName = BusinessSetting::getValue('business_name', 'KJP Ricemill');

            // Accept password from request (unsaved form value) or fall back to DB
            $password = $request->input('smtp_password');
            if (!$password || $password === '••••••••') {
                $password = BusinessSetting::getValue('smtp_password');
            } else {
                // Save the password to DB so future emails also work
                BusinessSetting::updateOrCreate(
                    ['key' => 'smtp_password'],
                    ['value' => $password, 'type' => 'text']
                );
            }

            if (!$email || !$password) {
                return $this->errorResponse('SMTP is not configured. Please set your Business Email and App Password first.', 422);
            }

            // Configure mailer with DB settings
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => 'smtp.gmail.com',
                'mail.mailers.smtp.port' => 587,
                'mail.mailers.smtp.username' => $email,
                'mail.mailers.smtp.password' => $password,
                'mail.mailers.smtp.encryption' => 'tls',
            ]);
            Mail::purge('smtp');

            Mail::raw("This is a test email from {$businessName}. Your email configuration is working correctly!", function ($message) use ($email, $businessName) {
                $message->to($email)
                        ->from($email, $businessName)
                        ->subject("{$businessName} - Test Email");
            });

            return $this->successResponse(null, 'Test email sent successfully to ' . $email);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to send test email: ' . $e->getMessage(), 500);
        }
    }
}
