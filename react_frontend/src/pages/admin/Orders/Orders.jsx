import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Package, DollarSign, Clock, CheckCircle, Truck, XCircle, Ban, FileText, ShoppingBag, RotateCcw, PlayCircle, Loader2, User, Calendar, CreditCard, MapPin, Hash, StickyNote, Receipt, ImageIcon, X, Camera, Banknote } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, LineChart, DonutChart, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient, API_BASE_URL } from '../../../api';
import useDataFetch, { invalidateCache } from '../../../hooks/useDataFetch';

const AdminOrders = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [activeChartPoint, setActiveChartPoint] = useState(null);
  // Chart calendar filter state
  const [chartMonth, setChartMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());
  const [chartYearFrom, setChartYearFrom] = useState(() => new Date().getFullYear() - 4);
  const [chartYearTo, setChartYearTo] = useState(() => new Date().getFullYear());
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnProofFiles, setReturnProofFiles] = useState([]);
  const [returnProofPreviews, setReturnProofPreviews] = useState([]);
  const [isAcceptReturnModalOpen, setIsAcceptReturnModalOpen] = useState(false);
  const [acceptReturnOrder, setAcceptReturnOrder] = useState(null);
  const [pickupDriverId, setPickupDriverId] = useState('');
  const [pickupDrivers, setPickupDrivers] = useState([]);
  const [loadingPickupDrivers, setLoadingPickupDrivers] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [previewProofImage, setPreviewProofImage] = useState(null);
  const [isMarkReturnModalOpen, setIsMarkReturnModalOpen] = useState(false);
  const [markReturnOrder, setMarkReturnOrder] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payOrder, setPayOrder] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [payCashTendered, setPayCashTendered] = useState('');
  const [payGcashRef, setPayGcashRef] = useState('');
  const [payProofFiles, setPayProofFiles] = useState([]);
  const [payProofPreviews, setPayProofPreviews] = useState([]);
  const [payShowCamera, setPayShowCamera] = useState(false);
  const payVideoRef = useRef(null);
  const payStreamRef = useRef(null);
  const payProofInputRef = useRef(null);
  const [activeStatusTab, setActiveStatusTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Return Requested', 'Picking Up', 'Returned', 'Cancelled'];
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'All';
  });
  const [saving, setSaving] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Sync active tab to URL
  useEffect(() => {
    setSearchParams({ tab: activeStatusTab }, { replace: true });
  }, [activeStatusTab]);

  // Fetch real orders from API
  const {
    data: orders,
    loading,
    refetch,
  } = useDataFetch('/sales', {
    cacheKey: '/sales',
    initialData: [],
  });

  // Map API data to order format
  const mappedOrders = useMemo(() =>
    (orders || [])
      .filter(o => o.status !== 'completed' && o.status !== 'voided')
      .map(o => ({
        ...o,
        order_id: o.transaction_id,
        customer: o.customer_name || 'Walk-in',
        items: o.items || [],
        items_count: o.items_count || 0,
        total_quantity: o.total_quantity || 0,
        total: o.total || 0,
        payment_method: o.payment_method === 'cod' ? 'COD' : o.payment_method === 'gcash' ? 'GCash' : o.payment_method === 'pay_later' ? 'Pay Later' : 'Cash',
        raw_payment_method: o.payment_method,
        payment_status: o.payment_status || 'paid',
        status: formatStatus(o.status),
        raw_status: o.status,
        date: o.created_at,
        date_formatted: o.date_formatted,
      })),
    [orders]
  );

  function formatStatus(status) {
    const map = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'return_requested': 'Return Requested',
      'picking_up': 'Picking Up',
      'returned': 'Returned',
      'cancelled': 'Cancelled',
    };
    return map[status] || status;
  }

  function rawStatus(status) {
    const map = {
      'Pending': 'pending',
      'Processing': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Return Requested': 'return_requested',
      'Picking Up': 'picking_up',
      'Returned': 'returned',
      'Cancelled': 'cancelled',
    };
    return map[status] || status;
  }

  const statusTabs = [
    { value: 'All', label: 'All', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-button-500', activeText: 'text-white' },
    { value: 'Pending', label: 'Pending', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', activeBg: 'bg-yellow-500', activeText: 'text-white' },
    { value: 'Processing', label: 'Processing', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-500', activeText: 'text-white' },
    { value: 'Shipped', label: 'Shipped', icon: Truck, color: 'text-button-600', bg: 'bg-button-50', activeBg: 'bg-button-500', activeText: 'text-white' },
    { value: 'Delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', activeBg: 'bg-green-500', activeText: 'text-white' },
    { value: 'Return Requested', label: 'Return', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { value: 'Picking Up', label: 'Picking Up', icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-500', activeText: 'text-white' },
    { value: 'Returned', label: 'Returned', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
    { value: 'Cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
  ];

  const filteredOrdersByTab = useMemo(() => {
    if (activeStatusTab === 'All') return mappedOrders;
    return mappedOrders.filter(o => o.status === activeStatusTab);
  }, [mappedOrders, activeStatusTab]);

  // ─── Handlers ────────────────────────────────────────────

  const handleView = useCallback((order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  }, []);

  const handleCancel = useCallback((order) => {
    setSelectedOrder(order);
    setIsCancelModalOpen(true);
  }, []);

  const handleReturn = useCallback((order) => {
    setSelectedOrder(order);
    setReturnReason('');
    setReturnNotes('');
    setReturnProofFiles([]);
    setReturnProofPreviews([]);
    setIsReturnModalOpen(true);
  }, []);

  // Progress order to next status
  const handleProgressStatus = useCallback(async (order) => {
    if (saving) return;
    const nextStatusMap = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
    };
    const nextStatus = nextStatusMap[order.raw_status];
    if (!nextStatus) return;

    // If shipping, show driver selection modal instead
    if (nextStatus === 'shipped') {
      setShipOrder(order);
      setSelectedDriverId('');
      setDeliveryNotes('');
      setIsShipModalOpen(true);
      // Fetch staff drivers (users with position=Driver)
      setLoadingDrivers(true);
      try {
        const res = await apiClient.get('/users', { params: { role: 'staff' } });
        if (res.success) {
          const staffDrivers = (res.data?.data || res.data || []).filter(u => u.position === 'Driver' && u.status === 'active');
          setDrivers(staffDrivers);
        }
      } catch (err) {
        console.error('Error fetching drivers:', err);
      } finally {
        setLoadingDrivers(false);
      }

      // Auto-estimate delivery date based on distance (with +1 day allowance)
      const distKm = parseFloat(order.distance_km) || 0;
      if (distKm > 0) {
        // Rough estimate: average truck speed ~40 km/h + 1hr loading + 1 day allowance
        const driveHours = distKm / 40;
        const totalHours = driveHours + 1;
        const baseDays = totalHours > 8 ? Math.ceil(totalHours / 8) : 1;
        const daysWithAllowance = baseDays + 1; // +1 day allowance/buffer
        const estimated = new Date();
        estimated.setDate(estimated.getDate() + daysWithAllowance);
        setDeliveryDate(estimated.toISOString().split('T')[0]);
      } else {
        // Default: day after tomorrow (tomorrow + 1 day allowance)
        const est = new Date();
        est.setDate(est.getDate() + 2);
        setDeliveryDate(est.toISOString().split('T')[0]);
      }
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.put(`/sales/${order.id}/status`, { status: nextStatus });
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        const labels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };
        toast.success('Status Updated', `Order ${order.order_id} moved to ${labels[nextStatus]}.`);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Update Failed', error.message || 'Failed to update order status');
    } finally {
      setSaving(false);
    }
  }, [saving, refetch, toast]);

  // Confirm ship with driver assignment
  const handleShipConfirm = useCallback(async () => {
    if (!shipOrder || !selectedDriverId || saving) return;
    setSaving(true);
    try {
      // Get selected driver details
      const selectedDriver = drivers.find(d => String(d.id) === selectedDriverId);

      // 1. Update order status to shipped (include driver info)
      const statusRes = await apiClient.put(`/sales/${shipOrder.id}/status`, {
        status: 'shipped',
        driver_name: selectedDriver?.name || null,
        driver_plate_number: selectedDriver?.truck_plate_number || null,
      });
      if (!statusRes.success) throw statusRes;

      invalidateCache('/sales');
      invalidateCache('/products');
      invalidateCache('/users');
      refetch();
      toast.success('Order Shipped', `Order ${shipOrder.order_id} has been shipped with ${selectedDriver?.name || 'a driver'} assigned.`);
      setIsShipModalOpen(false);
    } catch (error) {
      toast.error('Ship Failed', error.message || 'Failed to ship order');
    } finally {
      setSaving(false);
    }
  }, [shipOrder, selectedDriverId, deliveryDate, deliveryNotes, saving, refetch, toast]);

  const handleCancelConfirm = useCallback(async () => {
    if (!selectedOrder || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.put(`/sales/${selectedOrder.id}/status`, { status: 'cancelled' });
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        toast.success('Order Cancelled', `Order ${selectedOrder.order_id} has been cancelled.`);
        setIsCancelModalOpen(false);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Cancel Failed', error.message || 'Failed to cancel order');
    } finally {
      setSaving(false);
    }
  }, [selectedOrder, saving, refetch, toast]);

  const handleReturnConfirm = useCallback(async () => {
    if (!selectedOrder || !returnReason || saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('return_reason', returnReason);
      if (returnNotes) formData.append('return_notes', returnNotes);
      returnProofFiles.forEach(file => formData.append('return_proof[]', file));

      const response = await apiClient.post(`/sales/${selectedOrder.id}/return`, formData);
      if (response.success) {
        invalidateCache('/sales');
        refetch();
        toast.success('Return Requested', `Return request submitted for order ${selectedOrder.order_id}. Awaiting review.`);
        setIsReturnModalOpen(false);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Return Request Failed', error.message || 'Failed to submit return request');
    } finally {
      setSaving(false);
    }
  }, [selectedOrder, returnReason, returnNotes, returnProofFiles, saving, refetch, toast]);

  // Accept return — assign pickup driver + date
  const handleAcceptReturn = useCallback((order) => {
    setAcceptReturnOrder(order);
    setPickupDriverId('');
    setIsAcceptReturnModalOpen(true);
    // Fetch staff drivers
    setLoadingPickupDrivers(true);
    apiClient.get('/users', { params: { role: 'staff' } }).then(res => {
      if (res.success) {
        const staffDrivers = (res.data?.data || res.data || []).filter(u => u.position === 'Driver' && u.status === 'active');
        setPickupDrivers(staffDrivers);
      }
    }).catch(err => console.error('Error fetching drivers:', err)).finally(() => setLoadingPickupDrivers(false));

    // Auto-estimate pickup date based on distance (like ship flow)
    const distKm = parseFloat(order.distance_km) || 0;
    if (distKm > 0) {
      const driveHours = distKm / 40;
      const totalHours = driveHours + 1;
      const baseDays = totalHours > 8 ? Math.ceil(totalHours / 8) : 1;
      const daysWithAllowance = baseDays + 1;
      const estimated = new Date();
      estimated.setDate(estimated.getDate() + daysWithAllowance);
      setPickupDate(estimated.toISOString().split('T')[0]);
    } else {
      const est = new Date();
      est.setDate(est.getDate() + 2);
      setPickupDate(est.toISOString().split('T')[0]);
    }
  }, []);

  const handleAcceptReturnConfirm = useCallback(async () => {
    if (!acceptReturnOrder || saving) return;
    setSaving(true);
    try {
      const selectedDriver = pickupDrivers.find(d => String(d.id) === pickupDriverId);
      const response = await apiClient.post(`/sales/${acceptReturnOrder.id}/return/accept`, {
        pickup_driver: selectedDriver?.name || null,
        pickup_plate: selectedDriver?.truck_plate_number || null,
        pickup_date: pickupDate || null,
      });
      if (response.success) {
        invalidateCache('/sales');
        refetch();
        toast.success('Return Accepted', `Pickup assigned for order ${acceptReturnOrder.order_id}. Driver is on the way.`);
        setIsAcceptReturnModalOpen(false);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Accept Failed', error.message || 'Failed to accept return');
    } finally {
      setSaving(false);
    }
  }, [acceptReturnOrder, pickupDriverId, pickupDrivers, pickupDate, saving, refetch, toast]);

  // Reject return — revert to delivered
  const handleRejectReturn = useCallback(async (order) => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/sales/${order.id}/return/reject`);
      if (response.success) {
        invalidateCache('/sales');
        refetch();
        toast.success('Return Rejected', `Return rejected for order ${order.order_id}. Reverted to delivered.`);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Reject Failed', error.message || 'Failed to reject return');
    } finally {
      setSaving(false);
    }
  }, [saving, refetch, toast]);

  // Open confirm modal for marking as returned
  const handleMarkReturned = useCallback((order) => {
    setMarkReturnOrder(order);
    setIsMarkReturnModalOpen(true);
  }, []);

  // Confirm mark as returned (stock restored)
  const handleConfirmMarkReturned = useCallback(async () => {
    if (saving || !markReturnOrder) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/sales/${markReturnOrder.id}/return/complete`);
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetch();
        toast.success('Order Returned', `Order ${markReturnOrder.order_id} has been returned. Stock restored.`);
        setIsMarkReturnModalOpen(false);
        setMarkReturnOrder(null);
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Return Failed', error.message || 'Failed to mark as returned');
    } finally {
      setSaving(false);
    }
  }, [saving, markReturnOrder, refetch, toast]);

  // ─── Mark as Paid ────────────────────────────────────────

  const handleOpenPayModal = useCallback((order) => {
    setPayOrder(order);
    setPayMethod('cash');
    setPayCashTendered('');
    setPayGcashRef('');
    setPayProofFiles([]);
    setPayProofPreviews([]);
    setPayShowCamera(false);
    setIsPayModalOpen(true);
  }, []);

  const stopPayCamera = useCallback(() => {
    if (payStreamRef.current) {
      payStreamRef.current.getTracks().forEach(t => t.stop());
      payStreamRef.current = null;
    }
    setPayShowCamera(false);
  }, []);

  const startPayCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      payStreamRef.current = stream;
      setPayShowCamera(true);
      setTimeout(() => { if (payVideoRef.current) payVideoRef.current.srcObject = stream; }, 100);
    } catch {
      toast.error('Camera Error', 'Could not access camera.');
    }
  }, [toast]);

  const capturePayPhoto = useCallback(() => {
    if (!payVideoRef.current) return;
    const video = payVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `pay_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPayProofFiles(prev => [...prev, file]);
      setPayProofPreviews(prev => [...prev, URL.createObjectURL(blob)]);
      stopPayCamera();
    }, 'image/jpeg', 0.85);
  }, [stopPayCamera]);

  const handlePayProofUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPayProofFiles(prev => [...prev, ...files]);
    setPayProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  }, []);

  const removePayProof = useCallback((idx) => {
    setPayProofFiles(prev => prev.filter((_, i) => i !== idx));
    setPayProofPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleConfirmPay = useCallback(async () => {
    if (saving || !payOrder) return;
    if (payMethod === 'cash' && (!payCashTendered || parseFloat(payCashTendered) < payOrder.total)) return;
    if (payMethod === 'gcash' && !payGcashRef.trim()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('payment_method', payMethod);
      if (payMethod === 'cash') {
        formData.append('amount_tendered', parseFloat(payCashTendered));
      }
      if (payMethod === 'gcash' && payGcashRef) {
        formData.append('reference_number', payGcashRef);
      }
      payProofFiles.forEach(file => formData.append('payment_proof[]', file));

      const response = await apiClient.post(`/sales/${payOrder.id}/pay`, formData);
      if (response.success) {
        invalidateCache('/sales');
        refetch();
        toast.success('Payment Recorded', `Order ${payOrder.order_id} has been marked as paid.`);
        setIsPayModalOpen(false);
        setPayOrder(null);
        stopPayCamera();
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Payment Failed', error.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }, [saving, payOrder, payMethod, payCashTendered, payGcashRef, payProofFiles, refetch, toast, stopPayCamera]);

  // ─── Chart Helpers ────────────────────────────────────────

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Helper: get the week ranges for a given month/year
  const getWeeksInMonth = useCallback((year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    let start = new Date(firstDay);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);
    while (start.getMonth() <= month || (start.getMonth() > month && start.getFullYear() < year) || weeks.length === 0) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
      weeks.push({ start: new Date(start), end: new Date(end), label });
      start.setDate(start.getDate() + 7);
      if (start.getMonth() > month && start.getFullYear() === year) break;
      if (start.getFullYear() > year) break;
      if (weeks.length >= 6) break;
    }
    return weeks;
  }, []);

  // Helper: checks if an order matches the active chart point filter
  const matchesChartPoint = useCallback((o) => {
    if (!activeChartPoint || !o.date) return true;
    const date = new Date(o.date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      return date.getFullYear() === y && date.getMonth() === m - 1 && String(date.getDate()) === activeChartPoint;
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      const week = weeks.find(w => w.label === activeChartPoint);
      if (!week) return false;
      return date >= week.start && date <= new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate(), 23, 59, 59);
    }
    if (chartPeriod === 'monthly') return date.getFullYear() === chartYear && months[date.getMonth()] === activeChartPoint;
    if (chartPeriod === 'bi-annually') {
      if (activeChartPoint === 'H1') return date.getFullYear() === chartYear && date.getMonth() < 6;
      if (activeChartPoint === 'H2') return date.getFullYear() === chartYear && date.getMonth() >= 6;
      return false;
    }
    if (chartPeriod === 'annually') return String(date.getFullYear()) === activeChartPoint;
    return true;
  }, [activeChartPoint, chartPeriod, chartMonth, chartYear, getWeeksInMonth]);

  // Helper: check if an order date falls within the current chart scope
  const isInChartScope = useCallback((o) => {
    if (!o.date) return false;
    const date = new Date(o.date);
    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      return date.getFullYear() === y && date.getMonth() === m - 1;
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      if (weeks.length === 0) return false;
      return date >= weeks[0].start && date <= new Date(weeks[weeks.length - 1].end.getFullYear(), weeks[weeks.length - 1].end.getMonth(), weeks[weeks.length - 1].end.getDate(), 23, 59, 59);
    }
    if (chartPeriod === 'monthly') return date.getFullYear() === chartYear;
    if (chartPeriod === 'bi-annually') return date.getFullYear() === chartYear;
    if (chartPeriod === 'annually') return date.getFullYear() >= chartYearFrom && date.getFullYear() <= chartYearTo;
    return true;
  }, [chartPeriod, chartMonth, chartYear, chartYearFrom, chartYearTo, getWeeksInMonth]);

  // Chart-filtered orders — used for stats, cards, table (scoped by calendar + dot)
  const chartFilteredOrders = useMemo(() => {
    const scoped = mappedOrders.filter(isInChartScope);
    if (!activeChartPoint) return scoped;
    return scoped.filter(matchesChartPoint);
  }, [mappedOrders, isInChartScope, activeChartPoint, matchesChartPoint]);

  // ─── Stats ───────────────────────────────────────────────

  const totalRevenue = chartFilteredOrders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = chartFilteredOrders.filter(o => o.status === 'Pending').length;
  const deliveredOrders = chartFilteredOrders.filter(o => o.status === 'Delivered').length;
  const totalItems = chartFilteredOrders.reduce((sum, o) => sum + o.total_quantity, 0);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (chartPeriod === 'daily') {
      const [y, m] = chartMonth.split('-').map(Number);
      const daysInMonth = getDaysInMonth(y, m - 1);
      const dayGroups = {};
      mappedOrders.forEach(o => {
        if (!o.date) return;
        const date = new Date(o.date);
        if (date.getFullYear() === y && date.getMonth() === m - 1) {
          const day = date.getDate();
          if (!dayGroups[day]) dayGroups[day] = 0;
          dayGroups[day] += o.total;
        }
      });
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        value: dayGroups[i + 1] || 0,
      }));
    }
    if (chartPeriod === 'weekly') {
      const [y, m] = chartMonth.split('-').map(Number);
      const weeks = getWeeksInMonth(y, m - 1);
      return weeks.map(week => {
        let value = 0;
        mappedOrders.forEach(o => {
          if (!o.date) return;
          const date = new Date(o.date);
          if (date >= week.start && date <= new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate(), 23, 59, 59)) {
            value += o.total;
          }
        });
        return { name: week.label, value };
      });
    }
    if (chartPeriod === 'monthly') {
      const monthGroups = {};
      mappedOrders.forEach(o => {
        if (!o.date) return;
        const date = new Date(o.date);
        if (date.getFullYear() === chartYear) {
          const month = date.getMonth();
          if (!monthGroups[month]) monthGroups[month] = 0;
          monthGroups[month] += o.total;
        }
      });
      return months.map((name, i) => ({ name, value: monthGroups[i] || 0 }));
    }
    if (chartPeriod === 'bi-annually') {
      const h1 = { value: 0 }, h2 = { value: 0 };
      mappedOrders.forEach(o => {
        if (!o.date) return;
        const date = new Date(o.date);
        if (date.getFullYear() === chartYear) {
          (date.getMonth() < 6 ? h1 : h2).value += o.total;
        }
      });
      return [
        { name: 'H1', fullName: `Jan - Jun ${chartYear}`, value: h1.value },
        { name: 'H2', fullName: `Jul - Dec ${chartYear}`, value: h2.value },
      ];
    }
    // annually
    const years = [];
    for (let y = chartYearFrom; y <= chartYearTo; y++) years.push(y);
    const yearGroups = {};
    mappedOrders.forEach(o => {
      if (!o.date) return;
      const date = new Date(o.date);
      const year = date.getFullYear();
      if (year >= chartYearFrom && year <= chartYearTo) {
        if (!yearGroups[year]) yearGroups[year] = 0;
        yearGroups[year] += o.total;
      }
    });
    return years.map(year => ({ name: year.toString(), value: yearGroups[year] || 0 }));
  }, [mappedOrders, chartPeriod, chartMonth, chartYear, chartYearFrom, chartYearTo, getWeeksInMonth]);

  const avgPerDay = useMemo(() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const monthOrders = mappedOrders.filter(o => {
      const date = new Date(o.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
    return Math.round(monthOrders / daysInMonth * 10) / 10;
  }, [mappedOrders]);

  const statusBreakdown = useMemo(() => [
    { name: 'Delivered', value: chartFilteredOrders.filter(o => o.status === 'Delivered').length, color: '#22c55e' },
    { name: 'Pending', value: chartFilteredOrders.filter(o => o.status === 'Pending').length, color: '#eab308' },
    { name: 'Processing', value: chartFilteredOrders.filter(o => o.status === 'Processing').length, color: '#3b82f6' },
    { name: 'Shipped', value: chartFilteredOrders.filter(o => o.status === 'Shipped').length, color: '#a855f7' },
    { name: 'Return Requested', value: chartFilteredOrders.filter(o => o.status === 'Return Requested').length, color: '#f97316' },
    { name: 'Picking Up', value: chartFilteredOrders.filter(o => o.status === 'Picking Up').length, color: '#f59e0b' },
    { name: 'Returned', value: chartFilteredOrders.filter(o => o.status === 'Returned').length, color: '#fb923c' },
    { name: 'Cancelled', value: chartFilteredOrders.filter(o => o.status === 'Cancelled').length, color: '#ef4444' },
  ], [chartFilteredOrders]);

  const paymentBreakdown = useMemo(() => {
    const groups = {};
    const colors = { 'Cash': '#22c55e', 'GCash': '#3b82f6', 'COD': '#f59e0b' };
    chartFilteredOrders.forEach(o => {
      if (!groups[o.payment_method]) groups[o.payment_method] = 0;
      groups[o.payment_method]++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value, color: colors[name] || '#6b7280' }));
  }, [chartFilteredOrders]);

  // Next status label for progress button
  const getNextAction = (rawSt) => {
    const map = {
      'pending': { label: 'Process', icon: PlayCircle, color: 'text-blue-500 hover:bg-blue-50 hover:text-blue-600' },
      'processing': { label: 'Ship', icon: Truck, color: 'text-button-500 hover:bg-button-50 hover:text-button-600' },
      'shipped': { label: 'Deliver', icon: CheckCircle, color: 'text-green-500 hover:bg-green-50 hover:text-green-600' },
    };
    return map[rawSt] || null;
  };

  // Hide Actions column for tabs that have no actions
  const tabsWithNoActions = ['Returned', 'Cancelled'];
  const showActions = !tabsWithNoActions.includes(activeStatusTab);

  const baseColumns = [
    { header: 'Order ID', accessor: 'order_id' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Products', accessor: 'products_summary', cell: (row) => {
      const items = row.items || [];
      if (items.length === 0) return <span className="text-gray-400 text-xs">No items</span>;
      return (
        <div className="flex flex-col gap-0.5 max-w-[220px]">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.variety_color || '#6B7280' }} />
              <span className="text-gray-700 truncate">
                {item.product_name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}
              </span>
              <span className="text-gray-400 shrink-0">×{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <span className="text-[10px] text-gray-400 italic">+{items.length - 3} more</span>
          )}
        </div>
      );
    }},
    { header: 'Total', accessor: 'total', cell: (row) => `₱${row.total.toLocaleString()}` },
    { header: 'Payment', accessor: 'payment_method', cell: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs">{row.payment_method}</span>
        {row.payment_status === 'not_paid' && (
          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 w-fit">Not Paid</span>
        )}
      </div>
    )},
    { header: 'Date', accessor: 'date', cell: (row) => row.date_formatted },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const actionsColumn = {
    header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => {
      const nextAction = getNextAction(row.raw_status);
      const hasAnyAction = nextAction ||
        row.raw_status === 'pending' || row.raw_status === 'processing' ||
        row.raw_status === 'delivered' || row.raw_status === 'return_requested' ||
        row.raw_status === 'picking_up' || row.payment_status === 'not_paid';

      if (!hasAnyAction) return null;

      return (
        <div className="flex items-center gap-1">
          {nextAction && (
            <button
              onClick={() => handleProgressStatus(row)}
              disabled={saving}
              className={`p-1.5 rounded-lg transition-colors ${nextAction.color} disabled:opacity-50`}
              title={nextAction.label}
            >
              <nextAction.icon size={15} />
            </button>
          )}
          {(row.raw_status === 'pending' || row.raw_status === 'processing') && (
            <button
              onClick={() => handleCancel(row)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Cancel Order"
            >
              <Ban size={15} />
            </button>
          )}
          {row.raw_status === 'delivered' && (
            <button
              onClick={() => handleReturn(row)}
              className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              title="Request Return"
            >
              <RotateCcw size={15} />
            </button>
          )}
          {row.raw_status === 'return_requested' && (
            <>
              <button
                onClick={() => handleAcceptReturn(row)}
                disabled={saving}
                className="p-1.5 rounded-lg text-button-500 hover:bg-button-50 hover:text-button-600 transition-colors disabled:opacity-50"
                title="Accept Return"
              >
                <CheckCircle size={15} />
              </button>
              <button
                onClick={() => handleRejectReturn(row)}
                disabled={saving}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Reject Return"
              >
                <XCircle size={15} />
              </button>
            </>
          )}
          {row.raw_status === 'picking_up' && (
            <button
              onClick={() => handleMarkReturned(row)}
              disabled={saving}
              className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors disabled:opacity-50"
              title="Mark as Returned"
            >
              <RotateCcw size={15} />
            </button>
          )}
          {row.payment_status === 'not_paid' && row.raw_status !== 'cancelled' && row.raw_status !== 'returned' && (
            <button
              onClick={() => handleOpenPayModal(row)}
              disabled={saving}
              className="p-1.5 rounded-lg text-button-500 hover:bg-button-50 hover:text-button-600 transition-colors disabled:opacity-50"
              title="Mark as Paid"
            >
              <Banknote size={15} />
            </button>
          )}
        </div>
      );
    },
  };

  const columns = showActions ? [...baseColumns, actionsColumn] : baseColumns;

  return (
    <div>
      <PageHeader title="Orders" description="Manage customer and client orders" icon={ClipboardList} />

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`} unit="delivered" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Total Orders" value={mappedOrders.length} unit="orders" icon={ClipboardList} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Pending" value={pendingOrders} unit="awaiting" icon={Clock} iconBgColor="bg-gradient-to-br from-yellow-400 to-yellow-600" />
          <StatsCard label="Delivered" value={deliveredOrders} unit="completed" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-green-400 to-green-600" />
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <LineChart
              title="Order Trends"
              subtitle={activeChartPoint ? `Filtered: ${activeChartPoint} — click dot again to clear` : "Revenue from customer orders"}
              data={chartData}
              lines={[{ dataKey: 'value', name: 'Revenue (₱)' }]}
              height={280}
              yAxisUnit="₱"
              headerRight={
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={chartPeriod}
                    onChange={(e) => { setChartPeriod(e.target.value); setActiveChartPoint(null); }}
                    className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="bi-annually">Bi-Annually</option>
                    <option value="annually">Annually</option>
                  </select>
                  {(chartPeriod === 'daily' || chartPeriod === 'weekly') && (
                    <input
                      type="month"
                      value={chartMonth}
                      onChange={(e) => { setChartMonth(e.target.value); setActiveChartPoint(null); }}
                      className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                  {(chartPeriod === 'monthly' || chartPeriod === 'bi-annually') && (
                    <input
                      type="number"
                      value={chartYear}
                      onChange={(e) => { setChartYear(parseInt(e.target.value) || new Date().getFullYear()); setActiveChartPoint(null); }}
                      min="2000"
                      max={new Date().getFullYear()}
                      className="px-3 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-24"
                    />
                  )}
                  {chartPeriod === 'annually' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={chartYearFrom}
                        onChange={(e) => { const v = parseInt(e.target.value) || 2000; setChartYearFrom(v); setActiveChartPoint(null); }}
                        min="2000"
                        max={chartYearTo}
                        className="px-2 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-20"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                      <input
                        type="number"
                        value={chartYearTo}
                        onChange={(e) => { const v = parseInt(e.target.value) || new Date().getFullYear(); setChartYearTo(v); setActiveChartPoint(null); }}
                        min={chartYearFrom}
                        max={new Date().getFullYear()}
                        className="px-2 py-1.5 text-sm font-medium border-2 border-primary-200 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-20"
                      />
                    </div>
                  )}
                </div>
              }
              onDotClick={setActiveChartPoint}
              activePoint={activeChartPoint}
              summaryStats={[
                { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, color: 'text-primary-600' },
                { label: 'Avg/Day', value: `${avgPerDay} orders`, color: 'text-primary-600' },
                { label: 'Items Ordered', value: totalItems.toString(), color: 'text-green-600' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <DonutChart title="Order Status" subtitle="Breakdown by status" data={statusBreakdown} centerValue={chartFilteredOrders.length} centerLabel="Orders" height={175} innerRadius={56} outerRadius={78} valueUnit="" horizontalLegend={true} compactLegend={true} />
            <DonutChart title="Payment Method" subtitle="Breakdown by payment" data={paymentBreakdown} centerValue={chartFilteredOrders.length} centerLabel="Orders" height={140} innerRadius={45} outerRadius={62} valueUnit="" horizontalLegend={true} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : (
        <>
          {/* Status Tabs */}
          <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 mb-0 rounded-b-none border-b-0">
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
                {statusTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeStatusTab === tab.value;
                  const count = tab.value === 'All' ? mappedOrders.length : mappedOrders.filter(o => o.status === tab.value).length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveStatusTab(tab.value)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all whitespace-nowrap border-2 border-b-0 ${
                        isActive
                          ? `${tab.activeBg} ${tab.activeText} border-transparent shadow-md`
                          : `${tab.bg} ${tab.color} border-transparent hover:shadow-sm`
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/80 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DataTable
            title="Order Records"
            subtitle={activeStatusTab === 'All' ? 'All customer orders' : `Showing ${activeStatusTab.toLowerCase()} orders`}
            columns={columns}
            data={chartFilteredOrdersByTab}
            searchPlaceholder="Search orders..."
            dateFilterField="date"
            onRowDoubleClick={handleView}
          />
        </>
      )}

      {/* View Order Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order Details — ${selectedOrder?.order_id || ''}`}
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-3">
            {/* Header with Order ID & Status */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-button-50 rounded-xl border-2 border-primary-200">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">{selectedOrder.order_id}</h3>
                  <p className="text-xs text-gray-500">{selectedOrder.date_formatted}</p>
                </div>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Customer */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <User size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{selectedOrder.customer}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className={`p-1.5 rounded-lg ${selectedOrder.payment_status === 'not_paid' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  <CreditCard size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedOrder.payment_method}</p>
                  {selectedOrder.reference_number && (
                    <p className="text-xs text-gray-400 truncate">Ref: {selectedOrder.reference_number}</p>
                  )}
                  {selectedOrder.payment_status === 'not_paid' ? (
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 mt-0.5">Not Paid</span>
                  ) : selectedOrder.paid_at_formatted && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Paid: {selectedOrder.paid_at_formatted}</p>
                  )}
                </div>
              </div>

              {/* Items Count */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-button-100 text-button-600">
                  <Package size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedOrder.items_count} item{selectedOrder.items_count > 1 ? 's' : ''} ({selectedOrder.total_quantity} pcs)</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Date</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedOrder.date_formatted}</p>
                </div>
              </div>
            </div>

            {/* Payment Proof Images */}
            {selectedOrder.payment_proof?.length > 0 && (
              <div className="bg-button-50 rounded-xl p-3 border border-button-200">
                <p className="text-xs font-bold text-button-600 uppercase tracking-wide mb-2">Payment Proof</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.payment_proof.map((url, idx) => (
                    <img
                      key={idx}
                      src={`${API_BASE_URL.replace('/api', '')}${url}`}
                      alt={`Payment proof ${idx + 1}`}
                      className="w-[80px] h-[80px] object-cover rounded-lg border border-button-200 cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewProofImage(`${API_BASE_URL.replace('/api', '')}${url}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div className="flex items-start gap-2 p-2.5 bg-button-50 rounded-xl border border-button-200">
                <div className="p-1.5 rounded-lg bg-button-100 text-button-600">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-button-600 uppercase tracking-wide">Delivery Address</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedOrder.delivery_address}</p>
                  {selectedOrder.distance_km && (
                    <p className="text-xs text-button-500 mt-0.5">{parseFloat(selectedOrder.distance_km).toFixed(1)} km from warehouse</p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Driver */}
            {selectedOrder.driver_name && (
              <div className="flex items-center gap-3 p-2.5 bg-button-50 rounded-xl border border-button-200">
                <div className="w-9 h-9 bg-button-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-button-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-button-600 uppercase tracking-wide">Assigned Driver</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedOrder.driver_name}</p>
                </div>
                {selectedOrder.driver_plate_number && (
                  <span className="text-xs font-bold text-button-600 bg-button-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                    <Truck size={10} /> {selectedOrder.driver_plate_number}
                  </span>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                  <StickyNote size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Order Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            {/* Return Info */}
            {selectedOrder.return_reason && (
              <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <RotateCcw size={14} />
                  </div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Return Information</p>
                </div>
                <p className="text-sm font-semibold text-orange-800">{selectedOrder.return_reason}</p>
                {selectedOrder.return_notes && (
                  <p className="text-xs text-orange-600 mt-1 italic">{selectedOrder.return_notes}</p>
                )}
                {selectedOrder.return_proof?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-orange-600 mb-1">Proof {selectedOrder.return_proof.length > 1 ? 'Images' : 'Image'}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.return_proof.map((url, idx) => (
                        <img
                          key={idx}
                          src={`${API_BASE_URL.replace('/api', '')}${url}`}
                          alt={`Return proof ${idx + 1}`}
                          className="w-[120px] h-[120px] object-cover rounded-lg border border-orange-200 cursor-pointer hover:opacity-80"
                          onClick={() => setPreviewProofImage(`${API_BASE_URL.replace('/api', '')}${url}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {selectedOrder.return_pickup_driver && (
                  <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck size={12} className="text-orange-500" />
                      <span className="text-xs text-orange-700">
                        <span className="font-semibold">Pickup Driver:</span> {selectedOrder.return_pickup_driver}
                        {selectedOrder.return_pickup_plate && ` — ${selectedOrder.return_pickup_plate}`}
                      </span>
                    </div>
                    {selectedOrder.return_pickup_date_formatted && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-orange-500" />
                        <span className="text-xs text-orange-700">
                          <span className="font-semibold">Est. Pickup:</span> {selectedOrder.return_pickup_date_formatted}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Order Items</p>
              <div className="rounded-xl border-2 border-primary-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Product</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Price</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.variety_color || '#6B7280' }} />
                            <span className="text-gray-800 text-xs font-medium">{item.product_name || item.name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600 text-xs">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 text-xs">₱{(item.unit_price || item.price || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800 text-xs">₱{(item.subtotal || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    {selectedOrder.delivery_fee > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Delivery Fee</td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-600">₱{selectedOrder.delivery_fee.toLocaleString()}</td>
                      </tr>
                    )}
                    {selectedOrder.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-500">Discount</td>
                        <td className="px-3 py-1.5 text-right text-xs text-red-500">-₱{selectedOrder.discount.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">₱{selectedOrder.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Total Summary Card */}
            <div className="p-3 bg-button-50 rounded-xl border border-button-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-button-700">Order Total</span>
                <span className="text-xl font-bold text-button-600">₱{selectedOrder.total.toLocaleString()}</span>
              </div>
              {(selectedOrder.delivery_fee > 0 || selectedOrder.discount > 0) && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Subtotal: ₱{selectedOrder.subtotal?.toLocaleString() || selectedOrder.total.toLocaleString()}</span>
                  {selectedOrder.delivery_fee > 0 && <span>+ ₱{selectedOrder.delivery_fee.toLocaleString()} delivery</span>}
                  {selectedOrder.discount > 0 && <span>- ₱{selectedOrder.discount.toLocaleString()} discount</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Order"
        message={`Are you sure you want to cancel "${selectedOrder?.order_id}"?${selectedOrder?.raw_status === 'processing' ? ' Stock will be restored.' : ''}`}
        confirmText={saving ? 'Cancelling...' : 'Cancel Order'}
        variant="danger"
        icon={Ban}
      />

      {/* Return Request Modal */}
      <FormModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSubmit={handleReturnConfirm}
        title={`Request Return — ${selectedOrder?.order_id || ''}`}
        submitText={saving ? 'Submitting...' : 'Submit Return Request'}
        size="md"
        loading={saving}
      >
        {({ submitted }) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Customer</p>
                <p className="text-sm font-semibold text-gray-800">{selectedOrder?.customer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-sm font-semibold text-gray-800">₱{selectedOrder?.total?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Current Status</p>
                <StatusBadge status={selectedOrder?.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Items</p>
                <p className="text-sm text-gray-800">{selectedOrder?.items_count} item(s)</p>
              </div>
            </div>

            {selectedOrder?.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Items to Return</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-800">{item.product_name || item.name}</span>
                        <span className="text-sm text-gray-600">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <FormSelect
              label="Return Reason"
              name="returnReason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              options={[
                { value: 'Damaged Product', label: 'Damaged Product' },
                { value: 'Wrong Item', label: 'Wrong Item Received' },
                { value: 'Quality Issue', label: 'Quality Issue' },
                { value: 'Excess Order', label: 'Excess Order / Overstock' },
                { value: 'Customer Changed Mind', label: 'Customer Changed Mind' },
                { value: 'Other', label: 'Other' },
              ]}
              required
              submitted={submitted}
            />

            <FormInput
              label="Additional Notes (Optional)"
              name="returnNotes"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Any additional details about the return..."
            />

            {/* Proof Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proof Images (Optional)
              </label>
              <p className="text-xs text-gray-400 mb-2">Upload photos showing the reason for return (damaged item, wrong product, etc.)</p>
              {returnProofPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {returnProofPreviews.map((preview, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img src={preview} alt={`Proof ${idx + 1}`} className="w-[100px] h-[100px] object-cover rounded-lg border-2 border-primary-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setReturnProofFiles(prev => prev.filter((_, i) => i !== idx));
                          setReturnProofPreviews(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                <div className="text-center">
                  <ImageIcon size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">{returnProofPreviews.length > 0 ? 'Add more photos' : 'Click to upload proof'}</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length) {
                      setReturnProofFiles(prev => [...prev, ...files]);
                      setReturnProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </FormModal>

      {/* Accept Return Modal — Assign Pickup Driver & Date */}
      <Modal
        isOpen={isAcceptReturnModalOpen}
        onClose={() => setIsAcceptReturnModalOpen(false)}
        title={`Accept Return — ${acceptReturnOrder?.order_id || ''}`}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsAcceptReturnModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptReturnConfirm}
              disabled={saving}
              className="px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {saving ? 'Processing...' : 'Accept & Assign Pickup'}
            </button>
          </div>
        }
      >
        {acceptReturnOrder && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-800">{acceptReturnOrder.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold text-gray-800">₱{acceptReturnOrder.total?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="font-semibold text-gray-800">{acceptReturnOrder.items_count} item{acceptReturnOrder.items_count > 1 ? 's' : ''} ({acceptReturnOrder.total_quantity} pcs)</p>
                </div>
              </div>
              {acceptReturnOrder.delivery_address && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Pickup Address (customer delivery address)</p>
                  <p className="text-sm font-medium text-gray-800">{acceptReturnOrder.delivery_address}</p>
                  {acceptReturnOrder.distance_km && (
                    <p className="text-xs text-gray-400 mt-0.5">{parseFloat(acceptReturnOrder.distance_km).toFixed(1)} km from warehouse</p>
                  )}
                </div>
              )}
            </div>

            {/* Return Reason */}
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Return Reason</p>
              <p className="text-sm font-semibold text-orange-800">{acceptReturnOrder.return_reason}</p>
              {acceptReturnOrder.return_notes && (
                <p className="text-xs text-orange-600 mt-1 italic">{acceptReturnOrder.return_notes}</p>
              )}
              {acceptReturnOrder.return_proof?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-orange-600 mb-1">Proof {acceptReturnOrder.return_proof.length > 1 ? 'Images' : 'Image'}</p>
                  <div className="flex flex-wrap gap-2">
                    {acceptReturnOrder.return_proof.map((url, idx) => (
                      <img
                        key={idx}
                        src={`${API_BASE_URL.replace('/api', '')}${url}`}
                        alt={`Return proof ${idx + 1}`}
                        className="w-[100px] h-[100px] object-cover rounded-lg border border-orange-200 cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewProofImage(`${API_BASE_URL.replace('/api', '')}${url}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Items being returned */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Items to be returned (stock will be restored upon completion)</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {(acceptReturnOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.variety_color || '#6B7280' }} />
                        <span className="text-sm text-gray-800">{item.product_name || item.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pickup Driver Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Pickup Driver *</label>
              <p className="text-xs text-gray-400 mb-2">Select a driver to pick up the returned items from the customer.</p>
              {loadingPickupDrivers ? (
                <div className="flex items-center gap-2 p-4 text-gray-500">
                  <Loader2 size={18} className="animate-spin" /> Loading drivers...
                </div>
              ) : pickupDrivers.length === 0 ? (
                <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg">No active drivers available. Please add drivers first.</p>
              ) : (
                <>
                  <select
                    value={pickupDriverId}
                    onChange={(e) => setPickupDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                  >
                    <option value="">Select driver...</option>
                    {pickupDrivers.map(driver => (
                      <option key={driver.id} value={String(driver.id)}>
                        {driver.name}{driver.truck_plate_number ? ` — ${driver.truck_plate_number}` : ''}
                      </option>
                    ))}
                  </select>
                  {pickupDriverId && (() => {
                    const d = pickupDrivers.find(dr => String(dr.id) === pickupDriverId);
                    if (!d) return null;
                    return (
                      <div className="mt-2 flex items-center gap-3 p-2.5 bg-button-50 border border-button-200 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-button-200 flex items-center justify-center text-button-700 font-bold text-sm">
                          {d.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{d.name}</p>
                          <p className="text-xs text-gray-500 truncate">{d.phone || d.email || 'No contact'}</p>
                        </div>
                        {d.truck_plate_number && (
                          <span className="text-xs font-bold text-button-600 bg-button-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                            <Truck size={10} /> {d.truck_plate_number}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Estimated Pickup Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Pickup Date *</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {acceptReturnOrder && (() => {
                const distKm = parseFloat(acceptReturnOrder.distance_km) || 0;
                if (distKm <= 0) return <p className="text-[11px] text-gray-400 mt-1">Estimated: within 2 days (no distance data — +1 day allowance)</p>;
                const driveHrs = distKm / 40;
                const totalHrs = driveHrs + 1;
                const baseDays = totalHrs > 8 ? Math.ceil(totalHrs / 8) : 1;
                const withAllowance = baseDays + 1;
                const earliest = new Date(); earliest.setDate(earliest.getDate() + baseDays);
                const latest = new Date(); latest.setDate(latest.getDate() + withAllowance);
                const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                return (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Est. {fmt(earliest)} – {fmt(latest)} ({distKm.toFixed(1)} km · ~{Math.ceil(totalHrs)} hrs travel + 1 day allowance)
                  </p>
                );
              })()}
            </div>

            {/* Pickup Summary Preview */}
            {pickupDriverId && (() => {
              const selectedDriver = pickupDrivers.find(d => String(d.id) === pickupDriverId);
              if (!selectedDriver) return null;
              return (
                <div className="bg-button-50 border border-button-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-button-600 uppercase tracking-wide mb-1.5">Pickup Summary</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><span className="font-semibold">Driver:</span> {selectedDriver.name}</p>
                    {selectedDriver.truck_plate_number && (
                      <p><span className="font-semibold">Plate No.:</span> {selectedDriver.truck_plate_number}</p>
                    )}
                    {(selectedDriver.phone || selectedDriver.email) && (
                      <p><span className="font-semibold">Contact:</span> {selectedDriver.phone || selectedDriver.email}</p>
                    )}
                    {acceptReturnOrder.delivery_address && (
                      <p><span className="font-semibold">Pickup from:</span> {acceptReturnOrder.delivery_address}</p>
                    )}
                    {pickupDate && (
                      <p><span className="font-semibold">Est. Pickup:</span> {new Date(pickupDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Note:</span> Accepting will set the order to "Picking Up". Stock will be restored when the driver marks the order as "Returned" after pickup is complete.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Ship Order — Driver Selection Modal */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title={`Assign Driver — ${shipOrder?.order_id || ''}`}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsShipModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShipConfirm}
              disabled={saving || !selectedDriverId}
              className="px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              {saving ? 'Shipping...' : 'Confirm & Ship'}
            </button>
          </div>
        }
      >
        {shipOrder && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-800">{shipOrder.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold text-gray-800">₱{shipOrder.total?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="font-semibold text-gray-800">{shipOrder.items_count} item{shipOrder.items_count > 1 ? 's' : ''} ({shipOrder.total_quantity} pcs)</p>
                </div>
              </div>
              {shipOrder.delivery_address && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Delivery Address</p>
                  <p className="text-sm font-medium text-gray-800">{shipOrder.delivery_address}</p>
                </div>
              )}
            </div>

            {/* Driver Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver *</label>
              {loadingDrivers ? (
                <div className="flex items-center gap-2 p-4 text-gray-500">
                  <Loader2 size={18} className="animate-spin" /> Loading drivers...
                </div>
              ) : drivers.length === 0 ? (
                <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg">No active drivers available. Please add drivers first.</p>
              ) : (
                <>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                  >
                    <option value="">Select driver...</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={String(driver.id)}>
                        {driver.name}{driver.truck_plate_number ? ` — ${driver.truck_plate_number}` : ''}
                      </option>
                    ))}
                  </select>
                  {/* Selected driver info card */}
                  {selectedDriverId && (() => {
                    const d = drivers.find(dr => String(dr.id) === selectedDriverId);
                    if (!d) return null;
                    return (
                      <div className="mt-2 flex items-center gap-3 p-2.5 bg-button-50 border border-button-200 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-button-200 flex items-center justify-center text-button-700 font-bold text-sm">
                          {d.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{d.name}</p>
                          <p className="text-xs text-gray-500 truncate">{d.phone || d.email || 'No contact'}</p>
                        </div>
                        {d.truck_plate_number && (
                          <span className="text-xs font-bold text-button-600 bg-button-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                            <Truck size={10} /> {d.truck_plate_number}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Estimated Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery Date *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {shipOrder && (() => {
                const distKm = parseFloat(shipOrder.distance_km) || 0;
                if (distKm <= 0) return <p className="text-[11px] text-gray-400 mt-1">Estimated: within 2 days (no distance data — +1 day allowance)</p>;
                const driveHrs = distKm / 40;
                const totalHrs = driveHrs + 1;
                const baseDays = totalHrs > 8 ? Math.ceil(totalHrs / 8) : 1;
                const withAllowance = baseDays + 1;
                const earliest = new Date(); earliest.setDate(earliest.getDate() + baseDays);
                const latest = new Date(); latest.setDate(latest.getDate() + withAllowance);
                const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                return (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Est. {fmt(earliest)} – {fmt(latest)} ({distKm.toFixed(1)} km · ~{Math.ceil(totalHrs)} hrs travel + 1 day allowance)
                  </p>
                );
              })()}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any special instructions for the driver..."
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Client Delivery Note Preview */}
            {selectedDriverId && (() => {
              const selectedDriver = drivers.find(d => String(d.id) === selectedDriverId);
              if (!selectedDriver) return null;
              return (
                <div className="bg-button-50 border border-button-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-button-600 uppercase tracking-wide mb-1.5">Client Delivery Note</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><span className="font-semibold">Driver:</span> {selectedDriver.name}</p>
                    {selectedDriver.truck_plate_number && (
                      <p><span className="font-semibold">Plate No.:</span> {selectedDriver.truck_plate_number}</p>
                    )}
                    {(selectedDriver.phone || selectedDriver.email) && (
                      <p><span className="font-semibold">Contact:</span> {selectedDriver.phone || selectedDriver.email}</p>
                    )}
                    {shipOrder.delivery_address && (
                      <p><span className="font-semibold">Deliver to:</span> {shipOrder.delivery_address}</p>
                    )}
                    {deliveryDate && (
                      <p><span className="font-semibold">Est. Delivery:</span> {new Date(deliveryDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Confirm Mark as Returned Modal */}
      <ConfirmModal
        isOpen={isMarkReturnModalOpen}
        onClose={() => { setIsMarkReturnModalOpen(false); setMarkReturnOrder(null); }}
        onConfirm={handleConfirmMarkReturned}
        title="Confirm Return Completion"
        message={markReturnOrder ? `Has the driver picked up the items for Order ${markReturnOrder.order_id}? This will mark it as returned and restore the stock.` : ''}
        confirmText={saving ? 'Processing...' : 'Yes, Mark as Returned'}
        cancelText="Cancel"
        variant="warning"
      />

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => { setIsPayModalOpen(false); setPayOrder(null); stopPayCamera(); }}
        title="Record Payment"
        maxWidth="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => { setIsPayModalOpen(false); stopPayCamera(); }} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleConfirmPay}
              disabled={saving || (payMethod === 'cash' && (!payCashTendered || parseFloat(payCashTendered) < (payOrder?.total || 0))) || (payMethod === 'gcash' && !payGcashRef.trim())}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-button-500 hover:bg-button-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle size={14} /> {saving ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        }
      >
        {payOrder && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-gray-800">{payOrder.order_id}</p>
                  <p className="text-xs text-gray-500">{payOrder.customer}</p>
                </div>
                <p className="text-lg font-bold text-button-600">₱{payOrder.total.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Payment Method <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: 'Cash', icon: DollarSign, color: 'green' },
                  { value: 'gcash', label: 'GCash', icon: CreditCard, color: 'blue' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPayMethod(m.value)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                      payMethod === m.value
                        ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <m.icon size={16} /> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {payMethod === 'cash' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Cash Tendered <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₱</span>
                    <input
                      type="number"
                      value={payCashTendered}
                      onChange={(e) => setPayCashTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 text-lg font-bold border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      autoFocus
                    />
                  </div>
                </div>
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[payOrder.total, Math.ceil(payOrder.total / 100) * 100, Math.ceil(payOrder.total / 500) * 500, Math.ceil(payOrder.total / 1000) * 1000].filter((v, i, a) => a.indexOf(v) === i).map(amount => (
                    <button key={amount} onClick={() => setPayCashTendered(String(amount))} className="py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">₱{amount.toLocaleString()}</button>
                  ))}
                </div>
                {payCashTendered && parseFloat(payCashTendered) >= payOrder.total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-green-600 uppercase mb-1">Change</p>
                    <p className="text-xl font-bold text-green-600">₱{(parseFloat(payCashTendered) - payOrder.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">GCash Reference Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={payGcashRef}
                    onChange={(e) => setPayGcashRef(e.target.value)}
                    placeholder="e.g. 1234 5678 9012"
                    className="w-full px-4 py-2.5 text-sm font-semibold border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tracking-wider"
                    autoFocus
                  />
                </div>

                {/* Payment Proof */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Payment Proof <span className="font-normal normal-case text-gray-400">(Optional)</span>
                  </label>

                  {payShowCamera && (
                    <div className="relative mb-3 rounded-lg overflow-hidden border border-button-300">
                      <video ref={payVideoRef} autoPlay playsInline className="w-full h-40 object-cover bg-black" />
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                        <button onClick={capturePayPhoto} className="px-3 py-1.5 bg-button-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-button-600 flex items-center gap-1.5"><Camera size={12} /> Capture</button>
                        <button onClick={stopPayCamera} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-1.5"><X size={12} /> Cancel</button>
                      </div>
                    </div>
                  )}

                  {payProofPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {payProofPreviews.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt={`Proof ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border border-button-200" />
                          <button onClick={() => removePayProof(idx)} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!payShowCamera && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => payProofInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-button-300 text-button-600 hover:bg-button-50 text-xs font-semibold">
                        <ImageIcon size={14} /> Upload
                      </button>
                      <button type="button" onClick={startPayCamera} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-button-300 text-button-600 hover:bg-button-50 text-xs font-semibold">
                        <Camera size={14} /> Camera
                      </button>
                      <input ref={payProofInputRef} type="file" accept="image/*" multiple onChange={handlePayProofUpload} className="hidden" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Proof Image Lightbox */}
      {previewProofImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewProofImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewProofImage(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
            <img
              src={previewProofImage}
              alt="Return proof"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
