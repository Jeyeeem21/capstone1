/**
 * Business Settings API
 * 
 * Handles API calls for business settings management
 */

import apiClient from './apiClient';

const businessSettingsApi = {
  /**
   * Get all business settings (with caching for speed)
   */
  getAll: async () => {
    return apiClient.get('/business-settings', { 
      useCache: true, 
      cacheKey: 'business-settings' 
    });
  },

  /**
   * Get fresh business settings (bypass cache — used for polling)
   */
  getFresh: async () => {
    return apiClient.get('/business-settings');
  },

  /**
   * Update business settings
   * @param {Object} data - Business settings data
   */
  update: async (data) => {
    // Clear all caches when updating
    localStorage.removeItem('kjp-business-settings');
    apiClient.clearCache?.('business-settings');
    return apiClient.put('/business-settings', data);
  },

  /**
   * Upload business logo
   * @param {File} file - Logo file
   */
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    // Clear all caches when uploading logo
    localStorage.removeItem('kjp-business-settings');
    apiClient.clearCache?.('business-settings');
    
    return apiClient.post('/business-settings/logo', formData);
  },

  /**
   * Send a test email to verify SMTP configuration
   */
  testEmail: async (smtpPassword) => {
    return apiClient.post('/business-settings/test-email', { smtp_password: smtpPassword });
  },
};

export default businessSettingsApi;
