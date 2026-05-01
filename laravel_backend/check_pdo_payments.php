<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Payment;

echo "=== PDO PAYMENT CHECK ===" . PHP_EOL;
echo PHP_EOL;

$count = Payment::where('payment_method', 'pdo')->count();
echo "Total PDO payments: " . $count . PHP_EOL;
echo PHP_EOL;

if ($count > 0) {
    $pdos = Payment::where('payment_method', 'pdo')
        ->with('sale')
        ->get(['id', 'sale_id', 'status', 'pdo_approval_status', 'pdo_check_number', 'amount']);
    
    foreach ($pdos as $pdo) {
        echo "ID: " . $pdo->id . PHP_EOL;
        echo "  Order: " . ($pdo->sale->transaction_id ?? 'N/A') . PHP_EOL;
        echo "  Amount: ₱" . number_format($pdo->amount, 2) . PHP_EOL;
        echo "  Status: " . $pdo->status . PHP_EOL;
        echo "  PDO Approval: " . ($pdo->pdo_approval_status ?? 'NULL') . PHP_EOL;
        echo "  Check Number: " . $pdo->pdo_check_number . PHP_EOL;
        echo PHP_EOL;
    }
} else {
    echo "❌ No PDO payments found in database." . PHP_EOL;
    echo PHP_EOL;
    echo "TO CREATE A TEST PDO PAYMENT:" . PHP_EOL;
    echo "1. Go to Point of Sale (POS)" . PHP_EOL;
    echo "2. Add items to cart" . PHP_EOL;
    echo "3. Click 'Place Order'" . PHP_EOL;
    echo "4. Select payment method: PDO" . PHP_EOL;
    echo "5. Fill in check details and submit" . PHP_EOL;
}

echo "=== END CHECK ===" . PHP_EOL;
