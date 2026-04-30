/**
 * Payments API
 * 
 * All payment-related API calls
 */

import apiClient from './apiClient';

export const paymentsApi = {
  /**
   * Get all payments with filters
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status (pending, verified, on_hold, cancelled)
   * @param {string} options.method - Filter by payment method (cash, gcash, pdo, credit)
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   */
  getAll: async ({ status = '', method = '', page = 1, per_page = 20 } = {}) => {
    const params = { page, per_page };
    if (status) params.status = status;
    if (method) params.method = method;
    
    return apiClient.get('/payments', { params });
  },

  /**
   * Get payment by ID
   * @param {number} paymentId - Payment ID
   */
  getById: async (paymentId) => {
    return apiClient.get(`/payments/${paymentId}`);
  },

  /**
   * Record a new payment for a sale
   * @param {number} saleId - Sale ID
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.payment_method - Payment method (cash, gcash, pdo, credit)
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.reference_number - Reference number (for GCash)
   * @param {string} paymentData.proof_image - Base64 proof image (for GCash)
   * @param {string} paymentData.pdo_check_number - Check number (for PDO)
   * @param {string} paymentData.pdo_check_bank - Bank name (for PDO)
   * @param {string} paymentData.pdo_check_image - Base64 check image (for PDO)
   */
  recordPayment: async (saleId, paymentData) => {
    return apiClient.post(`/sales/${saleId}/payment`, paymentData);
  },

  /**
   * Get payment history for a sale
   * @param {number} saleId - Sale ID
   */
  getPaymentHistory: async (saleId) => {
    return apiClient.get(`/sales/${saleId}/payments`);
  },

  /**
   * Verify a payment (admin only)
   * @param {number} paymentId - Payment ID
   * @param {string} notes - Verification notes
   */
  verifyPayment: async (paymentId, notes = '') => {
    return apiClient.post(`/payments/${paymentId}/verify`, { notes });
  },

  /**
   * Hold a payment (admin only)
   * @param {number} paymentId - Payment ID
   * @param {string} notes - Hold reason
   */
  holdPayment: async (paymentId, notes) => {
    return apiClient.post(`/payments/${paymentId}/hold`, { notes });
  },

  /**
   * Cancel a payment (admin only)
   * @param {number} paymentId - Payment ID
   * @param {string} notes - Cancellation reason
   */
  cancelPayment: async (paymentId, notes) => {
    return apiClient.post(`/payments/${paymentId}/cancel`, { notes });
  },

  /**
   * Get pending verifications (GCash payments needing verification)
   */
  getPendingVerifications: async () => {
    return apiClient.get('/payments', {
      params: { status: 'pending', method: 'gcash' }
    });
  },

  /**
   * Get payments on hold
   */
  getOnHold: async () => {
    return apiClient.get('/payments', {
      params: { status: 'on_hold' }
    });
  },
};

export const paymentPlansApi = {
  /**
   * Get all payment plans (staggered payments)
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   */
  getAll: async ({ status = '', page = 1, per_page = 100 } = {}) => {
    const params = { page, per_page };
    if (status) params.status = status;
    
    return apiClient.get('/payment-plans', { params });
  },

  /**
   * Get payment plan by ID
   * @param {number} planId - Payment plan ID
   */
  getById: async (planId) => {
    return apiClient.get(`/payment-plans/${planId}`);
  },

  /**
   * Create a payment schedule for a sale
   * @param {number} saleId - Sale ID
   * @param {Object} scheduleData - Schedule data
   * @param {Array} scheduleData.installments - Array of installment objects
   */
  createSchedule: async (saleId, scheduleData) => {
    return apiClient.post(`/sales/${saleId}/payment-schedule`, scheduleData);
  },

  /**
   * Approve a payment plan (admin only)
   * @param {number} planId - Payment plan ID
   * @param {string} notes - Approval notes
   */
  approvePlan: async (planId, notes = '') => {
    return apiClient.post(`/payment-plans/${planId}/approve`, { notes });
  },

  /**
   * Get pending approvals (plans needing approval)
   */
  getPendingApprovals: async () => {
    return apiClient.get('/payment-plans', {
      params: { status: 'pending_approval' }
    });
  },
};

export const installmentsApi = {
  /**
   * Get installment by ID
   * @param {number} installmentId - Installment ID
   */
  getById: async (installmentId) => {
    return apiClient.get(`/installments/${installmentId}`);
  },

  /**
   * Record payment for an installment
   * @param {number} installmentId - Installment ID
   * @param {Object} paymentData - Payment data
   */
  recordPayment: async (installmentId, paymentData) => {
    return apiClient.post(`/installments/${installmentId}/pay`, paymentData);
  },

  /**
   * Approve a PDO installment (admin only)
   * @param {number} installmentId - Installment ID
   * @param {string} notes - Approval notes
   */
  approvePDO: async (installmentId, notes = '') => {
    return apiClient.post(`/installments/${installmentId}/approve-pdo`, { notes });
  },

  /**
   * Reject a PDO installment (admin only)
   * @param {number} installmentId - Installment ID
   * @param {string} notes - Rejection reason
   */
  rejectPDO: async (installmentId, notes) => {
    return apiClient.post(`/installments/${installmentId}/reject-pdo`, { notes });
  },

  /**
   * Mark PDO as paid (admin only - after check clears)
   * @param {number} installmentId - Installment ID
   * @param {string} notes - Payment notes
   */
  markPDOAsPaid: async (installmentId, notes = '') => {
    return apiClient.post(`/installments/${installmentId}/mark-paid`, { notes });
  },

  /**
   * Get PDO installments pending approval
   */
  getPendingPDOs: async () => {
    return apiClient.get('/installments/pending-pdo');
  },

  /**
   * Get approved PDOs awaiting payment
   */
  getAwaitingPayment: async () => {
    return apiClient.get('/installments/awaiting-payment');
  },
};

export const customerBalancesApi = {
  /**
   * Get customer balances
   * @param {number} customerId - Customer ID
   */
  getBalances: async (customerId) => {
    return apiClient.get(`/customers/${customerId}/balances`);
  },
};

export default {
  payments: paymentsApi,
  paymentPlans: paymentPlansApi,
  installments: installmentsApi,
  customerBalances: customerBalancesApi,
};
