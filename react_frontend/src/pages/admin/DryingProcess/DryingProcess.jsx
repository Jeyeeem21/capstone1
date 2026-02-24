import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sun, Package, Clock, CheckCircle, DollarSign, Trash2, Check, PlusCircle, Calendar, Scale, Layers, Filter } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';

const CACHE_KEY = '/drying-processes';
const PROCUREMENTS_CACHE_KEY = '/procurements';
const BATCHES_CACHE_KEY = '/procurement-batches';

const DryingProcess = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [activeChartPoint, setActiveChartPoint] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // kept for add modal reuse
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    procurement_id: '',
    quantity_kg: '',
    sacks: '',
    price: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Batch drying state
  const [dryingSource, setDryingSource] = useState('procurement'); // 'procurement' | 'batch'
  const [batchFormData, setBatchFormData] = useState({ batch_id: '', sacks: '', price: '' });
  const [batchPreview, setBatchPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [batchErrors, setBatchErrors] = useState({});

  // Batch filter state
  const [batchFilter, setBatchFilter] = useState('');

  // Fetch drying processes
  const {
    data: dryingProcesses,
    loading,
    isRefreshing,
    refetch,
  } = useDataFetch('/drying-processes', {
    cacheKey: CACHE_KEY,
    initialData: [],
  });

  // Fetch procurements for add modal dropdown
  const { data: procurements, refetch: refetchProcurements } = useDataFetch('/procurements', {
    cacheKey: PROCUREMENTS_CACHE_KEY,
    initialData: [],
  });

  // Fetch all batches for batch mode
  const { data: allBatches, refetch: refetchBatches } = useDataFetch('/procurement-batches', {
    cacheKey: BATCHES_CACHE_KEY,
    initialData: [],
  });

  // Open + Closed batches are eligible for drying
  const openBatchOptions = useMemo(() => {
    const opts = allBatches
      .filter(b => b.status === 'Open' || b.status === 'Closed')
      .map(b => ({
        value: String(b.id),
        label: `${b.batch_number} — ${b.variety_name || '?'} (${b.remaining_sacks} sacks left)`,
      }));
    return [{ value: '', label: 'Select batch...' }, ...opts];
  }, [allBatches]);

  // Procurement options for dropdown - only Pending with available quantity
  const procurementOptions = useMemo(() => {
    return procurements
      .filter(p => p.status === 'Pending')
      .map(p => ({
        value: String(p.id),
        label: `#${String(p.id).padStart(4, '0')} - ${p.supplier_name} (${parseInt(p.sacks || 0)} sacks / ${parseFloat(p.quantity_kg).toLocaleString()} kg)`,
      }));
  }, [procurements]);

  // Invalidate and refetch all related caches
  const invalidateAndRefetch = useCallback(async () => {
    invalidateCache(CACHE_KEY);
    invalidateCache(PROCUREMENTS_CACHE_KEY);
    invalidateCache(BATCHES_CACHE_KEY);
    await Promise.all([refetch(), refetchProcurements(), refetchBatches()]);
  }, [refetch, refetchProcurements, refetchBatches]);

  // Calculate selected procurement info for auto-fill
  const selectedProcurement = useMemo(() => {
    if (!formData.procurement_id) return null;
    return procurements.find(p => String(p.id) === formData.procurement_id) || null;
  }, [formData.procurement_id, procurements]);

  // Calculated total (for form preview): (sacks × price) × days
  const calculatedTotal = useMemo(() => {
    const sacks = parseInt(formData.sacks) || 0;
    const price = parseFloat(formData.price) || 0;
    const days = selectedItem?.days || 0;
    return (sacks * price) * days;
  }, [formData.sacks, formData.price, selectedItem]);

  // ---- Handlers ----
  const handleAdd = useCallback(() => {
    setFormData({ procurement_id: '', quantity_kg: '', sacks: '', price: '' });
    setBatchFormData({ batch_id: '', sacks: '', price: '' });
    setBatchPreview(null);
    setBatchErrors({});
    setDryingSource('procurement');
    setErrors({});
    refetchProcurements();
    refetchBatches();
    setIsAddModalOpen(true);
  }, [refetchProcurements, refetchBatches]);

  const handleView = useCallback(async (item) => {
    // If batch drying, fetch from show endpoint to get batchProcurements loaded
    if (item.batch_id) {
      try {
        const response = await apiClient.get(`/drying-processes/${item.id}`);
        setSelectedItem(response.data?.data || item);
      } catch {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(item);
    }
    setIsViewModalOpen(true);
  }, []);

  const handleDelete = useCallback((item) => {
    if (item.status !== 'Drying' && item.status !== 'Postponed') {
      toast.warning('Cannot Delete', 'Only records with Drying or Postponed status can be deleted.');
      return;
    }
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, [toast]);

  // Increment day (+1)
  const handleIncrementDay = useCallback(async (item) => {
    if (item.status !== 'Drying') return;
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/drying-processes/${item.id}/increment-day`);
      if (response.success) {
        await invalidateAndRefetch();
        toast.success('Day Added', `Day ${item.days + 1} added. Total: ₱${((parseInt(item.sacks || 0) * parseFloat(item.price)) * (item.days + 1)).toLocaleString()}`);
      } else {
        throw new Error(response.message || 'Failed to increment day');
      }
    } catch (error) {
      console.error('Error incrementing day:', error);
      toast.error('Error', error.message || 'Failed to add day');
    } finally {
      setSaving(false);
    }
  }, [saving, invalidateAndRefetch, toast]);

  // Mark as Dried (✓)
  const handleMarkDried = useCallback(async (item) => {
    if (item.status !== 'Drying') return;
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/drying-processes/${item.id}/mark-dried`);
      if (response.success) {
        await invalidateAndRefetch();
        toast.success('Marked as Dried', `Drying #${String(item.id).padStart(4, '0')} is now dried and ready for processing.`);
      } else {
        throw new Error(response.message || 'Failed to mark as dried');
      }
    } catch (error) {
      console.error('Error marking as dried:', error);
      toast.error('Error', error.message || 'Failed to mark as dried');
    } finally {
      setSaving(false);
    }
  }, [saving, invalidateAndRefetch, toast]);

  // Postpone drying — removed from UI

  const handleBatchFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setBatchFormData(prev => ({ ...prev, [name]: value }));
    setBatchErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    if (name === 'batch_id' || name === 'sacks') setBatchPreview(null);
  }, []);

  // Auto-fetch distribution preview when batch + sacks are both filled
  useEffect(() => {
    const batchId = batchFormData.batch_id;
    const sacks = parseInt(batchFormData.sacks);
    if (!batchId || !sacks || sacks <= 0 || !isAddModalOpen || dryingSource !== 'batch') return;
    let cancelled = false;
    setLoadingPreview(true);
    apiClient.get(`/procurement-batches/${batchId}/drying-distribution?sacks=${sacks}`)
      .then(res => { if (!cancelled && res.success) setBatchPreview(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [batchFormData.batch_id, batchFormData.sacks, isAddModalOpen, dryingSource]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-fill quantity_kg and sacks when procurement is selected
      if (name === 'procurement_id' && value) {
        const proc = procurements.find(p => String(p.id) === value);
        if (proc) {
          updated.quantity_kg = String(proc.quantity_kg);
          updated.sacks = String(proc.sacks || 0);
        }
      }
      return updated;
    });
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, [procurements]);

  const handleAddSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setErrors({});
      setBatchErrors({});
      let submitData;

      if (dryingSource === 'batch') {
        const localErrors = {};
        if (!batchFormData.batch_id) localErrors.batch_id = ['Please select a batch.'];
        if (!batchFormData.sacks || parseInt(batchFormData.sacks) <= 0) localErrors.sacks = ['Enter number of sacks to dry.'];
        if (!batchFormData.price) localErrors.price = ['Price is required.'];
        if (Object.keys(localErrors).length) { setBatchErrors(localErrors); setSaving(false); throw new Error('Validation'); }
        submitData = {
          batch_id: parseInt(batchFormData.batch_id),
          sacks: parseInt(batchFormData.sacks),
          price: parseFloat(batchFormData.price),
        };
      } else {
        submitData = {
          procurement_id: parseInt(formData.procurement_id),
          price: parseFloat(formData.price),
        };
      }

      const response = await apiClient.post('/drying-processes', submitData);
      if (response.success && response.data) {
        setIsAddModalOpen(false);
        invalidateAndRefetch().then(() => {
          toast.success('Drying Started',
            dryingSource === 'batch' ? 'Batch drying process has been created.' : 'New drying process has been created.');
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      if (error.message === 'Validation') return;
      console.error('Error creating drying process:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        toast.error('Validation Error', 'Please fix the highlighted fields.');
        throw error;
      } else {
        toast.error('Error', error.message || 'Failed to create drying process');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiClient.delete(`/drying-processes/${selectedItem.id}`);
      if (response.success) {
        setIsDeleteModalOpen(false);
        invalidateAndRefetch().then(() => {
          toast.success('Removed', 'Drying process has been removed.');
        });
        return;
      } else {
        throw new Error(response.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting drying process:', error);
      toast.error('Error', 'Failed to delete drying process');
    } finally {
      setSaving(false);
    }
  }, [selectedItem, invalidateAndRefetch, toast, saving]);

  // ---- Stats ----
  const totalRecords = dryingProcesses.length;
  const dryingCount = dryingProcesses.filter(d => d.status === 'Drying').length;
  const driedCount = dryingProcesses.filter(d => d.status === 'Dried').length;
  const totalQuantity = dryingProcesses.reduce((sum, d) => sum + parseFloat(d.quantity_kg || 0), 0);
  const totalCost = dryingProcesses.reduce((sum, d) => sum + parseFloat(d.total_price || 0), 0);
  const avgDays = totalRecords > 0 ? (dryingProcesses.reduce((sum, d) => sum + (d.days || 0), 0) / totalRecords).toFixed(1) : 0;

  // ---- Chart Data ----
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (chartPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const dayGroups = {};
      dryingProcesses.forEach(d => {
        if (!d.created_at) return;
        const date = new Date(d.created_at);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) dayGroups[day] = { cost: 0, quantity: 0 };
          dayGroups[day].cost += parseFloat(d.total_price || 0);
          dayGroups[day].quantity += parseFloat(d.quantity_kg || 0);
        }
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        value: dayGroups[i + 1]?.cost || 0,
        quantity: dayGroups[i + 1]?.quantity || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthGroups = {};
      dryingProcesses.forEach(d => {
        if (!d.created_at) return;
        const date = new Date(d.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) monthGroups[month] = { cost: 0, quantity: 0 };
          monthGroups[month].cost += parseFloat(d.total_price || 0);
          monthGroups[month].quantity += parseFloat(d.quantity_kg || 0);
        }
      });
      return months.map((name, i) => ({
        name,
        value: monthGroups[i]?.cost || 0,
        quantity: monthGroups[i]?.quantity || 0,
      }));
    } else {
      const years = [];
      for (let i = 5; i >= 0; i--) years.push(currentYear - i);
      const yearGroups = {};
      dryingProcesses.forEach(d => {
        if (!d.created_at) return;
        const date = new Date(d.created_at);
        const year = date.getFullYear();
        if (!yearGroups[year]) yearGroups[year] = { cost: 0, quantity: 0 };
        yearGroups[year].cost += parseFloat(d.total_price || 0);
        yearGroups[year].quantity += parseFloat(d.quantity_kg || 0);
      });
      return years.map(year => ({
        name: year.toString(),
        value: yearGroups[year]?.cost || 0,
        quantity: yearGroups[year]?.quantity || 0,
      }));
    }
  }, [dryingProcesses, chartPeriod]);

  // Status breakdown for donut chart - filtered by period + active point
  const statusBreakdown = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let drying = 0, dried = 0;
    dryingProcesses.forEach(d => {
      if (!d.created_at) return;
      const date = new Date(d.created_at);
      if (chartPeriod === 'daily' && (date.getFullYear() !== currentYear || date.getMonth() !== currentMonth)) return;
      if (chartPeriod === 'monthly' && date.getFullYear() !== currentYear) return;
      if (activeChartPoint) {
        if (chartPeriod === 'daily' && String(date.getDate()) !== activeChartPoint) return;
        if (chartPeriod === 'monthly') {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (months[date.getMonth()] !== activeChartPoint) return;
        }
        if (chartPeriod === 'yearly' && String(date.getFullYear()) !== activeChartPoint) return;
      }
      if (d.status === 'Drying') drying++;
      if (d.status === 'Dried') dried++;
    });
    return [
      { name: 'Drying', value: drying, color: '#eab308' },
      { name: 'Dried', value: dried, color: '#22c55e' },
    ].filter(item => item.value > 0);
  }, [dryingProcesses, chartPeriod, activeChartPoint]);

  // Sacks vs Kg comparison - filtered by period + active point
  const totalSacks = dryingProcesses.reduce((sum, d) => sum + parseInt(d.sacks || 0), 0);
  const quantityComparison = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let filteredSacks = 0, filteredKg = 0;
    dryingProcesses.forEach(d => {
      if (!d.created_at) return;
      const date = new Date(d.created_at);
      if (chartPeriod === 'daily' && (date.getFullYear() !== currentYear || date.getMonth() !== currentMonth)) return;
      if (chartPeriod === 'monthly' && date.getFullYear() !== currentYear) return;
      if (activeChartPoint) {
        if (chartPeriod === 'daily' && String(date.getDate()) !== activeChartPoint) return;
        if (chartPeriod === 'monthly') {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (months[date.getMonth()] !== activeChartPoint) return;
        }
        if (chartPeriod === 'yearly' && String(date.getFullYear()) !== activeChartPoint) return;
      }
      filteredSacks += parseInt(d.sacks || 0);
      filteredKg += parseFloat(d.quantity_kg || 0);
    });
    return [
      { name: 'Sacks', value: filteredSacks, color: '#22c55e' },
      { name: 'Kg', value: Math.round(filteredKg), color: '#3b82f6' },
    ];
  }, [dryingProcesses, chartPeriod, activeChartPoint]);

  // ---- Table Columns ----
  const columns = useMemo(() => [
    {
      header: 'ID', accessor: 'id',
      cell: (row) => <span className="font-mono text-sm text-gray-600">#{String(row.id).padStart(4, '0')}</span>
    },
    {
      header: 'Source', accessor: 'procurement_info',
      cell: (row) => {
        if (row.batch_id) return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 w-fit">
              <Layers size={10} />{row.batch_number}
            </span>
          </div>
        );
        return row.procurement_info ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">#{String(row.procurement_id).padStart(4, '0')} - {row.procurement_info.supplier_name}</span>
            {row.procurement_info.variety_name && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white w-fit" style={{ backgroundColor: row.procurement_info.variety_color || '#6b7280' }}>
                {row.procurement_info.variety_name}
              </span>
            )}
          </div>
        ) : <span className="text-gray-400 text-sm">-</span>;
      }
    },
    {
      header: 'Quantity', accessor: 'quantity_kg',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-green-600">
            {parseFloat(row.quantity_kg).toLocaleString()} kg
          </span>
          <span className="text-xs text-blue-600">
            {parseInt(row.sacks || 0)} sacks
          </span>
          {parseFloat(row.quantity_out || 0) > 0 && (
            <span className="text-xs font-medium text-red-500">
              -{parseFloat(row.quantity_out).toLocaleString()} kg out
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Days', accessor: 'days',
      cell: (row) => <span className="font-semibold text-blue-600">{row.days}</span>
    },
    {
      header: 'Price', accessor: 'price',
      cell: (row) => <span className="text-gray-700">₱{parseFloat(row.price).toLocaleString()}</span>
    },
    {
      header: 'Total Price', accessor: 'total_price',
      cell: (row) => <span className="font-semibold text-button-600">₱{parseFloat(row.total_price).toLocaleString()}</span>
    },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Dates', accessor: 'created_at',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">
            Start: {row.created_at ? new Date(row.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          {row.dried_at ? (
            <span className="text-xs text-green-600 font-medium">
              Dried: {new Date(row.dried_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-xs text-yellow-500 italic">In progress</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => {
        const isDrying = row.status === 'Drying';
        const isDried = row.status === 'Dried';
        const actionDisabled = isDried; // +day, mark dried, edit disabled unless Drying
        const deleteDisabled = isDried;
        return (
          <div className="flex items-center gap-1">
            {/* + button: increment day */}
            <button
              onClick={(e) => { e.stopPropagation(); handleIncrementDay(row); }}
              disabled={actionDisabled || saving}
              className={`p-1.5 rounded-md transition-colors ${
                actionDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-blue-500 hover:text-blue-700'
              }`}
              title={actionDisabled ? 'Cannot add days' : 'Add Day (+1)'}
            >
              <PlusCircle size={15} />
            </button>
            {/* ✓ button: mark as dried */}
            <button
              onClick={(e) => { e.stopPropagation(); handleMarkDried(row); }}
              disabled={actionDisabled || (row.days || 0) < 1 || saving}
              className={`p-1.5 rounded-md transition-colors ${
                actionDisabled || (row.days || 0) < 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-50 text-green-500 hover:text-green-700'
              }`}
              title={actionDisabled ? 'Already dried' : (row.days || 0) < 1 ? 'Add at least 1 day first' : 'Mark as Dried'}
            >
              <Check size={15} />
            </button>
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              disabled={deleteDisabled}
              className={`p-1.5 rounded-md transition-colors ${
                deleteDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-red-50 text-red-500 hover:text-red-700'
              }`}
              title={deleteDisabled ? 'Cannot delete' : 'Delete (returns qty to procurement)'}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      }
    },
  ], [handleIncrementDay, handleMarkDried, handleDelete, saving]);

  return (
    <div>
      <PageHeader
        title="Drying Process"
        description="Manage the drying stage between procurement and processing"
        icon={Sun}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards */}
      {loading && dryingProcesses.length === 0 ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Records" value={totalRecords} unit="entries" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Currently Drying" value={dryingCount} unit="batches" icon={Clock} iconBgColor="bg-gradient-to-br from-yellow-400 to-yellow-600" />
          <StatsCard label="Dried" value={driedCount} unit="batches" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Total Cost" value={`₱${totalCost.toLocaleString()}`} unit="drying cost" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
        </div>
      )}

      {/* Charts */}
      {loading && dryingProcesses.length === 0 ? (
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
              title="Drying Cost Trends"
              subtitle={activeChartPoint ? `Filtered: ${activeChartPoint} — click dot again to clear` : "Drying process cost overview"}
              data={chartData}
              lines={[{ dataKey: 'value', name: 'Cost (₱)' }]}
              height={280}
              yAxisUnit="₱"
              tabs={[
                { label: 'Daily', value: 'daily' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' },
              ]}
              activeTab={chartPeriod}
              onTabChange={(val) => { setChartPeriod(val); setActiveChartPoint(null); }}
              onDotClick={setActiveChartPoint}
              activePoint={activeChartPoint}
              summaryStats={[
                { label: 'Total Records', value: totalRecords.toString(), color: 'text-primary-600' },
                { label: 'Avg Days', value: String(avgDays), color: 'text-primary-600' },
                { label: 'Total Qty', value: `${totalQuantity.toLocaleString()} kg`, color: 'text-green-600' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <DonutChart
              title="Status Breakdown"
              data={statusBreakdown}
              centerValue={totalRecords.toString()}
              centerLabel="Total"
              height={175}
              innerRadius={56}
              outerRadius={78}
              showLegend={true}
              horizontalLegend={true}
              valueUnit=""
            />
            <DonutChart
              title="Sacks vs Kg"
              data={quantityComparison}
              centerValue={`${totalSacks}`}
              centerLabel="Sacks"
              height={140}
              innerRadius={45}
              outerRadius={62}
              showLegend={true}
              horizontalLegend={true}
              valueUnit=""
            />
          </div>
        </div>
      )}

      {/* Batch Filter + Table */}
      {loading && dryingProcesses.length === 0 ? (
        <SkeletonTable rows={5} columns={8} />
      ) : (
        <>
          {/* Batch Filter Bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              <span className="text-sm font-medium text-gray-600">Filter by Batch:</span>
            </div>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 min-w-[240px]"
            >
              <option value="">All Batches</option>
              <option value="no-batch">No Batch (Standalone)</option>
              {allBatches.map(b => (
                <option key={b.id} value={String(b.id)}>{b.batch_number} — {b.variety_name || '?'} ({b.remaining_sacks}/{b.total_sacks} sacks left)</option>
              ))}
            </select>
            {batchFilter && (
              <button
                onClick={() => setBatchFilter('')}
                className="text-xs text-gray-500 hover:text-red-500 underline transition-colors"
              >
                Clear filter
              </button>
            )}
            {batchFilter && batchFilter !== 'no-batch' && (() => {
              const b = allBatches.find(b => String(b.id) === batchFilter);
              return b ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-xs font-semibold text-indigo-700">{b.batch_number}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs text-gray-600">{b.remaining_sacks}/{b.total_sacks} sacks remaining</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className={`text-xs font-medium ${b.status === 'Open' ? 'text-green-600' : b.status === 'Closed' ? 'text-yellow-600' : 'text-gray-500'}`}>{b.status}</span>
                </div>
              ) : null;
            })()}
          </div>
          <DataTable
            title="Drying Records"
            subtitle="Manage all drying process records"
            columns={columns}
            data={batchFilter === 'no-batch' 
              ? dryingProcesses.filter(d => !d.batch_id) 
              : batchFilter 
                ? dryingProcesses.filter(d => String(d.batch_id) === batchFilter) 
                : dryingProcesses}
            searchPlaceholder="Search drying records..."
            filterField="status"
            filterPlaceholder="All Status"
            dateFilterField="created_at"
            onAdd={handleAdd}
            addLabel="Add Drying"
            onRowClick={handleView}
          />
        </>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Drying Process Details"
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
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
                    <Sun size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">Drying #{String(selectedItem.id).padStart(4, '0')}</h3>
                    <p className="text-xs text-gray-600">Record ID</p>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              {/* Procurement Info */}
              {selectedItem.procurement_info && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package size={18} /></div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-0.5">Procurement Source</p>
                    <p className="font-semibold text-gray-800 text-sm">#{String(selectedItem.procurement_id).padStart(4, '0')} - {selectedItem.procurement_info.supplier_name}</p>
                  </div>
                </div>
              )}

              {/* Batch Info */}
              {selectedItem.batch_id && (
                <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Layers size={18} /></div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-0.5">Batch Source</p>
                    <p className="font-semibold text-indigo-700 text-sm">{selectedItem.batch_number}</p>
                    {selectedItem.batch_breakdown?.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {selectedItem.batch_breakdown.map((item, i) => (
                          <p key={i} className="text-xs text-gray-600">
                            #{String(item.procurement_id).padStart(4,'0')} {item.supplier_name} — {item.sacks_taken} sacks / {parseFloat(item.quantity_kg).toLocaleString()} kg
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Total Cost */}
              <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-button-50 to-primary-50 rounded-lg border-2 border-button-200">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Total Cost</p>
                  <p className="text-xl font-bold text-button-600">₱{parseFloat(selectedItem.total_price).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">({parseInt(selectedItem.sacks || 0)} sacks × ₱{parseFloat(selectedItem.price).toLocaleString()}) × {selectedItem.days} days</p>
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
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-semibold text-gray-800 text-sm">{parseInt(selectedItem.sacks || 0)} sacks ({parseFloat(selectedItem.quantity_kg).toLocaleString()} kg)</p>
                  </div>
                </div>
              </div>

              {/* Days & Price */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Calendar size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Drying Days</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.days} days</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-0.5">Price</p>
                  <p className="font-semibold text-gray-800 text-sm">₱{parseFloat(selectedItem.price).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        title="Add Drying Process"
        submitText="Start Drying"
        size="lg"
        loading={saving}
      >
        {({ submitted }) => (
          <>
            {/* Source Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => { setDryingSource('procurement'); setBatchPreview(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  dryingSource === 'procurement' ? 'bg-white shadow text-button-600 border border-button-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Package size={14} /> Single Procurement
              </button>
              <button
                type="button"
                onClick={() => setDryingSource('batch')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  dryingSource === 'batch' ? 'bg-white shadow text-indigo-600 border border-indigo-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Layers size={14} /> From Batch
              </button>
            </div>

            {/* Single procurement mode */}
            {dryingSource === 'procurement' && (
              <>
                <FormSelect
                  label="Procurement Source"
                  name="procurement_id"
                  value={formData.procurement_id}
                  onChange={handleFormChange}
                  options={procurementOptions}
                  placeholder="Select procurement to dry..."
                  required
                  submitted={submitted}
                  error={errors.procurement_id?.[0]}
                />
                {formData.procurement_id && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                    <p className="text-xs text-blue-700">
                      Auto-filled: <strong>{parseInt(formData.sacks || 0)} sacks</strong> / <strong>{parseFloat(formData.quantity_kg || 0).toLocaleString()} kg</strong>
                    </p>
                  </div>
                )}
                <FormInput label="Price (₱)" name="price" type="number" value={formData.price}
                  onChange={handleFormChange} required placeholder="0.00" submitted={submitted}
                  error={errors.price?.[0]} step="0.01"
                />
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600">Days start at <strong>0</strong>. Use the <strong>+</strong> button in the table to increment days. Total = (Sacks × Price) × Days.</p>
                </div>
              </>
            )}

            {/* Batch mode */}
            {dryingSource === 'batch' && (
              <>
                <div className="mb-3">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">Batch <span className="text-red-500">*</span></label>
                  <select name="batch_id" value={batchFormData.batch_id} onChange={handleBatchFormChange}
                    className={`w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-4 transition-all ${
                      batchErrors.batch_id ? 'border-red-400 focus:ring-red-500/20' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                    }`}
                  >
                    {openBatchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  {batchErrors.batch_id && <p className="mt-1 text-xs text-red-500">{batchErrors.batch_id[0]}</p>}
                </div>

                {batchFormData.batch_id && (() => {
                  const b = allBatches.find(b => String(b.id) === batchFormData.batch_id);
                  return b ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-3 flex gap-4">
                      <div><p className="text-xs text-gray-500">Variety</p><p className="text-sm font-semibold text-indigo-700">{b.variety_name}</p></div>
                      <div><p className="text-xs text-gray-500">Available</p><p className="text-sm font-bold text-green-600">{b.remaining_sacks} sacks / {parseFloat(b.remaining_kg).toLocaleString()} kg</p></div>
                      <div><p className="text-xs text-gray-500">Status</p><p className="text-sm font-medium">{b.status}</p></div>
                    </div>
                  ) : null;
                })()}

                <FormInput label="Sacks to Dry" name="sacks" type="number"
                  value={batchFormData.sacks} onChange={handleBatchFormChange}
                  required placeholder="0" submitted={submitted} error={batchErrors.sacks?.[0]}
                />

                {loadingPreview && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2 animate-pulse">
                    <p className="text-xs text-gray-400">Calculating distribution...</p>
                  </div>
                )}
                {batchPreview && !loadingPreview && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                    <p className="text-xs font-semibold text-green-700 mb-1.5">Proportional distribution:</p>
                    <div className="space-y-1">
                      {batchPreview.breakdown?.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-700">
                          <span>Procurement #{String(item.procurement_id).padStart(4,'0')}</span>
                          <span>{item.sacks_taken} sacks → {parseFloat(item.quantity_kg).toLocaleString()} kg</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-green-200 flex justify-between text-xs font-bold text-green-700">
                      <span>Total</span>
                      <span>{batchFormData.sacks} sacks → {parseFloat(batchPreview.total_kg || 0).toLocaleString()} kg</span>
                    </div>
                  </div>
                )}

                <FormInput label="Drying Price (₱/sack)" name="price" type="number"
                  value={batchFormData.price} onChange={handleBatchFormChange}
                  required placeholder="0.00" submitted={submitted} error={batchErrors.price?.[0]} step="0.01"
                />
              </>
            )}
          </>
        )}
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Remove Drying Process"
        message={`Are you sure you want to remove Drying #${String(selectedItem?.id || 0).padStart(4, '0')}? The quantity will be returned to procurement.`}
        confirmText="Remove"
        variant="danger"
        icon={Trash2}
        loading={saving}
      />
    </div>
  );
};

export default DryingProcess;
