import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, CheckCircle, TrendingUp, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, LineChart, DonutChart } from '../../../components/ui';

// Helper to get CSS variable value
const getCSSVariable = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const Dashboard = () => {
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [themeColors, setThemeColors] = useState({
    primary: '#22c55e',
    secondary: '#eab308',
    button: '#22c55e'
  });

  // Listen for theme changes
  useEffect(() => {
    const updateColors = () => {
      setThemeColors({
        primary: getCSSVariable('--color-primary-500') || '#22c55e',
        secondary: getCSSVariable('--color-button-secondary') || '#eab308',
        button: getCSSVariable('--color-button-500') || '#22c55e'
      });
    };
    
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => observer.disconnect();
  }, []);

  // Generate daily data for the chart
  const generateDailyData = () => {
    return Array.from({ length: 31 }, (_, i) => ({
      name: `Jan ${i + 1}`,
      input: Math.floor(Math.random() * 500) + 200,
      output: Math.floor(Math.random() * 400) + 150,
    }));
  };

  const chartData = generateDailyData();
  const totalInput = chartData.reduce((sum, d) => sum + d.input, 0);
  const totalOutput = chartData.reduce((sum, d) => sum + d.output, 0);

  // Use theme colors for breakdown data - will update when themeColors changes
  const breakdownData = [
    { name: 'Milled Rice', value: Math.floor(totalOutput * 0.85), color: themeColors.button },
    { name: 'Husk', value: Math.floor(totalOutput * 0.10), color: '#ef4444' },
    { name: 'Other Waste', value: Math.floor(totalOutput * 0.05), color: '#f97316' },
  ];

  const recentSales = [
    { id: 1, invoice: 'INV-001', customer: 'Juan Dela Cruz', date: '2026-01-31', amount: '₱12,500', status: 'Completed' },
    { id: 2, invoice: 'INV-002', customer: 'Maria Santos', date: '2026-01-30', amount: '₱8,750', status: 'Pending' },
    { id: 3, invoice: 'INV-003', customer: 'Pedro Garcia', date: '2026-01-29', amount: '₱15,200', status: 'Completed' },
    { id: 4, invoice: 'INV-004', customer: 'Ana Reyes', date: '2026-01-28', amount: '₱6,300', status: 'Cancelled' },
    { id: 5, invoice: 'INV-005', customer: 'Jose Rizal', date: '2026-01-27', amount: '₱9,800', status: 'Completed' },
  ];

  const columns = [
    { header: 'Invoice', accessor: 'invoice' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Date', accessor: 'date' },
    { header: 'Amount', accessor: 'amount' },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your business performance"
        icon={LayoutDashboard}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          label="Total Input" 
          value={totalInput.toLocaleString()} 
          unit="kg palay" 
          icon={Package}
          iconBgColor="bg-gradient-to-br from-button-400 to-button-600"
        />
        <StatsCard 
          label="Total Output" 
          value={totalOutput.toLocaleString()} 
          unit="kg rice" 
          icon={CheckCircle}
          iconBgColor="bg-gradient-to-br from-button-500 to-button-600"
        />
        <StatsCard 
          label="Average Yield" 
          value={((totalOutput / totalInput) * 100).toFixed(2)} 
          unit="%" 
          icon={TrendingUp}
          iconBgColor="bg-gradient-to-br from-button-400 to-button-500"
        />
        <StatsCard 
          label="Total Records" 
          value={recentSales.length} 
          unit="entries" 
          icon={FileText}
          iconBgColor="bg-gradient-to-br from-button-500 to-button-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <LineChart
            title="Processing Trends"
            subtitle="Production performance overview"
            data={chartData}
            lines={[
              { dataKey: 'input', name: 'Input (kg)', color: themeColors.secondary, dashed: true },
              { dataKey: 'output', name: 'Output (kg)', color: themeColors.button },
            ]}
            height={280}
            tabs={[
              { label: 'Daily', value: 'daily' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Yearly', value: 'yearly' },
            ]}
            activeTab={chartPeriod}
            onTabChange={setChartPeriod}
            summaryStats={[
              { label: 'Total Output', value: `${totalOutput.toLocaleString()} kg`, color: 'text-primary-600' },
              { label: 'Avg per Day', value: `${Math.floor(totalOutput / 31).toLocaleString()} kg`, color: 'text-primary-600' },
              { label: 'Growth', value: '+12%', color: 'text-green-600' },
            ]}
          />
        </div>
        <DonutChart
          title="Processing Breakdown"
          subtitle="Output vs waste distribution"
          data={breakdownData}
          centerValue={`${totalOutput.toLocaleString()} kg`}
          centerLabel="Total Output"
          height={180}
        />
      </div>

      {/* Recent Sales */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Sales</h2>
        <DataTable
          columns={columns}
          data={recentSales}
          searchPlaceholder="Search sales..."
          defaultItemsPerPage={5}
          filterField="status"
          filterPlaceholder="All Status"
        />
      </div>
    </div>
  );
};

export default Dashboard;
