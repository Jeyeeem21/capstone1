# Implementation Plan: Customer Installment Payment Portal

## Overview

This implementation plan creates a customer-facing portal for viewing orders with installment payment plans and submitting payments (GCash and PDO) for pending installments. The feature integrates with the existing simplified payment system, reusing PaymentService, StaggeredPaymentService, and admin verification workflows. No database changes are required.

The implementation follows a backend-first approach, building API endpoints and services before creating frontend components. Each task includes specific requirements references for traceability.

## Tasks

- [x] 1. Create backend API infrastructure
  - [x] 1.1 Create CustomerPaymentController with authorization middleware
    - Create `app/Http/Controllers/CustomerPaymentController.php`
    - Add `auth:sanctum` and `role:customer` middleware
    - Implement ownership validation helper method `validateInstallmentOwnership()`
    - _Requirements: 2.1, 2.2, 11.1, 11.2_

  - [x] 1.2 Create Form Request classes for payment submissions
    - Create `app/Http/Requests/SubmitGCashPaymentRequest.php` with validation rules
    - Create `app/Http/Requests/SubmitPDOPaymentRequest.php` with validation rules
    - Implement base64 image validation in both request classes
    - Implement amount matching validation (must match installment.amount_expected)
    - Implement installment status validation (must be pending, not already paid)
    - _Requirements: 3.3, 4.2, 4.3, 5.1, 5.2, 11.4_

  - [x] 1.3 Create API Resource classes for customer responses
    - Create `app/Http/Resources/CustomerOrderResource.php` with order data transformation
    - Create `app/Http/Resources/CustomerPaymentInstallmentResource.php` with installment data
    - Add helper methods: `getNextDueDate()`, `getNextDueAmount()`, `canCustomerPay()`
    - _Requirements: 1.2, 1.3, 1.4, 14.1, 14.2, 14.3, 14.4_

  - [ ]* 1.4 Write property test for API Resource completeness
    - **Property 2: Order Data Completeness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Verify CustomerOrderResource includes all required fields (total, payment plan, balance, installments)

- [ ] 2. Implement customer order viewing endpoints
  - [ ] 2.1 Implement getOrders() method in CustomerPaymentController
    - Query sales by authenticated customer's customer_id
    - Support filtering by payment_status (paid, partial, not_paid)
    - Implement pagination (default 10 per page)
    - Eager load installments and payments to avoid N+1 queries
    - Return CustomerOrderResource collection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Implement getOrderDetails() method in CustomerPaymentController
    - Validate order ownership (403 if not customer's order)
    - Eager load items, installments, and payment history
    - Sort installments by due_date ascending
    - Return detailed order with CustomerOrderResource
    - _Requirements: 1.5, 2.2, 14.1, 14.2, 14.3, 14.4_

  - [ ]* 2.3 Write property test for customer order isolation
    - **Property 1: Customer Order Isolation**
    - **Validates: Requirements 1.1, 1.5, 2.2**
    - Generate random customers and orders, verify each customer sees only their orders

  - [ ]* 2.4 Write property test for installment chronological ordering
    - **Property 14: Installment Chronological Ordering**
    - **Validates: Requirements 10.3**
    - Generate random installments with random dates, verify API returns them sorted by due_date

  - [ ]* 2.5 Write unit tests for order viewing endpoints
    - Test customer can view only their orders
    - Test customer cannot access another customer's order (403)
    - Test pagination works correctly
    - Test filtering by payment_status

- [ ] 3. Checkpoint - Verify order viewing endpoints
  - Test order viewing endpoints with Postman/Insomnia
  - Verify authorization checks work correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 4. Implement GCash payment submission
  - [ ] 4.1 Implement submitGCashPayment() method in CustomerPaymentController
    - Validate installment ownership using validateInstallmentOwnership()
    - Validate payment amount matches installment.amount_expected
    - Validate installment status is pending (not already paid)
    - Store payment proof image using PaymentService helper
    - Call PaymentService->recordGCashPayment() to create Payment record
    - Return payment and installment data with success message
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 5.1, 5.2, 6.1_

  - [ ] 4.2 Implement image validation and storage helper
    - Validate base64 image format (JPEG, PNG, WebP)
    - Validate image size (max 5MB)
    - Validate actual image content using finfo
    - Generate unique filename with uniqid()
    - Store in private storage disk with date-based path
    - Return storage path for database record
    - _Requirements: 3.3, 3.6, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 4.3 Write property test for GCash payment creation
    - **Property 4: GCash Payment Creation**
    - **Validates: Requirements 3.4, 6.1**
    - Verify GCash payment creates Payment record with status "needs_verification"
    - Verify sale balance is NOT updated until admin verification

  - [ ]* 4.4 Write property test for payment amount validation
    - **Property 6: Payment Amount Validation**
    - **Validates: Requirements 5.1, 5.2**
    - Generate random installment amounts, submit wrong amounts, verify rejection

  - [ ]* 4.5 Write property test for image format validation
    - **Property 3: Image Format Validation**
    - **Validates: Requirements 3.3, 4.3**
    - Test valid formats (JPEG, PNG, WebP under 5MB) are accepted
    - Test invalid formats and oversized files are rejected

  - [ ]* 4.6 Write unit tests for GCash payment submission
    - Test successful GCash payment submission creates pending payment
    - Test payment amount must match installment amount (422 error)
    - Test cannot pay already paid installment (422 error)
    - Test customer cannot pay another customer's installment (403 error)
    - Test invalid image format is rejected (422 error)

- [ ] 5. Implement PDO payment submission
  - [ ] 5.1 Implement submitPDOPayment() method in CustomerPaymentController
    - Validate installment ownership using validateInstallmentOwnership()
    - Validate payment amount matches installment.amount_expected
    - Validate installment status is pending (not already paid or pending PDO)
    - Validate check_date is future date
    - Store check image using image storage helper
    - Call PaymentService->recordPDOPayment() to update installment
    - Return installment data with success message
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 7.1_

  - [ ]* 5.2 Write property test for PDO payment creation
    - **Property 5: PDO Payment Creation**
    - **Validates: Requirements 4.4, 7.1**
    - Verify PDO payment updates installment with pdo_approval_status "pending"
    - Verify Payment record is NOT created until admin approval and marking as paid

  - [ ]* 5.3 Write property test for PDO check data completeness
    - **Property 10: PDO Check Data Completeness**
    - **Validates: Requirements 7.2**
    - Verify all PDO fields are stored: check_number, bank_name, check_date, check_image

  - [ ]* 5.4 Write unit tests for PDO payment submission
    - Test successful PDO payment submission updates installment
    - Test payment amount must match installment amount (422 error)
    - Test check_date must be future date (422 error)
    - Test cannot submit PDO for already paid installment (422 error)
    - Test customer cannot submit PDO for another customer's installment (403 error)

- [x] 6. Add customer API routes
  - [x] 6.1 Add customer routes to routes/api.php
    - Add route group with `auth:sanctum` and `role:customer` middleware
    - Add rate limiting middleware (10 requests per minute)
    - Add GET `/api/customer/orders` route
    - Add GET `/api/customer/orders/{id}` route
    - Add POST `/api/customer/installments/{id}/pay-gcash` route
    - Add POST `/api/customer/installments/{id}/pay-pdo` route
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 6.2 Write integration tests for complete payment flow
    - Test customer login → view orders → submit GCash payment → admin verifies
    - Test customer login → view orders → submit PDO payment → admin approves → marks paid
    - Test unauthorized access attempts are blocked

- [ ] 7. Checkpoint - Verify backend API is complete
  - Run all backend tests: `php artisan test`
  - Test all API endpoints with Postman/Insomnia
  - Verify payment proof images are stored securely
  - Ensure all tests pass, ask the user if questions arise

- [-] 8. Create frontend API client
  - [x] 8.1 Create customerApi.js with API client functions
    - Create `react_frontend/src/api/customerApi.js`
    - Implement `getOrders(filters)` function
    - Implement `getOrderDetails(orderId)` function
    - Implement `submitGCashPayment(installmentId, data)` function
    - Implement `submitPDOPayment(installmentId, data)` function
    - Add error handling for 401, 403, 422, 409, 500 status codes
    - Add automatic token refresh on 401 errors
    - _Requirements: 11.1, 11.3_

  - [ ] 8.2 Create error handling utilities
    - Create error handling wrapper for API calls
    - Implement field-specific validation error extraction
    - Implement user-friendly error messages
    - Add error logging for debugging

- [-] 9. Create customer portal layout and navigation
  - [x] 9.1 Create CustomerLayout component
    - Create `react_frontend/src/layouts/CustomerLayout.jsx`
    - Add CustomerHeader with logo, navigation, and user menu
    - Add logout functionality
    - Apply consistent styling with existing app theme
    - _Requirements: 2.1_

  - [ ] 9.2 Add customer portal routes
    - Add customer routes to React Router configuration
    - Add `/customer/orders` route for MyOrdersPage
    - Add `/customer/orders/:orderId` route for OrderDetailsPage
    - Add route protection (require customer authentication)

- [-] 10. Implement MyOrdersPage component
  - [x] 10.1 Create MyOrdersPage with orders list
    - Create `react_frontend/src/pages/customer/MyOrdersPage.jsx`
    - Fetch orders using customerApi.getOrders()
    - Display order cards with transaction ID, total, balance, payment status
    - Show installment progress indicator for each order
    - Add "View Details" button for each order
    - Implement loading and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 10.2 Add filtering and pagination to MyOrdersPage
    - Create OrdersFilter component with status filter (all, paid, partial, not_paid)
    - Implement pagination controls
    - Update URL query params on filter/page change
    - Preserve filters when navigating back from order details
    - _Requirements: 1.1_

  - [ ]* 10.3 Write component tests for MyOrdersPage
    - Test orders are displayed correctly
    - Test filtering by payment status works
    - Test pagination works
    - Test loading and error states

- [ ] 11. Implement OrderDetailsPage component
  - [ ] 11.1 Create OrderDetailsPage with order details
    - Create `react_frontend/src/pages/customer/OrderDetailsPage.jsx`
    - Fetch order details using customerApi.getOrderDetails()
    - Display order header (transaction ID, date, total)
    - Display order items list
    - Display payment summary (amount paid, balance remaining, status)
    - Display installment schedule with status badges
    - Display payment history
    - Implement loading and error states
    - Handle 403 errors (redirect to orders list)
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 11.2 Add "Pay Now" functionality to installment rows
    - Add "Pay Now" button for pending installments
    - Disable button for paid installments
    - Disable button for PDO installments (PDO is submitted, not paid)
    - Open PaymentSubmissionModal on button click
    - Pass selected installment to modal
    - _Requirements: 3.1, 10.1, 10.2_

  - [ ]* 11.3 Write component tests for OrderDetailsPage
    - Test order details are displayed correctly
    - Test "Pay Now" button is enabled only for pending non-PDO installments
    - Test 403 error redirects to orders list
    - Test payment history is displayed

- [ ] 12. Checkpoint - Verify order viewing UI works
  - Test customer login and order viewing in browser
  - Verify orders list displays correctly
  - Verify order details page displays correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 13. Implement PaymentSubmissionModal component
  - [ ] 13.1 Create PaymentSubmissionModal with payment method selection
    - Create `react_frontend/src/components/customer/PaymentSubmissionModal.jsx`
    - Display installment amount (read-only)
    - Add payment method selector (GCash or PDO radio buttons)
    - Conditionally render GCashPaymentForm or PDOPaymentForm
    - Add modal close button
    - _Requirements: 3.1, 4.1, 9.1_

  - [ ] 13.2 Create GCashPaymentForm component
    - Create `react_frontend/src/components/customer/GCashPaymentForm.jsx`
    - Add amount display (read-only, pre-filled from installment)
    - Add reference number input field
    - Add image upload component with preview
    - Validate image format and size on client side
    - Display field-specific validation errors
    - _Requirements: 3.2, 3.3, 5.3_

  - [ ] 13.3 Create PDOPaymentForm component
    - Create `react_frontend/src/components/customer/PDOPaymentForm.jsx`
    - Add amount display (read-only, pre-filled from installment)
    - Add check number input field
    - Add bank name input field
    - Add check date picker (must be future date)
    - Add check image upload component with preview
    - Validate image format and size on client side
    - Display field-specific validation errors
    - _Requirements: 4.1, 4.2, 5.3_

  - [ ] 13.4 Implement payment submission logic
    - Handle form submission for GCash payments
    - Handle form submission for PDO payments
    - Call appropriate customerApi function
    - Display loading state during submission
    - Handle validation errors (display field-specific errors)
    - Handle success (show confirmation, close modal, refresh order details)
    - Handle other errors (show error message)
    - _Requirements: 3.4, 3.5, 4.4, 4.5, 15.1, 15.2, 15.3_

  - [ ]* 13.5 Write component tests for PaymentSubmissionModal
    - Test payment method selection switches forms
    - Test GCash form validates required fields
    - Test PDO form validates required fields
    - Test image upload validates format and size
    - Test successful submission closes modal and refreshes data
    - Test validation errors are displayed correctly

- [ ] 14. Create PaymentConfirmationModal component
  - [ ] 14.1 Create PaymentConfirmationModal with success message
    - Create `react_frontend/src/components/customer/PaymentConfirmationModal.jsx`
    - Display success icon
    - Display confirmation message with payment details
    - Display expected verification timeline (24 hours for GCash, varies for PDO)
    - Add "Close" button to return to order details
    - _Requirements: 15.1, 15.2_

- [ ] 15. Implement image upload component
  - [ ] 15.1 Create ImageUpload component with preview
    - Create `react_frontend/src/components/customer/ImageUpload.jsx`
    - Add file input with drag-and-drop support
    - Display image preview after selection
    - Validate file type (JPEG, PNG, WebP)
    - Validate file size (max 5MB)
    - Convert to base64 for API submission
    - Display validation errors
    - Add "Remove" button to clear selection
    - _Requirements: 3.3, 4.3_

  - [ ] 15.2 Add image compression before upload
    - Compress images to reduce upload size (max 1MB after compression)
    - Maintain image quality while reducing file size
    - Show compression progress indicator

- [ ] 16. Add customer portal context provider
  - [ ] 16.1 Create CustomerPortalContext for state management
    - Create `react_frontend/src/contexts/CustomerPortalContext.jsx`
    - Manage orders state
    - Manage currentOrder state
    - Manage loading state
    - Provide fetchOrders() function
    - Provide fetchOrderDetails() function
    - Provide submitPayment() function
    - Wrap customer portal routes with provider

- [ ] 17. Implement error handling and user feedback
  - [ ] 17.1 Add toast notifications for user feedback
    - Show success toast on payment submission
    - Show error toast on API errors
    - Show info toast for important messages
    - Auto-dismiss after 5 seconds

  - [ ] 17.2 Add loading states throughout the UI
    - Show skeleton loaders while fetching orders
    - Show skeleton loaders while fetching order details
    - Show spinner during payment submission
    - Disable buttons during loading

  - [ ] 17.3 Add empty states
    - Show "No orders found" message when customer has no orders
    - Show "No payment history" message when order has no payments
    - Add helpful text and call-to-action

- [ ] 18. Checkpoint - Verify payment submission UI works
  - Test GCash payment submission in browser
  - Test PDO payment submission in browser
  - Verify image upload and validation works
  - Verify error handling displays correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 19. Integrate with existing admin verification workflows
  - [ ] 19.1 Verify GCash payment verification flow (customer-submitted)
    - Submit GCash payment from customer portal
    - Verify payment appears in admin Payment Transactions tab
    - Verify admin can view payment proof image
    - Verify admin can approve payment
    - Verify customer sees updated status after approval
    - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2_

  - [ ] 19.2 Verify PDO payment approval flow (customer-submitted)
    - Submit PDO payment from customer portal
    - Verify PDO appears in admin PDO tab
    - Verify admin can view check image and details
    - Verify admin can approve PDO
    - Verify admin can mark PDO as paid after check clears
    - Verify customer sees updated status after each step
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2_

  - [ ] 19.3 Implement admin manual payment submission interface
    - Add "Record Payment" button to Payment Plans tab for each pending installment
    - Create AdminRecordPaymentModal component (or reuse existing RecordPaymentModal)
    - Support cash, GCash, and PDO payment methods
    - For cash: Immediately mark installment as paid
    - For GCash: Allow optional proof upload, immediately mark as verified
    - For PDO: Allow check details entry, immediately mark as approved and paid
    - Record admin user who submitted the payment (received_by field)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ] 19.4 Test admin manual payment submission
    - Test admin can submit cash payment for customer installment
    - Test admin can submit GCash payment with proof for customer installment
    - Test admin can submit PDO payment with check details for customer installment
    - Test all manual payments are immediately marked as paid/verified
    - Test customer sees updated status after admin submits payment
    - Verify received_by field records admin user ID

  - [ ]* 19.5 Write property test for payment verification state transition
    - **Property 8: Payment Verification State Transition**
    - **Validates: Requirements 6.3, 8.1, 8.3**
    - Verify payment verification updates payment status, installment status, and sale balances

  - [ ]* 19.6 Write property test for payment rejection handling
    - **Property 9: Payment Rejection Handling**
    - **Validates: Requirements 6.4, 7.4**
    - Verify payment rejection updates payment status but does NOT modify sale balances

  - [ ]* 19.7 Write property test for order completion detection
    - **Property 11: Order Completion Detection**
    - **Validates: Requirements 8.4**
    - Verify when all installments are paid, order payment_status becomes "paid" and balance_remaining becomes 0

- [ ] 20. Add security enhancements
  - [ ] 20.1 Implement rate limiting for customer endpoints
    - Configure rate limiter in Laravel (10 requests per minute)
    - Apply to customer payment routes
    - Return 429 error when rate limit exceeded
    - _Requirements: 11.1_

  - [ ] 20.2 Add HTTPS enforcement in production
    - Configure Laravel to force HTTPS in production
    - Update frontend API client to use HTTPS
    - _Requirements: 11.3_

  - [ ]* 20.3 Write property test for input sanitization
    - **Property 15: Input Sanitization**
    - **Validates: Requirements 11.4**
    - Test SQL injection attempts are blocked
    - Test XSS attempts are sanitized

  - [ ]* 20.4 Write property test for payment proof accessibility
    - **Property 7: Payment Proof Accessibility**
    - **Validates: Requirements 3.6, 4.6, 6.2, 12.4**
    - Verify payment proof images are accessible only to admin users
    - Verify customers and unauthenticated users cannot access payment proofs

- [ ] 21. Add performance optimizations
  - [ ] 21.1 Optimize database queries
    - Add eager loading for relationships (installments, payments, items)
    - Verify indexes exist on customer_id, sale_id, status columns
    - Add query result caching for order lists (5 minute TTL)
    - Invalidate cache on payment submission

  - [ ] 21.2 Optimize frontend performance
    - Implement code splitting for customer portal routes
    - Add lazy loading for images
    - Implement optimistic UI updates for payment submission
    - Add request debouncing for search/filter

- [ ] 22. Final testing and documentation
  - [ ] 22.1 Run complete test suite
    - Run all backend tests: `php artisan test`
    - Run all frontend tests: `npm test`
    - Run property-based tests (minimum 100 iterations each)
    - Verify all tests pass

  - [ ] 22.2 Perform end-to-end testing
    - Test complete customer flow: login → view orders → submit payment → verify status update
    - Test complete admin flow: receive payment → verify → update status
    - Test error scenarios: wrong amount, invalid image, unauthorized access
    - Test on multiple browsers (Chrome, Firefox, Safari)
    - Test on mobile devices

  - [ ] 22.3 Security testing
    - Test authorization checks (customer cannot access other customer's orders)
    - Test file upload security (invalid formats rejected, size limits enforced)
    - Test rate limiting works correctly
    - Test HTTPS enforcement in production

  - [ ]* 22.4 Write remaining property tests
    - **Property 12: Customer Payment Method Restriction** (Requirements 9.1, 9.3)
    - **Property 13: Paid Installment Protection** (Requirements 10.2)
    - **Property 16: Payment Proof Filename Uniqueness** (Requirements 12.2)
    - **Property 17: Payment Proof Association** (Requirements 12.3)
    - **Property 18: Admin Manual Payment Immediate Verification** (Requirements 13.3, 13.4, 13.5)
    - **Property 19: Manual Payment Audit Trail** (Requirements 13.6)
    - **Property 20: Order Details Completeness** (Requirements 14.1, 14.2, 14.3, 14.4)
    - **Property 21: Payment Submission Confirmation** (Requirements 15.2, 15.4)
    - **Property 22: Post-Submission Status Update** (Requirements 15.3)

- [ ] 23. Final checkpoint - Deployment readiness
  - Verify all tests pass (unit, property, integration, E2E)
  - Verify all requirements are covered by implementation
  - Verify all correctness properties are tested
  - Review code for security vulnerabilities
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation reuses existing PaymentService and StaggeredPaymentService
- No database changes are required (uses existing schema)
- Backend must be completed before frontend to ensure API contracts are stable
