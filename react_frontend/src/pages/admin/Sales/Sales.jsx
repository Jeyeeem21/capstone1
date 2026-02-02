import { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, useToast } from '../../../components/ui';

const Sales = () => {
  const toast = useToast();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ invoice: '', customer: '', date: '', items: '', amount: '', status: 'Pending' });

  const sales = [
    { id: 1, invoice: 'INV-001', customer: 'Juan Dela Cruz', date: '2026-02-01', items: 5, amount: 12500, status: 'Completed' },
    { id: 2, invoice: 'INV-002', customer: 'Maria Santos', date: '2026-02-01', items: 3, amount: 8750, status: 'Pending' },
    { id: 3, invoice: 'INV-003', customer: 'Pedro Garcia', date: '2026-01-30', items: 8, amount: 15200, status: 'Completed' },
    { id: 4, invoice: 'INV-004', customer: 'Ana Reyes', date: '2026-01-28', items: 2, amount: 6300, status: 'Cancelled' },
    { id: 5, invoice: 'INV-005', customer: 'Jose Rizal', date: '2026-01-27', items: 4, amount: 9800, status: 'Completed' },
    { id: 6, invoice: 'INV-006', customer: 'Andres Bonifacio', date: '2026-01-26', items: 6, amount: 18400, status: 'Completed' },
    { id: 7, invoice: 'INV-007', customer: 'Emilio Aguinaldo', date: '2026-01-25', items: 2, amount: 5200, status: 'Pending' },
    { id: 8, invoice: 'INV-008', customer: 'Apolinario Mabini', date: '2026-01-24', items: 10, amount: 24500, status: 'Completed' },
    { id: 9, invoice: 'INV-009', customer: 'Gabriela Silang', date: '2026-01-23', items: 1, amount: 3200, status: 'Completed' },
    { id: 10, invoice: 'INV-010', customer: 'Melchora Aquino', date: '2026-01-22', items: 7, amount: 16800, status: 'Pending' },
    { id: 11, invoice: 'INV-011', customer: 'Diego Silang', date: '2026-01-21', items: 4, amount: 11200, status: 'Completed' },
    { id: 12, invoice: 'INV-012', customer: 'Lapu-Lapu', date: '2026-01-20', items: 3, amount: 7500, status: 'Cancelled' },
  ];

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const handleAdd = () => {
    const nextInvoice = `INV-${String(sales.length + 1).padStart(3, '0')}`;
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
    toast.success('Sale Created', `Invoice ${formData.invoice} has been created.`);
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = () => {
    toast.success('Sale Updated', `Invoice ${formData.invoice} has been updated.`);
    setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    toast.success('Sale Deleted', `Invoice ${selectedItem.invoice} has been removed.`);
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
  ];

  const columns = [
    { header: 'Invoice', accessor: 'invoice' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Date', accessor: 'date' },
    { header: 'Items', accessor: 'items' },
    { header: 'Amount', accessor: 'amount', cell: (row) => `₱${row.amount.toLocaleString()}` },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onView={() => toast.info('View Sale', `Viewing ${row.invoice}`)} onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
    )},
  ];

  return (
    <div>
      <PageHeader title="Sales" description="View and manage all sales transactions" icon={TrendingUp} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Sales" value={`₱${totalSales.toLocaleString()}`} unit="this month" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Total Orders" value={sales.length} unit="orders" icon={FileText} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Items Sold" value={totalItems} unit="items" icon={ShoppingBag} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Completed" value={completedSales.length} unit="orders" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <LineChart title="Sales Trends" subtitle="Sales performance overview" data={chartData} lines={[{ dataKey: 'sales', name: 'Sales (₱)' }]} height={280} tabs={[{ label: 'Daily', value: 'daily' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }]} activeTab={chartPeriod} onTabChange={setChartPeriod} summaryStats={[{ label: 'Total Revenue', value: `₱${totalSales.toLocaleString()}`, color: 'text-primary-600' }, { label: 'Avg per Day', value: `₱${avgPerDay.toLocaleString()}`, color: 'text-primary-600' }, { label: 'Orders', value: sales.length.toString(), color: 'text-green-600' }]} />
        </div>
        <DonutChart title="Order Status" subtitle="Sales by status" data={statusBreakdown} centerValue={sales.length} centerLabel="Orders" height={180} />
      </div>

      <DataTable title="Sales Records" subtitle="Manage all sales transactions" columns={columns} data={sales} searchPlaceholder="Search sales..." filterField="status" filterPlaceholder="All Status" onAdd={handleAdd} addLabel="New Sale" />

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
