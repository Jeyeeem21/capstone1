import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database, Save, Building2, Mail, Phone, MapPin, Globe, Camera, Shield, Eye, EyeOff, Moon, Sun, Download, Upload, Trash2, CheckCircle, RotateCcw, Paintbrush, Square, Type, Layout, Loader2, Users, X, Info, Home, FileText, Edit3, Plus, Award, Target, Leaf, Heart, Truck, Calendar, RefreshCw, Clock, Facebook, Twitter, Instagram, Linkedin, Share2, MousePointer, ClipboardList, Archive, Package, MessageCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { Card, CardContent, Button, Tabs, FormInput, FormSelect, FormTextarea, useToast, SkeletonSettings } from '../../../components/ui';
import AuditTrail from '../AuditTrail/AuditTrail';
import Archives from '../Archives/Archives';
import AdminAccounts from './AdminAccounts';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessSettings } from '../../../context/BusinessSettingsContext';
import { websiteContentApi, businessSettingsApi } from '../../../api';
import { API_BASE_URL } from '../../../api/config';

// Helper to get full logo URL
const getFullLogoUrl = (logoPath) => {
  if (!logoPath || logoPath === '/logo.svg') return '/storage/logos/KJPLogo.png';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('blob:')) return logoPath;
  // Convert Laravel storage path to full URL
  const backendUrl = API_BASE_URL.replace('/api', '');
  return `${backendUrl}${logoPath}`;
};

// Helper to get full image URL (for hero images, etc.)
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) return imagePath;
  const backendUrl = API_BASE_URL.replace('/api', '');
  return `${backendUrl}${imagePath}`;
};

// Color picker component (extracted to module level to prevent remount on re-render)
// Uses uncontrolled color input with native 'change' event to prevent Chrome from closing the picker dialog
const AppearanceColorPicker = ({ label, description, icon: Icon, value, onChange, presets = [], compact = false }) => {
  const colorInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Attach native 'change' event (fires only when dialog closes, not while dragging)
  // React's onChange maps to native 'input' which fires continuously and causes re-renders that close the picker
  useEffect(() => {
    const input = colorInputRef.current;
    if (!input) return;
    const handleChange = (e) => onChangeRef.current(e.target.value);
    input.addEventListener('change', handleChange);
    return () => input.removeEventListener('change', handleChange);
  }, []);

  // Sync value from parent imperatively (doesn't trigger React reconciliation on the input)
  useEffect(() => {
    if (colorInputRef.current && colorInputRef.current.value !== value) {
      colorInputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:border-primary-700 transition-colors ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-start gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        {!compact && (
          <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-primary-500">
            <Icon size={18} />
          </div>
        )}
        <div className="flex-1">
          <h4 className={`font-semibold text-gray-800 dark:text-gray-100 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</h4>
          <p className={`text-gray-500 dark:text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            ref={colorInputRef}
            type="color"
            defaultValue={value}
            className={`rounded-lg cursor-pointer border-2 border-primary-200 dark:border-primary-700 hover:border-primary-400 transition-colors ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
            style={{ padding: 0 }}
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value.toUpperCase()}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onChange(val);
            }}
            className={`w-full font-mono border-2 border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
            placeholder="#000000"
          />
        </div>
      </div>
      {presets.length > 0 && (
        <div className={`flex gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
          {presets.slice(0, compact ? 4 : presets.length).map((preset, i) => (
            <button
              key={i}
              onClick={() => onChange(preset)}
              className={`rounded-lg border-2 border-primary-200 dark:border-primary-700 hover:border-primary-400 hover:scale-110 transition-all shadow-sm ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Font size slider component (extracted to module level to prevent remount on re-render)
const AppearanceFontSizeSlider = ({ label, description, icon: Icon, value, onChange, min = 12, max = 24 }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:border-primary-700 transition-colors">
    <div className="flex items-start gap-3 mb-3">
      <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-primary-500">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{value}px</div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{min}px</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-2 bg-primary-200 dark:bg-primary-800 rounded-lg appearance-none cursor-pointer accent-button-500"
      />
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{max}px</span>
    </div>
    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-primary-100 dark:border-primary-700">
      <p style={{ fontSize: `${value}px` }} className="text-gray-700 dark:text-gray-200">
        Preview: The quick brown fox jumps over the lazy dog
      </p>
    </div>
  </div>
);

const Settings = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, updateTheme, saveTheme, resetTheme, defaultTheme, saving } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const { settings: contextSettings, updateSettings: updateContextSettings, refreshSettings } = useBusinessSettings();
  const [activeSection, setActiveSection] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['general', 'profile', 'security', 'appearance', 'information', 'data', 'accounts', 'audit-trail', 'archives'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) return tabFromUrl;
    return isSuperAdmin() ? 'general' : 'profile';
  });
  const [showPassword, setShowPassword] = useState(false);

  // Sync active section to URL
  useEffect(() => {
    setSearchParams({ tab: activeSection }, { replace: true });
  }, [activeSection]);
  
  // Form states - initialize from context
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_tagline: '',
    business_start_year: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    business_open_days: '',
    business_open_time: '',
    business_close_time: '',
    business_hours_json: '',
    footer_tagline: '',
    footer_copyright: '',
    footer_powered_by: '',
    footer_badge1: '',
    footer_badge2: '',
    social_facebook: '',

    social_twitter: '',
    social_instagram: '',
    social_linkedin: '',
    shipping_rate_per_sack: '',
    shipping_rate_per_km: '',
    shipping_base_km: '',
    warehouse_address: '',
    google_maps_embed: '',
    smtp_password: '',
  });
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('/storage/logos/KJPLogo.png');
  const logoInputRef = useRef(null);
  
  const [profileInfo, setProfileInfo] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role === 'super_admin' ? 'Super Admin' : 'Administrator',
  });
  
  const [securityInfo, setSecurityInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    orderUpdates: true,
    salesReports: false,
    systemUpdates: true,
  });

  // Load business settings on mount - use cached data first for instant display
  useEffect(() => {
    // Try to load from localStorage cache first for instant display
    const cached = localStorage.getItem('kjp-business-settings');
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        setBusinessInfo({
          business_name: cachedData.business_name ?? '',
          business_tagline: cachedData.business_tagline ?? '',
          business_start_year: cachedData.business_start_year ?? '',
          business_email: cachedData.business_email ?? '',
          business_phone: cachedData.business_phone ?? '',
          business_address: cachedData.business_address ?? '',
          business_open_days: cachedData.business_open_days ?? '',
          business_open_time: cachedData.business_open_time ?? '',
          business_close_time: cachedData.business_close_time ?? '',
          business_hours_json: cachedData.business_hours_json ?? '',
          footer_tagline: cachedData.footer_tagline ?? '',
          footer_copyright: cachedData.footer_copyright ?? '',
          footer_powered_by: cachedData.footer_powered_by ?? '',
          footer_badge1: cachedData.footer_badge1 ?? '',
          footer_badge2: cachedData.footer_badge2 ?? '',
          social_facebook: cachedData.social_facebook ?? '',

          social_twitter: cachedData.social_twitter ?? '',
          social_instagram: cachedData.social_instagram ?? '',
          social_linkedin: cachedData.social_linkedin ?? '',
          shipping_rate_per_sack: cachedData.shipping_rate_per_sack ?? '',
          shipping_rate_per_km: cachedData.shipping_rate_per_km ?? '',
          shipping_base_km: cachedData.shipping_base_km ?? '',
          warehouse_address: cachedData.warehouse_address ?? '',
          google_maps_embed: cachedData.google_maps_embed ?? '',
          smtp_password: cachedData.smtp_password ?? '',
        });
        if (cachedData.business_logo && cachedData.business_logo !== '/logo.svg' && cachedData.business_logo !== '/storage/logos/KJPLogo.png' && !cachedData.business_logo.startsWith('blob:')) {
          setLogoPreview(getFullLogoUrl(cachedData.business_logo));
        }
        setBusinessLoading(false);
      } catch (e) {
        console.error('Failed to parse cached settings:', e);
      }
    }
    
    // Then fetch fresh data from API
    const loadBusinessSettings = async () => {
      try {
        const result = await businessSettingsApi.getAll();
        if (result?.success && result?.data) {
          const data = result.data;
          // Use actual database values - show what's in DB, not defaults
          setBusinessInfo({
            business_name: data.business_name ?? '',
            business_tagline: data.business_tagline ?? '',
            business_start_year: data.business_start_year ?? '',
            business_email: data.business_email ?? '',
            business_phone: data.business_phone ?? '',
            business_address: data.business_address ?? '',
            business_open_days: data.business_open_days ?? '',
            business_open_time: data.business_open_time ?? '',
            business_close_time: data.business_close_time ?? '',
            business_hours_json: data.business_hours_json ?? '',
            footer_tagline: data.footer_tagline ?? '',
            footer_copyright: data.footer_copyright ?? '',
            footer_powered_by: data.footer_powered_by ?? '',
            footer_badge1: data.footer_badge1 ?? '',
            footer_badge2: data.footer_badge2 ?? '',
            social_facebook: data.social_facebook ?? '',

            social_twitter: data.social_twitter ?? '',
            social_instagram: data.social_instagram ?? '',
            social_linkedin: data.social_linkedin ?? '',
            shipping_rate_per_sack: data.shipping_rate_per_sack ?? '',
            shipping_rate_per_km: data.shipping_rate_per_km ?? '',
            shipping_base_km: data.shipping_base_km ?? '',
            warehouse_address: data.warehouse_address ?? '',
            google_maps_embed: data.google_maps_embed ?? '',
            smtp_password: data.smtp_password ?? '',
          });
          if (data.business_logo && data.business_logo !== '/logo.svg' && data.business_logo !== '/storage/logos/KJPLogo.png' && !data.business_logo.startsWith('blob:')) {
            setLogoPreview(getFullLogoUrl(data.business_logo));
          }
        }
      } catch (error) {
        console.error('Failed to load business settings:', error);
      } finally {
        setBusinessLoading(false);
      }
    };
    loadBusinessSettings();

    // Cleanup blob URLs on unmount
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, []);

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  const handleProfileChange = (e) => setProfileInfo({ ...profileInfo, [e.target.name]: e.target.value });
  const handleSecurityChange = (e) => setSecurityInfo({ ...securityInfo, [e.target.name]: e.target.value });

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Allow formats: +63 917-123-4567, 09171234567, +639171234567, etc.
    const phoneRegex = /^(\+?63|0)?[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const validateGeneralForm = () => {
    const errors = {};
    
    if (!businessInfo.business_name?.trim()) {
      errors.business_name = 'Business name is required';
    }
    
    if (!businessInfo.business_email?.trim()) {
      errors.business_email = 'Email is required';
    } else if (!validateEmail(businessInfo.business_email)) {
      errors.business_email = 'Please enter a valid email address';
    }
    
    if (!businessInfo.business_phone?.trim()) {
      errors.business_phone = 'Phone number is required';
    } else if (!validatePhone(businessInfo.business_phone)) {
      errors.business_phone = 'Please enter a valid Philippine phone number';
    }
    
    if (!businessInfo.business_address?.trim()) {
      errors.business_address = 'Business address is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Revoke previous blob URL to prevent memory leak and blob errors
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      
      console.log('Logo file selected:', file.name, file.type, file.size);
      const blobUrl = URL.createObjectURL(file);
      setLogoPreview(blobUrl);
      setLogoFile(file);
      
      // Automatically upload logo immediately
      try {
        setBusinessSaving(true);
        console.log('Uploading logo immediately...');
        const logoResult = await businessSettingsApi.uploadLogo(file);
        console.log('Logo upload result:', logoResult);
        
        if (logoResult?.success && logoResult?.data?.logo_url) {
          const newLogoUrl = getFullLogoUrl(logoResult.data.logo_url);
          console.log('Logo uploaded successfully:', newLogoUrl);
          setLogoPreview(newLogoUrl);
          setLogoFile(null);
          
          // Clear localStorage cache to force refresh everywhere
          localStorage.removeItem('kjp-business-settings');
          
          // Update context immediately
          updateContextSettings({
            business_logo: newLogoUrl,
          });
          
          toast.success('Logo Updated', 'Your business logo has been changed.');
        } else {
          console.error('Logo upload failed:', logoResult);
          toast.error('Upload Failed', 'Failed to upload logo. Please try again.');
          // Revert to previous logo
          setLogoPreview(contextSettings.business_logo || '/storage/logos/KJPLogo.png');
          setLogoFile(null);
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        toast.error('Upload Error', 'An error occurred while uploading the logo.');
        // Revert to previous logo
        setLogoPreview(contextSettings.business_logo || '/storage/logos/KJPLogo.png');
        setLogoFile(null);
      } finally {
        setBusinessSaving(false);
      }
    }
  };

  const handleSaveGeneral = async () => {
    // Validate before saving
    if (!validateGeneralForm()) {
      toast.error('Validation Error', 'Please fix the errors before saving.');
      return;
    }
    
    setBusinessSaving(true);
    try {
      // Logo is already uploaded in handleLogoChange, just use current preview
      const currentLogoUrl = logoPreview && !logoPreview.startsWith('blob:') 
        ? logoPreview 
        : (contextSettings.business_logo || '/storage/logos/KJPLogo.png');
      
      // Save other settings — default warehouse_address to business_address if empty
      const dataToSave = {
        ...businessInfo,
        warehouse_address: businessInfo.warehouse_address || businessInfo.business_address,
        business_hours_json: JSON.stringify(hoursSchedule),
      };
      console.log('Saving business settings...', dataToSave);
      const updateResult = await businessSettingsApi.update(dataToSave);
      console.log('Update result:', updateResult);
      
      // Format hours for display — group consecutive days with same hours
      const shortNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
      const groups = [];
      daysOfWeek.forEach(day => {
        const d = hoursSchedule[day];
        const sig = d.closed ? 'closed' : `${d.open}-${d.close}`;
        if (groups.length > 0 && groups[groups.length - 1].sig === sig) {
          groups[groups.length - 1].end = day;
        } else {
          groups.push({ start: day, end: day, sig, data: d });
        }
      });
      const formattedHours = groups.map(g => {
        const label = g.start === g.end ? shortNames[g.start] : `${shortNames[g.start]} - ${shortNames[g.end]}`;
        return g.sig === 'closed' ? `${label}: Closed` : `${label}: ${formatTime(g.data.open)} - ${formatTime(g.data.close)}`;
      }).join('\n');
      
      // Update context for real-time changes across app (Sidebar, Footer, etc.)
      updateContextSettings({
        ...businessInfo,
        business_logo: currentLogoUrl,
        business_hours: formattedHours,
        business_hours_formatted: formattedHours,
      });

      // Trigger a fresh fetch so all tabs/roles get server-formatted data
      refreshSettings();
      
      toast.success('Settings Saved', 'Business information has been updated.');
    } catch (error) {
      console.error('Failed to save business settings:', error);
      toast.error('Error', 'Failed to save business settings.');
    } finally {
      setBusinessSaving(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSaveProfile = () => toast.success('Profile Updated', 'Your profile has been updated.');
  const handleSaveSecurity = () => toast.success('Password Changed', 'Your password has been updated successfully.');
  const handleSaveNotifications = () => toast.success('Notifications Updated', 'Notification preferences saved.');

  // Per-day schedule
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
  const defaultSchedule = Object.fromEntries(daysOfWeek.map(d => [d, { open: '07:00', close: '18:00', closed: d === 'sunday' }]));

  const [hoursSchedule, setHoursSchedule] = useState(defaultSchedule);

  // Load schedule from business_hours_json when data loads
  useEffect(() => {
    if (businessInfo.business_hours_json) {
      try {
        const parsed = JSON.parse(businessInfo.business_hours_json);
        if (parsed && typeof parsed === 'object') {
          setHoursSchedule(prev => ({ ...prev, ...parsed }));
        }
      } catch {}
    }
  }, [businessInfo.business_hours_json]);

  const handleScheduleChange = (day, field, value) => {
    setHoursSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleApplyToAll = () => {
    const monday = hoursSchedule.monday;
    setHoursSchedule(prev => {
      const updated = { ...prev };
      daysOfWeek.forEach(d => {
        updated[d] = { ...monday, closed: prev[d].closed };
      });
      return updated;
    });
  };

  const allSettingsSections = [
    { id: 'general', icon: Building2, title: 'General', description: 'Business information', superAdminOnly: true },
    { id: 'profile', icon: User, title: 'Profile', description: 'Your account settings' },
    { id: 'security', icon: Lock, title: 'Security', description: 'Password & security' },
    { id: 'appearance', icon: Palette, title: 'Appearance', description: 'Theme & display', superAdminOnly: true },
    { id: 'information', icon: Info, title: 'Information', description: 'Website content', superAdminOnly: true },
    { id: 'data', icon: Database, title: 'Data', description: 'Backup & export', superAdminOnly: true },
    { id: 'accounts', icon: Shield, title: 'Accounts', description: 'Admin accounts', superAdminOnly: true },
    { id: 'audit-trail', icon: ClipboardList, title: 'Audit Trail', description: 'System activity logs', superAdminOnly: true },
    { id: 'archives', icon: Archive, title: 'Archives', description: 'Archived records', superAdminOnly: true },
  ];

  const settingsSections = isSuperAdmin()
    ? allSettingsSections
    : allSettingsSections.filter(s => !s.superAdminOnly);

  // Role Switcher Section (for demo purposes)
  const RoleSwitcherSection = () => {
    const handleRoleSwitch = (role) => {
      switchRole(role);
      toast.success('Role Switched', `You are now viewing as ${role === 'admin' ? 'Administrator' : 'Staff'}`);
      if (role === 'staff') {
        navigate('/secretary/pos');
      } else if (role === 'super_admin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-xl mb-6">
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            <strong>Demo Mode:</strong> Use this section to test different user views. 
            In production, users would be assigned roles through the Staff Management page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admin Role Card */}
          <div 
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              user?.role === 'admin' 
                ? 'border-button-500 bg-button-50 dark:bg-gray-700 shadow-lg' 
                : 'border-primary-200 dark:border-primary-700 hover:border-button-300 dark:hover:border-button-700 bg-white dark:bg-gray-700'
            }`}
            onClick={() => handleRoleSwitch('admin')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${user?.role === 'admin' ? 'bg-button-500' : 'bg-gray-100 dark:bg-gray-600'}`}>
                <Shield size={28} className={user?.role === 'admin' ? 'text-white' : 'text-gray-600 dark:text-gray-300'} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Administrator</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full system access</p>
              </div>
              {user?.role === 'admin' && (
                <div className="ml-auto">
                  <CheckCircle size={24} className="text-button-500" />
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Dashboard & Analytics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Procurement & Processing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Products & Inventory
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Sales & Point of Sale
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Partners & Staff Management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Audit Trail & Settings
              </li>
            </ul>
          </div>

          {/* Staff Role Card */}
          <div 
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              user?.role === 'staff' 
                ? 'border-button-500 bg-button-50 dark:bg-gray-700 shadow-lg' 
                : 'border-primary-200 dark:border-primary-700 hover:border-button-300 dark:hover:border-button-700 bg-white dark:bg-gray-700'
            }`}
            onClick={() => handleRoleSwitch('staff')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${user?.role === 'staff' ? 'bg-button-500' : 'bg-gray-100 dark:bg-gray-600'}`}>
                <User size={28} className={user?.role === 'staff' ? 'text-white' : 'text-gray-600 dark:text-gray-300'} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Staff</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Limited access</p>
              </div>
              {user?.role === 'staff' && (
                <div className="ml-auto">
                  <CheckCircle size={24} className="text-button-500" />
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Staff Dashboard (Low Stock Alerts)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Point of Sale Access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                View Profile & Login History
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <X size={14} className="text-red-400" />
                Cannot edit profile
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <X size={14} className="text-red-400" />
                No access to admin features
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Current Role:</strong> {user?.role === 'admin' ? 'Administrator' : 'Staff'} 
            <span className="text-gray-400 ml-2">({user?.email || 'Not logged in'})</span>
          </p>
        </div>
      </div>
    );
  };

  // General Settings Section - render function to avoid re-creating component
  const renderGeneralSection = () => {
    if (businessLoading && !localStorage.getItem('kjp-business-settings')) {
      return <SkeletonSettings />;
    }
    
    return (
      <div className={`space-y-6 transition-opacity duration-200 ${businessSaving ? 'opacity-60 pointer-events-none' : ''}`}>
        {/* Logo Upload */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-700">
          <div className="w-24 h-24 bg-gradient-to-br from-button-500 to-button-600 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden relative">
            {businessSaving ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={32} className="text-white animate-spin" />
              </div>
            ) : null}
            <img src={logoPreview} alt="Business Logo" className="w-20 h-20 object-contain rounded-lg bg-white/90 dark:bg-gray-700/90 p-1" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <span className="text-white font-bold text-3xl hidden">{businessInfo.business_name?.substring(0, 3) || 'KJP'}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Business Logo</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Upload your company logo (PNG, JPG, SVG, WebP - Max 10MB). Logo uploads immediately.</p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
              disabled={businessSaving}
            />
            <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={businessSaving}>
              {businessSaving ? (
                <>
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera size={16} className="mr-1.5" />
                  Change Logo
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput 
            label="Business Name" 
            name="business_name" 
            value={businessInfo.business_name} 
            onChange={handleBusinessChange} 
            required 
            placeholder="Enter business name"
            error={validationErrors.business_name}
          />
          <FormInput 
            label="Business Tagline" 
            name="business_tagline" 
            value={businessInfo.business_tagline} 
            onChange={handleBusinessChange} 
            placeholder="e.g. Inventory & Sales"
            hint="This appears under your business name in the sidebar"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput 
            label="Year Established" 
            name="business_start_year" 
            type="number" 
            value={businessInfo.business_start_year} 
            onChange={handleBusinessChange} 
            placeholder="e.g. 2010"
            hint="Used for 'Since YYYY' labels and years of experience calculations"
          />
          <FormInput 
            label="Business Email" 
            name="business_email" 
            type="email" 
            value={businessInfo.business_email} 
            onChange={handleBusinessChange} 
            required 
            placeholder="info@business.com"
            error={validationErrors.business_email}
          />
          <FormInput 
            label="Phone Number" 
            name="business_phone" 
            value={businessInfo.business_phone} 
            onChange={handleBusinessChange} 
            required 
            placeholder="+63 917-123-4567"
            error={validationErrors.business_phone}
          />
        </div>
        <FormTextarea 
          label="Business Address" 
          name="business_address" 
          value={businessInfo.business_address} 
          onChange={handleBusinessChange} 
          required 
          rows={2} 
          placeholder="Enter full business address"
          error={validationErrors.business_address}
        />
        <FormTextarea 
          label="Google Maps Embed URL" 
          name="google_maps_embed" 
          value={businessInfo.google_maps_embed} 
          onChange={handleBusinessChange} 
          rows={2} 
          placeholder="Paste Google Maps embed URL here (from Google Maps > Share > Embed a map)"
          hint="Go to Google Maps → Search your location → Share → Embed a map → Copy the src URL"
        />
        
        {/* Business Hours */}
        <div className="p-4 bg-button-50 dark:bg-gray-700/50 rounded-xl border border-button-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock size={18} className="text-button-600 dark:text-button-400" />
              Business Hours
            </h4>
            <button 
              type="button" 
              onClick={handleApplyToAll}
              className="text-xs text-button-600 dark:text-button-400 hover:underline"
            >
              Apply Monday's hours to all
            </button>
          </div>
          <div className="space-y-1.5">
            {daysOfWeek.map(day => (
              <div key={day} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${hoursSchedule[day]?.closed ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800/50'}`}>
                <span className="w-10 text-sm font-semibold text-gray-600 dark:text-gray-300">{dayLabels[day]}</span>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={hoursSchedule[day]?.closed || false} 
                    onChange={(e) => handleScheduleChange(day, 'closed', e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-red-500 border-gray-300 dark:border-gray-500 focus:ring-red-400"
                  />
                  <span className={`text-xs ${hoursSchedule[day]?.closed ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>Closed</span>
                </label>
                {!hoursSchedule[day]?.closed && (
                  <div className="flex items-center gap-2 flex-1 ml-1">
                    <input 
                      type="time" 
                      value={hoursSchedule[day]?.open || '07:00'} 
                      onChange={(e) => handleScheduleChange(day, 'open', e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-button-500"
                    />
                    <span className="text-gray-400 text-xs">—</span>
                    <input 
                      type="time" 
                      value={hoursSchedule[day]?.close || '18:00'} 
                      onChange={(e) => handleScheduleChange(day, 'close', e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-button-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Set the opening and closing time for each day. Check "Closed" for days off.</p>
        </div>

        {/* Footer Content */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-primary-200 dark:border-primary-700">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-primary-600 dark:text-primary-400" />
            Footer Content
          </h4>
          <div className="space-y-4">
            <FormTextarea 
              label="Footer Tagline" 
              name="footer_tagline" 
              value={businessInfo.footer_tagline} 
              onChange={handleBusinessChange} 
              rows={2} 
              placeholder="Your trusted partner in quality rice processing..." 
              hint="Displayed in the footer under the business name"
            />
            <FormInput 
              label="Footer Copyright Text" 
              name="footer_copyright" 
              value={businessInfo.footer_copyright} 
              onChange={handleBusinessChange} 
              placeholder="Management System. All rights reserved." 
              hint="Shown at the bottom of the footer after the business name and year"
            />
            <FormInput 
              label="Footer Powered By" 
              name="footer_powered_by" 
              value={businessInfo.footer_powered_by} 
              onChange={handleBusinessChange} 
              placeholder="Powered by XianFire Framework. Built at Mindoro State University" 
              hint="Credit line displayed at the very bottom of the footer"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Footer Badge 1 (Outline)" 
                name="footer_badge1" 
                value={businessInfo.footer_badge1} 
                onChange={handleBusinessChange} 
                placeholder="Premium Quality" 
                hint="Leave blank to hide this badge"
              />
              <FormInput 
                label="Footer Badge 2 (Filled)" 
                name="footer_badge2" 
                value={businessInfo.footer_badge2} 
                onChange={handleBusinessChange} 
                placeholder="ISO Certified" 
                hint="Leave blank to hide this badge"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Share2 size={18} className="text-blue-600 dark:text-blue-400" />
            Social Media Links
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput 
              label={
                <span className="flex items-center gap-2">
                  <Facebook size={16} className="text-blue-600 dark:text-blue-400" />
                  Facebook URL
                </span>
              }
              name="social_facebook" 
              value={businessInfo.social_facebook} 
              onChange={handleBusinessChange} 
              placeholder="https://facebook.com/yourpage" 
            />
            <FormInput 
              label={
                <span className="flex items-center gap-2">
                  <Twitter size={16} className="text-sky-500" />
                  Twitter/X URL
                </span>
              }
              name="social_twitter" 
              value={businessInfo.social_twitter} 
              onChange={handleBusinessChange} 
              placeholder="https://twitter.com/yourhandle" 
            />
            <FormInput 
              label={
                <span className="flex items-center gap-2">
                  <Instagram size={16} className="text-pink-500" />
                  Instagram URL
                </span>
              }
              name="social_instagram" 
              value={businessInfo.social_instagram} 
              onChange={handleBusinessChange} 
              placeholder="https://instagram.com/yourprofile" 
            />
            <FormInput 
              label={
                <span className="flex items-center gap-2">
                  <Linkedin size={16} className="text-blue-700 dark:text-blue-300" />
                  LinkedIn URL
                </span>
              }
              name="social_linkedin" 
              value={businessInfo.social_linkedin} 
              onChange={handleBusinessChange} 
              placeholder="https://linkedin.com/company/yourcompany" 
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Leave empty to hide the social media icon in the footer.
          </p>
        </div>

        {/* Email / SMTP Configuration */}
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-500/30">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <Mail size={18} className="text-violet-600 dark:text-violet-400" />
            Email Notifications
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enable email notifications by entering your Gmail <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline font-medium">App Password</a>. Emails will be sent from your <strong>Business Email</strong> ({businessInfo.business_email || 'not set'}).
          </p>
          <div className="space-y-4">
            <div>
              <div className="max-w-md">
                <FormInput
                  label={<span className="flex items-center gap-1.5"><Lock size={14} /> Gmail App Password</span>}
                  name="smtp_password"
                  type="password"
                  value={businessInfo.smtp_password}
                  onChange={handleBusinessChange}
                  placeholder="Enter your 16-character app password"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await businessSettingsApi.testEmail(businessInfo.smtp_password);
                    if (result?.success) {
                      toast.success('Test Email Sent', 'Check your inbox at ' + (businessInfo.business_email || 'your business email') + '.');
                    } else {
                      toast.error('Test Failed', result?.message || 'Could not send test email. Check your App Password.');
                    }
                  } catch (err) {
                    toast.error('Test Failed', err?.response?.data?.message || 'Could not send test email. Check your App Password.');
                  }
                }}
                disabled={!businessInfo.smtp_password || businessInfo.smtp_password === '••••••••'}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 bg-white dark:bg-violet-900/40 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Mail size={15} />
                Send Test Email
              </button>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-violet-200 dark:border-violet-500/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>How to get an App Password:</strong> Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline">Google App Passwords</a> → Select app “Mail” → Generate → Copy the 16-character password and paste it here. Email notifications will only work when this is configured.
              </p>
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Settings */}
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-500/30">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <Truck size={18} className="text-orange-600 dark:text-orange-400" />
            Shipping & Delivery
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure shipping rates based on distance from your warehouse.
          </p>
          <div className="space-y-4">
            <FormTextarea 
              label="Warehouse Address"
              name="warehouse_address"
              value={businessInfo.warehouse_address || businessInfo.business_address}
              onChange={handleBusinessChange}
              rows={2}
              placeholder={businessInfo.business_address || "Enter your warehouse/business full address"}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Defaults to Business Address if left empty.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput 
                label="Base Distance (km)"
                name="shipping_base_km"
                type="number"
                value={businessInfo.shipping_base_km}
                onChange={handleBusinessChange}
                placeholder="e.g. 50"
              />
              <FormInput 
                label="Rate per Sack (₱)"
                name="shipping_rate_per_sack"
                type="number"
                value={businessInfo.shipping_rate_per_sack}
                onChange={handleBusinessChange}
                placeholder="e.g. 10"
              />
              <FormInput 
                label="Rate per KM (₱)"
                name="shipping_rate_per_km"
                type="number"
                value={businessInfo.shipping_rate_per_km}
                onChange={handleBusinessChange}
                placeholder="e.g. 5"
              />
            </div>
            {(businessInfo.shipping_base_km && businessInfo.shipping_rate_per_sack) ? (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-500/30">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Preview:</strong> For every <span className="text-orange-600 dark:text-orange-400 font-semibold">{businessInfo.shipping_base_km} km</span>, 
                  charge <span className="text-orange-600 dark:text-orange-400 font-semibold">₱{businessInfo.shipping_rate_per_sack}</span> per sack.
                  {businessInfo.shipping_rate_per_km && (
                    <> Additional rate: <span className="text-orange-600 dark:text-orange-400 font-semibold">₱{businessInfo.shipping_rate_per_km}</span> per km.</>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: 100 km × 20 sacks = ₱{((100 / Number(businessInfo.shipping_base_km || 1)) * Number(businessInfo.shipping_rate_per_sack || 0) * 20).toLocaleString()} shipping fee
                </p>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
          <Button onClick={handleSaveGeneral} disabled={businessSaving}>
            {businessSaving ? (
              <>
                <Loader2 size={16} className="mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Profile Section
  const ProfileSection = () => (
    <div className="space-y-6">
      {/* Profile Avatar */}
      <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-700">
        <div className="w-20 h-20 bg-gradient-to-br from-secondary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
          {profileInfo.firstName.charAt(0)}{profileInfo.lastName.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Profile Picture</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Upload a photo (PNG, JPG - Max 10MB)</p>
          <Button variant="outline" size="sm">
            <Camera size={16} className="mr-1.5" />
            Upload Photo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput label="First Name" name="firstName" value={profileInfo.firstName} onChange={handleProfileChange} required placeholder="Enter first name" />
        <FormInput label="Last Name" name="lastName" value={profileInfo.lastName} onChange={handleProfileChange} required placeholder="Enter last name" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput label="Email Address" name="email" type="email" value={profileInfo.email} onChange={handleProfileChange} required placeholder="your@email.com" />
        <FormInput label="Phone Number" name="phone" value={profileInfo.phone} onChange={handleProfileChange} placeholder="+63 XXX XXX XXXX" />
      </div>
      <FormInput label="Role" name="role" value={profileInfo.role} onChange={handleProfileChange} disabled hint="Contact administrator to change your role" />
      
      <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
        <Button onClick={handleSaveProfile}>
          <Save size={16} className="mr-1.5" />
          Update Profile
        </Button>
      </div>
    </div>
  );

  // Security Section
  const SecuritySection = () => (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Password Requirements</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase and lowercase letters</li>
              <li>• Contains at least one number</li>
              <li>• Contains at least one special character</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="relative">
        <FormInput label="Current Password" name="currentPassword" type={showPassword ? 'text' : 'password'} value={securityInfo.currentPassword} onChange={handleSecurityChange} required placeholder="Enter current password" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput label="New Password" name="newPassword" type={showPassword ? 'text' : 'password'} value={securityInfo.newPassword} onChange={handleSecurityChange} required placeholder="Enter new password" />
        <FormInput label="Confirm New Password" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={securityInfo.confirmPassword} onChange={handleSecurityChange} required placeholder="Confirm new password" />
      </div>
      
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="w-4 h-4 rounded border-primary-300 dark:border-primary-700 text-primary-500 focus:ring-primary-500" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Show passwords</span>
      </label>

      <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
        <Button onClick={handleSaveSecurity}>
          <Lock size={16} className="mr-1.5" />
          Change Password
        </Button>
      </div>
    </div>
  );

  // Notifications Section
  const NotificationsSection = () => (
    <div className="space-y-4">
      {[
        { key: 'emailNotifications', title: 'Email Notifications', description: 'Receive notifications via email' },
        { key: 'lowStockAlerts', title: 'Low Stock Alerts', description: 'Get notified when products are running low' },
        { key: 'orderUpdates', title: 'Order Updates', description: 'Receive updates on new and processed orders' },
        { key: 'salesReports', title: 'Daily Sales Reports', description: 'Get daily sales summary via email' },
        { key: 'systemUpdates', title: 'System Updates', description: 'Notifications about system maintenance' },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:border-primary-700 transition-colors">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{item.title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={notificationSettings[item.key]} 
              onChange={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-700 dark:after:bg-gray-300 after:border-primary-300 dark:border-primary-700 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>
      ))}
      
      <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
        <Button onClick={handleSaveNotifications}>
          <Save size={16} className="mr-1.5" />
          Save Preferences
        </Button>
      </div>
    </div>
  );

  // Appearance Section
  const AppearanceSection = () => {
    const colorPresets = {
      green: ['#22c55e', '#16a34a', '#15803d', '#84cc16', '#65a30d'],
      blue: ['#3b82f6', '#2563eb', '#1d4ed8', '#06b6d4', '#0891b2'],
      purple: ['#8b5cf6', '#7c3aed', '#6d28d9', '#a855f7', '#9333ea'],
      red: ['#ef4444', '#dc2626', '#b91c1c', '#f97316', '#ea580c'],
      yellow: ['#eab308', '#ca8a04', '#a16207', '#facc15', '#fde047'],
      gray: ['#6b7280', '#4b5563', '#374151', '#9ca3af', '#d1d5db'],
    };

    return (
      <div className="space-y-6">
        {/* Theme Mode */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Layout size={18} className="text-primary-500" />
            Theme Mode
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => updateTheme('mode', 'light')}
              className={`p-5 rounded-xl border-2 transition-all ${theme.mode === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-gray-700 shadow-lg shadow-primary-100 dark:shadow-gray-900/30' : 'border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:border-primary-700'}`}
            >
              <Sun size={28} className={`mx-auto mb-2 ${theme.mode === 'light' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Light Mode</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Default light theme</p>
              {theme.mode === 'light' && <CheckCircle size={18} className="text-primary-500 mx-auto mt-2" />}
            </button>
            <button 
              onClick={() => updateTheme('mode', 'dark')}
              className={`p-5 rounded-xl border-2 transition-all ${theme.mode === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-gray-700 shadow-lg shadow-primary-100 dark:shadow-gray-900/30' : 'border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:border-primary-700'}`}
            >
              <Moon size={28} className={`mx-auto mb-2 ${theme.mode === 'dark' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Dark Mode</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Easier on the eyes</p>
              {theme.mode === 'dark' && <CheckCircle size={18} className="text-primary-500 mx-auto mt-2" />}
            </button>
          </div>
        </div>

        {/* Button, Border & Hover Colors - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppearanceColorPicker
            label="Button Color"
            description="All action buttons"
            icon={Square}
            value={theme.button_primary || '#7f0518'}
            onChange={(val) => updateTheme('button_primary', val)}
            presets={colorPresets.red}
          />
          <AppearanceColorPicker
            label="Border Color"
            description="Cards, inputs, dividers"
            icon={Square}
            value={theme.border_color || '#da2b2b'}
            onChange={(val) => updateTheme('border_color', val)}
            presets={[...colorPresets.red, ...colorPresets.purple.slice(0, 2)]}
          />
          <AppearanceColorPicker
            label="Hover Color"
            description="Table rows & buttons hover"
            icon={MousePointer}
            value={theme.hover_color || '#b22e5c'}
            onChange={(val) => updateTheme('hover_color', val)}
            presets={['#b22e5c', '#a12553', '#8b1e47', '#c2365e', '#d1426a', '#e05076']}
          />
        </div>

        {/* Background Colors - 4 columns */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Layout size={18} className="text-primary-500" />
            Background Colors
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AppearanceColorPicker
              label="Body"
              description="Page background"
              icon={Paintbrush}
              value={theme.bg_body || '#f3f4f6'}
              onChange={(val) => updateTheme('bg_body', val)}
              presets={['#f3f4f6', '#f9fafb', '#e5e7eb', '#f0fdf4', '#ecfdf5']}
              compact
            />
            <AppearanceColorPicker
              label="Sidebar"
              description="Navigation bg"
              icon={Paintbrush}
              value={theme.bg_sidebar || '#ffffff'}
              onChange={(val) => updateTheme('bg_sidebar', val)}
              presets={['#ffffff', '#f9fafb', '#f3f4f6', '#f0fdf4', '#1e293b']}
              compact
            />
            <AppearanceColorPicker
              label="Content"
              description="Card background"
              icon={Paintbrush}
              value={theme.bg_content || '#ffffff'}
              onChange={(val) => updateTheme('bg_content', val)}
              presets={['#ffffff', '#f9fafb', '#fafafa', '#f0fdf4', '#ecfdf5']}
              compact
            />
            <AppearanceColorPicker
              label="Footer"
              description="Footer section"
              icon={Paintbrush}
              value={theme.bg_footer || '#111827'}
              onChange={(val) => updateTheme('bg_footer', val)}
              presets={['#111827', '#1f2937', '#0f172a', '#18181b', '#27272a']}
              compact
            />
          </div>
        </div>

        {/* Text Colors - 3 columns */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Type size={18} className="text-primary-500" />
            Text Colors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AppearanceColorPicker
              label="Content Text"
              description="Headings & body"
              icon={Type}
              value={theme.text_content || '#1f2937'}
              onChange={(val) => updateTheme('text_content', val)}
              presets={['#1f2937', '#111827', '#374151', '#0f172a', '#030712']}
              compact
            />
            <AppearanceColorPicker
              label="Secondary Text"
              description="Labels & hints"
              icon={Type}
              value={theme.text_secondary || '#6b7280'}
              onChange={(val) => updateTheme('text_secondary', val)}
              presets={['#6b7280', '#9ca3af', '#4b5563', '#374151', '#d1d5db']}
              compact
            />
            <AppearanceColorPicker
              label="Sidebar Text"
              description="Menu items"
              icon={Type}
              value={theme.text_sidebar || '#374151'}
              onChange={(val) => updateTheme('text_sidebar', val)}
              presets={['#374151', '#1f2937', '#111827', '#4b5563', '#6b7280']}
              compact
            />
          </div>
        </div>

        {/* Font Sizes - 2 columns */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Type size={18} className="text-primary-500" />
            Font Sizes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AppearanceFontSizeSlider
              label="Content Font"
              description="Base content size"
              icon={Type}
              value={theme.font_size_base || '12'}
              onChange={(val) => updateTheme('font_size_base', val)}
              min={12}
              max={22}
            />
            <AppearanceFontSizeSlider
              label="Sidebar Font"
              description="Menu item size"
              icon={Type}
              value={theme.font_size_sidebar || '12'}
              onChange={(val) => updateTheme('font_size_sidebar', val)}
              min={12}
              max={20}
            />
          </div>
        </div>

        {/* Preview & Actions - Combined */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl border-2 border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-gray-700/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Preview:</span>
            <button 
              className="px-3 py-1.5 rounded-lg font-medium text-white text-sm shadow-sm"
              style={{ backgroundColor: theme.button_primary || '#7f0518' }}
            >
              Button
            </button>
            <div 
              className="px-3 py-1.5 rounded-lg font-medium text-sm shadow-sm"
              style={{ 
                backgroundColor: theme.bg_content || '#ffffff', 
                border: `2px solid ${theme.border_color || '#da2b2b'}`,
                color: theme.text_content || '#1f2937'
              }}
            >
              Card
            </div>
            <span 
              className="text-sm"
              style={{ color: theme.text_secondary || '#6b7280' }}
            >
              Secondary
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => { 
                const result = await resetTheme(); 
                if (result.success) {
                  toast.info('Theme Reset', result.message);
                } else {
                  toast.error('Error', result.message);
                }
              }}
              disabled={saving}
            >
              <RotateCcw size={14} className="mr-1" />
              Reset
            </Button>
            <Button 
              size="sm"
              onClick={async () => {
                const result = await saveTheme();
                if (result.success) {
                  toast.success('Theme Saved', result.message);
                } else {
                  toast.error('Error', result.message);
                }
              }}
              disabled={saving}
            >
              <Save size={14} className="mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Information Section - Website Content Management
  const InformationSection = () => {
    const [activeInfoTab, setActiveInfoTab] = useState(() => {
      return searchParams.get('info') || 'home';
    });
    const [savingHome, setSavingHome] = useState(false);
    const [savingAbout, setSavingAbout] = useState(false);
    const [savingProducts, setSavingProducts] = useState(false);
    const [savingContact, setSavingContact] = useState(false);
    const [uploadingHomeImage, setUploadingHomeImage] = useState(false);
    const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
    const [uploadingProductsImage, setUploadingProductsImage] = useState(false);
    const [uploadingContactImage, setUploadingContactImage] = useState(false);
    const homeImageInputRef = useRef(null);
    const aboutImageInputRef = useRef(null);
    const productsImageInputRef = useRef(null);
    const contactImageInputRef = useRef(null);
    
    // Home page content state (populated from API)
    const [homeContent, setHomeContent] = useState({
      heroTitle: '',
      heroTitleHighlight: '',
      heroSubtitle: '',
      heroTag: '',
      heroImage: null,
      aboutTitle: '',
      aboutDescription: '',
      aboutPoints: [],
      features: [],
      stats: [],
    });

    // About page content state (populated from API)
    const [aboutContent, setAboutContent] = useState({
      heroTitle: '',
      heroTitleHighlight: '',
      heroSubtitle: '',
      heroImage: null,
      missionTitle: '',
      missionDescription: '',
      missionPoints: [],
      visionTitle: '',
      visionDescription: '',
      visionPoints: [],
      values: [],
      timeline: [],
      team: [],
    });

    // Products page content state (populated from API)
    const [productsContent, setProductsContent] = useState({
      heroTag: 'Our Products',
      heroTitle: 'Premium Rice Selection',
      heroSubtitle: 'Discover our wide range of quality rice products, from premium jasmine to nutritious brown rice',
      heroImage: null,
      badges: [
        { title: 'Fresh from Farm', icon: 'Leaf' },
        { title: 'Quality Guaranteed', icon: 'Award' },
        { title: 'Fast Delivery', icon: 'Truck' },
      ],
      ctaTitle: 'Need Bulk Orders or Custom Packaging?',
      ctaDescription: 'Contact us for wholesale pricing, bulk orders, or custom packaging solutions for your business.',
      ctaButtonText: 'Contact for Wholesale',
    });

    // Contact page content state (populated from API)
    const [contactContent, setContactContent] = useState({
      heroTag: 'Get In Touch',
      heroTitle: 'Contact Us',
      heroSubtitle: "Have questions or ready to place an order? We'd love to hear from you!",
      heroImage: null,
      formTitle: 'Send Us a Message',
      faqs: [
        { question: 'What is the minimum order for delivery?', answer: 'For deliveries within Rosario, we require a minimum of 2 sacks (50kg). For bulk orders outside Rosario, please contact us for arrangements.' },
        { question: 'Do you offer wholesale pricing?', answer: 'Yes! We offer competitive wholesale prices for businesses, restaurants, and resellers. Contact us for our wholesale price list.' },
        { question: 'What payment methods do you accept?', answer: 'We accept cash, bank transfer, GCash, Maya, and credit/debit cards for in-store purchases.' },
      ],
      socialTitle: 'Connect With Us',
      socialDescription: 'Follow us on social media for updates and promotions',
    });

    // Fetch content from API on mount
    useEffect(() => {
      const fetchContent = async () => {
        try {
          const result = await websiteContentApi.getAll();
          if (result.success && result.data) {
            if (result.data.home) {
              setHomeContent(prev => ({ ...prev, ...result.data.home }));
            }
            if (result.data.about) {
              setAboutContent(prev => ({ ...prev, ...result.data.about }));
            }
            if (result.data.products) {
              setProductsContent(prev => ({ ...prev, ...result.data.products }));
            }
            if (result.data.contact) {
              setContactContent(prev => ({ ...prev, ...result.data.contact }));
            }
          }
        } catch (error) {
          console.log('Using default content - API not available');
        }
      };
      fetchContent();
    }, []);

    const handleSaveHome = async () => {
      setSavingHome(true);
      try {
        const result = await websiteContentApi.saveHomeContent(homeContent);
        if (result.success) {
          // Clear localStorage to force refresh on public pages
          localStorage.removeItem('kjp-home-content');
          toast.success('Home Content Saved', 'Homepage content has been updated successfully.');
        } else {
          toast.error('Error', result.message || 'Failed to save home content');
        }
      } catch (error) {
        toast.error('Error', 'Failed to connect to server');
      } finally {
        setSavingHome(false);
      }
    };

    const handleSaveAbout = async () => {
      setSavingAbout(true);
      try {
        const result = await websiteContentApi.saveAboutContent(aboutContent);
        if (result.success) {
          // Clear localStorage to force refresh on public pages
          localStorage.removeItem('kjp-about-content');
          toast.success('About Content Saved', 'About page content has been updated successfully.');
        } else {
          toast.error('Error', result.message || 'Failed to save about content');
        }
      } catch (error) {
        toast.error('Error', 'Failed to connect to server');
      } finally {
        setSavingAbout(false);
      }
    };

    const handleHomeHeroImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploadingHomeImage(true);
      try {
        const result = await websiteContentApi.uploadHeroImage(file, 'home');
        if (result.success || result.data?.success) {
          const imageUrl = result.data?.image_url || result.data?.data?.image_url;
          setHomeContent(prev => ({ ...prev, heroImage: imageUrl }));
          localStorage.removeItem('kjp-home-content');
          toast.success('Image Uploaded', 'Home hero image has been updated.');
        } else {
          toast.error('Error', result.data?.message || 'Failed to upload image');
        }
      } catch (error) {
        toast.error('Error', 'Failed to upload image');
      } finally {
        setUploadingHomeImage(false);
      }
    };

    const handleAboutHeroImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploadingAboutImage(true);
      try {
        const result = await websiteContentApi.uploadHeroImage(file, 'about');
        if (result.success || result.data?.success) {
          const imageUrl = result.data?.image_url || result.data?.data?.image_url;
          setAboutContent(prev => ({ ...prev, heroImage: imageUrl }));
          localStorage.removeItem('kjp-about-content');
          toast.success('Image Uploaded', 'About hero image has been updated.');
        } else {
          toast.error('Error', result.data?.message || 'Failed to upload image');
        }
      } catch (error) {
        toast.error('Error', 'Failed to upload image');
      } finally {
        setUploadingAboutImage(false);
      }
    };

    const handleSaveProducts = async () => {
      setSavingProducts(true);
      try {
        const result = await websiteContentApi.saveProductsContent(productsContent);
        if (result.success) {
          localStorage.removeItem('kjp-products-content');
          toast.success('Products Content Saved', 'Products page content has been updated successfully.');
        } else {
          toast.error('Error', result.message || 'Failed to save products content');
        }
      } catch (error) {
        toast.error('Error', 'Failed to connect to server');
      } finally {
        setSavingProducts(false);
      }
    };

    const handleSaveContact = async () => {
      setSavingContact(true);
      try {
        const result = await websiteContentApi.saveContactContent(contactContent);
        if (result.success) {
          localStorage.removeItem('kjp-contact-content');
          toast.success('Contact Content Saved', 'Contact page content has been updated successfully.');
        } else {
          toast.error('Error', result.message || 'Failed to save contact content');
        }
      } catch (error) {
        toast.error('Error', 'Failed to connect to server');
      } finally {
        setSavingContact(false);
      }
    };

    const handleProductsHeroImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploadingProductsImage(true);
      try {
        const result = await websiteContentApi.uploadHeroImage(file, 'products');
        if (result.success || result.data?.success) {
          const imageUrl = result.data?.image_url || result.data?.data?.image_url;
          setProductsContent(prev => ({ ...prev, heroImage: imageUrl }));
          localStorage.removeItem('kjp-products-content');
          toast.success('Image Uploaded', 'Products hero image has been updated.');
        } else {
          toast.error('Error', result.data?.message || 'Failed to upload image');
        }
      } catch (error) {
        toast.error('Error', 'Failed to upload image');
      } finally {
        setUploadingProductsImage(false);
      }
    };

    const handleContactHeroImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploadingContactImage(true);
      try {
        const result = await websiteContentApi.uploadHeroImage(file, 'contact');
        if (result.success || result.data?.success) {
          const imageUrl = result.data?.image_url || result.data?.data?.image_url;
          setContactContent(prev => ({ ...prev, heroImage: imageUrl }));
          localStorage.removeItem('kjp-contact-content');
          toast.success('Image Uploaded', 'Contact hero image has been updated.');
        } else {
          toast.error('Error', result.data?.message || 'Failed to upload image');
        }
      } catch (error) {
        toast.error('Error', 'Failed to upload image');
      } finally {
        setUploadingContactImage(false);
      }
    };

    const handleAddFeature = () => {
      setHomeContent({
        ...homeContent,
        features: [...homeContent.features, { title: 'New Feature', description: 'Feature description here' }],
      });
    };

    const handleRemoveFeature = (index) => {
      setHomeContent({
        ...homeContent,
        features: homeContent.features.filter((_, i) => i !== index),
      });
    };

    const handleUpdateFeature = (index, field, value) => {
      const updated = [...homeContent.features];
      updated[index][field] = value;
      setHomeContent({ ...homeContent, features: updated });
    };

    const handleAddTimeline = () => {
      setAboutContent({
        ...aboutContent,
        timeline: [...aboutContent.timeline, { year: '2025', title: 'New Milestone', description: 'Description here' }],
      });
    };

    const handleRemoveTimeline = (index) => {
      setAboutContent({
        ...aboutContent,
        timeline: aboutContent.timeline.filter((_, i) => i !== index),
      });
    };

    const handleAddValue = () => {
      setAboutContent({
        ...aboutContent,
        values: [...aboutContent.values, { title: 'New Value', description: 'Value description here' }],
      });
    };

    const handleRemoveValue = (index) => {
      setAboutContent({
        ...aboutContent,
        values: aboutContent.values.filter((_, i) => i !== index),
      });
    };

    return (
      <div className="space-y-6">
        {/* Tab Navigation - Centered */}
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5 gap-1">
            <button
              onClick={() => { setActiveInfoTab('home'); setSearchParams({ tab: 'information', info: 'home' }, { replace: true }); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'home'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-600'
              }`}
            >
              <Home size={16} />
              Home Page
            </button>
            <button
              onClick={() => { setActiveInfoTab('about'); setSearchParams({ tab: 'information', info: 'about' }, { replace: true }); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'about'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-600'
              }`}
            >
              <FileText size={16} />
              About Page
            </button>
            <button
              onClick={() => { setActiveInfoTab('products'); setSearchParams({ tab: 'information', info: 'products' }, { replace: true }); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'products'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-600'
              }`}
            >
              <Package size={16} />
              Products Page
            </button>
            <button
              onClick={() => { setActiveInfoTab('contact'); setSearchParams({ tab: 'information', info: 'contact' }, { replace: true }); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'contact'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-600'
              }`}
            >
              <MessageCircle size={16} />
              Contact Page
            </button>
          </div>
        </div>

        {/* Home Page Content */}
        {activeInfoTab === 'home' && (
          <div className={`space-y-6 transition-opacity duration-200 ${savingHome ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary-600 dark:text-primary-400" />
                Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                    {homeContent.heroImage ? (
                      <img src={getFullImageUrl(homeContent.heroImage)} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload an image for the hero section background (JPG, PNG, SVG, WebP - Max 10MB)</p>
                    <input
                      ref={homeImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      onChange={handleHomeHeroImageUpload}
                      className="hidden"
                      disabled={uploadingHomeImage}
                    />
                    <Button variant="outline" size="sm" onClick={() => homeImageInputRef.current?.click()} disabled={uploadingHomeImage}>
                      {uploadingHomeImage ? (
                        <>
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={14} className="mr-1.5" />
                          Change Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput 
                  label="Hero Title" 
                  value={homeContent.heroTitle} 
                  onChange={(e) => setHomeContent({ ...homeContent, heroTitle: e.target.value })} 
                />
                <FormInput 
                  label="Hero Title Highlight" 
                  value={homeContent.heroTitleHighlight} 
                  onChange={(e) => setHomeContent({ ...homeContent, heroTitleHighlight: e.target.value })} 
                />
              </div>
              <FormInput 
                label="Hero Tag" 
                value={homeContent.heroTag} 
                onChange={(e) => setHomeContent({ ...homeContent, heroTag: e.target.value })} 
              />
              <FormTextarea 
                label="Hero Subtitle" 
                value={homeContent.heroSubtitle} 
                onChange={(e) => setHomeContent({ ...homeContent, heroSubtitle: e.target.value })} 
                rows={2}
              />
            </div>

            {/* Statistics */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
                <Award size={18} className="text-primary-600 dark:text-primary-400" />
                Statistics
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Values are auto-calculated from real database records. You can customize the labels.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {homeContent.stats.map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Value <span className="text-gray-400">(Auto)</span></label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg border-2 border-primary-200 dark:border-primary-600 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-not-allowed">
                        {stat.value}
                      </div>
                    </div>
                    <FormInput 
                      label="Label" 
                      value={stat.label} 
                      onChange={(e) => {
                        const updated = [...homeContent.stats];
                        updated[index].label = e.target.value;
                        setHomeContent({ ...homeContent, stats: updated });
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Shield size={18} className="text-primary-600 dark:text-primary-400" />
                  Features ({homeContent.features.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddFeature}>
                  <Plus size={14} className="mr-1" /> Add Feature
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeContent.features.map((feature, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative">
                    <button
                      onClick={() => handleRemoveFeature(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Title" 
                      value={feature.title} 
                      onChange={(e) => handleUpdateFeature(index, 'title', e.target.value)} 
                    />
                    <FormTextarea 
                      label="Description" 
                      value={feature.description} 
                      onChange={(e) => handleUpdateFeature(index, 'description', e.target.value)} 
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* About Preview Section */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Eye size={18} className="text-primary-600 dark:text-primary-400" />
                About Preview Section (on Home)
              </h4>
              <FormInput 
                label="About Title" 
                value={homeContent.aboutTitle} 
                onChange={(e) => setHomeContent({ ...homeContent, aboutTitle: e.target.value })} 
              />
              <FormTextarea 
                label="About Description" 
                value={homeContent.aboutDescription} 
                onChange={(e) => setHomeContent({ ...homeContent, aboutDescription: e.target.value })} 
                rows={3}
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">About Points</label>
                {homeContent.aboutPoints.map((point, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const updated = [...homeContent.aboutPoints];
                        updated[index] = e.target.value;
                        setHomeContent({ ...homeContent, aboutPoints: updated });
                      }}
                      className="flex-1 px-3 py-2 border-2 border-primary-200 dark:border-primary-700 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
              <Button onClick={handleSaveHome} disabled={savingHome}>
                {savingHome ? (
                  <><Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} className="mr-1.5" /> Save Home Content</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* About Page Content */}
        {activeInfoTab === 'about' && (
          <div className={`space-y-6 transition-opacity duration-200 ${savingAbout ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary-600 dark:text-primary-400" />
                About Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                    {aboutContent.heroImage ? (
                      <img src={getFullImageUrl(aboutContent.heroImage)} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload an image for the hero section background (JPG, PNG, SVG, WebP - Max 10MB)</p>
                    <input
                      ref={aboutImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      onChange={handleAboutHeroImageUpload}
                      className="hidden"
                      disabled={uploadingAboutImage}
                    />
                    <Button variant="outline" size="sm" onClick={() => aboutImageInputRef.current?.click()} disabled={uploadingAboutImage}>
                      {uploadingAboutImage ? (
                        <>
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={14} className="mr-1.5" />
                          Change Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput 
                  label="Hero Title" 
                  value={aboutContent.heroTitle} 
                  onChange={(e) => setAboutContent({ ...aboutContent, heroTitle: e.target.value })} 
                />
                <FormInput 
                  label="Hero Title Highlight" 
                  value={aboutContent.heroTitleHighlight} 
                  onChange={(e) => setAboutContent({ ...aboutContent, heroTitleHighlight: e.target.value })} 
                />
              </div>
              <FormTextarea 
                label="Hero Subtitle" 
                value={aboutContent.heroSubtitle} 
                onChange={(e) => setAboutContent({ ...aboutContent, heroSubtitle: e.target.value })} 
                rows={2}
              />
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-primary-600 dark:text-primary-400" />
                  Mission
                </h4>
                <FormInput 
                  label="Mission Title" 
                  value={aboutContent.missionTitle} 
                  onChange={(e) => setAboutContent({ ...aboutContent, missionTitle: e.target.value })} 
                />
                <FormTextarea 
                  label="Mission Description" 
                  value={aboutContent.missionDescription} 
                  onChange={(e) => setAboutContent({ ...aboutContent, missionDescription: e.target.value })} 
                  rows={3}
                />
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Mission Points</label>
                  {aboutContent.missionPoints.map((point, index) => (
                    <input
                      key={index}
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const updated = [...aboutContent.missionPoints];
                        updated[index] = e.target.value;
                        setAboutContent({ ...aboutContent, missionPoints: updated });
                      }}
                      className="w-full px-3 py-2 mb-2 border-2 border-primary-200 dark:border-primary-700 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  ))}
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-primary-600 dark:text-primary-400" />
                  Vision
                </h4>
                <FormInput 
                  label="Vision Title" 
                  value={aboutContent.visionTitle} 
                  onChange={(e) => setAboutContent({ ...aboutContent, visionTitle: e.target.value })} 
                />
                <FormTextarea 
                  label="Vision Description" 
                  value={aboutContent.visionDescription} 
                  onChange={(e) => setAboutContent({ ...aboutContent, visionDescription: e.target.value })} 
                  rows={3}
                />
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Vision Points</label>
                  {aboutContent.visionPoints.map((point, index) => (
                    <input
                      key={index}
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const updated = [...aboutContent.visionPoints];
                        updated[index] = e.target.value;
                        setAboutContent({ ...aboutContent, visionPoints: updated });
                      }}
                      className="w-full px-3 py-2 mb-2 border-2 border-primary-200 dark:border-primary-700 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Core Values */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Heart size={18} className="text-primary-600 dark:text-primary-400" />
                  Core Values ({aboutContent.values.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddValue}>
                  <Plus size={14} className="mr-1" /> Add Value
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aboutContent.values.map((value, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative">
                    <button
                      onClick={() => handleRemoveValue(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Value Title" 
                      value={value.title} 
                      onChange={(e) => {
                        const updated = [...aboutContent.values];
                        updated[index].title = e.target.value;
                        setAboutContent({ ...aboutContent, values: updated });
                      }} 
                    />
                    <FormTextarea 
                      label="Description" 
                      value={value.description} 
                      onChange={(e) => {
                        const updated = [...aboutContent.values];
                        updated[index].description = e.target.value;
                        setAboutContent({ ...aboutContent, values: updated });
                      }} 
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
                  Company Timeline ({aboutContent.timeline.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddTimeline}>
                  <Plus size={14} className="mr-1" /> Add Milestone
                </Button>
              </div>
              <div className="space-y-4">
                {aboutContent.timeline.map((item, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative">
                    <button
                      onClick={() => handleRemoveTimeline(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormInput 
                        label="Year" 
                        value={item.year} 
                        onChange={(e) => {
                          const updated = [...aboutContent.timeline];
                          updated[index].year = e.target.value;
                          setAboutContent({ ...aboutContent, timeline: updated });
                        }} 
                      />
                      <FormInput 
                        label="Title" 
                        value={item.title} 
                        onChange={(e) => {
                          const updated = [...aboutContent.timeline];
                          updated[index].title = e.target.value;
                          setAboutContent({ ...aboutContent, timeline: updated });
                        }} 
                      />
                      <div className="md:col-span-2">
                        <FormInput 
                          label="Description" 
                          value={item.description} 
                          onChange={(e) => {
                            const updated = [...aboutContent.timeline];
                            updated[index].description = e.target.value;
                            setAboutContent({ ...aboutContent, timeline: updated });
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Members */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Users size={18} className="text-primary-600 dark:text-primary-400" />
                  Team Members ({aboutContent.team.length})
                </h4>
                <Button size="sm" variant="outline" onClick={() => setAboutContent({ ...aboutContent, team: [...aboutContent.team, { name: '', role: '' }] })}>
                  <Plus size={14} className="mr-1" /> Add Member
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {aboutContent.team.map((member, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = aboutContent.team.filter((_, i) => i !== index);
                        setAboutContent({ ...aboutContent, team: updated });
                      }}
                      className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove member"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Name" 
                      value={member.name} 
                      onChange={(e) => {
                        const updated = [...aboutContent.team];
                        updated[index].name = e.target.value;
                        setAboutContent({ ...aboutContent, team: updated });
                      }} 
                    />
                    <FormInput 
                      label="Role" 
                      value={member.role} 
                      onChange={(e) => {
                        const updated = [...aboutContent.team];
                        updated[index].role = e.target.value;
                        setAboutContent({ ...aboutContent, team: updated });
                      }} 
                    />
                  </div>
                ))}
              </div>
              {aboutContent.team.length === 0 && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">No team members added. Click "Add Member" to get started.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
              <Button onClick={handleSaveAbout} disabled={savingAbout}>
                {savingAbout ? (
                  <><Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} className="mr-1.5" /> Save About Content</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Products Page Content */}
        {activeInfoTab === 'products' && (
          <div className={`space-y-6 transition-opacity duration-200 ${savingProducts ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary-600 dark:text-primary-400" />
                Products Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                    {productsContent.heroImage ? (
                      <img src={getFullImageUrl(productsContent.heroImage)} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload an image for the hero section background (JPG, PNG, SVG, WebP - Max 10MB)</p>
                    <input
                      ref={productsImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      onChange={handleProductsHeroImageUpload}
                      className="hidden"
                      disabled={uploadingProductsImage}
                    />
                    <Button variant="outline" size="sm" onClick={() => productsImageInputRef.current?.click()} disabled={uploadingProductsImage}>
                      {uploadingProductsImage ? (
                        <>
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={14} className="mr-1.5" />
                          Change Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <FormInput 
                label="Hero Tag" 
                value={productsContent.heroTag} 
                onChange={(e) => setProductsContent({ ...productsContent, heroTag: e.target.value })} 
              />
              <FormInput 
                label="Hero Title" 
                value={productsContent.heroTitle} 
                onChange={(e) => setProductsContent({ ...productsContent, heroTitle: e.target.value })} 
              />
              <FormTextarea 
                label="Hero Subtitle" 
                value={productsContent.heroSubtitle} 
                onChange={(e) => setProductsContent({ ...productsContent, heroSubtitle: e.target.value })} 
                rows={2}
              />
            </div>

            {/* Feature Badges */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Award size={18} className="text-primary-600 dark:text-primary-400" />
                  Feature Badges ({productsContent.badges.length})
                </h4>
                <Button size="sm" variant="outline" onClick={() => setProductsContent({ ...productsContent, badges: [...productsContent.badges, { title: 'New Badge', icon: 'Award' }] })}>
                  <Plus size={14} className="mr-1" /> Add Badge
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productsContent.badges.map((badge, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative">
                    <button
                      onClick={() => setProductsContent({ ...productsContent, badges: productsContent.badges.filter((_, i) => i !== index) })}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Badge Text" 
                      value={badge.title} 
                      onChange={(e) => {
                        const updated = [...productsContent.badges];
                        updated[index].title = e.target.value;
                        setProductsContent({ ...productsContent, badges: updated });
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-primary-600 dark:text-primary-400" />
                Call-to-Action Section
              </h4>
              <FormInput 
                label="CTA Title" 
                value={productsContent.ctaTitle} 
                onChange={(e) => setProductsContent({ ...productsContent, ctaTitle: e.target.value })} 
              />
              <FormTextarea 
                label="CTA Description" 
                value={productsContent.ctaDescription} 
                onChange={(e) => setProductsContent({ ...productsContent, ctaDescription: e.target.value })} 
                rows={2}
              />
              <FormInput 
                label="CTA Button Text" 
                value={productsContent.ctaButtonText} 
                onChange={(e) => setProductsContent({ ...productsContent, ctaButtonText: e.target.value })} 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
              <Button onClick={handleSaveProducts} disabled={savingProducts}>
                {savingProducts ? (
                  <><Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} className="mr-1.5" /> Save Products Content</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Contact Page Content */}
        {activeInfoTab === 'contact' && (
          <div className={`space-y-6 transition-opacity duration-200 ${savingContact ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary-600 dark:text-primary-400" />
                Contact Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                    {contactContent.heroImage ? (
                      <img src={getFullImageUrl(contactContent.heroImage)} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload an image for the hero section background (JPG, PNG, SVG, WebP - Max 10MB)</p>
                    <input
                      ref={contactImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      onChange={handleContactHeroImageUpload}
                      className="hidden"
                      disabled={uploadingContactImage}
                    />
                    <Button variant="outline" size="sm" onClick={() => contactImageInputRef.current?.click()} disabled={uploadingContactImage}>
                      {uploadingContactImage ? (
                        <>
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={14} className="mr-1.5" />
                          Change Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <FormInput 
                label="Hero Tag" 
                value={contactContent.heroTag} 
                onChange={(e) => setContactContent({ ...contactContent, heroTag: e.target.value })} 
              />
              <FormInput 
                label="Hero Title" 
                value={contactContent.heroTitle} 
                onChange={(e) => setContactContent({ ...contactContent, heroTitle: e.target.value })} 
              />
              <FormTextarea 
                label="Hero Subtitle" 
                value={contactContent.heroSubtitle} 
                onChange={(e) => setContactContent({ ...contactContent, heroSubtitle: e.target.value })} 
                rows={2}
              />
            </div>

            {/* Form Section */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Edit3 size={18} className="text-primary-600 dark:text-primary-400" />
                Form Section
              </h4>
              <FormInput 
                label="Form Title" 
                value={contactContent.formTitle} 
                onChange={(e) => setContactContent({ ...contactContent, formTitle: e.target.value })} 
              />
            </div>

            {/* FAQs */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Info size={18} className="text-primary-600 dark:text-primary-400" />
                  FAQs ({contactContent.faqs.length})
                </h4>
                <Button size="sm" variant="outline" onClick={() => setContactContent({ ...contactContent, faqs: [...contactContent.faqs, { question: 'New Question?', answer: 'Answer here' }] })}>
                  <Plus size={14} className="mr-1" /> Add FAQ
                </Button>
              </div>
              <div className="space-y-4">
                {contactContent.faqs.map((faq, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-700 relative">
                    <button
                      onClick={() => setContactContent({ ...contactContent, faqs: contactContent.faqs.filter((_, i) => i !== index) })}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Question" 
                      value={faq.question} 
                      onChange={(e) => {
                        const updated = [...contactContent.faqs];
                        updated[index].question = e.target.value;
                        setContactContent({ ...contactContent, faqs: updated });
                      }} 
                    />
                    <FormTextarea 
                      label="Answer" 
                      value={faq.answer} 
                      onChange={(e) => {
                        const updated = [...contactContent.faqs];
                        updated[index].answer = e.target.value;
                        setContactContent({ ...contactContent, faqs: updated });
                      }} 
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Section */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Share2 size={18} className="text-primary-600 dark:text-primary-400" />
                Social Section
              </h4>
              <FormInput 
                label="Social Title" 
                value={contactContent.socialTitle} 
                onChange={(e) => setContactContent({ ...contactContent, socialTitle: e.target.value })} 
              />
              <FormTextarea 
                label="Social Description" 
                value={contactContent.socialDescription} 
                onChange={(e) => setContactContent({ ...contactContent, socialDescription: e.target.value })} 
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
              <Button onClick={handleSaveContact} disabled={savingContact}>
                {savingContact ? (
                  <><Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} className="mr-1.5" /> Save Contact Content</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Data Section
  const DataSection = () => {
    const [dbInfo, setDbInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [importing, setImporting] = useState(false);
    const importFileRef = useRef(null);
    const [importTable, setImportTable] = useState('products');

    const importableTables = [
      { value: 'products', label: 'Products' },
      { value: 'varieties', label: 'Varieties' },
      { value: 'customers', label: 'Customers' },
      { value: 'suppliers', label: 'Suppliers' },
      { value: 'procurements', label: 'Procurements' },
      { value: 'processings', label: 'Processings' },
      { value: 'drying_processes', label: 'Drying Processes' },
      { value: 'stock_logs', label: 'Stock Logs' },
      { value: 'orders', label: 'Orders' },
    ];

    const fetchDatabaseInfo = async () => {
      setLoadingInfo(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/database/info`, {
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDbInfo(data);
        } else {
          toast.error('Error', 'Failed to fetch database info');
        }
      } catch (error) {
        console.error('Error fetching database info:', error);
        toast.error('Error', 'Could not connect to server');
      } finally {
        setLoadingInfo(false);
      }
    };

    const handleExportSQL = async () => {
      setExporting(true);
      toast.info('Export Started', 'Preparing your database backup...');
      
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/database/export`, {
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = 'backup.sql';
          
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
          }
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast.success('Export Complete', `Database backup saved as ${filename}`);
        } else {
          toast.error('Export Failed', 'Could not export database');
        }
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Export Failed', 'An error occurred during export');
      } finally {
        setExporting(false);
      }
    };

    const handleExportCSV = async () => {
      setExportingCsv(true);
      toast.info('Export Started', 'Preparing CSV export...');
      
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/database/export-csv`, {
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = 'data_export.zip';
          
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
          }
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast.success('Export Complete', `CSV data exported as ${filename}`);
        } else {
          toast.error('Export Failed', 'Could not export CSV data');
        }
      } catch (error) {
        console.error('CSV export error:', error);
        toast.error('Export Failed', 'An error occurred during CSV export');
      } finally {
        setExportingCsv(false);
      }
    };

    const handleImportCSV = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setImporting(true);
      toast.info('Import Started', `Importing ${file.name} into ${importTable}...`);
      
      try {
        const token = localStorage.getItem('auth_token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('table', importTable);
        
        const response = await fetch(`${API_BASE_URL}/database/import-csv`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: formData,
        });
        
        const data = await response.json();
        
        if (response.ok) {
          toast.success('Import Complete', data.message);
        } else {
          toast.error('Import Failed', data.message || 'Could not import data');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Import Failed', 'An error occurred during import');
      } finally {
        setImporting(false);
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };

    // Fetch database info on mount
    useEffect(() => {
      fetchDatabaseInfo();
    }, []);

    return (
      <div className="space-y-6">
        {/* Database Backup */}
        <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-primary-200 dark:border-primary-700">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-500 rounded-xl">
              <Database size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Database Backup (.SQL)</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Export your entire database as a .sql file. This backup includes all tables, 
                structure, and data which can be restored using phpMyAdmin or MySQL command line.
              </p>
              
              {/* Database Info */}
              {dbInfo && (
                <div className="mb-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg border border-primary-200 dark:border-primary-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Database:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{dbInfo.database}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tables:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{dbInfo.tables_count}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Total Rows:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{dbInfo.total_rows?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{dbInfo.total_size}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="primary" 
                  onClick={handleExportSQL}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 size={16} className="mr-1.5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-1.5" />
                      Export SQL Backup
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchDatabaseInfo}
                  disabled={loadingInfo}
                >
                  {loadingInfo ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RotateCcw size={16} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CSV Export */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
            <Download size={32} className="text-primary-600 dark:text-primary-400 mb-3" />
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Export Data (CSV)</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Download all business data as a ZIP of CSV files</p>
            <Button variant="outline" onClick={handleExportCSV} disabled={exportingCsv}>
              {exportingCsv ? (
                <>
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} className="mr-1.5" />
                  Export as CSV
                </>
              )}
            </Button>
          </div>

          {/* CSV Import */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-primary-200 dark:border-primary-700">
            <Upload size={32} className="text-blue-600 dark:text-blue-400 mb-3" />
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Import Data</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Import data from a CSV file into a table</p>
            <div className="mb-3">
              <FormSelect
                label="Target Table"
                value={importTable}
                onChange={(e) => setImportTable(e.target.value)}
                options={importableTables}
              />
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button variant="outline" onClick={() => importFileRef.current?.click()} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-1.5" />
                  Select CSV File
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSection();
      case 'profile': return <ProfileSection />;
      case 'security': return <SecuritySection />;
      case 'appearance': return <AppearanceSection />;
      case 'information': return <InformationSection />;
      case 'data': return <DataSection />;
      case 'accounts': return <AdminAccounts />;
      case 'audit-trail': return <AuditTrail />;
      case 'archives': return <Archives />;
      default: return renderGeneralSection();
    }
  };

  const currentSection = settingsSections.find(s => s.id === activeSection);

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and application preferences" icon={SettingsIcon} />

      {/* Horizontal Navigation Tabs */}
      <Card className="mb-6">
        <CardContent className="p-2">
          <nav className="flex flex-wrap gap-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  activeSection === section.id 
                    ? 'bg-button-500 text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-button-100 hover:text-button-700 dark:text-button-300'
                }`}
              >
                <section.icon size={18} className={activeSection === section.id ? 'text-white' : 'text-gray-400 dark:text-gray-500 dark:text-gray-400 group-hover:text-button-600 dark:hover:text-button-400 dark:text-button-400'} />
                <span className="font-medium text-sm">{section.title}</span>
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Settings Content */}
      {activeSection === 'audit-trail' || activeSection === 'archives' || activeSection === 'accounts' ? (
        /* Audit Trail & Archives render as full-page components */
        renderContent()
      ) : (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary-200 dark:border-primary-700">
            <div className="p-2.5 bg-primary-50 dark:bg-gray-700 rounded-xl">
              <currentSection.icon size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{currentSection.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{currentSection.description}</p>
            </div>
          </div>
          {renderContent()}
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default Settings;
