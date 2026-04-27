<?php

/**
 * Quick test script for payment system models
 * Run with: php test_payment_models.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Testing Payment System Models ===\n\n";

// Test Sale model
echo "1. Testing Sale model...\n";
try {
    $salesCount = \App\Models\Sale::count();
    echo "   ✓ Sales count: {$salesCount}\n";
    
    if ($salesCount > 0) {
        $sale = \App\Models\Sale::first();
        echo "   ✓ First sale ID: {$sale->id}\n";
        echo "   ✓ Transaction ID: {$sale->transaction_id}\n";
        echo "   ✓ Total: ₱" . number_format($sale->total, 2) . "\n";
        echo "   ✓ Amount Paid: ₱" . number_format($sale->amount_paid ?? 0, 2) . "\n";
        echo "   ✓ Balance: ₱" . number_format($sale->balance_remaining ?? 0, 2) . "\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test Payment model
echo "2. Testing Payment model...\n";
try {
    $paymentsCount = \App\Models\Payment::count();
    echo "   ✓ Payments count: {$paymentsCount}\n";
    
    if ($paymentsCount > 0) {
        $payment = \App\Models\Payment::first();
        echo "   ✓ First payment ID: {$payment->id}\n";
        echo "   ✓ Amount: ₱" . number_format($payment->amount, 2) . "\n";
        echo "   ✓ Method: {$payment->payment_method}\n";
        echo "   ✓ Status: {$payment->status}\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test PaymentInstallment model
echo "3. Testing PaymentInstallment model...\n";
try {
    $installmentsCount = \App\Models\PaymentInstallment::count();
    echo "   ✓ Installments count: {$installmentsCount}\n";
    
    if ($installmentsCount > 0) {
        $installment = \App\Models\PaymentInstallment::first();
        echo "   ✓ First installment ID: {$installment->id}\n";
        echo "   ✓ Amount Expected: ₱" . number_format($installment->amount_expected, 2) . "\n";
        echo "   ✓ Amount Paid: ₱" . number_format($installment->amount_paid, 2) . "\n";
        echo "   ✓ Status: {$installment->status}\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test relationships
echo "4. Testing relationships...\n";
try {
    $sale = \App\Models\Sale::first();
    if ($sale) {
        $paymentsCount = $sale->payments()->count();
        $installmentsCount = $sale->paymentInstallments()->count();
        
        echo "   ✓ Sale #{$sale->id} has {$paymentsCount} payment(s)\n";
        echo "   ✓ Sale #{$sale->id} has {$installmentsCount} installment(s)\n";
        echo "   ✓ Is staggered: " . ($sale->is_staggered ? 'Yes' : 'No') . "\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test helper methods
echo "5. Testing helper methods...\n";
try {
    $sale = \App\Models\Sale::first();
    if ($sale) {
        echo "   ✓ isFullyPaid(): " . ($sale->isFullyPaid() ? 'Yes' : 'No') . "\n";
        echo "   ✓ isPartiallyPaid(): " . ($sale->isPartiallyPaid() ? 'Yes' : 'No') . "\n";
        echo "   ✓ calculatePaymentStatus(): {$sale->calculatePaymentStatus()}\n";
        echo "   ✓ verifiedPaymentsTotal(): ₱" . number_format($sale->verifiedPaymentsTotal(), 2) . "\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
