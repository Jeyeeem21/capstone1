<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WebsiteContent;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class WebsiteContentController extends Controller
{
    use AuditLogger;

    /**
     * Get Home page content
     */
    public function getHomeContent(): JsonResponse
    {
        try {
            $content = WebsiteContent::getHomeContent();
            
            return response()->json([
                'success' => true,
                'data' => $content,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch home content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get About page content
     */
    public function getAboutContent(): JsonResponse
    {
        try {
            $content = WebsiteContent::getAboutContent();
            
            return response()->json([
                'success' => true,
                'data' => $content,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch about content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all website content (both home and about)
     */
    public function getAllContent(): JsonResponse
    {
        try {
            $home = WebsiteContent::getHomeContent();
            $about = WebsiteContent::getAboutContent();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'home' => $home,
                    'about' => $about,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Save Home page content
     */
    public function saveHomeContent(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'heroTitle' => 'nullable|string|max:255',
                'heroTitleHighlight' => 'nullable|string|max:255',
                'heroSubtitle' => 'nullable|string',
                'heroTag' => 'nullable|string|max:255',
                'heroImage' => 'nullable|string|max:500',
                'aboutTitle' => 'nullable|string|max:255',
                'aboutDescription' => 'nullable|string',
                'aboutPoints' => 'nullable|array',
                'aboutPoints.*' => 'string',
                'stats' => 'nullable|array',
                'stats.*.value' => 'required|string',
                'stats.*.label' => 'required|string',
                'features' => 'nullable|array',
                'features.*.title' => 'required|string',
                'features.*.description' => 'required|string',
                'testimonials' => 'nullable|array',
                'testimonials.*.name' => 'required|string',
                'testimonials.*.role' => 'required|string',
                'testimonials.*.content' => 'required|string',
                'testimonials.*.rating' => 'nullable|integer|min:1|max:5',
            ]);

            WebsiteContent::saveHomeContent($validated);

            $this->logAudit('UPDATE', 'Website Content', 'Updated home page content', [
                'updated_sections' => array_keys($validated),
            ]);

            // Return updated content
            $content = WebsiteContent::getHomeContent();

            return response()->json([
                'success' => true,
                'message' => 'Home content saved successfully',
                'data' => $content,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save home content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Save About page content
     */
    public function saveAboutContent(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'heroTitle' => 'nullable|string|max:255',
                'heroTitleHighlight' => 'nullable|string|max:255',
                'heroSubtitle' => 'nullable|string',
                'heroImage' => 'nullable|string|max:500',
                'missionTitle' => 'nullable|string|max:255',
                'missionDescription' => 'nullable|string',
                'missionPoints' => 'nullable|array',
                'missionPoints.*' => 'string',
                'visionTitle' => 'nullable|string|max:255',
                'visionDescription' => 'nullable|string',
                'visionPoints' => 'nullable|array',
                'visionPoints.*' => 'string',
                'values' => 'nullable|array',
                'values.*.title' => 'required|string',
                'values.*.description' => 'required|string',
                'timeline' => 'nullable|array',
                'timeline.*.year' => 'required|string',
                'timeline.*.title' => 'required|string',
                'timeline.*.description' => 'required|string',
                'team' => 'nullable|array',
                'team.*.name' => 'required|string',
                'team.*.role' => 'required|string',
            ]);

            WebsiteContent::saveAboutContent($validated);

            $this->logAudit('UPDATE', 'Website Content', 'Updated about page content', [
                'updated_sections' => array_keys($validated),
            ]);

            // Return updated content
            $content = WebsiteContent::getAboutContent();

            return response()->json([
                'success' => true,
                'message' => 'About content saved successfully',
                'data' => $content,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save about content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload hero image
     */
    public function uploadHeroImage(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'image' => 'required|image|mimes:png,jpg,jpeg,svg,webp|max:10240', // 10MB max
                'page' => 'required|in:home,about',
            ]);

            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $page = $request->input('page');
                
                // Delete old hero image if exists
                $oldImage = WebsiteContent::where('page', $page)
                    ->where('section', 'hero')
                    ->where('key', 'image')
                    ->first();
                    
                if ($oldImage && $oldImage->value && Storage::disk('public')->exists(str_replace('/storage/', '', $oldImage->value))) {
                    Storage::disk('public')->delete(str_replace('/storage/', '', $oldImage->value));
                }

                // Store new image
                $filename = "{$page}_hero_" . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('hero-images', $filename, 'public');
                $imageUrl = '/storage/' . $path;
                
                // Update database
                WebsiteContent::updateOrCreate(
                    ['page' => $page, 'section' => 'hero', 'key' => 'image'],
                    ['value' => $imageUrl, 'is_active' => true]
                );

                $this->logAudit('UPDATE', 'Website Content', "Uploaded {$page} hero image", [
                    'page' => $page,
                    'image_url' => $imageUrl,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Hero image uploaded successfully',
                    'data' => [
                        'image_url' => $imageUrl,
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No file uploaded',
            ], 400);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload hero image',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Seed default content
     */
    public function seedDefaults(): JsonResponse
    {
        try {
            WebsiteContent::seedDefaults();

            $this->logAudit('UPDATE', 'Website Content', 'Re-seeded default website content');

            return response()->json([
                'success' => true,
                'message' => 'Default content seeded successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to seed default content',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
