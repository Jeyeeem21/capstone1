<?php

namespace Database\Seeders;

use App\Models\User;
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
        
        // Seed varieties (rice types)
        $this->call(VarietySeeder::class);
    }
}
