# Testing the Payment System

## Step 1: Run Migration

```bash
# Make sure you're in the laravel_backend directory
cd laravel_backend

# Run the migration
php artisan migrate

# If you get "Nothing to migrate", check if it already ran:
php artisan migrate:status

# If you need to rollback and re-run:
php artisan migrate:rollback --step=1
php artisan migrate
```

## Step 2: Test Models in Tinker

```bash
php artisan tinker
```

Then run these commands (copy and paste one at a time):

```php
// Test Sale model
\App\Models\Sale::first()

// Test Payment model
\App\Models\Payment::count()

// Test PaymentInstallment model
\App\Models\PaymentInstallment::count()

// Test relationships
$sale = \App\Models\Sale::first()
$sale->payments
$sale->paymentInstallments

// Test helper methods
$sale->isFullyPaid()
$sale->isPartiallyPaid()
$sale->calculatePaymentStatus()

// Exit tinker
exit
```

## Step 3: Test API Endpoints

You can use Postman, Insomnia, or curl to test these endpoints:

### Get All Payments
```bash
GET http://localhost/api/payments
Authorization: Bearer YOUR_TOKEN
```

### Get Payment Plans
```bash
GET http://localhost/api/payment-plans
Authorization: Bearer YOUR_TOKEN
```

### Record a Cash Payment
```bash
POST http://localhost/api/sales/1/payment
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "amount": 1000.00,
  "payment_method": "cash",
  "notes": "Test payment"
}
```

### Record a GCash Payment
```bash
POST http://localhost/api/sales/1/payment
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "amount": 1000.00,
  "payment_method": "gcash",
  "reference_number": "GC123456789",
  "payment_proof": ["base64_image_data_here"],
  "notes": "Test GCash payment"
}
```

### Create Staggered Payment Schedule
```bash
POST http://localhost/api/sales/1/payment-schedule
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "installments": [
    {
      "installment_number": 1,
      "amount": 5000.00,
      "payment_method": "cash",
      "pay_now": true
    },
    {
      "installment_number": 2,
      "amount": 5000.00,
      "payment_method": "gcash",
      "due_date": "2026-05-15",
      "pay_now": false
    }
  ]
}
```

### Verify a GCash Payment
```bash
POST http://localhost/api/payments/1/verify
Authorization: Bearer YOUR_TOKEN
```

### Get Customer Balances
```bash
GET http://localhost/api/customers/1/balances
Authorization: Bearer YOUR_TOKEN
```

## Common Issues and Solutions

### Issue 1: "Nothing to migrate"
**Solution:** The migration already ran. Check with:
```bash
php artisan migrate:status
```

### Issue 2: "Class not found" in Tinker
**Solution:** Use full namespace:
```php
\App\Models\Sale::first()
\App\Models\Payment::count()
\App\Models\PaymentInstallment::count()
```

### Issue 3: Syntax error in CustomerController
**Solution:** Already fixed! The duplicate closing brace has been removed.

### Issue 4: Foreign key constraint errors
**Solution:** Make sure you have existing sales records before testing payments:
```php
\App\Models\Sale::count() // Should be > 0
```

## Verification Checklist

- [ ] Migration ran successfully
- [ ] Can query Sale model
- [ ] Can query Payment model
- [ ] Can query PaymentInstallment model
- [ ] Sale relationships work (payments, paymentInstallments)
- [ ] Can create a payment via API
- [ ] Can create a payment schedule via API
- [ ] Can verify a GCash payment via API
- [ ] Can get customer balances via API

## Next Steps After Testing

Once all tests pass, you're ready to:
1. Continue with frontend implementation
2. Test the complete payment flow
3. Deploy to production

## Need Help?

If you encounter any errors, share:
1. The exact error message
2. The command you ran
3. Any relevant logs from `storage/logs/laravel.log`
 Nothing to migrate.

=== Testing Payment System Models ===

1. Testing Sale model...

   ✓ Sales count: 21

   ✓ First sale ID: 1

   ✓ Transaction ID: ORD-20260310-001

   ✓ Total: ₱3,503.45

   ✓ Amount Paid: ₱3,503.45

   ✓ Balance: ₱0.00

2. Testing Payment model...

   ✓ Payments count: 0

3. Testing PaymentInstallment model...

   ✓ Installments count: 0

4. Testing relationships...

   ✓ Sale #1 has 0 payment(s)

   ✓ Sale #1 has 0 installment(s)

   ✓ Is staggered: No

5. Testing helper methods...

   ✓ isFullyPaid(): Yes

   ✓ isPartiallyPaid(): No

   ✓ calculatePaymentStatus(): paid

   ✓ verifiedPaymentsTotal(): ₱0.00

=== Test Complete ===

PS C:\laragon\www\Jeyeeem's files\Capstone\capstone1\laravel_backend> wala na mali rito?