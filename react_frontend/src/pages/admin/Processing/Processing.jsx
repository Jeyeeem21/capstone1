import { useState, useCallback, useMemo } from 'react';
import { Settings2, Package, CheckCircle, TrendingUp, FileText, Trash2, Eye, Calendar, Hash, Scale, Activity, Play, User, Percent, Layers, RotateCcw, ArrowDown } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, useToast, Modal, Button, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';

const CACHE_KEY = '/processings';
const ACTIVE_CACHE_KEY = '/processings/active';
const COMPLETED_CACHE_KEY = '/processings/completed';
const PROCUREMENTS_CACHE_KEY = '/procurements';

const Processing = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ 
    procurement_id: '', 
    input_kg: '', 
    operator_name: '', 
    processing_date: new Date().toISOString().split('T')[0]
  });
  const [completeFormData, setCompleteFormData] = useState({
    output_kg: '',
    husk_kg: 0,
    yield_percent: 0
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Super-fast data fetching with cache - parallel fetches
  const { 
    data: activeProcessings, 
    loading: loadingActive, 
    isRefreshing: refreshingActive,
    refetch: refetchActive,
  } = useDataFetch('/processings/active', {
    cacheKey: ACTIVE_CACHE_KEY,
    initialData: [],
  });

  const { 
    data: completedProcessings, 
    loading: loadingCompleted, 
    isRefreshing: refreshingCompleted,
    refetch: refetchCompleted,
  } = useDataFetch('/processings/completed', {
    cacheKey: COMPLETED_CACHE_KEY,
    initialData: [],
  });

  // Fetch procurements for dropdown (lightweight)
  const { data: procurements, refetch: refetchProcurements } = useDataFetch('/procurements', {
    cacheKey: PROCUREMENTS_CACHE_KEY,
    initialData: [],
  });

  // Derived states - show data immediately, only show skeleton on true first load
  const loading = loadingActive && activeProcessings.length === 0 && loadingCompleted && completedProcessings.length === 0;
  const isRefreshing = refreshingActive || refreshingCompleted;
  
  // Combine all records for stats - memoized
  const allProcessings = useMemo(() => [...activeProcessings, ...completedProcessings], [activeProcessings, completedProcessings]);

  // Convert procurements to options - memoized
  // When editing, include the current procurement even if remaining is 0
  const procurementOptions = useMemo(() => {
    const currentProcurementId = selectedItem?.procurement_id ? String(selectedItem.procurement_id) : null;
    const currentInputKg = selectedItem?.input_kg ? parseFloat(selectedItem.input_kg) : 0;
    
    const options = procurements
      .filter(p => {
        const remaining = parseFloat(p.quantity_kg) - parseFloat(p.quantity_out || 0);
        // Include if has remaining OR if it's the currently selected procurement (for editing)
        return remaining > 0 || String(p.id) === currentProcurementId;
      })
      .map(p => {
        let remaining = parseFloat(p.quantity_kg) - parseFloat(p.quantity_out || 0);
        // If editing and this is the current procurement, add back the input_kg to show correct available
        if (String(p.id) === currentProcurementId && isEditModalOpen) {
          remaining += currentInputKg;
        }
        return { 
          value: String(p.id), 
          label: `#${String(p.id).padStart(4, '0')} - ${p.supplier_name} (${remaining.toLocaleString()} kg available)` 
        };
      });
    return [{ value: '', label: 'None (Manual input)' }, ...options];
  }, [procurements, selectedItem, isEditModalOpen]);

  // Fast invalidate and parallel refetch - includes procurements for qty_out sync
  const invalidateAndRefetch = useCallback(async () => {
    invalidateCache(CACHE_KEY);
    invalidateCache(ACTIVE_CACHE_KEY);
    invalidateCache(COMPLETED_CACHE_KEY);
    invalidateCache(PROCUREMENTS_CACHE_KEY);
    await Promise.all([refetchActive(), refetchCompleted(), refetchProcurements()]);
  }, [refetchActive, refetchCompleted, refetchProcurements]);

  const handleView = useCallback((item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setFormData({ 
      procurement_id: '', 
      input_kg: '', 
      operator_name: '', 
      processing_date: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    refetchProcurements(); // Refresh procurement list
    setIsAddModalOpen(true);
  }, [refetchProcurements]);

  const handleEdit = useCallback((item) => {
    // Only allow editing Pending items
    if (item.status !== 'Pending') {
      toast.warning('Cannot Edit', 'Only pending records can be edited.');
      return;
    }
    setSelectedItem(item);
    setFormData({ 
      procurement_id: item.procurement_id ? String(item.procurement_id) : '', 
      input_kg: String(item.input_kg), 
      operator_name: item.operator_name || '', 
      processing_date: item.processing_date || new Date().toISOString().split('T')[0]
    });
    setErrors({});
    refetchProcurements(); // Refresh procurement list for edit
    setIsEditModalOpen(true);
  }, [toast, refetchProcurements]);

  const handleDelete = useCallback((item) => {
    // Only allow deleting Pending items
    if (item.status !== 'Pending') {
      toast.warning('Cannot Delete', 'Only pending records can be deleted.');
      return;
    }
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, [toast]);

  // Start processing action - optimized
  const handleStartProcessing = useCallback(async (item) => {
    if (item.status !== 'Pending') {
      toast.warning('Cannot Start', 'Only pending records can be started.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post(`/processings/${item.id}/process`);
      
      if (response.success) {
        await invalidateAndRefetch();
        toast.success('Processing Started', `Record #${String(item.id).padStart(4, '0')} is now being processed.`);
      } else {
        throw new Error(response.message || 'Failed to start processing');
      }
    } catch (error) {
      console.error('Error starting processing:', error);
      toast.error('Error', error.message || 'Failed to start processing');
    } finally {
      setSaving(false);
    }
  }, [toast, invalidateAndRefetch]);

  // Open complete modal
  const handleOpenCompleteModal = useCallback((item) => {
    if (item.status !== 'Processing') {
      toast.warning('Cannot Complete', 'Only processing records can be completed.');
      return;
    }
    setSelectedItem(item);
    setCompleteFormData({
      output_kg: '',
      husk_kg: 0,
      yield_percent: 0
    });
    setIsCompleteModalOpen(true);
  }, [toast]);

  // Open return to processing confirmation modal
  const handleReturnToProcessing = useCallback((item) => {
    if (item.status !== 'Completed') {
      toast.warning('Cannot Return', 'Only completed batches can be returned to processing.');
      return;
    }

    if (parseFloat(item.stock_out || 0) > 0) {
      toast.warning('Cannot Return', 'Cannot return to processing: stock has already been distributed.');
      return;
    }

    setSelectedItem(item);
    setIsReturnModalOpen(true);
  }, [toast]);

  // Confirm return to processing - close modal first, then refetch and toast together
  const handleReturnConfirm = useCallback(async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      const response = await apiClient.post(`/processings/${selectedItem.id}/return-to-processing`);
      
      if (response.success) {
        const recordId = selectedItem.id;
        // Close modal first
        setIsReturnModalOpen(false);
        // Refetch and toast together
        invalidateAndRefetch().then(() => {
          toast.success('Returned to Processing', `Record #${String(recordId).padStart(4, '0')} has been returned to processing.`);
        });
        return;
      } else {
        throw new Error(response.message || 'Failed to return to processing');
      }
    } catch (error) {
      console.error('Error returning to processing:', error);
      toast.error('Error', error.message || 'Failed to return to processing');
    } finally {
      setSaving(false);
    }
  }, [selectedItem, invalidateAndRefetch, toast, saving]);

  // Calculate husk and yield when output changes
  const handleCompleteFormChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if (name === 'output_kg') {
      const outputKg = parseFloat(value) || 0;
      const inputKg = selectedItem?.input_kg || 0;
      const huskKg = Math.max(0, inputKg - outputKg);
      const yieldPercent = inputKg > 0 ? ((outputKg / inputKg) * 100).toFixed(2) : 0;
      
      setCompleteFormData({
        output_kg: value,
        husk_kg: huskKg,
        yield_percent: yieldPercent
      });
    }
  }, [selectedItem]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Submit add form - close modal first, then refetch and toast together
  const handleAddSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const submitData = {
        procurement_id: formData.procurement_id || null,
        input_kg: parseFloat(formData.input_kg),
        operator_name: formData.operator_name || null,
        processing_date: formData.processing_date || null,
      };

      const response = await apiClient.post('/processings', submitData);
      
      if (response.success && response.data) {
        // Close modal first
        setIsAddModalOpen(false);
        // Refetch and toast together
        invalidateAndRefetch().then(() => {
          toast.success('Processing Created', 'New processing record has been created.');
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error creating processing:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        toast.error('Validation Error', 'Please fix the highlighted fields.');
        throw error;
      } else {
        toast.error('Error', error.message || 'Failed to create processing');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  // Submit edit form - close modal first, then refetch and toast together
  const handleEditSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const submitData = {
        procurement_id: formData.procurement_id || null,
        input_kg: parseFloat(formData.input_kg),
        operator_name: formData.operator_name || null,
        processing_date: formData.processing_date || null,
      };

      const response = await apiClient.put(`/processings/${selectedItem.id}`, submitData);
      
      if (response.success && response.data) {
        // Close modal first
        setIsEditModalOpen(false);
        // Refetch and toast together
        invalidateAndRefetch().then(() => {
          toast.success('Processing Updated', 'Processing record has been updated.');
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error updating processing:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        toast.error('Validation Error', 'Please fix the highlighted fields.');
        throw error;
      } else {
        toast.error('Error', error.message || 'Failed to update processing');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  // Submit complete form - close modal first, then refetch and toast together
  const handleCompleteSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      const response = await apiClient.post(`/processings/${selectedItem.id}/complete`, {
        output_kg: parseFloat(completeFormData.output_kg)
      });
      
      if (response.success && response.data) {
        const recordId = selectedItem.id;
        // Close modal first
        setIsCompleteModalOpen(false);
        // Refetch and toast together
        invalidateAndRefetch().then(() => {
          toast.success('Processing Completed', `Record #${String(recordId).padStart(4, '0')} has been completed.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error completing processing:', error);
      toast.error('Error', error.message || 'Failed to complete processing');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Delete handler - close modal first, then refetch and toast together
  const handleDeleteConfirm = useCallback(async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      const response = await apiClient.delete(`/processings/${selectedItem.id}`);
      
      if (response.success) {
        // Close modal first
        setIsDeleteModalOpen(false);
        // Refetch and toast together
        invalidateAndRefetch().then(() => {
          toast.success('Processing Deleted', 'Processing record has been removed.');
        });
        return;
      } else {
        throw new Error(response.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting processing:', error);
      toast.error('Error', 'Failed to delete processing');
    } finally {
      setSaving(false);
    }
  }, [selectedItem, invalidateAndRefetch, toast, saving]);

  // Memoized stats calculations
  const stats = useMemo(() => {
    const totalRecords = allProcessings.length;
    const pendingCount = activeProcessings.filter(p => p.status === 'Pending').length;
    const processingCount = activeProcessings.filter(p => p.status === 'Processing').length;
    const completedCount = completedProcessings.length;
    const totalInput = allProcessings.reduce((sum, p) => sum + parseFloat(p.input_kg || 0), 0);
    const totalOutput = completedProcessings.reduce((sum, p) => sum + parseFloat(p.output_kg || 0), 0);
    const totalHusk = completedProcessings.reduce((sum, p) => sum + parseFloat(p.husk_kg || 0), 0);
    const avgYield = completedCount > 0 
      ? (completedProcessings.reduce((sum, p) => sum + parseFloat(p.yield_percent || 0), 0) / completedCount).toFixed(2)
      : 0;
    
    return { totalRecords, pendingCount, processingCount, completedCount, totalInput, totalOutput, totalHusk, avgYield };
  }, [allProcessings, activeProcessings, completedProcessings]);

  // Helper function to get days in a month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Chart data based on chartPeriod
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (chartPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const dayGroups = {};
      
      allProcessings.forEach(p => {
        if (!p.processing_date) return;
        const date = new Date(p.processing_date);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) {
            dayGroups[day] = { input: 0, output: 0 };
          }
          dayGroups[day].input += parseFloat(p.input_kg || 0);
          if (p.output_kg) {
            dayGroups[day].output += parseFloat(p.output_kg);
          }
        }
      });

      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        input: dayGroups[i + 1]?.input || 0,
        output: dayGroups[i + 1]?.output || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthGroups = {};
      
      allProcessings.forEach(p => {
        if (!p.processing_date) return;
        const date = new Date(p.processing_date);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) {
            monthGroups[month] = { input: 0, output: 0 };
          }
          monthGroups[month].input += parseFloat(p.input_kg || 0);
          if (p.output_kg) {
            monthGroups[month].output += parseFloat(p.output_kg);
          }
        }
      });

      return months.map((name, i) => ({
        name,
        input: monthGroups[i]?.input || 0,
        output: monthGroups[i]?.output || 0,
      }));
    } else {
      const years = [];
      for (let i = 5; i >= 0; i--) {
        years.push(currentYear - i);
      }
      
      const yearGroups = {};
      allProcessings.forEach(p => {
        if (!p.processing_date) return;
        const date = new Date(p.processing_date);
        const year = date.getFullYear();
        if (!yearGroups[year]) {
          yearGroups[year] = { input: 0, output: 0 };
        }
        yearGroups[year].input += parseFloat(p.input_kg || 0);
        if (p.output_kg) {
          yearGroups[year].output += parseFloat(p.output_kg);
        }
      });

      return years.map(year => ({
        name: year.toString(),
        input: yearGroups[year]?.input || 0,
        output: yearGroups[year]?.output || 0,
      }));
    }
  }, [allProcessings, chartPeriod]);

  // Average daily output
  const avgPerDay = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    const monthOutput = completedProcessings.filter(p => {
      if (!p.completed_date) return false;
      const date = new Date(p.completed_date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).reduce((sum, p) => sum + parseFloat(p.output_kg || 0), 0);
    
    return Math.floor(monthOutput / daysInMonth);
  }, [completedProcessings]);

  // Donut charts data - using stats object
  const outputBreakdown = useMemo(() => {
    if (stats.totalOutput === 0 && stats.totalHusk === 0) {
      return [
        { name: 'Milled Rice', value: 0, color: '#22c55e' },
        { name: 'Husk', value: 0, color: '#ef4444' },
      ];
    }
    return [
      { name: 'Milled Rice', value: Math.round(stats.totalOutput), color: '#22c55e' },
      { name: 'Husk', value: Math.round(stats.totalHusk), color: '#ef4444' },
    ];
  }, [stats.totalOutput, stats.totalHusk]);

  const statusBreakdown = useMemo(() => {
    return [
      { name: 'Pending', value: stats.pendingCount, color: '#eab308' },
      { name: 'Processing', value: stats.processingCount, color: '#3b82f6' },
      { name: 'Completed', value: stats.completedCount, color: '#22c55e' },
    ].filter(item => item.value > 0);
  }, [stats.pendingCount, stats.processingCount, stats.completedCount]);

  // Active records columns (Pending + Processing)
  const activeColumns = useMemo(() => [
    { 
      header: 'ID', 
      accessor: 'id',
      cell: (row) => <span className="font-mono text-sm text-gray-600">#{String(row.id).padStart(4, '0')}</span>
    },
    { 
      header: 'Procurement', 
      accessor: 'procurement_info',
      cell: (row) => row.procurement_info ? (
        <span className="text-sm">
          #{String(row.procurement_id).padStart(4, '0')} - {row.procurement_info.supplier_name}
        </span>
      ) : <span className="text-gray-400 text-sm">Manual input</span>
    },
    { 
      header: 'Input (kg)', 
      accessor: 'input_kg',
      cell: (row) => <span className="font-semibold text-blue-600">{parseFloat(row.input_kg).toLocaleString()}</span>
    },
    { header: 'Operator', accessor: 'operator_name', cell: (row) => row.operator_name || '-' },
    { header: 'Date', accessor: 'processing_date', cell: (row) => row.processing_date || '-' },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'Pending' && (
          <button
            onClick={() => handleStartProcessing(row)}
            disabled={saving}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Start Processing"
          >
            <Play size={16} />
          </button>
        )}
        {row.status === 'Processing' && (
          <button
            onClick={() => handleOpenCompleteModal(row)}
            disabled={saving}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title="Complete Processing"
          >
            <CheckCircle size={16} />
          </button>
        )}
        <ActionButtons 
          onView={() => handleView(row)} 
          onEdit={row.status === 'Pending' ? () => handleEdit(row) : null} 
          onDelete={row.status === 'Pending' ? () => handleDelete(row) : null} 
        />
      </div>
    )},
  ], [handleView, handleEdit, handleDelete, handleStartProcessing, handleOpenCompleteModal, saving]);

  // Completed records columns
  const completedColumns = useMemo(() => [
    { 
      header: 'ID', 
      accessor: 'id',
      cell: (row) => <span className="font-mono text-sm text-gray-600">#{String(row.id).padStart(4, '0')}</span>
    },
    { 
      header: 'Procurement', 
      accessor: 'procurement_info',
      cell: (row) => row.procurement_info ? (
        <span className="text-sm">
          #{String(row.procurement_id).padStart(4, '0')} - {row.procurement_info.supplier_name}
        </span>
      ) : <span className="text-gray-400 text-sm">Manual input</span>
    },
    { 
      header: 'Input (kg)', 
      accessor: 'input_kg',
      cell: (row) => <span className="font-semibold text-blue-600">{parseFloat(row.input_kg).toLocaleString()}</span>
    },
    { 
      header: 'Output (kg)', 
      accessor: 'output_kg',
      cell: (row) => <span className="font-semibold text-green-600">{parseFloat(row.output_kg).toLocaleString()}</span>
    },
    { 
      header: 'Stock Out (kg)', 
      accessor: 'stock_out',
      cell: (row) => <span className="font-semibold text-indigo-600">{parseFloat(row.stock_out || 0).toLocaleString()}</span>
    },
    { 
      header: 'Husk (kg)', 
      accessor: 'husk_kg',
      cell: (row) => <span className="font-semibold text-orange-600">{parseFloat(row.husk_kg).toLocaleString()}</span>
    },
    { 
      header: 'Yield', 
      accessor: 'yield_percent',
      cell: (row) => <span className="font-semibold text-purple-600">{parseFloat(row.yield_percent).toFixed(1)}%</span>
    },
    { 
      header: 'Stock Status', 
      accessor: 'stock_status', 
      cell: (row) => <StatusBadge status={row.stock_status} />
    },
    { header: 'Completed', accessor: 'completed_date', cell: (row) => row.completed_date || '-' },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <div className="flex items-center gap-1">
        {row.stock_status === 'Pending' && (
          <button
            onClick={() => handleReturnToProcessing(row)}
            disabled={saving}
            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
            title="Return to Processing"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <ActionButtons onView={() => handleView(row)} />
      </div>
    )},
  ], [handleView, handleReturnToProcessing, saving]);

  // View Detail Item component
  const ViewDetailItem = ({ icon: Icon, label, value, iconColor = 'text-primary-500', compact = false }) => (
    <div className={`flex items-start gap-2 ${compact ? 'p-2' : 'p-4'} bg-primary-50/30 rounded-xl border-2 border-primary-200`}>
      <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-white shadow-sm ${iconColor}`}>
        <Icon size={compact ? 14 : 18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 uppercase tracking-wide truncate`}>{label}</p>
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-800 mt-0.5 truncate`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title="Processing" 
        description="Track and manage rice processing operations" 
        icon={Settings2}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards - Show data immediately, skeleton only on true first load */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Input" value={stats.totalInput.toLocaleString()} unit="kg palay" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Total Output" value={stats.totalOutput.toLocaleString()} unit="kg rice" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Average Yield" value={stats.avgYield} unit="%" icon={TrendingUp} iconBgColor="bg-gradient-to-br from-purple-400 to-purple-600" />
          <StatsCard label="Total Records" value={stats.totalRecords} unit="entries" icon={FileText} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
        </div>
      )}

      {/* Charts - Show data immediately */}
      {loading ? (
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
          <div className="lg:col-span-2 outline-none [&_*]:outline-none">
            <LineChart 
              title="Processing Trends" 
              subtitle="Production performance overview" 
              data={chartData} 
              lines={[{ dataKey: 'input', name: 'Input (kg)', dashed: true }, { dataKey: 'output', name: 'Output (kg)' }]} 
              height={280} 
              tabs={[{ label: 'Daily', value: 'daily' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }]} 
              activeTab={chartPeriod} 
              onTabChange={setChartPeriod} 
              summaryStats={[
                { label: 'Total Output', value: `${stats.totalOutput.toLocaleString()} kg`, color: 'text-primary-600' }, 
                { label: 'Avg per Day', value: `${avgPerDay.toLocaleString()} kg`, color: 'text-primary-600' }, 
                { label: 'Yield', value: `${stats.avgYield}%`, color: 'text-green-600' }
              ]} 
            />
          </div>
          <div className="flex flex-col gap-4 outline-none [&_*]:outline-none">
            <DonutChart 
              title="Output Breakdown" 
              subtitle="Rice vs Husk distribution" 
              data={outputBreakdown} 
              centerValue={`${stats.totalOutput.toLocaleString()} kg`} 
              centerLabel="Total Output" 
              height={115}
              showLegend={true}
              horizontalLegend={true}
            />
            <DonutChart 
              title="Status Distribution" 
              subtitle="Processing status overview" 
              data={statusBreakdown} 
              centerValue={stats.totalRecords.toString()} 
              centerLabel="Total Records" 
              height={92}
              showLegend={true}
              horizontalLegend={true}
            />
          </div>
        </div>
      )}

      {/* Active Processing Records Table (Pending + Processing) - Show immediately */}
      {loading ? (
        <SkeletonTable className="mb-6" />
      ) : (
        <div className="mb-6">
          <DataTable 
            title="Processing Records"
            subtitle="Pending and active processing batches"
            columns={activeColumns} 
            data={activeProcessings} 
            searchPlaceholder="Search records..." 
            filterField="status" 
            filterPlaceholder="All Status"
            onAdd={handleAdd}
            addLabel="New Processing"
            onRowDoubleClick={handleView}
          />
        </div>
      )}

      {/* Completed Records Table - Show immediately */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <DataTable 
          title="Completed Records"
          subtitle="Finished processing batches with results"
          columns={completedColumns} 
          data={completedProcessings} 
          searchPlaceholder="Search completed..." 
          onRowDoubleClick={handleView}
        />
      )}

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Processing Details" size="2xl">
        {selectedItem && (
          <div className="space-y-3">
            {/* Header with Status - Compact */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Processing #{String(selectedItem.id).padStart(4, '0')}</h3>
                <p className="text-xs text-gray-500">
                  {selectedItem.procurement_info 
                    ? `Linked to Procurement #${String(selectedItem.procurement_id).padStart(4, '0')}` 
                    : 'Manual input record'}
                </p>
              </div>
              <StatusBadge status={selectedItem.status} />
            </div>

            {/* Details Grid - More Compact */}
            <div className="grid grid-cols-3 gap-2">
              <ViewDetailItem icon={Hash} label="Record ID" value={`#${String(selectedItem.id).padStart(4, '0')}`} compact />
              <ViewDetailItem icon={Calendar} label="Processing Date" value={selectedItem.processing_date || 'Not set'} iconColor="text-blue-500" compact />
              <ViewDetailItem icon={Scale} label="Input (kg)" value={`${parseFloat(selectedItem.input_kg).toLocaleString()} kg`} iconColor="text-blue-500" compact />
              <ViewDetailItem icon={User} label="Operator" value={selectedItem.operator_name || 'Not assigned'} iconColor="text-purple-500" compact />
              
              {selectedItem.procurement_info && (
                <>
                  <ViewDetailItem icon={Package} label="Supplier" value={selectedItem.procurement_info.supplier_name} iconColor="text-orange-500" compact />
                  <ViewDetailItem icon={Layers} label="Proc. Remaining" value={`${parseFloat(selectedItem.procurement_info.remaining_kg).toLocaleString()} kg`} iconColor="text-gray-500" compact />
                </>
              )}
              
              {selectedItem.status === 'Completed' && (
                <>
                  <ViewDetailItem icon={CheckCircle} label="Output (kg)" value={`${parseFloat(selectedItem.output_kg).toLocaleString()} kg`} iconColor="text-green-500" compact />
                  <ViewDetailItem icon={ArrowDown} label="Stock Out" value={`${parseFloat(selectedItem.stock_out || 0).toLocaleString()} kg`} iconColor="text-indigo-500" compact />
                  <ViewDetailItem icon={Package} label="Husk (kg)" value={`${parseFloat(selectedItem.husk_kg).toLocaleString()} kg`} iconColor="text-orange-500" compact />
                  <ViewDetailItem icon={Percent} label="Yield" value={`${parseFloat(selectedItem.yield_percent).toFixed(1)}%`} iconColor="text-purple-500" compact />
                  <ViewDetailItem icon={Activity} label="Stock Status" value={selectedItem.stock_status} iconColor="text-blue-500" compact />
                  <ViewDetailItem icon={Calendar} label="Completed" value={selectedItem.completed_date || '-'} iconColor="text-green-500" compact />
                </>
              )}
            </div>

            {/* Yield Summary for Completed - Compact */}
            {selectedItem.status === 'Completed' && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">Processing Yield</span>
                  <span className="text-lg font-bold text-green-600">
                    {parseFloat(selectedItem.yield_percent).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-xs">
                  <span className="text-gray-600">Input: <strong>{parseFloat(selectedItem.input_kg).toLocaleString()} kg</strong></span>
                  <span className="text-gray-600">→ Rice: <strong className="text-green-600">{parseFloat(selectedItem.output_kg).toLocaleString()} kg</strong></span>
                  <span className="text-gray-600">+ Husk: <strong className="text-orange-600">{parseFloat(selectedItem.husk_kg).toLocaleString()} kg</strong></span>
                </div>
              </div>
            )}

            {/* Action Buttons - Compact */}
            <div className="flex gap-3 pt-3 border-t-2 border-primary-200">
              {selectedItem.status === 'Pending' && (
                <Button variant="outline" onClick={() => { setIsViewModalOpen(false); handleEdit(selectedItem); }} className="flex-1">
                  Edit Record
                </Button>
              )}
              {selectedItem.status === 'Completed' && selectedItem.stock_status === 'Pending' && (
                <Button 
                  variant="outline" 
                  onClick={() => { setIsViewModalOpen(false); handleReturnToProcessing(selectedItem); }} 
                  className="flex-1"
                  disabled={saving}
                >
                  <RotateCcw size={16} className="mr-2" />
                  Return to Processing
                </Button>
              )}
              <Button onClick={() => setIsViewModalOpen(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete Processing Modal */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Complete Processing" size="md">
        {selectedItem && (
          <div className="space-y-4">
            {/* Info Header */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Processing #{String(selectedItem.id).padStart(4, '0')}</strong>
                {selectedItem.procurement_info && (
                  <span> - From {selectedItem.procurement_info.supplier_name}</span>
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Input: <strong>{parseFloat(selectedItem.input_kg).toLocaleString()} kg</strong>
              </p>
            </div>

            {/* Output Input */}
            <FormInput 
              label="Output Quantity (kg)" 
              name="output_kg" 
              type="number" 
              value={completeFormData.output_kg} 
              onChange={handleCompleteFormChange} 
              required 
              placeholder="Enter milled rice output"
              hint="Enter the amount of milled rice produced"
            />

            {/* Auto-calculated fields */}
            {completeFormData.output_kg && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-xs text-orange-600 uppercase font-medium">Husk (Auto-calculated)</p>
                  <p className="text-lg font-bold text-orange-700">{completeFormData.husk_kg.toLocaleString()} kg</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-xs text-purple-600 uppercase font-medium">Yield (Auto-calculated)</p>
                  <p className="text-lg font-bold text-purple-700">{completeFormData.yield_percent}%</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)} className="flex-1" disabled={saving}>
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteSubmit} 
                className="flex-1" 
                disabled={saving || !completeFormData.output_kg}
                loading={saving}
              >
                Complete Processing
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <FormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddSubmit} 
        title="Create Processing Record" 
        submitText="Create Record" 
        size="lg"
        loading={saving}
      >
        <FormSelect 
          label="Procurement Source" 
          name="procurement_id" 
          value={formData.procurement_id} 
          onChange={handleFormChange} 
          options={procurementOptions} 
          hint="Optional - Link to a procurement record or leave empty for manual input"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput 
            label="Input Quantity (kg)" 
            name="input_kg" 
            type="number" 
            value={formData.input_kg} 
            onChange={handleFormChange} 
            required 
            placeholder="0"
            error={errors.input_kg}
          />
          <FormInput 
            label="Processing Date" 
            name="processing_date" 
            type="date" 
            value={formData.processing_date} 
            onChange={handleFormChange}
          />
        </div>
        <FormInput 
          label="Operator Name" 
          name="operator_name" 
          value={formData.operator_name} 
          onChange={handleFormChange} 
          placeholder="e.g. Juan Dela Cruz"
          hint="Person responsible for this processing batch"
        />
      </FormModal>

      {/* Edit Modal */}
      <FormModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSubmit={handleEditSubmit} 
        title="Edit Processing Record" 
        submitText="Save Changes" 
        size="lg"
        loading={saving}
      >
        <FormSelect 
          label="Procurement Source" 
          name="procurement_id" 
          value={formData.procurement_id} 
          onChange={handleFormChange} 
          options={procurementOptions} 
          hint="Optional - Link to a procurement record or leave empty for manual input"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput 
            label="Input Quantity (kg)" 
            name="input_kg" 
            type="number" 
            value={formData.input_kg} 
            onChange={handleFormChange} 
            required 
            placeholder="0"
            error={errors.input_kg}
          />
          <FormInput 
            label="Processing Date" 
            name="processing_date" 
            type="date" 
            value={formData.processing_date} 
            onChange={handleFormChange}
          />
        </div>
        <FormInput 
          label="Operator Name" 
          name="operator_name" 
          value={formData.operator_name} 
          onChange={handleFormChange} 
          placeholder="e.g. Juan Dela Cruz"
          hint="Person responsible for this processing batch"
        />
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteConfirm} 
        title="Delete Processing Record" 
        message={`Are you sure you want to delete Processing #${String(selectedItem?.id || 0).padStart(4, '0')}? This action cannot be undone.`} 
        confirmText="Delete" 
        variant="danger" 
        icon={Trash2}
        loading={saving}
      />
      
      {/* Return to Processing Confirmation Modal */}
      <ConfirmModal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        onConfirm={handleReturnConfirm} 
        title="Return to Processing" 
        message={`Are you sure you want to return Processing #${String(selectedItem?.id || 0).padStart(4, '0')} back to processing status? This will clear the output results.`} 
        confirmText="Return to Processing" 
        variant="warning" 
        icon={RotateCcw}
        loading={saving}
      />
    </div>
  );
};

export default Processing;
