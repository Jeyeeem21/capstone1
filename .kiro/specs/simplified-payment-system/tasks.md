# Tasks

## Phase 1: Database Foundation

### Task 1.1: Create Database Migration for Payment Tables
**Status:** not_started
**Requirements:** Requirement 15
**Description:** Create migration files to add payment tracking columns to sales table and create new payment_installments and payments tables.

**Subtasks:**
- [ ] Create migration to add columns to sales table (is_staggered, primary_method, amount_paid, balance_remaining)
- [ ] Create migration for payments table with all required columns
- [ ] Create migration for payment_installments table with PDO fields
- [ ] Add proper indexes and foreign key constraints
- [ ] Test migrations up and down

**Files to modify:**
- `laravel_backend/database/migrations/YYYY_MM_DD_add_payment_system_support.php` (new)

---

### Task 1.2: Create Payment Model
**Status:** not_started
**Requirements:** Requirement 11, 15
**Description:** Create the Payment model with relationships and helper methods.

**Subtasks:**
- [ ] Create Payment model class
- [ ] Define fillable fields and casts
- [ ] Add belongsTo relationship to Sale
- [ ] Add belongsTo relationships to User (received_by, verified_by)
- [ ] Add scopes for verified, pending, on_hold statuses
- [ ] Add accessor for payment_proof URLs

**Files to create:**
- `laravel_backend/app/Models/Payment.php` (new)

---

### Task 1.3: Create PaymentInstallment Model
**Status:** not_started
**Requirements:** Requirement 2, 7, 15
**Description:** Create the PaymentInstallment model for staggered payment schedules.

**Subtasks:**
- [ ] Create PaymentInstallment model class
- [ ] Define fillable fields and casts
- [ ] Add belongsTo relationship to Sale
- [ ] Add hasOne relationship to Payment
- [ ] Add scopes for pending, paid, overdue statuses
- [ ] Add methods to check if installment is due/overdue

**Files to create:**
- `laravel_backend/app/Models/PaymentInstallment.php` (new)

---

### Task 1.4: Update Sale Model
**Status:** not_started
**Requirements:** Requirement 3, 4, 5, 6, 9, 15
**Description:** Update the Sale model to support payment tracking and relationships.

**Subtasks:**
- [ ] Add new fields to fillable array
- [ ] Add casts for amount_paid, balance_remaining
- [ ] Add hasMany relationship to payments
- [ ] Add hasMany relationship to paymentInstallments
- [ ] Add isFullyPaid() helper method
- [ ] Add isPartiallyPaid() helper method
- [ ] Add verifiedPaymentsTotal() helper method
- [ ] Add calculatePaymentStatus() method

**Files to modify:**
- `laravel_backend/app/Models/Sale.php`

---

## Phase 2: Backend Payment Processing

### Task 2.1: Create PaymentService
**Status:** not_started
**Requirements:** Requirement 3, 4, 5, 6, 11
**Description:** Create service class to handle payment processing logic.

**Subtasks:**
- [ ] Create recordPayment() method for Cash payments
- [ ] Create recordGCashPayment() method with verification workflow
- [ ] Create recordPDOPayment() method with approval workflow
- [ ] Create recordCreditPayment() method
- [ ] Create verifyPayment() method to verify GCash payments
- [ ] Create approvePDO() method to approve PDO payments
- [ ] Create rejectPDO() method to reject PDO payments
- [ ] Create markPDOAsPaid() method when check clears
- [ ] Add updateSaleBalances() helper method
- [ ] Add calculatePaymentStatus() helper method

**Files to create:**
- `laravel_backend/app/Services/PaymentService.php` (new)

---

### Task 2.2: Create StaggeredPaymentService
**Status:** not_started
**Requirements:** Requirement 2, 7, 8, 12, 17
**Description:** Create service class to handle staggered payment plan logic.

**Subtasks:**
- [ ] Create createPaymentSchedule() method
- [ ] Create validateScheduleTotal() method
- [ ] Create processImmediatePayments() method for "Pay Now" installments
- [ ] Create recordInstallmentPayment() method
- [ ] Create checkApprovalRequired() method (₱50k threshold, PDO check)
- [ ] Create approvePaymentPlan() method
- [ ] Create calculateInstallmentStatus() method
- [ ] Add helper to check if all installments are paid

**Files to create:**
- `laravel_backend/app/Services/StaggeredPaymentService.php` (new)

---

### Task 2.3: Create PaymentController
**Status:** not_started
**Requirements:** Requirement 10, 11
**Description:** Create controller for payment management operations.

**Subtasks:**
- [ ] Create index() method to list all payments with filters
- [ ] Create show() method to view single payment details
- [ ] Create verify() method to verify GCash payments
- [ ] Create hold() method to put payments on hold
- [ ] Create cancel() method to cancel/reject payments
- [ ] Add validation rules for each method
- [ ] Add authorization checks
- [ ] Return PaymentResource responses

**Files to create:**
- `laravel_backend/app/Http/Controllers/PaymentController.php` (new)

---

### Task 2.4: Create StaggeredPaymentController
**Status:** not_started
**Requirements:** Requirement 2, 12, 16
**Description:** Create controller for staggered payment plan operations.

**Subtasks:**
- [ ] Create index() method to list all payment plans
- [ ] Create store() method to create payment schedule
- [ ] Create show() method to view payment plan details
- [ ] Create approve() method to approve payment plans
- [ ] Create recordInstallmentPayment() method
- [ ] Add validation for payment schedule creation
- [ ] Add authorization checks
- [ ] Return appropriate resources

**Files to create:**
- `laravel_backend/app/Http/Controllers/StaggeredPaymentController.php` (new)

---

### Task 2.5: Update SaleController
**Status:** not_started
**Requirements:** Requirement 1, 2, 3, 4, 5, 6
**Description:** Update SaleController to handle new payment options at order creation.

**Subtasks:**
- [ ] Update store() method to handle staggered payment checkbox
- [ ] Add logic to create payment schedule if staggered is enabled
- [ ] Update payment processing for full payment orders
- [ ] Add recordPayment() method for adding payments to existing orders
- [ ] Add paymentHistory() method to get all payments for an order
- [ ] Update validation rules for payment data
- [ ] Ensure proper error handling

**Files to modify:**
- `laravel_backend/app/Http/Controllers/SaleController.php`

---

### Task 2.6: Create API Resources
**Status:** not_started
**Requirements:** Requirement 9, 10, 13, 18
**Description:** Create resource classes for API responses.

**Subtasks:**
- [ ] Create PaymentResource with all payment fields
- [ ] Create PaymentInstallmentResource with installment details
- [ ] Update SaleResource to include payment information
- [ ] Add payment_status, amount_paid, balance_remaining to SaleResource
- [ ] Add payments_count and has_pending_payments to SaleResource
- [ ] Add installments relationship to SaleResource
- [ ] Format dates and amounts properly

**Files to create:**
- `laravel_backend/app/Http/Resources/PaymentResource.php` (new)
- `laravel_backend/app/Http/Resources/PaymentInstallmentResource.php` (new)

**Files to modify:**
- `laravel_backend/app/Http/Resources/SaleResource.php`

---

### Task 2.7: Add API Routes
**Status:** not_started
**Requirements:** All backend requirements
**Description:** Add API routes for payment operations.

**Subtasks:**
- [ ] Add POST /sales/{id}/payment route for recording payments
- [ ] Add GET /sales/{id}/payments route for payment history
- [ ] Add payment management routes (index, show, verify, hold, cancel)
- [ ] Add staggered payment routes (index, store, show, approve)
- [ ] Add GET /customers/{id}/balances route
- [ ] Add proper middleware and authorization
- [ ] Group routes logically

**Files to modify:**
- `laravel_backend/routes/api.php`

---

## Phase 3: Frontend - POS Payment Interface

### Task 3.1: Update POS Payment Method Selection
**Status:** not_started
**Requirements:** Requirement 1, 2
**Description:** Update POS to show all payment methods and staggered payment checkbox.

**Subtasks:**
- [ ] Update payment method radio buttons (Cash, GCash, PDO, Credit)
- [ ] Add "Enable Staggered Payment" checkbox
- [ ] Show/hide staggered payment setup based on checkbox
- [ ] Update payment method labels and descriptions
- [ ] Add tooltips explaining each payment method
- [ ] Ensure proper state management

**Files to modify:**
- `react_frontend/src/pages/shared/PointOfSale/PointOfSale.jsx`

---

### Task 3.2: Create Payment Schedule Setup Component
**Status:** not_started
**Requirements:** Requirement 16, 17
**Description:** Create component for setting up staggered payment schedules.

**Subtasks:**
- [ ] Create PaymentScheduleSetup component
- [ ] Display order total and remaining balance
- [ ] Add down payment input (optional)
- [ ] Add installment list with add/remove buttons
- [ ] Each installment: amount, method, due date, "Pay Now" checkbox
- [ ] Validate total equals order amount
- [ ] Show validation errors
- [ ] Handle immediate payments for "Pay Now" installments
- [ ] Style component to match existing design

**Files to create:**
- `react_frontend/src/components/payments/PaymentScheduleSetup.jsx` (new)

---

### Task 3.3: Create Cash Payment Modal
**Status:** not_started
**Requirements:** Requirement 3
**Description:** Update or create modal for cash payment processing.

**Subtasks:**
- [ ] Create/update CashPaymentModal component
- [ ] Add amount input field
- [ ] Show change calculation
- [ ] Handle full and partial payments
- [ ] Show balance remaining for partial payments
- [ ] Add confirmation dialog for partial payments
- [ ] Integrate with payment recording API

**Files to create/modify:**
- `react_frontend/src/components/payments/CashPaymentModal.jsx`

---

### Task 3.4: Create GCash Payment Modal
**Status:** not_started
**Requirements:** Requirement 4, 20
**Description:** Create modal for GCash payment with proof upload.

**Subtasks:**
- [ ] Create GCashPaymentModal component
- [ ] Add amount input field
- [ ] Add reference number input
- [ ] Add payment proof image upload
- [ ] Support multiple image uploads
- [ ] Show preview of uploaded images
- [ ] Add validation for required fields
- [ ] Show "Needs Verification" status message
- [ ] Integrate with payment recording API

**Files to create:**
- `react_frontend/src/components/payments/GCashPaymentModal.jsx` (new)

---

### Task 3.5: Create PDO Payment Modal
**Status:** not_started
**Requirements:** Requirement 5
**Description:** Create modal for PDO payment with check details.

**Subtasks:**
- [ ] Create PDOPaymentModal component
- [ ] Add check number input
- [ ] Add bank name input
- [ ] Add check image upload
- [ ] Add due date picker
- [ ] Show "Pending Approval" status message
- [ ] Add validation for required fields
- [ ] Integrate with payment recording API

**Files to create:**
- `react_frontend/src/components/payments/PDOPaymentModal.jsx` (new)

---

### Task 3.6: Create Credit Payment Modal
**Status:** not_started
**Requirements:** Requirement 6
**Description:** Create modal for Credit (Pay Later) payment.

**Subtasks:**
- [ ] Create CreditPaymentModal component
- [ ] Show order total
- [ ] Show "Not Paid - On Account" message
- [ ] Add optional notes field
- [ ] Add customer confirmation
- [ ] Show warning about outstanding balance
- [ ] Integrate with order creation API

**Files to create:**
- `react_frontend/src/components/payments/CreditPaymentModal.jsx` (new)

---

## Phase 4: Frontend - Payments Management Page

### Task 4.1: Create Payments Management Page Structure
**Status:** not_started
**Requirements:** Requirement 10
**Description:** Create the main Payments Management page with tab navigation.

**Subtasks:**
- [ ] Create PaymentsManagement page component
- [ ] Add tab navigation (Payment Transactions, Payment Plans, PDO)
- [ ] Add summary statistics cards at top
- [ ] Add filters section
- [ ] Add data table for each tab
- [ ] Implement tab switching with query params
- [ ] Add loading and error states
- [ ] Style to match existing admin pages

**Files to create:**
- `react_frontend/src/pages/admin/Payments/PaymentsManagement.jsx` (new)

---

### Task 4.2: Create Payment Transactions Tab
**Status:** not_started
**Requirements:** Requirement 10, 11
**Description:** Create tab showing all individual payment transactions.

**Subtasks:**
- [ ] Create PaymentTransactionsTab component
- [ ] Display payments in data table
- [ ] Add filters: status, method, date range, customer
- [ ] Show payment proof images
- [ ] Add "Verify" action button for pending GCash payments
- [ ] Add "Hold" action button
- [ ] Add "Cancel" action button
- [ ] Add view details modal
- [ ] Implement pagination
- [ ] Add export functionality

**Files to create:**
- `react_frontend/src/components/payments/PaymentTransactionsTab.jsx` (new)

---

### Task 4.3: Create Payment Plans Tab
**Status:** not_started
**Requirements:** Requirement 10, 18
**Description:** Create tab showing all staggered payment plans.

**Subtasks:**
- [ ] Create PaymentPlansTab component
- [ ] Display payment plans in data table
- [ ] Add filters: status, customer, due date range
- [ ] Show installment schedule for each plan
- [ ] Add "View Schedule" action to see all installments
- [ ] Add "Record Payment" action for unpaid installments
- [ ] Add "Approve" action for pending plans
- [ ] Show overdue indicators
- [ ] Implement pagination

**Files to create:**
- `react_frontend/src/components/payments/PaymentPlansTab.jsx` (new)

---

### Task 4.4: Create PDO Tab
**Status:** not_started
**Requirements:** Requirement 10
**Description:** Create tab showing all PDO records.

**Subtasks:**
- [ ] Create PDOTab component
- [ ] Display PDO records in data table
- [ ] Add filters: status, payment type, date range, customer
- [ ] Show check images
- [ ] Add "Approve" action button
- [ ] Add "Reject" action button
- [ ] Add "Mark as Paid" action button
- [ ] Add "Extend Date" action button
- [ ] Show overdue indicators
- [ ] Implement pagination

**Files to create:**
- `react_frontend/src/components/payments/PDOTab.jsx` (new)

---

### Task 4.5: Create Payment Verification Modal
**Status:** not_started
**Requirements:** Requirement 4
**Description:** Create modal for verifying GCash payments.

**Subtasks:**
- [ ] Create PaymentVerificationModal component
- [ ] Display payment details
- [ ] Show payment proof images in full size
- [ ] Add image zoom/lightbox functionality
- [ ] Add "Verify" button
- [ ] Add "Hold" button with reason input
- [ ] Add "Reject" button with reason input
- [ ] Show confirmation dialogs
- [ ] Update payment status after action

**Files to create:**
- `react_frontend/src/components/payments/PaymentVerificationModal.jsx` (new)

---

### Task 4.6: Create PDO Approval Modal
**Status:** not_started
**Requirements:** Requirement 5
**Description:** Create modal for approving/rejecting PDO payments.

**Subtasks:**
- [ ] Create PDOApprovalModal component
- [ ] Display PDO details
- [ ] Show check image in full size
- [ ] Display customer credit history
- [ ] Add "Approve" button
- [ ] Add "Reject" button with reason input
- [ ] Show risk assessment information
- [ ] Add confirmation dialogs
- [ ] Update PDO status after action

**Files to create:**
- `react_frontend/src/components/payments/PDOApprovalModal.jsx` (new)

---

## Phase 5: Frontend - Order Management Updates

### Task 5.1: Update Orders List Page
**Status:** not_started
**Requirements:** Requirement 13
**Description:** Update the Orders page to show payment information.

**Subtasks:**
- [ ] Add payment status column to orders table
- [ ] Show amount_paid / balance_remaining for partial payments
- [ ] Add "Staggered" badge for staggered payment orders
- [ ] Add "PDO" badge with status color
- [ ] Add "Needs Verification" indicator
- [ ] Add quick action buttons (Verify, Approve, View Schedule)
- [ ] Update filters to include payment status
- [ ] Add payment status to search functionality

**Files to modify:**
- `react_frontend/src/pages/admin/Orders/Orders.jsx`

---

### Task 5.2: Update Order Details Modal
**Status:** not_started
**Requirements:** Requirement 18
**Description:** Update order details to show payment schedule and history.

**Subtasks:**
- [ ] Add payment information section
- [ ] Display payment schedule table for staggered payments
- [ ] Show installment status for each installment
- [ ] Add action buttons per installment (Verify, Approve, Record Payment)
- [ ] Display payment history timeline
- [ ] Show payment proof images
- [ ] Add "Record Payment" button for orders with balance
- [ ] Update order status display

**Files to modify:**
- `react_frontend/src/pages/admin/Orders/Orders.jsx` (order details modal)

---

### Task 5.3: Create Record Payment Modal
**Status:** not_started
**Requirements:** Requirement 11
**Description:** Create modal for recording additional payments on existing orders.

**Subtasks:**
- [ ] Create RecordPaymentModal component
- [ ] Show order details and current balance
- [ ] Add payment method selection
- [ ] Add amount input (max = balance_remaining)
- [ ] Show appropriate fields based on method (reference, proof, check details)
- [ ] Add validation
- [ ] Integrate with payment recording API
- [ ] Update order display after payment recorded

**Files to create:**
- `react_frontend/src/components/payments/RecordPaymentModal.jsx` (new)

---

## Phase 6: Frontend - Customer Management Updates

### Task 6.1: Add Customer Balance View
**Status:** not_started
**Requirements:** Requirement 14
**Description:** Add customer balance tracking to customer management.

**Subtasks:**
- [ ] Add "View Balances" action button to customer list
- [ ] Create CustomerBalanceModal component
- [ ] Display all orders with outstanding balances
- [ ] Show total outstanding balance
- [ ] Display payment history per order
- [ ] Show payment plans associated with customer
- [ ] Show PDO history
- [ ] Add "Record Payment" action
- [ ] Add filters and sorting

**Files to modify:**
- `react_frontend/src/pages/admin/Partners/Customer.jsx`

**Files to create:**
- `react_frontend/src/components/customers/CustomerBalanceModal.jsx` (new)

---

## Phase 7: Frontend - Dashboard Updates

### Task 7.1: Add Payment Statistics to Dashboard
**Status:** not_started
**Requirements:** Requirement 9, 10
**Description:** Add payment-related widgets to the admin dashboard.

**Subtasks:**
- [ ] Add "Total Receivables" stat card
- [ ] Add "Payments Needing Verification" stat card
- [ ] Add "PDOs Pending Approval" stat card
- [ ] Add "Overdue Payments" stat card
- [ ] Create payment status chart/graph
- [ ] Add quick links to Payments Management page
- [ ] Update dashboard data fetching

**Files to modify:**
- `react_frontend/src/pages/admin/Dashboard/Dashboard.jsx`

---

## Phase 8: Navigation and Routing

### Task 8.1: Update Sidebar Navigation
**Status:** not_started
**Requirements:** Requirement 10
**Description:** Add Payments menu item to sidebar.

**Subtasks:**
- [ ] Add "Payments" menu item to sidebar
- [ ] Add icon for payments menu
- [ ] Add badge showing count of pending items
- [ ] Update active state highlighting
- [ ] Ensure proper permissions/role checks

**Files to modify:**
- `react_frontend/src/components/layout/Sidebar.jsx`

---

### Task 8.2: Add Routes
**Status:** not_started
**Requirements:** Requirement 10
**Description:** Add routes for new payment pages.

**Subtasks:**
- [ ] Add /admin/payments route
- [ ] Support query params for tab selection (?tab=transactions|plans|pdo)
- [ ] Add proper route guards/permissions
- [ ] Update route configuration

**Files to modify:**
- `react_frontend/src/router.jsx`

---

## Phase 9: API Integration

### Task 9.1: Create Payment API Functions
**Status:** not_started
**Requirements:** All requirements
**Description:** Create API functions for payment operations.

**Subtasks:**
- [ ] Add recordPayment() function
- [ ] Add getPayments() function with filters
- [ ] Add verifyPayment() function
- [ ] Add holdPayment() function
- [ ] Add cancelPayment() function
- [ ] Add createPaymentSchedule() function
- [ ] Add getPaymentPlans() function
- [ ] Add approvePaymentPlan() function
- [ ] Add recordInstallmentPayment() function
- [ ] Add approvePDO() function
- [ ] Add rejectPDO() function
- [ ] Add markPDOAsPaid() function
- [ ] Add getCustomerBalances() function
- [ ] Add proper error handling

**Files to modify:**
- `react_frontend/src/api/index.js`

---

## Phase 10: Testing and Polish

### Task 10.1: Backend Testing
**Status:** not_started
**Requirements:** All requirements
**Description:** Test all backend payment functionality.

**Subtasks:**
- [ ] Test database migrations
- [ ] Test payment recording for all methods
- [ ] Test GCash verification workflow
- [ ] Test PDO approval workflow
- [ ] Test staggered payment creation
- [ ] Test payment schedule validation
- [ ] Test balance calculations
- [ ] Test payment status updates
- [ ] Test edge cases (negative amounts, invalid methods, etc.)
- [ ] Test authorization and permissions

---

### Task 10.2: Frontend Testing
**Status:** not_started
**Requirements:** All requirements
**Description:** Test all frontend payment functionality.

**Subtasks:**
- [ ] Test POS payment flows for all methods
- [ ] Test staggered payment setup
- [ ] Test payment verification in admin
- [ ] Test PDO approval in admin
- [ ] Test payment recording on existing orders
- [ ] Test filters and search
- [ ] Test responsive design
- [ ] Test image uploads
- [ ] Test validation messages
- [ ] Test error handling

---

### Task 10.3: Integration Testing
**Status:** not_started
**Requirements:** All requirements
**Description:** Test end-to-end payment scenarios.

**Subtasks:**
- [ ] Test full payment with Cash
- [ ] Test full payment with GCash (with verification)
- [ ] Test full payment with PDO (with approval)
- [ ] Test Credit payment and later payment
- [ ] Test staggered payment with mixed methods
- [ ] Test immediate payments in staggered plan
- [ ] Test payment schedule validation
- [ ] Test customer balance tracking
- [ ] Test all real-world scenarios from requirements

---

### Task 10.4: Documentation and Training
**Status:** not_started
**Requirements:** All requirements
**Description:** Create documentation and training materials.

**Subtasks:**
- [ ] Document API endpoints
- [ ] Create user guide for Secretary role
- [ ] Create user guide for Admin role
- [ ] Document payment workflows
- [ ] Create troubleshooting guide
- [ ] Add inline help text in UI
- [ ] Create video tutorials (optional)

---

## Summary

**Total Tasks:** 41 tasks across 10 phases
**Estimated Timeline:** 6-8 weeks for full implementation

**Phase Priority:**
1. Phase 1-2: Database and Backend (2 weeks) - Foundation
2. Phase 3: POS Interface (1 week) - Core functionality
3. Phase 4: Payments Management (2 weeks) - Admin tools
4. Phase 5-7: Updates to existing pages (1 week) - Integration
5. Phase 8-9: Navigation and API (1 week) - Connectivity
6. Phase 10: Testing and Polish (1-2 weeks) - Quality assurance
