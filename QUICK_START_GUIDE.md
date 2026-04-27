# Payment System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Run Migrations
```bash
cd laravel_backend
php artisan migrate
```

### Step 2: Start Servers
```bash
# Terminal 1 - Backend
cd laravel_backend
php artisan serve

# Terminal 2 - Frontend
cd react_frontend
npm run dev
```

### Step 3: Access Payment Features
- Login as Admin or Super Admin
- Navigate to "Payments" in the sidebar
- You'll see 3 tabs:
  - Payment Transactions
  - Payment Plans
  - PDO Management

---

## 📱 Quick Feature Overview

### For Secretaries (POS)
1. Create order as usual
2. Choose payment method:
   - **Cash**: Instant payment
   - **GCash**: Upload proof → Admin verifies
   - **PDO**: Upload check → Admin approves
   - **Credit**: Pay later
3. Optional: Enable "Staggered Payment" for installments

### For Admins (Payment Management)
1. **Payment Transactions Tab**
   - View all payments
   - Verify GCash payments
   - Hold suspicious payments
   - Cancel fraudulent payments

2. **Payment Plans Tab**
   - View staggered payment plans
   - Approve plans ≥ ₱50k or with PDO
   - Track installment progress

3. **PDO Tab**
   - Approve/reject post-dated checks
   - Mark checks as paid when cleared

---

## 🎯 Common Tasks

### Record a Cash Payment
```javascript
// In POS or anywhere
import { paymentsApi } from '@/api';

const response = await paymentsApi.recordPayment(saleId, {
  payment_method: 'cash',
  amount: 1000
});
```

### Record a GCash Payment
```javascript
import { paymentsApi } from '@/api';

const response = await paymentsApi.recordPayment(saleId, {
  payment_method: 'gcash',
  amount: 1000,
  reference_number: 'GC123456789',
  proof_image: base64Image // from file upload
});
```

### Create Staggered Payment
```javascript
import { paymentPlansApi } from '@/api';

const response = await paymentPlansApi.createSchedule(saleId, {
  installments: [
    {
      installment_number: 1,
      amount: 500,
      payment_method: 'cash',
      pay_now: true
    },
    {
      installment_number: 2,
      amount: 500,
      payment_method: 'gcash',
      due_date: '2026-05-01',
      pay_now: false
    }
  ]
});
```

### Verify a Payment
```javascript
import { paymentsApi } from '@/api';

const response = await paymentsApi.verifyPayment(paymentId, 'Verified - proof looks good');
```

### Approve a PDO
```javascript
import { installmentsApi } from '@/api';

const response = await installmentsApi.approvePDO(installmentId, 'Check approved');
```

---

## 🎨 Using Payment Components

### Payment Schedule Setup
```jsx
import { PaymentScheduleSetup } from '@/components/payments';

<PaymentScheduleSetup
  orderTotal={1000}
  onSave={(installments) => {
    // Handle save
    console.log(installments);
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>
```

### GCash Payment Modal
```jsx
import { GCashPaymentModal } from '@/components/payments';

<GCashPaymentModal
  amount={1000}
  onSubmit={(paymentData) => {
    // paymentData includes: payment_method, amount, reference_number, proof_image
    await paymentsApi.recordPayment(saleId, paymentData);
  }}
  onCancel={() => setShowModal(false)}
/>
```

### Record Payment Modal
```jsx
import { RecordPaymentModal } from '@/components/payments';

<RecordPaymentModal
  saleId={123}
  balanceRemaining={500}
  customerName="John Doe"
  onSubmit={(paymentData) => {
    // Handle payment recording
  }}
  onCancel={() => setShowModal(false)}
/>
```

### Payment Verification Modal
```jsx
import { PaymentVerificationModal } from '@/components/payments';

<PaymentVerificationModal
  payment={paymentObject}
  onVerify={(paymentId, notes) => {
    await paymentsApi.verifyPayment(paymentId, notes);
  }}
  onHold={(paymentId, notes) => {
    await paymentsApi.holdPayment(paymentId, notes);
  }}
  onCancel={(paymentId, notes) => {
    await paymentsApi.cancelPayment(paymentId, notes);
  }}
  onClose={() => setShowModal(false)}
/>
```

---

## 📊 Payment Status Flow

### Cash
```
Created → Verified ✅
```

### GCash
```
Created → Pending Verification → Verified ✅
                               → On Hold ⚠️
                               → Cancelled ❌
```

### PDO
```
Created → Pending Approval → Approved → Awaiting Payment → Paid ✅
                          → Rejected ❌
```

### Credit
```
Created → Verified ✅ (added to customer balance)
```

---

## 🔍 API Endpoints Quick Reference

### Payments
- `GET /api/payments` - List all payments
- `GET /api/payments/{id}` - Get payment details
- `POST /api/sales/{id}/payment` - Record payment
- `GET /api/sales/{id}/payments` - Payment history
- `POST /api/payments/{id}/verify` - Verify payment
- `POST /api/payments/{id}/hold` - Hold payment
- `POST /api/payments/{id}/cancel` - Cancel payment

### Payment Plans
- `GET /api/payment-plans` - List all plans
- `GET /api/payment-plans/{id}` - Get plan details
- `POST /api/sales/{id}/payment-schedule` - Create schedule
- `POST /api/payment-plans/{id}/approve` - Approve plan

### Installments
- `GET /api/installments/{id}` - Get installment
- `POST /api/installments/{id}/pay` - Pay installment
- `POST /api/installments/{id}/approve-pdo` - Approve PDO
- `POST /api/installments/{id}/reject-pdo` - Reject PDO
- `POST /api/installments/{id}/mark-pdo-paid` - Mark PDO paid
- `GET /api/installments/pending-pdo` - Pending PDOs
- `GET /api/installments/awaiting-payment` - Awaiting payment

### Customer Balances
- `GET /api/customers/{id}/balances` - Get customer balances

---

## 🎨 Color Coding

- **Green**: Cash payments
- **Blue**: GCash payments
- **Amber**: PDO payments
- **Purple**: Credit payments

---

## ⚡ Pro Tips

1. **Auto-Approval**: Orders < ₱50k without PDO are auto-approved
2. **Manual Approval**: Orders ≥ ₱50k or with PDO need admin approval
3. **Image Upload**: Max 5MB, supports PNG, JPG
4. **Full-Screen View**: Click on proof/check images to view full size
5. **Quick Filters**: Use status and method filters in admin pages
6. **Real-Time Stats**: Dashboard shows pending items at a glance

---

## 🐛 Troubleshooting

### Migration Fails
```bash
# Clear cache and retry
php artisan config:clear
php artisan cache:clear
php artisan migrate
```

### API Not Working
- Check `.env` file has correct database credentials
- Ensure backend server is running on correct port
- Check CORS settings if frontend can't reach backend

### Components Not Showing
- Ensure all imports are correct
- Check browser console for errors
- Verify routes are added to App.jsx

---

## 📚 Documentation Files

- `PAYMENT_SYSTEM_COMPLETE.md` - Complete feature overview
- `TEST_PAYMENT_SYSTEM.md` - API testing guide
- `IMPLEMENTATION_COMPLETE_SUMMARY.md` - Implementation details
- `QUICK_START_GUIDE.md` - This file

---

## ✅ Checklist for First Use

- [ ] Run migrations
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Login as admin
- [ ] Navigate to Payments page
- [ ] Create test order with Cash
- [ ] Create test order with GCash
- [ ] Verify GCash payment as admin
- [ ] Create staggered payment plan
- [ ] Approve payment plan as admin

---

**You're all set!** 🎉

For detailed information, see `PAYMENT_SYSTEM_COMPLETE.md`
