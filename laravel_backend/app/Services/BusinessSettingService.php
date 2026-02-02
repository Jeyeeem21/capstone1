<?php

namespace App\Services;

use App\Models\BusinessSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

/**
 * Service class for Business Settings
 * Handles all business logic related to settings
 */
class BusinessSettingService
{
    private const CACHE_KEY = 'business_settings';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all business settings with caching
     */
    public function getAllSettings(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->fetchAllFromDatabase();
        });
    }

    /**
     * Fetch all settings from database
     */
    private function fetchAllFromDatabase(): array
    {
        $settings = BusinessSetting::all();
        $result = [];

        foreach ($settings as $setting) {
            $result[$setting->key] = $this->castValue($setting->value, $setting->type);
        }

        return $result;
    }

    /**
     * Cast value based on type
     */
    private function castValue($value, string $type)
    {
        return match($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($value) ? (float) $value : null,
            'json' => json_decode($value, true),
            default => $value,
        };
    }

    /**
     * Get a single setting value
     */
    public function getValue(string $key, $default = null)
    {
        $settings = $this->getAllSettings();
        return $settings[$key] ?? $default;
    }

    /**
     * Update multiple settings
     */
    public function updateSettings(array $data): array
    {
        foreach ($data as $key => $value) {
            if ($value !== null) {
                BusinessSetting::updateOrCreate(
                    ['key' => $key],
                    ['value' => (string) $value, 'type' => 'string']
                );
            }
        }

        // Clear cache and return fresh data
        $this->clearCache();
        
        return $this->getAllSettings();
    }

    /**
     * Upload and save logo
     */
    public function uploadLogo(UploadedFile $file): string
    {
        // Delete old logo if exists
        $oldLogo = $this->getValue('business_logo');
        if ($oldLogo && str_starts_with($oldLogo, '/storage/')) {
            $relativePath = str_replace('/storage/', '', $oldLogo);
            if (Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }
        }

        // Store new logo
        $filename = 'logo_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('logos', $filename, 'public');
        $logoUrl = '/storage/' . $path;

        // Update setting
        BusinessSetting::updateOrCreate(
            ['key' => 'business_logo'],
            ['value' => $logoUrl, 'type' => 'string']
        );

        $this->clearCache();

        return $logoUrl;
    }

    /**
     * Get formatted business hours
     */
    public function getFormattedBusinessHours(): string
    {
        $settings = $this->getAllSettings();
        
        $openDays = $settings['business_open_days'] ?? 'Monday - Saturday';
        $openTime = $settings['business_open_time'] ?? '07:00';
        $closeTime = $settings['business_close_time'] ?? '18:00';

        $openFormatted = date('g:i A', strtotime($openTime));
        $closeFormatted = date('g:i A', strtotime($closeTime));

        return "{$openDays}: {$openFormatted} - {$closeFormatted}";
    }

    /**
     * Clear settings cache
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Refresh cache with fresh data
     */
    public function refreshCache(): array
    {
        $this->clearCache();
        return $this->getAllSettings();
    }
}
