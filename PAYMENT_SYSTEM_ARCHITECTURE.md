# Payment System Architecture Explanation

## Overview
Your system has **THREE separate payment modules** that serve different business purposes. They are designed to handle distinct payment workflows and are not combined because they track different aspects of the payment lifecycle.

---

## The Three Payment Modules

### 1. **Payment Transactions** (Individual Payments)
**Purpose**: Track individual payment events/records

**Location**: `Payments Management → Payment Transactions Tab`

**What it manages**:
- Individual payment records (one record per payment attempt)
- GCash payment verifications
- Standalone PDO payments (from POS)
- Cash payments
- Payment proof verification

**Key Features**:
- Each row = ONE payment record
- Status tracking: `pending`, `needs_verification`, `verified`, `on_hold`, `cancelled`
- Action buttons: Verify, Hold, Reject
- Shows payment proof images
- Tracks reference numbers (GCash)

**Example Scenario**:
```
Customer pays ₱5,000 via GCash
→ Creates 1 Payment Transaction record
→ Status: needs_verification
→ Admin verifies → Status: verified
```

---

### 2. **Payment Plans** (Staggered Payments / Installments)
**Purpose**: Manage installment payment schedules for orders

**Location**: `Payments Management → Payment Plans Tab`

**What it manages**:
- Orders with scheduled installment payments
- Payment schedules (multiple installments per order)
- Total order tracking with partial payments
- Balance remaining across installments
- Due dates and overdue installments

**Key Features**:
- Each row = ONE order with a payment plan
- Shows: Total amount, Amount paid, Balance remaining
- Expandable to see individual installments
- Installment status: `pending`, `paid`, `overdue`, `verified`
- Due date tracking with badges (Overdue, Due Today, Due Soon)

**Example Scenario**:
```
Order total: ₱10,000
Payment Plan: 4 installments of ₱2,500 each
→ Creates 1 Payment Plan (the order)
→ Creates 4 Installment records

Progress tracking:
- Installment 1: ✅ Paid (₱2,500)
- Installment 2: ✅ Paid (₱2,500)
- Installment 3: ⏳ Pending (₱2,500) - Due in 3 days
- Installment 4: ⏳ Pending (₱2,500) - Due in 30 days

Balance remaining: ₱5,000
```

---

### 3. **PDO Management** (Post-Dated Check Management)
**Purpose**: Manage post-dated checks specifically (approval workflow)

**Location**: `Payments Management → PDO Management Tab`

**What it manages**:
- PDO (Post-Dated Check) approval workflow
- Check images and details verification
- Two-stage process: Approval → Payment Clearance
- Both standalone PDO payments AND installment PDOs

**Key Features**:
- **Section 1: Pending Approval**
  - PDO checks awaiting admin approval
  - Shows check images, bank details, check number
  - Actions: Approve, Reject
  - Validates check is legitimate before accepting

- **Section 2: Approved - Awaiting Payment**
  - PDO checks already approved, waiting to clear
  - Waiting for check date to arrive
  - Actions: Mark as Paid (when check clears)

**Example Scenario**:
```
Customer submits PDO check for ₱15,000
Check Date: May 15, 2026
Check Number: 12345678
Bank: BDO

STAGE 1: Pending Approval
→ Admin reviews check image
→ Verifies check details are valid
→ Approves check

STAGE 2: Awaiting Payment
→ Check appears in "Awaiting Payment" section
→ On May 15, 2026 (or when bank confirms)
→ Admin marks as "Paid"
→ Moves to verified payments
```

---

## Why They Are Separate (Not Combined)

### **Reason 1: Different Business Workflows**

| Module | Workflow Type | Action Required |
|--------|---------------|-----------------|
| **Payment Transactions** | Immediate verification | Verify payment proof exists and is valid |
| **Payment Plans** | Long-term tracking | Monitor schedule, track balances, manage due dates |
| **PDO Management** | Two-stage approval | 1) Approve check validity, 2) Confirm check cleared |

### **Reason 2: Different Data Granularity**

- **Transactions**: Payment-level detail (one payment = one record)
- **Plans**: Order-level detail (one order = many installments)
- **PDO**: Check-level detail (check approval + clearance workflow)

### **Reason 3: Different User Actions**

**Payment Transactions**:
- ✅ Verify
- ⏸️ Hold (for review)
- ❌ Reject

**Payment Plans**:
- 📅 View Schedule
- 💰 Record Payment (for an installment)
- ✅ Approve Plan (if requires approval)

**PDO Management**:
- ✅ Approve Check (Stage 1)
- ❌ Reject Check (Stage 1)
- 💵 Mark as Paid (Stage 2)

### **Reason 4: Different Statuses**

**Payment Transactions Statuses**:
- `pending` - Submitted, awaiting review
- `needs_verification` - Requires proof verification
- `verified` - Confirmed and accepted
- `on_hold` - Flagged for review
- `cancelled` - Rejected/invalid

**Payment Plan Statuses**:
- `not_paid` - No payments made yet
- `partial` - Some installments paid
- `paid` - Fully paid
- Individual Installment: `pending`, `paid`, `overdue`, `verified`

**PDO Approval Statuses**:
- `pending` - Awaiting admin approval (Stage 1)
- `approved` - Check accepted, awaiting clearance (Stage 2)
- `verified` - Check cleared and payment complete
- `rejected` - Check rejected/invalid

---

## How They Work Together

### Example: Customer Orders ₱20,000 with 4 Installments, Pays First Installment via GCash

**Step 1: Create Order**
- Order placed via POS
- Payment method: Staggered Payment (4 installments)
- First payment: ₱5,000 via GCash

**Step 2: Payment Plan Created**
```
Payment Plans Tab:
Order #ORD-001
Total: ₱20,000
Paid: ₱0
Balance: ₱20,000
Installments:
  1. ₱5,000 - Due May 1 (Today) - Status: pending
  2. ₱5,000 - Due May 8 - Status: pending
  3. ₱5,000 - Due May 15 - Status: pending
  4. ₱5,000 - Due May 22 - Status: pending
```

**Step 3: First Payment Made (GCash)**
```
Payment Transactions Tab:
Payment #5 - Created
Order: ORD-001
Amount: ₱5,000
Method: GCash
Reference: 1234567890123
Status: needs_verification
[Proof image attached]

ACTION NEEDED: Admin must verify this payment
```

**Step 4: Admin Verifies GCash Payment**
```
Payment Transactions Tab:
✅ Admin clicks "Verify" button
→ Payment #5 status changes to "verified"
→ System automatically updates Payment Plan:

Payment Plans Tab:
Order #ORD-001
Total: ₱20,000
Paid: ₱5,000  ← Updated
Balance: ₱15,000  ← Updated
Installments:
  1. ₱5,000 - Paid ✅ - Status: verified  ← Updated
  2. ₱5,000 - Due May 8 - Status: pending
  3. ₱5,000 - Due May 15 - Status: pending
  4. ₱5,000 - Due May 22 - Status: pending
```

**Step 5: Second Payment via PDO Check**
```
Customer submits PDO check for Installment 2
Check Amount: ₱5,000
Check Date: May 10, 2026
Check Number: 87654321
Bank: BPI

PDO Management Tab → Pending Approval:
Order: ORD-001
Installment: 2/4
Amount: ₱5,000
Check: 87654321 (BPI)
Date: May 10, 2026
[Check image attached]

ACTION NEEDED: Admin must approve this check
```

**Step 6: Admin Approves PDO Check**
```
PDO Management Tab → Approved - Awaiting Payment:
Order: ORD-001
Installment: 2/4
Amount: ₱5,000
Check: 87654321 (BPI)
Date: May 10, 2026
Status: Approved, awaiting clearance

Payment Plans Tab:
Installment 2 status: awaiting_payment
```

**Step 7: On May 10, Check Clears**
```
PDO Management Tab:
✅ Admin clicks "Mark as Paid"
→ PDO removed from Awaiting Payment
→ Creates verified payment record

Payment Transactions Tab:
Payment #12 - Created (Auto-generated from PDO)
Order: ORD-001
Amount: ₱5,000
Method: PDO
Status: verified
Check: 87654321

Payment Plans Tab:
Order #ORD-001
Total: ₱20,000
Paid: ₱10,000  ← Updated
Balance: ₱10,000  ← Updated
Installments:
  1. ₱5,000 - Paid ✅ - Status: verified
  2. ₱5,000 - Paid ✅ - Status: verified  ← Updated
  3. ₱5,000 - Due May 15 - Status: pending
  4. ₱5,000 - Due May 22 - Status: pending
```

---

## Why PDO Payments Appear in Two Places

### **PDO Management Tab** (Primary)
- **Purpose**: Check approval workflow
- **Shows**: PDO checks needing approval or awaiting clearance
- **Focus**: Check validation and approval process

### **Payment Transactions Tab** (Secondary)
- **Purpose**: All payment records
- **Shows**: All verified PDO payments (after approval)
- **Focus**: Historical payment records

**Flow**:
```
PDO Submitted
  ↓
PDO Management: Pending Approval
  ↓ (Admin approves)
PDO Management: Awaiting Payment
  ↓ (Check clears)
Payment Transactions: Verified Payment Record
```

---

## Database Architecture

### Tables Involved

1. **`payments`** table
   - Stores individual payment records
   - One row per payment attempt
   - Used by: Payment Transactions Tab

2. **`sales`** table
   - Stores order information
   - Tracks: total, amount_paid, balance_remaining
   - Used by: Payment Plans Tab (for order totals)

3. **`payment_installments`** table
   - Stores installment schedules
   - One row per installment
   - Linked to: sales table (sale_id)
   - Used by: Payment Plans Tab, PDO Management Tab

**Relationships**:
```
sales (1) ←→ (many) payments
sales (1) ←→ (many) payment_installments
payment_installments (1) ←→ (1) payments [optional link]
```

---

## Summary: When to Use Each Module

### Use **Payment Transactions** when:
- ✅ Verifying individual GCash payments
- ✅ Reviewing payment proof images
- ✅ Holding/rejecting suspicious payments
- ✅ Viewing all payment history
- ✅ Checking payment reference numbers

### Use **Payment Plans** when:
- ✅ Viewing orders with installment schedules
- ✅ Tracking payment progress (total paid vs balance)
- ✅ Finding overdue installments
- ✅ Recording payments for specific installments
- ✅ Approving payment plan proposals

### Use **PDO Management** when:
- ✅ Approving post-dated checks
- ✅ Reviewing check images and bank details
- ✅ Managing checks awaiting clearance
- ✅ Marking checks as paid when they clear
- ✅ Rejecting invalid/fraudulent checks

---

## Why They Can't Be Combined

If you merged all three modules into one:

### **Problems with Combined View**:
1. **Cluttered Interface**: Too much information in one table
2. **Conflicting Actions**: Different workflows need different buttons
3. **Status Confusion**: 15+ different status types in one dropdown
4. **Performance**: Loading all data at once is slow
5. **User Confusion**: Mixing payment records, plans, and checks is hard to navigate

### **Current Separation Benefits**:
- ✅ Each module has a focused purpose
- ✅ Clean, task-specific interfaces
- ✅ Faster loading (queries only what's needed)
- ✅ Clear workflows for different payment types
- ✅ Easy to train staff on specific tasks

---

## Architectural Decision

The three-module design follows the **Separation of Concerns** principle:
- **Payment Transactions**: Handle verification of individual payments
- **Payment Plans**: Handle scheduling and balance tracking
- **PDO Management**: Handle check approval workflow

This is similar to how accounting systems separate:
- **Accounts Receivable** (tracking what's owed)
- **Payment Receipts** (recording what was paid)
- **Bank Reconciliation** (matching payments to bank statements)

---

## Fix Applied to Payment Verification

### Issue
- **Error**: `POST /api/payments/5/verify` returned 400 (Bad Request)
- **Cause**: Backend only allowed 'needs_verification' or 'on_hold' statuses, but PDO payments have 'pending' status

### Solution
**Backend Fix** (`PaymentService.php`):
```php
// OLD (INCORRECT)
if ($payment->status !== 'needs_verification' && $payment->status !== 'on_hold') {
    throw new \Exception('Payment cannot be verified');
}

// NEW (FIXED)
if (!in_array($payment->status, ['needs_verification', 'on_hold', 'pending'])) {
    throw new \Exception('Payment cannot be verified. Current status: ' . $payment->status);
}

// Also added: Auto-approve PDO when verified
if ($payment->payment_method === 'pdo') {
    $updateData['pdo_approval_status'] = 'approved';
}
```

### What Was Fixed
1. ✅ Allow `pending` status for verification (PDO payments)
2. ✅ Auto-approve PDO when verifying
3. ✅ Update linked installments properly
4. ✅ Better error messages

### Testing
Try verifying a PDO payment in Payment Transactions tab - should now work without 400 error.

---

## Files Modified

**Backend**:
- `laravel_backend/app/Services/PaymentService.php` - Fixed verifyPayment() method

**Documentation**:
- `PAYMENT_SYSTEM_ARCHITECTURE.md` - Created this comprehensive guide

---

## Quick Reference

| Need to... | Go to... | Action |
|-----------|----------|--------|
| Verify GCash payment | Payment Transactions | Click ✅ Verify |
| Check order payment progress | Payment Plans | Find order, view installments |
| Approve a PDO check | PDO Management → Pending | Click ✅ Approve |
| Mark PDO as cleared | PDO Management → Awaiting | Click 💵 Mark as Paid |
| Hold suspicious payment | Payment Transactions | Click ⏸️ Hold |
| Reject invalid payment | Payment Transactions | Click ❌ Reject |
| Find overdue installments | Payment Plans | Look for 🔴 Overdue badge |
| Record installment payment | Payment Plans | Click "Pay" on installment |
| View all payment history | Payment Transactions | Browse all records |
| See PDO check images | PDO Management | Double-click PDO record |
