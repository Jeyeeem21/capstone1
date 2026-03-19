import { useState, useEffect, useCallback } from 'react';
import { UserCog, Shield, Users, CheckCircle, XCircle, Briefcase, Archive, Truck, Mail, Loader2 } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { usersApi } from '../../../api';

const StaffManagement = () => {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', position: '', truck_plate_number: '', email: '', phone: '', date_hired: '', status: 'active', password: '',
  });

  // Email verification state
  const [verificationStep, setVerificationStep] = useState('form'); // 'form' | 'code-sent' | 'verified'
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const positionOptions = [
    { value: 'Secretary', label: 'Secretary' },
    { value: 'Driver', label: 'Driver' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Fetch staff members
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll({ role: 'staff' });
      const data = response?.data?.data || response?.data || [];
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Error', 'Failed to load staff members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAdd = () => {
    setFormData({
      name: '', position: '', truck_plate_number: '', email: '', phone: '',
      date_hired: new Date().toISOString().split('T')[0],
      status: 'active', password: '',
    });
    setVerificationStep('form');
    setVerificationCode('');
    setVerificationError('');
    setIsAddModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      position: item.position || '',
      truck_plate_number: item.truck_plate_number || '',
      email: item.email || '',
      phone: item.phone || '',
      date_hired: item.date_hired ? item.date_hired.split('T')[0] : '',
      status: item.status || 'active',
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendVerification = async () => {
    if (!formData.email?.trim()) {
      toast.error('Error', 'Please enter an email address first.');
      return;
    }
    try {
      setVerificationLoading(true);
      const response = await usersApi.sendVerification(formData.email);
      if (response?.success) {
        setVerificationStep('code-sent');
        toast.success('Code Sent', `Verification code sent to ${formData.email}`);
      } else {
        toast.error('Error', response?.message || 'Failed to send verification code.');
      }
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCode = async (code) => {
    try {
      setVerificationLoading(true);
      setVerificationError('');
      const response = await usersApi.verifyCode(formData.email, code);
      if (response?.success) {
        setVerificationStep('verified');
        toast.success('Verified', 'Email verified successfully!');
      } else {
        setVerificationError(response?.message || 'The verification code is incorrect.');
      }
    } catch (error) {
      setVerificationError(error.response?.data?.message || 'Verification failed.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    if (verificationStep !== 'verified') {
      toast.error('Error', 'Please verify the email address first.');
      return;
    }
    try {
      setSubmitting(true);
      await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'staff',
        position: formData.position,
        truck_plate_number: formData.position === 'Driver' ? formData.truck_plate_number : null,
        phone: formData.phone,
        status: formData.status,
        date_hired: formData.date_hired || null,
      });
      toast.success('Staff Added', `${formData.name} has been added to the team.`);
      setIsAddModalOpen(false);
      fetchStaff();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to add staff member.';
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        position: formData.position,
        truck_plate_number: formData.position === 'Driver' ? formData.truck_plate_number : null,
        phone: formData.phone,
        status: formData.status,
        date_hired: formData.date_hired || null,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      await usersApi.update(selectedItem.id, payload);
      toast.success('Staff Updated', `${formData.name}'s information has been updated.`);
      setIsEditModalOpen(false);
      fetchStaff();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to update staff member.';
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      await usersApi.delete(selectedItem.id);
      const removedId = selectedItem.id;
      // Immediately remove from local data for instant UI
      setStaff(prev => prev.filter(s => s.id !== removedId));
      toast.success('Staff Removed', `${selectedItem.name} has been removed.`);
      setIsDeleteModalOpen(false);
      // Refetch in background to confirm
      fetchStaff();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to remove staff member.';
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const inactiveStaff = staff.filter(s => s.status === 'inactive').length;
  const totalPositions = [...new Set(staff.map(s => s.position).filter(Boolean))].length;

  const getPositionBadge = (position) => {
    const colors = {
      'Secretary': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      'Driver': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };
    return colors[position] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Position', accessor: 'position', cell: (row) => (
      row.position ? (
        <div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getPositionBadge(row.position)}`}>
            <Shield size={12} />
            {row.position}
          </span>
          {row.position === 'Driver' && row.truck_plate_number && (
            <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Truck size={10} />
              {row.truck_plate_number}
            </span>
          )}
        </div>
      ) : <span className="text-gray-400 text-xs">—</span>
    )},
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Date Hired', accessor: 'date_hired', cell: (row) => (
      row.date_hired ? new Date(row.date_hired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : <span className="text-gray-400 text-xs">—</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status === 'active' ? 'Active' : 'Inactive'} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onEdit={() => handleEdit(row)} onArchive={isSuperAdmin() ? () => handleDelete(row) : undefined} />
    )},
  ];

  return (
    <div>
      <PageHeader title="Staff Management" description="Manage your team members and their access levels" icon={UserCog} />

      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Staff" value={totalStaff} unit="employees" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeStaff} unit="employees" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
          <StatsCard label="Inactive" value={inactiveStaff} unit="employees" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
          <StatsCard label="Positions" value={totalPositions} unit="types" icon={Briefcase} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
        <DataTable title="Staff Records" subtitle="Manage all staff members" columns={columns} data={staff} searchPlaceholder="Search staff..." filterField="position" filterPlaceholder="All Positions" dateFilterField="date_hired" onAdd={handleAdd} addLabel="Add Staff" />
      )}

      {/* Add Modal */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Staff Member" submitText={submitting ? 'Adding...' : 'Add Staff'} size="lg" disabled={submitting || verificationStep !== 'verified'}>
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <FormSelect label="Position" name="position" value={formData.position} onChange={handleFormChange} options={positionOptions} required submitted={submitted} />
            {formData.position === 'Driver' && (
              <FormInput label="Truck Plate Number" name="truck_plate_number" value={formData.truck_plate_number} onChange={handleFormChange} placeholder="e.g. ABC 1234" submitted={submitted} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormInput label="Email" name="email" type="email" value={formData.email} onChange={(e) => { handleFormChange(e); if (verificationStep !== 'form') { setVerificationStep('form'); setVerificationCode(''); setVerificationError(''); } }} required placeholder="email@kjp.com" submitted={submitted} disabled={verificationStep === 'verified'} />
                {/* Verification UI */}
                {verificationStep === 'form' && (
                  <button type="button" onClick={handleSendVerification} disabled={verificationLoading || !formData.email?.trim()} className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-button-500 hover:bg-button-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {verificationLoading ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                    Send Verification Code
                  </button>
                )}
                {verificationStep === 'code-sent' && (
                  <div className="mt-2 space-y-1.5">
                    <div className="relative">
                      <input type="text" value={verificationCode} onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(val);
                        setVerificationError('');
                        if (val.length === 6) handleVerifyCode(val);
                      }} placeholder="Enter 6-digit code" maxLength={6} disabled={verificationLoading} className={`w-full px-3 py-1.5 text-sm border-2 rounded-lg bg-white dark:bg-gray-700 focus:border-button-500 focus:outline-none ${verificationError ? 'border-red-400 dark:border-red-500' : 'border-primary-300 dark:border-primary-700'} ${verificationLoading ? 'opacity-60' : ''}`} />
                      {verificationLoading && <Loader2 size={14} className="animate-spin text-button-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                    </div>
                    {verificationError && <p className="text-xs text-red-500">{verificationError}</p>}
                    <button type="button" onClick={handleSendVerification} disabled={verificationLoading} className="text-xs text-button-500 hover:text-button-600 font-medium">
                      Resend Code
                    </button>
                  </div>
                )}
                {verificationStep === 'verified' && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Email verified
                  </p>
                )}
              </div>
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Password" name="password" type="password" value={formData.password} onChange={handleFormChange} required placeholder="Min. 8 characters" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
            <FormInput label="Date Hired" name="date_hired" type="date" value={formData.date_hired} onChange={handleFormChange} submitted={submitted} />
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Staff Member" submitText={submitting ? 'Saving...' : 'Save Changes'} size="lg" disabled={submitting}>
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <FormSelect label="Position" name="position" value={formData.position} onChange={handleFormChange} options={positionOptions} required submitted={submitted} />
            {formData.position === 'Driver' && (
              <FormInput label="Truck Plate Number" name="truck_plate_number" value={formData.truck_plate_number} onChange={handleFormChange} placeholder="e.g. ABC 1234" submitted={submitted} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="email@kjp.com" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="New Password" name="password" type="password" value={formData.password} onChange={handleFormChange} placeholder="Leave blank to keep current" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
            <FormInput label="Date Hired" name="date_hired" type="date" value={formData.date_hired} onChange={handleFormChange} submitted={submitted} />
          </>
        )}
      </FormModal>

      {/* Delete Confirm */}
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Archive Staff Member" message={`Are you sure you want to archive "${selectedItem?.name}"? You can restore this record from the Archives.`} confirmText={submitting ? 'Archiving...' : 'Archive'} variant="warning" icon={Archive} />
    </div>
  );
};

export default StaffManagement;
