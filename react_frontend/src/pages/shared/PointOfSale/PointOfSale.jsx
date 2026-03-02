import { Monitor, Search, Plus, Minus, ShoppingCart, Trash2, DollarSign, Receipt, Package, Smartphone, XCircle, Tag, Clock, RotateCcw, CheckCircle, ChevronUp, ChevronDown, Banknote, PlusCircle, Check, AlertCircle, User, Phone, Mail, Lock } from 'lucide-react';
import { useState, useMemo, memo, useCallback } from 'react';
import { PageHeader } from '../../../components/common';
import { Button, StatsCard, useToast } from '../../../components/ui';
import { useDataFetch, invalidateCache } from '../../../hooks/useDataFetch';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../context/AuthContext';

// Customer combobox component - select existing or add new (requires name + contact or email)
const CustomerCombobox = memo(({ value, newName, newContact, newEmail, onChange, onInputChange, onContactChange, onEmailChange, customerOptions, error }) => {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
        <User size={14} className="text-gray-400" />
        Customer <span className="text-red-500">*</span>
      </label>
      
      {/* Dropdown for existing customers */}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`w-full px-3 py-2.5 text-sm border-2 rounded-lg transition-all appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
              : value && !newName
                ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20'
                : 'border-primary-200 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        >
          {customerOptions.map(opt => (
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

      {/* Input for new customer name */}
      <div className="relative">
        <input
          type="text"
          value={newName}
          onChange={onInputChange}
          placeholder="Type new customer name..."
          className={`w-full px-3 py-2.5 pl-8 text-sm border-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
            newName 
              ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20' 
              : 'border-primary-200 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        />
        <PlusCircle size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${newName ? 'text-green-600' : 'text-gray-400'}`} />
        {newName && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Check size={14} className="text-green-500" />
          </div>
        )}
      </div>

      {/* Contact & Email fields - shown when adding new customer */}
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
                  ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20'
                  : 'border-primary-200 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
              }`}
            />
            <Phone size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${newContact ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="relative">
            <input
              type="email"
              value={newEmail}
              onChange={onEmailChange}
              placeholder="Email address (optional if contact provided)"
              className={`w-full px-3 py-2 pl-8 text-sm border-2 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                newEmail
                  ? 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20'
                  : 'border-primary-200 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
              }`}
            />
            <Mail size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${newEmail ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <p className="text-[10px] text-gray-400 italic">Provide at least a contact number or email.</p>
        </div>
      )}

      {/* Info when new customer is valid */}
      {newName && (newContact || newEmail) && (
        <div className="flex items-start gap-1.5 p-1.5 mt-1.5 bg-green-50 border border-green-200 rounded-lg">
          <AlertCircle size={12} className="text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-green-700">
            New customer "<strong>{newName}</strong>" will be created.
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

CustomerCombobox.displayName = 'CustomerCombobox';

const PointOfSale = () => {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSaleCompleteModal, setShowSaleCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [voidSearch, setVoidSearch] = useState('');
  const [selectedVoidTxn, setSelectedVoidTxn] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidPassword, setVoidPassword] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [customerError, setCustomerError] = useState('');

  // Fetch real data from API
  const { data: productsRaw, refetch: refetchProducts } = useDataFetch('/products');
  const { data: salesRaw, refetch: refetchSales } = useDataFetch('/sales');
  const { data: varietiesRaw } = useDataFetch('/varieties');
  const { data: customersRaw, refetch: refetchCustomers } = useDataFetch('/customers');

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
      })),
    [productsRaw]
  );

  const varieties = useMemo(() =>
    (varietiesRaw || []).map(c => c.name).filter(Boolean),
    [varietiesRaw]
  );

  // Customer options for combobox
  const customerOptions = useMemo(() => {
    const opts = (customersRaw || [])
      .filter(c => c.status === 'Active')
      .map(c => ({ value: String(c.id), label: c.name }));
    return [{ value: '', label: 'Select a customer...' }, ...opts];
  }, [customersRaw]);

  // Check if selected existing customer has contact or email
  const selectedCustomerHasContactInfo = useMemo(() => {
    if (!selectedCustomerId) return false;
    const customer = (customersRaw || []).find(c => String(c.id) === selectedCustomerId);
    if (!customer) return false;
    return !!(customer.contact || customer.phone || customer.email);
  }, [selectedCustomerId, customersRaw]);

  const handleCustomerSelect = useCallback((e) => {
    setSelectedCustomerId(e.target.value);
    if (e.target.value) {
      setNewCustomerName('');
      setNewCustomerContact('');
      setNewCustomerEmail('');
    }
    setCustomerError('');
  }, []);

  const handleNewCustomerInput = useCallback((e) => {
    const val = e.target.value;
    setNewCustomerName(val);
    setCustomerError('');
    if (val) {
      // Check if typed name matches existing customer
      const match = (customersRaw || []).find(c => c.name.toLowerCase() === val.toLowerCase());
      if (match) {
        setSelectedCustomerId(String(match.id));
        setNewCustomerName('');
        setNewCustomerContact('');
        setNewCustomerEmail('');
        return;
      }
      setSelectedCustomerId('');
    }
  }, [customersRaw]);

  const handleNewCustomerContact = useCallback((e) => {
    setNewCustomerContact(e.target.value);
    setCustomerError('');
  }, []);

  const handleNewCustomerEmail = useCallback((e) => {
    setNewCustomerEmail(e.target.value);
    setCustomerError('');
  }, []);

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
    if (!selectedVoidTxn || !voidReason.trim() || saving) return;
    // Non-super admin must provide super admin password
    if (!isSuperAdmin() && !voidPassword.trim()) return;
    setSaving(true);
    try {
      const payload = { reason: voidReason };
      if (!isSuperAdmin()) {
        payload.admin_password = voidPassword;
      }
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
    // Reset customer fields and show customer modal
    setSelectedCustomerId('');
    setNewCustomerName('');
    setNewCustomerContact('');
    setNewCustomerEmail('');
    setCustomerError('');
    setShowCustomerModal(true);
  };

  const confirmCustomer = () => {
    // Validate customer: must have name + (contact or email)
    if (!selectedCustomerId && !newCustomerName) {
      setCustomerError('Please select a customer or add a new one.');
      return;
    }

    // If existing customer selected, check they have contact info
    if (selectedCustomerId && !selectedCustomerHasContactInfo) {
      setCustomerError('Selected customer has no contact or email on file. Please update their info or add a new customer.');
      return;
    }

    // If new customer, require at least contact or email
    if (newCustomerName && !newCustomerContact.trim() && !newCustomerEmail.trim()) {
      setCustomerError('Provide at least a contact number or email for the new customer.');
      return;
    }

    setCustomerError('');
    setShowCustomerModal(false);
    setCashTendered('');
    setGcashReference('');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (saving) return;
    
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < total) return;
    } else if (paymentMethod === 'gcash') {
      if (!gcashReference.trim()) return;
    }
    // COD and Pay Later require no additional fields

    setSaving(true);
    try {
      const payload = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
        new_customer_name: newCustomerName || null,
        new_customer_contact: newCustomerContact || null,
        new_customer_email: newCustomerEmail || null,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : (paymentMethod === 'cod' || paymentMethod === 'pay_later' ? 0 : total),
        reference_number: paymentMethod === 'gcash' ? gcashReference : null,
      };

      const response = await apiClient.post('/sales/order', payload);
      
      if (response.success && response.data) {
        const customerName = newCustomerName || (selectedCustomerId ? customerOptions.find(o => o.value === selectedCustomerId)?.label : null);
        const saleData = {
          items: [...cart],
          total,
          totalItems,
          customerName,
          paymentMethod: paymentMethod === 'cash' ? 'CASH' : paymentMethod === 'gcash' ? 'GCASH' : paymentMethod === 'pay_later' ? 'PAY LATER' : 'COD',
          transactionId: response.data.transaction_id,
          time: response.data.date_formatted || new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }),
          cashTendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : null,
          change: paymentMethod === 'cash' ? parseFloat(cashTendered) - total : null,
          gcashReference: paymentMethod === 'gcash' ? gcashReference : null,
        };
        setLastSale(saleData);
        setShowPaymentModal(false);
        setShowSaleCompleteModal(true);
        setCart([]);
        setSelectedCustomerId('');
        setNewCustomerName('');
        setNewCustomerContact('');
        setNewCustomerEmail('');
        setCustomerError('');

        // Refresh data
        invalidateCache('/sales');
        invalidateCache('/products');
        refetchSales();
        refetchProducts();
        if (newCustomerName) {
          invalidateCache('/customers');
          refetchCustomers();
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        <div className="lg:col-span-2 flex-1 min-w-0 bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 p-4 flex flex-col overflow-hidden">
          {/* Search and Variety Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b-2 border-primary-100 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
              />
            </div>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none cursor-pointer min-w-[160px] font-medium"
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
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl border-2 border-primary-200 shadow-sm p-3 text-center cursor-pointer hover:shadow-lg hover:border-primary-400 hover:bg-primary-50/30 hover:scale-[1.02] transition-all"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl mx-auto mb-2 flex items-center justify-center border border-primary-200">
                    <Package size={20} className="text-primary-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 text-xs mb-1 line-clamp-2">{product.name}</h4>
                  <p className="text-primary-600 font-bold text-sm">₱{product.price.toLocaleString()}</p>
                  <p className={`text-[10px] mt-0.5 ${product.stock > 0 ? 'text-gray-400' : 'text-amber-500 font-medium'}`}>{product.stock > 0 ? `${product.stock} in stock` : 'No stock'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-medium bg-primary-50 text-primary-600 rounded-full border border-primary-200">
                    {product.variety}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section - fixed, fills height */}
        <div className="hidden lg:flex lg:flex-col w-80 xl:w-96 shrink-0">
          <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 overflow-hidden flex flex-col h-full">
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
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-primary-50/30 rounded-lg border-2 border-primary-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">{item.name}</p>
                          <p className="text-primary-600 text-xs font-medium">₱{item.price.toLocaleString()} × {item.quantity}</p>
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
                            className="w-10 text-center text-xs font-bold border border-primary-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              <div className="border-t-2 border-primary-200 pt-4 mb-4 shrink-0">
                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Payment Method</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all font-semibold text-xs
                      ${paymentMethod === 'cash' 
                        ? 'border-primary-500 bg-primary-50 text-primary-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                        ? 'border-amber-500 bg-amber-50 text-amber-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                        ? 'border-purple-500 bg-purple-50 text-purple-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
                      }
                    `}
                  >
                    <Clock size={16} />
                    Pay Later
                  </button>
                </div>
              </div>

              {/* Total Section - always visible */}
              <div className="border-t-2 border-primary-200 pt-4 shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500 font-medium">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-700">₱{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-primary-100">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-primary-600">₱{total.toLocaleString()}</span>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button onClick={completeSale} className="w-full" icon={Receipt} disabled={cart.length === 0}>
                    Place Order
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
                <div className="bg-white max-h-[70vh] overflow-y-auto rounded-t-2xl shadow-2xl border-t-2 border-primary-200">
                  <div className="p-4">
                    {/* Cart Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-primary-600" />
                        Current Order
                      </h3>
                      <span className="text-xs font-semibold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full border border-primary-200">
                        {totalItems} items
                      </span>
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-2 mb-4 max-h-[25vh] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-primary-50/30 rounded-lg border-2 border-primary-200">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-xs truncate">{item.name}</p>
                            <p className="text-primary-600 text-xs font-medium">₱{item.price.toLocaleString()} × {item.quantity}</p>
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
                    <div className="border-t-2 border-primary-200 pt-3 mb-3">
                      <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Payment Method</p>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setPaymentMethod('cash')}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 transition-all font-semibold text-xs
                            ${paymentMethod === 'cash' 
                              ? 'border-primary-500 bg-primary-50 text-primary-600' 
                              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                              ? 'border-blue-500 bg-blue-50 text-blue-600' 
                              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                              ? 'border-amber-500 bg-amber-50 text-amber-600' 
                              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
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
                              ? 'border-purple-500 bg-purple-50 text-purple-600' 
                              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
                            }
                          `}
                        >
                          <Clock size={14} />
                          Pay Later
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-primary-200 pt-3 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 font-medium">Subtotal</span>
                        <span className="text-sm font-semibold text-gray-700">₱{total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">Total</span>
                        <span className="text-lg font-bold text-primary-600">₱{total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button onClick={() => { setMobileCartOpen(false); completeSale(); }} className="w-full" icon={Receipt} disabled={cart.length === 0}>
                        Place Order
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

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowCustomerModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-button-500 to-button-600 text-white shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User size={20} />
                  Customer Information
                </h3>
                <p className="text-sm text-white/80 mt-1">Select an existing customer or add a new one</p>
              </div>

              <div className="p-5">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-800">{totalItems} items</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-primary-600">₱{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Customer Combobox */}
                <CustomerCombobox
                  value={selectedCustomerId}
                  newName={newCustomerName}
                  newContact={newCustomerContact}
                  newEmail={newCustomerEmail}
                  onChange={handleCustomerSelect}
                  onInputChange={handleNewCustomerInput}
                  onContactChange={handleNewCustomerContact}
                  onEmailChange={handleNewCustomerEmail}
                  customerOptions={customerOptions}
                  error={customerError}
                />
              </div>

              {/* Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCustomer}
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200">
              {/* Header */}
              <div className={`p-5 text-white shrink-0 ${paymentMethod === 'cash' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : paymentMethod === 'gcash' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : paymentMethod === 'pay_later' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {paymentMethod === 'cash' ? <DollarSign size={20} /> : paymentMethod === 'gcash' ? <Smartphone size={20} /> : paymentMethod === 'pay_later' ? <Clock size={20} /> : <Banknote size={20} />}
                  {paymentMethod === 'cash' ? 'Cash Payment' : paymentMethod === 'gcash' ? 'GCash Payment' : paymentMethod === 'pay_later' ? 'Pay Later' : 'Cash on Delivery'}
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  {paymentMethod === 'cash' ? 'Enter amount tendered by customer' : paymentMethod === 'gcash' ? 'Enter GCash reference number' : paymentMethod === 'pay_later' ? 'Order will be placed with payment pending' : 'Order will be paid upon delivery'}
                </p>
              </div>

              <div className="p-5">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-800">{totalItems} items</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                    <span className="font-bold text-gray-800">Total Due</span>
                    <span className="text-xl font-bold text-primary-600">₱{total.toLocaleString()}</span>
                  </div>
                </div>

                {paymentMethod === 'cash' ? (
                  <>
                    {/* Cash Tendered Input */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Cash Tendered</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₱</span>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 text-lg font-bold border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                          className="py-2 rounded-lg text-xs font-semibold border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-400 transition-all"
                        >
                          ₱{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    {/* Change Display */}
                    {cashTendered && (
                      <div className={`rounded-lg p-3 text-center ${parseFloat(cashTendered) >= total ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: parseFloat(cashTendered) >= total ? '#16a34a' : '#dc2626' }}>
                          {parseFloat(cashTendered) >= total ? 'Change' : 'Insufficient'}
                        </p>
                        <p className={`text-2xl font-bold ${parseFloat(cashTendered) >= total ? 'text-green-600' : 'text-red-600'}`}>
                          ₱{Math.abs((parseFloat(cashTendered) || 0) - total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </>
                ) : paymentMethod === 'gcash' ? (
                  <>
                    {/* GCash Reference */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">GCash Reference Number</label>
                      <input
                        type="text"
                        value={gcashReference}
                        onChange={(e) => setGcashReference(e.target.value)}
                        placeholder="e.g. 1234 5678 9012"
                        className="w-full px-4 py-3 text-lg font-bold border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-wider"
                        autoFocus
                      />
                    </div>

                    {/* GCash Info */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">Payment Verification</p>
                      <p className="text-xs text-blue-600">Enter the GCash reference number from the customer's payment confirmation as proof of payment.</p>
                    </div>
                  </>
                ) : paymentMethod === 'pay_later' ? (
                  <>
                    {/* Pay Later Info */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">
                      <Clock size={32} className="mx-auto mb-2 text-purple-500" />
                      <p className="text-sm font-bold text-purple-700 mb-1">Pay Later</p>
                      <p className="text-xs text-purple-600">The order will be placed with payment pending. Customer can pay at a later time.</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* COD Info */}
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center">
                      <Banknote size={32} className="mx-auto mb-2 text-amber-500" />
                      <p className="text-sm font-bold text-amber-700 mb-1">Cash on Delivery</p>
                      <p className="text-xs text-amber-600">Payment will be collected upon delivery. The order will be placed as pending.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={saving || (paymentMethod === 'cash' ? (!cashTendered || parseFloat(cashTendered) < total) : paymentMethod === 'gcash' ? !gcashReference.trim() : false)}
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border-2 border-primary-200">
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                  />
                </div>

                {/* Transactions List */}
                <div className="space-y-2 mb-4">
                  {filteredVoidTxns.map(txn => {
                    const isVoided = txn.status === 'voided';
                    const isSelected = selectedVoidTxn?.id === txn.id;
                    return (
                      <button
                        key={txn.id}
                        onClick={() => !isVoided && setSelectedVoidTxn(txn)}
                        disabled={isVoided}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isVoided
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-red-500 bg-red-50'
                              : 'border-primary-200 hover:border-primary-400 hover:bg-primary-50/30 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{txn.id}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock size={11} className="text-gray-400" />
                              <span className="text-xs text-gray-500">{txn.time}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{txn.items} items</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{txn.payment}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary-600">₱{txn.total.toLocaleString()}</p>
                            {isVoided && (
                              <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">VOIDED</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Void Reason */}
                {selectedVoidTxn && (
                  <div className="p-3 rounded-lg bg-red-50 border-2 border-red-200">
                    <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-wide">Reason for Void</p>
                    <textarea
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Enter reason for voiding this transaction..."
                      className="w-full px-3 py-2 text-sm border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      rows={2}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-red-600">
                      <span>Refund amount:</span>
                      <span className="font-bold text-base">₱{selectedVoidTxn.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Super Admin Password - required for admin/secretary */}
                {selectedVoidTxn && !isSuperAdmin() && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border-2 border-amber-200">
                    <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock size={12} />
                      Super Admin Password Required
                    </p>
                    <input
                      type="password"
                      value={voidPassword}
                      onChange={(e) => setVoidPassword(e.target.value)}
                      placeholder="Enter super admin password..."
                      className="w-full px-3 py-2 text-sm border-2 border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-amber-600 mt-1.5 italic">Authorization from Super Admin is required to void transactions.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 flex gap-3 shrink-0 border-t-2 border-primary-100">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVoid}
                  disabled={!selectedVoidTxn || !voidReason.trim() || (!isSuperAdmin() && !voidPassword.trim())}
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-primary-200 animate-in fade-in zoom-in">
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
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-800">{lastSale.time}</span>
                  </div>
                  {lastSale.customerName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-medium text-gray-800">{lastSale.customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-800">{lastSale.totalItems} items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payment</span>
                    <span className="font-medium text-gray-800">{lastSale.paymentMethod}</span>
                  </div>
                  {lastSale.paymentMethod === 'CASH' && lastSale.cashTendered && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cash Tendered</span>
                        <span className="font-medium text-gray-800">₱{lastSale.cashTendered.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Change</span>
                        <span className="font-bold text-green-600">₱{lastSale.change.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {lastSale.paymentMethod === 'GCASH' && lastSale.gcashReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GCash Ref</span>
                      <span className="font-medium text-gray-800 tracking-wide">{lastSale.gcashReference}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary-100 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-primary-600">₱{lastSale.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Items Ordered</p>
                  {lastSale.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-600">{item.name} ×{item.quantity}</span>
                      <span className="font-medium text-gray-700">₱{(item.price * item.quantity).toLocaleString()}</span>
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
