<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name'    => 'Maria Santos',
                'phone'   => '09171234567',
                'email'   => 'maria.santos@email.com',
                'address' => 'Brgy. San Vicente, Calapan City, Oriental Mindoro',
                'status'  => 'active',
                'orders'  => 0,
            ],
            [
                'name'    => 'Jose Reyes',
                'phone'   => '09281234568',
                'email'   => 'jose.reyes@email.com',
                'address' => 'Brgy. Ilaya, Calapan City, Oriental Mindoro',
                'status'  => 'active',
                'orders'  => 0,
            ],
            [
                'name'    => 'Ana Cruz',
                'phone'   => '09391234569',
                'email'   => 'ana.cruz@email.com',
                'address' => 'Brgy. Camilmil, Calapan City, Oriental Mindoro',
                'status'  => 'active',
                'orders'  => 0,
            ],
            [
                'name'    => 'Pedro Bautista',
                'phone'   => '09501234570',
                'email'   => 'pedro.bautista@email.com',
                'address' => 'Brgy. Tibag, Calapan City, Oriental Mindoro',
                'status'  => 'active',
                'orders'  => 0,
            ],
            [
                'name'    => 'Lourdes Dela Cruz',
                'phone'   => '09611234571',
                'email'   => 'lourdes.delacruz@email.com',
                'address' => 'Brgy. Lumang Bayan, Calapan City, Oriental Mindoro',
                'status'  => 'active',
                'orders'  => 0,
            ],
        ];

        foreach ($customers as $customer) {
            Customer::updateOrCreate(['email' => $customer['email']], $customer);
        }

        $this->command->info('5 customers seeded.');
    }
}
