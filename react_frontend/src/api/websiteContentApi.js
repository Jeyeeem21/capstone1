/**
 * Website Content API
 * 
 * Handles API calls for website content management (Home and About pages)
 */

import apiClient from './apiClient';

const websiteContentApi = {
  /**
   * Get all website content (home and about)
   */
  getAll: async () => {
    return apiClient.get('/website-content');
  },

  /**
   * Get home page content
   */
  getHomeContent: async () => {
    return apiClient.get('/website-content/home');
  },

  /**
   * Get about page content
   */
  getAboutContent: async () => {
    return apiClient.get('/website-content/about');
  },

  /**
   * Save home page content
   * @param {Object} data - Home page content data
   */
  saveHomeContent: async (data) => {
    return apiClient.post('/website-content/home', data);
  },

  /**
   * Save about page content
   * @param {Object} data - About page content data
   */
  saveAboutContent: async (data) => {
    return apiClient.post('/website-content/about', data);
  },

  /**
   * Upload hero image for home or about page
   * @param {File} file - Image file
   * @param {string} page - 'home' or 'about'
   */
  uploadHeroImage: async (file, page) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('page', page);
    
    return apiClient.post('/website-content/hero-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Seed default content (useful for initial setup)
   */
  seedDefaults: async () => {
    return apiClient.post('/website-content/seed');
  },
};

export default websiteContentApi;
