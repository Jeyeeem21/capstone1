# Requirements Document

## Introduction

The Customer Installment Payment Portal enables customers to view their orders with installment payment plans and submit payments for pending installments through a self-service portal. Currently, customers who choose installment payment options at POS can only make the initial payment, with no mechanism to pay subsequent installments (2/2, 3/3, etc.). This feature provides customers with a convenient way to submit GCash or PDO payments online, which are then verified by administrators before being applied to their orders.

## Glossary

- **Customer_Portal**: The web interface accessible to customers for viewing orders and submitting payments
- **Payment_System**: The backend system that processes, verifies, and records payment transactions
- **Installment**: A scheduled payment that is part of a multi-payment plan for an order
- **Payment_Proof**: Digital evidence of payment (screenshot for GCash, check image for PDO)
- **Admin_Verification**: The process where administrators review and approve/reject customer-submitted payments
- **GCash_Payment**: Electronic payment method requiring photo proof of transaction
- **PDO_Payment**: Post-Dated Order payment method requiring check details and check image
- **Payment_Transaction**: A record of a payment submission awaiting verification
- **Order**: A customer purchase that may have one or more installment payments

## Requirements

### Requirement 1: Customer Order Viewing

**User Story:** As a customer, I want to view all my orders with installment payment plans, so that I can track my payment obligations.

#### Acceptance Criteria

1. WHEN a customer accesses the Customer_Portal, THE Payment_System SHALL display all orders belonging to that customer
2. FOR EACH order, THE Customer_Portal SHALL display the total order amount, payment plan type, and remaining balance
3. FOR EACH order, THE Customer_Portal SHALL display all installments with their status (paid, pending, overdue)
4. FOR EACH installment, THE Customer_Portal SHALL display the installment amount, due date, and payment status
5. THE Payment_System SHALL restrict customers to viewing only their own orders

### Requirement 2: Customer Authentication and Authorization

**User Story:** As a customer, I want secure access to my payment portal, so that my financial information remains private.

#### Acceptance Criteria

1. THE Payment_System SHALL require customer authentication before displaying order information
2. WHEN a customer attempts to access another customer's order, THE Payment_System SHALL deny access and return an authorization error
3. THE Payment_System SHALL maintain customer session security throughout the payment submission process

### Requirement 3: GCash Payment Submission

**User Story:** As a customer, I want to submit GCash payments with proof, so that I can pay my installments electronically.

#### Acceptance Criteria

1. WHEN a customer selects a pending installment, THE Customer_Portal SHALL display a "Pay Now" option
2. WHEN a customer chooses GCash payment method, THE Customer_Portal SHALL prompt for payment proof image upload
3. THE Customer_Portal SHALL accept image files in JPEG, PNG, or similar formats for payment proof
4. WHEN a customer submits a GCash payment with valid proof, THE Payment_System SHALL create a Payment_Transaction record with status "pending verification"
5. WHEN a GCash payment is submitted, THE Customer_Portal SHALL display a confirmation message to the customer
6. THE Payment_System SHALL store the payment proof image securely

### Requirement 4: PDO Payment Submission

**User Story:** As a customer, I want to submit PDO check payments with details, so that I can pay my installments using post-dated checks.

#### Acceptance Criteria

1. WHEN a customer chooses PDO payment method, THE Customer_Portal SHALL prompt for check number, bank name, check date, and check image
2. THE Customer_Portal SHALL validate that all required PDO fields are provided before submission
3. THE Customer_Portal SHALL accept image files in JPEG, PNG, or similar formats for check images
4. WHEN a customer submits a PDO payment with valid details, THE Payment_System SHALL create a Payment_Transaction record with status "pending verification"
5. WHEN a PDO payment is submitted, THE Customer_Portal SHALL display a confirmation message to the customer
6. THE Payment_System SHALL store the check image securely

### Requirement 5: Payment Amount Validation

**User Story:** As a customer, I want the system to validate my payment amount, so that I submit the correct amount for each installment.

#### Acceptance Criteria

1. WHEN a customer submits a payment, THE Payment_System SHALL verify that the payment amount matches the installment amount exactly
2. IF the payment amount does not match the installment amount, THEN THE Payment_System SHALL reject the submission and display an error message
3. THE Customer_Portal SHALL display the required installment amount clearly before payment submission

### Requirement 6: Admin Payment Verification for GCash

**User Story:** As an admin, I want to verify customer-submitted GCash payments, so that I can confirm legitimate payments before applying them to orders.

#### Acceptance Criteria

1. WHEN a customer submits a GCash payment, THE Payment_System SHALL add the payment to the Payment Transactions tab with status "pending"
2. THE Payment_System SHALL display the payment proof image to the admin for verification
3. WHEN an admin approves a GCash payment, THE Payment_System SHALL update the installment status to "paid" and record the payment
4. WHEN an admin rejects a GCash payment, THE Payment_System SHALL update the Payment_Transaction status to "rejected" and notify the customer
5. THE Payment_System SHALL maintain an audit trail of all verification actions

### Requirement 7: Admin Payment Verification for PDO

**User Story:** As an admin, I want to verify customer-submitted PDO checks, so that I can confirm check details before applying payments to orders.

#### Acceptance Criteria

1. WHEN a customer submits a PDO payment, THE Payment_System SHALL add the payment to the PDO tab with status "pending"
2. THE Payment_System SHALL display the check number, bank name, check date, and check image to the admin
3. WHEN an admin approves a PDO payment, THE Payment_System SHALL update the installment status to "paid" and record the payment
4. WHEN an admin rejects a PDO payment, THE Payment_System SHALL update the Payment_Transaction status to "rejected" and notify the customer
5. THE Payment_System SHALL maintain an audit trail of all PDO verification actions

### Requirement 8: Installment Status Updates

**User Story:** As a customer, I want to see real-time updates to my installment status, so that I know when my payments have been verified.

#### Acceptance Criteria

1. WHEN an admin verifies a payment, THE Payment_System SHALL update the corresponding installment status from "pending" to "paid"
2. WHEN a customer views their orders after payment verification, THE Customer_Portal SHALL display the updated installment status
3. THE Payment_System SHALL update the remaining balance for the order after each verified payment
4. WHEN all installments for an order are paid, THE Payment_System SHALL mark the order payment status as "completed"

### Requirement 9: Payment Method Restrictions

**User Story:** As a system administrator, I want to restrict customer self-service payments to GCash and PDO only, so that cash payments remain in-store transactions.

#### Acceptance Criteria

1. THE Customer_Portal SHALL offer only GCash and PDO as payment method options
2. THE Customer_Portal SHALL not display cash as a payment option for customer self-service
3. WHEN an admin records a manual payment, THE Payment_System SHALL allow cash as a payment method for in-store transactions

### Requirement 10: Pending Installment Payment Restrictions

**User Story:** As a customer, I want to pay only installments that are due, so that I follow the proper payment schedule.

#### Acceptance Criteria

1. THE Customer_Portal SHALL enable the "Pay Now" button only for pending installments
2. THE Customer_Portal SHALL disable the "Pay Now" button for installments that are already paid
3. THE Customer_Portal SHALL display installments in chronological order by due date

### Requirement 11: API Endpoint Security

**User Story:** As a system administrator, I want secure API endpoints for customer payments, so that payment data is protected from unauthorized access.

#### Acceptance Criteria

1. THE Payment_System SHALL require authentication tokens for all customer API endpoints
2. THE Payment_System SHALL validate customer identity before processing any payment submission
3. THE Payment_System SHALL use HTTPS for all payment-related API communications
4. THE Payment_System SHALL sanitize and validate all input data to prevent injection attacks

### Requirement 12: Payment Proof Storage

**User Story:** As a system administrator, I want payment proof images stored securely, so that they can be retrieved for verification and audit purposes.

#### Acceptance Criteria

1. WHEN a customer uploads payment proof, THE Payment_System SHALL store the image in a secure storage location
2. THE Payment_System SHALL generate unique filenames for payment proof images to prevent collisions
3. THE Payment_System SHALL associate each payment proof image with its corresponding Payment_Transaction record
4. THE Payment_System SHALL allow only authorized admins to access payment proof images
5. THE Payment_System SHALL retain payment proof images for audit and compliance purposes

### Requirement 13: Admin Manual Payment Submission

**User Story:** As an admin, I want to manually submit payments on behalf of customers, so that I can process in-store payments, phone payments, and help customers who cannot use the portal.

#### Acceptance Criteria

1. THE Payment_System SHALL allow admins to manually submit payments for any customer's installment
2. WHEN an admin submits a manual payment, THE Payment_System SHALL support cash, GCash, and PDO payment methods
3. FOR cash payments, THE Payment_System SHALL immediately mark the installment as "paid" without verification
4. FOR GCash payments submitted by admin, THE Payment_System SHALL allow optional payment proof upload and immediately mark as "verified"
5. FOR PDO payments submitted by admin, THE Payment_System SHALL allow check details entry and immediately mark as "approved" and "paid"
6. THE Payment_System SHALL record the admin user who submitted the manual payment for audit purposes
7. THE Payment_System SHALL provide a "Record Payment" interface in the admin panel for each pending installment

### Requirement 14: Order Details Display

**User Story:** As a customer, I want to view detailed information about each order, so that I understand what I purchased and what I owe.

#### Acceptance Criteria

1. WHEN a customer selects an order, THE Customer_Portal SHALL display the order date, order items, and total amount
2. THE Customer_Portal SHALL display the payment plan details including number of installments and payment schedule
3. THE Customer_Portal SHALL display a payment history showing all completed payments with dates and amounts
4. THE Customer_Portal SHALL display the remaining balance and next due date prominently

### Requirement 15: Payment Submission Confirmation

**User Story:** As a customer, I want clear confirmation after submitting a payment, so that I know my submission was received.

#### Acceptance Criteria

1. WHEN a customer successfully submits a payment, THE Customer_Portal SHALL display a confirmation message with submission details
2. THE confirmation message SHALL include the payment amount, payment method, and expected verification timeline
3. THE Customer_Portal SHALL update the installment status to show "verification pending" after submission
4. THE Customer_Portal SHALL provide a reference number or transaction ID for the submitted payment
