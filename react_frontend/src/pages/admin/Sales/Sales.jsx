import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, FileText, CheckCircle, XCircle, Ban, RotateCcw, Receipt, Brain, User, Calendar, CreditCard, MapPin, Package, Truck, StickyNote, X } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, LineChart, DonutChart, FormModal, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient, API_BASE_URL } from '../../../api';
import useDataFetch from '../../../hooks/useDataFetch';
import PredictiveAnalytics from './PredictiveAnalytics';

const Sales = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [activeChartPoint, setActiveChartPoint] = useState(null);
  // Chart calendar filter state
  const [chartMonth, setChartMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());
  const [chartYearFrom, setChartYearFrom] = useState(() => new Date().getFullYear() - 4);
  const [chartYearTo, setChartYearTo] = useState(() => new Date().getFullYear());
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [previewProofImage, setPreviewProofImage] = useState(null);
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
        payment: s.payment_method === 'cod' ? 'COD' : s.payment_method === 'gcash' ? 'GCash' : s.payment_method === 'pay_later' ? 'Pay Later' : 'Cash',
        payment_status: s.payment_status || 'paid',
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

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Helper: get the week ranges for a given month/year
  const getWeeksInMonth = useCallback((year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    let start = new Date(firstDay);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);
    while (start.getMonth() <= month || (start.getMonth() > month && start.getFullYear() < year) || weeks.length === 0) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
      weeks.push({ start: new Date(start), end: new Date(end), label });
      start.setDate(start.getDate() + 7);
      if (start.getMonth() > month && start.getFullYear() === year) break;
      if (start.getFullYear() > year) break;
      if (weeks.length >= 6) break;
    }
    return weeks;
  }, []);

  // Helper: checks if a sale matches the active chart point filter
  const matchesChartPoint = useCallback((s) => {
    if (!activeChartPoint || !s.date) return true;
    const date = new Date(s.date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      return date.getFullYear() === y && date.getMonth() === m - 1 && String(date.getDate()) === activeChartPoint;
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      const week = weeks.find(w => w.label === activeChartPoint);
      if (!week) return false;
      return date >= week.start && date <= new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate(), 23, 59, 59);
    }
    if (chartPeriod === 'monthly') return date.getFullYear() === chartYear && months[date.getMonth()] === activeChartPoint;
    if (chartPeriod === 'bi-annually') {
      if (activeChartPoint === 'H1') return date.getFullYear() === chartYear && date.getMonth() < 6;
      if (activeChartPoint === 'H2') return date.getFullYear() === chartYear && date.getMonth() >= 6;
      return false;
    }
    if (chartPeriod === 'annually') return String(date.getFullYear()) === activeChartPoint;
    return true;
  }, [activeChartPoint, chartPeriod, chartMonth, chartYear, getWeeksInMonth]);

  // Helper: check if a sale date falls within the current chart scope
  const isInChartScope = useCallback((s) => {
    if (!s.date) return false;
    const date = new Date(s.date);
    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      return date.getFullYear() === y && date.getMonth() === m - 1;
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      if (weeks.length === 0) return false;
      return date >= weeks[0].start && date <= new Date(weeks[weeks.length - 1].end.getFullYear(), weeks[weeks.length - 1].end.getMonth(), weeks[weeks.length - 1].end.getDate(), 23, 59, 59);
    }
    if (chartPeriod === 'monthly') return date.getFullYear() === chartYear;
    if (chartPeriod === 'bi-annually') return date.getFullYear() === chartYear;
    if (chartPeriod === 'annually') return date.getFullYear() >= chartYearFrom && date.getFullYear() <= chartYearTo;
    return true;
  }, [chartPeriod, chartMonth, chartYear, chartYearFrom, chartYearTo, getWeeksInMonth]);

  // Chart-filtered sales — scoped by calendar + dot
  const chartFilteredSales = useMemo(() => {
    const scoped = sales.filter(isInChartScope);
    if (!activeChartPoint) return scoped;
    return scoped.filter(matchesChartPoint);
  }, [sales, isInChartScope, activeChartPoint, matchesChartPoint]);

  const chartFilteredSalesByTab = useMemo(() => {
    if (activeStatusTab === 'All') return chartFilteredSales;
    return chartFilteredSales.filter(s => s.status_display === activeStatusTab);
  }, [chartFilteredSales, activeStatusTab]);

  const chartFilteredDelivered = useMemo(() => chartFilteredSales.filter(s => s.status === 'delivered' || s.status === 'completed'), [chartFilteredSales]);

  // Chart data
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      const daysInMonth = getDaysInMonth(y, m - 1);
      const dayGroups = {};
      deliveredSales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === y && date.getMonth() === m - 1) {
          const day = date.getDate();
          if (!dayGroups[day]) dayGroups[day] = 0;
          dayGroups[day] += s.total;
        }
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        sales: dayGroups[i + 1] || 0,
      }));
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      return weeks.map(week => {
        let sales = 0;
        deliveredSales.forEach(s => {
          if (!s.date) return;
          const date = new Date(s.date);
          if (date >= week.start && date <= new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate(), 23, 59, 59)) {
            sales += s.total;
          }
        });
        return { name: week.label, sales };
      });
    }
    if (chartPeriod === 'monthly') {
      const monthGroups = {};
      deliveredSales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === chartYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) monthGroups[month] = 0;
          monthGroups[month] += s.total;
        }
      });
      return months.map((name, i) => ({ name, sales: monthGroups[i] || 0 }));
    }
    if (chartPeriod === 'bi-annually') {
      const h1 = { sales: 0 }, h2 = { sales: 0 };
      deliveredSales.forEach(s => {
        if (!s.date) return;
        const date = new Date(s.date);
        if (date.getFullYear() === chartYear) {
          (date.getMonth() < 6 ? h1 : h2).sales += s.total;
        }
      });
      return [
        { name: 'H1', fullName: `Jan - Jun ${chartYear}`, sales: h1.sales },
        { name: 'H2', fullName: `Jul - Dec ${chartYear}`, sales: h2.sales },
      ];
    }
    // annually
    const years = [];
    for (let y = chartYearFrom; y <= chartYearTo; y++) years.push(y);
    const yearGroups = {};
    deliveredSales.forEach(s => {
      if (!s.date) return;
      const date = new Date(s.date);
      const year = date.getFullYear();
      if (year >= chartYearFrom && year <= chartYearTo) {
        if (!yearGroups[year]) yearGroups[year] = 0;
        yearGroups[year] += s.total;
      }
    });
    return years.map(year => ({ name: year.toString(), sales: yearGroups[year] || 0 }));
  }, [deliveredSales, chartPeriod, chartMonth, chartYear, chartYearFrom, chartYearTo, getWeeksInMonth]);

  const avgPerDay = useMemo(() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const monthSales = deliveredSales.filter(s => {
      const date = new Date(s.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).reduce((sum, s) => sum + s.total, 0);
    return Math.floor(monthSales / daysInMonth);
  }, [deliveredSales]);

  const statusBreakdown = useMemo(() => [
    { name: 'Delivered', value: chartFilteredDelivered.length, color: '#22c55e' },
    { name: 'Returned', value: chartFilteredSales.filter(s => s.status === 'returned').length, color: '#f97316' },
    { name: 'Cancelled', value: chartFilteredSales.filter(s => s.status === 'cancelled').length, color: '#ef4444' },
    { name: 'Voided', value: chartFilteredSales.filter(s => s.status === 'voided').length, color: '#6b7280' },
  ], [chartFilteredSales, chartFilteredDelivered]);

  const paymentBreakdown = useMemo(() => {
    const groups = {};
    const colors = { 'Cash': '#22c55e', 'GCash': '#3b82f6', 'COD': '#f59e0b' };
    chartFilteredDelivered.forEach(s => {
      if (!groups[s.payment]) groups[s.payment] = 0;
      groups[s.payment]++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }));
  }, [chartFilteredDelivered]);

  const columns = [
    { header: 'Transaction', accessor: 'invoice' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Products', accessor: 'products_summary', cell: (row) => {
      const items = row.items || [];
      if (items.length === 0) return <span className="text-gray-400 text-xs">No items</span>;
      return (
        <div className="flex flex-col gap-0.5 max-w-[220px]">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.variety_color || '#6B7280' }} />
              <span className="text-gray-700 truncate">
                {item.product_name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}
              </span>
              <span className="text-gray-400 shrink-0">×{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <span className="text-[10px] text-gray-400 italic">+{items.length - 3} more</span>
          )}
        </div>
      );
    }},
    { header: 'Amount', accessor: 'total', cell: (row) => `₱${row.total.toLocaleString()}` },
    { header: 'Payment', accessor: 'payment', cell: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs">{row.payment}</span>
        {row.payment_status === 'not_paid' && (
          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 w-fit">Not Paid</span>
        )}
      </div>
    )},
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
              ? 'border-button-500 bg-button-500 text-white shadow-md'
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
          <StatsCard label="Total Revenue" value={`₱${chartFilteredDelivered.reduce((sum, s) => sum + s.total, 0).toLocaleString()}`} unit="from delivered orders" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Transactions" value={chartFilteredDelivered.length} unit="completed" icon={Receipt} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Items Sold" value={chartFilteredDelivered.reduce((sum, s) => sum + s.total_quantity, 0)} unit="items delivered" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
          <StatsCard label="Avg Transaction" value={`₱${chartFilteredDelivered.length > 0 ? Math.round(chartFilteredDelivered.reduce((sum, s) => sum + s.total, 0) / chartFilteredDelivered.length).toLocaleString() : 0}`} unit="per order" icon={TrendingUp} iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600" />
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <LineChart
              title="Sales Trends"
              subtitle={activeChartPoint ? `Filtered: ${activeChartPoint} — click dot again to clear` : "Revenue from delivered orders"}
              data={chartData}
              lines={[{ dataKey: 'sales', name: 'Sales (₱)' }]}
              height={280}
              yAxisUnit="₱"
              headerRight={
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={chartPeriod}
                    onChange={(e) => { setChartPeriod(e.target.value); setActiveChartPoint(null); }}
                    className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="bi-annually">Bi-Annually</option>
                    <option value="annually">Annually</option>
                  </select>
                  {(chartPeriod === 'daily' || chartPeriod === 'weekly') && (
                    <input
                      type="month"
                      value={chartMonth}
                      onChange={(e) => { setChartMonth(e.target.value); setActiveChartPoint(null); }}
                      className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                  {(chartPeriod === 'monthly' || chartPeriod === 'bi-annually') && (
                    <input
                      type="number"
                      value={chartYear}
                      onChange={(e) => { setChartYear(parseInt(e.target.value) || new Date().getFullYear()); setActiveChartPoint(null); }}
                      min="2000"
                      max={new Date().getFullYear()}
                      className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-24"
                    />
                  )}
                  {chartPeriod === 'annually' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={chartYearFrom}
                        onChange={(e) => { const v = parseInt(e.target.value) || 2000; setChartYearFrom(v); setActiveChartPoint(null); }}
                        min="2000"
                        max={chartYearTo}
                        className="px-2 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-20"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                      <input
                        type="number"
                        value={chartYearTo}
                        onChange={(e) => { const v = parseInt(e.target.value) || new Date().getFullYear(); setChartYearTo(v); setActiveChartPoint(null); }}
                        min={chartYearFrom}
                        max={new Date().getFullYear()}
                        className="px-2 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-20"
                      />
                    </div>
                  )}
                </div>
              }
              onDotClick={setActiveChartPoint}
              activePoint={activeChartPoint}
              summaryStats={[
                { label: 'Total Revenue', value: `₱${chartFilteredDelivered.reduce((sum, s) => sum + s.total, 0).toLocaleString()}`, color: 'text-primary-600' },
                { label: 'Avg per Day', value: `₱${avgPerDay.toLocaleString()}`, color: 'text-primary-600' },
                { label: 'Orders', value: chartFilteredDelivered.length.toString(), color: 'text-green-600' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <DonutChart title="Transaction Status" subtitle="Breakdown by outcome" data={statusBreakdown} centerValue={chartFilteredSales.length} centerLabel="Total" height={175} innerRadius={56} outerRadius={78} valueUnit="" horizontalLegend={true} compactLegend={true} />
            <DonutChart title="Payment Method" subtitle="Revenue by payment type" data={paymentBreakdown} centerValue={chartFilteredDelivered.length} centerLabel="Sales" height={140} innerRadius={45} outerRadius={62} valueUnit="" horizontalLegend={true} />
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
            data={chartFilteredSalesByTab}
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
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{selectedSale.customer}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className={`p-1.5 rounded-lg ${selectedSale.payment_status === 'not_paid' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  <CreditCard size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedSale.payment}</p>
                  {selectedSale.reference_number && (
                    <p className="text-xs text-gray-400 truncate">Ref: {selectedSale.reference_number}</p>
                  )}
                  {selectedSale.payment_status === 'not_paid' ? (
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 mt-0.5">Not Paid</span>
                  ) : selectedSale.paid_at_formatted && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Paid: {selectedSale.paid_at_formatted}</p>
                  )}
                </div>
              </div>

              {/* Items Count */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-button-100 text-button-600">
                  <Package size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedSale.items_count} item{selectedSale.items_count > 1 ? 's' : ''} ({selectedSale.total_quantity} pcs)</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction Date</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedSale.date_formatted}</p>
                </div>
              </div>
            </div>

            {/* Payment Proof Images */}
            {selectedSale.payment_proof?.length > 0 && (
              <div className="bg-button-50 rounded-xl p-3 border border-button-200">
                <p className="text-xs font-bold text-button-600 uppercase tracking-wide mb-2">Payment Proof</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSale.payment_proof.map((url, idx) => (
                    <img
                      key={idx}
                      src={`${API_BASE_URL.replace('/api', '')}${url}`}
                      alt={`Payment proof ${idx + 1}`}
                      className="w-[80px] h-[80px] object-cover rounded-lg border border-button-200 cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewProofImage(`${API_BASE_URL.replace('/api', '')}${url}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {selectedSale.delivery_address && (
              <div className="flex items-start gap-2 p-2.5 bg-button-50 rounded-xl border border-button-200">
                <div className="p-1.5 rounded-lg bg-button-100 text-button-600">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-button-600 uppercase tracking-wide">Delivery Address</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedSale.delivery_address}</p>
                  {selectedSale.distance_km && (
                    <p className="text-xs text-button-500 mt-0.5">{parseFloat(selectedSale.distance_km).toFixed(1)} km from warehouse</p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Driver */}
            {selectedSale.driver_name && (
              <div className="flex items-center gap-3 p-2.5 bg-button-50 rounded-xl border border-button-200">
                <div className="w-9 h-9 bg-button-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-button-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-button-600 uppercase tracking-wide">Assigned Driver</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedSale.driver_name}</p>
                </div>
                {selectedSale.driver_plate_number && (
                  <span className="text-xs font-bold text-button-600 bg-button-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
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
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Transaction Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedSale.notes}</p>
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
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Return Information</p>
                </div>
                <p className="text-sm font-semibold text-orange-800">{selectedSale.return_reason}</p>
                {selectedSale.return_notes && (
                  <p className="text-xs text-orange-600 mt-1 italic">{selectedSale.return_notes}</p>
                )}
                {selectedSale.return_proof?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-orange-600 mb-1">Proof {selectedSale.return_proof.length > 1 ? 'Images' : 'Image'}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSale.return_proof.map((url, idx) => (
                        <img
                          key={idx}
                          src={`${API_BASE_URL.replace('/api', '')}${url}`}
                          alt={`Return proof ${idx + 1}`}
                          className="w-[120px] h-[120px] object-cover rounded-lg border border-orange-200 cursor-pointer hover:opacity-80"
                          onClick={() => setPreviewProofImage(`${API_BASE_URL.replace('/api', '')}${url}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {selectedSale.return_pickup_driver && (
                  <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck size={12} className="text-orange-500" />
                      <span className="text-xs text-orange-700">
                        <span className="font-semibold">Pickup Driver:</span> {selectedSale.return_pickup_driver}
                        {selectedSale.return_pickup_plate && ` — ${selectedSale.return_pickup_plate}`}
                      </span>
                    </div>
                    {selectedSale.return_pickup_date_formatted && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-orange-500" />
                        <span className="text-xs text-orange-700">
                          <span className="font-semibold">Est. Pickup:</span> {selectedSale.return_pickup_date_formatted}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Transaction Items</p>
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
                            <span className="text-gray-800 text-xs font-medium">{item.product_name || item.name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}</span>
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
            <div className="p-3 bg-button-50 rounded-xl border border-button-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-button-700">Transaction Total</span>
                <span className="text-xl font-bold text-button-600">₱{selectedSale.total.toLocaleString()}</span>
              </div>
              {(selectedSale.delivery_fee > 0 || selectedSale.discount > 0) && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Subtotal: ₱{selectedSale.subtotal?.toLocaleString() || selectedSale.total.toLocaleString()}</span>
                  {selectedSale.delivery_fee > 0 && <span>+ ₱{selectedSale.delivery_fee.toLocaleString()} delivery</span>}
                  {selectedSale.discount > 0 && <span>- ₱{selectedSale.discount.toLocaleString()} discount</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Proof Image Lightbox */}
      {previewProofImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewProofImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewProofImage(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
            <img
              src={previewProofImage}
              alt="Return proof"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
