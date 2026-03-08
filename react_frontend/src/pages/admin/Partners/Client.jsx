import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UserCheck, Users, ShoppingBag, CheckCircle, XCircle, Archive, Mail, Phone, MapPin, User, Building2, Package, ClipboardList, UserPlus, Send, ShieldCheck, Lock, Loader2, Edit } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';
import { useAuth } from '../../../context/AuthContext';

const CACHE_KEY = '/customers';

const Client = () => {
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
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [clientOrders, setclientOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [verificationStep, setVerificationStep] = useState('initial');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ password: '', password_confirmation: '' });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const emailCheckTimeout = useRef(null);

  // Super-fast data fetching with cache
  const { 
    data: clients, 
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
  const checkEmailAvailability = useCallback(async (email, clientId = null) => {
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
          customer_id: clientId
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

  // --- Client Orders & Account handlers ---
  const handleViewOrders = useCallback(async (item) => {
    setSelectedItem(item);
    setIsOrdersModalOpen(true);
    setLoadingOrders(true);
    try {
      const response = await apiClient.get(`/customers/${item.id}/orders`);
      if (response.success) {
        setclientOrders(response.data || []);
      } else {
        toast.error('Error', 'Failed to load orders');
        setclientOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error', 'Failed to load client orders');
      setclientOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [toast]);

  const handleOpenAccountModal = useCallback((item) => {
    setSelectedItem(item);
    setVerificationStep('initial');
    setVerificationCode('');
    setAccountFormData({ password: '', password_confirmation: '' });
    setErrors({});
    setIsAccountModalOpen(true);
  }, []);

  const handleSendVerificationCode = useCallback(async () => {
    setSendingCode(true);
    try {
      const response = await apiClient.post(`/customers/${selectedItem.id}/send-verification`);
      if (response.success) {
        setVerificationStep('code-sent');
        toast.success('Code Sent', `Verification code sent to ${selectedItem.email}`);
      } else {
        toast.error('Error', response.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error('Error', error.response?.data?.message || error.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  }, [selectedItem, toast]);

  const handleVerifyCode = useCallback(async () => {
    setVerifying(true);
    setErrors({});
    try {
      const response = await apiClient.post(`/customers/${selectedItem.id}/verify-code`, { code: verificationCode });
      if (response.success) {
        setVerificationStep('verified');
        toast.success('Email Verified', 'Email address has been verified successfully');
      } else {
        setErrors({ code: [response.message || 'Invalid verification code'] });
        toast.error('Invalid Code', response.message || 'The verification code is incorrect');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      const msg = error.response?.data?.message || error.message || 'Verification failed';
      setErrors({ code: [msg] });
      toast.error('Error', msg);
    } finally {
      setVerifying(false);
    }
  }, [selectedItem, verificationCode, toast]);

  const handleCreateAccountSubmit = useCallback(async () => {
    setCreatingAccount(true);
    setErrors({});
    try {
      const response = await apiClient.post(`/customers/${selectedItem.id}/create-account`, accountFormData);
      if (response.success) {
        toast.success('Account Created', `Account has been created for ${selectedItem.name}`);
        setIsAccountModalOpen(false);
        invalidateCache(CACHE_KEY);
        refetch();
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error creating account:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
      }
      toast.error('Error', error.response?.data?.message || error.message || 'Failed to create account');
    } finally {
      setCreatingAccount(false);
    }
  }, [selectedItem, accountFormData, toast, refetch]);

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
        const clientName = formData.name;
        // Close modal first
        setIsAddModalOpen(false);
        
        toast.success('Client Added', `${clientName} has been added successfully.`);
        // Refetch in background
        invalidateCache(CACHE_KEY);
        refetch();
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error adding client:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ');
        toast.error('Validation Error', `Please fix the following: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to add client');
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
        const clientName = formData.name;
        // Close modal first
        setIsEditModalOpen(false);
        
        toast.success('Client Updated', `${clientName} has been updated.`);
        // Refetch in background
        invalidateCache(CACHE_KEY);
        refetch();
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error updating client:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ');
        toast.error('Validation Error', `Please fix the following: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to update client');
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
        const clientName = selectedItem.name;
        const archivedId = selectedItem.id;
        // Close modal first
        setIsDeleteModalOpen(false);
        
        // Immediately remove from local data (optimistic update) for instant UI
        optimisticUpdate(prev => prev.filter(c => c.id !== archivedId));
        toast.success('Client Archived', `${clientName} has been archived.`);
        // Refetch in background to confirm
        invalidateCache(CACHE_KEY);
        refetch();
        return;
      } else {
        throw new Error(response.error || 'Failed to archive');
      }
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error('Error', 'Failed to archive client');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const inactiveClients = clients.filter(c => c.status === 'Inactive').length;
  const totalOrders = clients.reduce((sum, c) => sum + c.orders, 0);

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
            <Mail size={14} className="text-green-600 dark:text-green-400" />
            <a href={`mailto:${row.email}`} className="text-button-600 hover:text-button-700 dark:text-button-300 hover:underline">
              {row.email}
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Phone size={14} className="text-purple-600 dark:text-purple-400" />
            <a href={`tel:${row.phone}`} className="text-gray-700 dark:text-gray-200 hover:text-gray-900">
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
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleViewOrders(row); }}
          className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 hover:text-blue-700 dark:text-blue-300 transition-colors"
          title="View Orders"
        >
          <ClipboardList size={15} />
        </button>
        {!row.has_account ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenAccountModal(row); }}
            className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-700 dark:text-green-300 transition-colors"
            title="Create Account"
          >
            <UserPlus size={15} />
          </button>
        ) : (
          <span className="p-1.5 text-green-500" title="Has Account">
            <ShieldCheck size={15} />
          </span>
        )}
        <ActionButtons onEdit={() => handleEdit(row)} onArchive={isSuperAdmin() ? () => handleDelete(row) : undefined} />
      </div>
    )},
  ], [handleView, handleEdit, handleDelete, handleViewOrders, handleOpenAccountModal, isSuperAdmin]);

  return (
    <div>
      <PageHeader 
        title="Clients" 
        description="Manage your client database and relationships" 
        icon={UserCheck}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards - Show data immediately, skeleton only on true first load */}
      {loading && clients.length === 0 ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Clients" value={totalClients} unit="clients" icon={Users} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeClients} unit="clients" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
          <StatsCard label="Inactive" value={inactiveClients} unit="clients" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
          <StatsCard label="Total Orders" value={totalOrders} unit="orders" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        </div>
      )}

      {/* Table - Show data immediately, skeleton only on true first load */}
      {loading && clients.length === 0 ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <DataTable 
          title="Client List" 
          subtitle="Manage all client records" 
          columns={columns} 
          data={clients} 
          searchPlaceholder="Search clients..." 
          filterField="status" 
          filterPlaceholder="All Status" 
          onAdd={handleAdd} 
          addLabel="Add Client"
          onRowDoubleClick={handleView}
        />
      )}

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Client Details" 
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setIsViewModalOpen(false);
                handleViewOrders(selectedItem);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ClipboardList size={16} /> View Orders
            </button>
            {selectedItem && !selectedItem.has_account && (
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenAccountModal(selectedItem);
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <UserPlus size={16} /> Create Account
              </button>
            )}
            <button
              onClick={() => {
                setIsViewModalOpen(false);
                handleEdit(selectedItem);
              }}
              className="px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors"
            >
              Edit Client
            </button>
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
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
              <div className="bg-gradient-to-r from-primary-50 dark:from-gray-700 to-button-50 dark:to-gray-700 p-3 rounded-lg border-2 border-primary-200 dark:border-primary-700">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-button-500 text-white rounded-lg">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{selectedItem.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Business Name</p>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              {/* Contact Person */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Contact Person</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{selectedItem.contact}</p>
                </div>
              </div>

              {/* Orders */}
              <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-button-50 dark:from-gray-700 to-primary-50 dark:to-gray-700 rounded-lg border-2 border-button-200 dark:border-button-700">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Package size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Total Orders</p>
                  <p className="text-xl font-bold text-button-600 dark:text-button-400">{selectedItem.orders || 0}</p>
                </div>
              </div>

              {/* Account Status */}
              <div className={`flex items-start gap-2 p-3 rounded-lg ${selectedItem.has_account ? 'bg-gradient-to-r from-green-50 dark:from-gray-700 to-emerald-50 dark:to-gray-700 border-2 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <div className={`p-2 rounded-lg ${selectedItem.has_account ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                  {selectedItem.has_account ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Account Status</p>
                  <p className={`text-sm font-semibold ${selectedItem.has_account ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {selectedItem.has_account ? 'Active Account' : 'No Account'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Email & Phone in Same Section */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2.5">
                {/* Email */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                    <Mail size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-300">Email</p>
                    <a href={`mailto:${selectedItem.email}`} className="font-semibold text-button-600 hover:text-button-700 dark:text-button-300 transition-colors text-sm">
                      {selectedItem.email}
                    </a>
                  </div>
                </div>
                {/* Phone */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Phone size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-300">Phone</p>
                    <a href={`tel:${selectedItem.phone}`} className="font-semibold text-button-600 hover:text-button-700 dark:text-button-300 transition-colors text-sm">
                      {selectedItem.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Address</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{selectedItem.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modals */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Client" submitText="Add Client" size="lg" loading={saving}>
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

      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Client" submitText="Save Changes" size="lg" loading={saving}>
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

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Archive Client" message={`Are you sure you want to archive "${selectedItem?.name}"? It will be moved to the archives and can be restored later.`} confirmText="Archive" variant="warning" icon={Archive} loading={saving} />

      {/* Orders Modal */}
      <Modal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        title={`Orders — ${selectedItem?.name || ''}`}
        size="full"
        footer={
          <div className="flex justify-between items-center">
            {!loadingOrders && clientOrders.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{clientOrders.length} order{clientOrders.length !== 1 ? 's' : ''} found</span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setIsOrdersModalOpen(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {loadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-button-500" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">Loading orders...</span>
          </div>
        ) : clientOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ShoppingBag size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm">This client hasn't placed any orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Order Summary Cards */}
            {(() => {
              const pendingOrders = clientOrders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status));
              const completedOrders = clientOrders.filter(o => ['delivered', 'completed'].includes(o.status));
              const pendingTotal = pendingOrders.reduce((sum, o) => sum + o.total, 0);
              const completedTotal = completedOrders.reduce((sum, o) => sum + o.total, 0);
              const grandTotal = clientOrders.reduce((sum, o) => sum + o.total, 0);
              return (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending</p>
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">₱{pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-yellow-500">{pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completed / Delivered</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">₱{completedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-green-500">{completedOrders.length} order{completedOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-button-50 dark:bg-button-900/20 border border-button-200 dark:border-button-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-button-600 dark:text-button-400 font-medium">Grand Total</p>
                    <p className="text-lg font-bold text-button-700 dark:text-button-300">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-button-500">{clientOrders.length} order{clientOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })()}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Transaction ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Items</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {clientOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-button-600 dark:text-button-400">{order.transaction_id}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{order.date_formatted}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.variety_color }}></span>
                            <span className="text-gray-700 dark:text-gray-200">{item.product_name}</span>
                            <span className="text-gray-400">×{item.quantity}</span>
                            <span className="text-gray-500 dark:text-gray-400">₱{item.unit_price?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{order.total_formatted}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">{order.payment_method}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">{clientOrders.length} order{clientOrders.length !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                Grand Total: ₱{clientOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Account Creation Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => { setIsAccountModalOpen(false); setVerificationStep('initial'); setVerificationCode(''); setAccountFormData({ password: '', password_confirmation: '' }); setErrors({}); }}
        title="Create Client Account"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-button-100 dark:bg-button-900/30 text-button-600 dark:text-button-400 rounded-lg">
                <User size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedItem.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedItem.email}</p>
              </div>
            </div>

            {/* Step 1: Email Verification */}
            <div className={`p-4 rounded-lg border-2 ${verificationStep === 'initial' ? 'border-button-200 dark:border-button-700 bg-button-50 dark:bg-button-900/20' : verificationStep === 'verified' ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} className={verificationStep === 'verified' ? 'text-green-600 dark:text-green-400' : 'text-button-600 dark:text-button-400'} />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Step 1: Verify Email</h3>
                {verificationStep === 'verified' && <ShieldCheck size={18} className="text-green-600 dark:text-green-400" />}
              </div>

              {verificationStep === 'initial' && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Send a verification code to <strong>{selectedItem.email}</strong> to confirm the email address is valid.</p>
                  <button
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode}
                    className="flex items-center gap-2 px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingCode ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sendingCode ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              )}

              {verificationStep === 'code-sent' && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">A 6-digit code has been sent to <strong>{selectedItem.email}</strong>. Ask the client for the code and enter it below.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="flex-1 px-4 py-2 border border-primary-300 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-button-500 focus:border-button-500 text-center text-lg tracking-widest font-mono"
                    />
                    <button
                      onClick={handleVerifyCode}
                      disabled={verifying || verificationCode.length !== 6}
                      className="flex items-center gap-2 px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Verify
                    </button>
                  </div>
                  <button
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode}
                    className="mt-2 text-sm text-button-600 hover:text-button-700 dark:text-button-300 underline"
                  >
                    {sendingCode ? 'Sending...' : 'Resend Code'}
                  </button>
                  {errors.code && <p className="mt-2 text-sm text-red-500">{Array.isArray(errors.code) ? errors.code[0] : errors.code}</p>}
                </div>
              )}

              {verificationStep === 'verified' && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Email verified successfully!</p>
              )}
            </div>

            {/* Step 2: Set Password */}
            {verificationStep === 'verified' && (
              <div className="p-4 rounded-lg border-2 border-button-200 dark:border-button-700 bg-button-50 dark:bg-button-900/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} className="text-button-600 dark:text-button-400" />
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">Step 2: Set Password</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                    <input
                      type="password"
                      value={accountFormData.password}
                      onChange={(e) => setAccountFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-2 border border-primary-300 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-button-500 focus:border-button-500"
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={accountFormData.password_confirmation}
                      onChange={(e) => setAccountFormData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-2 border border-primary-300 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-button-500 focus:border-button-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateAccountSubmit}
                    disabled={creatingAccount || !accountFormData.password || !accountFormData.password_confirmation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {creatingAccount ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {creatingAccount ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Client;
