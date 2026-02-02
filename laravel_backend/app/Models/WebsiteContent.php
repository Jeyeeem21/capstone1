<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteContent extends Model
{
    protected $fillable = [
        'page',
        'section',
        'key',
        'value',
        'meta',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get all content for a specific page
     */
    public static function getPageContent(string $page): array
    {
        $contents = self::where('page', $page)
            ->where('is_active', true)
            ->orderBy('section')
            ->orderBy('sort_order')
            ->get();

        $result = [];
        foreach ($contents as $content) {
            if (!isset($result[$content->section])) {
                $result[$content->section] = [];
            }

            // If meta exists, merge it with the value
            if ($content->meta) {
                $result[$content->section][$content->key] = array_merge(
                    ['value' => $content->value],
                    $content->meta
                );
            } else {
                $result[$content->section][$content->key] = $content->value;
            }
        }

        return $result;
    }

    /**
     * Get structured content for Home page
     */
    public static function getHomeContent(): array
    {
        $raw = self::getPageContent('home');
        
        return [
            'heroTitle' => $raw['hero']['title'] ?? 'Quality Rice',
            'heroTitleHighlight' => $raw['hero']['titleHighlight'] ?? 'From Farm to Table',
            'heroSubtitle' => $raw['hero']['subtitle'] ?? 'Experience the finest selection of premium rice products.',
            'heroTag' => $raw['hero']['tag'] ?? 'Premium Quality Rice Since 2010',
            'heroImage' => $raw['hero']['image'] ?? null,
            'aboutTitle' => $raw['aboutPreview']['title'] ?? 'Committed to Quality Since 2010',
            'aboutDescription' => $raw['aboutPreview']['description'] ?? 'KJP Ricemill has been a trusted name in the rice industry.',
            'aboutPoints' => self::extractArrayItems($raw, 'aboutPreview', 'point'),
            'stats' => self::extractArrayItemsWithMeta($raw, 'stats'),
            'features' => self::extractArrayItemsWithMeta($raw, 'features'),
            'testimonials' => self::extractArrayItemsWithMeta($raw, 'testimonials'),
        ];
    }

    /**
     * Get structured content for About page
     */
    public static function getAboutContent(): array
    {
        $raw = self::getPageContent('about');
        
        return [
            'heroTitle' => $raw['hero']['title'] ?? 'Our Story of',
            'heroTitleHighlight' => $raw['hero']['titleHighlight'] ?? 'Excellence & Quality',
            'heroSubtitle' => $raw['hero']['subtitle'] ?? 'For over 15 years, KJP Ricemill has been committed to delivering the finest quality rice products.',
            'heroImage' => $raw['hero']['image'] ?? null,
            'missionTitle' => $raw['mission']['title'] ?? 'Our Mission',
            'missionDescription' => $raw['mission']['description'] ?? 'To provide Filipino families and businesses with the highest quality rice products.',
            'missionPoints' => self::extractArrayItems($raw, 'mission', 'point'),
            'visionTitle' => $raw['vision']['title'] ?? 'Our Vision',
            'visionDescription' => $raw['vision']['description'] ?? 'To become the most trusted and preferred rice supplier in the Philippines.',
            'visionPoints' => self::extractArrayItems($raw, 'vision', 'point'),
            'values' => self::extractArrayItemsWithMeta($raw, 'values'),
            'timeline' => self::extractArrayItemsWithMeta($raw, 'timeline'),
            'team' => self::extractArrayItemsWithMeta($raw, 'team'),
        ];
    }

    /**
     * Extract simple array items (like points)
     */
    private static function extractArrayItems(array $raw, string $section, string $prefix): array
    {
        $items = [];
        if (isset($raw[$section])) {
            foreach ($raw[$section] as $key => $value) {
                if (str_starts_with($key, $prefix)) {
                    $items[] = is_array($value) ? ($value['value'] ?? '') : $value;
                }
            }
        }
        return $items;
    }

    /**
     * Extract array items with metadata (like features, testimonials)
     */
    private static function extractArrayItemsWithMeta(array $raw, string $section): array
    {
        $items = [];
        if (isset($raw[$section])) {
            foreach ($raw[$section] as $key => $item) {
                if (is_numeric($key) || str_starts_with($key, 'item')) {
                    if (is_array($item)) {
                        $items[] = $item;
                    }
                }
            }
        }
        // Sort by sort_order if exists
        usort($items, fn($a, $b) => ($a['sort_order'] ?? 0) - ($b['sort_order'] ?? 0));
        return $items;
    }

    /**
     * Save Home page content
     */
    public static function saveHomeContent(array $data): void
    {
        // Save hero section
        self::upsertContent('home', 'hero', 'title', $data['heroTitle'] ?? '');
        self::upsertContent('home', 'hero', 'titleHighlight', $data['heroTitleHighlight'] ?? '');
        self::upsertContent('home', 'hero', 'subtitle', $data['heroSubtitle'] ?? '');
        self::upsertContent('home', 'hero', 'tag', $data['heroTag'] ?? '');
        if (isset($data['heroImage'])) {
            self::upsertContent('home', 'hero', 'image', $data['heroImage']);
        }

        // Save about preview section
        self::upsertContent('home', 'aboutPreview', 'title', $data['aboutTitle'] ?? '');
        self::upsertContent('home', 'aboutPreview', 'description', $data['aboutDescription'] ?? '');

        // Save about points
        self::deleteSection('home', 'aboutPreview', 'point%');
        foreach (($data['aboutPoints'] ?? []) as $index => $point) {
            self::upsertContent('home', 'aboutPreview', "point{$index}", $point, null, $index);
        }

        // Save stats
        self::saveArraySection('home', 'stats', $data['stats'] ?? []);

        // Save features
        self::saveArraySection('home', 'features', $data['features'] ?? []);

        // Save testimonials
        self::saveArraySection('home', 'testimonials', $data['testimonials'] ?? []);
    }

    /**
     * Save About page content
     */
    public static function saveAboutContent(array $data): void
    {
        // Save hero section
        self::upsertContent('about', 'hero', 'title', $data['heroTitle'] ?? '');
        self::upsertContent('about', 'hero', 'titleHighlight', $data['heroTitleHighlight'] ?? '');
        self::upsertContent('about', 'hero', 'subtitle', $data['heroSubtitle'] ?? '');
        if (isset($data['heroImage'])) {
            self::upsertContent('about', 'hero', 'image', $data['heroImage']);
        }

        // Save mission section
        self::upsertContent('about', 'mission', 'title', $data['missionTitle'] ?? '');
        self::upsertContent('about', 'mission', 'description', $data['missionDescription'] ?? '');
        self::deleteSection('about', 'mission', 'point%');
        foreach (($data['missionPoints'] ?? []) as $index => $point) {
            self::upsertContent('about', 'mission', "point{$index}", $point, null, $index);
        }

        // Save vision section
        self::upsertContent('about', 'vision', 'title', $data['visionTitle'] ?? '');
        self::upsertContent('about', 'vision', 'description', $data['visionDescription'] ?? '');
        self::deleteSection('about', 'vision', 'point%');
        foreach (($data['visionPoints'] ?? []) as $index => $point) {
            self::upsertContent('about', 'vision', "point{$index}", $point, null, $index);
        }

        // Save values
        self::saveArraySection('about', 'values', $data['values'] ?? []);

        // Save timeline
        self::saveArraySection('about', 'timeline', $data['timeline'] ?? []);

        // Save team
        self::saveArraySection('about', 'team', $data['team'] ?? []);
    }

    /**
     * Upsert a single content item
     */
    private static function upsertContent(string $page, string $section, string $key, ?string $value, ?array $meta = null, int $sortOrder = 0): void
    {
        self::updateOrCreate(
            ['page' => $page, 'section' => $section, 'key' => $key],
            ['value' => $value, 'meta' => $meta, 'sort_order' => $sortOrder, 'is_active' => true]
        );
    }

    /**
     * Save an array section (features, testimonials, etc.)
     */
    private static function saveArraySection(string $page, string $section, array $items): void
    {
        // Delete existing items for this section
        self::where('page', $page)
            ->where('section', $section)
            ->where('key', 'like', 'item%')
            ->delete();

        // Insert new items
        foreach ($items as $index => $item) {
            $value = $item['title'] ?? $item['name'] ?? $item['value'] ?? '';
            $meta = $item;
            unset($meta['value']); // Don't duplicate value in meta
            
            self::create([
                'page' => $page,
                'section' => $section,
                'key' => "item{$index}",
                'value' => $value,
                'meta' => $meta,
                'sort_order' => $index,
                'is_active' => true,
            ]);
        }
    }

    /**
     * Delete section items matching a pattern
     */
    private static function deleteSection(string $page, string $section, string $keyPattern): void
    {
        self::where('page', $page)
            ->where('section', $section)
            ->where('key', 'like', $keyPattern)
            ->delete();
    }

    /**
     * Seed default content
     */
    public static function seedDefaults(): void
    {
        // Default Home content
        $homeDefaults = [
            'heroTitle' => 'Quality Rice',
            'heroTitleHighlight' => 'From Farm to Table',
            'heroSubtitle' => 'Experience the finest selection of premium rice products. From aromatic jasmine to nutritious brown rice, we deliver excellence in every grain.',
            'heroTag' => 'Premium Quality Rice Since 2010',
            'aboutTitle' => 'Committed to Quality Since 2010',
            'aboutDescription' => 'KJP Ricemill has been a trusted name in the rice industry for over 15 years. We take pride in sourcing the finest quality rice from local farmers and delivering it fresh to your doorstep.',
            'aboutPoints' => [
                'Premium quality rice from trusted farmers',
                'Modern milling facilities for best results',
                'Strict quality control standards',
                'Reliable delivery across the region',
            ],
            'stats' => [
                ['value' => '15+', 'label' => 'Years Experience'],
                ['value' => '500+', 'label' => 'Happy Customers'],
                ['value' => '50K+', 'label' => 'Bags Delivered'],
                ['value' => '99%', 'label' => 'Satisfaction Rate'],
            ],
            'features' => [
                ['title' => 'Quality Assured', 'description' => 'Every grain passes through rigorous quality checks to ensure premium standards.'],
                ['title' => 'Farm Fresh', 'description' => 'Sourced directly from local farmers, ensuring freshness from harvest to your table.'],
                ['title' => 'Fast Delivery', 'description' => 'Reliable delivery service to get your orders to you quickly and efficiently.'],
                ['title' => 'Best Prices', 'description' => 'Competitive wholesale and retail prices without compromising on quality.'],
            ],
            'testimonials' => [
                ['name' => 'Maria Santos', 'role' => 'Restaurant Owner', 'content' => 'KJP Ricemill has been our trusted supplier for 5 years. Their jasmine rice quality is consistently excellent.', 'rating' => 5],
                ['name' => 'Juan Dela Cruz', 'role' => 'Retail Store Owner', 'content' => 'Fast delivery and great prices. My customers keep coming back for their rice products.', 'rating' => 5],
                ['name' => 'Lisa Reyes', 'role' => 'Catering Business', 'content' => 'The quality of rice makes a huge difference in our dishes. KJP never disappoints!', 'rating' => 5],
            ],
        ];

        // Default About content
        $aboutDefaults = [
            'heroTitle' => 'Our Story of',
            'heroTitleHighlight' => 'Excellence & Quality',
            'heroSubtitle' => 'For over 15 years, KJP Ricemill has been committed to delivering the finest quality rice products to Filipino households and businesses.',
            'missionTitle' => 'Our Mission',
            'missionDescription' => 'To provide Filipino families and businesses with the highest quality rice products at fair prices, while supporting local farmers and sustainable agricultural practices.',
            'missionPoints' => [
                'Deliver premium quality rice consistently',
                'Support local farming communities',
                'Ensure fair and competitive pricing',
                'Provide exceptional customer service',
            ],
            'visionTitle' => 'Our Vision',
            'visionDescription' => 'To become the most trusted and preferred rice supplier in the Philippines, known for our unwavering commitment to quality, innovation, and customer satisfaction.',
            'visionPoints' => [
                'Be the leading rice supplier in the region',
                'Pioneer innovative milling technologies',
                'Create lasting value for all stakeholders',
                'Promote sustainable rice production',
            ],
            'values' => [
                ['title' => 'Quality First', 'description' => 'We never compromise on the quality of our rice products, ensuring every grain meets our high standards.'],
                ['title' => 'Customer Care', 'description' => 'Building lasting relationships with our customers through exceptional service and reliability.'],
                ['title' => 'Sustainability', 'description' => 'Supporting local farmers and implementing eco-friendly practices in our operations.'],
                ['title' => 'Excellence', 'description' => 'Striving for excellence in everything we do, from sourcing to delivery.'],
            ],
            'timeline' => [
                ['year' => '2010', 'title' => 'Foundation', 'description' => 'KJP Ricemill was established with a small milling facility and a vision for quality.'],
                ['year' => '2014', 'title' => 'Expansion', 'description' => 'Expanded operations with modern milling equipment and increased storage capacity.'],
                ['year' => '2018', 'title' => 'Growth', 'description' => 'Reached 100+ regular customers and established partnerships with local farmers.'],
                ['year' => '2022', 'title' => 'Innovation', 'description' => 'Implemented digital inventory system and launched online ordering platform.'],
                ['year' => '2024', 'title' => 'Present', 'description' => 'Serving 500+ customers with a diverse range of premium rice products.'],
            ],
            'team' => [
                ['name' => 'Jose P. Katipunan', 'role' => 'Founder & CEO'],
                ['name' => 'Maria Santos', 'role' => 'Operations Manager'],
                ['name' => 'Pedro Garcia', 'role' => 'Quality Control Head'],
                ['name' => 'Ana Reyes', 'role' => 'Sales Manager'],
            ],
        ];

        self::saveHomeContent($homeDefaults);
        self::saveAboutContent($aboutDefaults);
    }
}
