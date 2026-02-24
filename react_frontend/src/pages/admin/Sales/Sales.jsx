import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, FileText, CheckCircle, Trash2, XCircle, Clock, Ban, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, useToast, Skeleton, SkeletonStats, SkeletonTable } from '../../../components/ui';

const SkeletonChart = () => (
  <div className="p-4 bg-white rounded-xl border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div>
        <Skeleton variant="title" width="w-32" className="mb-2" />
        <Skeleton variant="text" width="w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" width="w-16" />
        <Skeleton variant="button" width="w-16" />
        <Skeleton variant="button" width="w-16" />
      </div>
    </div>
    <Skeleton variant="custom" className="h-[280px] w-full rounded-lg" />
  </div>
);

const SkeletonDonut = () => (
  <div className="p-4 bg-white rounded-xl border border-gray-100">
    <Skeleton variant="title" width="w-24" className="mb-2" />
    <Skeleton variant="text" width="w-40" className="mb-4" />
    <div className="flex items-center justify-center">
      <Skeleton variant="circle" width="w-[180px]" height="h-[180px]" />
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton variant="text" width="w-full" />
      <Skeleton variant="text" width="w-3/4" />
      <Skeleton variant="text" width="w-1/2" />
    </div>
  </div>
);

const Sales = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ invoice: '', customer: '', date: '', items: '', amount: '', status: 'Pending' });
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const sales = [
    { id: 1, invoice: 'ORD-001', customer: 'Juan Dela Cruz', date: '2026-02-01', items: 5, amount: 12500, status: 'Completed' },
    { id: 2, invoice: 'ORD-002', customer: 'Maria Santos', date: '2026-02-01', items: 3, amount: 8750, status: 'Pending' },
    { id: 3, invoice: 'ORD-003', customer: 'Pedro Garcia', date: '2026-01-30', items: 8, amount: 15200, status: 'Completed' },
    { id: 4, invoice: 'ORD-004', customer: 'Ana Reyes', date: '2026-01-28', items: 2, amount: 6300, status: 'Cancelled' },
    { id: 5, invoice: 'ORD-005', customer: 'Jose Rizal', date: '2026-01-27', items: 4, amount: 9800, status: 'Completed' },
    { id: 6, invoice: 'ORD-006', customer: 'Andres Bonifacio', date: '2026-01-26', items: 6, amount: 18400, status: 'Completed' },
    { id: 7, invoice: 'ORD-007', customer: 'Emilio Aguinaldo', date: '2026-01-25', items: 2, amount: 5200, status: 'Pending' },
    { id: 8, invoice: 'ORD-008', customer: 'Apolinario Mabini', date: '2026-01-24', items: 10, amount: 24500, status: 'Completed' },
    { id: 9, invoice: 'ORD-009', customer: 'Gabriela Silang', date: '2026-01-23', items: 1, amount: 3200, status: 'Completed' },
    { id: 10, invoice: 'ORD-010', customer: 'Melchora Aquino', date: '2026-01-22', items: 7, amount: 16800, status: 'Pending' },
    { id: 11, invoice: 'ORD-011', customer: 'Diego Silang', date: '2026-01-21', items: 4, amount: 11200, status: 'Completed' },
    { id: 12, invoice: 'ORD-012', customer: 'Lapu-Lapu', date: '2026-01-20', items: 3, amount: 7500, status: 'Cancelled' },
    { id: 13, invoice: 'ORD-013', customer: 'Antonio Luna', date: '2026-01-19', items: 5, amount: 13000, status: 'Voided' },
    { id: 14, invoice: 'ORD-014', customer: 'Manuel Quezon', date: '2026-01-18', items: 2, amount: 4800, status: 'Voided' },
  ];

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Voided', label: 'Voided' },
  ];

  const statusTabs = [
    { value: 'All', label: 'All', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-button-500', activeText: 'text-white' },
    { value: 'Completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', activeBg: 'bg-green-500', activeText: 'text-white' },
    { value: 'Pending', label: 'Pending', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', activeBg: 'bg-yellow-500', activeText: 'text-white' },
    { value: 'Cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
    { value: 'Voided', label: 'Voided', icon: Ban, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-500', activeText: 'text-white' },
  ];

  const filteredSalesByTab = useMemo(() => {
    if (activeStatusTab === 'All') return sales;
    return sales.filter(s => s.status === activeStatusTab);
  }, [sales, activeStatusTab]);

  const handleAdd = () => {
    const nextInvoice = `ORD-${String(sales.length + 1).padStart(3, '0')}`;
    setFormData({ invoice: nextInvoice, customer: '', date: new Date().toISOString().split('T')[0], items: '', amount: '', status: 'Pending' });
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
    toast.success('Sale Created', `Order ${formData.invoice} has been created.`);
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = () => {
    toast.success('Sale Updated', `Order  ${formData.invoice} has been updated.`);
    setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    toast.success('Sale Deleted', `Order ${selectedItem.invoice} has been removed.`);
    setIsDeleteModalOpen(false);
  };

  // Stats
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const completedSales = sales.filter(s => s.status === 'Completed');
  const totalItems = sales.reduce((sum, s) => sum + s.items, 0);

  // Helper function to get days in a month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Chart data based on chartPeriod
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (chartPeriod === 'daily') {
      // Show all days in current month
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      
      // Group sales by day
      const dayGroups = {};
      sales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          const day = date.getDate();
          if (!dayGroups[day]) {
            dayGroups[day] = 0;
          }
          dayGroups[day] += s.amount;
        }
      });

      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        sales: dayGroups[i + 1] || 0,
      }));
    } else if (chartPeriod === 'monthly') {
      // Show all months in current year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Group sales by month
      const monthGroups = {};
      sales.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) {
            monthGroups[month] = 0;
          }
          monthGroups[month] += s.amount;
        }
      });

      return months.map((name, i) => ({
        name,
        sales: monthGroups[i] || 0,
      }));
    } else {
      // Yearly - current year and past 5 years
      const years = [];
      for (let i = 5; i >= 0; i--) {
        years.push(currentYear - i);
      }
      
      // Group sales by year
      const yearGroups = {};
      sales.forEach(s => {
        const date = new Date(s.date);
        const year = date.getFullYear();
        if (!yearGroups[year]) {
          yearGroups[year] = 0;
        }
        yearGroups[year] += s.amount;
      });

      return years.map(year => ({
        name: year.toString(),
        sales: yearGroups[year] || 0,
      }));
    }
  }, [sales, chartPeriod]);

  // Average daily sales (for current month)
  const avgPerDay = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    const monthSales = sales.filter(s => {
      const date = new Date(s.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).reduce((sum, s) => sum + s.amount, 0);
    
    return Math.floor(monthSales / daysInMonth);
  }, [sales]);

  const statusBreakdown = [
    { name: 'Completed', value: completedSales.length, color: '#22c55e' },
    { name: 'Pending', value: sales.filter(s => s.status === 'Pending').length, color: '#eab308' },
    { name: 'Cancelled', value: sales.filter(s => s.status === 'Cancelled').length, color: '#ef4444' },
    { name: 'Voided', value: sales.filter(s => s.status === 'Voided').length, color: '#f97316' },
  ];

  const columns = [
    { header: 'Order', accessor: 'invoice' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Date', accessor: 'date' },
    { header: 'Items', accessor: 'items' },
    { header: 'Amount', accessor: 'amount', cell: (row) => `₱${row.amount.toLocaleString()}` },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onView={() => toast.info('View Order', `Viewing ${row.invoice}`)} onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
    )},
  ];

  return (
    <div>
      <PageHeader title="Sales" description="View and manage all sales transactions" icon={TrendingUp} />

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Sales" value={`₱${totalSales.toLocaleString()}`} unit="this month" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Total Orders" value={sales.length} unit="orders" icon={FileText} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Items Sold" value={totalItems} unit="items" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Completed" value={completedSales.length} unit="orders" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
      </div>
      )}

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonDonut />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <LineChart title="Sales Trends" subtitle="Sales performance overview" data={chartData} lines={[{ dataKey: 'sales', name: 'Sales (₱)' }]} height={280} yAxisUnit="₱" tabs={[{ label: 'Daily', value: 'daily' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }]} activeTab={chartPeriod} onTabChange={setChartPeriod} summaryStats={[{ label: 'Total Revenue', value: `₱${totalSales.toLocaleString()}`, color: 'text-primary-600' }, { label: 'Avg per Day', value: `₱${avgPerDay.toLocaleString()}`, color: 'text-primary-600' }, { label: 'Orders', value: sales.length.toString(), color: 'text-green-600' }]} />
        </div>
        <DonutChart title="Order Status" subtitle="Sales by status" data={statusBreakdown} centerValue={sales.length} centerLabel="Orders" height={180} />
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
              const count = tab.value === 'All' ? sales.length : sales.filter(s => s.status === tab.value).length;
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

      <DataTable title="Sales Records" subtitle={activeStatusTab === 'All' ? 'Manage all sales transactions' : `Showing ${activeStatusTab.toLowerCase()} orders`} columns={columns} data={filteredSalesByTab} searchPlaceholder="Search sales..." dateFilterField="date" />
      </>
      )}

      {/* Modals */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Create Sale" submitText="Create Sale" size="lg">
        {({ submitted }) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Invoice No." name="invoice" value={formData.invoice} onChange={handleFormChange} required disabled submitted={submitted} />
              <FormInput label="Date" name="date" type="date" value={formData.date} onChange={handleFormChange} required submitted={submitted} />
            </div>
            <FormInput label="Customer" name="customer" value={formData.customer} onChange={handleFormChange} required placeholder="Enter customer name" submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Items" name="items" type="number" value={formData.items} onChange={handleFormChange} required placeholder="0" submitted={submitted} />
              <FormInput label="Amount (₱)" name="amount" type="number" value={formData.amount} onChange={handleFormChange} required placeholder="0.00" submitted={submitted} />
            </div>
            <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
          </>
        )}
      </FormModal>

      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Sale" submitText="Save Changes" size="lg">
        {({ submitted }) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Invoice No." name="invoice" value={formData.invoice} onChange={handleFormChange} required disabled submitted={submitted} />
              <FormInput label="Date" name="date" type="date" value={formData.date} onChange={handleFormChange} required submitted={submitted} />
            </div>
            <FormInput label="Customer" name="customer" value={formData.customer} onChange={handleFormChange} required placeholder="Enter customer name" submitted={submitted} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Items" name="items" type="number" value={formData.items} onChange={handleFormChange} required placeholder="0" submitted={submitted} />
              <FormInput label="Amount (₱)" name="amount" type="number" value={formData.amount} onChange={handleFormChange} required placeholder="0.00" submitted={submitted} />
            </div>
            <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
          </>
        )}
      </FormModal>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Sale" message={`Are you sure you want to delete "${selectedItem?.invoice}"? This action cannot be undone.`} confirmText="Delete" variant="danger" icon={Trash2} />
    </div>
  );
};

export default Sales;
