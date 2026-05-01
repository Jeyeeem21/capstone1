<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Payment;

$payment = Payment::where('pdo_check_number', '123123')->first();

if ($payment) {
    echo "Payment ID: {$payment->id}\n";
    echo "Order: {$payment->sale->transaction_id}\n";
    echo "Check Number: {$payment->pdo_check_number}\n";
    echo "Bank: {$payment->pdo_check_bank}\n";
    echo "Check Date: " . ($payment->pdo_check_date ?? 'NULL') . "\n";
    echo "Created: {$payment->created_at}\n";
    echo "\n--- Updating check date to match order date ---\n";
    
    // Set check date to yesterday if null
    if (!$payment->pdo_check_date) {
        $payment->pdo_check_date = $payment->created_at->subDay();
        $payment->save();
        echo "Check Date Updated: {$payment->pdo_check_date}\n";
    }
} else {
    echo "Payment not found\n";
}
