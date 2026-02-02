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
   * Update business settings
   * @param {Object} data - Business settings data
   */
  update: async (data) => {
    // Clear cache when updating
    localStorage.removeItem('kjp-business-settings');
    return apiClient.put('/business-settings', data);
  },

  /**
   * Upload business logo
   * @param {File} file - Logo file
   */
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    // Clear cache when uploading logo
    localStorage.removeItem('kjp-business-settings');
    
    return apiClient.post('/business-settings/logo', formData);
  },
};

export default businessSettingsApi;
