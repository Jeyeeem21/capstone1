/**
 * Contact API
 * 
 * Contact form API calls
 */

import apiClient from './apiClient';
import { ENDPOINTS } from './config';

export const contactApi = {
  /**
   * Send contact form message
   * @param {Object} data - Contact form data
   * @param {string} data.name - Sender name
   * @param {string} data.email - Sender email
   * @param {string} data.subject - Message subject
   * @param {string} data.message - Message content
   */
  send: async ({ name, email, subject, message }) => {
    return apiClient.post(ENDPOINTS.CONTACT.SEND, {
      name,
      email,
      subject,
      message,
    });
  },
};

export default contactApi;
