# Design Document

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     POS      │  │   Payments   │  │    Orders    │     │
│  │  Interface   │  │  Management  │  │  Management  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                     API Client Layer                        │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     Laravel Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │    Models    │     │
│  │              │  │              │  │              │     │
│  │ - Payment    │  │ - Payment    │  │ - Payment    │     │
│  │ - Staggered  │  │ - Staggered  │  │ - Installment│     │
│  │ - Sale       │  │              │  │ - Sale       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                     Database Layer                          │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  MySQL/Postgres │
                    │                 │
                    │ - sales         │
                    │ - payments      │
                    │ - installments  │
                    └─────────────────┘
```

### Technology Stack

**Backend:**
- Framework: Laravel 10+
- Language: PHP 8.1+
- Database: MySQL 8.0+ or PostgreSQL 13+
- Storage: Laravel Storage (local/S3 for images)

**Frontend:**
- Framework: React 18+
- Language: JavaScript/JSX
- State Management: React Context + Hooks
- HTTP Client: Axios
- UI Components: Custom + existing component library

**Communication:**
- Protocol: REST API
- Format: JSON
- Authentication: Laravel Sanctum (existing)

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────┐
│       sales         │
│─────────────────────│
│ id (PK)             │
│ transaction_id      │
│ customer_id (FK)    │
│ total               │
│ is_staggered        │◄──────┐
│ primary_method      │       │
│ amount_paid         │       │
│ balance_remaining   │       │
│ payment_status      │       │
│ ...                 │       │
└─────────────────────┘       │
         │                    │
         │ 1:N                │ 1:N
         │                    │
         ▼                    │
┌─────────────────────┐       │
│      payments       │       │
│─────────────────────│       │
│ id (PK)             │       │
│ sale_id (FK)        │───────┘
│ installment_id (FK) │───────┐
│ amount              │       │
│ payment_method      │       │
│ reference_number    │       │
│ payment_proof       │       │
│ status              │       │
│ received_by (FK)    │       │
│ verified_by (FK)    │       │
│ verified_at         │       │
│ paid_at             │       │
│ ...                 │       │
└─────────────────────┘       │
                              │
                              │ 1:1
                              │
                              │
┌─────────────────────────────┘
│
│
▼
┌──────────────────────────┐
│  payment_installments    │
│──────────────────────────│
│ id (PK)                  │
│ sale_id (FK)             │
│ installment_number       │
│ amount_expected          │
│ amount_paid              │
│ payment_method           │
│ due_date                 │
│ paid_date                │
│ status                   │
│ pdo_check_number         │
│ pdo_check_bank           │
│ pdo_check_image          │
│ pdo_approval_status      │
│ pdo_approved_by (FK)     │
│ payment_id (FK)          │
│ notes                    │
│ ...                      │
└──────────────────────────┘
```

### Table Schemas

#### sales (modified)

```sql
-- New columns to add
ALTER TABLE sales ADD COLUMN is_staggered BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN primary_method VARCHAR(20);
ALTER TABLE sales ADD COLUMN amount_paid DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN balance_remaining DECIMAL(12,2) DEFAULT 0;
-- payment_status values: 'paid', 'not_paid', 'partial'
```

**Key Fields:**
- `is_staggered`: Indicates if order uses staggered payment
- `primary_method`: Main payment method (cash, gcash, pdo, credit)
- `amount_paid`: Total verified payments received
- `balance_remaining`: Outstanding balance (total - amount_paid)
- `payment_status`: Current payment state

#### payments (new table)

```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    installment_id BIGINT UNSIGNED NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    reference_number VARCHAR(255) NULL,
    payment_proof JSON NULL,
    status VARCHAR(20) DEFAULT 'verified',
    hold_reason TEXT NULL,
    cancel_reason TEXT NULL,
    notes TEXT NULL,
    received_by BIGINT UNSIGNED NULL,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    paid_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (installment_id) REFERENCES payment_installments(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_sale_id (sale_id),
    INDEX idx_status (status),
    INDEX idx_payment_method (payment_method),
    INDEX idx_paid_at (paid_at)
);
```

**Key Fields:**
- `status`: 'verified', 'needs_verification', 'on_hold', 'cancelled'
- `payment_proof`: JSON array of image URLs
- `installment_id`: Links to specific installment (null for non-staggered)

#### payment_installments (new table)

```sql
CREATE TABLE payment_installments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    installment_number INT NOT NULL,
    amount_expected DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL,
    due_date DATE NULL,
    paid_date DATE NULL,
    status VARCHAR(20) DEFAULT 'pending',
    pdo_check_number VARCHAR(255) NULL,
    pdo_check_bank VARCHAR(255) NULL,
    pdo_check_image JSON NULL,
    pdo_approval_status VARCHAR(20) NULL,
    pdo_approved_by BIGINT UNSIGNED NULL,
    payment_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (pdo_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    
    INDEX idx_sale_id (sale_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_payment_method (payment_method)
);
```

**Key Fields:**
- `status`: 'pending', 'paid', 'needs_verification', 'verified', 'overdue'
- `pdo_approval_status`: 'pending', 'approved', 'rejected' (for PDO installments)
- `pdo_check_image`: JSON array of check image URLs
- `payment_id`: Links to actual payment record when paid

### Data Relationships

1. **Sale → Payments**: One-to-Many
   - A sale can have multiple payment transactions
   - Each payment belongs to one sale

2. **Sale → PaymentInstallments**: One-to-Many
   - A sale with staggered payment has multiple installments
   - Each installment belongs to one sale

3. **PaymentInstallment → Payment**: One-to-One
   - An installment links to its payment record when paid
   - A payment can be linked to an installment (or null for non-staggered)

## API Design

### Endpoint Structure

**Base URL:** `/api/v1`

### Payment Endpoints

#### 1. Record Payment
```
POST /sales/{saleId}/payments
```

**Request Body:**
```json
{
  "amount": 5000.00,
  "payment_method": "gcash",
  "reference_number": "GC123456789",
  "payment_proof": ["base64_image_data"],
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": { /* PaymentResource */ },
    "sale": { /* Updated SaleResource */ }
  }
}
```

#### 2. Get Payment History
```
GET /sales/{saleId}/payments
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "amount": 5000.00,
      "payment_method": "gcash",
      "status": "verified",
      "paid_at": "2026-04-24T10:30:00Z"
    }
  ]
}
```

#### 3. List All Payments
```
GET /payments?status=needs_verification&method=gcash&from=2026-04-01&to=2026-04-30
```


**Query Parameters:**
- `status`: Filter by payment status
- `method`: Filter by payment method
- `from`, `to`: Date range filter
- `customer_id`: Filter by customer
- `page`, `per_page`: Pagination

#### 4. Verify Payment
```
POST /payments/{paymentId}/verify
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": { /* Updated PaymentResource */ }
}
```

#### 5. Hold Payment
```
POST /payments/{paymentId}/hold
```

**Request Body:**
```json
{
  "reason": "Suspicious transaction, needs review"
}
```

#### 6. Cancel Payment
```
POST /payments/{paymentId}/cancel
```

**Request Body:**
```json
{
  "reason": "Fake proof of payment"
}
```

### Staggered Payment Endpoints

#### 1. Create Payment Schedule
```
POST /sales/{saleId}/payment-schedule
```

**Request Body:**
```json
{
  "installments": [
    {
      "installment_number": 1,
      "amount": 20000.00,
      "payment_method": "cash",
      "due_date": null,
      "pay_now": true
    },
    {
      "installment_number": 2,
      "amount": 30000.00,
      "payment_method": "gcash",
      "due_date": "2026-05-15",
      "pay_now": false
    },
    {
      "installment_number": 3,
      "amount": 50000.00,
      "payment_method": "pdo",
      "due_date": "2026-06-15",
      "pay_now": false,
      "pdo_check_number": "12345",
      "pdo_check_bank": "BDO",
      "pdo_check_image": ["base64_image_data"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sale": { /* Updated SaleResource */ },
    "installments": [ /* Array of PaymentInstallmentResource */ ],
    "requires_approval": true,
    "approval_reason": "Order total ≥ ₱50,000"
  }
}
```

#### 2. List Payment Plans
```
GET /payment-plans?status=active&customer_id=5
```

#### 3. Approve Payment Plan
```
POST /payment-plans/{saleId}/approve
```

#### 4. Record Installment Payment
```
POST /installments/{installmentId}/pay
```

**Request Body:**
```json
{
  "amount": 30000.00,
  "payment_method": "cash",
  "reference_number": null,
  "payment_proof": null,
  "notes": "Paid in full"
}
```

### PDO Endpoints

#### 1. Approve PDO
```
POST /installments/{installmentId}/approve-pdo
```

#### 2. Reject PDO
```
POST /installments/{installmentId}/reject-pdo
```

**Request Body:**
```json
{
  "reason": "Insufficient credit history"
}
```

#### 3. Mark PDO as Paid
```
POST /installments/{installmentId}/mark-paid
```

### Customer Balance Endpoints

#### 1. Get Customer Balances
```
GET /customers/{customerId}/balances
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_outstanding": 150000.00,
    "orders": [
      {
        "id": 1,
        "transaction_id": "ORD-2026-04-24-001",
        "total": 100000.00,
        "amount_paid": 50000.00,
        "balance_remaining": 50000.00,
        "payment_status": "partial"
      }
    ],
    "payment_plans": [ /* Array of payment plans */ ],
    "pdo_history": [ /* Array of PDO records */ ]
  }
}
```

## Component Architecture

### Frontend Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   │   └── PaymentsMenuItem (with badge)
│   └── Header
│
├── POS (Point of Sale)
│   ├── ProductSelection
│   ├── Cart
│   └── PaymentSection
│       ├── PaymentMethodSelector
│       │   ├── CashOption
│       │   ├── GCashOption
│       │   ├── PDOOption
│       │   └── CreditOption
│       ├── StaggeredPaymentCheckbox
│       └── PaymentScheduleSetup
│           ├── DownPaymentInput
│           ├── InstallmentList
│           │   └── InstallmentItem
│           │       ├── AmountInput
│           │       ├── MethodSelector
│           │       ├── DueDatePicker
│           │       └── PayNowCheckbox
│           └── ValidationSummary
│
├── PaymentsManagement
│   ├── TabNavigation
│   ├── StatisticsCards
│   ├── PaymentTransactionsTab
│   │   ├── FilterBar
│   │   ├── PaymentsDataTable
│   │   └── PaymentVerificationModal
│   │       ├── PaymentDetails
│   │       ├── ProofImageViewer
│   │       └── ActionButtons
│   ├── PaymentPlansTab
│   │   ├── FilterBar
│   │   ├── PaymentPlansDataTable
│   │   └── PaymentScheduleModal
│   │       ├── InstallmentSchedule
│   │       └── InstallmentActions
│   └── PDOTab
│       ├── FilterBar
│       ├── PDODataTable
│       └── PDOApprovalModal
│           ├── PDODetails
│           ├── CheckImageViewer
│           ├── CustomerCreditHistory
│           └── ApprovalActions
│
├── Orders
│   ├── OrdersList
│   │   ├── PaymentStatusBadge
│   │   ├── StaggeredBadge
│   │   └── PDOBadge
│   └── OrderDetailsModal
│       ├── OrderInfo
│       ├── PaymentScheduleSection
│       ├── PaymentHistoryTimeline
│       └── RecordPaymentButton
│
└── Customers
    ├── CustomersList
    └── CustomerBalanceModal
        ├── OutstandingOrders
        ├── PaymentHistory
        ├── PaymentPlans
        └── PDOHistory
```

### Key React Components

#### PaymentScheduleSetup.jsx
```jsx
const PaymentScheduleSetup = ({ orderTotal, onSave }) => {
  const [installments, setInstallments] = useState([]);
  const [downPayment, setDownPayment] = useState(null);
  
  const totalAllocated = useMemo(() => {
    const installmentTotal = installments.reduce((sum, i) => sum + i.amount, 0);
    return (downPayment?.amount || 0) + installmentTotal;
  }, [installments, downPayment]);
  
  const remainingBalance = orderTotal - totalAllocated;
  const isValid = Math.abs(remainingBalance) < 0.01;
  
  // Component logic...
};
```

#### PaymentVerificationModal.jsx
```jsx
const PaymentVerificationModal = ({ payment, onVerify, onHold, onCancel }) => {
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  
  const handleVerify = async () => {
    await onVerify(payment.id);
  };
  
  const handleHold = async () => {
    await onHold(payment.id, reason);
  };
  
  // Component logic...
};
```

## State Management

### React Context Structure

```jsx
// PaymentContext.js
const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [pdoRecords, setPdoRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const recordPayment = async (saleId, paymentData) => {
    // API call
  };
  
  const verifyPayment = async (paymentId) => {
    // API call
  };
  
  // More methods...
  
  return (
    <PaymentContext.Provider value={{
      payments,
      paymentPlans,
      pdoRecords,
      loading,
      recordPayment,
      verifyPayment,
      // More methods...
    }}>
      {children}
    </PaymentContext.Provider>
  );
};
```

### Local Component State

- Form inputs: useState
- Validation errors: useState
- Modal visibility: useState
- Loading states: useState
- Computed values: useMemo
- Side effects: useEffect

## Payment Workflows

### 1. Full Payment with Cash

```
User Action                  System Response
───────────────────────────────────────────────────────
1. Select Cash method
2. Enter amount ≥ total  →  Calculate change
3. Click "Complete"      →  Create payment record
                         →  status = 'verified'
                         →  Update sale.amount_paid
                         →  Update sale.balance_remaining = 0
                         →  Update sale.payment_status = 'paid'
                         →  Generate receipt
```

### 2. Full Payment with GCash

```
User Action                  System Response
───────────────────────────────────────────────────────
1. Select GCash method
2. Enter amount ≥ total
3. Enter reference number
4. Upload proof image    →  Store image
5. Click "Complete"      →  Create payment record
                         →  status = 'needs_verification'
                         →  sale.payment_status = 'not_paid'
                         →  Notify admin

Admin Action:
6. View payment proof
7. Verify in GCash app
8. Click "Verify"        →  Update payment.status = 'verified'
                         →  Update sale.amount_paid
                         →  Update sale.balance_remaining = 0
                         →  Update sale.payment_status = 'paid'
```

### 3. Staggered Payment with Mixed Methods

```
User Action                  System Response
───────────────────────────────────────────────────────
1. Check "Staggered Payment"
2. Add installment 1:
   - Amount: ₱20,000
   - Method: Cash
   - Pay Now: ✓         →  Process immediately
                        →  Create payment record (verified)
3. Add installment 2:
   - Amount: ₱30,000
   - Method: GCash
   - Due: May 15
   - Pay Now: ✗         →  Create installment record (pending)
4. Add installment 3:
   - Amount: ₱50,000
   - Method: PDO
   - Due: Jun 15
   - Check #: 12345
   - Pay Now: ✗         →  Create installment record (pending approval)
5. Click "Save"         →  Validate total = ₱100,000
                        →  Check if approval needed (yes, ≥₱50k + PDO)
                        →  Create sale with is_staggered = true
                        →  Create 3 installment records
                        →  Process installment 1 payment
                        →  sale.amount_paid = ₱20,000
                        →  sale.balance_remaining = ₱80,000
                        →  sale.payment_status = 'partial'
                        →  Notify admin for approval
```

### 4. PDO Approval Workflow

```
Admin Action                 System Response
───────────────────────────────────────────────────────
1. View PDO list
2. Click on pending PDO
3. View check image
4. Review customer credit
5. Click "Approve"       →  Update installment.pdo_approval_status = 'approved'
                         →  Update installment.status = 'awaiting_payment'
                         →  Notify customer

When check clears:
6. Click "Mark as Paid"  →  Create payment record
                         →  Update installment.status = 'paid'
                         →  Update sale.amount_paid
                         →  Update sale.balance_remaining
                         →  Update sale.payment_status if fully paid
```

## Security Considerations

### Authentication & Authorization

1. **Role-Based Access Control:**
   - Secretary: Can record payments, create orders
   - Admin: Can verify payments, approve PDOs, view all data
   - Customer: Can view own orders and balances

2. **API Middleware:**
   ```php
   Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
       Route::post('/payments/{id}/verify', [PaymentController::class, 'verify']);
       Route::post('/installments/{id}/approve-pdo', [PaymentController::class, 'approvePDO']);
   });
   ```

### Data Validation

1. **Backend Validation:**
   - Payment amounts must be positive
   - Payment methods must be in allowed list
   - Installment totals must equal order total
   - Reference numbers required for GCash
   - Check details required for PDO

2. **Frontend Validation:**
   - Real-time validation feedback
   - Prevent submission of invalid data
   - Client-side total validation

### File Upload Security

1. **Image Validation:**
   - Allowed formats: JPEG, PNG, WebP
   - Maximum file size: 5MB per image
   - Virus scanning (optional)
   - Sanitize filenames

2. **Storage:**
   - Store in private storage directory
   - Generate signed URLs for viewing
   - Set expiration on URLs
   - Organize by date: `/payments/2026/04/24/`

### Financial Data Protection

1. **Encryption:**
   - Encrypt sensitive data at rest
   - Use HTTPS for all API calls
   - Secure database connections

2. **Audit Trail:**
   - Log all payment operations
   - Track who verified/approved
   - Record timestamps
   - Maintain payment history

## Error Handling

### Backend Error Responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Payment amount exceeds balance remaining",
    "details": {
      "amount": 60000.00,
      "balance_remaining": 50000.00
    }
  }
}
```

### Common Error Codes

- `INVALID_AMOUNT`: Payment amount invalid
- `INVALID_METHOD`: Payment method not allowed
- `INVALID_TOTAL`: Installment total doesn't match order
- `PAYMENT_NOT_FOUND`: Payment record not found
- `ALREADY_VERIFIED`: Payment already verified
- `ALREADY_PAID`: Installment already paid
- `APPROVAL_REQUIRED`: Payment plan needs approval
- `INSUFFICIENT_BALANCE`: Amount exceeds remaining balance

### Frontend Error Handling

```jsx
try {
  await recordPayment(saleId, paymentData);
  showSuccess('Payment recorded successfully');
} catch (error) {
  if (error.response?.data?.error) {
    const { code, message } = error.response.data.error;
    showError(message);
    
    if (code === 'APPROVAL_REQUIRED') {
      showApprovalNotice();
    }
  } else {
    showError('An unexpected error occurred');
  }
}
```

## Performance Considerations

### Database Optimization

1. **Indexes:**
   - Index on `sale_id` in payments and installments
   - Index on `status` for filtering
   - Index on `paid_at` and `due_date` for date queries
   - Composite index on `(sale_id, status)` for common queries

2. **Query Optimization:**
   - Use eager loading for relationships
   - Paginate large result sets
   - Cache frequently accessed data
   - Use database transactions for multi-step operations

### Frontend Optimization

1. **Code Splitting:**
   - Lazy load payment management pages
   - Split large components
   - Load modals on demand

2. **Data Fetching:**
   - Implement pagination
   - Use debouncing for search/filters
   - Cache API responses
   - Implement optimistic updates

3. **Image Handling:**
   - Compress images before upload
   - Use thumbnails for lists
   - Lazy load images
   - Implement progressive loading

## Testing Strategy

### Backend Tests

1. **Unit Tests:**
   - PaymentService methods
   - StaggeredPaymentService methods
   - Model relationships and methods
   - Validation rules

2. **Integration Tests:**
   - API endpoints
   - Database transactions
   - File uploads
   - Payment workflows

### Frontend Tests

1. **Component Tests:**
   - Payment modals
   - Payment schedule setup
   - Verification modals
   - Form validation

2. **Integration Tests:**
   - Complete payment flows
   - Staggered payment creation
   - Payment verification workflow
   - PDO approval workflow

### End-to-End Tests

1. **Critical Paths:**
   - Create order with full payment
   - Create order with staggered payment
   - Verify GCash payment
   - Approve PDO payment
   - Record additional payment on existing order

## Deployment Considerations

### Database Migration

1. **Migration Order:**
   - Run migrations in sequence
   - Backup database before migration
   - Test on staging environment first

2. **Data Migration:**
   - Backfill existing sales with default values
   - Set `amount_paid` and `balance_remaining` for existing orders
   - Verify data integrity after migration

### Feature Rollout

1. **Phased Approach:**
   - Phase 1: Backend + database (no UI changes)
   - Phase 2: POS payment interface
   - Phase 3: Admin payment management
   - Phase 4: Full integration

2. **Feature Flags:**
   - Enable staggered payments gradually
   - Test with limited users first
   - Monitor for issues

### Monitoring

1. **Metrics to Track:**
   - Payment success/failure rates
   - Verification times
   - PDO approval times
   - System performance
   - Error rates

2. **Alerts:**
   - Failed payment processing
   - High number of unverified payments
   - PDO approvals pending > 24 hours
   - System errors

## Future Enhancements

1. **Automated Reminders:**
   - Email/SMS for due installments
   - Overdue payment notifications
   - Payment confirmation emails

2. **Late Fees:**
   - Automatic late fee calculation
   - Configurable grace periods
   - Late fee tracking

3. **Payment Analytics:**
   - Payment method trends
   - Customer payment behavior
   - Revenue forecasting
   - Aging reports

4. **Customer Portal:**
   - View payment schedules
   - Make online payments
   - Upload payment proofs
   - Payment history

5. **Integration:**
   - GCash API integration for auto-verification
   - Bank API integration for PDO
   - Accounting software integration
   - SMS gateway for notifications
