# PDO Payment Implementation Fixes

## Issues Fixed

### 1. Payment Method Logic Issue
**Problem**: When PDO was selected in POS, the order was being created with "Cash on Delivery" status instead of PDO.

**Root Cause**: 
- In `SaleService.php`, PDO was not included in the deferred payment methods check
- PDO was being treated like a regular payment instead of a deferred payment like COD/Pay Later

**Fix**: Added 'pdo' to the deferred payment methods array in `SaleService.php`:
```php
elseif (in_array($paymentMethod, ['cod', 'pay_later', 'credit', 'pdo'])) {
    // Deferred payment — balance is the full total
    $paymentStatus = 'not_paid';
    $amountPaid = 0;
    $balanceRemaining = $total;
    $paidAt = null;
}
```

### 2. PDO Payment Record Creation
**Problem**: No Payment record was being created for PDO orders, so the check details were not being stored.

**Fix**: Added logic to create a Payment record for PDO with check details:
```php
elseif ($paymentMethod === 'pdo' && !empty($data['pdo_check_number'])) {
    // Create PDO payment record for admin approval
    Payment::create([
        'sale_id' => $sale->id,
        'amount' => (float) ($data['pdo_amount'] ?? $total),
        'payment_method' => 'pdo',
        'status' => 'pending',
        'pdo_check_number' => $data['pdo_check_number'],
        'pdo_check_bank' => $data['pdo_bank_name'] ?? null,
        'pdo_check_image' => $data['pdo_check_image'] ?? null,
        'pdo_approval_status' => 'pending',
        'received_by' => auth()->id(),
        'paid_at' => now(),
        'notes' => 'PDO payment from POS - awaiting admin approval',
    ]);
}
```

### 3. Camera Button Not Opening Camera
**Problem**: The "Open Camera" button was opening the file manager instead of the device camera.

**Root Cause**: The `capture` attribute needs to be set on the input element itself, not dynamically via setAttribute.

**Fix**: Created a separate hidden input with `capture="environment"` attribute:
```jsx
<input
  id="pdoCheckCameraInput"
  type="file"
  accept="image/*"
  capture="environment"
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    setPdoCheckFiles(prev => [...prev, ...files]);
    e.target.value = '';
  }}
  className="hidden"
/>
```

### 4. Modal Not Scrollable
**Problem**: When PDO form was long, the modal content was not scrollable.

**Fix**: Added `overflow-y-auto` to the modal content wrapper:
```jsx
<div className="flex-1 min-w-0 overflow-y-auto">
```

### 5. Amount Tendered Logic
**Problem**: In the non-FormData path, PDO was setting amount_tendered to 0 like COD.

**Fix**: Removed 'pdo' from the zero amount_tendered condition:
```javascript
amount_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : 
  (paymentMethod === 'cod' || paymentMethod === 'pay_later' ? 0 : 
  (isStaggered && installmentPlan && installmentPlan.length > 0 ? firstInstallmentAmount : total))
```

## Files Modified

1. `react_frontend/src/pages/shared/PointOfSale/PointOfSale.jsx`
   - Fixed camera button to use separate input with capture attribute
   - Made modal content scrollable
   - Fixed amount_tendered logic for PDO

2. `laravel_backend/app/Services/SaleService.php`
   - Added 'pdo' to deferred payment methods
   - Added Payment record creation for PDO orders

## Testing Checklist

- [ ] Select PDO payment method in POS
- [ ] Upload check image using "Upload Check Photo" button
- [ ] Upload check image using "Open Camera" button (should open camera, not file manager)
- [ ] Fill in check number, bank name, and amount
- [ ] Place order
- [ ] Verify order is created with payment_method = 'pdo'
- [ ] Verify Payment record is created with check details
- [ ] Verify order shows in PDO Management tab
- [ ] Verify modal is scrollable when content is long
- [ ] Verify order does NOT show as "Cash on Delivery"

## Expected Behavior

1. When PDO is selected:
   - Modal header shows "PDO Payment" (purple gradient)
   - Form shows check upload, check number, bank name, and amount fields
   - "Open Camera" button opens device camera
   - Modal content is scrollable
   - Place Order button is purple

2. After placing PDO order:
   - Order is created with payment_method = 'pdo'
   - Payment record is created with status = 'pending'
   - Check details are stored (number, bank, image)
   - Order appears in PDO Management tab for admin approval
   - Order shows payment_status = 'not_paid' until admin approves

## PDO Workflow

1. **POS**: Staff selects PDO, uploads check photo, enters details
2. **Order Created**: Order saved with payment_method = 'pdo', status = 'pending'
3. **Payment Record**: Payment record created with pdo_approval_status = 'pending'
4. **Admin Review**: Admin reviews check in PDO Management tab
5. **Admin Approval**: Admin approves/rejects the PDO
6. **Status Update**: If approved, payment status changes to 'verified', order can proceed
