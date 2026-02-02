import { useState } from 'react';
import { Warehouse, Package, AlertTriangle, XCircle, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Eye, BarChart3, Trash2, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, BarChart, Tabs, DateFilter, LineChart, FormModal, ConfirmModal, FormInput, FormSelect, useToast } from '../../../components/ui';

const Inventory = () => {
  const toast = useToast();
  const [dateFilter, setDateFilter] = useState({ type: 'daily' });
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', stock: '', price: '', status: 'In Stock' });

  const inventory = [
    { id: 1, name: 'Premium Jasmine Rice', sku: 'PJR-001', category: 'Premium Rice', stock: 150, price: '₱850', status: 'In Stock' },
    { id: 2, name: 'Long Grain Rice', sku: 'LGR-002', category: 'Regular Rice', stock: 8, price: '₱650', status: 'Low Stock' },
    { id: 3, name: 'Brown Rice', sku: 'BR-003', category: 'Brown Rice', stock: 45, price: '₱750', status: 'In Stock' },
    { id: 4, name: 'Glutinous Rice', sku: 'GR-004', category: 'Glutinous Rice', stock: 0, price: '₱900', status: 'Out of Stock' },
    { id: 5, name: 'Basmati Rice', sku: 'BSM-005', category: 'Specialty Rice', stock: 72, price: '₱1,200', status: 'In Stock' },
    { id: 6, name: 'Red Rice', sku: 'RR-006', category: 'Specialty Rice', stock: 35, price: '₱950', status: 'In Stock' },
    { id: 7, name: 'Black Rice', sku: 'BLR-007', category: 'Specialty Rice', stock: 5, price: '₱1,100', status: 'Low Stock' },
    { id: 8, name: 'Jasmine Rice', sku: 'JR-008', category: 'Regular Rice', stock: 120, price: '₱700', status: 'In Stock' },
    { id: 9, name: 'Organic Brown Rice', sku: 'OBR-009', category: 'Organic Rice', stock: 0, price: '₱1,050', status: 'Out of Stock' },
    { id: 10, name: 'Sinandomeng Rice', sku: 'SDR-010', category: 'Premium Rice', stock: 88, price: '₱780', status: 'In Stock' },
    { id: 11, name: 'Dinorado Rice', sku: 'DNR-011', category: 'Premium Rice', stock: 62, price: '₱820', status: 'In Stock' },
    { id: 12, name: 'NFA Rice', sku: 'NFA-012', category: 'Regular Rice', stock: 200, price: '₱450', status: 'In Stock' },
  ];

  // In/Out data
  const stockMovements = [
    { id: 1, date: '2026-01-31', product: 'Premium Jasmine Rice', type: 'In', quantity: 50, source: 'Golden Harvest Farm' },
    { id: 2, date: '2026-01-31', product: 'Long Grain Rice', type: 'Out', quantity: 25, source: 'ABC Grocery Store' },
    { id: 3, date: '2026-01-30', product: 'Basmati Rice', type: 'In', quantity: 30, source: 'Pacific Rice Trading' },
    { id: 4, date: '2026-01-30', product: 'Sinandomeng Rice', type: 'Out', quantity: 40, source: 'XYZ Mart' },
    { id: 5, date: '2026-01-29', product: 'Brown Rice', type: 'In', quantity: 20, source: 'Green Valley Crops' },
    { id: 6, date: '2026-01-29', product: 'Red Rice', type: 'Out', quantity: 15, source: 'Fresh Market' },
    { id: 7, date: '2026-01-28', product: 'NFA Rice', type: 'In', quantity: 100, source: 'Farmland Supply' },
    { id: 8, date: '2026-01-28', product: 'Dinorado Rice', type: 'Out', quantity: 30, source: 'Metro Supermarket' },
  ];

  // Comparison data based on date filter
  const getComparisonData = () => {
    if (dateFilter.type === 'daily') {
      return {
        title: 'Product Growth Analysis',
        subtitle: 'Comparing Yesterday (1/30/2026) vs Today (1/31/2026)',
        currentLabel: 'Today',
        previousLabel: 'Yesterday',
        current: { label: 'Today (Jan 31)', stock: 785, in: 50, out: 25 },
        previous: { label: 'Yesterday (Jan 30)', stock: 760, in: 30, out: 40 },
      };
    } else if (dateFilter.type === 'monthly') {
      return {
        title: 'Product Growth Analysis',
        subtitle: 'Comparing December 2025 vs January 2026',
        currentLabel: 'Jan 2026',
        previousLabel: 'Dec 2025',
        current: { label: 'January 2026', stock: 785, in: 420, out: 355 },
        previous: { label: 'December 2025', stock: 720, in: 380, out: 310 },
      };
    } else if (dateFilter.type === 'yearly') {
      return {
        title: 'Product Growth Analysis',
        subtitle: 'Comparing 2025 vs 2026',
        currentLabel: '2026',
        previousLabel: '2025',
        current: { label: '2026', stock: 785, in: 420, out: 355 },
        previous: { label: '2025', stock: 650, in: 3200, out: 2800 },
      };
    } else {
      return {
        title: 'Product Growth Analysis',
        subtitle: `Comparing ${dateFilter.start || 'Start'} vs ${dateFilter.end || 'End'}`,
        currentLabel: dateFilter.end || 'End',
        previousLabel: dateFilter.start || 'Start',
        current: { label: dateFilter.end || 'End Date', stock: 785, in: 150, out: 120 },
        previous: { label: dateFilter.start || 'Start Date', stock: 720, in: 130, out: 100 },
      };
    }
  };

  const comparisonData = getComparisonData();

  // Product-level growth data
  const productGrowthData = [
    { id: 1, name: 'Premium Jasmine Rice', category: 'Premium Rice', previous: 140, current: 150, change: 10, percentChange: 7.1, trend: 'up' },
    { id: 2, name: 'Long Grain Rice', category: 'Regular Rice', previous: 15, current: 8, change: -7, percentChange: -46.7, trend: 'down' },
    { id: 3, name: 'Brown Rice', category: 'Brown Rice', previous: 40, current: 45, change: 5, percentChange: 12.5, trend: 'up' },
    { id: 4, name: 'Glutinous Rice', category: 'Glutinous Rice', previous: 5, current: 0, change: -5, percentChange: -100, trend: 'down' },
    { id: 5, name: 'Basmati Rice', category: 'Specialty Rice', previous: 68, current: 72, change: 4, percentChange: 5.9, trend: 'up' },
    { id: 6, name: 'Red Rice', category: 'Specialty Rice', previous: 42, current: 35, change: -7, percentChange: -16.7, trend: 'down' },
    { id: 7, name: 'Black Rice', category: 'Specialty Rice', previous: 8, current: 5, change: -3, percentChange: -37.5, trend: 'down' },
    { id: 8, name: 'Jasmine Rice', category: 'Regular Rice', previous: 110, current: 120, change: 10, percentChange: 9.1, trend: 'up' },
    { id: 9, name: 'Organic Brown Rice', category: 'Organic Rice', previous: 3, current: 0, change: -3, percentChange: -100, trend: 'down' },
    { id: 10, name: 'Sinandomeng Rice', category: 'Premium Rice', previous: 80, current: 88, change: 8, percentChange: 10.0, trend: 'up' },
    { id: 11, name: 'Dinorado Rice', category: 'Premium Rice', previous: 75, current: 62, change: -13, percentChange: -17.3, trend: 'down' },
    { id: 12, name: 'NFA Rice', category: 'Regular Rice', previous: 174, current: 200, change: 26, percentChange: 14.9, trend: 'up' },
  ];

  // Stats
  const totalProducts = inventory.length;
  const totalStock = inventory.reduce((sum, p) => sum + p.stock, 0);
  const lowStockItems = inventory.filter(p => p.status === 'Low Stock').length;
  const outOfStockItems = inventory.filter(p => p.status === 'Out of Stock').length;

  // In/Out Stats
  const totalIn = stockMovements.filter(m => m.type === 'In').reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = stockMovements.filter(m => m.type === 'Out').reduce((sum, m) => sum + m.quantity, 0);

  // Growth Stats
  const currentMonthStock = totalStock;
  const previousMonthStock = comparisonData.previous.stock;
  const growthRate = ((currentMonthStock - previousMonthStock) / previousMonthStock * 100).toFixed(1);
  const isPositiveGrowth = growthRate > 0;

  // Chart data - stock by category
  const categoryStock = inventory.reduce((acc, item) => {
    const existing = acc.find(c => c.name === item.category);
    if (existing) existing.stock += item.stock;
    else acc.push({ name: item.category, stock: item.stock });
    return acc;
  }, []);

  // Growth chart data
  const growthData = [
    { name: 'Aug', stock: 680, in: 120, out: 90 },
    { name: 'Sep', stock: 710, in: 150, out: 120 },
    { name: 'Oct', stock: 690, in: 100, out: 120 },
    { name: 'Nov', stock: 720, in: 180, out: 150 },
    { name: 'Dec', stock: 750, in: 200, out: 170 },
    { name: 'Jan', stock: 785, in: 220, out: 185 },
  ];

  // Handlers
  const handleAdd = () => {
    setFormData({ name: '', sku: '', category: '', stock: '', price: '', status: 'In Stock' });
    setIsAddModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({ ...item, price: item.price.replace('₱', '').replace(',', '') });
    setIsEditModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = () => {
    toast.success('Product Added', `${formData.name} has been added to inventory.`);
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = () => {
    toast.success('Product Updated', `${formData.name} has been updated.`);
    setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    toast.success('Product Deleted', `${selectedItem.name} has been removed from inventory.`);
    setIsDeleteModalOpen(false);
  };

  const categoryOptions = [
    { value: 'Premium Rice', label: 'Premium Rice' },
    { value: 'Regular Rice', label: 'Regular Rice' },
    { value: 'Specialty Rice', label: 'Specialty Rice' },
    { value: 'Organic Rice', label: 'Organic Rice' },
    { value: 'Brown Rice', label: 'Brown Rice' },
    { value: 'Glutinous Rice', label: 'Glutinous Rice' },
  ];

  const statusOptions = [
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
  ];

  const columns = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    { header: 'Stock', accessor: 'stock' },
    { header: 'Price', accessor: 'price' },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onView={() => toast.info('View Product', `Viewing ${row.name}`)} onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
    )},
  ];

  const movementColumns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Product', accessor: 'product' },
    { header: 'Type', accessor: 'type', cell: (row) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
        row.type === 'In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {row.type === 'In' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
        {row.type}
      </span>
    )},
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Source/Destination', accessor: 'source' },
  ];

  // Product-level comparison columns
  const productGrowthColumns = [
    { header: 'Product', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    { header: comparisonData.previousLabel, accessor: 'previous', cell: (row) => <span className="font-medium text-gray-600">{row.previous} units</span> },
    { header: comparisonData.currentLabel, accessor: 'current', cell: (row) => <span className="font-semibold text-gray-800">{row.current} units</span> },
    { header: 'Change', accessor: 'change', cell: (row) => {
      const isPositive = row.change >= 0;
      return (
        <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{row.change} ({isPositive ? '+' : ''}{row.percentChange.toFixed(1)}%)
        </span>
      );
    }},
    { header: 'Trend', accessor: 'trend', cell: (row) => {
      const isPositive = row.trend === 'up';
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? 'Growth' : 'Decline'}
        </div>
      );
    }},
  ];

  // Comparison table columns (for summary)
  const comparisonColumns = [
    { header: 'Metric', accessor: 'metric' },
    { header: comparisonData.current.label, accessor: 'current' },
    { header: comparisonData.previous.label, accessor: 'previous' },
    { header: 'Change', accessor: 'change', cell: (row) => {
      const change = row.currentVal - row.previousVal;
      const percentage = row.previousVal > 0 ? ((change / row.previousVal) * 100).toFixed(1) : 0;
      const isPositive = change >= 0;
      return (
        <span className={`inline-flex items-center gap-1 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? '+' : ''}{change} ({isPositive ? '+' : ''}{percentage}%)
        </span>
      );
    }},
  ];

  const comparisonTableData = [
    { id: 1, metric: 'Total Stock', current: `${comparisonData.current.stock} units`, previous: `${comparisonData.previous.stock} units`, currentVal: comparisonData.current.stock, previousVal: comparisonData.previous.stock },
    { id: 2, metric: 'Stock In', current: `${comparisonData.current.in} units`, previous: `${comparisonData.previous.in} units`, currentVal: comparisonData.current.in, previousVal: comparisonData.previous.in },
    { id: 3, metric: 'Stock Out', current: `${comparisonData.current.out} units`, previous: `${comparisonData.previous.out} units`, currentVal: comparisonData.current.out, previousVal: comparisonData.previous.out },
    { id: 4, metric: 'Net Change', current: `${comparisonData.current.in - comparisonData.current.out} units`, previous: `${comparisonData.previous.in - comparisonData.previous.out} units`, currentVal: comparisonData.current.in - comparisonData.current.out, previousVal: comparisonData.previous.in - comparisonData.previous.out },
  ];

  // Tab contents
  const OverviewTab = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Products" value={totalProducts} unit="items" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Total Stock" value={totalStock.toLocaleString()} unit="units" icon={Warehouse} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
        <StatsCard label="Low Stock" value={lowStockItems} unit="items" icon={AlertTriangle} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Out of Stock" value={outOfStockItems} unit="items" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
      </div>
      <div className="mb-6">
        <BarChart title="Stock by Category" subtitle="Current inventory levels per category" data={categoryStock} bars={[{ dataKey: 'stock', name: 'Stock' }]} height={200} layout="vertical" showLegend={false} />
      </div>
      <DataTable title="Inventory Items" subtitle="All products in stock" columns={columns} data={inventory} searchPlaceholder="Search inventory..." filterField="category" filterPlaceholder="All Categories" onAdd={handleAdd} addLabel="Add Product" />
    </>
  );

  const InOutTab = () => (
    <>
      <div className="mb-6">
        <DateFilter onChange={setDateFilter} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total In" value={totalIn} unit="units" icon={ArrowDownCircle} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Total Out" value={totalOut} unit="units" icon={ArrowUpCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
        <StatsCard label="Net Change" value={totalIn - totalOut} unit="units" icon={TrendingUp} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Movements" value={stockMovements.length} unit="transactions" icon={BarChart3} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
      </div>
      <DataTable title="Stock Movements" subtitle="Track all inventory in/out transactions" columns={movementColumns} data={stockMovements} searchPlaceholder="Search movements..." filterField="type" filterOptions={['In', 'Out']} filterPlaceholder="All Types" />
    </>
  );

  const GrowthAnalysisTab = () => (
    <>
      <div className="mb-6">
        <DateFilter onChange={setDateFilter} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Current Stock" value={currentMonthStock} unit="units" icon={Warehouse} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Previous Period" value={previousMonthStock} unit="units" icon={Package} iconBgColor="bg-gradient-to-br from-gray-400 to-gray-600" />
        <StatsCard label="Growth Rate" value={`${isPositiveGrowth ? '+' : ''}${growthRate}%`} unit="vs last period" icon={isPositiveGrowth ? TrendingUp : TrendingDown} iconBgColor={isPositiveGrowth ? "bg-gradient-to-br from-button-400 to-button-600" : "bg-gradient-to-br from-red-400 to-red-600"} />
        <StatsCard label="Avg Daily Movement" value={Math.round((totalIn + totalOut) / 7)} unit="units/day" icon={BarChart3} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
      </div>

      {/* Growth Chart - First */}
      <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Stock Growth Trend</h3>
        <p className="text-sm text-gray-500 mb-4">Monthly stock levels and movements over time</p>
        <LineChart data={growthData} lines={[{ dataKey: 'stock', name: 'Total Stock' }, { dataKey: 'in', name: 'Stock In' }, { dataKey: 'out', name: 'Stock Out', color: '#ef4444' }]} height={300} showLegend={true} />
      </div>

      {/* Product Growth Comparison Table - Second */}
      <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">{comparisonData.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{comparisonData.subtitle}</p>
        {productGrowthData.length > 0 ? (
          <DataTable 
            columns={productGrowthColumns} 
            data={productGrowthData} 
            searchPlaceholder="Search products..." 
            filterField="category" 
            filterPlaceholder="All Categories" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <TrendingUp size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">No growth data available for this period</p>
            <p className="text-sm">Try selecting a different date range</p>
          </div>
        )}
      </div>
    </>
  );

  const tabs = [
    { label: 'Overview', icon: Eye, content: <OverviewTab /> },
    { label: 'In/Out', icon: ArrowDownCircle, content: <InOutTab /> },
    { label: 'Growth Analysis', icon: TrendingUp, content: <GrowthAnalysisTab /> },
  ];

  return (
    <div>
      <PageHeader title="Inventory" description="Track and manage your product stock levels" icon={Warehouse} />
      <Tabs tabs={tabs} />

      {/* Add Modal */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Product" submitText="Add Product" size="lg">
        {({ submitted }) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Product Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter product name" submitted={submitted} />
              <FormInput label="SKU" name="sku" value={formData.sku} onChange={handleFormChange} required placeholder="e.g. PJR-001" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Category" name="category" value={formData.category} onChange={handleFormChange} options={categoryOptions} required submitted={submitted} />
              <FormInput label="Stock" name="stock" type="number" value={formData.stock} onChange={handleFormChange} required placeholder="0" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Price (₱)" name="price" type="number" value={formData.price} onChange={handleFormChange} required placeholder="0.00" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Product" submitText="Save Changes" size="lg">
        {({ submitted }) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Product Name" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter product name" submitted={submitted} />
              <FormInput label="SKU" name="sku" value={formData.sku} onChange={handleFormChange} required placeholder="e.g. PJR-001" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Category" name="category" value={formData.category} onChange={handleFormChange} options={categoryOptions} required submitted={submitted} />
              <FormInput label="Stock" name="stock" type="number" value={formData.stock} onChange={handleFormChange} required placeholder="0" submitted={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Price (₱)" name="price" type="number" value={formData.price} onChange={handleFormChange} required placeholder="0.00" submitted={submitted} />
              <FormSelect label="Status" name="status" value={formData.status} onChange={handleFormChange} options={statusOptions} required submitted={submitted} />
            </div>
          </>
        )}
      </FormModal>

      {/* Delete Modal */}
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Product" message={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" icon={Trash2} />
    </div>
  );
};

export default Inventory;
