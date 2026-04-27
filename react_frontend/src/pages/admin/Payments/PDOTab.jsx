import { useState, useEffect, useMemo } from 'react';
import { Eye, CheckCircle, Calendar, CreditCard, XCircle } from 'lucide-react';
import { installmentsApi } from '../../../api/paymentsApi';
import { apiClient } from '../../../api';
import { PDOApprovalModal } from '../../../components/payments';
import { DataTable, StatusBadge, useToast, SkeletonTable } from '../../../components/ui';

const PDOTab = ({ onStatsUpdate, onLoadingChange }) => {
  const [pendingPDOs, setPendingPDOs] = useState([]);
  const [awaitingPayment, setAwaitingPayment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeSection, setActiveSection] = useState('pending');
  const toast = useToast();

  useEffect(() => {
    loadPDOs();
  }, []);

  const loadPDOs = async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      
      // Fetch both installment-based PDOs AND standalone PDO payments
      const [installmentPendingResponse, installmentAwaitingResponse, standalonePDOsResponse] = await Promise.all([
        installmentsApi.getPendingPDOs(),
        installmentsApi.getAwaitingPayment(),
        // Fetch standalone PDO payments (from POS orders)
        apiClient.get('/payments', { params: { method: 'pdo' } })
      ]);
      
      // Combine installment-based PDOs with standalone PDO payments
      let pendingData = [];
      let awaitingData = [];
      
      // Add installment-based PDOs
      if (installmentPendingResponse.success) {
        const installmentPending = Array.isArray(installmentPendingResponse.data) ? installmentPendingResponse.data : [];
        pendingData = [...installmentPending];
      }
      
      if (installmentAwaitingResponse.success) {
        const installmentAwaiting = Array.isArray(installmentAwaitingResponse.data) ? installmentAwaitingResponse.data : [];
        awaitingData = [...installmentAwaiting];
      }
      
      // Add standalone PDO payments (from POS)
      if (standalonePDOsResponse.success) {
        const standalonePDOs = Array.isArray(standalonePDOsResponse.data?.data || standalonePDOsResponse.data) 
          ? (standalonePDOsResponse.data?.data || standalonePDOsResponse.data) 
          : [];
        
        // Separate by status: pending vs approved (awaiting payment)
        standalonePDOs.forEach(payment => {
          // Transform standalone payment to match installment structure
          const transformedPayment = {
            id: payment.id,
            sale_id: payment.sale_id,
            installment_number: null, // Standalone payment, not an installment
            amount: payment.amount,
            pdo_check_number: payment.pdo_check_number,
            pdo_check_bank: payment.pdo_check_bank,
            pdo_check_image: payment.pdo_check_image,
            pdo_approval_status: payment.pdo_approval_status || payment.status,
            due_date: payment.paid_at || payment.created_at,
            sale: payment.sale,
            payment_method: 'pdo',
            status: payment.status,
            is_standalone: true, // Flag to identify standalone payments
          };
          
          // Pending approval
          if (payment.status === 'pending' || payment.pdo_approval_status === 'pending') {
            pendingData.push(transformedPayment);
          }
          // Approved, awaiting payment
          else if (payment.pdo_approval_status === 'approved' && payment.status !== 'verified') {
            awaitingData.push(transformedPayment);
          }
        });
      }
      
      setPendingPDOs(pendingData);
      setAwaitingPayment(awaitingData);
      
      // Update stats
      onStatsUpdate(prev => ({
        ...prev,
        pendingPDOs: pendingData.length,
        awaitingPayment: awaitingData.length,
        clearedToday: 0, // TODO: Calculate from payment history
        totalPDOs: pendingData.length + awaitingData.length
      }));
    } catch (error) {
      console.error('Failed to load PDOs:', error);
      toast.error('Failed to load PDOs');
      setPendingPDOs([]);
      setAwaitingPayment([]);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleApprove = async (installmentId, notes) => {
    try {
      // Check if this is a standalone payment or installment
      const selectedPDO = pendingPDOs.find(p => p.id === installmentId);
      
      // Optimistic update - move from pending to awaiting immediately
      setPendingPDOs(prev => prev.filter(p => p.id !== installmentId));
      if (selectedPDO) {
        setAwaitingPayment(prev => [...prev, { ...selectedPDO, pdo_approval_status: 'approved' }]);
      }
      
      let response;
      if (selectedPDO?.is_standalone) {
        // Standalone PDO payment - approve via payments endpoint
        response = await apiClient.post(`/payments/${installmentId}/approve-pdo`, { notes });
      } else {
        // Installment-based PDO
        response = await installmentsApi.approvePDO(installmentId, notes);
      }
      
      if (response.success) {
        toast.success('PDO approved successfully');
        setShowApprovalModal(false);
        // Refresh in background to confirm
        loadPDOs();
      }
    } catch (error) {
      toast.error('Failed to approve PDO');
      // Revert optimistic update on error
      loadPDOs();
    }
  };

  const handleReject = async (installmentId, notes) => {
    try {
      // Check if this is a standalone payment or installment
      const selectedPDO = pendingPDOs.find(p => p.id === installmentId);
      
      // Optimistic update - remove from pending immediately
      setPendingPDOs(prev => prev.filter(p => p.id !== installmentId));
      
      let response;
      if (selectedPDO?.is_standalone) {
        // Standalone PDO payment - reject via payments endpoint
        response = await apiClient.post(`/payments/${installmentId}/reject-pdo`, { notes });
      } else {
        // Installment-based PDO
        response = await installmentsApi.rejectPDO(installmentId, notes);
      }
      
      if (response.success) {
        toast.success('PDO rejected');
        setShowApprovalModal(false);
        // Refresh in background to confirm
        loadPDOs();
      }
    } catch (error) {
      toast.error('Failed to reject PDO');
      // Revert optimistic update on error
      loadPDOs();
    }
  };

  const handleMarkAsPaid = async (installmentId) => {
    if (!confirm('Mark this PDO as paid? This action confirms the check has cleared.')) {
      return;
    }

    try {
      // Check if this is a standalone payment or installment
      const selectedPDO = awaitingPayment.find(p => p.id === installmentId);
      
      // Optimistic update - remove from awaiting immediately
      setAwaitingPayment(prev => prev.filter(p => p.id !== installmentId));
      
      let response;
      if (selectedPDO?.is_standalone) {
        // Standalone PDO payment - mark as paid via payments endpoint
        response = await apiClient.post(`/payments/${installmentId}/verify`, { notes: 'Check cleared' });
      } else {
        // Installment-based PDO
        response = await installmentsApi.markPDOAsPaid(installmentId);
      }
      
      if (response.success) {
        toast.success('PDO marked as paid');
        // Refresh in background to confirm
        loadPDOs();
      }
    } catch (error) {
      toast.error('Failed to mark PDO as paid');
      // Revert optimistic update on error
      loadPDOs();
    }
  };

  // Columns for Pending PDOs
  const pendingColumns = useMemo(() => [
    {
      header: 'Sale ID',
      accessor: 'sale_id',
      cell: (row) => <span className="font-medium text-gray-800 dark:text-gray-100">#{row.sale_id}</span>
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.sale?.customer?.name || 'N/A'}
        </span>
      )
    },
    {
      header: 'Installment',
      accessor: 'installment_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.installment_number ? `#${row.installment_number}` : 'Full Payment'}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          ₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Check Number',
      accessor: 'pdo_check_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.pdo_check_number || '-'}
        </span>
      )
    },
    {
      header: 'Bank',
      accessor: 'pdo_check_bank',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.pdo_check_bank || '-'}
        </span>
      )
    },
    {
      header: 'Check Date',
      accessor: 'pdo_check_date',
      cell: (row) => row.pdo_check_date ? (
        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Calendar size={12} />
          {new Date(row.pdo_check_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ) : <span className="text-gray-400">-</span>
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      cell: (row) => row.due_date ? (
        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Calendar size={12} />
          {new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ) : <span className="text-gray-400">-</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(row.id, 'Approved by admin');
            }}
            className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 hover:text-green-700 dark:text-green-400 transition-colors"
            title="Approve Check"
          >
            <CheckCircle size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const notes = prompt('Rejection reason:');
              if (notes) handleReject(row.id, notes);
            }}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 dark:text-red-400 transition-colors"
            title="Reject Check"
          >
            <XCircle size={15} />
          </button>
        </div>
      )
    }
  ], [handleApprove, handleReject]);

  // Columns for Awaiting Payment
  const awaitingColumns = useMemo(() => [
    {
      header: 'Sale ID',
      accessor: 'sale_id',
      cell: (row) => <span className="font-medium text-gray-800 dark:text-gray-100">#{row.sale_id}</span>
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.sale?.customer?.name || 'N/A'}
        </span>
      )
    },
    {
      header: 'Installment',
      accessor: 'installment_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.installment_number ? `#${row.installment_number}` : 'Full Payment'}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          ₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Check Number',
      accessor: 'pdo_check_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.pdo_check_number || '-'}
        </span>
      )
    },
    {
      header: 'Bank',
      accessor: 'pdo_check_bank',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.pdo_check_bank || '-'}
        </span>
      )
    },
    {
      header: 'Check Date',
      accessor: 'pdo_check_date',
      cell: (row) => row.pdo_check_date ? (
        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Calendar size={12} />
          {new Date(row.pdo_check_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ) : <span className="text-gray-400">-</span>
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      cell: (row) => row.due_date ? (
        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Calendar size={12} />
          {new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ) : <span className="text-gray-400">-</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMarkAsPaid(row.id);
          }}
          className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-700 dark:text-green-400 transition-colors flex items-center gap-1"
          title="Mark as Paid"
        >
          <CheckCircle size={15} />
        </button>
      )
    }
  ], [handleMarkAsPaid]);

  return (
    <>
      {/* Section Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveSection('pending')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSection === 'pending'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCard size={16} />
            Pending Approval ({pendingPDOs.length})
          </div>
        </button>
        <button
          onClick={() => setActiveSection('awaiting')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSection === 'awaiting'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            Awaiting Payment ({awaitingPayment.length})
          </div>
        </button>
      </div>

      {/* Content */}
      {activeSection === 'pending' ? (
        loading ? (
          <SkeletonTable />
        ) : (
          <DataTable
            title="Pending PDO Approvals"
            subtitle="Review and approve post-dated checks"
            columns={pendingColumns}
            data={pendingPDOs}
            searchPlaceholder="Search by customer or check number..."
            dateFilterField="due_date"
            onRowClick={(row) => {
              setSelectedInstallment(row);
              setShowApprovalModal(true);
            }}
            pagination={true}
            defaultItemsPerPage={15}
          />
        )
      ) : (
        loading ? (
          <SkeletonTable />
        ) : (
          <DataTable
            title="Awaiting Payment"
            subtitle="Approved checks waiting to clear"
            columns={awaitingColumns}
            data={awaitingPayment}
            searchPlaceholder="Search by customer or check number..."
            dateFilterField="due_date"
            onRowClick={(row) => {
              setSelectedInstallment(row);
              setShowApprovalModal(true);
            }}
            pagination={true}
            defaultItemsPerPage={15}
          />
        )
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedInstallment && (
        <PDOApprovalModal
          installment={selectedInstallment}
          onClose={() => setShowApprovalModal(false)}
        />
      )}
    </>
  );
};

export default PDOTab;

