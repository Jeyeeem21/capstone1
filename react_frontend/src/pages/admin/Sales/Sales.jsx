import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, FileText, CheckCircle, XCircle, Ban, RotateCcw, Receipt, Brain, User, Calendar, CreditCard, MapPin, Package, Truck, StickyNote } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, LineChart, DonutChart, FormModal, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import useDataFetch from '../../../hooks/useDataFetch';
import PredictiveAnalytics from './PredictiveAnalytics';

const Sales = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [activeView, setActiveView] = useState('overview'); // 'overview' or 'predictions'

  // Fetch all sales/orders from API
  const {
    data: salesRaw,
    loading,
  } = useDataFetch('/sales', {
    cacheKey: '/sales',
    initialData: [],
  });

  // Map and filter — show only delivered, returned, cancelled, voided (completed transactions)
  const sales = useMemo(() =>
    (salesRaw || [])
      .filter(s => ['delivered', 'returned', 'cancelled', 'voided', 'completed'].includes(s.status))
      .map(s => ({
        ...s,
        invoice: s.transaction_id,
        customer: s.customer_name || 'Walk-in',
        items_count: s.items_count || 0,
        total_quantity: s.total_quantity || 0,
        total: s.total || 0,
        payment: s.payment_method === 'cod' ? 'COD' : s.payment_method === 'gcash' ? 'GCash' : 'Cash',
        status_display: formatStatus(s.status),
        date: s.created_at,
        date_formatted: s.date_formatted,
      })),
    [salesRaw]
  );

  function formatStatus(status) {
    const map = {
      'delivered': 'Delivered',
      'completed': 'Completed',
      'returned': 'Returned',
      'cancelled': 'Cancelled',
      'voided': 'Voided',
    };
    return map[status] || status;
  }

  const statusTabs = [
    { value: 'All', label: 'All', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-button-500', activeText: 'text-white' },
    { value: 'Delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', activeBg: 'bg-green-500', activeText: 'text-white' },
    { value: 'Returned', label: 'Returned', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { value: 'Cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
    { value: 'Voided', label: 'Voided', icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-gray-500', activeText: 'text-white' },
  ];

  const filteredSalesByTab = useMemo(() => {
    if (activeStatusTab === 'All') return sales;
    return sales.filter(s => s.status_display === activeStatusTab);
  }, [sales, activeStatusTab]);

  const handleView = useCallback((sale) => {
    setSelectedSale(sale);
    setIsViewModalOpen(true);
  }, []);

  // Stats from real data
  const deliveredSales = sales.filter(s => s.status === 'delivered' || s.status === 'completed');
  const totalRevenue = deliveredSales.reduce((sum, s) => sum + s.total, 0);
  const totalItems = deliveredSales.reduce((sum, s) => sum + s.total_quantity, 0);
  const avgTransaction = deliveredSales.length > 0 ? Math.round(totalRevenue / deliveredSales.length) : 0;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (chartPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const dayGroups = {};
      deliveredSales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) dayGroups[day] = 0;
          dayGroups[day] += s.total;
        }
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        sales: dayGroups[i + 1] || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthGroups = {};
      deliveredSales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) monthGroups[month] = 0;
          monthGroups[month] += s.total;
        }
      });
      return months.map((name, i) => ({ name, sales: monthGroups[i] || 0 }));
    } else {
      const years = [];
      const cy = new Date().getFullYear();
      for (let i = 5; i >= 0; i--) years.push(cy - i);
      const yearGroups = {};
      deliveredSales.forEach(s => {
        const date = new Date(s.date);
        const year = date.getFullYear();
        if (!yearGroups[year]) yearGroups[year] = 0;
        yearGroups[year] += s.total;
      });
      return years.map(year => ({ name: year.toString(), sales: yearGroups[year] || 0 }));
    }
  }, [deliveredSales, chartPeriod]);

  const avgPerDay = useMemo(() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const monthSales = deliveredSales.filter(s => {
      const date = new Date(s.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).reduce((sum, s) => sum + s.total, 0);
    return Math.floor(monthSales / daysInMonth);
  }, [deliveredSales]);

  const statusBreakdown = [
    { name: 'Delivered', value: deliveredSales.length, color: '#22c55e' },
    { name: 'Returned', value: sales.filter(s => s.status === 'returned').length, color: '#f97316' },
    { name: 'Cancelled', value: sales.filter(s => s.status === 'cancelled').length, color: '#ef4444' },
    { name: 'Voided', value: sales.filter(s => s.status === 'voided').length, color: '#6b7280' },
  ];

  const paymentBreakdown = useMemo(() => {
    const groups = {};
    const colors = { 'Cash': '#22c55e', 'GCash': '#3b82f6', 'COD': '#f59e0b' };
    deliveredSales.forEach(s => {
      if (!groups[s.payment]) groups[s.payment] = 0;
      groups[s.payment]++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }));
  }, [deliveredSales]);

  const columns = [
    { header: 'Transaction', accessor: 'invoice' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Items', accessor: 'items_count', cell: (row) => `${row.items_count} item${row.items_count > 1 ? 's' : ''} (${row.total_quantity} pcs)` },
    { header: 'Amount', accessor: 'total', cell: (row) => `₱${row.total.toLocaleString()}` },
    { header: 'Payment', accessor: 'payment' },
    { header: 'Date', accessor: 'date', cell: (row) => row.date_formatted },
    { header: 'Status', accessor: 'status_display', cell: (row) => <StatusBadge status={row.status_display} /> },
  ];

  return (
    <div>
      <PageHeader title="Sales" description="Revenue analytics and completed transactions" icon={TrendingUp} />

      {/* View Toggle: Overview vs Predictions */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
            activeView === 'overview'
              ? 'border-button-500 bg-button-500 text-white shadow-md'
              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
          }`}
        >
          <TrendingUp size={14} />
          Sales Overview
        </button>
        <button
          onClick={() => setActiveView('predictions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
            activeView === 'predictions'
              ? 'border-purple-500 bg-purple-500 text-white shadow-md'
              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
          }`}
        >
          <Brain size={14} />
          Predictive Analysis
        </button>
      </div>

      {activeView === 'predictions' ? (
        <PredictiveAnalytics />
      ) : (
      <>
      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`} unit="from delivered orders" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Transactions" value={deliveredSales.length} unit="completed" icon={Receipt} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Items Sold" value={totalItems} unit="items delivered" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Avg Transaction" value={`₱${avgTransaction.toLocaleString()}`} unit="per order" icon={TrendingUp} iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600" />
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <LineChart
              title="Sales Trends"
              subtitle="Revenue from delivered orders"
              data={chartData}
              lines={[{ dataKey: 'sales', name: 'Sales (₱)' }]}
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
                { label: 'Avg per Day', value: `₱${avgPerDay.toLocaleString()}`, color: 'text-primary-600' },
                { label: 'Orders', value: deliveredSales.length.toString(), color: 'text-green-600' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <DonutChart title="Transaction Status" subtitle="Breakdown by outcome" data={statusBreakdown} centerValue={sales.length} centerLabel="Total" height={175} innerRadius={56} outerRadius={78} valueUnit="" horizontalLegend={true} compactLegend={true} />
            <DonutChart title="Payment Method" subtitle="Revenue by payment type" data={paymentBreakdown} centerValue={deliveredSales.length} centerLabel="Sales" height={140} innerRadius={45} outerRadius={62} valueUnit="" horizontalLegend={true} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
        <>
          {/* Status Tabs */}
          <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 mb-0 rounded-b-none border-b-0">
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
                {statusTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeStatusTab === tab.value;
                  const count = tab.value === 'All' ? sales.length : sales.filter(s => s.status_display === tab.value).length;
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
            title="Sales Records"
            subtitle={activeStatusTab === 'All' ? 'All completed transactions' : `Showing ${activeStatusTab.toLowerCase()} transactions`}
            columns={columns}
            data={filteredSalesByTab}
            searchPlaceholder="Search sales..."
            dateFilterField="date"
            onRowDoubleClick={handleView}
          />
        </>
      )}
      </>
      )}

      {/* View Sale Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Transaction Details — ${selectedSale?.invoice || ''}`}
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
        {selectedSale && (
          <div className="space-y-3">
            {/* Header with Invoice & Status */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-button-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">{selectedSale.invoice}</h3>
                  <p className="text-xs text-gray-500">{selectedSale.date_formatted}</p>
                </div>
              </div>
              <StatusBadge status={selectedSale.status_display} />
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
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{selectedSale.customer}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                  <CreditCard size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedSale.payment}</p>
                  {selectedSale.reference_number && (
                    <p className="text-[10px] text-gray-400 truncate">Ref: {selectedSale.reference_number}</p>
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
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedSale.items_count} item{selectedSale.items_count > 1 ? 's' : ''} ({selectedSale.total_quantity} pcs)</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Transaction Date</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedSale.date_formatted}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {selectedSale.delivery_address && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Delivery Address</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedSale.delivery_address}</p>
                  {selectedSale.distance_km && (
                    <p className="text-[10px] text-blue-500 mt-0.5">{parseFloat(selectedSale.distance_km).toFixed(1)} km from warehouse</p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Driver */}
            {selectedSale.driver_name && (
              <div className="flex items-center gap-3 p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-9 h-9 bg-purple-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">Assigned Driver</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedSale.driver_name}</p>
                </div>
                {selectedSale.driver_plate_number && (
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                    <Truck size={10} /> {selectedSale.driver_plate_number}
                  </span>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedSale.notes && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                  <StickyNote size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Transaction Notes</p>
                  <p className="text-xs text-gray-700 mt-0.5">{selectedSale.notes}</p>
                </div>
              </div>
            )}

            {/* Return Info */}
            {selectedSale.return_reason && (
              <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <RotateCcw size={14} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Return Information</p>
                </div>
                <p className="text-sm font-semibold text-orange-800">{selectedSale.return_reason}</p>
                {selectedSale.return_notes && (
                  <p className="text-xs text-orange-600 mt-1 italic">{selectedSale.return_notes}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Transaction Items</p>
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
                    {(selectedSale.items || []).map((item, idx) => (
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
                    {selectedSale.delivery_fee > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Delivery Fee</td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-600">₱{selectedSale.delivery_fee.toLocaleString()}</td>
                      </tr>
                    )}
                    {selectedSale.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Discount</td>
                        <td className="px-3 py-1.5 text-right text-xs text-red-500">-₱{selectedSale.discount.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">₱{selectedSale.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Total Summary Card */}
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Transaction Total</span>
                <span className="text-xl font-bold text-green-600">₱{selectedSale.total.toLocaleString()}</span>
              </div>
              {(selectedSale.delivery_fee > 0 || selectedSale.discount > 0) && (
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-gray-500">
                  <span>Subtotal: ₱{selectedSale.subtotal?.toLocaleString() || selectedSale.total.toLocaleString()}</span>
                  {selectedSale.delivery_fee > 0 && <span>+ ₱{selectedSale.delivery_fee.toLocaleString()} delivery</span>}
                  {selectedSale.discount > 0 && <span>- ₱{selectedSale.discount.toLocaleString()} discount</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Sales;
