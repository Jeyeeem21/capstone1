import { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield, Clock, Calendar, LogIn, LogOut, Monitor, Activity } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { Card, CardContent, StatusBadge } from '../../../components/ui';
import { Avatar } from '../../../components/ui';

const StaffProfile = () => {
  // Mock staff data - in real app, this would come from auth context or API
  const staffData = {
    id: 'STF-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@kjpricemill.com',
    phone: '+63 912 345 6789',
    role: 'Cashier',
    department: 'Sales',
    status: 'Active',
    hireDate: '2024-06-15',
    address: 'Barangay San Jose, Manila, Philippines',
    employeeId: 'EMP-2024-0156',
  };

  // Mock login history
  const loginHistory = [
    { id: 1, action: 'Login', timestamp: '2026-02-01 08:30:15', ipAddress: '192.168.1.100', device: 'Desktop - Chrome', status: 'Success' },
    { id: 2, action: 'Logout', timestamp: '2026-01-31 17:45:22', ipAddress: '192.168.1.100', device: 'Desktop - Chrome', status: 'Success' },
    { id: 3, action: 'Login', timestamp: '2026-01-31 08:28:45', ipAddress: '192.168.1.100', device: 'Desktop - Chrome', status: 'Success' },
    { id: 4, action: 'Logout', timestamp: '2026-01-30 18:02:10', ipAddress: '192.168.1.105', device: 'Mobile - Safari', status: 'Success' },
    { id: 5, action: 'Login', timestamp: '2026-01-30 13:15:33', ipAddress: '192.168.1.105', device: 'Mobile - Safari', status: 'Success' },
    { id: 6, action: 'Login Failed', timestamp: '2026-01-30 13:14:55', ipAddress: '192.168.1.105', device: 'Mobile - Safari', status: 'Failed' },
    { id: 7, action: 'Logout', timestamp: '2026-01-30 12:30:00', ipAddress: '192.168.1.100', device: 'Desktop - Chrome', status: 'Success' },
    { id: 8, action: 'Login', timestamp: '2026-01-30 08:25:18', ipAddress: '192.168.1.100', device: 'Desktop - Chrome', status: 'Success' },
  ];

  // Current session info
  const currentSession = {
    loginTime: '2026-02-01 08:30:15',
    duration: '2h 45m',
    ipAddress: '192.168.1.100',
    device: 'Desktop - Chrome',
    browser: 'Chrome 121.0',
    os: 'Windows 11',
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon size={16} className="text-gray-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Profile" 
        description="View your account information and login history"
        icon={User}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              {/* Avatar & Basic Info */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-button-400 to-button-600 rounded-full mb-4">
                  <span className="text-3xl font-bold text-white">
                    {staffData.firstName[0]}{staffData.lastName[0]}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{staffData.firstName} {staffData.lastName}</h2>
                <p className="text-gray-500">{staffData.role}</p>
                <div className="mt-2">
                  <StatusBadge status={staffData.status} />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1">
                <InfoRow icon={Mail} label="Email" value={staffData.email} />
                <InfoRow icon={Phone} label="Phone" value={staffData.phone} />
                <InfoRow icon={MapPin} label="Address" value={staffData.address} />
              </div>
            </CardContent>
          </Card>

          {/* Employee Details Card */}
          <Card className="mt-4">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-button-500" />
                Employee Details
              </h3>
              <div className="space-y-1">
                <InfoRow icon={User} label="Employee ID" value={staffData.employeeId} />
                <InfoRow icon={Shield} label="Department" value={staffData.department} />
                <InfoRow icon={Calendar} label="Hire Date" value={new Date(staffData.hireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>

              {/* Read-only Notice */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Profile information can only be updated by an administrator. 
                  Please contact your manager for any changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Session & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Session */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-green-500" />
                Current Session
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-green-600 font-medium">Active</span>
                </span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock size={14} />
                    <span className="text-sm">Login Time</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.loginTime}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Activity size={14} />
                    <span className="text-sm">Duration</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.duration}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Monitor size={14} />
                    <span className="text-sm">Device</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.device}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Shield size={14} />
                    <span className="text-sm">IP Address</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.ipAddress}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Monitor size={14} />
                    <span className="text-sm">Browser</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.browser}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Monitor size={14} />
                    <span className="text-sm">Operating System</span>
                  </div>
                  <p className="font-semibold text-gray-800">{currentSession.os}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login History */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-button-500" />
                Login History
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Timestamp</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 hidden md:table-cell">IP Address</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 hidden lg:table-cell">Device</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {log.action === 'Login' && <LogIn size={16} className="text-green-500" />}
                            {log.action === 'Logout' && <LogOut size={16} className="text-blue-500" />}
                            {log.action === 'Login Failed' && <LogIn size={16} className="text-red-500" />}
                            <span className="font-medium text-gray-800">{log.action}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{log.timestamp}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm hidden md:table-cell">{log.ipAddress}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm hidden lg:table-cell">{log.device}</td>
                        <td className="py-3 px-4">
                          <StatusBadge 
                            status={log.status}
                            customColors={{
                              Success: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
                              Failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination info */}
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {loginHistory.length} of {loginHistory.length} entries
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
