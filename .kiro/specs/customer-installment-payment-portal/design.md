# Design Document: Customer Installment Payment Portal

## Overview

The Customer Installment Payment Portal extends the existing payment system to enable customers to view their orders with installment payment plans and submit payments for pending installments through a self-service web portal. This feature bridges the gap between POS-initiated installment plans and customer payment fulfillment by providing a secure, authenticated interface for customers to manage their payment obligations.

### Key Capabilities

- Customer authentication and order viewing
- Self-service payment submission for GCash and PDO methods
- Payment proof and check image upload
- Admin verification workflow integration
- Real-time installment status updates
- Secure authorization and data isolation

### Integration with Existing System

This feature builds upon the existing simplified payment system, reusing:
- Payment and PaymentInstallment models
- PaymentService and StaggeredPaymentService
- Admin verification workflows (PaymentController, StaggeredPaymentController)
- Existing authentication infrastructure (Laravel Sanctum)

The portal adds new customer-facing API endpoints and frontend components while maintaining full compatibility with existing admin payment management interfaces.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Customer Portal (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   My Orders  │  │   Payment    │  │   Payment    │         │
│  │     List     │  │   Details    │  │  Submission  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│                     Customer API Client                         │
└────────────────────────────┼───────────────────────────────────┘
                             │ HTTPS/REST
                             │ (auth:sanctum + customer role)
┌────────────────────────────┼───────────────────────────────────┐
│                  Laravel Backend (Existing + New)               │
│  ┌──────────────────────────────────────────────────┐          │
│  │         New: CustomerPaymentController           │          │
│  │  - getMyOrders()                                 │          │
│  │  - getOrderDetails()                             │          │
│  │  - submitGCashPayment()                          │          │
│  │  - submitPDOPayment()                            │          │
│  └──────────────────────────────────────────────────┘          │
│                            │                                    │
│  ┌──────────────────────────────────────────────────┐          │
│  │    Existing: PaymentService (reused)             │          │
│  │    Existing: StaggeredPaymentService (reused)    │          │
│  └──────────────────────────────────────────────────┘          │
│                            │                                    │
│  ┌──────────────────────────────────────────────────┐          │
│  │    Existing Models (reused)                      │          │
│  │    - Sale, Payment, PaymentInstallment           │          │
│  │    - Customer, User                              │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────────────────┼───────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  MySQL Database │
                    │  (No new tables)│
                    └─────────────────┘
```


### Component Interaction Flow

```
Customer                Customer Portal          Backend API              Payment Service         Database
   │                           │                       │                         │                    │
   │  1. Login                 │                       │                         │                    │
   ├──────────────────────────>│                       │                         │                    │
   │                           │  POST /auth/login     │                         │                    │
   │                           ├──────────────────────>│                         │                    │
   │                           │  <token + user>       │                         │                    │
   │  <token received>         │<──────────────────────┤                         │                    │
   │<──────────────────────────┤                       │                         │                    │
   │                           │                       │                         │                    │
   │  2. View My Orders        │                       │                         │                    │
   ├──────────────────────────>│                       │                         │                    │
   │                           │  GET /customer/orders │                         │                    │
   │                           ├──────────────────────>│  Query sales by         │                    │
   │                           │                       │  customer_id            │                    │
   │                           │                       ├────────────────────────>│  SELECT * FROM     │
   │                           │                       │                         │  sales WHERE...    │
   │                           │                       │                         ├───────────────────>│
   │                           │  <orders + installments>                        │  <results>         │
   │  <display orders>         │<──────────────────────┤<────────────────────────┤<───────────────────┤
   │<──────────────────────────┤                       │                         │                    │
   │                           │                       │                         │                    │
   │  3. Submit GCash Payment  │                       │                         │                    │
   ├──────────────────────────>│                       │                         │                    │
   │                           │  POST /customer/      │                         │                    │
   │                           │  installments/{id}/   │                         │                    │
   │                           │  pay-gcash            │                         │                    │
   │                           ├──────────────────────>│  Validate ownership     │                    │
   │                           │                       │  & amount               │                    │
   │                           │                       ├────────────────────────>│  Store image       │
   │                           │                       │  recordGCashPayment()   │  Create payment    │
   │                           │                       │                         ├───────────────────>│
   │                           │  <confirmation>       │                         │  <payment record>  │
   │  <show confirmation>      │<──────────────────────┤<────────────────────────┤<───────────────────┤
   │<──────────────────────────┤                       │                         │                    │
   │                           │                       │                         │                    │
   │  4. Admin Verifies        │                       │                         │                    │
   │     (separate flow)       │                       │  POST /payments/{id}/   │                    │
   │                           │                       │  verify                 │                    │
   │                           │                       ├────────────────────────>│  Update payment    │
   │                           │                       │  verifyPayment()        │  Update installment│
   │                           │                       │                         │  Update sale       │
   │                           │                       │                         ├───────────────────>│
   │                           │                       │  <updated records>      │  <success>         │
   │                           │                       │<────────────────────────┤<───────────────────┤
   │                           │                       │                         │                    │
   │  5. View Updated Status   │                       │                         │                    │
   ├──────────────────────────>│                       │                         │                    │
   │                           │  GET /customer/orders │                         │                    │
   │                           ├──────────────────────>│  Query with updated     │                    │
   │                           │                       │  status                 │                    │
   │                           │                       ├────────────────────────>│  SELECT...         │
   │                           │                       │                         ├───────────────────>│
   │                           │  <orders with paid    │                         │  <results>         │
   │  <see "paid" status>      │   installment>        │                         │                    │
   │<──────────────────────────┤<──────────────────────┤<────────────────────────┤<───────────────────┤
```

## Database Schema

### No New Tables Required

This feature reuses the existing database schema from the simplified payment system. No new tables or columns are needed.

### Relevant Existing Tables

#### sales
```sql
-- Existing columns used by customer portal
id, transaction_id, customer_id, total, 
is_staggered, primary_method, amount_paid, 
balance_remaining, payment_status, created_at
```

#### payment_installments
```sql
-- Existing columns used by customer portal
id, sale_id, installment_number, amount_expected, 
amount_paid, payment_method, due_date, paid_date, 
status, pdo_check_number, pdo_check_bank, 
pdo_check_image, pdo_approval_status
```

#### payments
```sql
-- Existing columns used by customer portal
id, sale_id, installment_id, amount, payment_method, 
reference_number, payment_proof, status, paid_at, 
received_by, verified_by, verified_at
```

#### customers
```sql
-- Existing columns used for authentication
id, name, email, phone, address
```

#### users
```sql
-- Existing columns used for customer authentication
id, email, password, role (must be 'customer')
```

### Data Relationships

```
Customer (1) ──────> (N) Sales
                           │
                           ├──> (N) PaymentInstallments
                           │
                           └──> (N) Payments
```


## API Design

### New Customer-Facing Endpoints

All customer endpoints require `auth:sanctum` middleware and customer role validation.

#### 1. Get Customer Orders
```
GET /api/customer/orders
```

**Authentication:** Required (customer role)

**Query Parameters:**
- `status`: Filter by payment_status (optional: 'paid', 'partial', 'not_paid')
- `page`: Page number for pagination (default: 1)
- `per_page`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "transaction_id": "ORD-2026-04-24-001",
        "total": 100000.00,
        "amount_paid": 20000.00,
        "balance_remaining": 80000.00,
        "payment_status": "partial",
        "is_staggered": true,
        "primary_method": "mixed",
        "created_at": "2026-04-24T10:00:00Z",
        "installments": [
          {
            "id": 1,
            "installment_number": 1,
            "amount_expected": 20000.00,
            "amount_paid": 20000.00,
            "payment_method": "cash",
            "due_date": null,
            "paid_date": "2026-04-24",
            "status": "paid"
          },
          {
            "id": 2,
            "installment_number": 2,
            "amount_expected": 30000.00,
            "amount_paid": 0.00,
            "payment_method": "gcash",
            "due_date": "2026-05-15",
            "paid_date": null,
            "status": "pending"
          },
          {
            "id": 3,
            "installment_number": 3,
            "amount_expected": 50000.00,
            "amount_paid": 0.00,
            "payment_method": "pdo",
            "due_date": "2026-06-15",
            "paid_date": null,
            "status": "pending",
            "pdo_approval_status": "approved"
          }
        ]
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 5,
      "last_page": 1
    }
  }
}
```

**Authorization:** Returns only orders where `sale.customer_id` matches authenticated customer's ID.

#### 2. Get Order Details
```
GET /api/customer/orders/{orderId}
```

**Authentication:** Required (customer role)

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "transaction_id": "ORD-2026-04-24-001",
      "total": 100000.00,
      "amount_paid": 20000.00,
      "balance_remaining": 80000.00,
      "payment_status": "partial",
      "is_staggered": true,
      "created_at": "2026-04-24T10:00:00Z",
      "items": [
        {
          "product_name": "Premium Rice",
          "variety": "Jasmine",
          "quantity": 100,
          "unit_price": 1000.00,
          "subtotal": 100000.00
        }
      ],
      "installments": [ /* same as above */ ],
      "payment_history": [
        {
          "id": 1,
          "amount": 20000.00,
          "payment_method": "cash",
          "status": "verified",
          "paid_at": "2026-04-24T10:30:00Z",
          "verified_at": "2026-04-24T10:30:00Z"
        }
      ],
      "next_due_date": "2026-05-15",
      "next_due_amount": 30000.00
    }
  }
}
```

**Authorization:** Returns 403 if order doesn't belong to authenticated customer.


#### 3. Submit GCash Payment
```
POST /api/customer/installments/{installmentId}/pay-gcash
```

**Authentication:** Required (customer role)

**Request Body:**
```json
{
  "amount": 30000.00,
  "reference_number": "GC123456789",
  "payment_proof": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // base64 encoded image
}
```

**Validation Rules:**
- `amount`: required, numeric, must match installment.amount_expected
- `reference_number`: required, string, max 255 characters
- `payment_proof`: required, base64 image (JPEG, PNG, WebP), max 5MB

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 2,
      "amount": 30000.00,
      "payment_method": "gcash",
      "reference_number": "GC123456789",
      "status": "needs_verification",
      "paid_at": "2026-05-10T14:30:00Z"
    },
    "installment": {
      "id": 2,
      "status": "needs_verification",
      "amount_expected": 30000.00
    },
    "message": "Payment submitted successfully. Your payment will be verified by our team within 24 hours."
  }
}
```

**Authorization:** Returns 403 if installment doesn't belong to customer's order.

**Error Responses:**
- 400: Invalid amount (doesn't match installment)
- 403: Unauthorized (not customer's order)
- 422: Validation errors (missing fields, invalid image format)
- 409: Installment already paid

#### 4. Submit PDO Payment
```
POST /api/customer/installments/{installmentId}/pay-pdo
```

**Authentication:** Required (customer role)

**Request Body:**
```json
{
  "amount": 50000.00,
  "check_number": "12345",
  "bank_name": "BDO",
  "check_date": "2026-06-15",
  "check_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // base64 encoded image
}
```

**Validation Rules:**
- `amount`: required, numeric, must match installment.amount_expected
- `check_number`: required, string, max 255 characters
- `bank_name`: required, string, max 255 characters
- `check_date`: required, date, must be future date
- `check_image`: required, base64 image (JPEG, PNG, WebP), max 5MB

**Response:**
```json
{
  "success": true,
  "data": {
    "installment": {
      "id": 3,
      "status": "pending",
      "pdo_approval_status": "pending",
      "pdo_check_number": "12345",
      "pdo_check_bank": "BDO",
      "amount_expected": 50000.00
    },
    "message": "PDO check submitted successfully. Your check will be reviewed by our team for approval."
  }
}
```

**Authorization:** Returns 403 if installment doesn't belong to customer's order.

**Error Responses:**
- 400: Invalid amount or check date
- 403: Unauthorized (not customer's order)
- 422: Validation errors (missing fields, invalid image format)
- 409: Installment already has pending PDO or is paid

### Integration with Existing Admin Endpoints

The customer portal integrates with existing admin verification endpoints:

- `POST /api/payments/{payment}/verify` - Admin verifies GCash payment
- `POST /api/installments/{installment}/approve-pdo` - Admin approves PDO
- `POST /api/installments/{installment}/mark-paid` - Admin marks PDO as paid

These endpoints remain unchanged and continue to work as designed in the simplified payment system.


## Frontend Components

### Component Hierarchy

```
CustomerPortal
├── CustomerLayout
│   ├── CustomerHeader
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   └── CustomerSidebar (optional)
│
├── MyOrdersPage
│   ├── OrdersFilter
│   │   ├── StatusFilter
│   │   └── SearchBar
│   ├── OrdersList
│   │   └── OrderCard
│   │       ├── OrderSummary
│   │       ├── PaymentStatus
│   │       ├── InstallmentProgress
│   │       └── ViewDetailsButton
│   └── Pagination
│
├── OrderDetailsPage
│   ├── OrderHeader
│   │   ├── TransactionID
│   │   ├── OrderDate
│   │   └── TotalAmount
│   ├── OrderItems
│   │   └── ItemRow
│   ├── PaymentSummary
│   │   ├── AmountPaid
│   │   ├── BalanceRemaining
│   │   └── PaymentStatus
│   ├── InstallmentSchedule
│   │   └── InstallmentRow
│   │       ├── InstallmentInfo
│   │       ├── StatusBadge
│   │       └── PayNowButton (conditional)
│   └── PaymentHistory
│       └── PaymentHistoryItem
│
├── PaymentSubmissionModal
│   ├── PaymentMethodSelector
│   │   ├── GCashOption
│   │   └── PDOOption
│   ├── GCashPaymentForm (conditional)
│   │   ├── AmountDisplay (read-only)
│   │   ├── ReferenceNumberInput
│   │   ├── ImageUpload
│   │   └── SubmitButton
│   └── PDOPaymentForm (conditional)
│       ├── AmountDisplay (read-only)
│       ├── CheckNumberInput
│       ├── BankNameInput
│       ├── CheckDatePicker
│       ├── CheckImageUpload
│       └── SubmitButton
│
└── PaymentConfirmationModal
    ├── SuccessIcon
    ├── ConfirmationMessage
    ├── PaymentDetails
    └── CloseButton
```

### Key Component Specifications

#### MyOrdersPage.jsx
```jsx
const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all' });
  const [pagination, setPagination] = useState({ page: 1, perPage: 10 });

  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.page]);

  const fetchOrders = async () => {
    try {
      const response = await customerApi.getOrders({
        status: filters.status !== 'all' ? filters.status : undefined,
        page: pagination.page,
        per_page: pagination.perPage
      });
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-orders-page">
      <OrdersFilter filters={filters} onFilterChange={setFilters} />
      <OrdersList orders={orders} loading={loading} />
      <Pagination {...pagination} onPageChange={(page) => setPagination(prev => ({ ...prev, page }))} />
    </div>
  );
};
```

#### OrderDetailsPage.jsx
```jsx
const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await customerApi.getOrderDetails(orderId);
      setOrder(response.data.order);
    } catch (error) {
      if (error.response?.status === 403) {
        showError('You do not have permission to view this order');
        navigate('/customer/orders');
      } else {
        showError('Failed to load order details');
      }
    }
  };

  const handlePayNow = (installment) => {
    setSelectedInstallment(installment);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchOrderDetails(); // Refresh to show updated status
  };

  return (
    <div className="order-details-page">
      <OrderHeader order={order} />
      <OrderItems items={order?.items} />
      <PaymentSummary order={order} />
      <InstallmentSchedule 
        installments={order?.installments} 
        onPayNow={handlePayNow}
      />
      <PaymentHistory payments={order?.payment_history} />
      
      {showPaymentModal && (
        <PaymentSubmissionModal
          installment={selectedInstallment}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
```


#### PaymentSubmissionModal.jsx
```jsx
const PaymentSubmissionModal = ({ installment, onSuccess, onClose }) => {
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [formData, setFormData] = useState({
    amount: installment.amount_expected,
    reference_number: '',
    payment_proof: null,
    check_number: '',
    bank_name: '',
    check_date: '',
    check_image: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleImageUpload = (file, field) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [field]: 'Image must be less than 5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result }));
      setErrors(prev => ({ ...prev, [field]: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      if (paymentMethod === 'gcash') {
        await customerApi.submitGCashPayment(installment.id, {
          amount: formData.amount,
          reference_number: formData.reference_number,
          payment_proof: formData.payment_proof
        });
      } else {
        await customerApi.submitPDOPayment(installment.id, {
          amount: formData.amount,
          check_number: formData.check_number,
          bank_name: formData.bank_name,
          check_date: formData.check_date,
          check_image: formData.check_image
        });
      }

      showSuccess('Payment submitted successfully!');
      onSuccess();
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        showError(error.response?.data?.message || 'Failed to submit payment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>Submit Payment</h2>
        
        <PaymentMethodSelector
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={['gcash', 'pdo']}
        />

        {paymentMethod === 'gcash' ? (
          <GCashPaymentForm
            formData={formData}
            onChange={setFormData}
            onImageUpload={handleImageUpload}
            errors={errors}
          />
        ) : (
          <PDOPaymentForm
            formData={formData}
            onChange={setFormData}
            onImageUpload={handleImageUpload}
            errors={errors}
          />
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

### State Management

The customer portal uses React Context for state management:

```jsx
// CustomerPortalContext.js
const CustomerPortalContext = createContext();

export const CustomerPortalProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await customerApi.getOrders(filters);
      setOrders(response.data.orders);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    setLoading(true);
    try {
      const response = await customerApi.getOrderDetails(orderId);
      setCurrentOrder(response.data.order);
      return response.data.order;
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (installmentId, paymentData, method) => {
    if (method === 'gcash') {
      return await customerApi.submitGCashPayment(installmentId, paymentData);
    } else {
      return await customerApi.submitPDOPayment(installmentId, paymentData);
    }
  };

  return (
    <CustomerPortalContext.Provider value={{
      orders,
      currentOrder,
      loading,
      fetchOrders,
      fetchOrderDetails,
      submitPayment
    }}>
      {children}
    </CustomerPortalContext.Provider>
  );
};
```


## Security Design

### Authentication

**Customer Account Requirement:**
- Customers must have a user account with `role = 'customer'`
- Authentication uses existing Laravel Sanctum token-based system
- Customer accounts are created through:
  1. Self-registration flow (existing)
  2. Admin-initiated account creation for existing customers (existing)

**Login Flow:**
```
1. Customer enters email/password
2. POST /api/auth/login
3. Backend validates credentials
4. Backend checks role === 'customer'
5. Backend generates Sanctum token
6. Frontend stores token in localStorage
7. Token included in Authorization header for all subsequent requests
```

### Authorization

**Ownership Validation:**

All customer endpoints implement strict ownership checks:

```php
// CustomerPaymentController.php
public function getOrderDetails($orderId)
{
    $customer = auth()->user()->customer;
    
    $sale = Sale::with(['installments', 'payments', 'items'])
        ->where('id', $orderId)
        ->where('customer_id', $customer->id)
        ->firstOrFail(); // Returns 404 if not found or not owned
    
    return response()->json(['success' => true, 'data' => ['order' => $sale]]);
}

public function submitGCashPayment($installmentId, Request $request)
{
    $customer = auth()->user()->customer;
    
    $installment = PaymentInstallment::with('sale')
        ->where('id', $installmentId)
        ->whereHas('sale', function($query) use ($customer) {
            $query->where('customer_id', $customer->id);
        })
        ->firstOrFail(); // Returns 404 if not found or not owned
    
    // Proceed with payment submission...
}
```

**Middleware Stack:**
```php
Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    Route::prefix('customer')->group(function () {
        Route::get('/orders', [CustomerPaymentController::class, 'getOrders']);
        Route::get('/orders/{id}', [CustomerPaymentController::class, 'getOrderDetails']);
        Route::post('/installments/{id}/pay-gcash', [CustomerPaymentController::class, 'submitGCashPayment']);
        Route::post('/installments/{id}/pay-pdo', [CustomerPaymentController::class, 'submitPDOPayment']);
    });
});
```

### Data Protection

**Input Validation:**

All customer inputs are validated using Laravel Form Requests:

```php
// SubmitGCashPaymentRequest.php
class SubmitGCashPaymentRequest extends FormRequest
{
    public function rules()
    {
        return [
            'amount' => 'required|numeric|min:0',
            'reference_number' => 'required|string|max:255',
            'payment_proof' => 'required|string', // base64 image
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate amount matches installment
            $installment = $this->route('installment');
            if ($this->amount != $installment->amount_expected) {
                $validator->errors()->add('amount', 
                    'Payment amount must match installment amount of ₱' . 
                    number_format($installment->amount_expected, 2)
                );
            }

            // Validate installment is not already paid
            if ($installment->status === 'paid' || $installment->status === 'verified') {
                $validator->errors()->add('installment', 
                    'This installment has already been paid'
                );
            }

            // Validate base64 image
            if (!$this->isValidBase64Image($this->payment_proof)) {
                $validator->errors()->add('payment_proof', 
                    'Invalid image format. Please upload a valid JPEG or PNG image.'
                );
            }
        });
    }

    private function isValidBase64Image($base64)
    {
        if (!preg_match('/^data:image\/(jpeg|png|webp);base64,/', $base64)) {
            return false;
        }
        
        $imageData = substr($base64, strpos($base64, ',') + 1);
        $decoded = base64_decode($imageData, true);
        
        if ($decoded === false) {
            return false;
        }
        
        // Check file size (5MB max)
        if (strlen($decoded) > 5 * 1024 * 1024) {
            return false;
        }
        
        return true;
    }
}
```

**SQL Injection Prevention:**
- All queries use Eloquent ORM with parameter binding
- No raw SQL queries with user input
- whereHas() clauses for relationship filtering

**XSS Prevention:**
- All user inputs sanitized before storage
- Frontend uses React's built-in XSS protection
- API responses use JSON encoding


### File Upload Security

**Image Validation:**
```php
// In PaymentService or dedicated ImageService
public function validateAndStorePaymentProof($base64Image, $type = 'payment_proof')
{
    // 1. Validate format
    if (!preg_match('/^data:image\/(jpeg|png|webp);base64,/', $base64Image, $matches)) {
        throw new ValidationException('Invalid image format');
    }
    
    $extension = $matches[1];
    $imageData = substr($base64Image, strpos($base64Image, ',') + 1);
    $decoded = base64_decode($imageData, true);
    
    // 2. Validate size
    if (strlen($decoded) > 5 * 1024 * 1024) {
        throw new ValidationException('Image size exceeds 5MB limit');
    }
    
    // 3. Validate it's actually an image
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->buffer($decoded);
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!in_array($mimeType, $allowedMimes)) {
        throw new ValidationException('Invalid image type');
    }
    
    // 4. Generate secure filename
    $filename = uniqid('payment_', true) . '.' . $extension;
    $path = $type . '/' . date('Y/m/d') . '/' . $filename;
    
    // 5. Store in private storage
    Storage::disk('private')->put($path, $decoded);
    
    return $path;
}
```

**Storage Configuration:**
```php
// config/filesystems.php
'disks' => [
    'private' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'visibility' => 'private',
    ],
],
```

**Secure Image Access:**
```php
// Only admins can access payment proof images
Route::middleware(['auth:sanctum', 'role:admin,super_admin'])->group(function () {
    Route::get('/payment-proof/{path}', function ($path) {
        if (!Storage::disk('private')->exists($path)) {
            abort(404);
        }
        
        return response()->file(
            Storage::disk('private')->path($path)
        );
    })->where('path', '.*');
});
```

### Rate Limiting

**API Rate Limits:**
```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:api',
        // ...
    ],
];

// config/sanctum.php or RouteServiceProvider
RateLimiter::for('customer-payments', function (Request $request) {
    return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
});

// Apply to customer payment routes
Route::middleware(['auth:sanctum', 'role:customer', 'throttle:customer-payments'])
    ->group(function () {
        // Customer payment endpoints
    });
```

### HTTPS Enforcement

**Production Configuration:**
```php
// app/Providers/AppServiceProvider.php
public function boot()
{
    if ($this->app->environment('production')) {
        URL::forceScheme('https');
    }
}

// .env
APP_ENV=production
APP_URL=https://yourdomain.com
```

**Frontend API Client:**
```javascript
// api/client.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.yourdomain.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```


## Integration Points

### Integration with Existing Admin Workflows

The customer portal seamlessly integrates with existing admin payment management:

#### 1. Payment Verification Flow

```
Customer Submits GCash Payment
         │
         ├──> Creates Payment record (status: needs_verification)
         │
         └──> Appears in Admin Payment Transactions Tab
                     │
                     ├──> Admin views payment proof
                     │
                     ├──> Admin clicks "Verify"
                     │
                     └──> POST /api/payments/{id}/verify
                              │
                              ├──> Updates Payment (status: verified)
                              ├──> Updates PaymentInstallment (status: paid)
                              ├──> Updates Sale (amount_paid, balance_remaining)
                              │
                              └──> Customer sees updated status on next refresh
```

#### 2. PDO Approval Flow

```
Customer Submits PDO Check
         │
         ├──> Updates PaymentInstallment (pdo_approval_status: pending)
         │
         └──> Appears in Admin PDO Tab
                     │
                     ├──> Admin views check image and details
                     │
                     ├──> Admin clicks "Approve"
                     │
                     └──> POST /api/installments/{id}/approve-pdo
                              │
                              ├──> Updates PaymentInstallment (pdo_approval_status: approved)
                              │
                              └──> Customer sees "Approved - Awaiting Payment" status
                                          │
                                          └──> When check clears:
                                                   │
                                                   └──> Admin clicks "Mark as Paid"
                                                            │
                                                            ├──> Creates Payment record
                                                            ├──> Updates PaymentInstallment (status: paid)
                                                            ├──> Updates Sale balances
                                                            │
                                                            └──> Customer sees "Paid" status
```

### Integration with Existing Payment Service

The customer portal reuses existing PaymentService methods:

```php
// CustomerPaymentController.php
class CustomerPaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService,
        private StaggeredPaymentService $staggeredPaymentService
    ) {}

    public function submitGCashPayment($installmentId, SubmitGCashPaymentRequest $request)
    {
        $customer = auth()->user()->customer;
        $installment = $this->validateInstallmentOwnership($installmentId, $customer->id);
        
        // Reuse existing PaymentService
        $payment = $this->paymentService->recordGCashPayment(
            $installment->sale,
            [
                'installment_id' => $installment->id,
                'amount' => $request->amount,
                'reference_number' => $request->reference_number,
                'payment_proof' => [$request->payment_proof],
            ]
        );
        
        return response()->json([
            'success' => true,
            'data' => [
                'payment' => new PaymentResource($payment),
                'installment' => new PaymentInstallmentResource($installment->fresh()),
            ],
            'message' => 'Payment submitted successfully. Your payment will be verified by our team within 24 hours.'
        ]);
    }

    public function submitPDOPayment($installmentId, SubmitPDOPaymentRequest $request)
    {
        $customer = auth()->user()->customer;
        $installment = $this->validateInstallmentOwnership($installmentId, $customer->id);
        
        // Reuse existing PaymentService
        $this->paymentService->recordPDOPayment(
            $installment->sale,
            $installment,
            [
                'check_number' => $request->check_number,
                'bank_name' => $request->bank_name,
                'check_date' => $request->check_date,
                'check_image' => [$request->check_image],
            ]
        );
        
        return response()->json([
            'success' => true,
            'data' => [
                'installment' => new PaymentInstallmentResource($installment->fresh()),
            ],
            'message' => 'PDO check submitted successfully. Your check will be reviewed by our team for approval.'
        ]);
    }

    private function validateInstallmentOwnership($installmentId, $customerId)
    {
        return PaymentInstallment::with('sale')
            ->where('id', $installmentId)
            ->whereHas('sale', function($query) use ($customerId) {
                $query->where('customer_id', $customerId);
            })
            ->firstOrFail();
    }
}
```

### No Changes Required to Existing Code

The customer portal is designed as an additive feature:

- **No modifications** to existing PaymentService
- **No modifications** to existing StaggeredPaymentService
- **No modifications** to existing admin controllers
- **No modifications** to existing database schema
- **No modifications** to existing admin frontend components

All integration happens through:
1. New customer-facing controller (CustomerPaymentController)
2. New customer-facing routes (under /api/customer prefix)
3. New customer-facing frontend components (separate from admin UI)
4. Reuse of existing services and models


## Data Models

### Existing Models (Reused)

All models from the simplified payment system are reused without modification:

#### Sale Model
```php
// Existing relationships used by customer portal
public function customer() // Get customer info
public function items() // Display order items
public function payments() // Show payment history
public function paymentInstallments() // Show installment schedule

// Existing methods used by customer portal
public function isFullyPaid() // Check if order is complete
public function calculatePaymentStatus() // Determine payment status
```

#### PaymentInstallment Model
```php
// Existing relationships used by customer portal
public function sale() // Link to order
public function payment() // Link to payment record

// Existing methods used by customer portal
public function isDue() // Check if installment is due
public function isOverdue() // Check if installment is overdue
public function isPDO() // Check if PDO payment method
```

#### Payment Model
```php
// Existing relationships used by customer portal
public function sale() // Link to order
public function installment() // Link to installment

// Existing scopes used by customer portal
public function scopeVerified() // Filter verified payments
public function scopePending() // Filter pending payments
```

#### Customer Model
```php
// Existing relationships used by customer portal
public function sales() // Get all customer orders
public function user() // Link to user account for authentication
```

### API Resources

New API resources for customer portal responses:

```php
// CustomerOrderResource.php
class CustomerOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'total' => (float) $this->total,
            'amount_paid' => (float) $this->amount_paid,
            'balance_remaining' => (float) $this->balance_remaining,
            'payment_status' => $this->payment_status,
            'is_staggered' => $this->is_staggered,
            'primary_method' => $this->primary_method,
            'created_at' => $this->created_at->toISOString(),
            'installments' => PaymentInstallmentResource::collection($this->whenLoaded('paymentInstallments')),
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
            'payment_history' => PaymentResource::collection($this->whenLoaded('payments')),
            'next_due_date' => $this->getNextDueDate(),
            'next_due_amount' => $this->getNextDueAmount(),
        ];
    }

    private function getNextDueDate()
    {
        $nextInstallment = $this->paymentInstallments
            ->where('status', 'pending')
            ->sortBy('due_date')
            ->first();
        
        return $nextInstallment?->due_date?->format('Y-m-d');
    }

    private function getNextDueAmount()
    {
        $nextInstallment = $this->paymentInstallments
            ->where('status', 'pending')
            ->sortBy('due_date')
            ->first();
        
        return $nextInstallment ? (float) $nextInstallment->amount_expected : null;
    }
}

// CustomerPaymentInstallmentResource.php
class CustomerPaymentInstallmentResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'installment_number' => $this->installment_number,
            'amount_expected' => (float) $this->amount_expected,
            'amount_paid' => (float) $this->amount_paid,
            'payment_method' => $this->payment_method,
            'due_date' => $this->due_date?->format('Y-m-d'),
            'paid_date' => $this->paid_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
            'can_pay' => $this->canCustomerPay(),
            'pdo_approval_status' => $this->when(
                $this->isPDO(),
                $this->pdo_approval_status
            ),
        ];
    }

    private function canCustomerPay()
    {
        // Customer can pay if:
        // 1. Status is pending
        // 2. Not a PDO (PDO is submitted, not paid directly)
        // 3. Not already paid
        return $this->status === 'pending' && 
               !$this->isPDO() && 
               $this->amount_paid == 0;
    }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Customer Order Isolation

*For any* authenticated customer, querying their orders should return only orders where the customer_id matches their account, and attempting to access another customer's order should return an authorization error.

**Validates: Requirements 1.1, 1.5, 2.2**

### Property 2: Order Data Completeness

*For any* order returned to a customer, the response should include total amount, payment plan type (is_staggered), remaining balance, and all associated installments with their status information.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 3: Image Format Validation

*For any* image upload (payment proof or check image), the system should accept valid JPEG, PNG, or WebP formats under 5MB and reject invalid formats or oversized files.

**Validates: Requirements 3.3, 4.3**

### Property 4: GCash Payment Creation

*For any* valid GCash payment submission with proof, the system should create a Payment record with status "needs_verification" and not update the sale balance until admin verification.

**Validates: Requirements 3.4, 6.1**

### Property 5: PDO Payment Creation

*For any* valid PDO payment submission with check details, the system should update the PaymentInstallment record with pdo_approval_status "pending" and not create a Payment record until admin approval and marking as paid.

**Validates: Requirements 4.4, 7.1**

### Property 6: Payment Amount Validation

*For any* payment submission, if the payment amount does not exactly match the installment's amount_expected, the system should reject the submission with a validation error.

**Validates: Requirements 5.1, 5.2**

### Property 7: Payment Proof Accessibility

*For any* submitted payment, the payment proof image should be stored securely and accessible only to authenticated admin users, not to customers or unauthenticated users.

**Validates: Requirements 3.6, 4.6, 6.2, 12.4**

### Property 8: Payment Verification State Transition

*For any* payment with status "needs_verification", when an admin verifies it, the system should update the payment status to "verified", update the installment status to "paid", and update the sale's amount_paid and balance_remaining.

**Validates: Requirements 6.3, 8.1, 8.3**

### Property 9: Payment Rejection Handling

*For any* payment with status "needs_verification", when an admin rejects it, the system should update the payment status to "cancelled" and not modify the sale balances or installment status.

**Validates: Requirements 6.4, 7.4**

### Property 10: PDO Check Data Completeness

*For any* PDO installment submission, the system should store and return all required fields: check_number, bank_name, check_date, and check_image.

**Validates: Requirements 7.2**

### Property 11: Order Completion Detection

*For any* order with installments, when all installments have status "paid" or "verified", the system should update the order's payment_status to "paid" and balance_remaining to 0.

**Validates: Requirements 8.4**

### Property 12: Customer Payment Method Restriction

*For any* customer-initiated payment submission, the system should accept only "gcash" or "pdo" payment methods and reject "cash" submissions, while admin-initiated payments should accept all three methods.

**Validates: Requirements 9.1, 9.3**

### Property 13: Paid Installment Protection

*For any* installment with status "paid" or "verified", attempting to submit another payment for that installment should be rejected with an error.

**Validates: Requirements 10.2**

### Property 14: Installment Chronological Ordering

*For any* order with multiple installments, the API should return installments sorted by due_date in ascending order (earliest first).

**Validates: Requirements 10.3**

### Property 15: Input Sanitization

*For any* user input (reference numbers, check numbers, bank names), the system should sanitize the input to prevent SQL injection and XSS attacks.

**Validates: Requirements 11.4**

### Property 16: Payment Proof Filename Uniqueness

*For any* two payment proof uploads, even if uploaded simultaneously, the system should generate unique filenames to prevent file collisions.

**Validates: Requirements 12.2**

### Property 17: Payment Proof Association

*For any* payment record, the payment_proof field should correctly reference the stored image file path, allowing retrieval of the proof image.

**Validates: Requirements 12.3**

### Property 18: Manual Payment Immediate Verification

*For any* admin-created manual payment, the payment status should be set to "verified" immediately, and the installment status should be updated to "paid" without requiring a separate verification step.

**Validates: Requirements 13.3**

### Property 19: Manual Payment Audit Trail

*For any* manually recorded payment, the payment record should include the received_by field set to the admin user's ID who created the payment.

**Validates: Requirements 13.4**

### Property 20: Order Details Completeness

*For any* order details request, the response should include order date, order items, total amount, payment plan details, payment history, remaining balance, and next due date.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 21: Payment Submission Confirmation

*For any* successful payment submission, the API response should include the payment amount, payment method, and a unique payment ID or reference number.

**Validates: Requirements 15.2, 15.4**

### Property 22: Post-Submission Status Update

*For any* payment submission, the installment status should be updated to reflect "needs_verification" for GCash or "pending" (with pdo_approval_status) for PDO immediately after submission.

**Validates: Requirements 15.3**


## Error Handling

### Backend Error Responses

All API endpoints return consistent error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": {
    "field_name": ["Specific validation error"]
  }
}
```

### Error Codes and Handling

#### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Unauthenticated. Please log in to continue."
}
```

**Frontend Handling:**
- Clear stored auth token
- Redirect to login page
- Show login prompt

#### Authorization Errors (403)
```json
{
  "success": false,
  "message": "You do not have permission to access this order."
}
```

**Frontend Handling:**
- Show error message
- Redirect to orders list
- Log security event

#### Validation Errors (422)
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "amount": ["Payment amount must match installment amount of ₱30,000.00"],
    "payment_proof": ["The payment proof field is required."],
    "reference_number": ["The reference number field is required."]
  }
}
```

**Frontend Handling:**
- Display field-specific errors below inputs
- Highlight invalid fields
- Keep form data for correction

#### Conflict Errors (409)
```json
{
  "success": false,
  "message": "This installment has already been paid."
}
```

**Frontend Handling:**
- Show error message
- Refresh order details
- Disable payment button

#### Not Found Errors (404)
```json
{
  "success": false,
  "message": "Order not found or you do not have permission to access it."
}
```

**Frontend Handling:**
- Show error message
- Redirect to orders list

#### Server Errors (500)
```json
{
  "success": false,
  "message": "An unexpected error occurred. Please try again later."
}
```

**Frontend Handling:**
- Show generic error message
- Log error details for debugging
- Provide retry option

### Frontend Error Handling Pattern

```javascript
// api/customerApi.js
export const submitGCashPayment = async (installmentId, paymentData) => {
  try {
    const response = await apiClient.post(
      `/customer/installments/${installmentId}/pay-gcash`,
      paymentData
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Handle authentication error
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
          
        case 403:
          throw new Error(data.message || 'You do not have permission to perform this action.');
          
        case 422:
          // Validation errors - throw with errors object
          const validationError = new Error(data.message || 'Validation failed');
          validationError.errors = data.errors;
          throw validationError;
          
        case 409:
          throw new Error(data.message || 'This action cannot be completed.');
          
        case 500:
          throw new Error('Server error. Please try again later.');
          
        default:
          throw new Error(data.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Network error. Please check your connection.');
    } else {
      // Error in request setup
      throw new Error('An unexpected error occurred.');
    }
  }
};

// Component usage
const handleSubmit = async () => {
  try {
    await customerApi.submitGCashPayment(installmentId, formData);
    showSuccess('Payment submitted successfully!');
    onSuccess();
  } catch (error) {
    if (error.errors) {
      // Validation errors - show field-specific errors
      setFieldErrors(error.errors);
    } else {
      // General error - show toast/alert
      showError(error.message);
    }
  }
};
```

### Logging and Monitoring

**Backend Logging:**
```php
// Log all customer payment submissions
Log::channel('payments')->info('Customer payment submission', [
    'customer_id' => $customer->id,
    'installment_id' => $installmentId,
    'payment_method' => $request->payment_method,
    'amount' => $request->amount,
    'ip_address' => $request->ip(),
]);

// Log errors
Log::channel('payments')->error('Payment submission failed', [
    'customer_id' => $customer->id,
    'error' => $exception->getMessage(),
    'trace' => $exception->getTraceAsString(),
]);
```

**Frontend Error Tracking:**
```javascript
// Send errors to monitoring service (e.g., Sentry)
const logError = (error, context) => {
  if (window.Sentry) {
    Sentry.captureException(error, {
      extra: context
    });
  }
  console.error('Error:', error, context);
};
```


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs using randomized test data

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Backend Testing

#### Unit Tests

**Controller Tests:**
```php
// tests/Feature/CustomerPaymentControllerTest.php
class CustomerPaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_view_only_their_orders()
    {
        $customer1 = Customer::factory()->create();
        $customer2 = Customer::factory()->create();
        $user1 = User::factory()->customer()->create(['email' => $customer1->email]);
        
        $order1 = Sale::factory()->create(['customer_id' => $customer1->id]);
        $order2 = Sale::factory()->create(['customer_id' => $customer2->id]);
        
        $response = $this->actingAs($user1)->getJson('/api/customer/orders');
        
        $response->assertOk();
        $this->assertCount(1, $response->json('data.orders'));
        $this->assertEquals($order1->id, $response->json('data.orders.0.id'));
    }

    public function test_customer_cannot_access_another_customers_order()
    {
        $customer1 = Customer::factory()->create();
        $customer2 = Customer::factory()->create();
        $user1 = User::factory()->customer()->create(['email' => $customer1->email]);
        
        $order2 = Sale::factory()->create(['customer_id' => $customer2->id]);
        
        $response = $this->actingAs($user1)->getJson("/api/customer/orders/{$order2->id}");
        
        $response->assertNotFound();
    }

    public function test_gcash_payment_submission_creates_pending_payment()
    {
        $customer = Customer::factory()->create();
        $user = User::factory()->customer()->create(['email' => $customer->email]);
        $sale = Sale::factory()->create(['customer_id' => $customer->id]);
        $installment = PaymentInstallment::factory()->create([
            'sale_id' => $sale->id,
            'amount_expected' => 30000,
            'status' => 'pending'
        ]);
        
        $response = $this->actingAs($user)->postJson(
            "/api/customer/installments/{$installment->id}/pay-gcash",
            [
                'amount' => 30000,
                'reference_number' => 'GC123456789',
                'payment_proof' => 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
            ]
        );
        
        $response->assertOk();
        $this->assertDatabaseHas('payments', [
            'sale_id' => $sale->id,
            'installment_id' => $installment->id,
            'amount' => 30000,
            'payment_method' => 'gcash',
            'status' => 'needs_verification'
        ]);
    }

    public function test_payment_amount_must_match_installment_amount()
    {
        $customer = Customer::factory()->create();
        $user = User::factory()->customer()->create(['email' => $customer->email]);
        $sale = Sale::factory()->create(['customer_id' => $customer->id]);
        $installment = PaymentInstallment::factory()->create([
            'sale_id' => $sale->id,
            'amount_expected' => 30000,
            'status' => 'pending'
        ]);
        
        $response = $this->actingAs($user)->postJson(
            "/api/customer/installments/{$installment->id}/pay-gcash",
            [
                'amount' => 25000, // Wrong amount
                'reference_number' => 'GC123456789',
                'payment_proof' => 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
            ]
        );
        
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['amount']);
    }

    public function test_cannot_pay_already_paid_installment()
    {
        $customer = Customer::factory()->create();
        $user = User::factory()->customer()->create(['email' => $customer->email]);
        $sale = Sale::factory()->create(['customer_id' => $customer->id]);
        $installment = PaymentInstallment::factory()->create([
            'sale_id' => $sale->id,
            'amount_expected' => 30000,
            'status' => 'paid' // Already paid
        ]);
        
        $response = $this->actingAs($user)->postJson(
            "/api/customer/installments/{$installment->id}/pay-gcash",
            [
                'amount' => 30000,
                'reference_number' => 'GC123456789',
                'payment_proof' => 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
            ]
        );
        
        $response->assertStatus(422);
    }
}
```

**Service Tests:**
```php
// tests/Unit/PaymentServiceTest.php
class PaymentServiceTest extends TestCase
{
    public function test_gcash_payment_does_not_update_sale_balance_until_verified()
    {
        $sale = Sale::factory()->create([
            'total' => 100000,
            'amount_paid' => 0,
            'balance_remaining' => 100000
        ]);
        
        $service = new PaymentService();
        $payment = $service->recordGCashPayment($sale, [
            'amount' => 30000,
            'reference_number' => 'GC123',
            'payment_proof' => ['proof.jpg']
        ]);
        
        $this->assertEquals('needs_verification', $payment->status);
        $this->assertEquals(0, $sale->fresh()->amount_paid);
        $this->assertEquals(100000, $sale->fresh()->balance_remaining);
    }

    public function test_verifying_payment_updates_sale_balance()
    {
        $sale = Sale::factory()->create([
            'total' => 100000,
            'amount_paid' => 0,
            'balance_remaining' => 100000
        ]);
        
        $payment = Payment::factory()->create([
            'sale_id' => $sale->id,
            'amount' => 30000,
            'status' => 'needs_verification'
        ]);
        
        $service = new PaymentService();
        $service->verifyPayment($payment);
        
        $this->assertEquals('verified', $payment->fresh()->status);
        $this->assertEquals(30000, $sale->fresh()->amount_paid);
        $this->assertEquals(70000, $sale->fresh()->balance_remaining);
    }
}
```


#### Property-Based Tests

Property-based tests use a library like **Pest with Faker** or **PHPUnit with data providers** to generate random test data and verify properties hold across all inputs. Each test should run a minimum of 100 iterations.

```php
// tests/Property/CustomerPaymentPropertiesTest.php
use Illuminate\Foundation\Testing\RefreshDatabase;

class CustomerPaymentPropertiesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Feature: customer-installment-payment-portal, Property 1: Customer Order Isolation
     * 
     * For any authenticated customer, querying their orders should return only orders 
     * where the customer_id matches their account.
     */
    public function test_property_customer_order_isolation()
    {
        for ($i = 0; $i < 100; $i++) {
            $this->refreshDatabase();
            
            // Generate random customers and orders
            $numCustomers = rand(2, 5);
            $customers = Customer::factory()->count($numCustomers)->create();
            
            foreach ($customers as $customer) {
                $numOrders = rand(0, 5);
                Sale::factory()->count($numOrders)->create(['customer_id' => $customer->id]);
            }
            
            // Pick a random customer to authenticate as
            $testCustomer = $customers->random();
            $user = User::factory()->customer()->create(['email' => $testCustomer->email]);
            
            // Query orders
            $response = $this->actingAs($user)->getJson('/api/customer/orders');
            
            // Verify all returned orders belong to this customer
            $response->assertOk();
            $returnedOrders = $response->json('data.orders');
            
            foreach ($returnedOrders as $order) {
                $this->assertEquals($testCustomer->id, $order['customer_id'] ?? 
                    Sale::find($order['id'])->customer_id);
            }
        }
    }

    /**
     * Feature: customer-installment-payment-portal, Property 6: Payment Amount Validation
     * 
     * For any payment submission, if the payment amount does not exactly match 
     * the installment's amount_expected, the system should reject the submission.
     */
    public function test_property_payment_amount_validation()
    {
        for ($i = 0; $i < 100; $i++) {
            $this->refreshDatabase();
            
            $customer = Customer::factory()->create();
            $user = User::factory()->customer()->create(['email' => $customer->email]);
            $sale = Sale::factory()->create(['customer_id' => $customer->id]);
            
            // Random installment amount
            $expectedAmount = rand(1000, 100000);
            $installment = PaymentInstallment::factory()->create([
                'sale_id' => $sale->id,
                'amount_expected' => $expectedAmount,
                'status' => 'pending'
            ]);
            
            // Generate wrong amount (different from expected)
            $wrongAmount = $expectedAmount + rand(-500, 500);
            if ($wrongAmount == $expectedAmount) {
                $wrongAmount += 100; // Ensure it's different
            }
            
            $response = $this->actingAs($user)->postJson(
                "/api/customer/installments/{$installment->id}/pay-gcash",
                [
                    'amount' => $wrongAmount,
                    'reference_number' => 'GC' . rand(100000, 999999),
                    'payment_proof' => $this->generateValidBase64Image()
                ]
            );
            
            // Should be rejected
            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['amount']);
        }
    }

    /**
     * Feature: customer-installment-payment-portal, Property 8: Payment Verification State Transition
     * 
     * For any payment with status "needs_verification", when an admin verifies it,
     * the system should update payment status, installment status, and sale balances.
     */
    public function test_property_payment_verification_state_transition()
    {
        for ($i = 0; $i < 100; $i++) {
            $this->refreshDatabase();
            
            // Random sale and installment amounts
            $totalAmount = rand(10000, 200000);
            $installmentAmount = rand(1000, $totalAmount);
            
            $sale = Sale::factory()->create([
                'total' => $totalAmount,
                'amount_paid' => 0,
                'balance_remaining' => $totalAmount,
                'payment_status' => 'not_paid'
            ]);
            
            $installment = PaymentInstallment::factory()->create([
                'sale_id' => $sale->id,
                'amount_expected' => $installmentAmount,
                'status' => 'pending'
            ]);
            
            $payment = Payment::factory()->create([
                'sale_id' => $sale->id,
                'installment_id' => $installment->id,
                'amount' => $installmentAmount,
                'status' => 'needs_verification'
            ]);
            
            // Admin verifies payment
            $admin = User::factory()->admin()->create();
            $service = new PaymentService();
            $this->actingAs($admin);
            $service->verifyPayment($payment);
            
            // Verify state transitions
            $this->assertEquals('verified', $payment->fresh()->status);
            $this->assertEquals('paid', $installment->fresh()->status);
            $this->assertEquals($installmentAmount, $sale->fresh()->amount_paid);
            $this->assertEquals($totalAmount - $installmentAmount, $sale->fresh()->balance_remaining);
        }
    }

    /**
     * Feature: customer-installment-payment-portal, Property 14: Installment Chronological Ordering
     * 
     * For any order with multiple installments, the API should return installments 
     * sorted by due_date in ascending order.
     */
    public function test_property_installment_chronological_ordering()
    {
        for ($i = 0; $i < 100; $i++) {
            $this->refreshDatabase();
            
            $customer = Customer::factory()->create();
            $user = User::factory()->customer()->create(['email' => $customer->email]);
            $sale = Sale::factory()->create(['customer_id' => $customer->id]);
            
            // Create random number of installments with random dates
            $numInstallments = rand(2, 6);
            $installments = [];
            
            for ($j = 0; $j < $numInstallments; $j++) {
                $installments[] = PaymentInstallment::factory()->create([
                    'sale_id' => $sale->id,
                    'installment_number' => $j + 1,
                    'due_date' => now()->addDays(rand(1, 365))
                ]);
            }
            
            // Query order details
            $response = $this->actingAs($user)->getJson("/api/customer/orders/{$sale->id}");
            
            $response->assertOk();
            $returnedInstallments = $response->json('data.order.installments');
            
            // Verify chronological ordering
            for ($k = 1; $k < count($returnedInstallments); $k++) {
                $prevDate = $returnedInstallments[$k - 1]['due_date'];
                $currDate = $returnedInstallments[$k]['due_date'];
                
                if ($prevDate && $currDate) {
                    $this->assertLessThanOrEqual($currDate, $prevDate);
                }
            }
        }
    }

    private function generateValidBase64Image()
    {
        // Generate a minimal valid JPEG base64 string
        $imageData = base64_encode(file_get_contents(
            resource_path('test-assets/sample-payment-proof.jpg')
        ));
        return "data:image/jpeg;base64,{$imageData}";
    }
}
```

### Frontend Testing

#### Component Tests

```javascript
// src/components/__tests__/PaymentSubmissionModal.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentSubmissionModal from '../PaymentSubmissionModal';
import * as customerApi from '../../api/customerApi';

jest.mock('../../api/customerApi');

describe('PaymentSubmissionModal', () => {
  const mockInstallment = {
    id: 1,
    amount_expected: 30000,
    payment_method: 'gcash',
    status: 'pending'
  };

  it('validates required fields before submission', async () => {
    render(
      <PaymentSubmissionModal
        installment={mockInstallment}
        onSuccess={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const submitButton = screen.getByText('Submit Payment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/reference number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/payment proof is required/i)).toBeInTheDocument();
    });
  });

  it('submits GCash payment with valid data', async () => {
    customerApi.submitGCashPayment.mockResolvedValue({
      success: true,
      data: { payment: { id: 1 } }
    });

    const onSuccess = jest.fn();
    render(
      <PaymentSubmissionModal
        installment={mockInstallment}
        onSuccess={onSuccess}
        onClose={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/reference number/i), {
      target: { value: 'GC123456789' }
    });

    // Simulate file upload
    const file = new File(['dummy'], 'proof.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/upload payment proof/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByText('Submit Payment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(customerApi.submitGCashPayment).toHaveBeenCalledWith(
        mockInstallment.id,
        expect.objectContaining({
          amount: 30000,
          reference_number: 'GC123456789'
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message on submission failure', async () => {
    customerApi.submitGCashPayment.mockRejectedValue({
      message: 'Payment amount does not match installment amount'
    });

    render(
      <PaymentSubmissionModal
        installment={mockInstallment}
        onSuccess={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/reference number/i), {
      target: { value: 'GC123456789' }
    });

    const submitButton = screen.getByText('Submit Payment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/payment amount does not match/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/customerPaymentFlow.test.js
describe('Customer Payment Flow Integration', () => {
  it('completes full GCash payment submission flow', async () => {
    // 1. Customer logs in
    const loginResponse = await api.post('/auth/login', {
      email: 'customer@example.com',
      password: 'password'
    });
    const token = loginResponse.data.token;

    // 2. Customer views orders
    const ordersResponse = await api.get('/customer/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(ordersResponse.data.success).toBe(true);
    const order = ordersResponse.data.data.orders[0];

    // 3. Customer submits payment
    const paymentResponse = await api.post(
      `/customer/installments/${order.installments[0].id}/pay-gcash`,
      {
        amount: order.installments[0].amount_expected,
        reference_number: 'GC123456789',
        payment_proof: 'data:image/jpeg;base64,...'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(paymentResponse.data.success).toBe(true);

    // 4. Verify payment appears in admin panel
    const adminToken = await getAdminToken();
    const paymentsResponse = await api.get('/payments?status=needs_verification', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const submittedPayment = paymentsResponse.data.data.find(
      p => p.reference_number === 'GC123456789'
    );
    expect(submittedPayment).toBeDefined();
  });
});
```

### Test Configuration

**Property-Based Test Configuration:**
- Minimum 100 iterations per property test
- Use database transactions for isolation
- Generate realistic random data using factories
- Each property test must reference its design document property in a comment

**Test Coverage Goals:**
- Backend: 80%+ code coverage
- Frontend: 70%+ code coverage
- All correctness properties: 100% coverage


## Deployment Considerations

### Prerequisites

Before deploying the customer portal:

1. **Existing Payment System:** The simplified payment system must be fully deployed and operational
2. **Customer Accounts:** Customers must have user accounts with `role = 'customer'`
3. **HTTPS:** SSL certificate must be configured for secure communication
4. **Storage:** Private storage disk must be configured for payment proof images

### Deployment Steps

#### Phase 1: Backend API (Week 1)

1. **Create New Controller:**
   ```bash
   php artisan make:controller CustomerPaymentController
   ```

2. **Add Routes:**
   - Add customer-facing routes to `routes/api.php`
   - Apply `auth:sanctum` and `role:customer` middleware

3. **Create Form Requests:**
   ```bash
   php artisan make:request SubmitGCashPaymentRequest
   php artisan make:request SubmitPDOPaymentRequest
   ```

4. **Create API Resources:**
   ```bash
   php artisan make:resource CustomerOrderResource
   php artisan make:resource CustomerPaymentInstallmentResource
   ```

5. **Configure Storage:**
   - Ensure `storage/app/private` directory exists
   - Set proper permissions (755 for directories, 644 for files)

6. **Test Backend:**
   - Run unit tests: `php artisan test --filter CustomerPayment`
   - Run property tests: `php artisan test --filter Property`
   - Test API endpoints with Postman/Insomnia

#### Phase 2: Frontend Components (Week 2)

1. **Create Customer Portal Routes:**
   ```javascript
   // src/routes/customerRoutes.js
   {
     path: '/customer',
     element: <CustomerLayout />,
     children: [
       { path: 'orders', element: <MyOrdersPage /> },
       { path: 'orders/:orderId', element: <OrderDetailsPage /> }
     ]
   }
   ```

2. **Create API Client:**
   ```javascript
   // src/api/customerApi.js
   export const getOrders = (filters) => { /* ... */ };
   export const getOrderDetails = (orderId) => { /* ... */ };
   export const submitGCashPayment = (installmentId, data) => { /* ... */ };
   export const submitPDOPayment = (installmentId, data) => { /* ... */ };
   ```

3. **Build Components:**
   - MyOrdersPage
   - OrderDetailsPage
   - PaymentSubmissionModal
   - Supporting components

4. **Test Frontend:**
   - Run component tests: `npm test`
   - Manual testing in development environment
   - Cross-browser testing

#### Phase 3: Integration Testing (Week 3)

1. **End-to-End Testing:**
   - Test complete customer payment flow
   - Test admin verification flow
   - Test error scenarios

2. **Security Testing:**
   - Verify authorization checks
   - Test file upload security
   - Verify HTTPS enforcement

3. **Performance Testing:**
   - Load test API endpoints
   - Test with multiple concurrent users
   - Verify database query performance

#### Phase 4: Production Deployment (Week 4)

1. **Database Backup:**
   ```bash
   php artisan db:backup
   ```

2. **Deploy Backend:**
   ```bash
   git pull origin main
   composer install --no-dev --optimize-autoloader
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

3. **Deploy Frontend:**
   ```bash
   npm run build
   # Copy build files to web server
   ```

4. **Verify Deployment:**
   - Test customer login
   - Test order viewing
   - Test payment submission
   - Test admin verification

5. **Monitor:**
   - Check error logs
   - Monitor API response times
   - Track payment submission success rate

### Rollback Plan

If issues are discovered after deployment:

1. **Backend Rollback:**
   ```bash
   git revert <commit-hash>
   composer install
   php artisan config:clear
   php artisan route:clear
   ```

2. **Frontend Rollback:**
   - Restore previous build files
   - Clear CDN cache if applicable

3. **Database Rollback:**
   - No database changes required (feature uses existing schema)
   - If data corruption occurs, restore from backup

### Post-Deployment Monitoring

**Metrics to Track:**
- Customer payment submission rate
- Payment verification time (admin)
- API error rate
- Page load times
- User session duration

**Alerts to Configure:**
- High API error rate (>5%)
- Slow API response times (>2 seconds)
- Failed payment submissions
- Storage disk space low

### Configuration Management

**Environment Variables:**
```env
# .env
APP_URL=https://yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com
SESSION_DOMAIN=.yourdomain.com

# Frontend .env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENABLE_CUSTOMER_PORTAL=true
```

**Feature Flags:**
```php
// config/features.php
return [
    'customer_portal' => env('ENABLE_CUSTOMER_PORTAL', true),
];

// Use in routes
if (config('features.customer_portal')) {
    Route::prefix('customer')->group(function () {
        // Customer routes
    });
}
```


## Performance Optimization

### Database Optimization

**Query Optimization:**
```php
// Eager load relationships to avoid N+1 queries
$orders = Sale::with([
    'paymentInstallments' => function($query) {
        $query->orderBy('due_date', 'asc');
    },
    'payments' => function($query) {
        $query->where('status', 'verified')->orderBy('paid_at', 'desc');
    },
    'items.product'
])
->where('customer_id', $customerId)
->paginate(10);
```

**Indexes:**
```sql
-- Ensure these indexes exist (should already be present from simplified payment system)
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_payment_installments_sale_id ON payment_installments(sale_id);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);
CREATE INDEX idx_payments_sale_id ON payments(sale_id);
CREATE INDEX idx_payments_status ON payments(status);
```

**Caching:**
```php
// Cache customer order count
$orderCount = Cache::remember(
    "customer_{$customerId}_order_count",
    now()->addMinutes(5),
    fn() => Sale::where('customer_id', $customerId)->count()
);

// Cache order details (invalidate on payment submission)
$order = Cache::remember(
    "order_{$orderId}_details",
    now()->addMinutes(10),
    fn() => Sale::with(['installments', 'payments', 'items'])->find($orderId)
);

// Invalidate cache on payment submission
Cache::forget("order_{$orderId}_details");
```

### API Response Optimization

**Pagination:**
```php
// Paginate orders list
$orders = Sale::where('customer_id', $customerId)
    ->with(['paymentInstallments'])
    ->paginate(10);

return CustomerOrderResource::collection($orders);
```

**Selective Field Loading:**
```php
// Only load necessary fields for list view
$orders = Sale::select([
    'id', 'transaction_id', 'total', 'amount_paid', 
    'balance_remaining', 'payment_status', 'created_at'
])
->where('customer_id', $customerId)
->paginate(10);
```

**Response Compression:**
```php
// Enable gzip compression in nginx
gzip on;
gzip_types application/json;
gzip_min_length 1000;
```

### Frontend Optimization

**Code Splitting:**
```javascript
// Lazy load customer portal components
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/customer/orders" element={<MyOrdersPage />} />
    <Route path="/customer/orders/:id" element={<OrderDetailsPage />} />
  </Routes>
</Suspense>
```

**Image Optimization:**
```javascript
// Compress images before upload
const compressImage = async (file) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
};
```

**Request Debouncing:**
```javascript
// Debounce search/filter requests
const debouncedSearch = useMemo(
  () => debounce((searchTerm) => {
    fetchOrders({ search: searchTerm });
  }, 500),
  []
);
```

**Optimistic Updates:**
```javascript
// Update UI immediately, rollback on error
const handlePaymentSubmit = async (paymentData) => {
  // Optimistically update installment status
  setInstallments(prev => prev.map(inst => 
    inst.id === selectedInstallment.id 
      ? { ...inst, status: 'needs_verification' }
      : inst
  ));
  
  try {
    await customerApi.submitGCashPayment(selectedInstallment.id, paymentData);
    showSuccess('Payment submitted successfully!');
  } catch (error) {
    // Rollback on error
    setInstallments(prev => prev.map(inst => 
      inst.id === selectedInstallment.id 
        ? { ...inst, status: 'pending' }
        : inst
    ));
    showError(error.message);
  }
};
```

### Network Optimization

**HTTP/2:**
```nginx
# Enable HTTP/2 in nginx
listen 443 ssl http2;
```

**CDN for Static Assets:**
```javascript
// Use CDN for React build files
<script src="https://cdn.yourdomain.com/static/js/main.js"></script>
```

**Service Worker for Offline Support:**
```javascript
// Register service worker for caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Cache API responses
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/customer/orders')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

## Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Email Notifications:**
   - Send email when payment is verified
   - Send reminder emails for upcoming due dates
   - Send overdue payment notifications

2. **SMS Notifications:**
   - SMS confirmation on payment submission
   - SMS alerts for payment verification
   - SMS reminders for due installments

3. **Payment History Export:**
   - Download payment history as PDF
   - Export to CSV for record-keeping
   - Print-friendly receipt format

4. **Installment Modification:**
   - Request installment date changes
   - Request payment plan modifications
   - Admin approval workflow for changes

5. **Partial Payments:**
   - Allow partial installment payments
   - Track partial payment history
   - Automatic balance calculation

6. **Multiple Payment Methods per Installment:**
   - Split installment across multiple methods
   - Track multiple proofs per installment
   - Complex verification workflow

7. **Mobile App:**
   - Native iOS/Android apps
   - Push notifications
   - Camera integration for proof upload
   - Biometric authentication

8. **Payment Analytics:**
   - Customer payment behavior dashboard
   - Payment success rate tracking
   - Average verification time metrics
   - Overdue payment trends

9. **Automated Payment Reminders:**
   - Configurable reminder schedule
   - Multi-channel reminders (email, SMS, push)
   - Smart reminder timing based on customer behavior

10. **GCash API Integration:**
    - Direct GCash payment processing
    - Automatic payment verification
    - Real-time payment status updates
    - Eliminate manual proof upload

### Technical Debt and Improvements

1. **API Versioning:**
   - Implement `/api/v2/customer/orders` for future changes
   - Maintain backward compatibility

2. **GraphQL API:**
   - Consider GraphQL for flexible data fetching
   - Reduce over-fetching and under-fetching

3. **Real-time Updates:**
   - WebSocket connection for live status updates
   - Push notifications when payment is verified
   - Live admin verification status

4. **Advanced Security:**
   - Two-factor authentication for customers
   - Biometric authentication support
   - Advanced fraud detection

5. **Internationalization:**
   - Multi-language support
   - Multi-currency support
   - Localized date/time formats

## Conclusion

The Customer Installment Payment Portal provides a secure, user-friendly interface for customers to manage their installment payments while seamlessly integrating with the existing admin payment verification workflows. By reusing the existing payment system infrastructure and following security best practices, this feature delivers significant value with minimal risk and maintenance overhead.

The design prioritizes:
- **Security:** Strong authentication, authorization, and data protection
- **Usability:** Intuitive interface with clear feedback and error handling
- **Maintainability:** Clean separation of concerns, reusable components, comprehensive testing
- **Performance:** Optimized queries, caching, and frontend optimization
- **Scalability:** Designed to handle growing customer base and payment volume

With proper testing, deployment, and monitoring, this feature will significantly improve the customer experience and reduce the administrative burden of managing installment payments.

