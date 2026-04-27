# Requirements Document

## Introduction

This document specifies the requirements for implementing a comprehensive payment system for the KJ Price Mill POS + Order Management system. The system is a Laravel backend + React frontend application for a rice mill business. The payment system will support four traditional payment methods (Cash, GCash, PDO, and Credit) with an optional staggered payment feature that allows customers to pay in installments with flexible payment schedules.

The system addresses real-world business scenarios where customers need flexible payment options, including mixed payment methods within a single order, payment verification workflows for digital payments, and approval workflows for post-dated orders.

## Glossary

- **Payment_System**: The complete payment processing subsystem within the KJ Price Mill application
- **Secretary**: The user role responsible for handling POS operations and order creation (not "Staff")
- **Customer**: The person or business purchasing rice products from the mill
- **Order**: A sales transaction containing one or more products with a total amount
- **Payment_Method**: The mechanism used to pay for an order (Cash, GCash, PDO, or Credit)
- **Cash**: Physical currency payment that is immediately verified
- **GCash**: Digital mobile payment service requiring proof of payment and verification
- **PDO**: Post-Dated Order - payment via post-dated check or bank commitment requiring approval
- **Credit**: Pay Later option where customer pays at a future date without specific commitment (also known as "On Account")
- **Staggered_Payment**: A payment structure where the order total is divided into multiple installments with optional due dates
- **Installment**: A single payment within a staggered payment schedule
- **Full_Payment**: Payment of the complete order amount in a single transaction
- **Payment_Verification**: The process of confirming that a GCash payment was actually received
- **PDO_Approval**: The process of reviewing and approving a post-dated order before fulfillment
- **Payment_Schedule**: The structured plan defining installment amounts, methods, and due dates
- **Balance_Remaining**: The unpaid portion of an order total
- **Admin**: User role with management access to approve payments and verify transactions
- **Payment_Status**: The current state of payment for an order (Paid, Not Paid, Partial, Needs Verification, Pending Approval)

## Requirements

### Requirement 1: Support Four Traditional Payment Methods

**User Story:** As a Customer, I want to choose from multiple payment methods, so that I can pay using my preferred payment option.

#### Acceptance Criteria

1. THE Payment_System SHALL support Cash as a payment method
2. THE Payment_System SHALL support GCash as a payment method
3. THE Payment_System SHALL support PDO as a payment method
4. THE Payment_System SHALL support Credit as a payment method
5. WHEN a Customer selects a payment method, THE Payment_System SHALL record the selected method with the Order
6. THE Payment_System SHALL allow only one payment method per installment in a staggered payment
7. THE Payment_System SHALL allow different payment methods across multiple installments in a staggered payment

### Requirement 2: Enable Staggered Payment Option

**User Story:** As a Secretary, I want to enable staggered payments for an order, so that customers can pay in installments according to their financial capacity.

#### Acceptance Criteria

1. THE Payment_System SHALL provide a checkbox option to enable staggered payment
2. WHEN staggered payment is unchecked, THE Payment_System SHALL require full payment of the order amount
3. WHEN staggered payment is checked, THE Payment_System SHALL allow the order to be divided into multiple installments
4. WHEN staggered payment is enabled, THE Payment_System SHALL allow each installment to have a different payment method
5. WHEN staggered payment is enabled, THE Payment_System SHALL allow each installment to have an optional due date
6. WHEN staggered payment is enabled, THE Payment_System SHALL provide a "Pay Now" checkbox for each installment
7. THE Payment_System SHALL validate that the sum of all installment amounts equals the order total
8. WHEN staggered payment is enabled, THE Payment_System SHALL allow an optional down payment

### Requirement 3: Process Cash Payments

**User Story:** As a Secretary, I want to process cash payments, so that customers can pay with physical currency.

#### Acceptance Criteria

1. WHEN a Customer pays with Cash, THE Payment_System SHALL mark the payment status as Paid immediately
2. WHEN a Customer pays with Cash, THE Payment_System SHALL not require verification
3. WHEN a Cash payment is recorded, THE Payment_System SHALL update the amount_paid for the Order
4. WHEN a Cash payment is recorded, THE Payment_System SHALL update the balance_remaining for the Order
5. WHEN a Cash payment amount is less than the order total, THE Payment_System SHALL set payment status to Partial
6. WHEN a Cash payment completes the order balance, THE Payment_System SHALL set payment status to Paid

### Requirement 4: Process GCash Payments with Verification

**User Story:** As a Customer, I want to pay via GCash, so that I can use digital payment without handling cash.

#### Acceptance Criteria

1. WHEN a Customer pays with GCash, THE Payment_System SHALL require a reference number
2. WHEN a Customer pays with GCash, THE Payment_System SHALL allow upload of payment proof screenshot
3. WHEN a GCash payment is recorded, THE Payment_System SHALL set the payment status to "Paid - Needs Verification"
4. WHEN a GCash payment is recorded, THE Payment_System SHALL not update the amount_paid until verification
5. WHEN an Admin verifies a GCash payment, THE Payment_System SHALL update the payment status to "Verified & Paid"
6. WHEN an Admin verifies a GCash payment, THE Payment_System SHALL update the amount_paid for the Order
7. WHEN an Admin verifies a GCash payment, THE Payment_System SHALL update the balance_remaining for the Order
8. THE Payment_System SHALL provide an interface for Admin to view GCash payment proof
9. THE Payment_System SHALL provide a "Verify Payment" action for Admin users

### Requirement 5: Process PDO Payments with Approval Workflow

**User Story:** As a Customer, I want to use post-dated checks or bank commitments, so that I can secure products now and pay later with a specific commitment.

#### Acceptance Criteria

1. WHEN a Customer selects PDO payment, THE Payment_System SHALL require check number or bank reference
2. WHEN a Customer selects PDO payment, THE Payment_System SHALL require bank name
3. WHEN a Customer selects PDO payment, THE Payment_System SHALL allow upload of check image
4. WHEN a PDO payment is created, THE Payment_System SHALL set the status to "Pending Approval"
5. WHEN a PDO payment is pending, THE Payment_System SHALL not allow order fulfillment
6. WHEN an Admin approves a PDO, THE Payment_System SHALL set the status to "Approved"
7. WHEN a PDO is approved, THE Payment_System SHALL set the status to "Awaiting Payment"
8. WHEN a PDO check clears or payment is received, THE Payment_System SHALL allow Admin to mark as Paid
9. WHEN a PDO is marked as Paid, THE Payment_System SHALL update the amount_paid for the Order
10. WHEN a PDO is marked as Paid, THE Payment_System SHALL update the balance_remaining for the Order
11. THE Payment_System SHALL provide an interface for Admin to view check images
12. THE Payment_System SHALL provide "Approve PDO" and "Reject PDO" actions for Admin users

### Requirement 6: Process Credit (Pay Later) Payments

**User Story:** As a Customer, I want to pay later without a specific date commitment, so that I can take products now and pay when convenient.

#### Acceptance Criteria

1. WHEN a Customer selects Credit payment, THE Payment_System SHALL set the payment status to "Not Paid - On Account"
2. WHEN a Customer selects Credit payment, THE Payment_System SHALL set amount_paid to zero
3. WHEN a Customer selects Credit payment, THE Payment_System SHALL set balance_remaining to the order total
4. WHEN a Customer returns to pay a Credit order, THE Payment_System SHALL allow recording payment with any payment method
5. WHEN a payment is recorded for a Credit order, THE Payment_System SHALL update amount_paid and balance_remaining
6. WHEN a Credit order balance is fully paid, THE Payment_System SHALL set payment status to Paid

### Requirement 7: Support Mixed Payment Methods in Staggered Payments

**User Story:** As a Customer, I want to use different payment methods for different installments, so that I can optimize my payment strategy based on available funds.

#### Acceptance Criteria

1. WHEN staggered payment is enabled, THE Payment_System SHALL allow each installment to specify its own payment method
2. THE Payment_System SHALL support Cash as an installment payment method
3. THE Payment_System SHALL support GCash as an installment payment method
4. THE Payment_System SHALL support PDO as an installment payment method
5. THE Payment_System SHALL support Credit as an installment payment method
6. WHEN an installment uses GCash, THE Payment_System SHALL apply the verification workflow to that installment
7. WHEN an installment uses PDO, THE Payment_System SHALL apply the approval workflow to that installment
8. WHEN an installment uses Cash, THE Payment_System SHALL mark that installment as paid immediately
9. WHEN an installment uses Credit, THE Payment_System SHALL mark that installment as unpaid until payment is recorded

### Requirement 8: Validate Payment Schedule Totals

**User Story:** As a Secretary, I want the system to validate payment schedules, so that I can ensure the installments add up correctly.

#### Acceptance Criteria

1. WHEN a payment schedule is created, THE Payment_System SHALL calculate the sum of all installment amounts
2. WHEN the sum of installments does not equal the order total, THE Payment_System SHALL display an error message
3. WHEN the sum of installments does not equal the order total, THE Payment_System SHALL prevent saving the payment schedule
4. WHEN the sum of installments equals the order total, THE Payment_System SHALL allow saving the payment schedule
5. WHEN a down payment is specified, THE Payment_System SHALL include it in the total validation
6. THE Payment_System SHALL display the remaining balance to be allocated during schedule creation

### Requirement 9: Track Payment Status Across Multiple Installments

**User Story:** As an Admin, I want to see the overall payment status of orders with staggered payments, so that I can monitor which orders are fully paid, partially paid, or unpaid.

#### Acceptance Criteria

1. WHEN all installments are paid and verified, THE Payment_System SHALL set the order payment status to Paid
2. WHEN some installments are paid and some are unpaid, THE Payment_System SHALL set the order payment status to Partial
3. WHEN no installments are paid, THE Payment_System SHALL set the order payment status to Not Paid
4. WHEN at least one installment needs verification, THE Payment_System SHALL indicate "Needs Verification" in the order status
5. WHEN at least one PDO installment is pending approval, THE Payment_System SHALL indicate "Pending Approval" in the order status
6. THE Payment_System SHALL display the amount_paid and balance_remaining for each order
7. THE Payment_System SHALL calculate amount_paid as the sum of all verified payments

### Requirement 10: Provide Unified Payments Management Interface

**User Story:** As an Admin, I want a single interface to manage all payment-related tasks, so that I can efficiently handle payment verification, installment tracking, and PDO approvals.

#### Acceptance Criteria

1. THE Payment_System SHALL provide a Payments Management page with three tabs
2. THE Payment_System SHALL provide a "Payment Transactions" tab showing all individual payment records
3. THE Payment_System SHALL provide a "Payment Plans" tab showing all staggered payment schedules
4. THE Payment_System SHALL provide a "Post-Dated Orders" tab showing all PDO records
5. WHEN viewing Payment Transactions, THE Payment_System SHALL allow filtering by status, method, date range, and customer
6. WHEN viewing Payment Plans, THE Payment_System SHALL allow filtering by status, customer, and due date range
7. WHEN viewing Post-Dated Orders, THE Payment_System SHALL allow filtering by status, payment type, date range, and customer
8. THE Payment_System SHALL display summary statistics for each tab
9. THE Payment_System SHALL provide quick actions for verify, approve, and record payment operations

### Requirement 11: Record Individual Payment Transactions

**User Story:** As a Secretary, I want to record each payment transaction separately, so that there is a clear audit trail of all payments received.

#### Acceptance Criteria

1. WHEN a payment is received, THE Payment_System SHALL create a payment transaction record
2. THE Payment_System SHALL record the payment amount in the transaction
3. THE Payment_System SHALL record the payment method in the transaction
4. THE Payment_System SHALL record the payment date in the transaction
5. THE Payment_System SHALL record the user who received the payment in the transaction
6. WHEN the payment method is GCash, THE Payment_System SHALL record the reference number in the transaction
7. WHEN the payment method is GCash, THE Payment_System SHALL store the payment proof image in the transaction
8. WHEN the payment method is PDO, THE Payment_System SHALL link the transaction to the PDO record
9. THE Payment_System SHALL allow adding optional notes to each transaction

### Requirement 12: Support Staggered Payment Approval for High-Value Orders

**User Story:** As an Admin, I want to approve staggered payment plans for high-value orders, so that I can manage financial risk.

#### Acceptance Criteria

1. WHEN an order with staggered payment is less than ₱50,000, THE Payment_System SHALL auto-approve the payment plan
2. WHEN an order with staggered payment is ₱50,000 or more, THE Payment_System SHALL require Admin approval
3. WHEN an order with staggered payment includes PDO installments, THE Payment_System SHALL require Admin approval
4. WHEN a staggered payment plan requires approval, THE Payment_System SHALL set the status to "Pending Approval"
5. WHEN a staggered payment plan is pending approval, THE Payment_System SHALL not allow installment payments
6. WHEN an Admin approves a staggered payment plan, THE Payment_System SHALL set the status to "Active"
7. WHEN a staggered payment plan is active, THE Payment_System SHALL allow installment payments
8. THE Payment_System SHALL provide an interface for Admin to review and approve payment plans

### Requirement 13: Display Payment Information in Order Management

**User Story:** As a Secretary, I want to see payment information in the order list, so that I can quickly identify which orders need payment attention.

#### Acceptance Criteria

1. WHEN viewing the order list, THE Payment_System SHALL display the payment status for each order
2. WHEN viewing the order list, THE Payment_System SHALL display the amount paid and balance remaining for partial payments
3. WHEN an order has staggered payment, THE Payment_System SHALL display a "Staggered" badge
4. WHEN an order has PDO payment, THE Payment_System SHALL display a "PDO" badge with status color
5. WHEN an order has payments needing verification, THE Payment_System SHALL display a "Needs Verification" indicator
6. THE Payment_System SHALL provide a "View Schedule" action for orders with staggered payment
7. THE Payment_System SHALL provide a "Verify Payment" action for orders with unverified GCash payments
8. THE Payment_System SHALL provide an "Approve" action for orders with pending PDO payments

### Requirement 14: Enable Customer Balance Tracking

**User Story:** As an Admin, I want to view all outstanding balances for a customer, so that I can manage customer credit and payment history.

#### Acceptance Criteria

1. THE Payment_System SHALL provide a customer balance view showing all orders with outstanding balances
2. THE Payment_System SHALL calculate the total outstanding balance across all orders for a customer
3. THE Payment_System SHALL display payment history for each order
4. THE Payment_System SHALL display payment plans associated with the customer
5. THE Payment_System SHALL display PDO history for the customer
6. WHEN viewing customer balances, THE Payment_System SHALL allow recording new payments
7. THE Payment_System SHALL display the payment status for each outstanding order

### Requirement 15: Store Payment Data in Database

**User Story:** As a System, I want to persist payment data in the database, so that payment information is reliably stored and retrievable.

#### Acceptance Criteria

1. THE Payment_System SHALL store order payment data in the sales table
2. THE Payment_System SHALL store individual payment transactions in the payments table
3. THE Payment_System SHALL store payment installment schedules in the payment_installments table
4. WHEN an order is created, THE Payment_System SHALL initialize amount_paid to zero
5. WHEN an order is created, THE Payment_System SHALL initialize balance_remaining to the order total
6. WHEN a payment is verified, THE Payment_System SHALL update amount_paid in the sales table
7. WHEN a payment is verified, THE Payment_System SHALL update balance_remaining in the sales table
8. THE Payment_System SHALL maintain referential integrity between sales, payments, and payment_installments tables
9. THE Payment_System SHALL store payment proof images as JSON in the payments table
10. THE Payment_System SHALL store PDO check images as JSON in the payment_installments table

### Requirement 16: Provide Payment Schedule Setup Interface

**User Story:** As a Secretary, I want an intuitive interface to set up payment schedules, so that I can quickly create installment plans with customers.

#### Acceptance Criteria

1. WHEN staggered payment is enabled, THE Payment_System SHALL display a payment schedule setup interface
2. THE Payment_System SHALL display the order total in the setup interface
3. THE Payment_System SHALL allow specifying an optional down payment amount and method
4. THE Payment_System SHALL allow adding multiple installments
5. THE Payment_System SHALL allow removing installments
6. WHEN adding an installment, THE Payment_System SHALL allow specifying the amount
7. WHEN adding an installment, THE Payment_System SHALL allow selecting the payment method
8. WHEN adding an installment, THE Payment_System SHALL allow specifying an optional due date
9. WHEN adding an installment, THE Payment_System SHALL provide a "Pay Now" checkbox
10. THE Payment_System SHALL display the total allocated amount and remaining balance during setup
11. THE Payment_System SHALL display a validation error if total does not match order amount
12. THE Payment_System SHALL allow saving the payment schedule when validation passes

### Requirement 17: Support Immediate Partial Payments in Staggered Plans

**User Story:** As a Customer, I want to pay some installments immediately when creating the order, so that I can reduce my outstanding balance right away.

#### Acceptance Criteria

1. WHEN creating a payment schedule, THE Payment_System SHALL provide a "Pay Now" checkbox for each installment
2. WHEN "Pay Now" is checked for an installment, THE Payment_System SHALL process that payment immediately
3. WHEN "Pay Now" is checked for a Cash installment, THE Payment_System SHALL mark it as Paid immediately
4. WHEN "Pay Now" is checked for a GCash installment, THE Payment_System SHALL mark it as "Needs Verification"
5. WHEN "Pay Now" is checked for a PDO installment, THE Payment_System SHALL mark it as "Pending Approval"
6. WHEN "Pay Now" is checked for a Credit installment, THE Payment_System SHALL mark it as "Not Paid"
7. THE Payment_System SHALL update the order amount_paid based on immediately paid installments
8. THE Payment_System SHALL update the order balance_remaining based on immediately paid installments

### Requirement 18: Display Payment Schedule in Order Details

**User Story:** As an Admin, I want to view the complete payment schedule for an order, so that I can see all installments and their status.

#### Acceptance Criteria

1. WHEN viewing an order with staggered payment, THE Payment_System SHALL display the payment schedule
2. THE Payment_System SHALL display the installment number for each installment
3. THE Payment_System SHALL display the payment method for each installment
4. THE Payment_System SHALL display the amount for each installment
5. THE Payment_System SHALL display the due date for each installment
6. THE Payment_System SHALL display the status for each installment
7. THE Payment_System SHALL provide action buttons for each installment based on status
8. WHEN an installment needs verification, THE Payment_System SHALL display a "Verify" button
9. WHEN an installment needs approval, THE Payment_System SHALL display an "Approve" button
10. WHEN an installment is unpaid, THE Payment_System SHALL display a "Record Payment" button

### Requirement 19: Parse and Format Payment Data

**User Story:** As a System, I want to parse payment data from API requests and format it for storage, so that payment information is correctly processed.

#### Acceptance Criteria

1. WHEN receiving payment data from the frontend, THE Payment_System SHALL parse the payment method
2. WHEN receiving payment data from the frontend, THE Payment_System SHALL parse the payment amount
3. WHEN receiving payment data from the frontend, THE Payment_System SHALL parse optional reference numbers
4. WHEN receiving payment data from the frontend, THE Payment_System SHALL parse payment proof images
5. WHEN receiving staggered payment data, THE Payment_System SHALL parse the installment array
6. WHEN receiving staggered payment data, THE Payment_System SHALL parse each installment's method, amount, and due date
7. THE Payment_System SHALL validate that payment amounts are positive numbers
8. THE Payment_System SHALL validate that payment methods are from the allowed set
9. THE Payment_System SHALL format payment data for database storage
10. FOR ALL valid payment data, parsing then formatting then parsing SHALL produce equivalent data (round-trip property)

### Requirement 20: Provide Payment Proof Upload and Retrieval

**User Story:** As a Customer, I want to upload proof of payment for GCash transactions, so that the admin can verify my payment.

#### Acceptance Criteria

1. WHEN making a GCash payment, THE Payment_System SHALL allow uploading payment proof images
2. THE Payment_System SHALL accept common image formats (JPEG, PNG, WebP)
3. THE Payment_System SHALL store uploaded images securely
4. THE Payment_System SHALL generate URLs for stored payment proof images
5. WHEN an Admin views a payment transaction, THE Payment_System SHALL display the payment proof image
6. THE Payment_System SHALL allow viewing payment proof images in full size
7. THE Payment_System SHALL store multiple payment proof images if provided
8. THE Payment_System SHALL maintain the association between payment proof and payment transaction

