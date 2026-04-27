# POS Payment Method Enhancements

## Missing Features in POS

### 1. ❌ Credit Payment Method
Currently only has: Cash, GCash, COD, Pay Later
Missing: **Credit** (for account/credit customers)

### 2. ❌ Staggered/Installment Payment Toggle
No option to enable installment payments for orders

---

## Implementation Plan

### Phase 1: Add Credit Payment Method

**File:** `react_frontend/src/pages/shared/PointOfSale/PointOfSale.jsx`

1. Update `posPaymentMethods` array:
```javascript
const posPaymentMethods = [
  { value: 'cash', label: 'Cash', icon: DollarSign, color: '#22c55e' },
  { value: 'gcash', label: 'GCash', icon: Smartphone, color: '#3b82f6' },
  { value: 'credit', label: 'Credit', icon: CreditCard, color: '#8b5cf6' }, // NEW
  { value: 'cod', label: 'COD', icon: Banknote, color: '#f59e0b' },
  { value: 'pay_later', label: 'Pay Later', icon: Clock, color: '#6b7280' },
];
```

2. Add Credit payment UI in payment modal (similar to Pay Later)
3. Handle credit in `confirmPayment` function

### Phase 2: Add Staggered Payment Toggle

1. Add state for staggered payment:
```javascript
const [isStaggered, setIsStaggered] = useState(false);
const [installmentPlan, setInstallmentPlan] = useState(null);
```

2. Add toggle UI in payment modal (after payment method selection)
3. When enabled, show PaymentScheduleSetup component
4. Send installment data with order

---

## Detailed Changes Needed

### 1. Import CreditCard Icon
```javascript
import { ..., CreditCard } from 'lucide-react';
```

### 2. Import PaymentScheduleSetup Component
```javascript
import { PaymentScheduleSetup } from '../../../components/payments/PaymentScheduleSetup';
```

### 3. Add Credit to Payment Methods Array
```javascript
const posPaymentMethods = [
  { value: 'cash', label: 'Cash', icon: DollarSign, color: '#22c55e' },
  { value: 'gcash', label: 'GCash', icon: Smartphone, color: '#3b82f6' },
  { value: 'credit', label: 'Credit', icon: CreditCard, color: '#8b5cf6' },
  { value: 'cod', label: 'COD', icon: Banknote, color: '#f59e0b' },
  { value: 'pay_later', label: 'Pay Later', icon: Clock, color: '#6b7280' },
];
```

### 4. Add Staggered Payment State
```javascript
const [isStaggered, setIsStaggered] = useState(false);
const [installmentPlan, setInstallmentPlan] = useState(null);
```

### 5. Add Credit Payment UI in Payment Modal
After the Pay Later section, add:
```javascript
) : paymentMethod === 'credit' ? (
  <>
    {/* Credit Info */}
    <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4 text-center">
      <CreditCard size={32} className="mx-auto mb-2 text-purple-500" />
      <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-1">Credit Payment</p>
      <p className="text-xs text-purple-600 dark:text-purple-400">
        Order will be charged to customer's credit account. Payment will be tracked separately.
      </p>
    </div>
  </>
) : (
```

### 6. Add Staggered Payment Toggle
After payment method selection, before the payment-specific UI:
```javascript
{/* Staggered Payment Toggle - only for credit and pay_later */}
{(paymentMethod === 'credit' || paymentMethod === 'pay_later') && (
  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isStaggered}
        onChange={(e) => {
          setIsStaggered(e.target.checked);
          if (!e.target.checked) setInstallmentPlan(null);
        }}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        Enable Installment Payment
      </span>
    </label>
    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
      Allow customer to pay in multiple installments
    </p>
  </div>
)}

{/* Payment Schedule Setup - shown when staggered is enabled */}
{isStaggered && (
  <div className="mb-4">
    <PaymentScheduleSetup
      totalAmount={total}
      onScheduleChange={setInstallmentPlan}
    />
  </div>
)}
```

### 7. Update confirmPayment Function
Add credit handling and installment data:
```javascript
const confirmPayment = async () => {
  if (saving) return;
  
  // Validation
  if (paymentMethod === 'cash') {
    const tendered = parseFloat(cashTendered);
    if (isNaN(tendered) || tendered < total) return;
  } else if (paymentMethod === 'gcash') {
    if (!gcashReference.trim() || gcashReference.replace(/\s/g, '').length !== 13) return;
    if (gcashProofFiles.length === 0) return;
    if (gcashRefError) return;
  } else if (paymentMethod === 'credit') {
    // Credit requires a customer to be selected
    if (!selectedCustomerId && !newCustomerName) {
      toast.error('Customer Required', 'Please select or add a customer for credit payments');
      return;
    }
  }
  
  // Validate installment plan if staggered
  if (isStaggered && !installmentPlan) {
    toast.error('Installment Plan Required', 'Please set up the payment schedule');
    return;
  }

  setSaving(true);
  try {
    let response;

    if (paymentMethod === 'gcash' && gcashProofFiles.length > 0) {
      // ... existing FormData code ...
    } else {
      const payload = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
        new_customer_name: newCustomerName || null,
        new_customer_contact: newCustomerContact || null,
        new_customer_email: newCustomerEmail || null,
        new_customer_address: newCustomerAddress || null,
        new_customer_landmark: newCustomerLandmark || null,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : 
                        (paymentMethod === 'cod' || paymentMethod === 'pay_later' || paymentMethod === 'credit' ? 0 : total),
        reference_number: paymentMethod === 'gcash' ? gcashReference : null,
        delivery_fee: forDelivery ? deliveryFee : 0,
        distance_km: forDelivery && distanceKm ? parseFloat(distanceKm) : null,
        delivery_address: forDelivery ? deliveryAddress : null,
        // NEW: Staggered payment data
        is_staggered: isStaggered,
        installments: isStaggered ? installmentPlan : null,
      };
      response = await apiClient.post('/sales/order', payload);
    }
    
    // ... rest of success handling ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setSaving(false);
  }
};
```

### 8. Reset Staggered State After Order
In the success handler, add:
```javascript
setIsStaggered(false);
setInstallmentPlan(null);
```

---

## Backend Support

The backend already supports:
- ✅ `payment_method` field accepts 'credit'
- ✅ `is_staggered` boolean field
- ✅ `installments` array for payment schedule
- ✅ `/sales/order` endpoint handles staggered payments

No backend changes needed!

---

## UI/UX Considerations

### Payment Method Grid
Currently 2x2 grid (4 methods). With Credit added:
- Option 1: 3x2 grid (6 slots, 5 filled) - unbalanced
- Option 2: 2x3 grid (6 slots, 5 filled) - better
- **Recommended**: 2x3 grid with responsive breakpoints

### Staggered Payment Toggle
- Only show for `credit` and `pay_later` methods
- Disabled for `cash`, `gcash`, `cod` (immediate payment)
- Clear visual indication when enabled
- Validation: ensure schedule is set before confirming

### Credit Payment Requirements
- Must have customer selected (can't be walk-in)
- Show warning if no customer selected
- Automatically mark as `not_paid` status

---

## Testing Checklist

### Credit Payment Method:
- [ ] Credit button appears in payment methods
- [ ] Credit selection shows appropriate UI
- [ ] Credit requires customer selection
- [ ] Credit order creates successfully
- [ ] Credit order marked as `not_paid`
- [ ] Receipt shows "Credit" payment method

### Staggered Payment:
- [ ] Toggle appears for credit/pay_later only
- [ ] Toggle hidden for cash/gcash/cod
- [ ] PaymentScheduleSetup component loads
- [ ] Schedule validation works
- [ ] Order with installments creates successfully
- [ ] Installments saved to database
- [ ] Payment Plans tab shows new plan

### Integration:
- [ ] Works with delivery orders
- [ ] Works with pick-up orders
- [ ] Works with new customers
- [ ] Works with existing customers
- [ ] Receipt prints correctly
- [ ] Order appears in Orders page
- [ ] Payment tracking works

---

## Files to Modify

1. `react_frontend/src/pages/shared/PointOfSale/PointOfSale.jsx`
   - Add Credit payment method
   - Add staggered payment toggle
   - Add PaymentScheduleSetup integration
   - Update confirmPayment logic

---

## Summary

This enhancement adds:
1. ✅ **Credit** payment method (5th option)
2. ✅ **Staggered/Installment** payment toggle
3. ✅ Integration with existing PaymentScheduleSetup component
4. ✅ Full backend compatibility (no API changes needed)

**Result**: Complete payment flexibility in POS matching the payment system design!
