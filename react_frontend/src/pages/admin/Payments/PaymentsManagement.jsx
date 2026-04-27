import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DollarSign, CreditCard, FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { StatsCard, SkeletonStats } from '../../../components/ui';
import PaymentTransactionsTab from './PaymentTransactionsTab';
import PaymentPlansTab from './PaymentPlansTab';
import PDOTab from './PDOTab';

const PaymentsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    onHold: 0,
    pendingApprovals: 0,
    pendingPDOs: 0,
    totalToday: 0,
    totalMonth: 0
  });

  // Tab state - persist in URL
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['transactions', 'plans', 'pdo'];
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'transactions';
  });

  // Sync active tab to URL
  useEffect(() => {
    setSearchParams(prev => { prev.set('tab', activeTab); return prev; }, { replace: true });
  }, [activeTab, setSearchParams]);

  const tabs = [
    { key: 'transactions', label: 'Payment Transactions', icon: DollarSign },
    { key: 'plans', label: 'Payment Plans', icon: FileText },
    { key: 'pdo', label: 'PDO Management', icon: CreditCard }
  ];

  return (
    <div>
      <PageHeader
        title="Payment Management"
        description="Manage payments, verify transactions, and approve payment plans"
        icon={DollarSign}
      />

      {/* Tab Navigation */}
      <div className="flex border-b-2 border-primary-200 dark:border-primary-700 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-semibold transition-all relative
              ${activeTab === tab.key
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 -mb-[2px] bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-700/50'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <tab.icon size={16} />
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ═══════════ TRANSACTIONS TAB ═══════════ */}
      {activeTab === 'transactions' && (
        <>
          {/* Stats Cards */}
          {loading ? (
            <SkeletonStats count={4} className="mb-6" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Pending Verifications"
                value={stats.pendingVerifications}
                unit={stats.pendingVerifications > 0 ? 'needs review' : 'all clear'}
                icon={Clock}
                iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600"
              />
              <StatsCard
                label="On Hold"
                value={stats.onHold}
                unit={stats.onHold > 0 ? 'flagged' : 'none'}
                icon={AlertTriangle}
                iconBgColor={stats.onHold > 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-button-400 to-button-600"}
              />
              <StatsCard
                label="Verified Today"
                value={stats.totalToday || 0}
                unit="payments"
                icon={CheckCircle}
                iconBgColor="bg-gradient-to-br from-green-400 to-green-600"
              />
              <StatsCard
                label="This Month"
                value={stats.totalMonth || 0}
                unit="total verified"
                icon={DollarSign}
                iconBgColor="bg-gradient-to-br from-button-500 to-button-700"
              />
            </div>
          )}

          <PaymentTransactionsTab onStatsUpdate={setStats} onLoadingChange={setLoading} />
        </>
      )}

      {/* ═══════════ PAYMENT PLANS TAB ═══════════ */}
      {activeTab === 'plans' && (
        <>
          {/* Stats Cards */}
          {loading ? (
            <SkeletonStats count={4} className="mb-6" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Pending Approvals"
                value={stats.pendingApprovals}
                unit={stats.pendingApprovals > 0 ? 'awaiting review' : 'all approved'}
                icon={FileText}
                iconBgColor="bg-gradient-to-br from-purple-400 to-purple-600"
              />
              <StatsCard
                label="Active Plans"
                value={stats.activePlans || 0}
                unit="ongoing"
                icon={CheckCircle}
                iconBgColor="bg-gradient-to-br from-green-400 to-green-600"
              />
              <StatsCard
                label="Completed Plans"
                value={stats.completedPlans || 0}
                unit="finished"
                icon={DollarSign}
                iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600"
              />
              <StatsCard
                label="Total Plans"
                value={stats.totalPlans || 0}
                unit="all time"
                icon={FileText}
                iconBgColor="bg-gradient-to-br from-button-500 to-button-700"
              />
            </div>
          )}

          <PaymentPlansTab onStatsUpdate={setStats} onLoadingChange={setLoading} />
        </>
      )}

      {/* ═══════════ PDO TAB ═══════════ */}
      {activeTab === 'pdo' && (
        <>
          {/* Stats Cards */}
          {loading ? (
            <SkeletonStats count={4} className="mb-6" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Pending PDOs"
                value={stats.pendingPDOs}
                unit={stats.pendingPDOs > 0 ? 'needs approval' : 'all approved'}
                icon={Clock}
                iconBgColor="bg-gradient-to-br from-amber-400 to-amber-600"
              />
              <StatsCard
                label="Awaiting Payment"
                value={stats.awaitingPayment || 0}
                unit="approved checks"
                icon={CreditCard}
                iconBgColor="bg-gradient-to-br from-green-400 to-green-600"
              />
              <StatsCard
                label="Cleared Today"
                value={stats.clearedToday || 0}
                unit="payments"
                icon={CheckCircle}
                iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600"
              />
              <StatsCard
                label="Total PDOs"
                value={stats.totalPDOs || 0}
                unit="all time"
                icon={CreditCard}
                iconBgColor="bg-gradient-to-br from-button-500 to-button-700"
              />
            </div>
          )}

          <PDOTab onStatsUpdate={setStats} onLoadingChange={setLoading} />
        </>
      )}
    </div>
  );
};

export default PaymentsManagement;
