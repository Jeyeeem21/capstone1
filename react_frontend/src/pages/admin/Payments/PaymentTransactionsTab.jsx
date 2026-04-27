import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Pause } from 'lucide-react';
import { paymentsApi } from '../../../api/paymentsApi';
import { PaymentVerificationModal } from '../../../components/payments';
import { DataTable, StatusBadge, useToast, SkeletonTable, Modal, Button } from '../../../components/ui';

const PaymentTransactionsTab = ({ onStatsUpdate, onLoadingChange }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesAction, setNotesAction] = useState(null); // 'hold' or 'reject'
  const [notes, setNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      const response = await paymentsApi.getAll({ per_page: 100 });

      if (response.success) {
        const paymentsData = Array.isArray(response.data) ? response.data : [];
        setPayments(paymentsData);

        // Update stats — backend uses 'needs_verification' for GCash awaiting review
        const pendingVerification = paymentsData.filter(p => p.status === 'needs_verification').length;
        const onHold = paymentsData.filter(p => p.status === 'on_hold').length;
        const today = new Date().toDateString();
        const verifiedToday = paymentsData.filter(p => p.status === 'verified' && new Date(p.verified_at || p.updated_at).toDateString() === today).length;
        const totalAmount = paymentsData
          .filter(p => p.status === 'verified')
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        onStatsUpdate(prev => ({
          ...prev,
          pendingVerification,
          onHold,
          verifiedToday,
          totalAmount
        }));
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleVerify = async (paymentId, notes) => {
    try {
      // Optimistic update: immediately mark as verified
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, status: 'verified' } : p
      ));
      
      const response = await paymentsApi.verifyPayment(paymentId, notes);
      if (response.success) {
        toast.success('Payment verified successfully');
        setShowVerificationModal(false);
        // Refetch in background to sync
        loadPayments();
      }
    } catch (error) {
      toast.error('Failed to verify payment');
      // Revert on error
      loadPayments();
    }
  };

  const handleHold = async (paymentId) => {
    setSelectedPayment(payments.find(p => p.id === paymentId));
    setNotesAction('hold');
    setNotes('');
    setShowNotesModal(true);
  };

  const handleReject = async (paymentId) => {
    setSelectedPayment(payments.find(p => p.id === paymentId));
    setNotesAction('reject');
    setNotes('');
    setShowNotesModal(true);
  };

  const handleNotesSubmit = async () => {
    if (!notes.trim()) {
      toast.error('Notes are required');
      return;
    }

    try {
      if (notesAction === 'hold') {
        // Optimistic update: immediately mark as on_hold
        setPayments(prev => prev.map(p => 
          p.id === selectedPayment.id ? { ...p, status: 'on_hold' } : p
        ));
        
        const response = await paymentsApi.holdPayment(selectedPayment.id, notes);
        if (response.success) {
          toast.success('Payment placed on hold');
          setShowNotesModal(false);
          // Refetch in background to sync
          loadPayments();
        }
      } else if (notesAction === 'reject') {
        // Optimistic update: immediately remove from list
        setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
        
        const response = await paymentsApi.cancelPayment(selectedPayment.id, notes);
        if (response.success) {
          toast.success('Payment rejected');
          setShowNotesModal(false);
          // Refetch in background to sync
          loadPayments();
        }
      }
    } catch (error) {
      toast.error(`Failed to ${notesAction} payment`);
      // Revert on error
      loadPayments();
    }
  };

  const getMethodBadge = (method) => {
    const badges = {
      cash: { color: '#22c55e', label: 'Cash' },
      gcash: { color: '#3b82f6', label: 'GCash' },
      pdo: { color: '#f59e0b', label: 'PDO' },
      credit: { color: '#8b5cf6', label: 'Credit' }
    };
    const badge = badges[method] || badges.cash;
    return badge;
  };

  const columns = useMemo(() => [
    {
      header: 'Payment ID',
      accessor: 'id',
      cell: (row) => <span className="font-medium text-gray-800 dark:text-gray-100">#{row.id}</span>
    },
    {
      header: 'Order ID',
      accessor: 'transaction_id',
      cell: (row) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {row.transaction_id || '-'}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'date_formatted',
      cell: (row) => {
        const date = new Date(row.created_at);
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.customer_name || 'Walk-in'}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Method',
      accessor: 'payment_method',
      cell: (row) => {
        const badge = getMethodBadge(row.payment_method);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${badge.color}20`,
              color: badge.color
            }}
          >
            {badge.label}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusMap = {
          pending: 'Pending',
          needs_verification: 'Pending Verification',
          verified: 'Verified',
          on_hold: 'On Hold',
          cancelled: 'Cancelled'
        };
        return <StatusBadge status={statusMap[row.status] || row.status} />;
      }
    },
    {
      header: 'Reference',
      accessor: 'reference_number',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {row.reference_number || '-'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      cell: (row) => {
        const canVerify = row.status === 'needs_verification' || row.status === 'on_hold' || row.status === 'pending';
        const canReject = row.status === 'needs_verification' || row.status === 'on_hold' || row.status === 'pending';
        const canHold = row.status === 'needs_verification' || row.status === 'pending';
        
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                if (canVerify) {
                  e.stopPropagation();
                  handleVerify(row.id, 'Verified from transactions tab');
                } else {
                  e.stopPropagation();
                }
              }}
              disabled={!canVerify}
              className={`p-1.5 rounded-md transition-colors ${
                canVerify
                  ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 hover:text-green-700 dark:text-green-400'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title={canVerify ? 'Verify Payment' : 'Cannot verify'}
            >
              <CheckCircle size={15} />
            </button>
            <button
              onClick={(e) => {
                if (canReject) {
                  e.stopPropagation();
                  handleReject(row.id);
                } else {
                  e.stopPropagation();
                }
              }}
              disabled={!canReject}
              className={`p-1.5 rounded-md transition-colors ${
                canReject
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 dark:text-red-400'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title={canReject ? 'Reject Payment' : 'Cannot reject'}
            >
              <XCircle size={15} />
            </button>
            <button
              onClick={(e) => {
                if (canHold) {
                  e.stopPropagation();
                  handleHold(row.id);
                } else {
                  e.stopPropagation();
                }
              }}
              disabled={!canHold}
              className={`p-1.5 rounded-md transition-colors ${
                canHold
                  ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title={canHold ? 'Hold Payment' : 'Cannot hold'}
            >
              <Pause size={15} />
            </button>
          </div>
        );
      }
    }
  ], [handleVerify, handleHold, handleReject]);

  return (
    <>
      {loading ? (
        <SkeletonTable />
      ) : (
        <DataTable
          title="Payment Transactions"
          subtitle="All payment records and verification status"
          columns={columns}
          data={payments}
          searchPlaceholder="Search by reference or customer..."
          filterField="payment_method"
          filterPlaceholder="All Methods"
          dateFilterField="created_at"
          onRowDoubleClick={(row) => {
            setSelectedPayment(row);
            setShowVerificationModal(true);
          }}
          pagination={true}
          defaultItemsPerPage={15}
        />
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedPayment && (
        <PaymentVerificationModal
          payment={selectedPayment}
          onClose={() => setShowVerificationModal(false)}
        />
      )}

      {/* Notes Modal for Hold/Reject */}
      {showNotesModal && selectedPayment && (
        <Modal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          title={notesAction === 'hold' ? 'Hold Payment' : 'Reject Payment'}
          subtitle={`Payment #${selectedPayment.id}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Enter reason for ${notesAction === 'hold' ? 'holding' : 'rejecting'} this payment...`}
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Button onClick={() => setShowNotesModal(false)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleNotesSubmit}
              disabled={!notes.trim()}
              className={notesAction === 'hold' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {notesAction === 'hold' ? 'Hold Payment' : 'Reject Payment'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PaymentTransactionsTab;
