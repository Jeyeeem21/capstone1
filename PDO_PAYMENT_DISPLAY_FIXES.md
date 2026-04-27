# PDO Payment Display and Management Fixes

## Issues Fixed

### Issue 1: PDO Orders Showing as "Cash" in Orders Page
**Problem**: PDO payment method was not included in the payment method mapping, causing PDO orders to display as "Cash" instead of "PDO".

**Solution**: Added PDO case to the payment method mapping in Orders.jsx line 212.

**Files Modified**:
- `react_frontend/src/pages/admin/Orders/Orders.jsx`
  - Updated payment method mapping to include: `o.payment_method === 'pdo' ? 'PDO'`

### Issue 2: PDO Management Tab Empty - No Data Showing
**Problem**: The PDO Management tab was only looking for installment-based PDO payments, but POS creates standalone Payment records for PDO orders (not installments).

**Solution**: Updated PDOTab to fetch both installment-based PDOs AND standalone PDO payments from the payments table.

**Frontend Changes**:
- `react_frontend/src/pages/admin/Payments/PDOTab.jsx`
  - Added `apiClient` import
  - Updated `loadPDOs()` to fetch standalone PDO payments via `/payments?method=pdo`
  - Combined installment-based and standalone PDOs into unified lists
  - Transformed standalone payments to match installment structure
  - Added `is_standalone` flag to identify standalone payments
  - Updated `handleApprove()`, `handleReject()`, and `handleMarkAsPaid()` to handle both types
  - Updated column definitions to show "Full Payment" for standalone PDOs (no installment number)

**Backend Changes**:
- `laravel_backend/app/Http/Controllers/PaymentController.php`
  - Added `approvePDO()` method to approve standalone PDO payments
  - Added `rejectPDO()` method to reject standalone PDO payments
  - Both methods update `pdo_approval_status` and related fields

- `laravel_backend/routes/api.php`
  - Added route: `POST /payments/{payment}/approve-pdo`
  - Added route: `POST /payments/{payment}/reject-pdo`

- `laravel_backend/app/Models/Payment.php`
  - Added PDO fields to fillable array:
    - `pdo_check_number`
    - `pdo_check_bank`
    - `pdo_check_image`
    - `pdo_approval_status`

- `laravel_backend/app/Http/Resources/PaymentResource.php`
  - Added PDO fields to resource output:
    - `pdo_check_number`
    - `pdo_check_bank`
    - `pdo_check_image`
    - `pdo_approval_status`

## How It Works Now

### PDO Payment Flow (POS)
1. User selects PDO payment method in POS
2. User uploads check image, enters check number, bank name, and amount
3. Order is created with `payment_method = 'pdo'`
4. A standalone Payment record is created with:
   - `payment_method = 'pdo'`
   - `status = 'pending'`
   - `pdo_approval_status = 'pending'`
   - Check details (number, bank, image)
5. Payment appears in PDO Management tab under "Pending Approval"

### PDO Approval Flow (Admin)
1. Admin opens Payment Management → PDO Management tab
2. Sees PDO payment in "Pending Approval" section
3. Clicks review button to open approval modal
4. Admin can:
   - **Approve**: Sets `pdo_approval_status = 'approved'`, moves to "Awaiting Payment" section
   - **Reject**: Sets `pdo_approval_status = 'rejected'` and `status = 'cancelled'`
5. After check clears, admin marks as paid (sets `status = 'verified'`)

### Display in Orders Page
- PDO orders now correctly show "PDO" as payment method
- All other payment methods continue to work as before:
  - COD → "COD"
  - GCash → "GCash"
  - Pay Later → "Pay Later"
  - Cash → "Cash"

## Testing Checklist

- [x] PDO orders display as "PDO" in Orders page (not "Cash")
- [x] PDO payments appear in PDO Management tab
- [x] Pending PDOs show in "Pending Approval" section
- [x] Admin can approve PDO payments
- [x] Admin can reject PDO payments
- [x] Approved PDOs move to "Awaiting Payment" section
- [x] Admin can mark PDO as paid after check clears
- [x] Standalone PDOs show "Full Payment" instead of installment number
- [x] Installment-based PDOs still work correctly
- [x] Both types can be managed from the same tab

## Notes

- The PDO Management tab now handles TWO types of PDO payments:
  1. **Installment-based PDOs**: From payment plans with PDO installments
  2. **Standalone PDOs**: From POS orders with PDO payment method
- Both types are displayed in the same unified interface
- The `is_standalone` flag helps differentiate between the two types
- Backend endpoints handle both types appropriately
