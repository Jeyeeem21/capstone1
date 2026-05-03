import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Clock, CheckCircle, Truck, XCircle, Package, 
  Search, Eye, ChevronDown, ChevronUp, RotateCcw,
  Calendar, MapPin, CreditCard, FileText, ClipboardList, AlertTriangle,
  ImageIcon, X, DollarSign, Banknote, Smartphone, Upload, Camera, Ban
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useBusinessSettings } from '../../../context/BusinessSettingsContext';
import { Skeleton, Pagination, Modal, ConfirmModal, useToast } from '../../../components/ui';
import { useDataFetch, invalidateCache } from '../../../hooks/useDataFetch';
import apiClient from '../../../api/apiClient';
import { resolveStorageUrl } from '../../../api/config';
import { suppressNotifToasts } from '../../../utils/notifToastGuard';
import InstallmentSetupInline from '../../../components/payments/InstallmentSetupInline';

const statusConfig = {
  'Pending':          { icon: Clock,        badgeClass: 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-400', iconBgClass: 'bg-yellow-50 dark:bg-yellow-900/30', iconColorClass: 'text-yellow-600 dark:text-yellow-400', connectorClass: 'bg-yellow-300 dark:bg-yellow-700', label: 'Pending' },
  'Processing':       { icon: Package,      badgeClass: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',         iconBgClass: 'bg-blue-50 dark:bg-blue-900/30',   iconColorClass: 'text-blue-600 dark:text-blue-400',   connectorClass: 'bg-blue-300 dark:bg-blue-700',   label: 'Processing' },
  'Shipped':          { icon: Truck,        badgeClass: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400', iconBgClass: 'bg-purple-50 dark:bg-purple-900/30', iconColorClass: 'text-purple-600 dark:text-purple-400', connectorClass: 'bg-purple-300 dark:bg-purple-700', label: 'Shipped' },
  'Delivered':        { icon: CheckCircle,  badgeClass: 'bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400',   iconBgClass: 'bg-green-50 dark:bg-green-900/30',  iconColorClass: 'text-green-600 dark:text-green-400',  connectorClass: 'bg-green-300 dark:bg-green-700',  label: 'Delivered' },
  'Return Requested': { icon: RotateCcw,    badgeClass: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400', iconBgClass: 'bg-orange-50 dark:bg-orange-900/30', iconColorClass: 'text-orange-600 dark:text-orange-400', connectorClass: 'bg-orange-300 dark:bg-orange-700', label: 'Return Requested' },
  'Returned':         { icon: RotateCcw,    badgeClass: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400',           iconBgClass: 'bg-red-50 dark:bg-red-900/30',    iconColorClass: 'text-red-600 dark:text-red-400',    connectorClass: 'bg-red-300 dark:bg-red-700',    label: 'Returned' },
  'Cancelled':        { icon: XCircle,      badgeClass: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400',           iconBgClass: 'bg-red-50 dark:bg-red-900/30',    iconColorClass: 'text-red-600 dark:text-red-400',    connectorClass: 'bg-red-300 dark:bg-red-700',    label: 'Cancelled' },
};

const statusTabs = ['All', 'Processing', 'Shipped', 'Delivered', 'Return Requested', 'Cancelled'];

const returnReasons = [
  'Damaged Product',
  'Wrong Item Received',
  'Quality Issue',
  'Excess Order / Overstock',
  'Changed My Mind',
  'Other',
];

const Orders = () => {
  const { theme } = useTheme();
  const { settings: bizSettings } = useBusinessSettings();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && statusTabs.includes(tabFromUrl) ? tabFromUrl : 'All';
  });

  // Sync active tab to URL
  useEffect(() => {
    setSearchParams(prev => { prev.set('tab', activeTab); return prev; }, { replace: true });
  }, [activeTab, setSearchParams]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(14);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnProofFiles, setReturnProofFiles] = useState([]);
  const [returnProofPreviews, setReturnProofPreviews] = useState([]);
  const [returnSubmitted, setReturnSubmitted] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [showPayModal, setShowPayModal] = useState(null);
  const [isPayInstallmentChoiceOpen, setIsPayInstallmentChoiceOpen] = useState(false);
  const [isPayInstallmentSetupOpen, setIsPayInstallmentSetupOpen] = useState(false);
  const [payIsStaggered, setPayIsStaggered] = useState(false);
  const [payInstallmentPlan, setPayInstallmentPlan] = useState([]);
  const [shakePayInstallmentModal, setShakePayInstallmentModal] = useState(false);
  const [payInstallmentSetupError, setPayInstallmentSetupError] = useState('');
  const payInstallmentSetupRef = useRef(null);
  const [payMethod, setPayMethod] = useState('gcash');
  const [payType, setPayType] = useState('full');
  const [payReference, setPayReference] = useState('');
  const [payProofFiles, setPayProofFiles] = useState([]);
  const [payProofPreviews, setPayProofPreviews] = useState([]);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payRefError, setPayRefError] = useState('');
  const [payInstallment, setPayInstallment] = useState(null);
  const [payInstallmentLoading, setPayInstallmentLoading] = useState(false);
  const [payPdoCheckNumber, setPayPdoCheckNumber] = useState('');
  const [payPdoBankName, setPayPdoBankName] = useState('');
  const [payPdoCheckDate, setPayPdoCheckDate] = useState('');
  const [payPdoCheckNumberError, setPayPdoCheckNumberError] = useState('');
  const [payPdoShowCamera, setPayPdoShowCamera] = useState(false);
  const payPdoVideoRef = useRef(null);
  const payPdoStreamRef = useRef(null);
  const payRefCheckTimeout = useRef(null);
  const payProofInputRef = useRef(null);
  const [payShowCamera, setPayShowCamera] = useState(false);
  const payVideoRef = useRef(null);
  const payStreamRef = useRef(null);
  const [returnShowCamera, setReturnShowCamera] = useState(false);
  const returnVideoRef = useRef(null);
  const returnStreamRef = useRef(null);

  // Fetch orders from API
  const { data: rawOrders, loading, refetch, optimisticUpdate } = useDataFetch('/sales/my-orders', {
    cacheKey: '/sales/my-orders',
    initialData: [],
  });

  // Map API data to order format
  const orders = useMemo(() =>
    (rawOrders || []).map(o => {
      const formatStatus = (s) => {
        const map = {
          'pending': 'Pending', 'processing': 'Processing', 'shipped': 'Shipped',
          'delivered': 'Delivered', 'completed': 'Delivered', 'return_requested': 'Return Requested',
          'picking_up': 'Return Requested', 'picked_up': 'Return Requested', 'returned': 'Returned', 'cancelled': 'Cancelled', 'voided': 'Cancelled',
        };
        return map[s] || s;
      };
      return {
        id: o.transaction_id,
        saleId: o.id,
        status: formatStatus(o.status),
        rawStatus: o.status,
        date: o.created_at,
        dateFormatted: o.date_formatted,
        total: o.total || 0,
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        deliveryFee: o.delivery_fee || 0,
        paymentMethod: o.payment_method === 'cod' ? 'COD' : o.payment_method === 'gcash' ? 'GCash' : o.payment_method === 'pay_later' ? 'Pay Later' : o.payment_method === 'pdo' ? 'PDO' : 'Cash',
        paymentStatus: o.payment_status === 'paid' ? 'Paid' : o.payment_status === 'partial' ? 'Partial' : 'Not Paid',
        deliveryAddress: o.delivery_address || 'Pick Up',
        deliveredAt: o.rawStatus === 'delivered' || o.rawStatus === 'completed' ? o.updated_at : null,
        notes: o.notes,
        shippingFeeStatus: o.shipping_fee_status || null,
        isStaggered: !!o.is_staggered,
        balanceRemaining: parseFloat(o.balance_remaining || 0),
        hasPendingPayments: !!o.has_pending_payments,
        items: (o.items || []).map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          unit: item.weight_formatted || 'pc',
          varietyName: item.variety_name,
          varietyColor: item.variety_color,
        })),
        driverName: o.driver_name,
        driverPlate: o.driver_plate_number,
        paidAt: o.paid_at_formatted,
        referenceNumber: o.reference_number,
        paymentProof: (o.payment_proof || []).map(p => resolveStorageUrl(p)),
        returnProof: (o.return_proof || []).map(p => resolveStorageUrl(p)),
        returnReason: o.return_reason,
        returnNotes: o.return_notes,
        deliveryProof: (o.delivery_proof || []).map(p => resolveStorageUrl(p)),
        returnPickupDriver: o.return_pickup_driver,
        returnPickupPlate: o.return_pickup_plate,
        returnPickupDate: o.return_pickup_date_formatted,
      };
    }),
    [rawOrders]
  );

  const handleReturnRequest = (order) => {
    setReturnOrder(order);
    setReturnReason('');
    setReturnNotes('');
    setReturnProofFiles([]);
    setReturnProofPreviews([]);
    setReturnSubmitted(false);
    setReturnShowCamera(false);
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async () => {
    setReturnSubmitted(true);
    if (!returnReason || !returnProofFiles.length) return;
    try {
      const formData = new FormData();
      formData.append('return_reason', returnReason);
      if (returnNotes) formData.append('return_notes', returnNotes);
      returnProofFiles.forEach(file => formData.append('return_proof[]', file));
      await apiClient.post(`/sales/${returnOrder.saleId}/return`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Fire-and-forget email
      apiClient.post(`/sales/${returnOrder.saleId}/status-email`).catch(() => {});
      suppressNotifToasts();
      stopReturnCamera();
      setIsReturnModalOpen(false);
      setReturnOrder(null);
      // Optimistic: mark as return_requested instantly
      optimisticUpdate(prev => prev.map(o => o.id === returnOrder.saleId ? { ...o, status: 'return_requested' } : o));
      invalidateCache('/sales/my-orders');
      refetch();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to submit return request.');
    }
  };

  const handleCancelOrder = async (order) => {
    setCancellingId(order.saleId);
    try {
      await apiClient.put(`/sales/${order.saleId}/status`, { status: 'cancelled' });
      // Fire-and-forget email
      apiClient.post(`/sales/${order.saleId}/status-email`).catch(() => {});
      suppressNotifToasts();
      // Optimistic: mark as cancelled instantly
      optimisticUpdate(prev => prev.map(o => o.id === order.saleId ? { ...o, status: 'cancelled' } : o));
      invalidateCache('/sales/my-orders');
      refetch();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const stopPayCamera = useCallback(() => {
    if (payStreamRef.current) {
      payStreamRef.current.getTracks().forEach(t => t.stop());
      payStreamRef.current = null;
    }
    setPayShowCamera(false);
  }, []);

  const stopPayPdoCamera = useCallback(() => {
    if (payPdoStreamRef.current) {
      payPdoStreamRef.current.getTracks().forEach(t => t.stop());
      payPdoStreamRef.current = null;
    }
    setPayPdoShowCamera(false);
  }, []);

  const startPayCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      payStreamRef.current = stream;
      setPayShowCamera(true);
      setTimeout(() => { if (payVideoRef.current) payVideoRef.current.srcObject = stream; }, 100);
    } catch {
      alert('Could not access camera.');
    }
  }, []);

  const startPayPdoCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      payPdoStreamRef.current = stream;
      setPayPdoShowCamera(true);
      setTimeout(() => { if (payPdoVideoRef.current) payPdoVideoRef.current.srcObject = stream; }, 100);
    } catch {
      alert('Could not access camera.');
    }
  }, []);

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

  const capturePayPdoPhoto = useCallback(() => {
    if (!payPdoVideoRef.current) return;
    const video = payPdoVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `pdo_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPayProofFiles(prev => [...prev, file]);
      setPayProofPreviews(prev => [...prev, URL.createObjectURL(blob)]);
      stopPayPdoCamera();
    }, 'image/jpeg', 0.85);
  }, [stopPayPdoCamera]);

  const stopReturnCamera = useCallback(() => {
    if (returnStreamRef.current) {
      returnStreamRef.current.getTracks().forEach(t => t.stop());
      returnStreamRef.current = null;
    }
    setReturnShowCamera(false);
  }, []);

  const startReturnCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      returnStreamRef.current = stream;
      setReturnShowCamera(true);
      setTimeout(() => { if (returnVideoRef.current) returnVideoRef.current.srcObject = stream; }, 100);
    } catch {
      alert('Could not access camera.');
    }
  }, []);

  const captureReturnPhoto = useCallback(() => {
    if (!returnVideoRef.current) return;
    const video = returnVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `return_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setReturnProofFiles(prev => [...prev, file]);
      setReturnProofPreviews(prev => [...prev, URL.createObjectURL(blob)]);
      stopReturnCamera();
    }, 'image/jpeg', 0.85);
  }, [stopReturnCamera]);

  const openPayModal = async (order) => {
    if (order.shippingFeeStatus === 'pending') {
      alert('Payment is not available yet. Shipping fee is still pending. Please wait for admin to finalize shipping first.');
      return;
    }

    // Reset all pay state
    setShowPayModal(order);
    setPayMethod('gcash');
    setPayType('full');
    setPayInstallment(null);
    setPayInstallmentLoading(false);
    setPayReference('');
    setPayRefError('');
    setPayProofFiles([]);
    setPayProofPreviews([]);
    setPayShowCamera(false);
    setPayPdoCheckNumber('');
    setPayPdoCheckNumberError('');
    setPayPdoBankName('');
    setPayPdoCheckDate('');
    setPayPdoShowCamera(false);
    setPayInstallmentPlan([]);
    setPayIsStaggered(false);

    // For already-staggered orders, pre-fetch the next installment
    if (order.isStaggered) {
      try {
        const response = await apiClient.get(`/customer/orders/${order.saleId}`);
        const orderDetails = response?.data?.order || response?.data?.data?.order || null;
        const installments = Array.isArray(orderDetails?.installments) ? orderDetails.installments : [];

        const nextInstallment = installments.find(inst => inst.can_pay) || installments.find(inst => {
          const status = String(inst.status || '').toLowerCase();
          const expected = parseFloat(inst.amount_expected ?? 0);
          const paid = parseFloat(inst.amount_paid ?? 0);
          return ['pending', 'overdue', 'partial'].includes(status) && (expected - paid) > 0.01;
        }) || null;

        if (nextInstallment) {
          setPayInstallment(nextInstallment);
          setPayIsStaggered(true);
        }
      } catch { /* silent */ }
    }

    // Open the installment choice modal first
    setIsPayInstallmentChoiceOpen(true);
  };

  // Handle proceeding from installment choice modal
  const handleProceedInstallmentFlow = useCallback(async () => {
    if (!showPayModal) return;

    // If order is NOT staggered yet, show setup modal
    if (!showPayModal.isStaggered) {
      setPayIsStaggered(true);
      setPayInstallmentSetupError('');
      setIsPayInstallmentChoiceOpen(false);
      setIsPayInstallmentSetupOpen(true);
      return;
    }

    // If already staggered and we have the installment loaded, go to payment modal
    if (payInstallment) {
      setPayType('installment');
      setIsPayInstallmentChoiceOpen(false);
      setIsPayInstallmentSetupOpen(false);
      return;
    }

    // Otherwise fetch the next installment
    setPayInstallmentLoading(true);
    try {
      const response = await apiClient.get(`/customer/orders/${showPayModal.saleId}`);
      const orderDetails = response?.data?.order || response?.data?.data?.order || null;
      const installments = Array.isArray(orderDetails?.installments) ? orderDetails.installments : [];
      const sorted = [...installments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
      
      const next = sorted.find(inst => {
        const expected = parseFloat(inst.amount_expected ?? inst.amount ?? 0);
        const paid = parseFloat(inst.amount_paid ?? 0);
        const status = String(inst.status || '').toLowerCase();
        return expected > 0 && (['pending', 'overdue', 'partial'].includes(status) || (expected - paid) > 0.01);
      }) || null;

      if (!next) {
        setIsPayInstallmentChoiceOpen(false);
        alert('No pending installments found for this order.');
        setShowPayModal(null);
        setPayIsStaggered(false);
        setPayInstallmentLoading(false);
        return;
      }

      setPayInstallment(next);
      setPayType('installment');
      setPayInstallmentPlan([]);
      setIsPayInstallmentChoiceOpen(false);
      setIsPayInstallmentSetupOpen(false);
    } catch (error) {
      alert('Failed to load installment details.');
      setIsPayInstallmentChoiceOpen(false);
      setShowPayModal(null);
    } finally {
      setPayInstallmentLoading(false);
    }
  }, [showPayModal, payInstallment]);

  // Handle saving installment schedule
  const handleSavePayInstallmentSchedule = useCallback(async () => {
    if (!showPayModal || !payInstallmentSetupRef.current) return;

    const validation = payInstallmentSetupRef.current.validate();
    if (!validation.valid) {
      setShakePayInstallmentModal(true);
      setTimeout(() => setShakePayInstallmentModal(false), 500);
      setPayInstallmentSetupError(validation.error || 'Please fix the installment schedule errors.');
      return;
    }

    const installments = payInstallmentSetupRef.current.getInstallments();
    if (!installments || installments.length === 0) {
      setShakePayInstallmentModal(true);
      setTimeout(() => setShakePayInstallmentModal(false), 500);
      setPayInstallmentSetupError('Please add at least one installment.');
      return;
    }

    setPayInstallmentSetupError('');
    try {
      const installmentsPayload = installments.map((inst, idx) => ({
        installment_number: inst.installmentNumber ?? (idx + 1),
        amount: parseFloat(inst.amount || 0),
        due_date: inst.dueDate || null,
        payment_method: 'cash', // Default, will be selected when customer pays
        pay_now: false,
      }));

      const response = await apiClient.post(`/sales/${showPayModal.saleId}/payment-schedule`, {
        installments: installmentsPayload,
      });

      if (response.success) {
        const installments = response.data?.installments || response.data?.data?.installments || [];
        const sortedInstallments = [...installments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
        const firstInstallment = sortedInstallments[0] || null;

        // Use local date to avoid timezone mismatch
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Parse due_date to LOCAL date string
        const parseLocalDate = (dateStr) => {
          if (!dateStr) return '';
          const d = new Date(String(dateStr));
          if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        const firstDueDate = parseLocalDate(firstInstallment?.due_date);

        setIsPayInstallmentSetupOpen(false);
        setIsPayInstallmentChoiceOpen(false);
        
        // Optimistically mark as staggered (but NOT as having pending payments)
        optimisticUpdate(prev => prev.map(o => o.id === showPayModal.saleId ? { 
          ...o, 
          is_staggered: true,
          has_pending_payments: false // No payment submitted yet
        } : o));
        invalidateCache('/sales/my-orders');
        
        // If first installment is due today, open payment modal
        if (firstInstallment && firstDueDate === today) {
          setPayIsStaggered(true);
          setPayInstallment(firstInstallment);
          setPayType('installment');
          refetch();
          toast.success('Installment Schedule Saved', 'Proceeding to first payment due today.');
          // Keep showPayModal open, just close the setup modal
        } else {
          setShowPayModal(null);
          setPayInstallmentPlan([]);
          setPayInstallmentSetupError('');
          refetch();
          toast.success('Installment Schedule Saved', 'Payment schedule created successfully. You can now pay your installments.');
        }
      } else {
        throw response;
      }
    } catch (error) {
      setShakePayInstallmentModal(true);
      setTimeout(() => setShakePayInstallmentModal(false), 500);
      setPayInstallmentSetupError(error.message || 'Failed to save installment schedule.');
    }
  }, [showPayModal, refetch, optimisticUpdate, toast]);

  const checkPayReference = (ref) => {
    const digits = ref.replace(/\s/g, '');
    if (digits.length !== 13) return;
    if (payRefCheckTimeout.current) clearTimeout(payRefCheckTimeout.current);
    payRefCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await apiClient.post('/sales/check-reference', { reference_number: digits });
        const isAvailable = response?.available ?? response?.data?.available;
        if (isAvailable === false) {
          setPayRefError('This reference number has already been used.');
        } else {
          setPayRefError('');
        }
      } catch { /* silent */ }
    }, 500);
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const handlePayProofChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPayProofFiles(prev => [...prev, ...files]);
    setPayProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const handlePaySubmit = async () => {
    if (!showPayModal) return;

    if (showPayModal.shippingFeeStatus === 'pending') {
      alert('Payment is not available yet. Shipping fee is still pending.');
      return;
    }

    const isInstallmentPayment = payType === 'installment';
    const fullAmountDue = (showPayModal.balanceRemaining && showPayModal.balanceRemaining > 0)
      ? showPayModal.balanceRemaining
      : showPayModal.total;

    if (isInstallmentPayment && !payInstallment) {
      alert('No payable installment found for this order.');
      return;
    }

    if (payMethod === 'gcash' && (!payReference.trim() || payReference.replace(/\s/g, '').length !== 13 || payProofFiles.length === 0 || payRefError)) return;
    if (payMethod === 'pdo' && (!payPdoCheckNumber.trim() || !payPdoBankName.trim() || !payPdoCheckDate || payProofFiles.length === 0)) return;

    setPayRefError('');
    setPaySubmitting(true);
    try {
      if (isInstallmentPayment) {
        const installmentAmount = parseFloat(payInstallment.amount_expected ?? 0);

        if (payMethod === 'gcash') {
          const paymentProofBase64 = await fileToDataUrl(payProofFiles[0]);
          await apiClient.post(`/customer/installments/${payInstallment.id}/pay-gcash`, {
            amount: installmentAmount,
            reference_number: payReference.replace(/\s/g, ''),
            payment_proof: paymentProofBase64,
          });
        } else {
          const checkImageBase64 = await fileToDataUrl(payProofFiles[0]);
          await apiClient.post(`/customer/installments/${payInstallment.id}/pay-pdo`, {
            amount: installmentAmount,
            check_number: payPdoCheckNumber,
            bank_name: payPdoBankName,
            check_date: payPdoCheckDate,
            check_image: checkImageBase64,
          });
        }

        suppressNotifToasts();
        stopPayCamera();
        setShowPayModal(null);

        // Optimistic: reflect that payment was submitted and needs verification.
        optimisticUpdate(prev => prev.map(o => o.id === showPayModal.saleId ? {
          ...o,
          payment_status: 'partial',
          has_pending_payments: true,
        } : o));
        invalidateCache('/sales/my-orders');
        refetch();
      } else {
        const formData = new FormData();
        formData.append('payment_method', payMethod);

        if (payMethod === 'gcash') {
          formData.append('reference_number', payReference.replace(/\s/g, ''));
          payProofFiles.forEach(file => formData.append('payment_proof[]', file));
        }

        if (payMethod === 'pdo') {
          formData.append('pdo_check_number', payPdoCheckNumber);
          formData.append('pdo_check_date', payPdoCheckDate);
          formData.append('pdo_bank_name', payPdoBankName);
          formData.append('pdo_amount', fullAmountDue);
          payProofFiles.forEach(file => formData.append('pdo_check_image[]', file));
        }

        formData.append('amount_tendered', fullAmountDue);

        await apiClient.post(`/sales/${showPayModal.saleId}/pay`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Fire-and-forget email
        apiClient.post(`/sales/${showPayModal.saleId}/payment-email`).catch(() => {});
        suppressNotifToasts();
        stopPayCamera();
        setShowPayModal(null);

        // Optimistic: payment is submitted and awaiting verification.
        optimisticUpdate(prev => prev.map(o => o.id === showPayModal.saleId ? {
          ...o,
          has_pending_payments: true,
        } : o));
        invalidateCache('/sales/my-orders');
        refetch();
      }
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const message = err?.response?.data?.message || '';
      if (errors?.reference_number || message.toLowerCase().includes('reference number')) {
        setPayRefError('This reference number has already been used.');
      } else {
        alert(message || 'Failed to process payment.');
      }
    } finally {
      setPaySubmitting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const statusPriority = { 'Pending': 1, 'Processing': 2, 'Shipped': 3, 'Delivered': 4, 'Return Requested': 5, 'Returned': 6, 'Cancelled': 7 };
    return orders
      .filter(order => {
        const matchesTab = activeTab === 'All' || order.status === activeTab;
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              order.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));
  }, [activeTab, searchTerm, orders]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, currentPage]);

  const orderStats = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter(o => ['Processing', 'Shipped'].includes(o.status)).length,
      delivered: orders.filter(o => o.status === 'Delivered').length,
      cancelled: orders.filter(o => o.status === 'Cancelled').length,
    };
  }, [orders]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Orders</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Track and manage your orders
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-primary-50 via-primary-100/30 to-primary-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-xl p-4 border-2 border-primary-400 shadow-lg shadow-primary-100/50 dark:shadow-gray-900/30">
              <Skeleton variant="title" width="w-12" className="mb-1" />
              <Skeleton variant="text" width="w-20" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Orders', value: orderStats.total, colorClass: 'text-button-600 dark:text-button-400' },
          { label: 'Active', value: orderStats.active, colorClass: 'text-blue-600 dark:text-blue-400' },
          { label: 'Delivered', value: orderStats.delivered, colorClass: 'text-green-600 dark:text-green-400' },
          { label: 'Cancelled', value: orderStats.cancelled, colorClass: 'text-red-500 dark:text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-gradient-to-br from-primary-50 via-primary-100/30 to-primary-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-xl p-4 border-2 border-primary-400 shadow-lg shadow-primary-100/50 dark:shadow-gray-900/30">
            <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border-2 border-primary-300 dark:border-primary-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton variant="input" className="flex-1" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} variant="button" width="w-20" />)}
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border-2 border-primary-300 dark:border-primary-700">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by order ID or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-primary-300 dark:border-primary-700 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? {
                  backgroundColor: 'var(--color-button-500)',
                  color: '#fff',
                } : {}}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? '' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Orders List - 2 per row */}
      {loading ? (
        <div className="columns-1 sm:columns-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-4 break-inside-avoid border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <Skeleton variant="text" width="w-36" />
                <Skeleton variant="button" width="w-20" />
              </div>
              <div className="space-y-2 mb-3">
                <Skeleton variant="text" width="w-full" />
                <Skeleton variant="text" width="w-3/4" />
              </div>
              <div className="flex justify-between">
                <Skeleton variant="text" width="w-20" />
                <Skeleton variant="title" width="w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-primary-700">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>No orders found</h3>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            {activeTab !== 'All' ? `No ${activeTab.toLowerCase()} orders` : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 gap-4">
          {paginatedOrders.map(order => {
            const config = statusConfig[order.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedOrder === order.id;
            const isUnpaidOrPartial = ['Not Paid', 'Partial'].includes(order.paymentStatus);
            const isOrderPayableStatus = !['Cancelled', 'Returned'].includes(order.status);
            const isShippingPending = order.shippingFeeStatus === 'pending';
            const isPaymentBlockedByShipping = isUnpaidOrPartial && isOrderPayableStatus && isShippingPending;
            const hasPendingVerification = !!order.hasPendingPayments;
            const canPayNow = isUnpaidOrPartial && isOrderPayableStatus && !isShippingPending && !hasPendingVerification;

            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all mb-4 break-inside-avoid border-2 ${isExpanded ? 'border-button-500 dark:border-button-400 shadow-lg shadow-button-500/10' : 'border-primary-300 dark:border-primary-700'}`}
              >
                {/* Order Header - compact */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconBgClass}`}>
                      <StatusIcon size={14} className={config.iconColorClass} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{order.id}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(order.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{order.items.length} item(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>₱{order.total.toLocaleString()}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span 
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badgeClass}`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            order.paymentStatus === 'Paid'
                              ? 'bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400'
                              : order.paymentStatus === 'Partial'
                                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t-2 border-primary-200 dark:border-primary-700 px-3 pb-3">
                    {/* Status Timeline - compact */}
                    <div className="flex items-center gap-1.5 py-3 overflow-x-auto">
                      {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, idx) => {
                        const stepConfig = statusConfig[step];
                        const isActive = ['Pending', 'Processing', 'Shipped', 'Delivered'].indexOf(order.status) >= idx;
                        const isCancelled = order.status === 'Cancelled';
                        return (
                          <div key={step} className="flex items-center gap-1.5">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isCancelled ? 'bg-red-50 dark:bg-red-900/30' : isActive ? stepConfig.iconBgClass : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <stepConfig.icon size={10} className={isCancelled ? 'text-red-500 dark:text-red-400' : isActive ? stepConfig.iconColorClass : 'text-gray-300 dark:text-gray-600'} />
                              </div>
                              <span className={`text-[9px] mt-0.5 whitespace-nowrap ${
                                isActive && !isCancelled ? stepConfig.iconColorClass : 'text-gray-400 dark:text-gray-500'
                              }`}>
                                {step}
                              </span>
                            </div>
                            {idx < 3 && (
                              <div className={`w-5 sm:w-8 h-0.5 rounded mb-3 ${
                                isCancelled ? 'bg-red-200 dark:bg-red-800' : isActive ? stepConfig.connectorClass : 'bg-gray-200 dark:bg-gray-600'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Info Grid - compact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {/* Payment + Proof side by side */}
                      <div className="flex gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-primary-300 dark:border-primary-700">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <CreditCard size={11} className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                            <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Payment</p>
                          </div>
                          <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{order.paymentMethod}</p>
                          <p className={`text-[9px] font-semibold ${order.paymentStatus === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {order.paymentStatus}
                          </p>
                          {order.paidAt && (
                            <p className="text-[8px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{order.paidAt}</p>
                          )}
                          {order.referenceNumber && (
                            <p className="text-[9px] font-semibold mt-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded inline-block">Ref: {order.referenceNumber}</p>
                          )}
                        </div>
                        {order.paymentProof && order.paymentProof.length > 0 && (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <p className="text-[8px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Proof</p>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {order.paymentProof.map((proof, i) => (
                                <img key={i} src={proof} alt={`Payment proof ${i + 1}`}
                                  className="w-14 h-14 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-500 cursor-pointer hover:scale-105 hover:shadow-md transition-all"
                                  onClick={(e) => { e.stopPropagation(); window.open(proof, '_blank', 'noopener,noreferrer'); }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Address + Date combined */}
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-primary-300 dark:border-primary-700">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin size={11} className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                          <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Address</p>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-primary)' }} title={order.deliveryAddress}>{order.deliveryAddress}</p>
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                            <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                              {order.deliveredAt ? 'Delivered' : 'Placed'}
                            </p>
                          </div>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                            {new Date(order.deliveredAt || order.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                            {' '}
                            <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                              {new Date(order.deliveredAt || order.date).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Driver Info */}
                      {order.driverName && (
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-primary-300 dark:border-primary-700">
                          <div className="flex items-center gap-1 mb-1">
                            <Truck size={11} className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                            <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Driver</p>
                          </div>
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{order.driverName}</p>
                          {order.driverPlate && (
                            <p className="text-[9px] mt-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded inline-block font-medium">{order.driverPlate}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Items + Return Details side by side */}
                    <div className={`grid gap-2 ${(order.status === 'Return Requested' || order.status === 'Returned') && (order.returnReason || order.returnProof?.length > 0 || order.returnPickupDriver) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Items - compact */}
                      <div className="border-2 border-primary-300 dark:border-primary-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5">
                          <p className="text-[9px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>ORDER ITEMS</p>
                        </div>
                        <div className="divide-y divide-primary-200 dark:divide-primary-700">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.name}</p>
                                  {item.varietyName && (
                                    <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: item.varietyColor || '#6b7280' }}>
                                      {item.varietyName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                  {item.quantity} × ₱{item.price.toLocaleString()} / {item.unit}
                                </p>
                              </div>
                              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                ₱{(item.quantity * item.price).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                        {/* Totals */}
                        <div className="border-t border-primary-200 dark:border-primary-700 px-3 py-2 space-y-0.5">
                          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>Subtotal</span>
                            <span>₱{order.subtotal.toLocaleString()}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-[10px] text-green-600 dark:text-green-400">
                              <span>Discount</span>
                              <span>-₱{order.discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>Delivery Fee</span>
                            <span>{order.deliveryFee > 0 ? `₱${order.deliveryFee.toLocaleString()}` : 'Free'}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold pt-1 border-t border-primary-200 dark:border-primary-700" style={{ color: 'var(--color-text-primary)' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--color-button-500)' }}>₱{order.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Return Details — side by side with items */}
                      {(order.status === 'Return Requested' || order.status === 'Returned') && (order.returnReason || order.returnProof?.length > 0 || order.returnPickupDriver) && (
                        <div className="border-2 border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden self-start">
                          <div className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5">
                            <p className="text-[9px] font-semibold text-orange-700 dark:text-orange-300">RETURN DETAILS</p>
                          </div>
                          <div className="p-3 space-y-2">
                            {order.returnReason && (
                              <div>
                                <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Reason</p>
                                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{order.returnReason}</p>
                              </div>
                            )}
                            {order.returnNotes && (
                              <div>
                                <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Notes</p>
                                <p className="text-[10px]" style={{ color: 'var(--color-text-primary)' }}>{order.returnNotes}</p>
                              </div>
                            )}
                            {order.returnProof && order.returnProof.length > 0 && (
                              <div>
                                <p className="text-[9px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Proof</p>
                                <div className="flex gap-1 flex-wrap">
                                  {order.returnProof.map((proof, i) => (
                                    <img key={i} src={proof} alt={`Return proof ${i + 1}`}
                                      className="w-14 h-14 object-cover rounded-lg border-2 border-orange-200 dark:border-orange-500 cursor-pointer hover:scale-105 hover:shadow-md transition-all"
                                      onClick={(e) => { e.stopPropagation(); window.open(proof, '_blank', 'noopener,noreferrer'); }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {order.returnPickupDriver && (
                              <div className="pt-1.5 border-t border-orange-200 dark:border-orange-700">
                                <p className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Pickup Driver</p>
                                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{order.returnPickupDriver}</p>
                                {order.returnPickupPlate && (
                                  <p className="text-[9px] mt-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded inline-block font-medium">{order.returnPickupPlate}</p>
                                )}
                                {order.returnPickupDate && (
                                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Picked up: {order.returnPickupDate}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <FileText size={12} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <p className="text-[10px] text-yellow-800">{order.notes}</p>
                      </div>
                    )}

                    {/* Payment warning */}
                    {isUnpaidOrPartial && !['Cancelled', 'Delivered', 'Returned', 'Return Requested'].includes(order.status) && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <DollarSign size={12} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-red-700 dark:text-red-300 font-medium">
                          This order still has remaining payment. Please settle to avoid delays.
                        </p>
                      </div>
                    )}

                    {/* Shipping fee gate warning */}
                    {isPaymentBlockedByShipping && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                          Payment is disabled because shipping fee is not finalized yet. Admin will contact you through email once payment can proceed.
                        </p>
                      </div>
                    )}

                    {/* Pending verification warning */}
                    {hasPendingVerification && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <Clock size={12} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                          Your payment submission is under review. Please wait for verification before submitting another payment.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {/* Cancel — only for Pending */}
                      {order.status === 'Pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCancelOrder(order); }}
                          disabled={cancellingId === order.saleId}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                        >
                          <Ban size={12} /> {cancellingId === order.saleId ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      )}

                      {/* Pay Now — customer can pay only when shipping fee is finalized */}
                      {isUnpaidOrPartial && isOrderPayableStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canPayNow) return;
                            openPayModal(order);
                          }}
                          disabled={!canPayNow}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            canPayNow
                              ? 'text-white hover:opacity-90'
                              : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-not-allowed'
                          }`}
                          style={canPayNow ? { backgroundColor: '#3b82f6' } : {}}
                          title={isShippingPending ? 'Shipping fee is still pending.' : hasPendingVerification ? 'Payment is under verification.' : 'Payment unavailable'}
                        >
                          <CreditCard size={12} /> {canPayNow ? 'Pay Now' : isShippingPending ? 'Awaiting Shipping Fee' : 'Under Review'}
                        </button>
                      )}

                      {/* Reorder + Return — for Delivered */}
                      {order.status === 'Delivered' && (
                        <>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: 'var(--color-button-500)' }}
                          >
                            <RotateCcw size={12} /> Reorder
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReturnRequest(order); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 transition-all hover:bg-orange-100 dark:hover:bg-orange-900/20"
                          >
                            <RotateCcw size={12} /> Return Item
                          </button>
                        </>
                      )}
                    </div>

                    {order.status === 'Return Requested' && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                        <AlertTriangle size={12} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-orange-800">Return request submitted. Waiting for admin approval.</p>
                      </div>
                    )}
                    {order.status === 'Returned' && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <CheckCircle size={12} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-green-800">Return has been processed. Refund will be credited to your account.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredOrders.length > ordersPerPage && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-primary-700 overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={ordersPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setOrdersPerPage(val); setCurrentPage(1); }}
            showItemsPerPage={true}
            itemsPerPageOptions={[7, 14, 21, 50]}
          />
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelOrder}
        onClose={() => setCancelOrder(null)}
        onConfirm={() => { handleCancelOrder(cancelOrder); setCancelOrder(null); }}
        title="Cancel Order"
        message={`Are you sure you want to cancel order "${cancelOrder?.id}"? This action cannot be undone.`}
        confirmText={cancellingId ? 'Cancelling...' : 'Cancel Order'}
        variant="danger"
        icon={Ban}
        isLoading={!!cancellingId}
      />

      {/* Return Request Modal */}
      <Modal
        isOpen={isReturnModalOpen && !!returnOrder}
        onClose={() => { stopReturnCamera(); setIsReturnModalOpen(false); }}
        title={`Request Return — ${returnOrder?.id || ''}`}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { stopReturnCamera(); setIsReturnModalOpen(false); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-primary-300 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleReturnSubmit}
              disabled={!returnReason || !returnProofFiles.length}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw size={14} /> Submit Return Request
            </button>
          </div>
        }
      >
        {returnOrder && (
          <div className="space-y-4">
            {/* Items being returned */}
            <div className="rounded-lg border border-primary-200 dark:border-primary-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Items to Return</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {returnOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-800 dark:text-gray-100">{item.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Return Reason <span className="text-red-500">*</span></label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select a reason...</option>
                {returnReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Additional Notes <span className="font-normal normal-case text-gray-400">(Optional)</span></label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Proof Images */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                Proof Images <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">Upload photos showing the reason for return</p>

              {returnShowCamera && (
                <div className="relative mb-3 rounded-lg overflow-hidden border border-button-300 dark:border-button-600">
                  <video ref={returnVideoRef} autoPlay playsInline className="w-full h-40 object-cover bg-black" />
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                    <button onClick={captureReturnPhoto} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-orange-600 flex items-center gap-1.5"><Camera size={12} /> Capture</button>
                    <button onClick={stopReturnCamera} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-1.5"><X size={12} /> Cancel</button>
                  </div>
                </div>
              )}

              {returnProofPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {returnProofPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img src={preview} alt={`Proof ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border border-button-200 dark:border-button-700" />
                      <button
                        type="button"
                        onClick={() => {
                          setReturnProofFiles(prev => prev.filter((_, i) => i !== idx));
                          setReturnProofPreviews(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!returnShowCamera && (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-button-300 dark:border-button-600 text-button-600 dark:text-button-400 hover:bg-button-50 dark:hover:bg-button-900/20 text-xs font-semibold cursor-pointer">
                    <ImageIcon size={14} /> Upload
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
                  <button type="button" onClick={startReturnCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-button-300 dark:border-button-600 text-button-600 dark:text-button-400 hover:bg-button-50 dark:hover:bg-button-900/20 text-xs font-semibold">
                    <Camera size={14} /> Camera
                  </button>
                </div>
              )}
              {returnSubmitted && returnProofFiles.length === 0 && (
                <p className="mt-1.5 text-xs text-red-500">Please upload at least one proof image</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Installment Choice Modal */}
      {isPayInstallmentChoiceOpen && showPayModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => {
              setIsPayInstallmentChoiceOpen(false);
              setShowPayModal(null);
              setPayIsStaggered(false);
              setPayInstallmentPlan([]);
              setPayInstallment(null);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border-2 border-blue-500 dark:border-blue-600 overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText size={20} />
                      Installment Payment
                    </h3>
                    <p className="text-sm text-white/80 mt-1">
                      {showPayModal.isStaggered
                        ? 'This order already has an installment schedule. Continue with installment payment?'
                        : 'Would you like to enable installment payment for this order?'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsPayInstallmentChoiceOpen(false);
                      setShowPayModal(null);
                      setPayIsStaggered(false);
                      setPayInstallmentPlan([]);
                      setPayInstallment(null);
                    }}
                    className="ml-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors shrink-0"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {showPayModal.isStaggered
                      ? 'We will load the next pending installment from the existing payment plan.'
                      : 'Installment payment allows this order to be paid in multiple scheduled payments.'}
                  </p>
                  {showPayModal.isStaggered && payInstallment && (() => {
                    const dueDate = payInstallment.due_date ? new Date(payInstallment.due_date) : null;
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const dueDateOnly = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;
                    const diffDays = dueDateOnly ? Math.round((dueDateOnly - today) / (1000 * 60 * 60 * 24)) : null;
                    const isOverdue = diffDays !== null && diffDays < 0;
                    const isDueToday = diffDays === 0;
                    const isAdvance = diffDays !== null && diffDays > 0;
                    return (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Installment #</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">
                            {payInstallment.installment_number ?? '—'}
                          </span>
                        </div>
                        {dueDateOnly && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {dueDateOnly.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 uppercase tracking-wide">
                                  {Math.abs(diffDays)}d overdue
                                </span>
                              )}
                              {isDueToday && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                  Due today
                                </span>
                              )}
                              {isAdvance && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 uppercase tracking-wide">
                                  {diffDays}d advance
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between text-sm border-t border-blue-200 dark:border-blue-700 pt-3">
                    <span className="text-gray-600 dark:text-gray-400">Amount to Settle:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ₱{(payInstallment ? parseFloat(payInstallment.amount_expected || 0) : showPayModal.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex gap-3 border-t-2 border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => {
                    setPayIsStaggered(false);
                    setPayInstallmentPlan([]);
                    setPayType('full');
                    setIsPayInstallmentChoiceOpen(false);
                    // Go directly to payment modal for full payment
                    setShowPayModal(showPayModal);
                  }}
                  disabled={payInstallmentLoading}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  No, Full Payment
                </button>
                <button
                  onClick={handleProceedInstallmentFlow}
                  disabled={payInstallmentLoading}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {payInstallmentLoading
                    ? 'Loading...'
                    : (showPayModal.isStaggered ? 'Yes, Pay Installment' : 'Yes, Setup Installments')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Installment Setup Modal */}
      {isPayInstallmentSetupOpen && showPayModal && (
        <>
          <style>{`
            @keyframes shakePayInstallment {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
              20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
            .shake-pay-installment-modal {
              animation: shakePayInstallment 0.5s;
            }
          `}</style>
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={() => {
              setIsPayInstallmentSetupOpen(false);
              setIsPayInstallmentChoiceOpen(true);
            }}
          >
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border-2 border-primary-200 dark:border-primary-700 max-h-[90vh] overflow-hidden flex flex-col ${shakePayInstallmentModal ? 'shake-pay-installment-modal' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText size={20} />
                      Setup Installment Payment
                    </h3>
                    <p className="text-sm text-white/80 mt-1">Configure payment schedule for this order</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsPayInstallmentSetupOpen(false);
                      setIsPayInstallmentChoiceOpen(false);
                      setShowPayModal(null);
                      setPayIsStaggered(false);
                      setPayInstallmentPlan([]);
                    }}
                    className="ml-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors shrink-0"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <InstallmentSetupInline
                  ref={payInstallmentSetupRef}
                  totalAmount={showPayModal.balanceRemaining > 0 ? showPayModal.balanceRemaining : showPayModal.total}
                  initialInstallments={payInstallmentPlan}
                  onChange={(installments) => {
                    setPayInstallmentPlan(installments);
                    setPayInstallmentSetupError('');
                  }}
                />
              </div>

              {payInstallmentSetupError && (
                <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{payInstallmentSetupError}</p>
                </div>
              )}

              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100 dark:border-primary-800">
                <button
                  onClick={() => {
                    setIsPayInstallmentSetupOpen(false);
                    setIsPayInstallmentChoiceOpen(true);
                    setPayIsStaggered(false);
                    setPayInstallmentPlan([]);
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSavePayInstallmentSchedule}
                  disabled={paySubmitting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {paySubmitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pay Now Modal */}
      {!!showPayModal && !isPayInstallmentChoiceOpen && !isPayInstallmentSetupOpen && (() => {
        const hasGcashInfo = !!(bizSettings.gcash_qr || bizSettings.gcash_name || bizSettings.gcash_number);
        const dueAmount = payType === 'installment' && payInstallment
          ? parseFloat(payInstallment.amount_expected || 0)
          : ((showPayModal.balanceRemaining && showPayModal.balanceRemaining > 0) ? showPayModal.balanceRemaining : showPayModal.total);
        const isGcashValid = !!payReference.trim() && payReference.replace(/\s/g, '').length === 13 && !payRefError && payProofFiles.length > 0;
        const isPdoValid = !!payPdoCheckNumber.trim() && !!payPdoBankName.trim() && !!payPdoCheckDate && payProofFiles.length > 0;
        const canSubmit = !paySubmitting
          && showPayModal.shippingFeeStatus !== 'pending'
          && !payInstallmentLoading
          && (payType !== 'installment' || !!payInstallment)
          && (payMethod === 'gcash' ? isGcashValid : isPdoValid);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { stopPayCamera(); setShowPayModal(null); }} />
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border-2 border-primary-200 dark:border-primary-700 ${payMethod === 'pdo' ? 'max-w-4xl' : (hasGcashInfo ? 'max-w-3xl' : 'max-w-md')}`}>

                {/* Header — white bg, method tabs + payment mode */}
                <div className="p-4 shrink-0 border-b-2 border-primary-200 dark:border-primary-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-700 dark:to-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => { stopPayCamera(); setShowPayModal(null); }} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Back">&#8592;</button>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex-1">Payment</h3>
                    <button onClick={() => { stopPayCamera(); setShowPayModal(null); }} className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Close"><X size={16} /></button>
                  </div>
                  {/* Payment Method Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {[
                      { value: 'gcash', label: 'GCash', icon: CreditCard, color: '#2563eb' },
                      { value: 'pdo',   label: 'PDO',   icon: FileText,   color: '#8b5cf6' },
                    ].map(({ value, label, icon: Icon, color }) => {
                      const isSelected = payMethod === value;
                      return (
                        <button key={value} type="button"
                          onClick={() => { setPayMethod(value); setPayRefError(''); }}
                          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all text-xs font-semibold"
                          style={isSelected
                            ? { backgroundColor: `${color}15`, border: `2px solid ${color}`, color }
                            : { border: '1px solid var(--color-primary-200)', color: 'var(--color-text-secondary)' }
                          }>
                          <Icon size={14} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-hidden flex">

                  {/* PDO: Two-column layout */}
                  {payMethod === 'pdo' ? (
                    <>
                      {/* PDO Left: Order Summary */}
                      <div className="w-72 shrink-0 bg-gray-50 dark:bg-gray-700/50 p-5 border-r-2 border-primary-200 dark:border-primary-700 overflow-y-auto">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 uppercase tracking-wide">Order Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Order</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{showPayModal.id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Items</span>
                            <span className="font-medium text-gray-800 dark:text-gray-100">{showPayModal.items?.length || 0} item(s)</span>
                          </div>
                          <div className="flex justify-between border-t-2 border-gray-200 dark:border-gray-600 pt-2 mt-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100">{payType === 'installment' ? 'Installment Due' : 'Total Due'}</span>
                            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">₱{Number(dueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        {showPayModal.shippingFeeStatus === 'pending' && (
                          <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Shipping fee is still pending. Payment is disabled until finalized.</p>
                          </div>
                        )}
                        <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-3">
                          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-1 uppercase tracking-wide">Post-Dated Check</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">Upload a clear photo of the check. Payment will be reviewed by admin before approval.</p>
                        </div>
                      </div>

                      {/* PDO Right: Form */}
                      <div className="flex-1 min-w-0 overflow-y-auto">
                        <div className="p-5 space-y-4">
                          {/* Check Image */}
                          <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">Check Image <span className="text-red-500">*</span></label>
                            {payPdoShowCamera && (
                              <div className="relative mb-3 rounded-lg overflow-hidden border-2 border-purple-300 dark:border-purple-700">
                                <video ref={payPdoVideoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                                  <button type="button" onClick={capturePayPdoPhoto} className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-purple-600 flex items-center gap-1.5"><Camera size={14} /> Capture</button>
                                  <button type="button" onClick={stopPayPdoCamera} className="px-4 py-2 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-1.5"><X size={14} /> Cancel</button>
                                </div>
                              </div>
                            )}
                            {payProofPreviews.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {payProofPreviews.map((src, i) => (
                                  <div key={i} className="relative group">
                                    <img src={src} alt={`Check ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-purple-300 dark:border-purple-600" />
                                    <button onClick={() => { setPayProofFiles(prev => prev.filter((_, j) => j !== i)); setPayProofPreviews(prev => prev.filter((_, j) => j !== i)); }}
                                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!payPdoShowCamera && (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => payProofInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${payProofFiles.length === 0 ? 'border-red-300 dark:border-red-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-purple-300 dark:border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}><Upload size={14} /> Upload Image</button>
                                <button type="button" onClick={startPayPdoCamera} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${payProofFiles.length === 0 ? 'border-red-300 dark:border-red-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-purple-300 dark:border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}><Camera size={14} /> Open Camera</button>
                                <input ref={payProofInputRef} type="file" accept="image/*" multiple onChange={handlePayProofChange} className="hidden" />
                              </div>
                            )}
                            {payProofFiles.length === 0 && <p className="mt-1 text-xs text-red-500">Check image is required.</p>}
                          </div>
                          {/* Check Number */}
                          <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">Check Number <span className="text-red-500">*</span></label>
                            <input type="text" value={payPdoCheckNumber} onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setPayPdoCheckNumber(val);
                              setPayPdoCheckNumberError(val.length > 0 && val.length < 6 ? 'Must be at least 6 digits' : '');
                            }} placeholder="Enter 6-10 digit check number"
                              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                payPdoCheckNumberError ? 'border-red-400 focus:ring-red-500' 
                                : payPdoCheckNumber.length >= 6 && payPdoCheckNumber.length <= 10 ? 'border-green-400 focus:ring-green-500' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
                              }`} />
                            {payPdoCheckNumberError && <p className="mt-1 text-xs text-red-500">{payPdoCheckNumberError}</p>}
                            {!payPdoCheckNumberError && payPdoCheckNumber.length >= 6 && payPdoCheckNumber.length <= 10 && <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Valid check number</p>}
                          </div>
                          {/* Check Date */}
                          <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">Check Date <span className="text-red-500">*</span></label>
                            <input type="date" value={payPdoCheckDate} onChange={(e) => setPayPdoCheckDate(e.target.value)}
                              className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The date written on the check</p>
                          </div>
                          {/* Bank Name */}
                          <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">Bank Name <span className="text-red-500">*</span></label>
                            <input type="text" value={payPdoBankName} onChange={(e) => setPayPdoBankName(e.target.value)} placeholder="Enter bank name"
                              className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* GCash: left form + optional right QR panel */
                    <>
                      <div className="flex-1 min-w-0 overflow-y-auto">
                        <div className="p-5 space-y-4">
                          {/* Order Summary */}
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-1">
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{showPayModal.id}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{showPayModal.items?.length || 0} item(s)</p>
                              </div>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                              <span className="font-bold text-gray-800 dark:text-gray-100">{payType === 'installment' ? 'Installment Due' : 'Amount to Submit'}</span>
                              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₱{Number(dueAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          {showPayModal.shippingFeeStatus === 'pending' && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Shipping fee is still pending. Please wait for admin confirmation before paying.</p>
                            </div>
                          )}
                          {/* GCash Reference */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">GCash Reference Number <span className="text-red-500">*</span></label>
                            <input type="text" value={payReference} onChange={(e) => {
                              const val = e.target.value.replace(/[^\d\s]/g, '').slice(0, 15);
                              setPayReference(val);
                              setPayRefError('');
                              checkPayReference(val);
                            }}
                              placeholder="Enter 13-digit reference number"
                              className={`w-full px-4 py-3 text-lg font-bold border-2 rounded-lg focus:outline-none focus:ring-2 tracking-wider bg-white dark:bg-gray-700 dark:text-gray-100 ${
                                payRefError ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                                : payReference.replace(/\s/g, '').length > 0 && payReference.replace(/\s/g, '').length !== 13 ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                                : payReference.replace(/\s/g, '').length === 13 && !payRefError ? 'border-green-400 focus:ring-green-500 focus:border-green-500'
                                : 'border-primary-200 dark:border-primary-700 focus:ring-blue-500 focus:border-blue-500'
                              }`}
                              autoFocus />
                            {payRefError && <p className="text-xs text-red-500 font-medium mt-1">{payRefError}</p>}
                            {!payRefError && payReference.replace(/\s/g, '').length > 0 && payReference.replace(/\s/g, '').length !== 13 && (
                              <p className="mt-1 text-xs text-red-500">Reference number must be exactly 13 digits (currently {payReference.replace(/\s/g, '').length}).</p>
                            )}
                          </div>
                          {/* Payment Proof */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Payment Proof <span className="text-red-500">*</span></label>
                            {payShowCamera && (
                              <div className="relative mb-3 rounded-lg overflow-hidden border-2 border-blue-300 dark:border-blue-700">
                                <video ref={payVideoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                                  <button onClick={capturePayPhoto} className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-blue-600 flex items-center gap-1.5"><Camera size={14} /> Capture</button>
                                  <button onClick={stopPayCamera} className="px-4 py-2 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-1.5"><X size={14} /> Cancel</button>
                                </div>
                              </div>
                            )}
                            {payProofPreviews.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {payProofPreviews.map((src, i) => (
                                  <div key={i} className="relative group">
                                    <img src={src} alt={`Proof ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-700" />
                                    <button onClick={() => { setPayProofFiles(prev => prev.filter((_, j) => j !== i)); setPayProofPreviews(prev => prev.filter((_, j) => j !== i)); }}
                                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!payShowCamera && (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => payProofInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${payProofFiles.length === 0 ? 'border-red-300 dark:border-red-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-blue-300 dark:border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}><ImageIcon size={14} /> Upload Image</button>
                                <button type="button" onClick={startPayCamera} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${payProofFiles.length === 0 ? 'border-red-300 dark:border-red-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-blue-300 dark:border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}><Camera size={14} /> Open Camera</button>
                                <input ref={payProofInputRef} type="file" accept="image/*" multiple onChange={handlePayProofChange} className="hidden" />
                              </div>
                            )}
                            {payProofFiles.length === 0 && <p className="mt-1 text-xs text-red-500">Payment proof is required.</p>}
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-3">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wide">GCash Verification</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Enter the exact 13-digit GCash reference number and upload a screenshot as proof. Payment will be reviewed by admin.</p>
                          </div>
                        </div>
                      </div>
                      {/* GCash QR Right Panel */}
                      {hasGcashInfo && (
                        <div className="w-64 shrink-0 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-200 dark:border-blue-700 p-5 flex flex-col items-center justify-center gap-4 overflow-y-auto">
                          <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-center">Send Payment Here</h4>
                          {bizSettings.gcash_qr && (
                            <div className="w-48 h-48 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-700 overflow-hidden shadow-lg">
                              <img src={bizSettings.gcash_qr} alt="GCash QR Code" className="w-full h-full object-contain p-2" />
                            </div>
                          )}
                          {bizSettings.gcash_name && (
                            <div className="text-center">
                              <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wider font-semibold">Account Name</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{bizSettings.gcash_name}</p>
                            </div>
                          )}
                          {bizSettings.gcash_number && (
                            <div className="text-center">
                              <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wider font-semibold">GCash Number</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-wider">{bizSettings.gcash_number}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-blue-400 dark:text-blue-500 text-center mt-auto pt-2">Scan the QR code or send to the number above, then enter the reference number.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100 dark:border-primary-800">
                  <button
                    onClick={() => { stopPayCamera(); setShowPayModal(null); }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handlePaySubmit}
                    disabled={!canSubmit}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${payMethod === 'gcash' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'}`}
                  >
                    <CheckCircle size={14} /> {paySubmitting ? 'Processing...' : (payType === 'installment' ? 'Submit Installment Payment' : 'Submit Full Payment')}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default Orders;
