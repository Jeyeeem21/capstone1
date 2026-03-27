import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, Package, MapPin, Clock, CheckCircle, XCircle, Navigation,
  Search, ChevronDown, ChevronUp, Calendar,
  Phone, User, FileText, MessageSquare, Send, Camera, Image as ImageIcon, X,
  Banknote, DollarSign, RotateCcw
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/config';

const statusConfig = {
  'Pending': { color: '#f59e0b', bg: '#fef3c7', icon: Clock, label: 'Pending' },
  'In Transit': { color: '#3b82f6', bg: '#dbeafe', icon: Navigation, label: 'Shipped' },
  'Shipped': { color: '#3b82f6', bg: '#dbeafe', icon: Navigation, label: 'Shipped' },
  'Delivered': { color: '#22c55e', bg: '#dcfce7', icon: CheckCircle, label: 'Delivered' },
  'Picking Up': { color: '#f97316', bg: '#fff7ed', icon: Truck, label: 'Picking Up' },
  'Picked Up': { color: '#8b5cf6', bg: '#ede9fe', icon: RotateCcw, label: 'Picked Up' },
  'Returned': { color: '#6b7280', bg: '#f3f4f6', icon: CheckCircle, label: 'Returned' },
  'Return Requested': { color: '#ef4444', bg: '#fee2e2', icon: RotateCcw, label: 'Return Requested' },
  'Failed': { color: '#ef4444', bg: '#fee2e2', icon: XCircle, label: 'Failed' },
  'Cancelled': { color: '#6b7280', bg: '#f3f4f6', icon: XCircle, label: 'Cancelled' },
};

const statusTabs = ['All', 'Pending', 'Shipped', 'Delivered', 'Failed'];

const Deliveries = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && statusTabs.includes(tabFromUrl) ? tabFromUrl : 'All';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(14);
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const proofInputRef = useRef(null);
  const [payModal, setPayModal] = useState(null);
  const [payCashTendered, setPayCashTendered] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payChangeResult, setPayChangeResult] = useState(null);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.DRIVER_PORTAL.MY_DELIVERIES);
      if (res.success) {
        setDeliveries(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Realtime polling — refresh every 5s when tab is visible and no modal open
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !actionModal && !payModal) {
        fetchDeliveries();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDeliveries, actionModal, payModal]);

  const statusOrder = { 'Shipped': 0, 'In Transit': 0, 'Pending': 1, 'Picking Up': 1, 'Return Requested': 2, 'Delivered': 3, 'Picked Up': 3, 'Returned': 4, 'Failed': 5, 'Cancelled': 6 };

  const sortedDeliveries = useMemo(() => {
    const filtered = deliveries.filter(d => {
      const matchesTab = activeTab === 'All' || 
        (activeTab === 'Shipped' ? (d.status === 'Shipped' || d.status === 'In Transit') : false) ||
        (activeTab === 'Pending' ? (d.status === 'Pending' || d.status === 'Picking Up' || d.status === 'Return Requested') : false) ||
        (activeTab === 'Delivered' ? (d.status === 'Delivered' || d.status === 'Picked Up' || d.status === 'Returned') : false) ||
        (activeTab === 'Failed' ? (d.status === 'Failed' || d.status === 'Cancelled') : false);
      const matchesSearch = !searchTerm ||
        (d.delivery_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.customer || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
    return [...filtered].sort((a, b) => 
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
    );
  }, [deliveries, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(sortedDeliveries.length / rowsPerPage);
  const paginatedDeliveries = useMemo(() => 
    sortedDeliveries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage),
    [sortedDeliveries, currentPage, rowsPerPage]
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stats = useMemo(() => ({
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'Pending' || d.status === 'Picking Up' || d.status === 'Return Requested').length,
    shipped: deliveries.filter(d => d.status === 'Shipped' || d.status === 'In Transit').length,
    delivered: deliveries.filter(d => d.status === 'Delivered' || d.status === 'Picked Up' || d.status === 'Returned').length,
  }), [deliveries]);

  const handleAction = (delivery, action) => {
    setActionModal({ delivery, action });
    setDriverNotes('');
    setProofFiles([]);
    setProofPreviews([]);
    setShowCamera(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { delivery, action } = actionModal;

    setActionLoading(true);
    try {
      if (delivery.source === 'order') {
        // Order-based delivery — use driver-portal endpoint
        const saleId = String(delivery.id).replace('sale-', '');

        if (action === 'Delivered') {
          if (proofFiles.length === 0) return;
          const formData = new FormData();
          formData.append('status', 'delivered');
          if (driverNotes) formData.append('driver_notes', driverNotes);
          proofFiles.forEach((file) => {
            formData.append('delivery_proof[]', file);
          });
          await apiClient.post(ENDPOINTS.DRIVER_PORTAL.UPDATE_ORDER_STATUS(saleId), formData);
        } else if (action === 'Picked Up') {
          const formData = new FormData();
          formData.append('status', 'picked_up');
          if (driverNotes) formData.append('driver_notes', driverNotes);
          await apiClient.post(ENDPOINTS.DRIVER_PORTAL.UPDATE_ORDER_STATUS(saleId), formData);
        } else if (action === 'Failed') {
          const formData = new FormData();
          formData.append('status', 'failed');
          if (driverNotes) formData.append('driver_notes', driverNotes);
          await apiClient.post(ENDPOINTS.DRIVER_PORTAL.UPDATE_ORDER_STATUS(saleId), formData);
        }
      } else {
        // Assignment-based delivery — use existing endpoint
        const payload = {
          status: action,
          driver_notes: driverNotes || null,
        };

        if (action === 'Delivered' && proofFiles.length > 0) {
          const formData = new FormData();
          formData.append('status', action);
          if (driverNotes) formData.append('driver_notes', driverNotes);
          formData.append('proof_of_delivery', proofFiles[0]);
          await apiClient.post(ENDPOINTS.DELIVERIES.UPDATE_STATUS(delivery.id), formData);
        } else {
          await apiClient.post(ENDPOINTS.DELIVERIES.UPDATE_STATUS(delivery.id), payload);
        }
      }

      // Refresh deliveries
      await fetchDeliveries();

      // Fire-and-forget email for order-based deliveries
      if (delivery.source === 'order') {
        const saleId = String(delivery.id).replace('sale-', '');
        apiClient.post(`/sales/${saleId}/status-email`).catch(() => {});
      }

      // Auto-open COD payment modal after marking order as delivered
      if (delivery.source === 'order' && action === 'Delivered' && delivery.payment_method === 'cod' && delivery.payment_status === 'not_paid') {
        const saleId = String(delivery.id).replace('sale-', '');
        setTimeout(() => {
          setPayModal({ saleId, delivery_number: delivery.delivery_number, total: delivery.total_value });
          setPayCashTendered('');
          setPayChangeResult(null);
        }, 300);
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err);
    } finally {
      setActionLoading(false);
      setActionModal(null);
      setDriverNotes('');
      setProofFiles([]);
      setProofPreviews([]);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setShowCamera(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payModal || payLoading) return;
    const tendered = parseFloat(payCashTendered);
    if (!tendered || tendered < payModal.total) return;

    setPayLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.DRIVER_PORTAL.MARK_ORDER_PAID(payModal.saleId), {
        amount_tendered: tendered,
      });
      if (res.success) {
        setPayChangeResult(res.data?.change_amount ?? 0);
        await fetchDeliveries();
        // Fire-and-forget email
        apiClient.post(`/sales/${payModal.saleId}/payment-email`).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Deliveries</h1>
        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
          Manage and track your assigned deliveries
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-primary-300 dark:border-primary-700">
              <Skeleton variant="title" width="w-12" className="mb-1" />
              <Skeleton variant="text" width="w-20" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: theme.button_primary },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Shipped', value: stats.shipped, color: '#3b82f6' },
          { label: 'Delivered', value: stats.delivered, color: '#22c55e' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-primary-300 dark:border-primary-700">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border-2 border-primary-300 dark:border-primary-700">
          <Skeleton variant="input" className="flex-1" />
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border-2 border-primary-300 dark:border-primary-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by delivery #, destination, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-xl focus:outline-none transition-all text-gray-800 dark:text-gray-100"
              onFocus={(e) => e.target.style.borderColor = theme.button_primary}
              onBlur={(e) => e.target.style.borderColor = ''}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab !== tab ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}`}
                style={activeTab === tab ? {
                  backgroundColor: theme.button_primary,
                  color: '#fff',
                } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Deliveries List */}
      {loading ? (
        <div className="columns-1 md:columns-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-4 break-inside-avoid border-2 border-primary-300 dark:border-primary-700">
              <Skeleton variant="text" width="w-44" className="mb-3" />
              <Skeleton variant="text" width="w-64" className="mb-2" />
              <Skeleton variant="text" width="w-32" />
            </div>
          ))}
        </div>
      ) : sortedDeliveries.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-primary-700">
          <Truck size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">No deliveries found</h3>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            {activeTab !== 'All' ? `No ${activeTab.toLowerCase()} deliveries` : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <>
        <div className="columns-1 md:columns-2 gap-4">
          {paginatedDeliveries.map(delivery => {
            const config = statusConfig[delivery.status] || statusConfig['Pending'];
            const displayStatus = config.label || delivery.status;
            const StatusIcon = config.icon;
            const isExpanded = expandedDelivery === delivery.id;
            const items = delivery.items || [];
            const totalValue = delivery.total_value || items.reduce((s, i) => s + (i.total || 0), 0);
            const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);

            return (
              <div
                key={delivery.id}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all mb-4 break-inside-avoid border-2 border-primary-300 dark:border-primary-700"
              >
                <button
                  onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
                  className="w-full p-4 hover:bg-button-500/5 dark:hover:bg-button-500/10 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                        <StatusIcon size={16} style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{delivery.delivery_number}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          <Calendar size={10} className="inline mr-1" />
                          {formatDate(delivery.delivery_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {delivery.source === 'order' && delivery.is_return_pickup && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">Return Pickup</span>
                      )}
                      {delivery.source === 'order' && !delivery.is_return_pickup && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">Order</span>
                      )}
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: config.bg, color: config.color }}>
                        {displayStatus}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={12} className="text-gray-400 dark:text-gray-500" />
                    <p className="text-xs truncate text-gray-800 dark:text-gray-100">{delivery.destination}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {totalItems} {totalItems === 1 ? 'sack' : 'sacks'} · {delivery.customer}
                    </p>
                    {!delivery.is_return_pickup && (
                      <p className="text-sm font-bold" style={{ color: theme.button_primary }}>₱{Number(totalValue).toLocaleString()}</p>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-primary-200 dark:border-primary-700">
                    {/* Contact Info */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Contact Info</p>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400 dark:text-gray-500" />
                          <span className="text-xs text-gray-800 dark:text-gray-100">{delivery.contact_person}</span>
                        </div>
                        {delivery.contact_phone && delivery.contact_phone !== 'N/A' && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-gray-400 dark:text-gray-500" />
                            <a href={`tel:${delivery.contact_phone}`} className="text-xs hover:underline" style={{ color: theme.button_primary }}>
                              {delivery.contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                      {delivery.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <FileText size={12} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">{delivery.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Products */}
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Products</p>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex items-center gap-2">
                              <Package size={14} style={{ color: theme.button_primary }} />
                              <div>
                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{item.product_name}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {[item.variety, item.weight ? `${item.weight}kg` : null].filter(Boolean).join(' · ')}
                                  {(item.variety || item.weight) ? ' · ' : ''}
                                  {item.quantity} {item.unit}{!delivery.is_return_pickup ? ` × ₱${Number(item.price).toLocaleString()}` : ''}
                                </p>
                              </div>
                            </div>
                            {!delivery.is_return_pickup && (
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">₱{Number(item.total).toLocaleString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-3 pt-3 border-t border-primary-200 dark:border-primary-700">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Total</p>
                        <p className="text-sm font-bold" style={{ color: theme.button_primary }}>
                          {delivery.is_return_pickup ? `${totalItems} sack${totalItems !== 1 ? 's' : ''}` : `₱${Number(totalValue).toLocaleString()}`}
                        </p>
                      </div>
                    </div>

                    {/* Driver Notes */}
                    {delivery.driver_notes && (
                      <div className="px-4 py-3 border-t border-primary-200 dark:border-primary-700">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Driver Notes</p>
                        <p className="text-xs text-gray-800 dark:text-gray-100">{delivery.driver_notes}</p>
                        {delivery.delivered_at && (
                          <p className="text-[10px] mt-1 text-gray-500 dark:text-gray-400">Delivered: {formatDate(delivery.delivered_at)}</p>
                        )}
                      </div>
                    )}

                    {/* Payment Info — for order-based deliveries (not return pickups) */}
                    {delivery.source === 'order' && delivery.payment_method && !delivery.is_return_pickup && (
                      <div className="px-4 py-3 border-t border-primary-200 dark:border-primary-700">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Payment</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Banknote size={12} className="text-gray-400 dark:text-gray-500" />
                            <span className="text-xs text-gray-800 dark:text-gray-100 capitalize">{delivery.payment_method === 'cod' ? 'Cash on Delivery' : delivery.payment_method === 'pay_later' ? 'Pay Later' : delivery.payment_method}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${delivery.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {delivery.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        {/* Collect Payment button for delivered COD + unpaid */}
                        {delivery.payment_method === 'cod' && delivery.payment_status === 'not_paid' && delivery.status === 'Delivered' && (
                          <button
                            onClick={() => {
                              const saleId = String(delivery.id).replace('sale-', '');
                              setPayModal({ saleId, delivery_number: delivery.delivery_number, total: delivery.total_value });
                              setPayCashTendered('');
                              setPayChangeResult(null);
                            }}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: theme.button_primary }}
                          >
                            <DollarSign size={14} /> Collect Payment
                          </button>
                        )}
                        {delivery.payment_method === 'pay_later' && delivery.payment_status === 'not_paid' && (
                          <p className="text-[10px] mt-1.5 text-gray-500 dark:text-gray-400 italic">Payment will be handled by customer/admin.</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons — for delivery assignments AND orders */}
                    {(delivery.status === 'Pending' || delivery.status === 'In Transit' || delivery.status === 'Shipped' || delivery.status === 'Picking Up') && (
                      <div className="px-4 py-3 border-t border-primary-200 dark:border-primary-700 flex flex-wrap gap-2">
                        {delivery.source === 'assignment' && delivery.status === 'Pending' && (
                          <button
                            onClick={() => handleAction(delivery, 'In Transit')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: '#3b82f6' }}
                          >
                            <Navigation size={14} /> Start Delivery
                          </button>
                        )}
                        {delivery.is_return_pickup && delivery.status === 'Picking Up' && (
                          <button
                            onClick={() => handleAction(delivery, 'Picked Up')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            <RotateCcw size={14} /> Confirm Picked Up
                          </button>
                        )}
                        {!delivery.is_return_pickup && (delivery.status === 'In Transit' || delivery.status === 'Shipped') && (
                          <button
                            onClick={() => handleAction(delivery, 'Delivered')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            <CheckCircle size={14} /> Confirm Delivered
                          </button>
                        )}
                        {!delivery.is_return_pickup && (
                          <button
                            onClick={() => handleAction(delivery, 'Failed')}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                            style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                          >
                            <XCircle size={14} /> Failed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Show</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs border-2 border-primary-300 dark:border-primary-700 rounded-lg px-2 py-1.5 bg-transparent text-gray-800 dark:text-gray-100 outline-none"
            >
              {[14, 28, 50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              of {sortedDeliveries.length} deliveries
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 border-2 border-primary-300 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-button-500/10"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => (
                  <span key={page} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-1 text-xs text-gray-400">…</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-button-500 to-button-400 text-white shadow-md shadow-button-500/25'
                          : 'border-2 border-primary-300 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-button-500/10'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 border-2 border-primary-300 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-button-500/10"
              >
                Next
              </button>
            </div>
          )}
        </div>
        </>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setActionModal(null); if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setShowCamera(false); }} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200 dark:border-primary-700 max-h-[90vh] overflow-y-auto">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: statusConfig[actionModal.action].bg }}
                  >
                    {(() => {
                      const Icon = statusConfig[actionModal.action].icon;
                      return <Icon size={20} style={{ color: statusConfig[actionModal.action].color }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                      {actionModal.action === 'In Transit' ? 'Start Delivery' : actionModal.action === 'Delivered' ? 'Confirm Delivery' : actionModal.action === 'Picked Up' ? 'Confirm Pickup' : 'Mark as Failed'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{actionModal.delivery.delivery_number}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700/50 border-2 border-primary-300 dark:border-primary-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={12} className="text-gray-400 dark:text-gray-500" />
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{actionModal.delivery.destination}</p>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {(actionModal.delivery.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} sacks · ₱{Number(actionModal.delivery.total_value || 0).toLocaleString()}
                  </p>
                </div>

                {/* Proof of Delivery Upload — shown when marking as Delivered (not for return pickups) */}
                {actionModal.action === 'Delivered' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      <Camera size={12} className="inline mr-1" />
                      Proof of Delivery *
                    </label>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">Take a photo or upload images as proof of delivery.</p>

                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => proofInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 border-primary-300 dark:border-primary-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ImageIcon size={14} /> Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setShowCamera(true);
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                            streamRef.current = stream;
                            if (videoRef.current) videoRef.current.srcObject = stream;
                          } catch {
                            setShowCamera(false);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 border-primary-300 dark:border-primary-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Camera size={14} /> Take Photo
                      </button>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={proofInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setProofFiles(prev => [...prev, ...files]);
                        files.forEach(f => {
                          const reader = new FileReader();
                          reader.onloadend = () => setProofPreviews(prev => [...prev, reader.result]);
                          reader.readAsDataURL(f);
                        });
                        e.target.value = '';
                      }}
                    />

                    {/* Camera view */}
                    {showCamera && (
                      <div className="relative mb-2 rounded-lg overflow-hidden border-2 border-primary-300 dark:border-primary-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 object-cover" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const video = videoRef.current;
                              if (!video) return;
                              const canvas = document.createElement('canvas');
                              canvas.width = video.videoWidth;
                              canvas.height = video.videoHeight;
                              canvas.getContext('2d').drawImage(video, 0, 0);
                              canvas.toBlob((blob) => {
                                if (!blob) return;
                                const file = new File([blob], `delivery-proof-${Date.now()}.jpg`, { type: 'image/jpeg' });
                                setProofFiles(prev => [...prev, file]);
                                const reader = new FileReader();
                                reader.onloadend = () => setProofPreviews(prev => [...prev, reader.result]);
                                reader.readAsDataURL(file);
                              }, 'image/jpeg', 0.8);
                            }}
                            className="p-2 bg-white rounded-full shadow-lg"
                          >
                            <Camera size={20} className="text-green-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
                              setShowCamera(false);
                            }}
                            className="p-2 bg-white rounded-full shadow-lg"
                          >
                            <X size={20} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preview thumbnails */}
                    {proofPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {proofPreviews.map((src, idx) => (
                          <div key={idx} className="relative group">
                            <img src={src} alt={`Proof ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border-2 border-primary-300 dark:border-primary-700" />
                            <button
                              type="button"
                              onClick={() => {
                                setProofFiles(prev => prev.filter((_, i) => i !== idx));
                                setProofPreviews(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {proofFiles.length === 0 && (
                      <p className="text-[10px] text-red-500 mt-1">At least one proof photo is required.</p>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                    <MessageSquare size={12} className="inline mr-1" />
                    {actionModal.action === 'Failed' ? 'Reason for failure *' : 'Notes (optional)'}
                  </label>
                  <textarea
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    placeholder={actionModal.action === 'Failed' ? 'Explain why delivery failed...' : 'Add any notes about this delivery...'}
                    className="w-full px-3 py-2 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-xl focus:outline-none transition-all resize-none text-gray-800 dark:text-gray-100"
                    onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    rows={3}
                    required={actionModal.action === 'Failed'}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setActionModal(null); if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setShowCamera(false); }}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={(actionModal.action === 'Failed' && !driverNotes.trim()) || (actionModal.action === 'Delivered' && proofFiles.length === 0) || actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: statusConfig[actionModal.action].color }}
                  >
                    <Send size={13} /> {actionLoading ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* COD Payment Modal */}
      {payModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { if (!payLoading) { setPayModal(null); setPayChangeResult(null); } }} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-primary-200 dark:border-primary-700">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
                    <Banknote size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Collect COD Payment</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{payModal.delivery_number}</p>
                  </div>
                </div>

                {payChangeResult === null ? (
                  <>
                    <div className="p-3 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700/50 border-2 border-primary-300 dark:border-primary-700">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Amount Due</p>
                      <p className="text-xl font-bold" style={{ color: theme.button_primary }}>₱{Number(payModal.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <DollarSign size={12} className="inline mr-1" />
                        Cash Tendered
                      </label>
                      <input
                        type="number"
                        value={payCashTendered}
                        onChange={(e) => setPayCashTendered(e.target.value)}
                        placeholder="Enter amount received..."
                        className="w-full px-3 py-2.5 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-xl focus:outline-none transition-all text-gray-800 dark:text-gray-100"
                        onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
                        min={0}
                        step="0.01"
                      />
                      {/* Quick amount buttons */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[payModal.total, Math.ceil(payModal.total / 100) * 100, Math.ceil(payModal.total / 500) * 500, Math.ceil(payModal.total / 1000) * 1000]
                          .filter((v, i, arr) => arr.indexOf(v) === i)
                          .sort((a, b) => a - b)
                          .map(amount => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setPayCashTendered(String(amount))}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-medium border-2 border-primary-300 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-button-500/10 transition-colors"
                          >
                            ₱{Number(amount).toLocaleString()}
                          </button>
                        ))}
                      </div>
                      {payCashTendered && parseFloat(payCashTendered) >= payModal.total && (
                        <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-700 dark:text-green-400">
                            Change: <span className="font-bold">₱{(parseFloat(payCashTendered) - payModal.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </p>
                        </div>
                      )}
                      {payCashTendered && parseFloat(payCashTendered) < payModal.total && (
                        <p className="text-[10px] text-red-500 mt-1">Amount must be at least ₱{Number(payModal.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPayModal(null); setPayChangeResult(null); }}
                        disabled={payLoading}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmPayment}
                        disabled={payLoading || !payCashTendered || parseFloat(payCashTendered) < payModal.total}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#22c55e' }}
                      >
                        <Banknote size={13} /> {payLoading ? 'Processing...' : 'Confirm Payment'}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Success View */
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Payment Recorded!</h4>
                    {payChangeResult > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Give change: <span className="text-lg font-bold">₱{Number(payChangeResult).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => { setPayModal(null); setPayChangeResult(null); }}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: theme.button_primary }}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Deliveries;
