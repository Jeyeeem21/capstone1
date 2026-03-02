import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UserCheck, Users, ShoppingBag, CheckCircle, XCircle, Archive, Mail, Phone, MapPin, User, Building2, Package } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';
import { useAuth } from '../../../context/AuthContext';

const CACHE_KEY = '/customers';

const Customer = () => {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: '', phone: '', email: '', address: '', status: 'Active' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const emailCheckTimeout = useRef(null);

  // Super-fast data fetching with cache
  const { 
    data: customers, 
    loading, 
    isRefreshing,
    refetch,
    optimisticUpdate 
  } = useDataFetch('/customers', {
    cacheKey: CACHE_KEY,
    initialData: [],
  });

  const statusOptions = useMemo(() => [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ], []);

  // Debounced email validation
  const checkEmailAvailability = useCallback(async (email, customerId = null) => {
    // Clear previous timeout
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    // Validate email format first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return;
    }

    // Debounce: wait 500ms after user stops typing
    emailCheckTimeout.current = setTimeout(async () => {
      try {
        setIsCheckingEmail(true);
        const response = await apiClient.post('/customers/check-email', {
          email,
          customer_id: customerId
        });

        if (response.success && !response.data.available) {
          setErrors(prev => ({
            ...prev,
            email: ['This email is already registered.']
          }));
        } else {
          // Clear email error if available
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500); // 500ms debounce
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
    };
  }, []);

  const handleAdd = useCallback(() => {
    setFormData({ name: '', contact: '', phone: '', email: '', address: '', status: 'Active' });
    setErrors({});
    setIsAddModalOpen(true);
  }, []);

  const handleView = useCallback((item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormData({ name: item.name, contact: item.contact, phone: item.phone, email: item.email, address: item.address, status: item.status });
    setErrors({});
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });

    // Real-time validation for specific fields
    if (name === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors(prev => ({
          ...prev,
          email: ['Please enter a valid email address.']
        }));
      } else {
        // Check email availability in database
        checkEmailAvailability(value, selectedItem?.id);
      }
    }

    if (name === 'phone' && value) {
      // Allow spaces in phone numbers: +63 912 345 6789 or 09171234567
      const cleanPhone = value.replace(/\s/g, '');
      const phoneRegex = /^(\+63\d{10}|09\d{9})$/;
      if (!phoneRegex.test(cleanPhone)) {
        setErrors(prev => ({
          ...prev,
          phone: ['Phone must be +63 followed by 10 digits (e.g., +63 912 345 6789) or 09 followed by 9 digits (e.g., 09171234567).']
        }));
      }
    }
  }, [checkEmailAvailability, selectedItem]);

  const handleAddSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      // Strip spaces from phone before sending
      const submitData = {
        ...formData,
        phone: formData.phone.replace(/\s/g, '')
      };
      const response = await apiClient.post('/customers', submitData);
      
      if (response.success && response.data) {
        const customerName = formData.name;
        // Close modal first
        setIsAddModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Customer Added', `${customerName} has been added successfully.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ');
        toast.error('Validation Error', `Please fix the following: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to add customer');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      // Strip spaces from phone before sending
      const submitData = {
        ...formData,
        phone: formData.phone.replace(/\s/g, '')
      };
      const response = await apiClient.put(`/customers/${selectedItem.id}`, submitData);
      
      if (response.success && response.data) {
        const customerName = formData.name;
        // Close modal first
        setIsEditModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Customer Updated', `${customerName} has been updated.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ');
        toast.error('Validation Error', `Please fix the following: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to update customer');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      // Soft delete - use DELETE endpoint which now sets deleted_at
      const response = await apiClient.delete(`/customers/${selectedItem.id}`);
      
      if (response.success) {
        const customerName = selectedItem.name;
        // Close modal first
        setIsDeleteModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Customer Archived', `${customerName} has been archived.`);
        });
        return;
      } else {
        throw new Error(response.error || 'Failed to archive');
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
      toast.error('Error', 'Failed to archive customer');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'Active').length;
  const inactiveCustomers = customers.filter(c => c.status === 'Inactive').length;
  const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);

  const columns = useMemo(() => [
    { header: 'Business Name', accessor: 'name' },
    { header: 'Contact Person', accessor: 'contact' },
    { 
      header: 'Email & Phone', 
      accessor: 'contact_info',
      sortable: false,
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Mail size={14} className="text-green-600" />
            <a href={`mailto:${row.email}`} className="text-button-600 hover:text-button-700 hover:underline">
              {row.email}
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Phone size={14} className="text-purple-600" />
            <a href={`tel:${row.phone}`} className="text-gray-700 hover:text-gray-900">
              {row.phone}
            </a>
          </div>
        </div>
      )
    },
    { header: 'Address', accessor: 'address' },
    { header: 'Orders', accessor: 'orders' },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onEdit={() => handleEdit(row)} onArchive={isSuperAdmin() ? () => handleDelete(row) : undefined} />
    )},
  ], [handleView, handleEdit, handleDelete]);

  return (
    <div>
      <PageHeader 
        title="Customers" 
        description="Manage your customer database and relationships" 
        icon={UserCheck}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards - Show data immediately, skeleton only on true first load */}
      {loading && customers.length === 0 ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Customers" value={totalCustomers} unit="customers" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeCustomers} unit="customers" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
          <StatsCard label="Inactive" value={inactiveCustomers} unit="customers" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
          <StatsCard label="Total Orders" value={totalOrders} unit="orders" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        </div>
      )}

      {/* Table - Show data immediately, skeleton only on true first load */}
      {loading && customers.length === 0 ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <DataTable 
          title="Customer List" 
          subtitle="Manage all customer records" 
          columns={columns} 
          data={customers} 
          searchPlaceholder="Search customers..." 
          filterField="status" 
          filterPlaceholder="All Status" 
          onAdd={handleAdd} 
          addLabel="Add Customer"
          onRowDoubleClick={handleView}
        />
      )}

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Customer Details" 
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setIsViewModalOpen(false);
                handleEdit(selectedItem);
              }}
              className="px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors"
            >
              Edit Customer
            </button>
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedItem && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              {/* Business Info */}
              <div className="bg-gradient-to-r from-primary-50 to-button-50 p-3 rounded-lg border-2 border-primary-200">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-button-500 text-white rounded-lg">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">{selectedItem.name}</h3>
                    <p className="text-xs text-gray-600">Business Name</p>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              {/* Contact Person */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Contact Person</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.contact}</p>
                </div>
              </div>

              {/* Orders */}
              <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-button-50 to-primary-50 rounded-lg border-2 border-button-200">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Package size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Total Orders</p>
                  <p className="text-xl font-bold text-button-600">{selectedItem.orders || 0}</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Email & Phone in Same Section */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2.5">
                {/* Email */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <Mail size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Email</p>
                    <a href={`mailto:${selectedItem.email}`} className="font-semibold text-button-600 hover:text-button-700 transition-colors text-sm">
                      {selectedItem.email}
                    </a>
                  </div>
                </div>
                {/* Phone */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <Phone size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Phone</p>
                    <a href={`tel:${selectedItem.phone}`} className="font-semibold text-button-600 hover:text-button-700 transition-colors text-sm">
                      {selectedItem.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Address</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modals */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Customer" submitText="Add Customer" size="lg" loading={saving}>
        {({ submitted }) => (
          <>
            <FormInput 
              label="Business Name" 
              name="name" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter business name" 
              submitted={submitted} 
              error={errors.name?.[0]} 
            />
            <FormInput 
              label="Contact Person" 
              name="contact" 
              value={formData.contact} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter contact person name" 
              submitted={submitted} 
              error={errors.contact?.[0]} 
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput 
                label="Phone" 
                name="phone" 
                value={formData.phone} 
                onChange={handleFormChange} 
                required 
                placeholder="+639171234567 or 09171234567" 
                submitted={submitted} 
                error={errors.phone?.[0]}
                hint="Format: +63 followed by 10 digits or 09 followed by 9 digits" 
              />
              <FormInput 
                label="Email" 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleFormChange} 
                required 
                placeholder="email@example.com" 
                submitted={submitted} 
                error={errors.email?.[0]} 
              />
            </div>
            <FormInput 
              label="Address" 
              name="address" 
              value={formData.address} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter business address" 
              submitted={submitted} 
              error={errors.address?.[0]} 
            />
            <FormSelect 
              label="Status" 
              name="status" 
              value={formData.status} 
              onChange={handleFormChange} 
              options={statusOptions} 
              required 
              submitted={submitted} 
              error={errors.status?.[0]} 
            />
          </>
        )}
      </FormModal>

      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Customer" submitText="Save Changes" size="lg" loading={saving}>
        {({ submitted }) => (
          <>
            <FormInput 
              label="Business Name" 
              name="name" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter business name" 
              submitted={submitted} 
              error={errors.name?.[0]} 
            />
            <FormInput 
              label="Contact Person" 
              name="contact" 
              value={formData.contact} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter contact person name" 
              submitted={submitted} 
              error={errors.contact?.[0]} 
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput 
                label="Phone" 
                name="phone" 
                value={formData.phone} 
                onChange={handleFormChange} 
                required 
                placeholder="+639171234567 or 09171234567" 
                submitted={submitted} 
                error={errors.phone?.[0]}
                hint="Format: +63 followed by 10 digits or 09 followed by 9 digits" 
              />
              <FormInput 
                label="Email" 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleFormChange} 
                required 
                placeholder="email@example.com" 
                submitted={submitted} 
                error={errors.email?.[0]}
                loading={isCheckingEmail}
              />
            </div>
            <FormInput 
              label="Address" 
              name="address" 
              value={formData.address} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter business address" 
              submitted={submitted} 
              error={errors.address?.[0]} 
            />
            <FormSelect 
              label="Status" 
              name="status" 
              value={formData.status} 
              onChange={handleFormChange} 
              options={statusOptions} 
              required 
              submitted={submitted} 
              error={errors.status?.[0]} 
            />
          </>
        )}
      </FormModal>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Archive Customer" message={`Are you sure you want to archive "${selectedItem?.name}"? It will be moved to the archives and can be restored later.`} confirmText="Archive" variant="warning" icon={Archive} loading={saving} />
    </div>
  );
};

export default Customer;
