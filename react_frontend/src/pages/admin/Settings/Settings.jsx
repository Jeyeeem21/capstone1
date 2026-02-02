import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database, Save, Building2, Mail, Phone, MapPin, Globe, Camera, Shield, Eye, EyeOff, Moon, Sun, Download, Upload, Trash2, CheckCircle, RotateCcw, Paintbrush, Square, Type, Layout, Loader2, Users, X, Info, Home, FileText, Edit3, Plus, Award, Target, Leaf, Heart, Truck, Calendar, RefreshCw, Clock, Facebook, Twitter, Instagram, Linkedin, Share2, MousePointer } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { Card, CardContent, Button, Tabs, FormInput, FormSelect, FormTextarea, useToast, SkeletonSettings } from '../../../components/ui';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessSettings } from '../../../context/BusinessSettingsContext';
import { websiteContentApi, businessSettingsApi } from '../../../api';
import { API_BASE_URL } from '../../../api/config';

// Helper to get full logo URL
const getFullLogoUrl = (logoPath) => {
  if (!logoPath || logoPath === '/logo.svg') return '/logo.svg';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('blob:')) return logoPath;
  // Convert Laravel storage path to full URL
  const backendUrl = API_BASE_URL.replace('/api', '');
  return `${backendUrl}${logoPath}`;
};

const Settings = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { theme, updateTheme, saveTheme, resetTheme, defaultTheme, saving } = useTheme();
  const { user, switchRole } = useAuth();
  const { settings: contextSettings, updateSettings: updateContextSettings } = useBusinessSettings();
  const [activeSection, setActiveSection] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states - initialize from context
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_tagline: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    business_open_days: '',
    business_open_time: '',
    business_close_time: '',
    footer_tagline: '',
    footer_copyright: '',
    footer_powered_by: '',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_linkedin: '',
  });
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('/logo.svg');
  const logoInputRef = useRef(null);
  
  const [profileInfo, setProfileInfo] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    phone: '+63 912 345 6789',
    role: 'Administrator',
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
          business_email: cachedData.business_email ?? '',
          business_phone: cachedData.business_phone ?? '',
          business_address: cachedData.business_address ?? '',
          business_open_days: cachedData.business_open_days ?? '',
          business_open_time: cachedData.business_open_time ?? '',
          business_close_time: cachedData.business_close_time ?? '',
          footer_tagline: cachedData.footer_tagline ?? '',
          footer_copyright: cachedData.footer_copyright ?? '',
          footer_powered_by: cachedData.footer_powered_by ?? '',
          social_facebook: cachedData.social_facebook ?? '',
          social_twitter: cachedData.social_twitter ?? '',
          social_instagram: cachedData.social_instagram ?? '',
          social_linkedin: cachedData.social_linkedin ?? '',
        });
        if (cachedData.business_logo && cachedData.business_logo !== '/logo.svg' && !cachedData.business_logo.startsWith('blob:')) {
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
            business_email: data.business_email ?? '',
            business_phone: data.business_phone ?? '',
            business_address: data.business_address ?? '',
            business_open_days: data.business_open_days ?? '',
            business_open_time: data.business_open_time ?? '',
            business_close_time: data.business_close_time ?? '',
            footer_tagline: data.footer_tagline ?? '',
            footer_copyright: data.footer_copyright ?? '',
            footer_powered_by: data.footer_powered_by ?? '',
            social_facebook: data.social_facebook ?? '',
            social_twitter: data.social_twitter ?? '',
            social_instagram: data.social_instagram ?? '',
            social_linkedin: data.social_linkedin ?? '',
          });
          if (data.business_logo && data.business_logo !== '/logo.svg' && !data.business_logo.startsWith('blob:')) {
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
          setLogoPreview(contextSettings.business_logo || '/logo.svg');
          setLogoFile(null);
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        toast.error('Upload Error', 'An error occurred while uploading the logo.');
        // Revert to previous logo
        setLogoPreview(contextSettings.business_logo || '/logo.svg');
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
        : (contextSettings.business_logo || '/logo.svg');
      
      // Save other settings
      console.log('Saving business settings...', businessInfo);
      const updateResult = await businessSettingsApi.update(businessInfo);
      console.log('Update result:', updateResult);
      
      // Format hours for display
      const formattedHours = `${businessInfo.business_open_days}: ${formatTime(businessInfo.business_open_time)} - ${formatTime(businessInfo.business_close_time)}`;
      
      // Update context for real-time changes across app (Sidebar, Footer, etc.)
      updateContextSettings({
        ...businessInfo,
        business_logo: currentLogoUrl,
        business_hours: formattedHours,
        business_hours_formatted: formattedHours,
      });
      
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

  const dayOptions = [
    { value: 'Monday - Saturday', label: 'Monday - Saturday' },
    { value: 'Monday - Friday', label: 'Monday - Friday' },
    { value: 'Monday - Sunday', label: 'Monday - Sunday (Everyday)' },
    { value: 'Tuesday - Sunday', label: 'Tuesday - Sunday' },
  ];

  const settingsSections = [
    { id: 'general', icon: Building2, title: 'General', description: 'Business information' },
    { id: 'profile', icon: User, title: 'Profile', description: 'Your account settings' },
    { id: 'security', icon: Lock, title: 'Security', description: 'Password & security' },
    { id: 'appearance', icon: Palette, title: 'Appearance', description: 'Theme & display' },
    { id: 'information', icon: Info, title: 'Information', description: 'Website content' },
    { id: 'data', icon: Database, title: 'Data', description: 'Backup & export' },
  ];

  // Role Switcher Section (for demo purposes)
  const RoleSwitcherSection = () => {
    const handleRoleSwitch = (role) => {
      switchRole(role);
      toast.success('Role Switched', `You are now viewing as ${role === 'admin' ? 'Administrator' : 'Staff'}`);
      if (role === 'staff') {
        navigate('/staff/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
          <p className="text-yellow-700 text-sm">
            <strong>Demo Mode:</strong> Use this section to test different user views. 
            In production, users would be assigned roles through the Staff Management page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admin Role Card */}
          <div 
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              user?.role === 'admin' 
                ? 'border-button-500 bg-button-50 shadow-lg' 
                : 'border-gray-200 hover:border-button-300 bg-white'
            }`}
            onClick={() => handleRoleSwitch('admin')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${user?.role === 'admin' ? 'bg-button-500' : 'bg-gray-100'}`}>
                <Shield size={28} className={user?.role === 'admin' ? 'text-white' : 'text-gray-600'} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Administrator</h3>
                <p className="text-sm text-gray-500">Full system access</p>
              </div>
              {user?.role === 'admin' && (
                <div className="ml-auto">
                  <CheckCircle size={24} className="text-button-500" />
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
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
                ? 'border-button-500 bg-button-50 shadow-lg' 
                : 'border-gray-200 hover:border-button-300 bg-white'
            }`}
            onClick={() => handleRoleSwitch('staff')}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${user?.role === 'staff' ? 'bg-button-500' : 'bg-gray-100'}`}>
                <User size={28} className={user?.role === 'staff' ? 'text-white' : 'text-gray-600'} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Staff</h3>
                <p className="text-sm text-gray-500">Limited access</p>
              </div>
              {user?.role === 'staff' && (
                <div className="ml-auto">
                  <CheckCircle size={24} className="text-button-500" />
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
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

        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>Current Role:</strong> {user?.role === 'admin' ? 'Administrator' : 'Staff'} 
            <span className="text-gray-400 ml-2">({user?.email || 'Not logged in'})</span>
          </p>
        </div>
      </div>
    );
  };

  // General Settings Section - render function to avoid re-creating component
  const renderGeneralSection = () => {
    if (businessLoading) {
      return <SkeletonSettings />;
    }
    
    return (
      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-primary-200">
          <div className="w-24 h-24 bg-gradient-to-br from-button-500 to-button-600 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden relative">
            {businessSaving ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={32} className="text-white animate-spin" />
              </div>
            ) : null}
            <img src={logoPreview} alt="Business Logo" className="w-20 h-20 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <span className="text-white font-bold text-3xl hidden">{businessInfo.business_name?.substring(0, 3) || 'KJP'}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Business Logo</h4>
            <p className="text-sm text-gray-500 mb-3">Upload your company logo (PNG, JPG, SVG - Max 2MB). Logo uploads immediately.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect label="Open Days" name="business_open_days" value={businessInfo.business_open_days} onChange={handleBusinessChange} options={dayOptions} required />
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
        
        {/* Business Hours */}
        <div className="p-4 bg-button-50 rounded-xl border border-button-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-button-600" />
            Business Hours
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Opening Time" name="business_open_time" type="time" value={businessInfo.business_open_time} onChange={handleBusinessChange} required />
            <FormInput label="Closing Time" name="business_close_time" type="time" value={businessInfo.business_close_time} onChange={handleBusinessChange} required />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            <strong>Preview:</strong> {businessInfo.business_open_days}: {formatTime(businessInfo.business_open_time)} - {formatTime(businessInfo.business_close_time)}
          </p>
        </div>

        {/* Footer Content */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-gray-600" />
            Footer Content
          </h4>
          <div className="space-y-4">
            <FormTextarea 
              label="Business Tagline" 
              name="footer_tagline" 
              value={businessInfo.footer_tagline} 
              onChange={handleBusinessChange} 
              rows={2} 
              placeholder="Your trusted partner in quality rice processing..." 
            />
            <FormInput 
              label="Copyright Text" 
              name="footer_copyright" 
              value={businessInfo.footer_copyright} 
              onChange={handleBusinessChange} 
              placeholder="Management System. All rights reserved." 
            />
            <FormInput 
              label="Powered By Text" 
              name="footer_powered_by" 
              value={businessInfo.footer_powered_by} 
              onChange={handleBusinessChange} 
              placeholder="Powered by XianFire Framework. Built at Mindoro State University" 
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Share2 size={18} className="text-blue-600" />
            Social Media Links
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput 
              label={
                <span className="flex items-center gap-2">
                  <Facebook size={16} className="text-blue-600" />
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
                  <Linkedin size={16} className="text-blue-700" />
                  LinkedIn URL
                </span>
              }
              name="social_linkedin" 
              value={businessInfo.social_linkedin} 
              onChange={handleBusinessChange} 
              placeholder="https://linkedin.com/company/yourcompany" 
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Leave empty to hide the social media icon in the footer.
          </p>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-primary-200">
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
      <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-primary-200">
        <div className="w-20 h-20 bg-gradient-to-br from-secondary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
          {profileInfo.firstName.charAt(0)}{profileInfo.lastName.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 mb-1">Profile Picture</h4>
          <p className="text-sm text-gray-500 mb-3">Upload a photo (PNG, JPG - Max 2MB)</p>
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
      
      <div className="flex justify-end pt-4 border-t border-primary-200">
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
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Password Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
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
        <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="w-4 h-4 rounded border-primary-300 text-primary-500 focus:ring-primary-500" />
        <span className="text-sm text-gray-600">Show passwords</span>
      </label>

      <div className="flex justify-end pt-4 border-t border-primary-200">
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
        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-primary-200 hover:border-primary-300 transition-colors">
          <div>
            <h4 className="font-semibold text-gray-800">{item.title}</h4>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={notificationSettings[item.key]} 
              onChange={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>
      ))}
      
      <div className="flex justify-end pt-4 border-t border-primary-200">
        <Button onClick={handleSaveNotifications}>
          <Save size={16} className="mr-1.5" />
          Save Preferences
        </Button>
      </div>
    </div>
  );

  // Appearance Section
  const AppearanceSection = () => {
    // Color picker component
    const ColorPicker = ({ label, description, icon: Icon, value, onChange, presets = [], compact = false }) => (
      <div className={`bg-gray-50 rounded-xl border-2 border-primary-200 hover:border-primary-300 transition-colors ${compact ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-start gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
          {!compact && (
            <div className="p-2 rounded-lg bg-white shadow-sm text-primary-500">
              <Icon size={18} />
            </div>
          )}
          <div className="flex-1">
            <h4 className={`font-semibold text-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</h4>
            <p className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`rounded-lg cursor-pointer border-2 border-primary-200 hover:border-primary-400 transition-colors ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
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
              className={`w-full font-mono border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
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
                className={`rounded-lg border-2 border-primary-200 hover:border-primary-400 hover:scale-110 transition-all shadow-sm ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
                style={{ backgroundColor: preset }}
                title={preset}
              />
            ))}
          </div>
        )}
      </div>
    );

    const colorPresets = {
      green: ['#22c55e', '#16a34a', '#15803d', '#84cc16', '#65a30d'],
      blue: ['#3b82f6', '#2563eb', '#1d4ed8', '#06b6d4', '#0891b2'],
      purple: ['#8b5cf6', '#7c3aed', '#6d28d9', '#a855f7', '#9333ea'],
      red: ['#ef4444', '#dc2626', '#b91c1c', '#f97316', '#ea580c'],
      yellow: ['#eab308', '#ca8a04', '#a16207', '#facc15', '#fde047'],
      gray: ['#6b7280', '#4b5563', '#374151', '#9ca3af', '#d1d5db'],
    };

    // Font size slider component
    const FontSizeSlider = ({ label, description, icon: Icon, value, onChange, min = 12, max = 24 }) => (
      <div className="p-4 bg-gray-50 rounded-xl border-2 border-primary-200 hover:border-primary-300 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white shadow-sm text-primary-500">
            <Icon size={18} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="text-lg font-bold text-primary-600">{value}px</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-8">{min}px</span>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer accent-button-500"
          />
          <span className="text-xs text-gray-500 w-8">{max}px</span>
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-primary-100">
          <p style={{ fontSize: `${value}px` }} className="text-gray-700">
            Preview: The quick brown fox jumps over the lazy dog
          </p>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Theme Mode */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Layout size={18} className="text-primary-500" />
            Theme Mode
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => updateTheme('mode', 'light')}
              className={`p-5 rounded-xl border-2 transition-all ${theme.mode === 'light' ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' : 'border-primary-200 hover:border-primary-300'}`}
            >
              <Sun size={28} className={`mx-auto mb-2 ${theme.mode === 'light' ? 'text-primary-600' : 'text-gray-400'}`} />
              <h4 className="font-semibold text-gray-800 text-sm">Light Mode</h4>
              <p className="text-xs text-gray-500">Default light theme</p>
              {theme.mode === 'light' && <CheckCircle size={18} className="text-primary-500 mx-auto mt-2" />}
            </button>
            <button 
              onClick={() => updateTheme('mode', 'dark')}
              className={`p-5 rounded-xl border-2 transition-all ${theme.mode === 'dark' ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100' : 'border-primary-200 hover:border-primary-300'}`}
            >
              <Moon size={28} className={`mx-auto mb-2 ${theme.mode === 'dark' ? 'text-primary-600' : 'text-gray-400'}`} />
              <h4 className="font-semibold text-gray-800 text-sm">Dark Mode</h4>
              <p className="text-xs text-gray-500">Easier on the eyes</p>
              {theme.mode === 'dark' && <CheckCircle size={18} className="text-primary-500 mx-auto mt-2" />}
            </button>
          </div>
        </div>

        {/* Button, Border & Hover Colors - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColorPicker
            label="Button Color"
            description="All action buttons"
            icon={Square}
            value={theme.button_primary || '#22c55e'}
            onChange={(val) => updateTheme('button_primary', val)}
            presets={colorPresets.green}
          />
          <ColorPicker
            label="Border Color"
            description="Cards, inputs, dividers"
            icon={Square}
            value={theme.border_color || '#86efac'}
            onChange={(val) => updateTheme('border_color', val)}
            presets={[...colorPresets.green, ...colorPresets.blue.slice(0, 2)]}
          />
          <ColorPicker
            label="Hover Color"
            description="Table rows & buttons hover"
            icon={MousePointer}
            value={theme.hover_color || '#dcfce7'}
            onChange={(val) => updateTheme('hover_color', val)}
            presets={['#dcfce7', '#f0fdf4', '#d1fae5', '#fef9c3', '#e0f2fe', '#f3e8ff']}
          />
        </div>

        {/* Background Colors - 4 columns */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Layout size={18} className="text-primary-500" />
            Background Colors
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ColorPicker
              label="Body"
              description="Page background"
              icon={Paintbrush}
              value={theme.bg_body || '#f3f4f6'}
              onChange={(val) => updateTheme('bg_body', val)}
              presets={['#f3f4f6', '#f9fafb', '#e5e7eb', '#f0fdf4', '#ecfdf5']}
              compact
            />
            <ColorPicker
              label="Sidebar"
              description="Navigation bg"
              icon={Paintbrush}
              value={theme.bg_sidebar || '#ffffff'}
              onChange={(val) => updateTheme('bg_sidebar', val)}
              presets={['#ffffff', '#f9fafb', '#f3f4f6', '#f0fdf4', '#1e293b']}
              compact
            />
            <ColorPicker
              label="Content"
              description="Card background"
              icon={Paintbrush}
              value={theme.bg_content || '#ffffff'}
              onChange={(val) => updateTheme('bg_content', val)}
              presets={['#ffffff', '#f9fafb', '#fafafa', '#f0fdf4', '#ecfdf5']}
              compact
            />
            <ColorPicker
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
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Type size={18} className="text-primary-500" />
            Text Colors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ColorPicker
              label="Content Text"
              description="Headings & body"
              icon={Type}
              value={theme.text_content || '#1f2937'}
              onChange={(val) => updateTheme('text_content', val)}
              presets={['#1f2937', '#111827', '#374151', '#0f172a', '#030712']}
              compact
            />
            <ColorPicker
              label="Secondary Text"
              description="Labels & hints"
              icon={Type}
              value={theme.text_secondary || '#6b7280'}
              onChange={(val) => updateTheme('text_secondary', val)}
              presets={['#6b7280', '#9ca3af', '#4b5563', '#374151', '#d1d5db']}
              compact
            />
            <ColorPicker
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
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Type size={18} className="text-primary-500" />
            Font Sizes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FontSizeSlider
              label="Content Font"
              description="Base content size"
              icon={Type}
              value={theme.font_size_base || '16'}
              onChange={(val) => updateTheme('font_size_base', val)}
              min={12}
              max={22}
            />
            <FontSizeSlider
              label="Sidebar Font"
              description="Menu item size"
              icon={Type}
              value={theme.font_size_sidebar || '15'}
              onChange={(val) => updateTheme('font_size_sidebar', val)}
              min={12}
              max={20}
            />
          </div>
        </div>

        {/* Preview & Actions - Combined */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl border-2 border-primary-200 bg-primary-50/30">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">Preview:</span>
            <button 
              className="px-3 py-1.5 rounded-lg font-medium text-white text-sm shadow-sm"
              style={{ backgroundColor: theme.button_primary || '#22c55e' }}
            >
              Button
            </button>
            <div 
              className="px-3 py-1.5 rounded-lg font-medium text-sm shadow-sm"
              style={{ 
                backgroundColor: theme.bg_content || '#ffffff', 
                border: `2px solid ${theme.border_color || '#86efac'}`,
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
    const [activeInfoTab, setActiveInfoTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [savingHome, setSavingHome] = useState(false);
    const [savingAbout, setSavingAbout] = useState(false);
    const [uploadingHomeImage, setUploadingHomeImage] = useState(false);
    const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
    
    // Home page content state
    const [homeContent, setHomeContent] = useState({
      heroTitle: 'Quality Rice',
      heroTitleHighlight: 'From Farm to Table',
      heroSubtitle: 'Experience the finest selection of premium rice products. From aromatic jasmine to nutritious brown rice, we deliver excellence in every grain.',
      heroTag: 'Premium Quality Rice Since 2010',
      heroImage: null,
      aboutTitle: 'Committed to Quality Since 2010',
      aboutDescription: 'KJP Ricemill has been a trusted name in the rice industry for over 15 years. We take pride in sourcing the finest quality rice from local farmers and delivering it fresh to your doorstep.',
      aboutPoints: [
        'Premium quality rice from trusted farmers',
        'Modern milling facilities for best results',
        'Strict quality control standards',
        'Reliable delivery across the region',
      ],
      features: [
        { title: 'Quality Assured', description: 'Every grain passes through rigorous quality checks to ensure premium standards.' },
        { title: 'Farm Fresh', description: 'Sourced directly from local farmers, ensuring freshness from harvest to your table.' },
        { title: 'Fast Delivery', description: 'Reliable delivery service to get your orders to you quickly and efficiently.' },
        { title: 'Best Prices', description: 'Competitive wholesale and retail prices without compromising on quality.' },
      ],
      stats: [
        { value: '15+', label: 'Years Experience' },
        { value: '500+', label: 'Happy Customers' },
        { value: '50K+', label: 'Bags Delivered' },
        { value: '99%', label: 'Satisfaction Rate' },
      ],
      testimonials: [
        { name: 'Maria Santos', role: 'Restaurant Owner', content: 'KJP Ricemill has been our trusted supplier for 5 years. Their jasmine rice quality is consistently excellent.', rating: 5 },
        { name: 'Juan Dela Cruz', role: 'Retail Store Owner', content: 'Fast delivery and great prices. My customers keep coming back for their rice products.', rating: 5 },
        { name: 'Lisa Reyes', role: 'Catering Business', content: 'The quality of rice makes a huge difference in our dishes. KJP never disappoints!', rating: 5 },
      ],
    });

    // About page content state
    const [aboutContent, setAboutContent] = useState({
      heroTitle: 'Our Story of',
      heroTitleHighlight: 'Excellence & Quality',
      heroSubtitle: 'For over 15 years, KJP Ricemill has been committed to delivering the finest quality rice products to Filipino households and businesses.',
      heroImage: null,
      missionTitle: 'Our Mission',
      missionDescription: 'To provide Filipino families and businesses with the highest quality rice products at fair prices, while supporting local farmers and sustainable agricultural practices.',
      missionPoints: [
        'Deliver premium quality rice consistently',
        'Support local farming communities',
        'Ensure fair and competitive pricing',
        'Provide exceptional customer service',
      ],
      visionTitle: 'Our Vision',
      visionDescription: 'To become the most trusted and preferred rice supplier in the Philippines, known for our unwavering commitment to quality, innovation, and customer satisfaction.',
      visionPoints: [
        'Be the leading rice supplier in the region',
        'Pioneer innovative milling technologies',
        'Create lasting value for all stakeholders',
        'Promote sustainable rice production',
      ],
      values: [
        { title: 'Quality First', description: 'We never compromise on the quality of our rice products, ensuring every grain meets our high standards.' },
        { title: 'Customer Care', description: 'Building lasting relationships with our customers through exceptional service and reliability.' },
        { title: 'Sustainability', description: 'Supporting local farmers and implementing eco-friendly practices in our operations.' },
        { title: 'Excellence', description: 'Striving for excellence in everything we do, from sourcing to delivery.' },
      ],
      timeline: [
        { year: '2010', title: 'Foundation', description: 'KJP Ricemill was established with a small milling facility and a vision for quality.' },
        { year: '2014', title: 'Expansion', description: 'Expanded operations with modern milling equipment and increased storage capacity.' },
        { year: '2018', title: 'Growth', description: 'Reached 100+ regular customers and established partnerships with local farmers.' },
        { year: '2022', title: 'Innovation', description: 'Implemented digital inventory system and launched online ordering platform.' },
        { year: '2024', title: 'Present', description: 'Serving 500+ customers with a diverse range of premium rice products.' },
      ],
      team: [
        { name: 'Jose P. Katipunan', role: 'Founder & CEO' },
        { name: 'Maria Santos', role: 'Operations Manager' },
        { name: 'Pedro Garcia', role: 'Quality Control Head' },
        { name: 'Ana Reyes', role: 'Sales Manager' },
      ],
    });

    // Fetch content from API on mount
    useEffect(() => {
      const fetchContent = async () => {
        setLoading(true);
        try {
          const result = await websiteContentApi.getAll();
          if (result.success && result.data) {
            if (result.data.home) {
              setHomeContent(prev => ({ ...prev, ...result.data.home }));
            }
            if (result.data.about) {
              setAboutContent(prev => ({ ...prev, ...result.data.about }));
            }
          }
        } catch (error) {
          console.log('Using default content - API not available');
        } finally {
          setLoading(false);
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
        if (result.data?.success) {
          setHomeContent(prev => ({ ...prev, heroImage: result.data.data.image_url }));
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
        if (result.data?.success) {
          setAboutContent(prev => ({ ...prev, heroImage: result.data.data.image_url }));
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

    const handleAddTestimonial = () => {
      setHomeContent({
        ...homeContent,
        testimonials: [...homeContent.testimonials, { name: 'Customer Name', role: 'Business', content: 'Testimonial content here', rating: 5 }],
      });
    };

    const handleRemoveTestimonial = (index) => {
      setHomeContent({
        ...homeContent,
        testimonials: homeContent.testimonials.filter((_, i) => i !== index),
      });
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
          <div className="inline-flex bg-gray-100 rounded-xl p-1.5 gap-1">
            <button
              onClick={() => setActiveInfoTab('home')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'home'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Home size={16} />
              Home Page
            </button>
            <button
              onClick={() => setActiveInfoTab('about')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeInfoTab === 'about'
                  ? 'bg-button-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={16} />
              About Page
            </button>
          </div>
        </div>

        {/* Home Page Content */}
        {activeInfoTab === 'home' && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                <Target size={18} className="text-green-600" />
                Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white rounded-xl border-2 border-dashed border-green-300">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {homeContent.heroImage ? (
                      <img src={homeContent.heroImage} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 mb-2">Upload an image for the hero section background (JPG, PNG, WebP - Max 5MB)</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleHomeHeroImageUpload}
                        className="hidden"
                        disabled={uploadingHomeImage}
                      />
                      <Button variant="outline" size="sm" as="span" disabled={uploadingHomeImage}>
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
                    </label>
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
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                <Award size={18} className="text-primary-600" />
                Statistics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {homeContent.stats.map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <FormInput 
                      label="Value" 
                      value={stat.value} 
                      onChange={(e) => {
                        const updated = [...homeContent.stats];
                        updated[index].value = e.target.value;
                        setHomeContent({ ...homeContent, stats: updated });
                      }} 
                    />
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
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <Shield size={18} className="text-primary-600" />
                  Features ({homeContent.features.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddFeature}>
                  <Plus size={14} className="mr-1" /> Add Feature
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeContent.features.map((feature, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-primary-200 relative">
                    <button
                      onClick={() => handleRemoveFeature(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded text-red-500"
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

            {/* Testimonials */}
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <Users size={18} className="text-primary-600" />
                  Testimonials ({homeContent.testimonials.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddTestimonial}>
                  <Plus size={14} className="mr-1" /> Add Testimonial
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {homeContent.testimonials.map((testimonial, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-primary-200 relative">
                    <button
                      onClick={() => handleRemoveTestimonial(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <FormInput 
                      label="Name" 
                      value={testimonial.name} 
                      onChange={(e) => {
                        const updated = [...homeContent.testimonials];
                        updated[index].name = e.target.value;
                        setHomeContent({ ...homeContent, testimonials: updated });
                      }} 
                    />
                    <FormInput 
                      label="Role" 
                      value={testimonial.role} 
                      onChange={(e) => {
                        const updated = [...homeContent.testimonials];
                        updated[index].role = e.target.value;
                        setHomeContent({ ...homeContent, testimonials: updated });
                      }} 
                    />
                    <FormTextarea 
                      label="Content" 
                      value={testimonial.content} 
                      onChange={(e) => {
                        const updated = [...homeContent.testimonials];
                        updated[index].content = e.target.value;
                        setHomeContent({ ...homeContent, testimonials: updated });
                      }} 
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* About Preview Section */}
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                <Eye size={18} className="text-primary-600" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">About Points</label>
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
                      className="flex-1 px-3 py-2 border-2 border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200">
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
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                <Target size={18} className="text-green-600" />
                About Hero Section
              </h4>
              
              {/* Hero Image Upload */}
              <div className="mb-4 p-4 bg-white rounded-xl border-2 border-dashed border-green-300">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {aboutContent.heroImage ? (
                      <img src={aboutContent.heroImage} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 mb-1">Hero Background Image</h5>
                    <p className="text-xs text-gray-500 mb-2">Upload an image for the hero section background (JPG, PNG, WebP - Max 5MB)</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAboutHeroImageUpload}
                        className="hidden"
                        disabled={uploadingAboutImage}
                      />
                      <Button variant="outline" size="sm" as="span" disabled={uploadingAboutImage}>
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
                    </label>
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
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
                <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-green-600" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mission Points</label>
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
                      className="w-full px-3 py-2 mb-2 border-2 border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  ))}
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
                <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-primary-600" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vision Points</label>
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
                      className="w-full px-3 py-2 mb-2 border-2 border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-button-500"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Core Values */}
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <Heart size={18} className="text-primary-600" />
                  Core Values ({aboutContent.values.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddValue}>
                  <Plus size={14} className="mr-1" /> Add Value
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aboutContent.values.map((value, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-primary-200 relative">
                    <button
                      onClick={() => handleRemoveValue(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded text-red-500"
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
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <Calendar size={18} className="text-primary-600" />
                  Company Timeline ({aboutContent.timeline.length})
                </h4>
                <Button size="sm" variant="outline" onClick={handleAddTimeline}>
                  <Plus size={14} className="mr-1" /> Add Milestone
                </Button>
              </div>
              <div className="space-y-4">
                {aboutContent.timeline.map((item, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-primary-200 relative">
                    <button
                      onClick={() => handleRemoveTimeline(index)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded text-red-500"
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
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                <Users size={18} className="text-primary-600" />
                Team Members
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {aboutContent.team.map((member, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-primary-200">
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
            </div>

            <div className="flex justify-end pt-4 border-t border-primary-200">
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
      </div>
    );
  };

  // Data Section
  const DataSection = () => {
    const [dbInfo, setDbInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [exporting, setExporting] = useState(false);

    const fetchDatabaseInfo = async () => {
      setLoadingInfo(true);
      try {
        const response = await fetch('http://127.0.0.1:8000/api/database/info');
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
        const response = await fetch('http://127.0.0.1:8000/api/database/export');
        
        if (response.ok) {
          const blob = await response.blob();
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = 'KjpRicemill_backup.sql';
          
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
          }
          
          // Create download link
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

    // Fetch database info on mount
    useEffect(() => {
      fetchDatabaseInfo();
    }, []);

    return (
      <div className="space-y-6">
        {/* Database Backup */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500 rounded-xl">
              <Database size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1">Database Backup (.SQL)</h4>
              <p className="text-sm text-gray-600 mb-4">
                Export your entire database as a .sql file. This backup includes all tables, 
                structure, and data which can be restored using phpMyAdmin or MySQL command line.
              </p>
              
              {/* Database Info */}
              {dbInfo && (
                <div className="mb-4 p-3 bg-white/70 rounded-lg border border-green-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Database:</span>
                      <p className="font-medium text-gray-800">{dbInfo.database}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Tables:</span>
                      <p className="font-medium text-gray-800">{dbInfo.tables_count}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Rows:</span>
                      <p className="font-medium text-gray-800">{dbInfo.total_rows?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="font-medium text-gray-800">{dbInfo.total_size}</p>
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
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
            <Download size={32} className="text-primary-600 mb-3" />
            <h4 className="font-semibold text-gray-800 mb-1">Export Data (CSV)</h4>
            <p className="text-sm text-gray-500 mb-4">Download all your data as CSV or Excel file</p>
            <Button variant="outline" onClick={() => toast.info('Export Started', 'Your data is being prepared for download.')}>
              <Download size={16} className="mr-1.5" />
              Export as CSV
            </Button>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-primary-200">
            <Upload size={32} className="text-blue-600 mb-3" />
            <h4 className="font-semibold text-gray-800 mb-1">Import Data</h4>
            <p className="text-sm text-gray-500 mb-4">Import data from CSV or Excel file</p>
            <Button variant="outline" onClick={() => toast.info('Import', 'Select a file to import data.')}>
              <Upload size={16} className="mr-1.5" />
              Import Data
            </Button>
          </div>
        </div>

        <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200">
          <Trash2 size={32} className="text-red-600 mb-3" />
          <h4 className="font-semibold text-red-800 mb-1">Danger Zone</h4>
          <p className="text-sm text-red-600 mb-4">Once you delete your data, there is no going back. Please be certain.</p>
          <Button variant="danger" onClick={() => toast.error('Action Required', 'Please contact administrator to delete data.')}>
            <Trash2 size={16} className="mr-1.5" />
            Delete All Data
          </Button>
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
                    : 'text-gray-600 hover:bg-button-100 hover:text-button-700'
                }`}
              >
                <section.icon size={18} className={activeSection === section.id ? 'text-white' : 'text-gray-400 group-hover:text-button-600'} />
                <span className="font-medium text-sm">{section.title}</span>
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Settings Content - Full Width */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary-200">
            <div className="p-2.5 bg-primary-50 rounded-xl">
              <currentSection.icon size={24} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">{currentSection.title}</h3>
              <p className="text-sm text-gray-500">{currentSection.description}</p>
            </div>
          </div>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
