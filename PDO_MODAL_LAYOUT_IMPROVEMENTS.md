# PDO Modal Layout Improvements

## Changes Made

### 1. Two-Column Layout for PDO Payment Modal
**Problem**: The PDO payment modal was crowded with all content in a single column, making it difficult to see the order summary and form fields when uploading check images.

**Solution**: Restructured the PDO modal to use a two-column layout:
- **Left Column (320px fixed width)**: Order Summary
  - Items count
  - Subtotal
  - Shipping fee breakdown (if delivery)
  - Total due
- **Right Column (flexible width)**: PDO Form
  - Check image upload
  - Check number
  - Bank name
  - Check amount
  - Info box

### 2. Increased Modal Width
**Change**: Increased max-width from `max-w-3xl` to `max-w-5xl` for PDO payment method only.

**Benefit**: More horizontal space for the two-column layout, making the form less cramped.

### 3. Visual Improvements
- Changed PDO form labels from amber to purple to match the PDO theme
- Changed border colors from amber to purple for consistency
- Improved spacing between form fields
- Made the order summary sticky on the left side

### 4. Better Organization
- Order summary is always visible on the left
- Form fields are organized vertically on the right
- Check image preview grid has more space to display uploaded images
- Info box is at the bottom of the form for easy reference

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     PDO Payment Header                       │
│                  (Purple gradient background)                │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                       │
│   Order Summary      │         PDO Form                      │
│   (Left Column)      │         (Right Column)                │
│                      │                                       │
│   • Items: 5 items   │   Check Image *                       │
│   • Subtotal: ₱1,400 │   [Upload] [Camera]                   │
│   • Shipping: ₱171   │                                       │
│     - Sack fee       │   Check Number *                      │
│     - Distance fee   │   [Input field]                       │
│   • Total: ₱1,571    │                                       │
│                      │   Bank Name *                         │
│                      │   [Input field]                       │
│                      │                                       │
│                      │   Check Amount *                      │
│                      │   [Input field]                       │
│                      │                                       │
│                      │   [Info Box]                          │
│                      │                                       │
├──────────────────────┴──────────────────────────────────────┤
│                    [Back] [Place Order]                      │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

1. **Less Crowded**: Order summary is separated from the form, reducing visual clutter
2. **Better Context**: Users can always see the total amount while filling in check details
3. **More Space for Images**: Check image preview grid has more horizontal space
4. **Improved UX**: Clear separation between read-only info (left) and input fields (right)
5. **Consistent Theme**: Purple color scheme throughout PDO modal

## Files Modified

- `react_frontend/src/pages/shared/PointOfSale/PointOfSale.jsx`
  - Restructured PDO modal to use two-column layout
  - Increased modal width to max-w-5xl for PDO
  - Changed color scheme from amber to purple
  - Removed duplicate PDO form section

## Testing Checklist

- [ ] PDO modal opens with two-column layout
- [ ] Order summary is visible on the left
- [ ] PDO form is on the right with proper spacing
- [ ] Check image upload works and previews display correctly
- [ ] Modal is scrollable if content exceeds viewport height
- [ ] All form fields are accessible and functional
- [ ] Place Order button is enabled when all required fields are filled
- [ ] Layout is responsive and doesn't break on smaller screens
