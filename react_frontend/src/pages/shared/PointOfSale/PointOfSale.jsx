import { Monitor, Search, Plus, Minus, ShoppingCart, Trash2, DollarSign, Receipt, Package, Smartphone, XCircle, Tag, Clock, RotateCcw, CheckCircle, ChevronUp, ChevronDown, Banknote, PlusCircle, Check, AlertCircle, User, Phone, Mail, Lock, MapPin, Truck, Loader2, Navigation, Camera, ImageIcon, X } from 'lucide-react';
import { useState, useMemo, memo, useCallback, useRef, useEffect } from 'react';
import { PageHeader } from '../../../components/common';
import { Button, StatsCard, useToast } from '../../../components/ui';
import { useDataFetch, invalidateCache } from '../../../hooks/useDataFetch';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessSettings } from '../../../context/BusinessSettingsContext';
import { debouncedSearchAddress, calculateDistance, geocodeAddress } from '../../../api/openRouteService';

// client combobox component - select existing or add new (requires name + contact or email)
const ClientCombobox = memo(({ value, newName, newContact, newEmail, onChange, onInputChange, onContactChange, onEmailChange, clientOptions, error, emailError }) => {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
        <User size={14} className="text-gray-400" />
        Client <span className="text-red-500">*</span>
      </label>
      
      {/* Dropdown for existing clients */}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`w-full px-3 py-2.5 text-sm border-2 rounded-lg transition-all appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500/20'
              : value && !newName
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20 focus:border-green-500 focus:ring-green-500/20'
                : 'border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        >
          {clientOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {error && <AlertCircle size={14} className="text-red-500" />}
          {value && !newName && !error && <Check size={14} className="text-green-500" />}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-[10px] text-gray-400 uppercase font-medium">or add new</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Input for new client name */}
      <div className="relative">
        <input
          type="text"
          value={newName}
          onChange={onInputChange}
          placeholder="Type new client name..."
          className={`w-full px-3 py-2.5 pl-8 text-sm border-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
            newName 
              ? 'border-green-400 bg-green-50 dark:bg-green-900/20 focus:border-green-500 focus:ring-green-500/20' 
              : 'border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        />
        <PlusCircle size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${newName ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
        {newName && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Check size={14} className="text-green-500" />
          </div>
        )}
      </div>

      {/* Contact & Email fields - shown when adding new client */}
      {newName && (
        <div className="mt-2 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={newContact}
              onChange={onContactChange}
              placeholder="Contact number (e.g. 09171234567)"
              className={`w-full px-3 py-2 pl-8 text-sm border-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                newContact
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20 focus:border-green-500 focus:ring-green-500/20'
                  : 'border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
              }`}
            />
            <Phone size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${newContact ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          </div>
          <div className="relative">
            <input
              type="email"
              value={newEmail}
              onChange={onEmailChange}
              placeholder="Email address (required)"
              className={`w-full px-3 py-2 pl-8 text-sm border-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                emailError
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500/20'
                  : newEmail
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
              }`}
            />
            <Mail size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${emailError ? 'text-red-500' : newEmail ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          </div>
          {emailError && (
            <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle size={10} />{emailError}</p>
          )}
        </div>
      )}

      {/* Info when new client is valid */}
      {newName && newEmail && !emailError && (
        <div className="flex items-start gap-1.5 p-1.5 mt-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <AlertCircle size={12} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-green-700 dark:text-green-300">
            New client "<strong>{newName}</strong>" will be created.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-[10px] text-red-500 flex items-center gap-1"><AlertCircle size={10} />{error}</p>
      )}
    </div>
  );
});

ClientCombobox.displayName = 'ClientCombobox';

const PointOfSale = () => {
  const toast = useToast();
  const { isSuperAdmin, isAdmin, isAdminOrAbove } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSaleCompleteModal, setShowSaleCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [gcashRefError, setGcashRefError] = useState('');
  const gcashRefCheckTimeout = useRef(null);
  const [gcashProofFiles, setGcashProofFiles] = useState([]);
  const [gcashProofPreviews, setGcashProofPreviews] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const gcashProofInputRef = useRef(null);
  const [lastSale, setLastSale] = useState(null);
  const [voidSearch, setVoidSearch] = useState('');
  const [selectedVoidTxn, setSelectedVoidTxn] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidPassword, setVoidPassword] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [clientError, setClientError] = useState('');
  const [emailError, setEmailError] = useState('');
  const emailCheckTimeout = useRef(null);
  // Delivery / Shipping state
  const [forDelivery, setForDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const [isEstimate, setIsEstimate] = useState(false);
  const [warehouseCoords, setWarehouseCoords] = useState(null);
  const addressInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Geocode warehouse address on mount
  useEffect(() => {
    if (businessSettings.warehouse_address && !warehouseCoords) {
      geocodeAddress(businessSettings.warehouse_address).then(coords => {
        if (coords) setWarehouseCoords(coords);
      });
    }
  }, [businessSettings.warehouse_address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          addressInputRef.current && !addressInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle address input change with autocomplete
  const handleAddressInput = useCallback((value) => {
    setDeliveryAddress(value);
    setSelectedCoords(null);
    setDistanceKm('');
    setEstimatedDuration(null);
    debouncedSearchAddress(value, (results) => {
      setAddressSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, warehouseCoords || {});
  }, [warehouseCoords]);

  // Handle selecting an address suggestion
  const handleSelectAddress = useCallback(async (suggestion) => {
    setDeliveryAddress(suggestion.label);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setShowSuggestions(false);
    setAddressSuggestions([]);

    // Auto-calculate distance if warehouse coords are available
    if (warehouseCoords) {
      setCalculatingDistance(true);
      try {
        const result = await calculateDistance(
          warehouseCoords.lat, warehouseCoords.lng,
          suggestion.lat, suggestion.lng
        );
        setDistanceKm(String(result.distanceKm));
        setEstimatedDuration(result.durationMin);
        setIsEstimate(result.isEstimate || false);
      } catch (err) {
        console.error('Distance calc failed:', err);
      } finally {
        setCalculatingDistance(false);
      }
    }
  }, [warehouseCoords]);

  // Fetch real data from API
  const { data: productsRaw, refetch: refetchProducts } = useDataFetch('/products');
  const { data: salesRaw, refetch: refetchSales } = useDataFetch('/sales');
  const { data: varietiesRaw } = useDataFetch('/varieties');
  const { data: clientsRaw, refetch: refetchClients } = useDataFetch('/customers');

  // Map products to POS format — include all active products even with 0 stock
  const products = useMemo(() =>
    (productsRaw || [])
      .filter(p => p.status === 'active' && !p.is_deleted)
      .map(p => ({
        id: p.product_id,
        name: p.product_name,
        price: p.price,
        stock: p.stocks,
        variety: p.variety_name,
        variety_color: p.variety_color,
        variety_id: p.variety_id,
        weight_formatted: p.weight_formatted || null,
      })),

    [productsRaw]
  );

  const varieties = useMemo(() =>
    (varietiesRaw || []).map(c => c.name).filter(Boolean),
    [varietiesRaw]
  );

  // client options for combobox
  const clientOptions = useMemo(() => {
    const opts = (clientsRaw || [])
      .filter(c => c.status === 'Active')
      .map(c => ({ value: String(c.id), label: c.name }));
    return [{ value: '', label: 'Select a client...' }, ...opts];
  }, [clientsRaw]);

  // Check if selected existing client has contact or email
  const selectedClientHasContactInfo = useMemo(() => {
    if (!selectedClientId) return false;
    const client = (clientsRaw || []).find(c => String(c.id) === selectedClientId);
    if (!client) return false;
    return !!(client.contact || client.phone || client.email);
  }, [selectedClientId, clientsRaw]);

  const handleClientSelect = useCallback((e) => {
    const id = e.target.value;
    setSelectedClientId(id);
    if (id) {
      setNewClientName('');
      setNewClientContact('');
      setNewClientEmail('');
      setEmailError('');
      // Auto-fill delivery address from client's saved address
      if (forDelivery) {
        const client = (clientsRaw || []).find(c => String(c.id) === id);
        if (client?.address) {
          setDeliveryAddress(client.address);
        } else {
          setDeliveryAddress('');
        }
        // Reset distance — will be recalculated on confirm
        setDistanceKm('');
        setEstimatedDuration(null);
        setSelectedCoords(null);
      }
    }
    setClientError('');
  }, [forDelivery, clientsRaw]);

  const handleNewClientInput = useCallback((e) => {
    const val = e.target.value;
    setNewClientName(val);
    setClientError('');
    if (val) {
      // Check if typed name matches existing client
      const match = (clientsRaw || []).find(c => c.name.toLowerCase() === val.toLowerCase());
      if (match) {
        setSelectedClientId(String(match.id));
        setNewClientName('');
        setNewClientContact('');
        setNewClientEmail('');
        return;
      }
      setSelectedClientId('');
    }
  }, [clientsRaw]);

  const handleNewClientContact = useCallback((e) => {
    setNewClientContact(e.target.value);
    setClientError('');
  }, []);

  const checkGcashReference = useCallback((ref) => {
    const digits = ref.replace(/\s/g, '');
    if (digits.length !== 13) return;
    if (gcashRefCheckTimeout.current) clearTimeout(gcashRefCheckTimeout.current);
    gcashRefCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await apiClient.post('/sales/check-reference', { reference_number: digits });
        if (response.data && !response.data.available) {
          setGcashRefError('This reference number has already been used.');
        } else {
          setGcashRefError('');
        }
      } catch {
        // silently ignore network errors
      }
    }, 500);
  }, []);

  const checkPosEmailAvailability = useCallback((email) => {
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return;
    emailCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await apiClient.post('/customers/check-email', { email });
        if (response.data && !response.data.available) {
          setEmailError('This email is already taken.');
        } else {
          setEmailError('');
        }
      } catch {
        // silently ignore network errors
      }
    }, 500);
  }, []);

  const handleNewClientEmail = useCallback((e) => {
    const value = e.target.value;
    setNewClientEmail(value);
    setClientError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setEmailError('Please enter a valid email address.');
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
    } else {
      setEmailError('');
      checkPosEmailAvailability(value);
    }
  }, [checkPosEmailAvailability]);

  // Recent transactions from API (today only, completed)
  const recentTransactions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (salesRaw || [])
      .filter(s => s.date_short === today)
      .map(s => ({
        id: s.transaction_id,
        saleId: s.id,
        time: s.date_formatted,
        total: s.total,
        items: s.items_count,
        itemsList: s.items || [],
        payment: s.payment_method?.toUpperCase(),
        status: s.status,
      }))
      .reverse();
  }, [salesRaw]);

  // Today's stats from real sales
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = (salesRaw || []).filter(s => s.date_short === today && s.status === 'completed');
    const totalSales = todaySales.reduce((s, sale) => s + (sale.total || 0), 0);
    const transactions = todaySales.length;
    const itemsSold = todaySales.reduce((s, sale) => s + (sale.total_quantity || 0), 0);
    return {
      totalSales,
      transactions,
      itemsSold,
      avgTransaction: transactions > 0 ? Math.round(totalSales / transactions) : 0,
    };
  }, [salesRaw]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVariety = !selectedVariety || p.variety === selectedVariety;
    return matchesSearch && matchesVariety;
  });

  const addToCart = (product) => {
    if (!product.price || product.price <= 0) {
      toast.error('Cannot Add', `"${product.name}" has no price set yet.`);
      return;
    }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const voidTransaction = () => {
    setShowVoidModal(true);
    setSelectedVoidTxn(null);
    setVoidReason('');
    setVoidPassword('');
    setVoidSearch('');
  };

  const confirmVoid = async () => {
    if (!selectedVoidTxn || !voidReason.trim() || !voidPassword.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { reason: voidReason, admin_password: voidPassword };
      const response = await apiClient.post(`/sales/${selectedVoidTxn.saleId}/void`, payload);
      if (response.success) {
        invalidateCache('/sales');
        invalidateCache('/products');
        refetchSales();
        refetchProducts();
        toast.success('Transaction Voided', `${selectedVoidTxn.id} voided — refund processed`);
        setShowVoidModal(false);
        setSelectedVoidTxn(null);
        setVoidReason('');
      } else {
        throw response;
      }
    } catch (error) {
      toast.error('Void Failed', error.message || 'Failed to void transaction');
    } finally {
      setSaving(false);
    }
  };

  const filteredVoidTxns = recentTransactions.filter(t => 
    (t.id.toLowerCase().includes(voidSearch.toLowerCase()) || 
    t.time.toLowerCase().includes(voidSearch.toLowerCase())) &&
    t.status === 'completed'
  );

  const completeSale = () => {
    if (cart.length === 0) return;
    // Reset client fields and show client modal
    setSelectedClientId('');
    setNewClientName('');
    setNewClientContact('');
    setNewClientEmail('');
    setClientError('');
    setEmailError('');
    setShowClientModal(true);
  };

  const confirmClient = async () => {
    // Validate client: must have name + (contact or email)
    if (!selectedClientId && !newClientName) {
      setClientError('Please select a client or add a new one.');
      return;
    }

    // If existing client selected, check they have contact info
    if (selectedClientId && !selectedClientHasContactInfo) {
      setClientError('Selected client has no contact or email on file. Please update their info or add a new client.');
      return;
    }

    // If new client, require email
    if (newClientName && !newClientEmail.trim()) {
      setClientError('Email address is required for new clients.');
      return;
    }

    // Block if email has a uniqueness/format error
    if (newClientName && emailError) {
      setClientError('Please fix the email error before proceeding.');
      return;
    }

    // If for delivery, require address
    if (forDelivery && !deliveryAddress.trim()) {
      setClientError('Delivery address is required for delivery orders.');
      return;
    }

    // Auto-calculate distance if for delivery and address is set
    if (forDelivery && deliveryAddress.trim() && !distanceKm) {
      setCalculatingDistance(true);
      try {
        // Geocode delivery address
        const destCoords = await geocodeAddress(deliveryAddress);
        if (destCoords && warehouseCoords) {
          setSelectedCoords(destCoords);
          const result = await calculateDistance(
            warehouseCoords.lat, warehouseCoords.lng,
            destCoords.lat, destCoords.lng
          );
          setDistanceKm(String(result.distanceKm));
          setEstimatedDuration(result.durationMin);
          setIsEstimate(result.isEstimate || false);
        }
      } catch (err) {
        console.error('Distance calc failed:', err);
      } finally {
        setCalculatingDistance(false);
      }
    }

    setClientError('');
    setShowClientModal(false);
    setCashTendered('');
    setGcashReference('');
    setGcashRefError('');
    setGcashProofFiles([]);
    setGcashProofPreviews([]);
    setShowCamera(false);
    stopCamera();
    setShowPaymentModal(true);
  };

  // Camera helpers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast.error('Camera Error', 'Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `gcash_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setGcashProofFiles(prev => [...prev, file]);
      setGcashProofPreviews(prev => [...prev, URL.createObjectURL(blob)]);
      stopCamera();
    }, 'image/jpeg', 0.85);
  };

  const handleGcashProofUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGcashProofFiles(prev => [...prev, ...files]);
    setGcashProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeGcashProof = (idx) => {
    setGcashProofFiles(prev => prev.filter((_, i) => i !== idx));
    setGcashProofPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const confirmPayment = async () => {
    if (saving) return;
    
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < total) return;
    } else if (paymentMethod === 'gcash') {
      if (!gcashReference.trim() || gcashReference.replace(/\s/g, '').length !== 13) return;
      if (gcashProofFiles.length === 0) return;
      if (gcashRefError) return;
    }
    // COD and Pay Later require no additional fields

    setSaving(true);
    try {
      let response;

      if (paymentMethod === 'gcash' && gcashProofFiles.length > 0) {
        // Use FormData when there are proof files
        const formData = new FormData();
        cart.forEach((item, i) => {
          formData.append(`items[${i}][product_id]`, item.id);
          formData.append(`items[${i}][quantity]`, item.quantity);
          formData.append(`items[${i}][unit_price]`, item.price);
        });
        if (selectedClientId) formData.append('customer_id', parseInt(selectedClientId));
        if (newClientName) formData.append('new_customer_name', newClientName);
        if (newClientContact) formData.append('new_customer_contact', newClientContact);
        if (newClientEmail) formData.append('new_customer_email', newClientEmail);
        formData.append('payment_method', paymentMethod);
        formData.append('amount_tendered', total);
        formData.append('reference_number', gcashReference);
        if (forDelivery) {
          formData.append('delivery_fee', deliveryFee);
          if (distanceKm) formData.append('distance_km', parseFloat(distanceKm));
          if (deliveryAddress) formData.append('delivery_address', deliveryAddress);
        } else {
          formData.append('delivery_fee', 0);
        }
        gcashProofFiles.forEach(file => formData.append('payment_proof[]', file));
        response = await apiClient.post('/sales/order', formData);
      } else {
        const payload = {
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          customer_id: selectedClientId ? parseInt(selectedClientId) : null,
          new_customer_name: newClientName || null,
          new_customer_contact: newClientContact || null,
          new_customer_email: newClientEmail || null,
          payment_method: paymentMethod,
          amount_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : (paymentMethod === 'cod' || paymentMethod === 'pay_later' ? 0 : total),
          reference_number: paymentMethod === 'gcash' ? gcashReference : null,
          delivery_fee: forDelivery ? deliveryFee : 0,
          distance_km: forDelivery && distanceKm ? parseFloat(distanceKm) : null,
          delivery_address: forDelivery ? deliveryAddress : null,
        };
        response = await apiClient.post('/sales/order', payload);
      }
      
      if (response.success && response.data) {
        const clientName = newClientName || (selectedClientId ? clientOptions.find(o => o.value === selectedClientId)?.label : null);
        const saleData = {
          items: [...cart],
          total,
          totalItems,
          clientName,
          paymentMethod: paymentMethod === 'cash' ? 'CASH' : paymentMethod === 'gcash' ? 'GCASH' : paymentMethod === 'pay_later' ? 'PAY LATER' : 'COD',
          transactionId: response.data.transaction_id,
          time: response.data.date_formatted || new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }),
          cashTendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : null,
          change: paymentMethod === 'cash' ? parseFloat(cashTendered) - total : null,
          gcashReference: paymentMethod === 'gcash' ? gcashReference : null,
          deliveryFee: forDelivery ? deliveryFee : 0,
          subtotal,
          forDelivery,
        };
        setLastSale(saleData);
        setShowPaymentModal(false);
        setShowSaleCompleteModal(true);
        setCart([]);
        setSelectedClientId('');
        setNewClientName('');
        setNewClientContact('');
        setNewClientEmail('');
        setClientError('');
        setEmailError('');
        setForDelivery(false);
        setDeliveryAddress('');
        setDistanceKm('');
        setSelectedCoords(null);
        setEstimatedDuration(null);
        setAddressSuggestions([]);

        // Refresh data
        invalidateCache('/sales');
        invalidateCache('/products');
        refetchSales();
        refetchProducts();
        if (newClientName) {
          invalidateCache('/customers');
          refetchClients();
        }
      } else {
        throw response;
      }
    } catch (error) {
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        toast.error('Order Failed', `Please fix: ${Object.values(backendErrors).flat().join(', ')}`);
      } else {
        toast.error('Order Failed', error.message || 'Failed to create order');
      }
    } finally {
      setSaving(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalSacks = totalItems; // Each item quantity represents sacks

  // Calculate delivery fee based on business settings
  const deliveryFee = useMemo(() => {
    if (!forDelivery || !distanceKm) return 0;
    const distance = parseFloat(distanceKm) || 0;
    const baseKm = parseFloat(businessSettings.shipping_base_km) || 1;
    const ratePerSack = parseFloat(businessSettings.shipping_rate_per_sack) || 0;
    const ratePerKm = parseFloat(businessSettings.shipping_rate_per_km) || 0;
    // Formula: ceil(distance / baseKm) * ratePerSack * totalSacks + (ratePerKm * distance)
    const sackBasedFee = Math.ceil(distance / baseKm) * ratePerSack * totalSacks;
    const kmBasedFee = ratePerKm * distance;
    return sackBasedFee + kmBasedFee;
  }, [forDelivery, distanceKm, totalSacks, businessSettings.shipping_base_km, businessSettings.shipping_rate_per_sack, businessSettings.shipping_rate_per_km]);

  const total = subtotal + deliveryFee;

  return (
    <div>
      <PageHeader 
        title="Point of Sale" 
        description="Process sales transactions quickly and efficiently"
        icon={Monitor}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatsCard label="Today's Sales" value={`₱${todayStats.totalSales.toLocaleString()}`} unit="revenue" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Transactions" value={todayStats.transactions} unit="orders" icon={Receipt} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Items Sold" value={todayStats.itemsSold} unit="items" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Avg Transaction" value={`₱${todayStats.avgTransaction.toLocaleString()}`} unit="per order" icon={ShoppingCart} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
      </div>

      <div className="flex gap-6" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {/* Products Section - scrollable */}
        <div className="lg:col-span-2 flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-primary-700 shadow-lg shadow-primary-100/50 dark:shadow-gray-900/30 p-4 flex flex-col overflow-hidden">
          {/* Search and Variety Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b-2 border-primary-100 dark:border-primary-800 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 appearance-none cursor-pointer min-w-[160px] font-medium"
              >
                <option value="">All Varieties</option>
                {varieties.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Products Grid - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const hasNoPrice = !product.price || product.price <= 0;
                return (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className={`bg-white dark:bg-gray-800 rounded-xl border-2 shadow-sm p-3 text-center transition-all ${
                    hasNoPrice
                      ? 'border-red-300 dark:border-red-700 opacity-60 cursor-not-allowed'
                      : 'border-primary-200 dark:border-primary-700 cursor-pointer hover:shadow-lg hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/20 hover:scale-[1.02]'
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 dark:to-gray-800 rounded-xl mx-auto mb-2 flex items-center justify-center border border-primary-200 dark:border-primary-700">
                    <Package size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-xs mb-1 line-clamp-2">{product.name}{product.weight_formatted ? ` (${product.weight_formatted})` : ''}</h4>
                  {hasNoPrice ? (
                    <p className="text-red-500 dark:text-red-400 font-bold text-xs">No price set</p>
                  ) : (
                    <p className="text-primary-600 dark:text-primary-400 font-bold text-sm">₱{product.price.toLocaleString()}</p>
                  )}
                  <p className={`text-[10px] mt-0.5 ${product.stock > 0 ? 'text-gray-400' : 'text-amber-500 font-medium'}`}>{product.stock > 0 ? `${product.stock} in stock` : 'No stock'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full border border-primary-200 dark:border-primary-700">
                    {product.variety}
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart Section - fixed, fills height */}
        <div className="hidden lg:flex lg:flex-col w-80 xl:w-96 shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-primary-700 shadow-lg shadow-primary-100/50 dark:shadow-gray-900/30 overflow-hidden flex flex-col h-full">
            {/* Cart Header */}
            <div className="p-4 bg-gradient-to-r from-button-500 to-button-600 text-white border-b-2 border-button-600 shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShoppingCart size={18} />
                Current Order
                {cart.length > 0 && (
                  <span className="ml-auto bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {totalItems} items
                  </span>
                )}
              </h3>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4">
              {/* Cart Items - scrollable */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center h-full">
                    <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="text-xs">Click on products to add</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-gray-700 rounded-lg border-2 border-primary-200 dark:border-primary-700">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-gray-100 text-xs truncate">{item.name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}</p>
                          <p className="text-primary-600 dark:text-primary-400 text-xs font-medium">₱{item.price.toLocaleString()} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}>
                            <Minus size={12} />
                          </Button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                setCart(cart.map(ci => ci.id === item.id ? { ...ci, quantity: val } : ci));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 text-center text-xs font-bold border border-primary-200 dark:border-primary-700 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}>
                            <Plus size={12} />
                          </Button>
                          <Button variant="danger" size="xs" onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="ml-1">
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method - always visible */}
              <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-4 mb-4 shrink-0">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Payment Method</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all font-semibold text-xs
                      ${paymentMethod === 'cash' 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                        : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <DollarSign size={16} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('gcash')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all font-semibold text-xs
                      ${paymentMethod === 'gcash' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                        : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Smartphone size={16} />
                    GCash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all font-semibold text-xs
                      ${paymentMethod === 'cod' 
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
                        : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Banknote size={16} />
                    COD
                  </button>
                  <button
                    onClick={() => setPaymentMethod('pay_later')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all font-semibold text-xs
                      ${paymentMethod === 'pay_later' 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' 
                        : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Clock size={16} />
                    Pay Later
                  </button>
                </div>
              </div>

              {/* Delivery Toggle */}
              <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${forDelivery ? 'bg-orange-500' : 'bg-gray-300'}`}
                    onClick={() => {
                      const next = !forDelivery;
                      setForDelivery(next);
                      if (!next) { setDeliveryAddress(''); setDistanceKm(''); setSelectedCoords(null); setEstimatedDuration(null); setAddressSuggestions([]); }
                    }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 shadow transition-transform ${forDelivery ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                    <Truck size={14} className={forDelivery ? 'text-orange-500' : 'text-gray-400'} />
                    For Delivery
                  </span>
                </label>

                {forDelivery && (deliveryAddress || distanceKm || calculatingDistance) && (
                  <div className="mt-2 space-y-1">
                    {deliveryAddress && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                        <MapPin size={10} className="mt-0.5 shrink-0 text-orange-400" />
                        <span className="line-clamp-2">{deliveryAddress}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {distanceKm && (
                        <p className="text-[10px] text-orange-500 font-medium flex items-center gap-1">
                          <Navigation size={10} />
                          {distanceKm} km
                          {estimatedDuration && (
                            <span className="text-gray-400 ml-1">
                              (~{estimatedDuration >= 60 ? `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}m` : `${estimatedDuration} min`})
                            </span>
                          )}
                        </p>
                      )}
                      {calculatingDistance && (
                        <p className="text-[10px] text-orange-500 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Calculating...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Section - always visible */}
              <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-4 shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">₱{subtotal.toLocaleString()}</span>
                </div>
                {forDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
                      <Truck size={10} /> Shipping Fee
                    </span>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-primary-100 dark:border-primary-800">
                  <span className="font-bold text-gray-800 dark:text-gray-100">Total</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₱{total.toLocaleString()}</span>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button onClick={completeSale} className="w-full" icon={Receipt} disabled={cart.length === 0}>
                    Place Order
                  </Button>
                  <Button onClick={voidTransaction} className="w-full" variant="outline" icon={RotateCcw}>
                    Void Transaction
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cart Floating Bar (below lg) */}
      <div className="lg:hidden">
        {cart.length > 0 && (
          <>
            {mobileCartOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileCartOpen(false)} />}
            <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-50">
              {mobileCartOpen && (
                <div className="bg-white dark:bg-gray-800 max-h-[70vh] overflow-y-auto rounded-t-2xl shadow-2xl border-t-2 border-primary-200 dark:border-primary-700">
                  <div className="p-4">
                    {/* Cart Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-primary-600 dark:text-primary-400" />
                        Current Order
                      </h3>
                      <span className="text-xs font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-700">
                        {totalItems} items
                      </span>
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-2 mb-4 max-h-[25vh] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-gray-700 rounded-lg border-2 border-primary-200 dark:border-primary-700">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-xs truncate">{item.name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''}</p>
                            <p className="text-primary-600 dark:text-primary-400 text-xs font-medium">₱{item.price.toLocaleString()} × {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="xs" onClick={() => updateQuantity(item.id, -1)}>
                              <Minus size={12} />
                            </Button>
                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                            <Button variant="outline" size="xs" onClick={() => updateQuantity(item.id, 1)}>
                              <Plus size={12} />
                            </Button>
                            <Button variant="danger" size="xs" onClick={() => removeFromCart(item.id)} className="ml-1">
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method */}
                    <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-3 mb-3">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Payment Method</p>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setPaymentMethod('cash')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 transition-all font-semibold text-xs
                            ${paymentMethod === 'cash' 
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                              : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <DollarSign size={14} />
                          Cash
                        </button>
                        <button
                          onClick={() => setPaymentMethod('gcash')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 transition-all font-semibold text-xs
                            ${paymentMethod === 'gcash' 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                              : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <Smartphone size={14} />
                          GCash
                        </button>
                        <button
                          onClick={() => setPaymentMethod('cod')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 transition-all font-semibold text-xs
                            ${paymentMethod === 'cod' 
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
                              : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <Banknote size={14} />
                          COD
                        </button>
                        <button
                          onClick={() => setPaymentMethod('pay_later')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 transition-all font-semibold text-xs
                            ${paymentMethod === 'pay_later' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' 
                              : 'border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <Clock size={14} />
                          Pay Later
                        </button>
                      </div>
                    </div>

                    {/* Delivery Toggle - Mobile */}
                    <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${forDelivery ? 'bg-orange-500' : 'bg-gray-300'}`}
                          onClick={() => {
                            const next = !forDelivery;
                            setForDelivery(next);
                            if (!next) { setDeliveryAddress(''); setDistanceKm(''); setSelectedCoords(null); setEstimatedDuration(null); setAddressSuggestions([]); }
                          }}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 shadow transition-transform ${forDelivery ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                          <Truck size={14} className={forDelivery ? 'text-orange-500' : 'text-gray-400'} />
                          For Delivery
                        </span>
                      </label>
                      {forDelivery && (deliveryAddress || distanceKm) && (
                        <div className="mt-1">
                          {deliveryAddress && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate"><MapPin size={10} className="inline mr-0.5 text-orange-400" />{deliveryAddress}</p>}
                          {distanceKm && <p className="text-[10px] text-orange-500 font-medium"><Navigation size={10} className="inline mr-0.5" />{distanceKm} km</p>}
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-primary-200 dark:border-primary-700 pt-3 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Subtotal</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">₱{subtotal.toLocaleString()}</span>
                      </div>
                      {forDelivery && deliveryFee > 0 && (
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-orange-500 font-medium flex items-center gap-1"><Truck size={10} /> Shipping</span>
                          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 dark:text-gray-100">Total</span>
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">₱{total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button onClick={() => { setMobileCartOpen(false); completeSale(); }} className="w-full" icon={Receipt} disabled={cart.length === 0}>
                        Place Order
                      </Button>
                      <Button onClick={() => { setMobileCartOpen(false); voidTransaction(); }} className="w-full" variant="outline" icon={RotateCcw}>
                        Void Transaction
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => setMobileCartOpen(!mobileCartOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-white bg-button-500 hover:bg-button-600 transition-all rounded-t-xl shadow-lg">
                <span className="font-medium text-sm flex items-center gap-2">
                  <ShoppingCart size={16} />
                  {totalItems} item(s) · ₱{total.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {mobileCartOpen ? 'Close' : 'View Cart'} {mobileCartOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* client Selection Modal */}
      {showClientModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowClientModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200 dark:border-primary-700">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-button-500 to-button-600 text-white shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User size={20} />
                  Client Information
                </h3>
                <p className="text-sm text-white/80 mt-1">Select an existing client or add a new one</p>
              </div>

              <div className="p-5">
                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Items</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{totalItems} items</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <span className="font-bold text-gray-800 dark:text-gray-100">Total</span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₱{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* client Combobox */}
                <ClientCombobox
                  value={selectedClientId}
                  newName={newClientName}
                  newContact={newClientContact}
                  newEmail={newClientEmail}
                  onChange={handleClientSelect}
                  onInputChange={handleNewClientInput}
                  onContactChange={handleNewClientContact}
                  onEmailChange={handleNewClientEmail}
                  clientOptions={clientOptions}
                  error={clientError}
                  emailError={emailError}
                />

                {/* Delivery Address — shown when For Delivery is toggled on */}
                {forDelivery && (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-700">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                      <Truck size={14} className="text-orange-500" />
                      Delivery Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={12} className="absolute left-2.5 top-3 text-gray-400" />
                      <textarea
                        ref={addressInputRef}
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          setDistanceKm('');
                          setEstimatedDuration(null);
                          setSelectedCoords(null);
                          setClientError('');
                          // Trigger autocomplete
                          debouncedSearchAddress(e.target.value, (results) => {
                            setAddressSuggestions(results);
                            setShowSuggestions(results.length > 0);
                          }, warehouseCoords || {});
                        }}
                        onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                        placeholder="Enter delivery address..."
                        rows={2}
                        className="w-full pl-7 pr-3 py-2 text-xs border-2 border-orange-200 dark:border-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none bg-white dark:bg-gray-800 dark:text-gray-100"
                      />
                      {/* Suggestions dropdown */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div ref={suggestionsRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-700 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                          {addressSuggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={async () => {
                                setDeliveryAddress(s.label);
                                setShowSuggestions(false);
                                setAddressSuggestions([]);
                                setSelectedCoords({ lat: s.lat, lng: s.lng });
                                // Auto-calculate distance
                                if (warehouseCoords) {
                                  setCalculatingDistance(true);
                                  try {
                                    const result = await calculateDistance(warehouseCoords.lat, warehouseCoords.lng, s.lat, s.lng);
                                    setDistanceKm(String(result.distanceKm));
                                    setEstimatedDuration(result.durationMin);
                                    setIsEstimate(result.isEstimate || false);
                                  } catch (err) {
                                    console.error('Distance calc failed:', err);
                                  } finally {
                                    setCalculatingDistance(false);
                                  }
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 border-b border-gray-100 last:border-0 transition-colors"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-100">{s.label}</span>
                              {s.locality && <span className="block text-[10px] text-gray-400">{s.locality}{s.region ? `, ${s.region}` : ''}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Distance info */}
                    {(distanceKm || calculatingDistance) && (
                      <div className="mt-2 space-y-1.5">
                        {calculatingDistance ? (
                          <p className="text-[10px] text-orange-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Calculating distance...</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                              <Navigation size={10} /> {distanceKm} km
                              {estimatedDuration && (
                                <span className="text-gray-400 font-normal ml-1">
                                  (~{estimatedDuration >= 60 ? `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}m` : `${estimatedDuration} min`} drive)
                                </span>
                              )}
                            </p>
                            {deliveryFee > 0 && (() => {
                              const distance = parseFloat(distanceKm) || 0;
                              const baseKm = parseFloat(businessSettings.shipping_base_km) || 1;
                              const ratePerSack = parseFloat(businessSettings.shipping_rate_per_sack) || 0;
                              const ratePerKm = parseFloat(businessSettings.shipping_rate_per_km) || 0;
                              const trips = Math.ceil(distance / baseKm);
                              const sackFee = trips * ratePerSack * totalSacks;
                              const kmFee = ratePerKm * distance;
                              return (
                                <div className="bg-orange-100/60 dark:bg-orange-900/20 rounded-lg p-2 space-y-1">
                                  <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Shipping Fee Breakdown</p>
                                  <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-0.5">
                                    {ratePerSack > 0 && (
                                      <div className="flex justify-between">
                                        <span>Sack-based: ⌈{distance}/{baseKm}⌉ × ₱{ratePerSack} × {totalSacks} sacks</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-100">₱{sackFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    )}
                                    {ratePerKm > 0 && (
                                      <div className="flex justify-between">
                                        <span>Distance-based: ₱{ratePerKm}/km × {distance} km</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-100">₱{kmFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between border-t border-orange-300 dark:border-orange-700/50 pt-1">
                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Total Shipping</span>
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-300">₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100 dark:border-primary-800">
                <button
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClient}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-button-500 hover:bg-button-600 transition-all"
                >
                  <Receipt size={14} /> Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal - Cash / GCash */}
      {showPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowPaymentModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200 dark:border-primary-700">
              {/* Header */}
              <div className={`p-5 text-white shrink-0 ${paymentMethod === 'cash' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : paymentMethod === 'gcash' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : paymentMethod === 'pay_later' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {paymentMethod === 'cash' ? <DollarSign size={20} /> : paymentMethod === 'gcash' ? <Smartphone size={20} /> : paymentMethod === 'pay_later' ? <Clock size={20} /> : <Banknote size={20} />}
                  {paymentMethod === 'cash' ? 'Cash Payment' : paymentMethod === 'gcash' ? 'GCash Payment' : paymentMethod === 'pay_later' ? 'Pay Later' : 'Cash on Delivery'}
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  {paymentMethod === 'cash' ? 'Enter amount tendered by client' : paymentMethod === 'gcash' ? 'Enter GCash reference number' : paymentMethod === 'pay_later' ? 'Order will be placed with payment pending' : 'Order will be paid upon delivery'}
                </p>
              </div>

              <div className="p-5">
                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Items</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{totalItems} items</span>
                  </div>
                  {forDelivery && deliveryFee > 0 && (() => {
                    const distance = parseFloat(distanceKm) || 0;
                    const baseKm = parseFloat(businessSettings.shipping_base_km) || 1;
                    const ratePerSack = parseFloat(businessSettings.shipping_rate_per_sack) || 0;
                    const ratePerKm = parseFloat(businessSettings.shipping_rate_per_km) || 0;
                    const trips = Math.ceil(distance / baseKm);
                    const sackFee = trips * ratePerSack * totalSacks;
                    const kmFee = ratePerKm * distance;
                    return (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="font-medium text-gray-800 dark:text-gray-100">₱{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-md p-2 mb-1">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-orange-500 flex items-center gap-1"><Truck size={12} /> Shipping</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                            {ratePerSack > 0 && (
                              <div className="flex justify-between">
                                <span>Sack fee: ⌈{distance}/{baseKm}⌉ × ₱{ratePerSack} × {totalSacks} sacks</span>
                                <span className="text-gray-700 dark:text-gray-200">₱{sackFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {ratePerKm > 0 && (
                              <div className="flex justify-between">
                                <span>Distance fee: ₱{ratePerKm}/km × {distance} km</span>
                                <span className="text-gray-700 dark:text-gray-200">₱{kmFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <p className="text-[9px] text-gray-400 mt-0.5">Distance: {distanceKm} km from warehouse</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <span className="font-bold text-gray-800 dark:text-gray-100">Total Due</span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₱{total.toLocaleString()}</span>
                  </div>
                </div>

                {paymentMethod === 'cash' ? (
                  <>
                    {/* Cash Tendered Input */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Cash Tendered</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₱</span>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 text-lg font-bold border-2 border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].filter((v, i, a) => a.indexOf(v) === i).map(amount => (
                        <button
                          key={amount}
                          onClick={() => setCashTendered(String(amount))}
                          className="py-2 rounded-lg text-xs font-semibold border-2 border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 transition-all dark:text-gray-200"
                        >
                          ₱{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    {/* Change Display */}
                    {cashTendered && (
                      <div className={`rounded-lg p-3 text-center ${parseFloat(cashTendered) >= total ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700'}`}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: parseFloat(cashTendered) >= total ? '#16a34a' : '#dc2626' }}>
                          {parseFloat(cashTendered) >= total ? 'Change' : 'Insufficient'}
                        </p>
                        <p className={`text-2xl font-bold ${parseFloat(cashTendered) >= total ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ₱{Math.abs((parseFloat(cashTendered) || 0) - total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </>
                ) : paymentMethod === 'gcash' ? (
                  <>
                    {/* GCash Reference */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">GCash Reference Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={gcashReference}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d\s]/g, '').slice(0, 15);
                          setGcashReference(val);
                          setGcashRefError('');
                          checkGcashReference(val);
                        }}
                        placeholder="Enter 13-digit reference number"
                        className={`w-full px-4 py-3 text-lg font-bold border-2 rounded-lg focus:outline-none focus:ring-2 tracking-wider bg-white dark:bg-gray-700 dark:text-gray-100 ${
                          gcashRefError
                            ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                            : gcashReference.replace(/\s/g, '').length > 0 && gcashReference.replace(/\s/g, '').length !== 13
                              ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                              : gcashReference.replace(/\s/g, '').length === 13 && !gcashRefError
                                ? 'border-green-400 focus:ring-green-500 focus:border-green-500'
                                : 'border-primary-200 dark:border-primary-700 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        autoFocus
                      />
                      {gcashRefError && (
                        <p className="mt-1 text-xs text-red-500">{gcashRefError}</p>
                      )}
                      {!gcashRefError && gcashReference.replace(/\s/g, '').length > 0 && gcashReference.replace(/\s/g, '').length !== 13 && (
                        <p className="mt-1 text-xs text-red-500">Reference number must be exactly 13 digits (currently {gcashReference.replace(/\s/g, '').length}).</p>
                      )}
                    </div>

                    {/* Payment Proof Upload */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                        Payment Proof <span className="text-red-500">*</span>
                      </label>

                      {/* Camera View */}
                      {showCamera && (
                        <div className="relative mb-3 rounded-lg overflow-hidden border-2 border-blue-300 dark:border-blue-700">
                          <video ref={cameraVideoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                            <button onClick={capturePhoto} className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-blue-600 flex items-center gap-1.5">
                              <Camera size={14} /> Capture
                            </button>
                            <button onClick={stopCamera} className="px-4 py-2 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-700 flex items-center gap-1.5">
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Proof Previews */}
                      {gcashProofPreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {gcashProofPreviews.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <img src={url} alt={`Proof ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-700" />
                              <button
                                onClick={() => removeGcashProof(idx)}
                                className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload + Camera Buttons */}
                      {!showCamera && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => gcashProofInputRef.current?.click()}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${
                              gcashProofFiles.length === 0
                                ? 'border-red-300 dark:border-red-600 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400'
                                : 'border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400'
                            }`}
                          >
                            <ImageIcon size={14} /> Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={startCamera}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold transition-all ${
                              gcashProofFiles.length === 0
                                ? 'border-red-300 dark:border-red-600 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400'
                                : 'border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400'
                            }`}
                          >
                            <Camera size={14} /> Open Camera
                          </button>
                          <input
                            ref={gcashProofInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleGcashProofUpload}
                            className="hidden"
                          />
                        </div>
                      )}
                      {gcashProofFiles.length === 0 && (
                        <p className="mt-1 text-xs text-red-500">Payment proof is required.</p>
                      )}
                    </div>

                    {/* GCash Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wide">Payment Verification</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Enter the exact 13-digit GCash reference number and upload a screenshot or capture the payment confirmation as proof.</p>
                    </div>
                  </>
                ) : paymentMethod === 'pay_later' ? (
                  <>
                    {/* Pay Later Info */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4 text-center">
                      <Clock size={32} className="mx-auto mb-2 text-purple-500" />
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-1">Pay Later</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">The order will be placed with payment pending. Client can pay at a later time.</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* COD Info */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg p-4 text-center">
                      <Banknote size={32} className="mx-auto mb-2 text-amber-500" />
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">Cash on Delivery</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Payment will be collected upon delivery. The order will be placed as pending.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100 dark:border-primary-800">
                <button
                  onClick={() => { setShowPaymentModal(false); setShowClientModal(true); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
                >
                  ← Back
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={saving || (paymentMethod === 'cash' ? (!cashTendered || parseFloat(cashTendered) < total) : paymentMethod === 'gcash' ? (gcashReference.replace(/\s/g, '').length !== 13 || gcashProofFiles.length === 0 || !!gcashRefError) : false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    paymentMethod === 'cash' ? 'bg-green-500 hover:bg-green-600' : paymentMethod === 'gcash' ? 'bg-blue-500 hover:bg-blue-600' : paymentMethod === 'pay_later' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  <Receipt size={14} /> {saving ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Void Transaction Modal */}
      {showVoidModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowVoidModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border-2 border-primary-200 dark:border-primary-700">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-red-500 to-red-600 text-white shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <XCircle size={20} />
                  Void Transaction
                </h3>
                <p className="text-sm text-white/80 mt-1">Select a completed transaction to void and process refund</p>
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                {/* Search */}
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transaction ID or time..."
                    value={voidSearch}
                    onChange={(e) => setVoidSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                {/* Transactions List */}
                <div className="space-y-2 mb-4">
                  {filteredVoidTxns.map(txn => {
                    const isVoided = txn.status === 'voided';
                    const isSelected = selectedVoidTxn?.id === txn.id;
                    return (
                      <div
                        key={txn.id}
                        onClick={() => !isVoided && setSelectedVoidTxn(isSelected ? null : txn)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isVoided
                            ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-primary-200 dark:border-primary-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/20 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{txn.id}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock size={11} className="text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{txn.time}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{txn.items} items</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{txn.payment}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary-600 dark:text-primary-400">₱{txn.total.toLocaleString()}</p>
                            {isVoided && (
                              <span className="text-[10px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">VOIDED</span>
                            )}
                          </div>
                        </div>
                        {/* Expanded items list when selected */}
                        {isSelected && txn.itemsList && txn.itemsList.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1.5">Ordered Items</p>
                            <div className="space-y-1">
                              {txn.itemsList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 dark:text-gray-200 font-medium">{item.product_name || item.name}</span>
                                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <span>×{item.quantity}</span>
                                    <span className="font-semibold text-primary-600 dark:text-primary-400">₱{(item.unit_price || item.price || 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Void Reason */}
                {selectedVoidTxn && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2 uppercase tracking-wide">Reason for Void</p>
                    <textarea
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Enter reason for voiding this transaction..."
                      className="w-full px-3 py-2 text-sm border-2 border-red-200 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white dark:bg-gray-700 dark:text-gray-100"
                      rows={2}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-red-600 dark:text-red-400">
                      <span>Refund amount:</span>
                      <span className="font-bold text-base">₱{selectedVoidTxn.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Password Confirmation - required for all roles */}
                {selectedVoidTxn && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock size={12} />
                      {isAdminOrAbove() ? 'Confirm Your Password' : 'Admin / Super Admin Password Required'}
                    </p>
                    <input
                      type="password"
                      value={voidPassword}
                      onChange={(e) => setVoidPassword(e.target.value)}
                      placeholder={isAdminOrAbove() ? 'Enter your password to confirm...' : 'Enter admin or super admin password...'}
                      className="w-full px-3 py-2 text-sm border-2 border-amber-200 dark:border-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 italic">
                      {isAdminOrAbove() ? 'Enter your password to authorize this void.' : 'Authorization from Admin or Super Admin is required to void transactions.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100 dark:border-primary-800">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVoid}
                  disabled={!selectedVoidTxn || !voidReason.trim() || !voidPassword.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <RotateCcw size={14} /> Confirm Void & Refund
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sale Complete Modal */}
      {showSaleCompleteModal && lastSale && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowSaleCompleteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-primary-200 dark:border-primary-700 animate-in fade-in zoom-in">
              {/* Success Header */}
              <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold">Order Placed!</h3>
                <p className="text-sm text-white/80 mt-1">{lastSale.transactionId}</p>
              </div>

              {/* Receipt Details */}
              <div className="p-5">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Time</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{lastSale.time}</span>
                  </div>
                  {lastSale.clientName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Client</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{lastSale.clientName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Items</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{lastSale.totalItems} items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Payment</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{lastSale.paymentMethod}</span>
                  </div>
                  {lastSale.paymentMethod === 'CASH' && lastSale.cashTendered && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Cash Tendered</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">₱{lastSale.cashTendered.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Change</span>
                        <span className="font-bold text-green-600 dark:text-green-400">₱{lastSale.change.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {lastSale.paymentMethod === 'GCASH' && lastSale.gcashReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">GCash Ref</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100 tracking-wide">{lastSale.gcashReference}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary-100 dark:border-primary-800 pt-2 mt-2">
                    {lastSale.forDelivery && lastSale.deliveryFee > 0 && (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="font-medium text-gray-800 dark:text-gray-100">₱{lastSale.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-orange-500 flex items-center gap-1"><Truck size={12} /> Shipping</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">₱{lastSale.deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-800 dark:text-gray-100">Total</span>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">₱{lastSale.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Items Ordered</p>
                  {lastSale.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-600 dark:text-gray-300">{item.name}{item.weight_formatted ? ` (${item.weight_formatted})` : ''} ×{item.quantity}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowSaleCompleteModal(false)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-button-500 hover:bg-button-600 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PointOfSale;
