import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Users, CheckCircle, XCircle, UserPlus, Trash2, Edit3, Save, Loader2, ShieldCheck, Truck, ClipboardList, Ban, UserCheck } from 'lucide-react';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { usersApi, apiClient } from '../../../api';

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Secretary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Driver: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  customer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const ROLE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'admin', label: 'Admin' },
  { id: 'Secretary', label: 'Secretary' },
  { id: 'Driver', label: 'Driver' },
  { id: 'customer', label: 'Customer' },
];

const getRoleDisplay = (user) => {
  if (user.role === 'staff') return user.position || 'Staff';
  if (user.role === 'super_admin') return 'Super Admin';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'customer') return 'Customer';
  return user.role;
};

const AdminAccounts = () => {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', status: 'active',
  });

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const fetchAccounts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await usersApi.getAll({});
      const data = response?.data?.data || response?.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      if (!silent) toast.error('Error', 'Failed to load accounts.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Realtime polling — refresh every 5s when tab is visible and no modal open
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isAddModalOpen && !isEditModalOpen && !isDeleteModalOpen && !isBlockModalOpen) {
        fetchAccounts(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAccounts, isAddModalOpen, isEditModalOpen, isDeleteModalOpen, isBlockModalOpen]);

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'all') return accounts;
    if (activeTab === 'Secretary' || activeTab === 'Driver') {
      return accounts.filter(a => a.role === 'staff' && a.position === activeTab);
    }
    return accounts.filter(a => a.role === activeTab);
  }, [accounts, activeTab]);

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const blockedAccounts = accounts.filter(a => a.status === 'inactive').length;
  const roleCounts = useMemo(() => ({
    admin: accounts.filter(a => a.role === 'admin').length,
    Secretary: accounts.filter(a => a.role === 'staff' && a.position === 'Secretary').length,
    Driver: accounts.filter(a => a.role === 'staff' && a.position === 'Driver').length,
    customer: accounts.filter(a => a.role === 'customer').length,
  }), [accounts]);

  const handleAdd = () => {
    setFormData({ name: '', email: '', phone: '', password: '', status: 'active' });
    setIsAddModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      password: '',
      status: item.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleBlockToggle = (item) => {
    setSelectedItem(item);
    setIsBlockModalOpen(true);
  };

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin',
        phone: formData.phone,
        status: formData.status,
      });
      toast.success('Admin Added', `${formData.name} has been added as an admin.`);
      // Fire-and-forget email
      if (response?.data?.id) apiClient.post(`/users/${response.data.id}/welcome-email`).catch(() => {});
      setIsAddModalOpen(false);
      fetchAccounts();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to add admin account.';
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
        phone: formData.phone,
        status: formData.status,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      const response = await usersApi.update(selectedItem.id, payload);
      toast.success('Account Updated', `${formData.name}'s information has been updated.`);
      // Fire-and-forget email
      apiClient.post(`/users/${selectedItem.id}/update-email`, { changes: response._changes || [] }).catch(() => {});
      setIsEditModalOpen(false);
      fetchAccounts();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to update account.';
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
      toast.success('Account Archived', `${selectedItem.name} has been archived.`);
      setIsDeleteModalOpen(false);
      fetchAccounts();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to archive account.';
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockConfirm = async () => {
    if (!selectedItem) return;
    const newStatus = selectedItem.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'blocked' : 'unblocked';
    try {
      setSubmitting(true);
      await usersApi.update(selectedItem.id, { status: newStatus });
      toast.success('Status Updated', `${selectedItem.name} has been ${action}.`);
      // Fire-and-forget email
      apiClient.post(`/users/${selectedItem.id}/update-email`, { changes: [`Status changed to ${newStatus}`] }).catch(() => {});
      setIsBlockModalOpen(false);
      fetchAccounts();
    } catch (error) {
      const msg = error?.response?.data?.message || `Failed to ${action.replace('ed', '')} account.`;
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role', cell: (row) => {
      const display = getRoleDisplay(row);
      const colorKey = row.role === 'staff' ? (row.position || 'Secretary') : row.role;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[colorKey] || 'bg-gray-100 text-gray-600'}`}>
          {display}
        </span>
      );
    }},
    { header: 'Phone', accessor: 'phone', cell: (row) => row.phone || <span className="text-gray-400 text-xs">—</span> },
    { header: 'Created', accessor: 'created_at', cell: (row) => (
      row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status === 'active' ? 'Active' : 'Blocked'} />
    )},
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <div className="flex items-center gap-1">
        {row.role !== 'customer' && (
          <button onClick={() => handleEdit(row)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Edit">
            <Edit3 size={15} />
          </button>
        )}
        <button
          onClick={() => handleBlockToggle(row)}
          className={`p-1.5 rounded-md transition-colors ${
            row.status === 'active'
              ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700'
              : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-700'
          }`}
          title={row.status === 'active' ? 'Block' : 'Unblock'}
        >
          {row.status === 'active' ? <Ban size={15} /> : <CheckCircle size={15} />}
        </button>
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500" title="Archive">
          <Trash2 size={15} />
        </button>
      </div>
    )},
  ];

  return (
    <div>
      {/* Stats */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Accounts" value={totalAccounts} unit="accounts" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeAccounts} unit="accounts" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Blocked" value={blockedAccounts} unit="accounts" icon={Ban} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
          <StatsCard label="Admin / Sec. / Driver / Customer" value={`${roleCounts.admin} / ${roleCounts.Secretary} / ${roleCounts.Driver} / ${roleCounts.customer}`} icon={Shield} iconBgColor="bg-gradient-to-br from-purple-400 to-purple-600" />
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex gap-2 mb-4">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
            }`}>
              {tab.id === 'all' ? accounts.length : (tab.id === 'Secretary' || tab.id === 'Driver') ? accounts.filter(a => a.role === 'staff' && a.position === tab.id).length : accounts.filter(a => a.role === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <DataTable
          title="All Accounts"
          subtitle="Manage all system accounts"
          columns={columns}
          data={filteredAccounts}
          searchPlaceholder="Search accounts..."
          onAdd={handleAdd}
          addLabel="Add Admin"
        />
      )}

      {/* Add Admin Modal */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Admin" submitText={submitting ? 'Adding...' : 'Add Admin'} size="lg" disabled={submitting}>
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="admin@kjp.com" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Password" name="password" type="password" value={formData.password} onChange={handleFormChange} required placeholder="Min. 8 characters" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title={`Edit ${selectedItem ? getRoleDisplay(selectedItem) : ''} Account`} submitText={submitting ? 'Saving...' : 'Save Changes'} size="lg" disabled={submitting}>
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="Email address" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="New Password" name="password" type="password" value={formData.password} onChange={handleFormChange} placeholder="Leave blank to keep current" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      {/* Archive Confirm */}
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Archive Account" message={`Are you sure you want to archive "${selectedItem?.name}"? Their access will be revoked. You can restore this record from the Archives.`} confirmText={submitting ? 'Archiving...' : 'Archive'} variant="warning" icon={Trash2} />

      {/* Block/Unblock Confirm */}
      <ConfirmModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onConfirm={handleBlockConfirm}
        title={selectedItem?.status === 'active' ? 'Block Account' : 'Unblock Account'}
        message={selectedItem?.status === 'active'
          ? `Are you sure you want to block "${selectedItem?.name}"? They will not be able to log in until unblocked.`
          : `Are you sure you want to unblock "${selectedItem?.name}"? They will be able to log in again.`
        }
        confirmText={submitting ? (selectedItem?.status === 'active' ? 'Blocking...' : 'Unblocking...') : (selectedItem?.status === 'active' ? 'Block' : 'Unblock')}
        variant={selectedItem?.status === 'active' ? 'danger' : 'primary'}
        icon={selectedItem?.status === 'active' ? Ban : CheckCircle}
      />
    </div>
  );
};

export default AdminAccounts;
