import { useState, useEffect } from 'react';
import { UserCog, Shield, Users, CheckCircle, XCircle, Briefcase, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';

const StaffManagement = () => {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', email: '', phone: '', dateHired: '', status: 'Active' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const staff = [
    { id: 1, name: 'John Smith', role: 'Manager', email: 'john@kjp.com', phone: '+63 912 123 4567', dateHired: '2023-01-15', status: 'Active' },
    { id: 2, name: 'Sarah Johnson', role: 'Cashier', email: 'sarah@kjp.com', phone: '+63 923 234 5678', dateHired: '2023-03-20', status: 'Active' },
    { id: 3, name: 'Mike Wilson', role: 'Inventory Staff', email: 'mike@kjp.com', phone: '+63 934 345 6789', dateHired: '2023-05-10', status: 'Active' },
    { id: 4, name: 'Emily Brown', role: 'Cashier', email: 'emily@kjp.com', phone: '+63 945 456 7890', dateHired: '2023-06-01', status: 'Inactive' },
    { id: 5, name: 'David Lee', role: 'Processing Staff', email: 'david@kjp.com', phone: '+63 956 567 8901', dateHired: '2023-07-15', status: 'Active' },
    { id: 6, name: 'Grace Chen', role: 'Cashier', email: 'grace@kjp.com', phone: '+63 967 678 9012', dateHired: '2023-08-20', status: 'Active' },
    { id: 7, name: 'Robert Garcia', role: 'Inventory Staff', email: 'robert@kjp.com', phone: '+63 978 789 0123', dateHired: '2023-09-10', status: 'Active' },
    { id: 8, name: 'Jennifer Martinez', role: 'Procurement Staff', email: 'jennifer@kjp.com', phone: '+63 989 890 1234', dateHired: '2023-10-05', status: 'Inactive' },
    { id: 9, name: 'William Santos', role: 'Processing Staff', email: 'william@kjp.com', phone: '+63 912 901 2345', dateHired: '2023-11-01', status: 'Active' },
    { id: 10, name: 'Amanda Reyes', role: 'Manager', email: 'amanda@kjp.com', phone: '+63 923 012 3456', dateHired: '2024-01-10', status: 'Active' },
  ];

  const roleOptions = [
    { value: 'Manager', label: 'Manager' },
    { value: 'Cashier', label: 'Cashier' },
    { value: 'Inventory Staff', label: 'Inventory Staff' },
    { value: 'Processing Staff', label: 'Processing Staff' },
    { value: 'Procurement Staff', label: 'Procurement Staff' },
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const handleAdd = () => {
    setFormData({ name: '', role: '', email: '', phone: '', dateHired: new Date().toISOString().split('T')[0], status: 'Active' });
    setIsAddModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsEditModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSubmit = () => {
    toast.success('Staff Added', `${formData.name} has been added to the team.`);
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = () => {
    toast.success('Staff Updated', `${formData.name}'s information has been updated.`);
    setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    toast.success('Staff Removed', `${selectedItem.name} has been removed from the system.`);
    setIsDeleteModalOpen(false);
  };

  // Stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;
  const inactiveStaff = staff.filter(s => s.status === 'Inactive').length;
  const totalRoles = [...new Set(staff.map(s => s.role))].length;

  const getRoleBadge = (role) => {
    const roleColors = {
      'Manager': 'bg-purple-100 text-purple-600',
      'Cashier': 'bg-blue-100 text-blue-600',
      'Inventory Staff': 'bg-orange-100 text-orange-600',
      'Processing Staff': 'bg-green-100 text-green-600',
      'Procurement Staff': 'bg-cyan-100 text-cyan-600',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-600';
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Role', accessor: 'role', cell: (row) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadge(row.role)}`}>
        <Shield size={12} />
        {row.role}
      </span>
    )},
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Date Hired', accessor: 'dateHired' },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onView={() => toast.info('View Staff', `Viewing ${row.name}'s profile`)} onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
    )},
  ];

  return (
    <div>
      <PageHeader title="Staff Management" description="Manage your team members and their access levels" icon={UserCog} />

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Staff" value={totalStaff} unit="employees" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Active" value={activeStaff} unit="employees" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
        <StatsCard label="Inactive" value={inactiveStaff} unit="employees" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
        <StatsCard label="Roles" value={totalRoles} unit="positions" icon={Briefcase} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
      </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
      <DataTable title="Staff Records" subtitle="Manage all staff members" columns={columns} data={staff} searchPlaceholder="Search staff..." filterField="role" filterPlaceholder="All Roles" dateFilterField="dateHired" onAdd={handleAdd} addLabel="Add Staff" />
      )}

      {/* Modals */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Staff Member" submitText="Add Staff" size="lg">
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <FormSelect label="Role" name="role" value={formData.role} onChange={handleFormChange} options={roleOptions} required submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="email@kjp.com" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} required placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Date Hired" name="dateHired" type="date" value={formData.dateHired} onChange={handleFormChange} required submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Staff Member" submitText="Save Changes" size="lg">
        {({ submitted }) => (
          <>
            <FormInput label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter full name" submitted={submitted} />
            <FormSelect label="Role" name="role" value={formData.role} onChange={handleFormChange} options={roleOptions} required submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="email@kjp.com" submitted={submitted} />
              <FormInput label="Phone" name="phone" value={formData.phone} onChange={handleFormChange} required placeholder="+63 XXX XXX XXXX" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Date Hired" name="dateHired" type="date" value={formData.dateHired} onChange={handleFormChange} required submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Remove Staff Member" message={`Are you sure you want to remove "${selectedItem?.name}" from the system? This action cannot be undone.`} confirmText="Remove" variant="danger" icon={Trash2} />
    </div>
  );
};

export default StaffManagement;
