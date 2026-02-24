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
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Seed appearance settings with defaults
        $this->call(AppearanceSettingSeeder::class);
        
        // Seed varieties (rice types)
        $this->call(VarietySeeder::class);

        // Seed products
        $this->call(ProductSeeder::class);
    }
}
