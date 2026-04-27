import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Calendar, Eye } from 'lucide-react';
import { paymentPlansApi } from '../../../api/paymentsApi';
import { DataTable, StatusBadge, useToast, SkeletonTable, Modal, Button } from '../../../components/ui';

const PaymentPlansTab = ({ onStatsUpdate, onLoadingChange }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      const response = await paymentPlansApi.getAll();

      if (response.success) {
        const plansData = Array.isArray(response.data) ? response.data : [];
        setPlans(plansData);

        // Debug: Log each plan's payment_status
        console.log('Plans data detailed:', JSON.stringify(plansData.map(p => ({
          id: p.id,
          transaction_id: p.transaction_id,
          payment_status: p.payment_status,
          amount_paid: p.amount_paid,
          balance_remaining: p.balance_remaining,
          total: p.total
        })), null, 2));

        // Update stats — each row is a Sale with is_staggered=true
        // payment_status can be: 'not_paid', 'partial', 'paid'
        const activePlans = plansData.filter(p => p.payment_status === 'partial' || p.payment_status === 'not_paid').length;
        const completedPlans = plansData.filter(p => p.payment_status === 'paid').length;
        const totalPlans = plansData.length;

        console.log('Payment Plans Stats:', { activePlans, completedPlans, totalPlans });

        onStatsUpdate(prev => ({
          ...prev,
          activePlans,
          completedPlans,
          totalPlans
        }));
      }
    } catch (error) {
      console.error('Failed to load payment plans:', error);
      toast.error('Failed to load payment plans');
      setPlans([]);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      const response = await paymentPlansApi.approvePlan(planId);
      if (response.success) {
        toast.success('Payment plan approved');
        loadPlans();
      }
    } catch (error) {
      toast.error('Failed to approve plan');
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Order',
      accessor: 'transaction_id',
      cell: (row) => <span className="font-medium text-gray-800 dark:text-gray-100">{row.transaction_id || `#${row.id}`}</span>
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      cell: (row) => (
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {row.customer?.name || 'N/A'}
        </span>
      )
    },
    {
      header: 'Total Amount',
      accessor: 'total',
      cell: (row) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          ₱{parseFloat(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Paid',
      accessor: 'amount_paid',
      cell: (row) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ₱{parseFloat(row.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Balance',
      accessor: 'balance_remaining',
      cell: (row) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          ₱{parseFloat(row.balance_remaining || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Installments',
      accessor: 'installments_count',
      cell: (row) => {
        const installments = row.payment_installments || [];
        const paid = installments.filter(i => i.status === 'paid' || i.status === 'verified').length;
        return (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {paid}/{installments.length} paid
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      cell: (row) => {
        const statusMap = {
          not_paid: 'Not Paid',
          partial: 'Partial',
          paid: 'Paid'
        };
        return <StatusBadge status={statusMap[row.payment_status] || row.payment_status} />;
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      cell: (row) => {
        // Payment plans are view-only, no actions needed except view (handled by double-click)
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlan(row);
                setShowDetailsModal(true);
              }}
              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              title="View Details"
            >
              <Eye size={15} />
            </button>
          </div>
        );
      }
    }
  ], [handleApprovePlan]);

  return (
    <>
      {loading ? (
        <SkeletonTable />
      ) : (
        <DataTable
          title="Payment Plans"
          subtitle="Manage installment payment plans and approvals"
          columns={columns}
          data={plans}
          searchPlaceholder="Search by customer or sale ID..."
          filterField="status"
          filterPlaceholder="All Status"
          onRowDoubleClick={(row) => {
            setSelectedPlan(row);
            setShowDetailsModal(true);
          }}
          pagination={true}
          defaultItemsPerPage={15}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPlan && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Payment Plan Details"
          subtitle={`Sale #${selectedPlan.sale_id}`}
          size="large"
        >
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ₱{selectedPlan.sale?.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount Paid</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₱{selectedPlan.sale?.amount_paid?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Balance</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  ₱{selectedPlan.sale?.balance_remaining?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Installments */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Installments</h4>
              <div className="space-y-2">
                {selectedPlan.installments?.map((inst) => (
                  <div key={inst.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Installment #{inst.installment_number}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {inst.payment_method.toUpperCase()} • ₱{inst.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      {inst.due_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          Due: {new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PaymentPlansTab;
