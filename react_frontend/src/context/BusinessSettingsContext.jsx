import { createContext, useContext, useState, useEffect } from 'react';
import { businessSettingsApi } from '../api';
import { API_BASE_URL } from '../api/config';

// Helper to get full logo URL
const getFullLogoUrl = (logoPath) => {
  if (!logoPath || logoPath === '/logo.svg') return '/logo.svg';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('blob:')) return '/logo.svg';
  const backendUrl = API_BASE_URL.replace('/api', '');
  return `${backendUrl}${logoPath}`;
};

const BusinessSettingsContext = createContext(null);

// Default settings to use as fallback
const defaultSettings = {
  business_name: 'KJP Ricemill',
  business_tagline: 'Inventory & Sales',
  business_logo: '/logo.svg',
  business_email: 'info@kjpricemill.com',
  business_phone: '+63 917-123-4567',
  business_address: 'Calapan City, Oriental Mindoro, Philippines',
  business_hours: 'Mon-Sat: 7:00 AM - 6:00 PM',
  business_open_days: 'Monday - Saturday',
  business_open_time: '07:00',
  business_close_time: '18:00',
  footer_tagline: 'Your trusted partner in quality rice processing and distribution. Serving communities with excellence since 2020.',
  footer_copyright: 'Management System. All rights reserved.',
  footer_powered_by: 'Powered by XianFire Framework. Built at Mindoro State University',
  social_facebook: '',
  social_twitter: '',
  social_instagram: '',
  social_linkedin: '',
};

// Get initial settings from localStorage
const getInitialSettings = () => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('kjp-business-settings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Don't use blob URLs from cache - they're invalid after page refresh
        if (parsed.business_logo && parsed.business_logo.startsWith('blob:')) {
          parsed.business_logo = '/logo.svg';
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse cached business settings:', e);
      }
    }
  }
  return defaultSettings;
};

export const BusinessSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getInitialSettings);
  const [loading, setLoading] = useState(!localStorage.getItem('kjp-business-settings'));

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await businessSettingsApi.getAll();
        if (result?.success && result?.data) {
          const data = result.data;
          // Don't use blob URLs - they're invalid after page refresh
          const logoUrl = getFullLogoUrl(data.business_logo);
          const newSettings = {
            business_name: data.business_name || 'KJP Ricemill',
            business_tagline: data.business_tagline || 'Inventory & Sales',
            business_logo: logoUrl,
            business_email: data.business_email || 'info@kjpricemill.com',
            business_phone: data.business_phone || '+63 917-123-4567',
            business_address: data.business_address || 'Calapan City, Oriental Mindoro, Philippines',
            business_hours: data.business_hours_formatted || data.business_hours || 'Mon-Sat: 7:00 AM - 6:00 PM',
            business_open_days: data.business_open_days || 'Monday - Saturday',
            business_open_time: data.business_open_time || '07:00',
            business_close_time: data.business_close_time || '18:00',
            footer_tagline: data.footer_tagline || 'Your trusted partner in quality rice processing and distribution. Serving communities with excellence since 2020.',
            footer_copyright: data.footer_copyright || 'Management System. All rights reserved.',
            footer_powered_by: data.footer_powered_by || 'Powered by XianFire Framework. Built at Mindoro State University',
            social_facebook: data.social_facebook || '',
            social_twitter: data.social_twitter || '',
            social_instagram: data.social_instagram || '',
            social_linkedin: data.social_linkedin || '',
          };
          setSettings(newSettings);
          localStorage.setItem('kjp-business-settings', JSON.stringify(newSettings));
        }
      } catch (error) {
        console.error('Failed to fetch business settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('kjp-business-settings', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <BusinessSettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </BusinessSettingsContext.Provider>
  );
};

export const useBusinessSettings = () => {
  const context = useContext(BusinessSettingsContext);
  
  // Return safe default values if context is not available
  // This prevents crashes during initial render or when used outside provider
  if (!context) {
    console.warn('useBusinessSettings was called outside of BusinessSettingsProvider. Using default settings.');
    return {
      settings: defaultSettings,
      loading: false,
      updateSettings: () => {
        console.warn('Cannot update settings outside of BusinessSettingsProvider');
      }
    };
  }
  
  return context;
};

export default BusinessSettingsContext;
