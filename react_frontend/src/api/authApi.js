/**
 * Authentication API
 * 
 * All authentication-related API calls
 */

import apiClient, { setAuthToken } from './apiClient';
import { ENDPOINTS } from './config';

export const authApi = {
  /**
   * Login user
   * @param {Object} credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @param {boolean} credentials.remember - Remember me option
   */
  login: async ({ email, password, remember = false }) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
      remember,
    });
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },
  
  /**
   * Logout current user
   */
  logout: async () => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    setAuthToken(null);
    apiClient.cache.clear();
    return response;
  },
  
  /**
   * Register new user
   * @param {Object} userData
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.password_confirmation - Password confirmation
   */
  register: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },
  
  /**
   * Request password reset email
   * @param {string} email - User email
   */
  forgotPassword: async (email) => {
    return apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },
  
  /**
   * Reset password with token
   * @param {Object} data
   * @param {string} data.token - Reset token
   * @param {string} data.email - User email
   * @param {string} data.password - New password
   * @param {string} data.password_confirmation - Password confirmation
   */
  resetPassword: async (data) => {
    return apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },
  
  /**
   * Get current authenticated user
   */
  getCurrentUser: async () => {
    return apiClient.get(ENDPOINTS.AUTH.ME);
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
  
  /**
   * Get stored auth token
   */
  getToken: () => {
    return localStorage.getItem('auth_token');
  },
};

export default authApi;
