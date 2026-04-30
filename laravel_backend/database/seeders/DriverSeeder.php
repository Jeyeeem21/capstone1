<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DriverSeeder extends Seeder
{
    public function run(): void
    {
        $drivers = [
            [
                'name'               => 'Ramon Villanueva',
                'email'              => 'ramon.villanueva@kjpricemill.com',
                'password'           => Hash::make('driver123'),
                'role'               => User::ROLE_STAFF,
                'position'           => 'Driver',
                'truck_plate_number' => 'ABC 1234',
                'date_hired'         => '2024-01-15',
                'status'             => 'active',
            ],
            [
                'name'               => 'Eduardo Mendoza',
                'email'              => 'eduardo.mendoza@kjpricemill.com',
                'password'           => Hash::make('driver123'),
                'role'               => User::ROLE_STAFF,
                'position'           => 'Driver',
                'truck_plate_number' => 'XYZ 5678',
                'date_hired'         => '2024-03-10',
                'status'             => 'active',
            ],
        ];

        foreach ($drivers as $driver) {
            User::updateOrCreate(['email' => $driver['email']], $driver);
        }

        $this->command->info('2 drivers seeded.');
    }
}
