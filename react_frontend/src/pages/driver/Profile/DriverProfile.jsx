import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Truck, CreditCard, Calendar,
  CheckCircle, Package, TrendingUp, Award, Edit3, Save, X, Camera
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Mock driver data
const mockDriver = {
  id: 1,
  name: 'Juan Dela Cruz',
  email: 'juan.delacruz@example.com',
  phone: '+63 917 234 5678',
  address: 'Brgy. Ilaya, Calapan City, Oriental Mindoro',
  license_number: 'N01-12-345678',
  vehicle_type: 'Truck',
  plate_number: 'ABC 1234',
  status: 'Active',
  avatar: null,
  joined_date: '2025-06-15',
  total_deliveries: 156,
  successful_deliveries: 148,
  failed_deliveries: 8,
  total_value_delivered: 1250000,
};

const DriverProfile = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: mockDriver.name,
    email: mockDriver.email,
    phone: mockDriver.phone,
    address: mockDriver.address,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCancel = () => {
    setFormData({
      name: mockDriver.name,
      email: mockDriver.email,
      phone: mockDriver.phone,
      address: mockDriver.address,
    });
    setIsEditing(false);
  };

  const successRate = mockDriver.total_deliveries > 0 
    ? ((mockDriver.successful_deliveries / mockDriver.total_deliveries) * 100).toFixed(1) 
    : '0.0';

  const inputStyle = {
    border: `1px solid ${theme.border_color}`,
    backgroundColor: 'transparent',
    color: theme.text_primary,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: theme.text_primary }}>My Profile</h1>
        <p className="text-xs mt-0.5" style={{ color: theme.text_secondary }}>View and manage your driver profile</p>
      </div>

      {loading ? (
        <div className="space-y-5">
          {/* Profile Card Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6" style={{ border: `1px solid ${theme.border_color}` }}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Skeleton variant="circle" width="w-20" height="h-20" />
              <div className="flex-1 text-center sm:text-left">
                <Skeleton variant="title" width="w-48" className="mx-auto sm:mx-0 mb-2" />
                <Skeleton variant="text" width="w-32" className="mx-auto sm:mx-0 mb-1" />
                <Skeleton variant="text" width="w-40" className="mx-auto sm:mx-0" />
              </div>
              <Skeleton variant="button" width="w-24" />
            </div>
          </div>
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
                <Skeleton variant="circle" width="w-10" height="h-10" className="mb-2" />
                <Skeleton variant="title" width="w-12" className="mb-1" />
                <Skeleton variant="text" width="w-20" />
              </div>
            ))}
          </div>
          {/* Details Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
                <Skeleton variant="title" width="w-36" className="mb-4" />
                <div className="space-y-3">
                  <Skeleton variant="input" />
                  <Skeleton variant="input" />
                  <Skeleton variant="input" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Success Alert */}
          {showSuccess && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm flex items-center gap-2 border border-green-200 dark:border-green-700">
              <CheckCircle size={16} /> Profile updated successfully!
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border_color}` }}>
            {/* Banner */}
            <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${theme.button_primary}, ${theme.button_primary}dd)` }}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 right-6"><Truck size={40} className="text-white" /></div>
                <div className="absolute bottom-2 left-10"><Package size={30} className="text-white" /></div>
              </div>
            </div>
            <div className="px-6 pb-5">
              {/* Avatar row - overlaps banner */}
              <div className="-mt-10 mb-3">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-xl border-4 border-white shadow-lg flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: theme.button_primary }}>
                    {mockDriver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center"
                    style={{ backgroundColor: theme.button_primary }}>
                    <Camera size={10} className="text-white" />
                  </button>
                </div>
              </div>
              {/* Name + Edit row - fully below banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: theme.text_primary }}>{mockDriver.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" 
                      style={{ backgroundColor: '#dcfce7', color: '#22c55e' }}>
                      {mockDriver.status}
                    </span>
                    <span className="text-xs" style={{ color: theme.text_secondary }}>
                      <Calendar size={10} className="inline mr-1" />
                      Since {new Date(mockDriver.joined_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {/* Edit button */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={handleCancel}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: '#f3f4f6', color: theme.text_secondary }}>
                        <X size={13} /> Cancel
                      </button>
                      <button onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: theme.button_primary }}>
                        <Save size={13} /> Save
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 text-white"
                      style={{ backgroundColor: theme.button_primary }}>
                      <Edit3 size={13} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Package, label: 'Total Deliveries', value: mockDriver.total_deliveries, color: theme.button_primary },
              { icon: CheckCircle, label: 'Successful', value: mockDriver.successful_deliveries, color: '#22c55e' },
              { icon: TrendingUp, label: 'Success Rate', value: `${successRate}%`, color: '#3b82f6' },
              { icon: Award, label: 'Total Value', value: `₱${(mockDriver.total_value_delivered / 1000).toFixed(0)}K`, color: '#f59e0b' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${stat.color}15` }}>
                    <Icon size={16} style={{ color: stat.color }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[10px]" style={{ color: theme.text_secondary }}>{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Personal Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.button_primary}15` }}>
                  <User size={15} style={{ color: theme.button_primary }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: theme.text_primary }}>Personal Information</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: User, label: 'Full Name', key: 'name' },
                  { icon: Mail, label: 'Email', key: 'email' },
                  { icon: Phone, label: 'Phone', key: 'phone' },
                  { icon: MapPin, label: 'Address', key: 'address' },
                ].map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>
                        <Icon size={11} className="inline mr-1" />{field.label}
                      </label>
                      {isEditing ? (
                        <input
                          type={field.key === 'email' ? 'email' : 'text'}
                          value={formData[field.key]}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                          style={inputStyle}
                          onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                          onBlur={(e) => e.target.style.borderColor = theme.border_color}
                        />
                      ) : (
                        <p className="text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: '#f9fafb', color: theme.text_primary }}>
                          {formData[field.key]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.button_primary}15` }}>
                  <Truck size={15} style={{ color: theme.button_primary }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: theme.text_primary }}>Vehicle & License</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CreditCard, label: 'License Number', value: mockDriver.license_number },
                  { icon: Truck, label: 'Vehicle Type', value: mockDriver.vehicle_type },
                  { icon: CreditCard, label: 'Plate Number', value: mockDriver.plate_number },
                ].map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.label}>
                      <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>
                        <Icon size={11} className="inline mr-1" />{field.label}
                      </label>
                      <p className="text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: '#f9fafb', color: theme.text_primary }}>
                        {field.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Quick Stats in vehicle card */}
              <div className="mt-5 pt-4 border-t" style={{ borderColor: theme.border_color }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: theme.text_secondary }}>Performance Summary</p>
                <div className="space-y-2">
                  {[
                    { label: 'Pending Today', value: '3', color: '#f59e0b' },
                    { label: 'Completed This Week', value: '12', color: '#22c55e' },
                    { label: 'Failed This Month', value: '2', color: '#ef4444' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs" style={{ color: theme.text_secondary }}>{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: theme.text_primary }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfile;