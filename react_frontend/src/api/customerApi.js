/**
 * Customer Portal API
 * 
 * API calls for customer-facing installment payment portal
 */

import apiClient from './apiClient';

export const customerApi = {
  /**
   * Get all orders for the authenticated customer
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by payment status (paid, partial, not_paid)
   * @param {number} filters.page - Page number
   * @param {number} filters.per_page - Items per page
   */
  getOrders: async (filters = {}) => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    try {
      const response = await apiClient.get('/customer/orders', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get detailed information for a specific order
   * @param {number} orderId - Order ID
   */
  getOrderDetails: async (orderId) => {
    try {
      const response = await apiClient.get(`/customer/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Submit GCash payment for an installment
   * @param {number} installmentId - Installment ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.reference_number - GCash reference number
   * @param {string} paymentData.payment_proof - Base64 encoded payment proof image
   */
  submitGCashPayment: async (installmentId, paymentData) => {
    try {
      const response = await apiClient.post(
        `/customer/installments/${installmentId}/pay-gcash`,
        paymentData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Submit PDO payment for an installment
   * @param {number} installmentId - Installment ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.check_number - Check number
   * @param {string} paymentData.bank_name - Bank name
   * @param {string} paymentData.check_date - Check date (YYYY-MM-DD)
   * @param {string} paymentData.check_image - Base64 encoded check image
   */
  submitPDOPayment: async (installmentId, paymentData) => {
    try {
      const response = await apiClient.post(
        `/customer/installments/${installmentId}/pay-pdo`,
        paymentData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

/**
 * Handle API errors and provide user-friendly error messages
 * @param {Error} error - Axios error object
 */
function handleApiError(error) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Authentication error - clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');

      case 403:
        throw new Error(
          data.message || 'You do not have permission to perform this action.'
        );

      case 422:
        // Validation errors - throw with errors object
        const validationError = new Error(data.message || 'Validation failed');
        validationError.errors = data.errors;
        throw validationError;

      case 409:
        throw new Error(
          data.message || 'This action cannot be completed.'
        );

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

export default customerApi;
