import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Package, DollarSign, Clock, CheckCircle, Truck, XCircle, Ban, FileText, ShoppingBag, RotateCcw, PlayCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
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
      <FormModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onSubmit={() => setIsViewModalOpen(false)}
        title={`Order Details — ${selectedOrder?.order_id || ''}`}
        submitText="Close"
        size="lg"
      >
        {() => selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Customer</p>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder.customer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Date</p>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder.date_formatted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Payment Method</p>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Status</p>
                <StatusBadge status={selectedOrder.status} />
              </div>
            </div>

            {selectedOrder.delivery_address && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Delivery Address</p>
                <p className="text-sm text-gray-800">{selectedOrder.delivery_address}</p>
              </div>
            )}

            {selectedOrder.notes && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Notes</p>
                <p className="text-sm text-gray-800 italic">{selectedOrder.notes}</p>
              </div>
            )}

            {selectedOrder.return_reason && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-medium">Return Reason</p>
                <p className="text-sm text-orange-800 font-semibold">{selectedOrder.return_reason}</p>
                {selectedOrder.return_notes && (
                  <p className="text-xs text-orange-600 mt-1 italic">{selectedOrder.return_notes}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Items</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Product</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Price</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">{item.product_name || item.name}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600">₱{(item.unit_price || item.price || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">₱{(item.subtotal || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">₱{selectedOrder.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </FormModal>

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
    </div>
  );
};

export default AdminOrders;
