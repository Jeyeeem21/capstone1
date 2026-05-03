import { useState, useEffect, useMemo } from 'react';
import { Eye, CheckCircle, Calendar, CreditCard, XCircle } from 'lucide-react';
import { installmentsApi } from '../../../api/paymentsApi';
import { apiClient } from '../../../api';
import { PDOApprovalModal } from '../../../components/payments';
import { DataTable, StatusBadge, useToast, SkeletonTable } from '../../../components/ui';

const PDOTab = ({ onStatsUpdate, onLoadingChange }) => {
  const [pendingPDOs, setPendingPDOs] = useState([]);
  const [awaitingPayment, setAwaitingPayment] = useState([]);
  const [verifiedPDOs, setVerifiedPDOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeSection, setActiveSection] = useState('pending');
  const toast = useToast();

  useEffect(() => {
    loadPDOs();
  }, []);

  const loadPDOs = async (silent = false) => {
    try {
      if (!silent) { setLoading(true); onLoadingChange?.(true); }
      
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
      let verifiedData = [];
      
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
        const allPDOPayments = Array.isArray(standalonePDOsResponse.data?.data || standalonePDOsResponse.data) 
          ? (standalonePDOsResponse.data?.data || standalonePDOsResponse.data) 
          : [];
        // Only true standalone PDOs belong here; installment-linked PDOs are handled by installments endpoints
        const standalonePDOs = allPDOPayments.filter(payment => !payment.installment_id);
        
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
            pdo_check_date: payment.pdo_check_date,
            pdo_check_image: payment.pdo_check_image,
            pdo_approval_status: payment.pdo_approval_status || payment.status,
            due_date: payment.paid_at || payment.created_at,
            sale: payment.sale,
            payment_method: 'pdo',
            status: payment.status,
            is_standalone: true, // Flag to identify standalone payments
          };
          
          // Check PDO approval status FIRST (takes priority over payment status)
          // Verified PDOs (completed)
          if (payment.status === 'verified') {
            verifiedData.push(transformedPayment);
          }
          // Approved PDOs awaiting payment clearance
          else if (payment.pdo_approval_status === 'approved' && payment.status !== 'verified') {
            awaitingData.push(transformedPayment);
          }
          // Pending approval (not yet approved)
          else if (payment.pdo_approval_status === 'pending' || (!payment.pdo_approval_status && payment.status === 'pending')) {
            pendingData.push(transformedPayment);
          }
        });
      }
      
      setPendingPDOs(pendingData);
      setAwaitingPayment(awaitingData);
      setVerifiedPDOs(verifiedData);

      // Calculate clearedToday from standalone PDOs verified today
      const todayStr = new Date().toDateString();
      let clearedToday = 0;
      if (standalonePDOsResponse.success) {
        const allStandalonePDOs = Array.isArray(standalonePDOsResponse.data?.data || standalonePDOsResponse.data)
          ? (standalonePDOsResponse.data?.data || standalonePDOsResponse.data).filter(payment => !payment.installment_id)
          : [];
        clearedToday = allStandalonePDOs.filter(p =>
          p.status === 'verified' &&
          new Date(p.verified_at || p.updated_at).toDateString() === todayStr
        ).length;
      }

      // Update stats
      onStatsUpdate(prev => ({
        ...prev,
        pendingPDOs: pendingData.length,
        awaitingPayment: awaitingData.length,
        verifiedPDOs: verifiedData.length,
        clearedToday,
        totalPDOs: pendingData.length + awaitingData.length + verifiedData.length
      }));
    } catch (error) {
      console.error('Failed to load PDOs:', error);
      toast.error('Failed to load PDOs');
      setPendingPDOs([]);
      setAwaitingPayment([]);
      setVerifiedPDOs([]);
    } finally {
      if (!silent) { setLoading(false); onLoadingChange?.(false); }
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
        loadPDOs(true);
      }
    } catch (error) {
      toast.error('Failed to approve PDO');
      // Revert optimistic update on error
      loadPDOs(true);
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
        loadPDOs(true);
      }
    } catch (error) {
      toast.error('Failed to reject PDO');
      // Revert optimistic update on error
      loadPDOs(true);
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
        loadPDOs(true);
      }
    } catch (error) {
      toast.error('Failed to mark PDO as paid');
      // Revert optimistic update on error
      loadPDOs(true);
    }
  };

  // Columns for Pending PDOs
  const pendingColumns = useMemo(() => [
    {
      header: 'Installment No.',
      accessor: 'installment_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.installment_number ? `#${row.installment_number}` : 'Full Payment'}
        </span>
      )
    },
    {
      header: 'Order ID',
      accessor: 'sale_id',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.sale?.transaction_id || `#${row.sale_id}`}
        </span>
      )
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => {
        const customerName = row.sale?.customer?.name || row.customer_name || row.customer?.name || 'N/A';
        return (
          <span className="font-medium text-gray-800 dark:text-gray-100">
            {customerName}
          </span>
        );
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => {
        const amount = parseFloat(row.amount ?? row.amount_expected ?? 0);
        return (
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      }
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
      cell: (row) => {
        const checkDate = row.pdo_check_date || row.payment?.pdo_check_date;
        return checkDate ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Calendar size={12} />
            {new Date(checkDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ) : <span className="text-gray-400">-</span>;
      }
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
      header: 'Installment No.',
      accessor: 'installment_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.installment_number ? `#${row.installment_number}` : 'Full Payment'}
        </span>
      )
    },
    {
      header: 'Order ID',
      accessor: 'sale_id',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.sale?.transaction_id || `#${row.sale_id}`}
        </span>
      )
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => {
        const customerName = row.sale?.customer?.name || row.customer_name || row.customer?.name || 'N/A';
        return (
          <span className="font-medium text-gray-800 dark:text-gray-100">
            {customerName}
          </span>
        );
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => {
        const amount = parseFloat(row.amount ?? row.amount_expected ?? 0);
        return (
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      }
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
      cell: (row) => {
        const checkDate = row.pdo_check_date || row.payment?.pdo_check_date;
        return checkDate ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Calendar size={12} />
            {new Date(checkDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ) : <span className="text-gray-400">-</span>;
      }
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
          className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-700 dark:text-green-400 transition-colors"
          title="Mark as Paid"
        >
          <CheckCircle size={15} />
        </button>
      )
    }
  ], [handleMarkAsPaid]);

  // Columns for Verified PDOs
  const verifiedColumns = useMemo(() => [
    {
      header: 'Installment No.',
      accessor: 'installment_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.installment_number ? `#${row.installment_number}` : 'Full Payment'}
        </span>
      )
    },
    {
      header: 'Order ID',
      accessor: 'sale_id',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.sale?.transaction_id || `#${row.sale_id}`}
        </span>
      )
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => {
        const customerName = row.sale?.customer?.name || row.customer_name || row.customer?.name || 'N/A';
        return (
          <span className="font-medium text-gray-800 dark:text-gray-100">
            {customerName}
          </span>
        );
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => {
        const amount = parseFloat(row.amount ?? row.amount_expected ?? 0);
        return (
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      }
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
      cell: (row) => {
        const checkDate = row.pdo_check_date || row.payment?.pdo_check_date;
        return checkDate ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Calendar size={12} />
            {new Date(checkDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ) : <span className="text-gray-400">-</span>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: () => (
        <StatusBadge status="Paid" />
      )
    }
  ], []);

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
        <button
          onClick={() => setActiveSection('verified')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSection === 'verified'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            Paid ({verifiedPDOs.length})
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
      ) : activeSection === 'awaiting' ? (
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
      ) : (
        loading ? (
          <SkeletonTable />
        ) : (
          <DataTable
            title="Paid PDOs"
            subtitle="Completed and paid post-dated check payments"
            columns={verifiedColumns}
            data={verifiedPDOs}
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

