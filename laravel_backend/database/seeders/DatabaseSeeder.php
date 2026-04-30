<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed default user accounts (Super Admin, Admin, Staff)
        $this->call(SuperAdminSeeder::class);

        // Seed appearance settings with defaults
        $this->call(AppearanceSettingSeeder::class);

        // Seed business settings (email, SMTP, GCash, etc.)
        $this->call(BusinessSettingSeeder::class);
        
        // Seed varieties (rice types)
        $this->call(VarietySeeder::class);

        // Seed customers (5)
        $this->call(CustomerSeeder::class);

        // Seed drivers (2)
        $this->call(DriverSeeder::class);

         // Seed procurements
        $this->call(ProcurementSeeder::class);

        // Seed default website content (Home & About pages)
        $this->call(WebsiteContentSeeder::class);
    }
}
