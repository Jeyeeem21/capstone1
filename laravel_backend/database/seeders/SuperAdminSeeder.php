<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Create Super Admin account (only one)
        User::updateOrCreate(
            ['email' => 'superadmin@kjpricemill.com'],
            [
                'name' => 'Super Admin',
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@kjpricemill.com',
                'password' => Hash::make('superadmin123'),
                'role' => User::ROLE_SUPER_ADMIN,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        // Create default Admin account
        User::updateOrCreate(
            ['email' => 'admin@kjpricemill.com'],
            [
                'name' => 'Admin User',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => 'admin@kjpricemill.com',
                'password' => Hash::make('admin123'),
                'role' => User::ROLE_ADMIN,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        // Create default Staff account
        User::updateOrCreate(
            ['email' => 'staff@kjpricemill.com'],
            [
                'name' => 'Staff User',
                'first_name' => 'Staff',
                'last_name' => 'User',
                'email' => 'staff@kjpricemill.com',
                'password' => Hash::make('staff123'),
                'role' => User::ROLE_STAFF,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Default accounts created:');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Super Admin', 'superadmin@kjpricemill.com', 'superadmin123'],
                ['Admin', 'admin@kjpricemill.com', 'admin123'],
                ['Staff', 'staff@kjpricemill.com', 'staff123'],
            ]
        );
    }
}
