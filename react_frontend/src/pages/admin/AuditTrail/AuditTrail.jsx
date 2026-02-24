import { useState, useEffect } from 'react';
import { ClipboardList, User, Calendar, Clock, Filter, Eye, FileText, Package, ShoppingCart, UserCog, Settings, TrendingUp, Monitor } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatsCard, FormModal, useToast, Skeleton, SkeletonStats, SkeletonTable } from '../../../components/ui';

const AuditTrail = () => {
  const toast = useToast();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Mock audit trail data
  const auditLogs = [
    { id: 1, action: 'CREATE', module: 'Products', description: 'Added new product "Premium Rice 25kg"', user: 'John Smith', role: 'Manager', ipAddress: '192.168.1.100', timestamp: '2026-02-01 14:32:15', details: { productName: 'Premium Rice 25kg', price: 1250, category: 'Rice' } },
    { id: 2, action: 'UPDATE', module: 'Inventory', description: 'Updated stock quantity for "Jasmine Rice 5kg"', user: 'Mike Wilson', role: 'Inventory Staff', ipAddress: '192.168.1.102', timestamp: '2026-02-01 14:15:42', details: { productName: 'Jasmine Rice 5kg', oldQty: 150, newQty: 200 } },
    { id: 3, action: 'DELETE', module: 'Partners', description: 'Removed supplier "ABC Trading"', user: 'Amanda Reyes', role: 'Manager', ipAddress: '192.168.1.101', timestamp: '2026-02-01 13:58:20', details: { supplierName: 'ABC Trading', reason: 'Business closed' } },
    { id: 4, action: 'LOGIN', module: 'Authentication', description: 'User logged in successfully', user: 'Sarah Johnson', role: 'Cashier', ipAddress: '192.168.1.105', timestamp: '2026-02-01 13:45:00', details: { browser: 'Chrome 120', os: 'Windows 11' } },
    { id: 5, action: 'CREATE', module: 'Sales', description: 'Created new sale transaction #INV-2026-0215', user: 'Sarah Johnson', role: 'Cashier', ipAddress: '192.168.1.105', timestamp: '2026-02-01 13:30:55', details: { invoiceNo: 'INV-2026-0215', total: 3500, items: 5 } },
    { id: 6, action: 'UPDATE', module: 'Staff', description: 'Updated staff status to "Active"', user: 'John Smith', role: 'Manager', ipAddress: '192.168.1.100', timestamp: '2026-02-01 12:22:18', details: { staffName: 'Emily Brown', oldStatus: 'Inactive', newStatus: 'Active' } },
    { id: 7, action: 'CREATE', module: 'Procurement', description: 'Created purchase order PO-2026-0089', user: 'Jennifer Martinez', role: 'Procurement Staff', ipAddress: '192.168.1.108', timestamp: '2026-02-01 11:48:33', details: { poNumber: 'PO-2026-0089', supplier: 'Rice Traders Inc.', total: 125000 } },
    { id: 8, action: 'UPDATE', module: 'Settings', description: 'Changed theme primary color', user: 'Amanda Reyes', role: 'Manager', ipAddress: '192.168.1.101', timestamp: '2026-02-01 11:15:09', details: { setting: 'primary_color', oldValue: '#22c55e', newValue: '#3b82f6' } },
    { id: 9, action: 'LOGOUT', module: 'Authentication', description: 'User logged out', user: 'Grace Chen', role: 'Cashier', ipAddress: '192.168.1.106', timestamp: '2026-02-01 10:55:00', details: { sessionDuration: '4h 32m' } },
    { id: 10, action: 'CREATE', module: 'Processing', description: 'Started milling batch #MB-2026-0045', user: 'David Lee', role: 'Processing Staff', ipAddress: '192.168.1.103', timestamp: '2026-02-01 10:30:22', details: { batchNo: 'MB-2026-0045', inputQty: '500kg', expectedOutput: '450kg' } },
    { id: 11, action: 'UPDATE', module: 'Products', description: 'Updated price for "Brown Rice 10kg"', user: 'John Smith', role: 'Manager', ipAddress: '192.168.1.100', timestamp: '2026-02-01 09:45:17', details: { productName: 'Brown Rice 10kg', oldPrice: 520, newPrice: 550 } },
    { id: 12, action: 'DELETE', module: 'Inventory', description: 'Removed expired stock batch', user: 'Mike Wilson', role: 'Inventory Staff', ipAddress: '192.168.1.102', timestamp: '2026-02-01 09:22:08', details: { batchNo: 'STK-2025-0892', qty: 25, reason: 'Expired' } },
    { id: 13, action: 'LOGIN', module: 'Authentication', description: 'User logged in successfully', user: 'John Smith', role: 'Manager', ipAddress: '192.168.1.100', timestamp: '2026-02-01 08:00:05', details: { browser: 'Firefox 122', os: 'macOS Sonoma' } },
    { id: 14, action: 'CREATE', module: 'Partners', description: 'Added new customer "Metro Supermarket"', user: 'Amanda Reyes', role: 'Manager', ipAddress: '192.168.1.101', timestamp: '2026-01-31 16:42:30', details: { customerName: 'Metro Supermarket', type: 'Wholesaler', creditLimit: 100000 } },
    { id: 15, action: 'UPDATE', module: 'Sales', description: 'Voided transaction #INV-2026-0198', user: 'Sarah Johnson', role: 'Cashier', ipAddress: '192.168.1.105', timestamp: '2026-01-31 15:18:45', details: { invoiceNo: 'INV-2026-0198', reason: 'Customer request', amount: 1850 } },
  ];

  // Stats calculations
  const todayLogs = auditLogs.filter(log => log.timestamp.startsWith('2026-02-01')).length;
  const createActions = auditLogs.filter(log => log.action === 'CREATE').length;
  const updateActions = auditLogs.filter(log => log.action === 'UPDATE').length;
  const deleteActions = auditLogs.filter(log => log.action === 'DELETE').length;

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionBadge = (action) => {
    const actionStyles = {
      'CREATE': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'UPDATE': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'DELETE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'LOGIN': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'LOGOUT': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return actionStyles[action] || 'bg-gray-100 text-gray-600';
  };

  const getModuleIcon = (module) => {
    const icons = {
      'Products': Package,
      'Inventory': Package,
      'Partners': User,
      'Sales': TrendingUp,
      'Staff': UserCog,
      'Settings': Settings,
      'Procurement': ShoppingCart,
      'Processing': Settings,
      'Authentication': User,
    };
    return icons[module] || FileText;
  };

  const columns = [
    { 
      header: 'Timestamp', 
      accessor: 'timestamp',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-sm">{row.timestamp}</span>
        </div>
      )
    },
    { 
      header: 'Action', 
      accessor: 'action',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getActionBadge(row.action)}`}>
          {row.action}
        </span>
      )
    },
    { 
      header: 'Module', 
      accessor: 'module',
      cell: (row) => {
        const ModuleIcon = getModuleIcon(row.module);
        return (
          <div className="flex items-center gap-2">
            <ModuleIcon size={16} className="text-primary-500" />
            <span>{row.module}</span>
          </div>
        );
      }
    },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'User', 
      accessor: 'user',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.user}</p>
          <p className="text-xs text-gray-500">{row.role}</p>
        </div>
      )
    },
    { header: 'IP Address', accessor: 'ipAddress' },
    { 
      header: 'Actions', 
      accessor: 'actions',
      sortable: false,
      cell: (row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
          title="View Details"
        >
          <Eye size={18} />
        </button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Track and monitor all system activities and changes"
        icon={ClipboardList}
      />

      {/* Stats */}
      {loading ? (
        <SkeletonStats count={4} className="mb-2" />
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Today's Activities"
          value={todayLogs}
          unit="activities today"
          icon={Calendar}
          iconBgColor="bg-gradient-to-br from-button-400 to-button-600"
        />
        <StatsCard
          label="Created Records"
          value={createActions}
          unit="records created"
          icon={FileText}
          iconBgColor="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatsCard
          label="Updated Records"
          value={updateActions}
          unit="records updated"
          icon={Filter}
          iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatsCard
          label="Deleted Records"
          value={deleteActions}
          unit="records deleted"
          icon={ClipboardList}
          iconBgColor="bg-gradient-to-br from-red-400 to-red-600"
        />
      </div>
      )}

      {/* Audit Logs Table */}
      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
      <DataTable
        title="Activity Logs"
        subtitle="Complete history of system activities"
        columns={columns}
        data={auditLogs}
        searchable
        searchPlaceholder="Search logs..."
        pagination
        defaultItemsPerPage={10}
        filterField="action"
        filterOptions={['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']}
        filterPlaceholder="All Actions"
        dateFilterField="timestamp"
      />
      )}

      {/* Detail Modal */}
      <FormModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Activity Details"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Action</p>
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getActionBadge(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Module</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timestamp</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IP Address</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.ipAddress}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-gray-800 dark:text-gray-200">{selectedLog.description}</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Performed By</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-gradient-to-br from-button-500 to-button-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedLog.user.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.user}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLog.role}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Additional Details</p>
              <div className="p-4 bg-gray-900 dark:bg-gray-800 rounded-xl">
                <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default AuditTrail;
