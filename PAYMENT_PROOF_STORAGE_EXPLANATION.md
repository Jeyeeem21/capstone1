# Payment Proof Storage - Where is it Saved?

## Current Implementation

### NON-INSTALLMENT ORDERS (Regular Orders)

#### 1. **CASH Payments**
- **Proof Location**: `payments` table
- **When**: Created immediately at POS
- **Status**: `verified` (auto-verified)
- **Notes**: "Initial payment at POS"

#### 2. **GCash Payments**
- **Proof Location**: `payments` table ONLY
- **When**: Created when user uploads proof via PaymentService
- **Status**: `needs_verification` (requires admin approval)
- **Field**: `payment_proof` (array of image paths)
- **NOT saved to**: `sales.payment_proof` (this is NULL for GCash)

#### 3. **PDO Payments**
- **Proof Location**: `payments` table
- **When**: Created at POS with check details
- **Status**: `pending` (requires admin approval)
- **Fields**: 
  - `pdo_check_number`
  - `pdo_check_bank`
  - `pdo_check_image` (array of check image paths)
- **NOT saved to**: `sales.payment_proof`

#### 4. **COD / Pay Later / Credit**
- **Proof Location**: None initially (no payment yet)
- **When paid**: Payment record created in `payments` table
- **NOT saved to**: `sales.payment_proof`

### INSTALLMENT ORDERS (Staggered Payments)

- **Proof Location**: `payments` table ONLY (each installment has its own payment record)
- **Each installment payment**: Separate Payment record with its own `payment_proof`
- **NOT saved to**: `sales.payment_proof` (explicitly set to NULL in SaleService.php line 82)

## Summary Table

| Payment Type | Installment? | Proof Saved To | Status |
|-------------|-------------|----------------|--------|
| Cash | No | `payments` table | verified |
| Cash | Yes | `payments` table (per installment) | verified |
| GCash | No | `payments` table | needs_verification |
| GCash | Yes | `payments` table (per installment) | needs_verification |
| PDO | No | `payments` table | pending |
| PDO | Yes | `payments` table (per installment) | pending |
| COD/Pay Later | No | `payments` table (when paid) | varies |
| COD/Pay Later | Yes | `payments` table (per installment) | varies |

## Key Points

1. **`sales.payment_proof` is DEPRECATED** for new orders
   - Only used for backward compatibility with old orders
   - New orders (both installment and non-installment) save to `payments` table

2. **All payment proofs go to `payments` table**
   - Each payment has its own proof
   - Supports multiple images per payment
   - Accessible via `payment_proof_urls` accessor

3. **Frontend Display Logic**
   - Non-installment: Check `sales.payment_proof` first (backward compatibility), then check `payments` array
   - Installment: Always use `payments` array (shows all installment payments with their proofs)

## Code References

### Backend
- `SaleService.php` line 82: Sets `payment_proof` to NULL for staggered orders
- `PaymentService.php` line 57-95: `recordGCashPayment()` saves proof to `payments` table
- `SaleResource.php` line 119-131: Includes `payments` array with `payment_proof_urls`

### Frontend
- `Orders.jsx` line 1547-1560: Shows `sales.payment_proof` for non-installment orders
- `Orders.jsx` line 1562-1620: Shows `payments` array for installment orders

## Recommendation

**For consistency, ALL orders (installment or not) should save payment proof to `payments` table.**

Currently:
- ✅ Installment orders: Always use `payments` table
- ⚠️ Non-installment orders: Mixed (some use `sales.payment_proof`, some use `payments` table)

**Proposed Fix**: Update frontend to ALWAYS check `payments` array first, then fall back to `sales.payment_proof` for backward compatibility.
