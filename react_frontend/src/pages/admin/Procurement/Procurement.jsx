import { useState, useCallback, useMemo, memo } from 'react';
import { ShoppingCart, Package, Truck, DollarSign, FileText, Trash2, Scale, Boxes, TrendingUp, Building2, User, Clock, CheckCircle, XCircle, AlertCircle, PlusCircle, Eye, Edit, Ban, Check } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';

const CACHE_KEY = '/procurements';
const SUPPLIERS_CACHE_KEY = '/suppliers';

// Supplier combobox component - DEFINED OUTSIDE to prevent re-creation on parent re-render
const SupplierCombobox = memo(({ value, newName, onChange, onInputChange, error, submitted, supplierOptions }) => {
  const hasValue = (value && value.toString().trim().length > 0) || (newName && newName.trim().length > 0);
  const showRequiredError = !hasValue && submitted && !error;
  const displayError = error || (showRequiredError ? 'Please select a supplier or add a new one' : '');
  
  return (
    <div className="mb-4">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
        Supplier <span className="text-red-500">*</span>
      </label>
      
      {/* Dropdown for existing suppliers */}
      <div className="relative">
        <select
          name="supplier_id"
          value={value}
          onChange={onChange}
          required
          className={`w-full px-4 py-3 text-sm border-2 rounded-xl transition-all appearance-none cursor-pointer shadow-sm pr-10 focus:outline-none focus:ring-4 ${
            displayError 
              ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20' 
              : hasValue && !newName
                ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20'
                : 'border-primary-300 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          } ${submitted && showRequiredError ? 'animate-shake' : ''}`}
        >
          {supplierOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          {displayError && <AlertCircle size={16} className="text-red-500" />}
          {hasValue && !newName && !displayError && <Check size={16} className="text-green-500" />}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-xs text-gray-500 uppercase font-medium">or add new</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Input for new supplier */}
      <div className="relative">
        <input
          type="text"
          name="new_supplier_name"
          value={newName}
          onChange={onInputChange}
          placeholder="Type new supplier name..."
          className={`w-full px-4 py-3 pl-10 text-sm border-2 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-4 ${
            newName 
              ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20' 
              : 'border-primary-300 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        />
        <PlusCircle size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${newName ? 'text-green-600' : 'text-gray-400'}`} />
        {newName && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check size={18} className="text-green-500" />
          </div>
        )}
      </div>

      {/* Info message when new supplier name is entered */}
      {newName && (
        <div className="flex items-start gap-2 p-2 mt-2 bg-green-50 border border-green-200 rounded-lg">
          <AlertCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700">
            A new supplier "<strong>{newName}</strong>" will be created and added to your suppliers list.
          </p>
        </div>
      )}

      {displayError && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{displayError}</p>
      )}
    </div>
  );
});

SupplierCombobox.displayName = 'SupplierCombobox';

const Procurement = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNewSupplierConfirmOpen, setIsNewSupplierConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ 
    supplier_id: '', 
    new_supplier_name: '',
    quantity_kg: '', 
    quantity_out: '0', 
    price_per_kg: '', 
    description: '', 
    status: 'Pending' 
  });
  const [errors, setErrors] = useState({});
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [saving, setSaving] = useState(false);

  // Super-fast data fetching with cache for procurements
  const { 
    data: procurements, 
    loading, 
    isRefreshing,
    refetch,
  } = useDataFetch('/procurements', {
    cacheKey: CACHE_KEY,
    initialData: [],
  });

  // Fetch suppliers for dropdown
  const { 
    data: suppliers, 
    refetch: refetchSuppliers,
  } = useDataFetch('/suppliers', {
    cacheKey: SUPPLIERS_CACHE_KEY,
    initialData: [],
  });

  // Convert suppliers to options for dropdown
  const supplierOptions = useMemo(() => {
    const options = suppliers.map(s => ({ value: String(s.id), label: s.name }));
    return [{ value: '', label: 'Select supplier or type new name...' }, ...options];
  }, [suppliers]);

  const statusOptions = useMemo(() => [
    { value: 'Pending', label: 'Pending' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ], []);

  // Calculate total cost dynamically
  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(formData.quantity_kg) || 0;
    const price = parseFloat(formData.price_per_kg) || 0;
    return qty * price;
  }, [formData.quantity_kg, formData.price_per_kg]);

  const handleAdd = useCallback(() => {
    setFormData({ 
      supplier_id: '', 
      new_supplier_name: '',
      quantity_kg: '', 
      quantity_out: '0', 
      price_per_kg: '', 
      description: '', 
      status: 'Pending' 
    });
    setErrors({});
    setIsAddModalOpen(true);
  }, []);

  const handleView = useCallback((item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormData({ 
      supplier_id: String(item.supplier_id), 
      new_supplier_name: '',
      quantity_kg: String(item.quantity_kg), 
      quantity_out: String(item.quantity_out || 0), 
      price_per_kg: String(item.price_per_kg), 
      description: item.description || ''
    });
    setErrors({});
    setIsEditModalOpen(true);
  }, []);

  const handleCancel = useCallback(async (item) => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiClient.put(`/procurements/${item.id}`, {
        ...item,
        status: 'Cancelled'
      });
      
      if (response.success) {
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Procurement Cancelled', 'Procurement status changed to Cancelled.');
        });
      }
    } catch (error) {
      console.error('Error cancelling procurement:', error);
      toast.error('Error', error.response?.data?.message || 'Failed to cancel procurement');
    } finally {
      setSaving(false);
    }
  }, [saving, refetch, toast]);

  const handleDelete = useCallback((item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  // Check if supplier name matches existing supplier
  const findMatchingSupplier = useCallback((name) => {
    if (!name) return null;
    return suppliers.find(s => s.name.toLowerCase() === name.toLowerCase());
  }, [suppliers]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // If typing in new_supplier_name, check for existing match
      if (name === 'new_supplier_name' && value) {
        const match = findMatchingSupplier(value);
        if (match) {
          // Auto-select existing supplier and clear new_supplier_name
          return { ...newData, supplier_id: String(match.id), new_supplier_name: '' };
        }
        // Clear supplier_id if typing a new name
        newData.supplier_id = '';
      }
      
      // If selecting from dropdown, clear new_supplier_name
      if (name === 'supplier_id' && value) {
        newData.new_supplier_name = '';
      }
      
      return newData;
    });
    
    // Clear error for this field when user types
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, [findMatchingSupplier]);

  // Handle supplier input to allow both dropdown and typing
  const handleSupplierInput = useCallback((e) => {
    const value = e.target.value;
    handleFormChange({ target: { name: 'new_supplier_name', value } });
  }, [handleFormChange]);

  // Actual submission after confirmation (if needed) - close modal first, then refetch and toast together
  const performSubmit = async (isEdit = false) => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const submitData = {
        supplier_id: formData.supplier_id || null,
        new_supplier_name: formData.new_supplier_name || null,
        quantity_kg: parseFloat(formData.quantity_kg),
        quantity_out: parseFloat(formData.quantity_out) || 0,
        price_per_kg: parseFloat(formData.price_per_kg),
        description: formData.description || null,
        status: formData.status,
      };

      let response;
      if (isEdit) {
        response = await apiClient.put(`/procurements/${selectedItem.id}`, submitData);
      } else {
        response = await apiClient.post('/procurements', submitData);
      }
      
      if (response.success && response.data) {
        const message = isEdit ? 'Procurement Updated' : 'Procurement Added';
        const desc = isEdit ? 'Procurement record has been updated.' : 
          formData.new_supplier_name 
            ? `Procurement added and new supplier "${formData.new_supplier_name}" created.`
            : 'Procurement record has been added.';
        
        // Close modal first
        isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        invalidateCache(SUPPLIERS_CACHE_KEY);
        Promise.all([refetch(), refetchSuppliers()]).then(() => {
          toast.success(message, desc);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error saving procurement:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).join(', ');
        toast.error('Validation Error', `Please fix the following fields: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to save procurement');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle add submission - check if new supplier needs confirmation
  const handleAddSubmit = async () => {
    // If there's a new supplier name, show confirmation first
    if (formData.new_supplier_name && !formData.supplier_id) {
      setPendingSubmit('add');
      setIsNewSupplierConfirmOpen(true);
      throw new Error('PENDING_CONFIRMATION');
    }
    
    await performSubmit(false);
  };

  // Handle edit submission
  const handleEditSubmit = async () => {
    await performSubmit(true);
  };

  // Handle new supplier confirmation
  const handleNewSupplierConfirm = async () => {
    setIsNewSupplierConfirmOpen(false);
    try {
      if (pendingSubmit === 'add') {
        await performSubmit(false);
        setIsAddModalOpen(false);
      }
    } catch (error) {
      // Errors already handled in performSubmit
    }
    setPendingSubmit(null);
  };

  const handleNewSupplierCancel = () => {
    setIsNewSupplierConfirmOpen(false);
    setPendingSubmit(null);
    // Focus back on supplier input
    if (supplierInputRef.current) {
      supplierInputRef.current.focus();
    }
  };

  const handleDeleteConfirm = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      const response = await apiClient.delete(`/procurements/${selectedItem.id}`);
      
      if (response.success) {
        // Close modal first
        setIsDeleteModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Procurement Removed', 'Procurement record has been removed.');
        });
        return;
      } else {
        throw new Error(response.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting procurement:', error);
      toast.error('Error', 'Failed to delete procurement');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalProcurements = procurements.length;
  const pendingOrders = procurements.filter(p => p.status === 'Pending').length;
  const completedOrders = procurements.filter(p => p.status === 'Completed').length;
  const totalQuantity = procurements.reduce((sum, p) => sum + parseFloat(p.quantity_kg || 0), 0);
  const totalQuantityOut = procurements.reduce((sum, p) => sum + parseFloat(p.quantity_out || 0), 0);
  const totalCost = procurements.reduce((sum, p) => sum + parseFloat(p.total_cost || 0), 0);

  // Helper function to get days in a month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Chart Data - Based on chartPeriod (daily, monthly, yearly)
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (chartPeriod === 'daily') {
      // Show all days in current month
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      
      // Group procurements by day
      const dayGroups = {};
      procurements.forEach(p => {
        if (!p.created_at) return;
        const date = new Date(p.created_at);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) {
            dayGroups[day] = { value: 0, quantity: 0 };
          }
          dayGroups[day].value += parseFloat(p.total_cost || 0);
          dayGroups[day].quantity += parseFloat(p.quantity_kg || 0);
        }
      });

      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        value: dayGroups[i + 1]?.value || 0,
        quantity: dayGroups[i + 1]?.quantity || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      // Show all months in current year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Group procurements by month
      const monthGroups = {};
      procurements.forEach(p => {
        if (!p.created_at) return;
        const date = new Date(p.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) {
            monthGroups[month] = { value: 0, quantity: 0 };
          }
          monthGroups[month].value += parseFloat(p.total_cost || 0);
          monthGroups[month].quantity += parseFloat(p.quantity_kg || 0);
        }
      });

      return months.map((name, i) => ({
        name,
        value: monthGroups[i]?.value || 0,
        quantity: monthGroups[i]?.quantity || 0,
      }));
    } else {
      // Yearly - current year and past 5 years
      const years = [];
      for (let i = 5; i >= 0; i--) {
        years.push(currentYear - i);
      }
      
      // Group procurements by year
      const yearGroups = {};
      procurements.forEach(p => {
        if (!p.created_at) return;
        const date = new Date(p.created_at);
        const year = date.getFullYear();
        if (!yearGroups[year]) {
          yearGroups[year] = { value: 0, quantity: 0 };
        }
        yearGroups[year].value += parseFloat(p.total_cost || 0);
        yearGroups[year].quantity += parseFloat(p.quantity_kg || 0);
      });

      return years.map(year => ({
        name: year.toString(),
        value: yearGroups[year]?.value || 0,
        quantity: yearGroups[year]?.quantity || 0,
      }));
    }
  }, [procurements, chartPeriod]);

  // Supplier breakdown for donut chart - TOP 5 ONLY
  const supplierBreakdown = useMemo(() => {
    const colors = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#8b5cf6'];
    const supplierTotals = {};
    
    procurements.forEach(p => {
      const supplierName = p.supplier_name || 'Unknown';
      if (!supplierTotals[supplierName]) {
        supplierTotals[supplierName] = 0;
      }
      supplierTotals[supplierName] += parseFloat(p.quantity_kg || 0);
    });

    // Convert to array, sort by value, and take TOP 5 only
    return Object.entries(supplierTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value: Math.round(value),
        color: colors[index % colors.length],
      }));
  }, [procurements]);

  // Quantity In vs Quantity Out comparison for donut chart
  const quantityComparison = useMemo(() => {
    return [
      { name: 'Quantity In', value: Math.round(totalQuantity), color: '#22c55e' },
      { name: 'Quantity Out', value: Math.round(totalQuantityOut), color: '#ef4444' },
    ];
  }, [totalQuantity, totalQuantityOut]);

  // Average order value
  const avgOrderValue = totalProcurements > 0 ? Math.floor(totalCost / totalProcurements) : 0;

  const columns = useMemo(() => [
    { 
      header: 'ID', 
      accessor: 'id',
      cell: (row) => <span className="font-mono text-sm text-gray-600">#{String(row.id).padStart(4, '0')}</span>
    },
    { header: 'Supplier', accessor: 'supplier_name' },
    { 
      header: 'Qty In (kg)', 
      accessor: 'quantity_kg',
      cell: (row) => <span className="font-semibold text-green-600">{parseFloat(row.quantity_kg).toLocaleString()}</span>
    },
    { 
      header: 'Qty Out (kg)', 
      accessor: 'quantity_out',
      cell: (row) => <span className="font-semibold text-red-600">{parseFloat(row.quantity_out || 0).toLocaleString()}</span>
    },
    { 
      header: 'Price/kg', 
      accessor: 'price_per_kg',
      cell: (row) => <span className="text-gray-700">₱{parseFloat(row.price_per_kg).toLocaleString()}</span>
    },
    { 
      header: 'Total Cost', 
      accessor: 'total_cost',
      cell: (row) => <span className="font-semibold text-button-600">₱{parseFloat(row.total_cost).toLocaleString()}</span>
    },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleView(row); }}
          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
          title="View"
        >
          <Eye size={15} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
          className="p-1.5 rounded-md hover:bg-button-50 text-button-500 hover:text-button-700 transition-colors"
          title="Edit"
        >
          <Edit size={15} />
        </button>
        {row.status !== 'Cancelled' && (
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (parseFloat(row.quantity_out || 0) === 0) {
                handleCancel(row); 
              }
            }}
            disabled={parseFloat(row.quantity_out || 0) > 0}
            className={`p-1.5 rounded-md transition-colors ${
              parseFloat(row.quantity_out || 0) > 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-orange-50 text-orange-500 hover:text-orange-700'
            }`}
            title={parseFloat(row.quantity_out || 0) > 0 ? 'Cannot cancel - already used in processing' : 'Cancel'}
          >
            <Ban size={15} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
      </div>
    )},
  ], [handleView, handleEdit, handleCancel, handleDelete]);

  return (
    <div>
      <PageHeader 
        title="Procurement" 
        description="Manage purchase orders and supplier transactions" 
        icon={ShoppingCart}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards - Show data immediately, skeleton only on true first load */}
      {loading && procurements.length === 0 ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Procurements" value={totalProcurements} unit="records" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Pending" value={pendingOrders} unit="orders" icon={Clock} iconBgColor="bg-gradient-to-br from-yellow-400 to-yellow-600" />
          <StatsCard label="Completed" value={completedOrders} unit="orders" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Total Value" value={`₱${totalCost.toLocaleString()}`} unit="invested" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
        </div>
      )}

      {/* Charts */}
      {loading && procurements.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 h-[340px] animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/4 mb-6"></div>
            <div className="h-[240px] bg-gray-100 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-[162px] animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-[100px] bg-gray-100 rounded-full mx-auto w-[100px]"></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-[162px] animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-[100px] bg-gray-100 rounded-full mx-auto w-[100px]"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <LineChart 
              title="Procurement Trends" 
              subtitle="Purchase order activity overview" 
              data={chartData} 
              lines={[{ dataKey: 'value', name: 'Value (₱)' }]} 
              height={280} 
              yAxisUnit="₱"
              tabs={[
                { label: 'Daily', value: 'daily' }, 
                { label: 'Monthly', value: 'monthly' }, 
                { label: 'Yearly', value: 'yearly' }
              ]} 
              activeTab={chartPeriod} 
              onTabChange={setChartPeriod} 
              summaryStats={[
                { label: 'Total Orders', value: totalProcurements.toString(), color: 'text-primary-600' }, 
                { label: 'Avg Order Value', value: `₱${avgOrderValue.toLocaleString()}`, color: 'text-primary-600' }, 
                { label: 'Total Qty', value: `${totalQuantity.toLocaleString()} kg`, color: 'text-green-600' }
              ]} 
            />
          </div>
          <div className="space-y-4">
            <DonutChart 
              title="Top 5 Suppliers" 
              data={supplierBreakdown} 
              centerValue={`${supplierBreakdown.length}`} 
              centerLabel="Suppliers" 
              height={175} 
              innerRadius={56} 
              outerRadius={78} 
              showLegend={true} 
              horizontalLegend={true}
            />
            <DonutChart 
              title="Qty In vs Out" 
              data={quantityComparison} 
              centerValue={`${Math.round((totalQuantity - totalQuantityOut)).toLocaleString()}`} 
              centerLabel="Available" 
              height={140} 
              innerRadius={45} 
              outerRadius={62} 
              showLegend={true} 
              horizontalLegend={true}
            />
          </div>
        </div>
      )}

      {/* Table - Show data immediately, skeleton only on true first load */}
      {loading && procurements.length === 0 ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <DataTable 
          title="Procurement Records" 
          subtitle="Manage all procurement transactions" 
          columns={columns} 
          data={procurements} 
          searchPlaceholder="Search procurements..." 
          filterField="status" 
          filterPlaceholder="All Status" 
          onAdd={handleAdd} 
          addLabel="Add Procurement"
          onRowClick={handleView}
        />
      )}

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Procurement Details" 
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
              Edit Procurement
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
              {/* ID & Status */}
              <div className="bg-gradient-to-r from-primary-50 to-button-50 p-3 rounded-lg border-2 border-primary-200">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-button-500 text-white rounded-lg">
                    <Package size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">Procurement #{String(selectedItem.id).padStart(4, '0')}</h3>
                    <p className="text-xs text-gray-600">Record ID</p>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              {/* Supplier */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Building2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Supplier</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.supplier_name}</p>
                </div>
              </div>

              {/* Total Cost */}
              <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-button-50 to-primary-50 rounded-lg border-2 border-button-200">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Total Cost</p>
                  <p className="text-xl font-bold text-button-600">₱{parseFloat(selectedItem.total_cost).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Quantity Info */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <Scale size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Quantity In</p>
                    <p className="font-semibold text-gray-800 text-sm">{parseFloat(selectedItem.quantity_kg).toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                    <Boxes size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Quantity Out</p>
                    <p className="font-semibold text-gray-800 text-sm">{parseFloat(selectedItem.quantity_out || 0).toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Remaining</p>
                    <p className="font-semibold text-purple-600 text-sm">{parseFloat(selectedItem.remaining_quantity || selectedItem.quantity_kg).toLocaleString()} kg</p>
                  </div>
                </div>
              </div>

              {/* Price per KG */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Price per KG</p>
                  <p className="font-semibold text-gray-800 text-sm">₱{parseFloat(selectedItem.price_per_kg).toLocaleString()}</p>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-0.5">Description</p>
                    <p className="text-gray-800 text-sm">{selectedItem.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <FormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddSubmit} 
        title="Add Procurement" 
        submitText="Add Procurement" 
        size="lg"
        loading={saving}
      >
        {({ submitted }) => (
          <>
            <SupplierCombobox 
              value={formData.supplier_id}
              newName={formData.new_supplier_name}
              onChange={handleFormChange}
              onInputChange={(e) => handleSupplierInput(e)}
              error={errors.supplier_id?.[0] || errors.new_supplier_name?.[0]}
              submitted={submitted}
              supplierOptions={supplierOptions}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormInput 
                label="Quantity (kg)" 
                name="quantity_kg" 
                type="number" 
                value={formData.quantity_kg} 
                onChange={handleFormChange} 
                required 
                placeholder="0" 
                submitted={submitted} 
                error={errors.quantity_kg?.[0]}
                step="0.01"
              />
              <FormInput 
                label="Price per KG (₱)" 
                name="price_per_kg" 
                type="number" 
                value={formData.price_per_kg} 
                onChange={handleFormChange} 
                required 
                placeholder="0.00" 
                submitted={submitted} 
                error={errors.price_per_kg?.[0]}
                step="0.01"
              />
            </div>

            {/* Calculated Total */}
            {(formData.quantity_kg && formData.price_per_kg) && (
              <div className="p-3 bg-button-50 border border-button-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Total:</span>
                  <span className="text-lg font-bold text-button-600">₱{calculatedTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            <FormInput 
              label="Description" 
              name="description" 
              value={formData.description} 
              onChange={handleFormChange} 
              placeholder="Add notes about this procurement (optional)" 
              submitted={submitted} 
              error={errors.description?.[0]}
            />
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSubmit={handleEditSubmit} 
        title="Edit Procurement" 
        submitText="Save Changes" 
        size="lg"
        loading={saving}
      >
        {({ submitted }) => (
          <>
            <FormSelect 
              label="Supplier" 
              name="supplier_id" 
              value={formData.supplier_id} 
              onChange={handleFormChange} 
              options={supplierOptions.filter(opt => opt.value !== '')} 
              required 
              submitted={submitted} 
              error={errors.supplier_id?.[0]} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormInput 
                label="Quantity (kg)" 
                name="quantity_kg" 
                type="number" 
                value={formData.quantity_kg} 
                onChange={handleFormChange} 
                required 
                placeholder="0" 
                submitted={submitted} 
                error={errors.quantity_kg?.[0]}
                step="0.01"
              />
              <FormInput 
                label="Price per KG (₱)" 
                name="price_per_kg" 
                type="number" 
                value={formData.price_per_kg} 
                onChange={handleFormChange} 
                required 
                placeholder="0.00" 
                submitted={submitted} 
                error={errors.price_per_kg?.[0]}
                step="0.01"
              />
            </div>

            {/* Calculated Total */}
            {(formData.quantity_kg && formData.price_per_kg) && (
              <div className="p-3 bg-button-50 border border-button-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Total:</span>
                  <span className="text-lg font-bold text-button-600">₱{calculatedTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            <FormInput 
              label="Description" 
              name="description" 
              value={formData.description} 
              onChange={handleFormChange} 
              placeholder="Add notes about this procurement (optional)" 
              submitted={submitted} 
              error={errors.description?.[0]}
            />
          </>
        )}
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteConfirm} 
        title="Remove Procurement" 
        message={`Are you sure you want to remove this procurement record from ${selectedItem?.supplier_name}? The record will be soft deleted and hidden from the list.`} 
        confirmText="Remove" 
        variant="danger" 
        icon={Trash2}
        loading={saving}
      />

      {/* New Supplier Confirmation Modal */}
      <ConfirmModal 
        isOpen={isNewSupplierConfirmOpen} 
        onClose={handleNewSupplierCancel} 
        onConfirm={handleNewSupplierConfirm} 
        title="Create New Supplier" 
        message={`You are about to create a new supplier "${formData.new_supplier_name}". This will add them to your suppliers list. Do you want to continue?`} 
        confirmText="Yes, Create Supplier" 
        cancelText="Cancel"
        variant="primary" 
        icon={PlusCircle}
        loading={saving}
      />
    </div>
  );
};

export default Procurement;
