import { useState, useEffect } from 'react';
import {
  Sun, Moon, Monitor, Lock, User, Eye, EyeOff,
  Check, Save, RotateCcw
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Mock customer data
const mockCustomer = {
  id: 1,
  name: 'Maria Santos',
  email: 'maria.santos@example.com',
  phone: '+63 917 123 4567',
  address: 'Calapan City, Oriental Mindoro',
  company: 'Santos Trading',
};

const Settings = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Appearance
  const [themeMode, setThemeMode] = useState('light');
  const [fontSize, setFontSize] = useState(14);

  // Profile
  const [profileForm, setProfileForm] = useState({
    name: mockCustomer.name,
    email: mockCustomer.email,
    phone: mockCustomer.phone,
    address: mockCustomer.address,
    company: mockCustomer.company,
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Password
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    newPassword: false,
    confirm: false,
  });
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  const handleProfileSave = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) return;
    if (passwordForm.newPassword.length < 8) return;
    setPasswordForm({ current: '', newPassword: '', confirm: '' });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const handleAppearanceSave = () => {
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 3000);
  };

  const handleAppearanceReset = () => {
    setThemeMode('light');
    setFontSize(14);
  };

  const inputStyle = {
    border: `1px solid ${theme.border_color}`,
    backgroundColor: 'transparent',
    color: theme.text_primary,
  };

  const sectionCardStyle = {
    backgroundColor: '#fff',
    border: `1px solid ${theme.border_color}`,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: theme.text_primary }}>Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: theme.text_secondary }}>Manage your account preferences and appearance</p>
      </div>

      {/* Grid: mobile=1col, tablet=1top+2bottom, desktop=3cols */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`rounded-xl p-4 ${i === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`} style={sectionCardStyle}>
              <div className="flex items-center gap-2.5 mb-4">
                <Skeleton variant="circle" width="w-8" height="h-8" />
                <div>
                  <Skeleton variant="title" width="w-24" className="mb-1" />
                  <Skeleton variant="text" width="w-32" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton variant="input" />
                <Skeleton variant="input" />
                <Skeleton variant="input" />
              </div>
              <Skeleton variant="button" width="w-full" className="mt-4" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* ============ APPEARANCE SECTION ============ */}
        <div className="md:col-span-2 lg:col-span-1 rounded-xl p-4 flex flex-col" style={sectionCardStyle}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.button_primary}15` }}>
              <Monitor size={16} style={{ color: theme.button_primary }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: theme.text_primary }}>Appearance</h2>
              <p className="text-[11px]" style={{ color: theme.text_secondary }}>Theme & font size</p>
            </div>
          </div>

          {/* Theme Mode */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: theme.text_primary }}>Theme Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
              ].map(mode => {
                const Icon = mode.icon;
                const isActive = themeMode === mode.value;
                return (
                  <button key={mode.value} onClick={() => setThemeMode(mode.value)}
                    className="relative flex items-center justify-center gap-2 py-3 rounded-lg transition-all"
                    style={isActive
                      ? { backgroundColor: `${theme.button_primary}10`, border: `2px solid ${theme.button_primary}`, color: theme.button_primary }
                      : { border: `1px solid ${theme.border_color}`, color: theme.text_secondary }
                    }>
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.button_primary }}>
                        <Check size={8} className="text-white" />
                      </div>
                    )}
                    <Icon size={16} />
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size - Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: theme.text_primary }}>Font Size</label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: `${theme.button_primary}15`, color: theme.button_primary }}>
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={22}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${theme.button_primary} 0%, ${theme.button_primary} ${((fontSize - 12) / 10) * 100}%, ${theme.border_color} ${((fontSize - 12) / 10) * 100}%, ${theme.border_color} 100%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: theme.text_secondary }}>12px</span>
              <span className="text-[10px]" style={{ color: theme.text_secondary }}>22px</span>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f8fafc', border: `1px solid ${theme.border_color}` }}>
            <p className="text-[10px] font-medium mb-1.5" style={{ color: theme.text_secondary }}>Preview</p>
            <p style={{ fontSize: `${fontSize}px`, color: themeMode === 'dark' ? '#f1f5f9' : theme.text_primary }}>
              The quick brown fox jumps over the lazy dog.
            </p>
            <p className="mt-0.5" style={{ fontSize: `${Math.max(10, fontSize - 2)}px`, color: themeMode === 'dark' ? '#94a3b8' : theme.text_secondary }}>
              Secondary text preview. ₱1,234.56
            </p>
          </div>

          {/* Appearance Actions */}
          {appearanceSaved && (
            <div className="mb-3 p-2.5 rounded-lg bg-green-50 text-green-700 text-xs flex items-center gap-2">
              <Check size={14} /> Appearance settings saved!
            </div>
          )}
          <div className="mt-6 pt-4 border-t flex items-center gap-2" style={{ borderColor: theme.border_color }}>
            <button onClick={handleAppearanceSave}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: theme.button_primary }}>
              <Save size={13} /> Save
            </button>
            <button onClick={handleAppearanceReset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-all"
              style={{ border: `1px solid ${theme.border_color}`, color: theme.text_secondary }}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* ============ PROFILE SECTION ============ */}
        <div className="rounded-xl p-4 flex flex-col" style={sectionCardStyle}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.button_primary}15` }}>
              <User size={16} style={{ color: theme.button_primary }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: theme.text_primary }}>Profile</h2>
              <p className="text-[11px]" style={{ color: theme.text_secondary }}>Personal information</p>
            </div>
          </div>

          {profileSaved && (
            <div className="mb-3 p-2.5 rounded-lg bg-green-50 text-green-700 text-xs flex items-center gap-2">
              <Check size={14} /> Profile updated successfully!
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>Company Name</label>
              <input type="text" value={profileForm.company}
                onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>Full Name</label>
              <input type="text" value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>Email Address</label>
              <input type="email" value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>Phone Number</label>
              <input type="tel" value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>Address</label>
              <input type="text" value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: theme.border_color }}>
            <button onClick={handleProfileSave}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: theme.button_primary }}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>

        {/* ============ PASSWORD SECTION ============ */}
        <div className="rounded-xl p-4 flex flex-col" style={sectionCardStyle}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.button_primary}15` }}>
              <Lock size={16} style={{ color: theme.button_primary }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: theme.text_primary }}>Change Password</h2>
              <p className="text-[11px]" style={{ color: theme.text_secondary }}>Account security</p>
            </div>
          </div>

          {passwordSaved && (
            <div className="mb-3 p-2.5 rounded-lg bg-green-50 text-green-700 text-xs flex items-center gap-2">
              <Check size={14} /> Password changed successfully!
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-3 flex-1 flex flex-col">
            {[
              { key: 'current', label: 'Current Password', placeholder: 'Enter current password' },
              { key: 'newPassword', label: 'New Password', placeholder: 'Minimum 8 characters' },
              { key: 'confirm', label: 'Confirm Password', placeholder: 'Re-enter new password' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>{field.label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[field.key] ? 'text' : 'password'}
                    value={passwordForm[field.key]}
                    onChange={(e) => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                    onBlur={(e) => e.target.style.borderColor = theme.border_color}
                    required
                    minLength={field.key !== 'current' ? 8 : undefined}
                  />
                  <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: theme.text_secondary }}>
                    {showPasswords[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {field.key === 'confirm' && passwordForm.confirm && passwordForm.newPassword !== passwordForm.confirm && (
                  <p className="text-[10px] mt-0.5 text-red-500">Passwords do not match</p>
                )}
              </div>
            ))}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: theme.border_color }}>
              <button type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                style={{ backgroundColor: theme.button_primary }}
                disabled={!passwordForm.current || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirm}>
                <Lock size={13} /> Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  );
};

export default Settings;
