import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Package, DollarSign, Clock, CheckCircle, Truck, XCircle, Ban, FileText, ShoppingBag, RotateCcw, PlayCircle, Loader2, User, Calendar, CreditCard, MapPin, Hash, StickyNote, Receipt } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import useDataFetch, { invalidateCache } from '../../../hooks/useDataFetch';

const AdminOrders = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Return Requested', 'Returned', 'Cancelled'];
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'All';
  });
  const [saving, setSaving] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Sync active tab to URL
  useEffect(() => {
    setSearchParams({ tab: activeStatusTab }, { replace: true });
  }, [activeStatusTab]);

  // Fetch real orders from API
  const {
    data: orders,
    loading,
    refetch,
  } = useDataFetch('/sales', {
    cacheKey: '/sales',
    initialData: [],
  });

  // Map API data to order format
  const mappedOrders = useMemo(() =>
    (orders || [])
      .filter(o => o.status !== 'completed' && o.status !== 'voided')
      .map(o => ({
        ...o,
        order_id: o.transaction_id,
        customer: o.customer_name || 'Walk-in',
        items: o.items || [],
        items_count: o.items_count || 0,
        total_quantity: o.total_quantity || 0,
        total: o.total || 0,
        payment_method: o.payment_method === 'cod' ? 'COD' : o.payment_method === 'gcash' ? 'GCash' : 'Cash',
        status: formatStatus(o.status),
        raw_status: o.status,
        date: o.created_at,
        date_formatted: o.date_formatted,
      })),
    [orders]
  );

  function formatStatus(status) {
    const map = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'return_requested': 'Return Requested',
      'returned': 'Returned',
      'cancelled': 'Cancelled',
    };
    return map[status] || status;
  }

  function rawStatus(status) {
    const map = {
      'Pending': 'pending',
      'Processing': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Return Requested': 'return_requested',
      'Returned': 'returned',
      'Cancelled': 'cancelled',
    };
    return map[status] || status;
  }

  const statusTabs = [
    { value: 'All', label: 'All', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-button-500', activeText: 'text-white' },
    { value: 'Pending', label: 'Pending', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', activeBg: 'bg-yellow-500', activeText: 'text-white' },
    { value: 'Processing', label: 'Processing', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-500', activeText: 'text-white' },
    { value: 'Shipped', label: 'Shipped', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', activeBg: 'bg-purple-500', activeText: 'text-white' },
    { value: 'Delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', activeBg: 'bg-green-500', activeText: 'text-white' },
    { value: 'Return Requested', label: 'Return', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { value: 'Returned', label: 'Returned', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
    { value: 'Cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
  ];

  const filteredOrdersByTab = useMemo(() => {
    if (activeStatusTab === 'All') return mappedOrders;
    return mappedOrders.filter(o => o.status === activeStatusTab);
  }, [mappedOrders, activeStatusTab]);

  // ─── Handlers ────────────────────────────────────────────

  const handleView = useCallback((order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  }, []);

  const handleCancel = useCallback((order) => {
    setSelectedOrder(order);
    setIsCancelModalOpen(true);
  }, []);

  const handleReturn = useCallback((order) => {
    setSelectedOrder(order);
    setReturnReason('');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  }, []);

  // Progress order to next status
  const handleProgressStatus = useCallback(async (order) => {
    if (saving) return;
    const nextStatusMap = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
    };
    const nextStatus = nextStatusMap[order.raw_status];
    if (!nextStatus) return;

    // If shipping, show driver selection modal instead
    if (nextStatus === 'shipped') {
      setShipOrder(order);
      setSelectedDriverId('');
      setDeliveryNotes('');
      setIsShipModalOpen(true);
      // Fetch staff drivers (users with position=Driver)
      setLoadingDrivers(true);
      try {
        const res = await apiClient.get('/users', { params: { role: 'staff' } });
        if (res.success) {
          const staffDrivers = (res.data?.data || res.data || []).filter(u => u.position === 'Driver' && u.status === 'active');
          setDrivers(staffDrivers);
        }
      } catch (err) {
        console.error('Error fetching drivers:', err);
      } finally {
        setLoadingDrivers(false);
      }

      // Auto-estimate delivery date based on distance (with +1 day allowance)
      const distKm = parseFloat(order.distance_km) || 0;
      if (distKm > 0) {
        // Rough estimate: average truck speed ~40 km/h + 1hr loading + 1 day allowance
        const driveHours = distKm / 40;
        const totalHours = driveHours + 1;
        const baseDays = totalHours > 8 ? Math.ceil(totalHours / 8) : 1;
        const daysWithAllowance = baseDays + 1; // +1 day allowance/buffer
        const estimated = new Date();
        estimated.setDate(estimated.getDate() + daysWithAllowance);
        setDeliveryDate(estimated.toISOString().split('T')[0]);
      } else {
        // Default: day after tomorrow (tomorrow + 1 day allowance)
        const est = new Date();
        est.setDate(est.getDate() + 2);
        setDeliveryDate(est.toISOString().split('T')[0]);
      }
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.put(`/sales/${order.id}/status`, { status: nextStatus });
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        const labels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };
        toast.success('Status Updated', `Order ${order.order_id} moved to ${labels[nextStatus]}.`);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Update Failed', error.message || 'Failed to update order status');
    } finally {
      setSaving(false);
    }
  }, [saving, refetch, toast]);

  // Confirm ship with driver assignment
  const handleShipConfirm = useCallback(async () => {
    if (!shipOrder || !selectedDriverId || saving) return;
    setSaving(true);
    try {
      // Get selected driver details
      const selectedDriver = drivers.find(d => String(d.id) === selectedDriverId);

      // 1. Update order status to shipped (include driver info)
      const statusRes = await apiClient.put(`/sales/${shipOrder.id}/status`, {
        status: 'shipped',
        driver_name: selectedDriver?.name || null,
        driver_plate_number: selectedDriver?.truck_plate_number || null,
      });
      if (!statusRes.success) throw statusRes;

      invalidateCache('/sales');
      invalidateCache('/products');
      invalidateCache('/users');
      refetch();
      toast.success('Order Shipped', `Order ${shipOrder.order_id} has been shipped with ${selectedDriver?.name || 'a driver'} assigned.`);
      setIsShipModalOpen(false);
    } catch (error) {
      toast.error('Ship Failed', error.message || 'Failed to ship order');
    } finally {
      setSaving(false);
    }
  }, [shipOrder, selectedDriverId, deliveryDate, deliveryNotes, saving, refetch, toast]);

  const handleCancelConfirm = useCallback(async () => {
    if (!selectedOrder || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.put(`/sales/${selectedOrder.id}/status`, { status: 'cancelled' });
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        toast.success('Order Cancelled', `Order ${selectedOrder.order_id} has been cancelled.`);
        setIsCancelModalOpen(false);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Cancel Failed', error.message || 'Failed to cancel order');
    } finally {
      setSaving(false);
    }
  }, [selectedOrder, saving, refetch, toast]);

  const handleReturnConfirm = useCallback(async () => {
    if (!selectedOrder || !returnReason || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/sales/${selectedOrder.id}/return`, {
        return_reason: returnReason,
        return_notes: returnNotes || null,
      });
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        toast.success('Return Processed', `Order ${selectedOrder.order_id} has been returned. Stock restored.`);
        setIsReturnModalOpen(false);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Return Failed', error.message || 'Failed to process return');
    } finally {
      setSaving(false);
    }
  }, [selectedOrder, returnReason, returnNotes, saving, refetch, toast]);

  // ─── Stats ───────────────────────────────────────────────

  const totalRevenue = mappedOrders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = mappedOrders.filter(o => o.status === 'Pending').length;
  const deliveredOrders = mappedOrders.filter(o => o.status === 'Delivered').length;
  const totalItems = mappedOrders.reduce((sum, o) => sum + o.total_quantity, 0);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (chartPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const dayGroups = {};
      mappedOrders.forEach(o => {
        const date = new Date(o.date);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) dayGroups[day] = 0;
          dayGroups[day] += o.total;
        }
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        value: dayGroups[i + 1] || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthGroups = {};
      mappedOrders.forEach(o => {
        const date = new Date(o.date);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) monthGroups[month] = 0;
          monthGroups[month] += o.total;
        }
      });
      return months.map((name, i) => ({ name, value: monthGroups[i] || 0 }));
    } else {
      const years = [];
      const currentYear2 = new Date().getFullYear();
      for (let i = 5; i >= 0; i--) years.push(currentYear2 - i);
      const yearGroups = {};
      mappedOrders.forEach(o => {
        const date = new Date(o.date);
        const year = date.getFullYear();
        if (!yearGroups[year]) yearGroups[year] = 0;
        yearGroups[year] += o.total;
      });
      return years.map(year => ({ name: year.toString(), value: yearGroups[year] || 0 }));
    }
  }, [mappedOrders, chartPeriod]);

  const avgPerDay = useMemo(() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const monthOrders = mappedOrders.filter(o => {
      const date = new Date(o.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
    return Math.round(monthOrders / daysInMonth * 10) / 10;
  }, [mappedOrders]);

  const statusBreakdown = [
    { name: 'Delivered', value: deliveredOrders, color: '#22c55e' },
    { name: 'Pending', value: pendingOrders, color: '#eab308' },
    { name: 'Processing', value: mappedOrders.filter(o => o.status === 'Processing').length, color: '#3b82f6' },
    { name: 'Shipped', value: mappedOrders.filter(o => o.status === 'Shipped').length, color: '#a855f7' },
    { name: 'Return Requested', value: mappedOrders.filter(o => o.status === 'Return Requested').length, color: '#f97316' },
    { name: 'Returned', value: mappedOrders.filter(o => o.status === 'Returned').length, color: '#fb923c' },
    { name: 'Cancelled', value: mappedOrders.filter(o => o.status === 'Cancelled').length, color: '#ef4444' },
  ];

  const paymentBreakdown = useMemo(() => {
    const groups = {};
    const colors = { 'Cash': '#22c55e', 'GCash': '#3b82f6', 'COD': '#f59e0b' };
    mappedOrders.forEach(o => {
      if (!groups[o.payment_method]) groups[o.payment_method] = 0;
      groups[o.payment_method]++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }));
  }, [mappedOrders]);

  // Next status label for progress button
  const getNextAction = (rawSt) => {
    const map = {
      'pending': { label: 'Process', icon: PlayCircle, color: 'text-blue-500 hover:bg-blue-50 hover:text-blue-600' },
      'processing': { label: 'Ship', icon: Truck, color: 'text-purple-500 hover:bg-purple-50 hover:text-purple-600' },
      'shipped': { label: 'Deliver', icon: CheckCircle, color: 'text-green-500 hover:bg-green-50 hover:text-green-600' },
    };
    return map[rawSt] || null;
  };

  const columns = [
    { header: 'Order ID', accessor: 'order_id' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Items', accessor: 'items_count', cell: (row) => `${row.items_count} item${row.items_count > 1 ? 's' : ''} (${row.total_quantity} pcs)` },
    { header: 'Total', accessor: 'total', cell: (row) => `₱${row.total.toLocaleString()}` },
    { header: 'Payment', accessor: 'payment_method' },
    { header: 'Date', accessor: 'date', cell: (row) => row.date_formatted },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => {
        const nextAction = getNextAction(row.raw_status);
        return (
          <div className="flex items-center gap-1">
            {nextAction && (
              <button
                onClick={() => handleProgressStatus(row)}
                disabled={saving}
                className={`p-1.5 rounded-lg transition-colors ${nextAction.color} disabled:opacity-50`}
                title={nextAction.label}
              >
                <nextAction.icon size={15} />
              </button>
            )}
            {(row.raw_status === 'pending' || row.raw_status === 'processing') && (
              <button
                onClick={() => handleCancel(row)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Cancel Order"
              >
                <Ban size={15} />
              </button>
            )}
            {(row.raw_status === 'delivered' || row.raw_status === 'return_requested') && (
              <button
                onClick={() => handleReturn(row)}
                className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                title="Process Return"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Orders" description="Manage customer and client orders" icon={ClipboardList} />

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`} unit="delivered" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Total Orders" value={mappedOrders.length} unit="orders" icon={ClipboardList} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Pending" value={pendingOrders} unit="awaiting" icon={Clock} iconBgColor="bg-gradient-to-br from-yellow-400 to-yellow-600" />
          <StatsCard label="Delivered" value={deliveredOrders} unit="completed" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <LineChart
              title="Order Trends"
              subtitle="Revenue from customer orders"
              data={chartData}
              lines={[{ dataKey: 'value', name: 'Revenue (₱)' }]}
              height={280}
              yAxisUnit="₱"
              tabs={[
                { label: 'Daily', value: 'daily' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' },
              ]}
              activeTab={chartPeriod}
              onTabChange={setChartPeriod}
              summaryStats={[
                { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, color: 'text-primary-600' },
                { label: 'Avg/Day', value: `${avgPerDay} orders`, color: 'text-primary-600' },
                { label: 'Items Ordered', value: totalItems.toString(), color: 'text-green-600' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <DonutChart title="Order Status" subtitle="Breakdown by status" data={statusBreakdown} centerValue={mappedOrders.length} centerLabel="Orders" height={175} innerRadius={56} outerRadius={78} valueUnit="" horizontalLegend={true} compactLegend={true} />
            <DonutChart title="Payment Method" subtitle="Breakdown by payment" data={paymentBreakdown} centerValue={mappedOrders.length} centerLabel="Orders" height={140} innerRadius={45} outerRadius={62} valueUnit="" horizontalLegend={true} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : (
        <>
          {/* Status Tabs */}
          <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 mb-0 rounded-b-none border-b-0">
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
                {statusTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeStatusTab === tab.value;
                  const count = tab.value === 'All' ? mappedOrders.length : mappedOrders.filter(o => o.status === tab.value).length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveStatusTab(tab.value)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all whitespace-nowrap border-2 border-b-0 ${
                        isActive
                          ? `${tab.activeBg} ${tab.activeText} border-transparent shadow-md`
                          : `${tab.bg} ${tab.color} border-transparent hover:shadow-sm`
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/80 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DataTable
            title="Order Records"
            subtitle={activeStatusTab === 'All' ? 'All customer orders' : `Showing ${activeStatusTab.toLowerCase()} orders`}
            columns={columns}
            data={filteredOrdersByTab}
            searchPlaceholder="Search orders..."
            dateFilterField="date"
            onRowDoubleClick={handleView}
          />
        </>
      )}

      {/* View Order Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order Details — ${selectedOrder?.order_id || ''}`}
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
        {selectedOrder && (
          <div className="space-y-3">
            {/* Header with Order ID & Status */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-button-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">{selectedOrder.order_id}</h3>
                  <p className="text-xs text-gray-500">{selectedOrder.date_formatted}</p>
                </div>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Customer */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <User size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Customer</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{selectedOrder.customer}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                  <CreditCard size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedOrder.payment_method}</p>
                  {selectedOrder.reference_number && (
                    <p className="text-[10px] text-gray-400 truncate">Ref: {selectedOrder.reference_number}</p>
                  )}
                </div>
              </div>

              {/* Items Count */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
                  <Package size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Items</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedOrder.items_count} item{selectedOrder.items_count > 1 ? 's' : ''} ({selectedOrder.total_quantity} pcs)</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Order Date</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedOrder.date_formatted}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Delivery Address</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedOrder.delivery_address}</p>
                  {selectedOrder.distance_km && (
                    <p className="text-[10px] text-blue-500 mt-0.5">{parseFloat(selectedOrder.distance_km).toFixed(1)} km from warehouse</p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Driver */}
            {selectedOrder.driver_name && (
              <div className="flex items-center gap-3 p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-9 h-9 bg-purple-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">Assigned Driver</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedOrder.driver_name}</p>
                </div>
                {selectedOrder.driver_plate_number && (
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                    <Truck size={10} /> {selectedOrder.driver_plate_number}
                  </span>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                  <StickyNote size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Order Notes</p>
                  <p className="text-xs text-gray-700 mt-0.5">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            {/* Return Info */}
            {selectedOrder.return_reason && (
              <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <RotateCcw size={14} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Return Information</p>
                </div>
                <p className="text-sm font-semibold text-orange-800">{selectedOrder.return_reason}</p>
                {selectedOrder.return_notes && (
                  <p className="text-xs text-orange-600 mt-1 italic">{selectedOrder.return_notes}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Order Items</p>
              <div className="rounded-xl border-2 border-primary-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Product</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Price</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.variety_color || '#6B7280' }} />
                            <span className="text-gray-800 text-xs font-medium">{item.product_name || item.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600 text-xs">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 text-xs">₱{(item.unit_price || item.price || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800 text-xs">₱{(item.subtotal || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    {selectedOrder.delivery_fee > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Delivery Fee</td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-600">₱{selectedOrder.delivery_fee.toLocaleString()}</td>
                      </tr>
                    )}
                    {selectedOrder.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Discount</td>
                        <td className="px-3 py-1.5 text-right text-xs text-red-500">-₱{selectedOrder.discount.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">₱{selectedOrder.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Total Summary Card */}
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Order Total</span>
                <span className="text-xl font-bold text-green-600">₱{selectedOrder.total.toLocaleString()}</span>
              </div>
              {(selectedOrder.delivery_fee > 0 || selectedOrder.discount > 0) && (
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-gray-500">
                  <span>Subtotal: ₱{selectedOrder.subtotal?.toLocaleString() || selectedOrder.total.toLocaleString()}</span>
                  {selectedOrder.delivery_fee > 0 && <span>+ ₱{selectedOrder.delivery_fee.toLocaleString()} delivery</span>}
                  {selectedOrder.discount > 0 && <span>- ₱{selectedOrder.discount.toLocaleString()} discount</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Order"
        message={`Are you sure you want to cancel "${selectedOrder?.order_id}"?${selectedOrder?.raw_status === 'processing' ? ' Stock will be restored.' : ''}`}
        confirmText={saving ? 'Cancelling...' : 'Cancel Order'}
        variant="danger"
        icon={Ban}
      />

      {/* Return Order Modal */}
      <FormModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSubmit={handleReturnConfirm}
        title={`Process Return — ${selectedOrder?.order_id || ''}`}
        submitText={saving ? 'Processing...' : 'Confirm Return'}
        size="md"
        loading={saving}
      >
        {({ submitted }) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Customer</p>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder?.customer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-sm font-semibold text-gray-800">₱{selectedOrder?.total?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Current Status</p>
                <StatusBadge status={selectedOrder?.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Items</p>
                <p className="text-sm text-gray-800">{selectedOrder?.items_count} item(s)</p>
              </div>
            </div>

            {selectedOrder?.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Items to Return</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-800">{item.product_name || item.name}</span>
                        <span className="text-sm text-gray-600">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <FormSelect
              label="Return Reason"
              name="returnReason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              options={[
                { value: 'Damaged Product', label: 'Damaged Product' },
                { value: 'Wrong Item', label: 'Wrong Item Received' },
                { value: 'Quality Issue', label: 'Quality Issue' },
                { value: 'Excess Order', label: 'Excess Order / Overstock' },
                { value: 'Customer Changed Mind', label: 'Customer Changed Mind' },
                { value: 'Other', label: 'Other' },
              ]}
              required
              submitted={submitted}
            />

            <FormInput
              label="Additional Notes (Optional)"
              name="returnNotes"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Any additional details about the return..."
            />
          </div>
        )}
      </FormModal>

      {/* Ship Order — Driver Selection Modal */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title={`Assign Driver — ${shipOrder?.order_id || ''}`}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsShipModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShipConfirm}
              disabled={saving || !selectedDriverId}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              {saving ? 'Shipping...' : 'Confirm & Ship'}
            </button>
          </div>
        }
      >
        {shipOrder && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-800">{shipOrder.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold text-gray-800">₱{shipOrder.total?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="font-semibold text-gray-800">{shipOrder.items_count} item{shipOrder.items_count > 1 ? 's' : ''} ({shipOrder.total_quantity} pcs)</p>
                </div>
              </div>
              {shipOrder.delivery_address && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Delivery Address</p>
                  <p className="text-sm font-medium text-gray-800">{shipOrder.delivery_address}</p>
                </div>
              )}
            </div>

            {/* Driver Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver *</label>
              {loadingDrivers ? (
                <div className="flex items-center gap-2 p-4 text-gray-500">
                  <Loader2 size={18} className="animate-spin" /> Loading drivers...
                </div>
              ) : drivers.length === 0 ? (
                <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg">No active drivers available. Please add drivers first.</p>
              ) : (
                <>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                  >
                    <option value="">Select driver...</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={String(driver.id)}>
                        {driver.name}{driver.truck_plate_number ? ` — ${driver.truck_plate_number}` : ''}
                      </option>
                    ))}
                  </select>
                  {/* Selected driver info card */}
                  {selectedDriverId && (() => {
                    const d = drivers.find(dr => String(dr.id) === selectedDriverId);
                    if (!d) return null;
                    return (
                      <div className="mt-2 flex items-center gap-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
                          {d.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{d.name}</p>
                          <p className="text-xs text-gray-500 truncate">{d.phone || d.email || 'No contact'}</p>
                        </div>
                        {d.truck_plate_number && (
                          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                            <Truck size={10} /> {d.truck_plate_number}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Estimated Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery Date *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              {shipOrder && (() => {
                const distKm = parseFloat(shipOrder.distance_km) || 0;
                if (distKm <= 0) return <p className="text-[11px] text-gray-400 mt-1">Estimated: within 2 days (no distance data — +1 day allowance)</p>;
                const driveHrs = distKm / 40;
                const totalHrs = driveHrs + 1;
                const baseDays = totalHrs > 8 ? Math.ceil(totalHrs / 8) : 1;
                const withAllowance = baseDays + 1;
                const earliest = new Date(); earliest.setDate(earliest.getDate() + baseDays);
                const latest = new Date(); latest.setDate(latest.getDate() + withAllowance);
                const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                return (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Est. {fmt(earliest)} – {fmt(latest)} ({distKm.toFixed(1)} km · ~{Math.ceil(totalHrs)} hrs travel + 1 day allowance)
                  </p>
                );
              })()}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any special instructions for the driver..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Client Delivery Note Preview */}
            {selectedDriverId && (() => {
              const selectedDriver = drivers.find(d => String(d.id) === selectedDriverId);
              if (!selectedDriver) return null;
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-1.5">Client Delivery Note</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><span className="font-semibold">Driver:</span> {selectedDriver.name}</p>
                    {selectedDriver.truck_plate_number && (
                      <p><span className="font-semibold">Plate No.:</span> {selectedDriver.truck_plate_number}</p>
                    )}
                    {(selectedDriver.phone || selectedDriver.email) && (
                      <p><span className="font-semibold">Contact:</span> {selectedDriver.phone || selectedDriver.email}</p>
                    )}
                    {shipOrder.delivery_address && (
                      <p><span className="font-semibold">Deliver to:</span> {shipOrder.delivery_address}</p>
                    )}
                    {deliveryDate && (
                      <p><span className="font-semibold">Est. Delivery:</span> {new Date(deliveryDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrders;
