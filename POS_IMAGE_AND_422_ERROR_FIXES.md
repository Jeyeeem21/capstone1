# POS Image Storage & 422 Error Fixes

## Issues Reported
1. **Image storage link not working**: Photos uploaded in POS not displaying properly
2. **422 Unprocessable Content Error**: Order submission failing with validation error

---

## Fixes Applied

### 1. Storage Directory Created ✅
**Problem**: The `payment_proofs` directory didn't exist in `storage/app/public/`

**Solution**: Created the missing directory
```powershell
# Created directories:
- storage/app/public/payment_proofs
- storage/app/public/pdo_checks (already existed)
```

**Verification**:
- Storage symlink exists: `public/storage` → `storage/app/public`
- Upload directories are now ready

---

### 2. Enhanced Error Handling in Shop.jsx ✅
**Problem**: 422 validation errors weren't being displayed to the user

**Solution**: Updated error handling in `confirmPayment()` function

**Changes Made**:
```javascript
// Added console logging for debugging
console.log('Submitting order with:');
console.log('- Payment method:', paymentMethod);
console.log('- Items:', currentOrder.length);
console.log('- Amount tendered:', paymentMethod === 'pay_later' ? 0 : orderTotal);
console.log('- For delivery:', forDelivery);

// Enhanced error display
if (err?.response?.status === 422 && err?.response?.data?.errors) {
  const errors = err.response.data.errors;
  const errorMessages = Object.values(errors).flat();
  errorMessages.forEach(msg => toast.error(msg));
} else {
  const msg = err?.response?.data?.message || err?.message || 'Failed to place order';
  toast.error(msg);
}
```

**Benefits**:
- Console logs now show exactly what data is being sent
- Validation errors from backend are displayed as toast notifications
- Full error object logged to console for debugging

---

## Debugging Instructions

### To See the Actual 422 Error:

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab** to see the new debug logs
3. **Go to Network tab**
4. **Try placing an order** with GCash payment
5. **Look for the failed request** to `/api/sales/order`
6. **Click on it** and check the **Response tab**

The response will show the exact validation errors, for example:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "items.0.product_id": ["The items.0.product_id field is required."],
    "payment_proof.0": ["The payment proof.0 must be an image."]
  }
}
```

---

## Common 422 Error Causes

### Validation Rules (Backend)
```php
'items' => 'required|array|min:1',
'items.*.product_id' => 'required|integer|exists:products,product_id',
'items.*.quantity' => 'required|integer|min:1',
'items.*.unit_price' => 'required|numeric|min:0.01',
'payment_method' => 'nullable|string|in:cash,gcash,cod,pay_later,pdo',
'payment_proof' => 'nullable|array',
'payment_proof.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
'reference_number' => 'nullable|string',
'amount_tendered' => 'nullable|numeric|min:0',
```

### Potential Issues:
1. **Product ID mismatch**: Check if `item.id` matches `product_id` in database
2. **File upload validation**: Ensure files are valid images under 5MB
3. **Missing required fields**: Items array might be malformed
4. **Payment method validation**: Must be one of: cash, gcash, cod, pay_later, pdo

---

## Testing Checklist

### Test Image Upload & Display
- [ ] Upload payment proof image in Shop (customer)
- [ ] Check console for upload confirmation
- [ ] Submit order successfully
- [ ] Verify image displays in Orders page
- [ ] Check actual file exists in `storage/app/public/payment_proofs/`
- [ ] Verify URL format: `http://127.0.0.1:8000/storage/payment_proofs/filename.jpg`

### Test GCash Payment (Customer)
- [ ] Add products to cart
- [ ] Click "Proceed to Payment"
- [ ] Select GCash method
- [ ] Enter 13-digit reference number
- [ ] Upload payment proof screenshot
- [ ] Check console logs before submission
- [ ] Click "Place Order"
- [ ] **If 422 error**: Check Console and Network tabs for exact error
- [ ] **If success**: Verify order appears in "My Orders"

### Test Other Payment Methods
- [ ] Pay Later (no proof required)
- [ ] Cash (admin/secretary only)
- [ ] COD (admin/secretary only)
- [ ] PDO (admin/secretary only)

---

## Image URL Format

### Storage Path in Database
```
payment_proofs/abc123xyz.jpg
```

### Public URL
```
http://127.0.0.1:8000/storage/payment_proofs/abc123xyz.jpg
```

### Symlink Structure
```
public/storage → ../storage/app/public
```

### Full Filesystem Path
```
C:\laragon\www\New folder\capstone 2\capstone1\laravel_backend\storage\app\public\payment_proofs\abc123xyz.jpg
```

---

## Next Steps

1. **Test the order submission** with the enhanced logging
2. **Check browser console** for debug logs
3. **Check Network tab** for the 422 response details
4. **Share the exact validation error messages** if it still fails
5. **Verify image upload** by checking the file exists in storage directory

---

## Files Modified

### Frontend
- `react_frontend/src/pages/customer/Shop/Shop.jsx`
  - Lines ~430-455: Enhanced error handling and debug logging

### Backend (Storage)
- Created: `storage/app/public/payment_proofs/` directory
- Existing: `storage/app/public/pdo_checks/` directory
- Symlink: `public/storage` → `storage/app/public` (verified exists)

---

## Additional Notes

### Storage Symlink
- Already exists and points to correct location
- No need to run `php artisan storage:link` again

### File Permissions
- Windows (Laragon): No permission issues expected
- Linux/Mac: May need `chmod -R 775 storage` and `chown -R www-data:www-data storage`

### Image Preview in Modal
- Uses FileReader API to create data URLs
- Preview should show immediately after file selection
- If "Proof 1" alt text shows instead of image, check if FileReader is working
- Console should log file details when files are selected

---

## Quick Debug Commands

### Check Storage Structure
```powershell
cd "c:\laragon\www\New folder\capstone 2\capstone1\laravel_backend"
Get-ChildItem storage\app\public -Recurse -Directory | Select-Object FullName
```

### Check Uploaded Files
```powershell
Get-ChildItem storage\app\public\payment_proofs -File | Select-Object Name, Length, LastWriteTime
```

### Check Symlink
```powershell
Get-Item public\storage | Select-Object Target, LinkType
```

### Clear Laravel Cache (if needed)
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```
