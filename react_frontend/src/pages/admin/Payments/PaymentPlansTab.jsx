import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Calendar, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { paymentPlansApi, installmentsApi } from '../../../api/paymentsApi';
import { DataTable, StatusBadge, useToast, SkeletonTable, Modal, Button, FormInput, FormSelect } from '../../../components/ui';

const getInstallmentDueStatus = (inst) => {
  if (!inst.due_date || inst.status === 'paid' || inst.status === 'verified') return null;
  const due = new Date(inst.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due_today';
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  if (diff <= 3) return 'upcoming';
  return null;
};

const InstallmentDueBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    overdue:  { label: 'Overdue',    cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: AlertTriangle },
    due_today:{ label: 'Due Today',  cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: Clock },
    upcoming: { label: 'Due Soon',   cls: 'bg-button-100 dark:bg-button-900/30 text-button-700 dark:text-button-400', icon: Clock },
  };
  const { label, cls, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  );
};

const PaymentPlansTab = ({ activeTab, onStatsUpdate, onLoadingChange }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference_number: '', notes: '' });
  const [payLoading, setPayLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Reload data when tab becomes active
    if (activeTab === 'plans') {
      loadPlans();
    }
  }, [activeTab]);

  const loadPlans = async (silent = false) => {
    try {
      if (!silent) { setLoading(true); onLoadingChange?.(true); }
      const response = await paymentPlansApi.getAll();

      if (response.success) {
        const plansData = Array.isArray(response.data) ? response.data : [];

        setPlans(plansData);

        const activePlans = plansData.filter(p => p.payment_status === 'partial' || p.payment_status === 'not_paid').length;
        const completedPlans = plansData.filter(p => p.payment_status === 'paid').length;
        const totalPlans = plansData.length;
        // Count plans that have at least one PDO installment pending approval
        const pendingApprovals = plansData.filter(p =>
          Array.isArray(p.payment_installments) &&
          p.payment_installments.some(inst => inst.pdo_approval_status === 'pending')
        ).length;

        onStatsUpdate(prev => ({ ...prev, activePlans, completedPlans, totalPlans, pendingApprovals }));
        return plansData;
      }
      return [];
    } catch (error) {
      console.error('Failed to load payment plans:', error);
      toast.error('Failed to load payment plans');
      setPlans([]);
      return [];
    } finally {
      if (!silent) { setLoading(false); onLoadingChange?.(false); }
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      const response = await paymentPlansApi.approvePlan(planId);
      if (response.success) {
        toast.success('Payment plan approved');
        loadPlans(true);
      }
    } catch (error) {
      toast.error('Failed to approve plan');
    }
  };

  const openPayModal = (inst) => {
    setPayingInstallment(inst);
    const balance = parseFloat(inst.amount_expected || 0) - parseFloat(inst.amount_paid || 0);
    setPayForm({ amount: balance.toFixed(2), payment_method: 'cash', reference_number: '', notes: '' });
  };

  const handleRecordPayment = async () => {
    if (!payingInstallment) return;
    setPayLoading(true);
    try {
      const response = await installmentsApi.recordPayment(payingInstallment.id, {
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number || undefined,
        notes: payForm.notes || undefined,
      });
      if (response.success) {
        toast.success('Payment recorded successfully');
        setPayingInstallment(null);
        // Refresh plan list and get the fresh data directly (avoids stale closure)
        const freshPlans = await loadPlans(true);
        // Re-open details with fresh data if modal was open
        if (showDetailsModal && selectedPlan && freshPlans?.length) {
          const fresh = freshPlans.find(p => p.id === selectedPlan.id);
          if (fresh) setSelectedPlan(fresh);
        }
      } else {
        toast.error(response.message || 'Failed to record payment');
      }
    } catch (err) {
      toast.error('Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Order ID',
      accessor: 'transaction_id',
      cell: (row) => {
        const installments = row.payment_installments || [];
        const hasOverdue = installments.some(i => getInstallmentDueStatus(i) === 'overdue');
        const hasDueToday = installments.some(i => getInstallmentDueStatus(i) === 'due_today');
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-800 dark:text-gray-100">{row.transaction_id || `#${row.id}`}</span>
            {hasOverdue && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" title="Has overdue installment" />}
            {!hasOverdue && hasDueToday && <Clock size={13} className="text-amber-500 flex-shrink-0" title="Installment due today" />}
          </div>
        );
      }
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
        const paid = installments.filter(i => {
          // Count if status is paid/verified OR if amount_paid >= amount_expected (robust fallback)
          const isStatusPaid = i.status === 'paid' || i.status === 'verified';
          const isAmountPaid = parseFloat(i.amount_paid || 0) >= parseFloat(i.amount_expected || 0) && parseFloat(i.amount_expected || 0) > 0;
          return isStatusPaid || isAmountPaid;
        }).length;
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
        const installments = row.payment_installments || [];
        // Derive a more specific status from installment states
        const hasOnHold = installments.some(i => i.status === 'on_hold');
        const hasPendingVerification = installments.some(i => i.status === 'needs_verification');
        if (hasOnHold) return <StatusBadge status="On Hold" />;
        if (hasPendingVerification) return <StatusBadge status="Pending Verification" />;
        const statusMap = { not_paid: 'Not Paid', partial: 'Partial', paid: 'Paid' };
        return <StatusBadge status={statusMap[row.payment_status] || row.payment_status} />;
      }
    },
  ], []);

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
          onRowDoubleClick={(row) => { setSelectedPlan(row); setShowDetailsModal(true); }}
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
          subtitle={`Sale ${selectedPlan.transaction_id || `#${selectedPlan.id}`} · ${selectedPlan.customer?.name || 'Walk-in'}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Order ID Banner */}
            <div className="bg-button-50 dark:bg-button-900/20 border border-button-200 dark:border-button-800 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Order ID</p>
              <p className="text-lg font-bold text-button-700 dark:text-button-400">
                {selectedPlan.transaction_id || `#${selectedPlan.id}`}
              </p>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ₱{parseFloat(selectedPlan.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount Paid</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₱{parseFloat(selectedPlan.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Balance</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  ₱{parseFloat(selectedPlan.balance_remaining || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Installments */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Installments</h4>
              <div className="space-y-2">
                {(selectedPlan.payment_installments || []).map((inst) => {
                  const dueStatus = getInstallmentDueStatus(inst);
                  const isPaid = inst.status === 'paid' || inst.status === 'verified';
                  const isPDO = inst.payment_method === 'pdo' || !!inst.pdo_approval_status || !!inst.pdo_check_number || !!inst.pdo_check_bank;
                  const isPdoPending = isPDO && (inst.pdo_approval_status === 'pending' || (!inst.pdo_approval_status && inst.status === 'pending'));
                  const isPdoAwaiting = isPDO && (inst.pdo_approval_status === 'approved' || inst.status === 'awaiting_payment');
                  const balance = parseFloat(inst.amount_expected || 0) - parseFloat(inst.amount_paid || 0);
                  return (
                    <div key={inst.id} className={`p-4 rounded-lg flex items-center justify-between gap-3 ${
                      dueStatus === 'overdue' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' :
                      dueStatus === 'due_today' ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' :
                      'bg-gray-50 dark:bg-gray-900/50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Installment #{inst.installment_number}
                          </p>
                          <InstallmentDueBadge status={dueStatus} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          Expected: ₱{parseFloat(inst.amount_expected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {parseFloat(inst.amount_paid || 0) > 0 && (
                            <> · Paid: <span className="text-green-600 dark:text-green-400">₱{parseFloat(inst.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></>
                          )}
                        </p>
                        {inst.due_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            Due: {new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Show descriptive status */}
                        {(() => {
                          if (isPaid) {
                            return <StatusBadge status="Paid" />;
                          }
                          if (inst.status === 'on_hold') {
                            return <StatusBadge status="On Hold" />;
                          }
                          if (inst.status === 'needs_verification') {
                            return <StatusBadge status="Pending Verification" />;
                          }
                          if (isPdoPending) {
                            return <StatusBadge status="Pending Approval" />;
                          }
                          if (isPdoAwaiting) {
                            return <StatusBadge status="Awaiting Payment" />;
                          }
                          if (inst.status === 'pending') {
                            return <StatusBadge status="Not Paid" />;
                          }
                          return <StatusBadge status={inst.status} />;
                        })()}
                        {/* Show Pay button only when installment truly needs payment:
                          - Not already paid/verified
                          - Has remaining balance
                          - Not pending/awaiting PDO approval
                          - Not GCash already submitted (needs_verification) */}
                        {!isPaid &&
                         balance > 0 &&
                         inst.status !== 'needs_verification' &&
                         inst.status !== 'on_hold' &&
                         !isPdoPending &&
                         !isPdoAwaiting && (
                          <button
                            onClick={() => openPayModal(inst)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-button-600 hover:bg-button-700 text-white text-xs font-semibold rounded-md transition-colors"
                            title="Record payment for this installment"
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {payingInstallment && (
        <Modal
          isOpen={!!payingInstallment}
          onClose={() => setPayingInstallment(null)}
          title={`Record Payment — Installment #${payingInstallment.installment_number}`}
          subtitle={`Balance: ₱${(parseFloat(payingInstallment.amount_expected || 0) - parseFloat(payingInstallment.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          size="small"
        >
          <div className="space-y-4">
            <FormInput
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={payForm.amount}
              onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              required
            />
            <FormSelect
              label="Payment Method"
              value={payForm.payment_method}
              onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'gcash', label: 'GCash' },
              ]}
            />
            {payForm.payment_method === 'gcash' && (
              <FormInput
                label="Reference Number"
                value={payForm.reference_number}
                onChange={e => setPayForm(p => ({ ...p, reference_number: e.target.value }))}
                required
              />
            )}
            <FormInput
              label="Notes (optional)"
              value={payForm.notes}
              onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayingInstallment(null)} disabled={payLoading}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={payLoading || !payForm.amount}>
              {payLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PaymentPlansTab;
