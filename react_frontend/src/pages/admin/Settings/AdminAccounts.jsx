import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, CheckCircle, XCircle, UserPlus, Trash2, Edit3, Save, Loader2 } from 'lucide-react';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { usersApi } from '../../../api';

const AdminAccounts = () => {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', status: 'active',
  });

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll({ role: 'admin' });
      const data = response?.data?.data || response?.data || [];
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      toast.error('Error', 'Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

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

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSubmit = async () => {
    try {
      setSubmitting(true);
      await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin',
        phone: formData.phone,
        status: formData.status,
      });
      toast.success('Admin Added', `${formData.name} has been added as an admin.`);
      setIsAddModalOpen(false);
      fetchAdmins();
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
      await usersApi.update(selectedItem.id, payload);
      toast.success('Admin Updated', `${formData.name}'s information has been updated.`);
      setIsEditModalOpen(false);
      fetchAdmins();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to update admin account.';
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
      toast.success('Admin Removed', `${selectedItem.name} has been removed.`);
      setIsDeleteModalOpen(false);
      fetchAdmins();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to remove admin account.';
      toast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.status === 'active').length;
  const inactiveAdmins = admins.filter(a => a.status === 'inactive').length;

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone', cell: (row) => row.phone || <span className="text-gray-400 text-xs">—</span> },
    { header: 'Created', accessor: 'created_at', cell: (row) => (
      row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status === 'active' ? 'Active' : 'Inactive'} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onEdit={() => handleEdit(row)} onArchive={() => handleDelete(row)} />
    )},
  ];

  return (
    <div>
      {/* Stats */}
      {loading ? (
        <SkeletonStats count={3} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard label="Total Admins" value={totalAdmins} unit="accounts" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeAdmins} unit="accounts" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
          <StatsCard label="Inactive" value={inactiveAdmins} unit="accounts" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : (
        <DataTable title="Admin Accounts" subtitle="Manage administrator accounts" columns={columns} data={admins} searchPlaceholder="Search admins..." onAdd={handleAdd} addLabel="Add Admin" />
      )}

      {/* Add Modal */}
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
      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Admin Account" submitText={submitting ? 'Saving...' : 'Save Changes'} size="lg" disabled={submitting}>
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="admin@kjp.com" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="New Password" name="password" type="password" value={formData.password} onChange={handleFormChange} placeholder="Leave blank to keep current" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      {/* Delete Confirm */}
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Remove Admin Account" message={`Are you sure you want to remove "${selectedItem?.name}"? Their admin access will be permanently revoked.`} confirmText={submitting ? 'Removing...' : 'Remove'} variant="warning" icon={Trash2} />
    </div>
  );
};

export default AdminAccounts;
