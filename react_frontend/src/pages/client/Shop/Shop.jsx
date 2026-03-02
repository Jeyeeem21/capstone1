import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Star, Plus, Minus, Package,
  ShoppingCart, X, ChevronUp, ChevronDown, Grid, List,
  CreditCard, Wallet, Building2, Trash2, DollarSign, Smartphone, Receipt, XCircle, CheckCircle
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Products — will connect to real API
const mockProducts = [];

const varieties = ['All', 'Premium', 'Standard', 'Specialty'];
const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: DollarSign },
    { value: 'gcash', label: 'GCash', icon: Smartphone },
  ];

const Shop = () => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [quantities, setQuantities] = useState({});
  const [currentOrder, setCurrentOrder] = useState([]);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = mockProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVariety = selectedVariety === 'All' || p.variety === selectedVariety;
      return matchesSearch && matchesVariety;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'rating': return b.rating - a.rating;
        case 'newest': return b.id - a.id;
        default: return b.reviewsCount - a.reviewsCount;
      }
    });

    return result;
  }, [searchTerm, selectedVariety, sortBy]);

  const getQty = (productId) => quantities[productId] ?? 1;

  const setQty = (productId, val, maxStock) => {
    if (val === '' || val === undefined) {
      setQuantities(prev => ({ ...prev, [productId]: '' }));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setQuantities(prev => ({ ...prev, [productId]: '' }));
      return;
    }
    setQuantities(prev => ({ ...prev, [productId]: Math.min(Math.max(0, num), maxStock) }));
  };

  const handleQtyBlur = (productId) => {
    const val = quantities[productId];
    if (val === '' || val === undefined || val < 1) {
      setQuantities(prev => ({ ...prev, [productId]: 1 }));
    }
  };

  // Current Order management (POS-style)
  const addToOrder = (product) => {
    const qty = getQty(product.id) || 1;
    setCurrentOrder(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(existing.quantity + qty, product.stocks) }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, unit: product.unit, image: product.image, stocks: product.stocks, quantity: qty }];
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const removeFromOrder = (id) => setCurrentOrder(prev => prev.filter(item => item.id !== id));

  const updateOrderItemQty = (id, val) => {
    if (val === '' || val === undefined) {
      setCurrentOrder(prev => prev.map(i => i.id === id ? { ...i, quantity: '' } : i));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setCurrentOrder(prev => prev.map(i => i.id === id ? { ...i, quantity: '' } : i));
      return;
    }
    setCurrentOrder(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: Math.min(Math.max(0, num), i.stocks) } : i
    ));
  };

  const handleOrderItemBlur = (id) => {
    const item = currentOrder.find(i => i.id === id);
    if (!item || item.quantity === '' || item.quantity === undefined || item.quantity < 1) {
      setCurrentOrder(prev => prev.map(i => i.id === id ? { ...i, quantity: 1 } : i));
    }
  };

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [lastOrder, setLastOrder] = useState(null);

  const clearOrder = () => setCurrentOrder([]);
  const orderTotal = currentOrder.reduce((sum, item) => sum + item.price * (parseInt(item.quantity) || 0), 0);

  const handlePlaceOrder = () => {
    if (currentOrder.length === 0) return;
    setCashTendered('');
    setGcashReference('');
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < orderTotal) return;
    } else if (paymentMethod === 'gcash') {
      if (!gcashReference.trim()) return;
    }
    
    const method = paymentMethods.find(m => m.value === paymentMethod);
    setLastOrder({
      items: [...currentOrder],
      total: orderTotal,
      itemCount: currentOrder.length,
      paymentMethod: method?.label || 'N/A',
      orderId: `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      cashTendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : null,
      change: paymentMethod === 'cash' ? parseFloat(cashTendered) - orderTotal : null,
      gcashReference: paymentMethod === 'gcash' ? gcashReference : null,
    });
    setShowPaymentModal(false);
    setShowOrderModal(true);
    clearOrder();
    setMobileOrderOpen(false);
  };

  // Render a product card inline (NOT a separate component, avoids re-mount & focus loss)
  const renderProductCard = (product) => {
    const qty = getQty(product.id);
    return (
      <div key={product.id} className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-all"
        style={{ border: `1px solid ${theme.border_color}` }}>
        <div className="relative">
          <img src={product.image} alt={product.name} className="w-full h-36 object-cover" />
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">Out of Stock</span>
            </div>
          )}
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full text-white"
            style={{ backgroundColor: product.varietyColor }}>{product.variety}</span>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate" style={{ color: theme.text_primary }}>{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs" style={{ color: theme.text_secondary }}>{product.rating} ({product.reviewsCount})</span>
            {product.inStock && <span className="text-xs ml-auto" style={{ color: theme.text_secondary }}>{product.stocks} in stock</span>}
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold" style={{ color: theme.button_primary }}>₱{product.price.toLocaleString()}</span>
            <span className="text-xs ml-1" style={{ color: theme.text_secondary }}>/ {product.unit}</span>
          </div>
          {product.inStock && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center rounded-lg" style={{ border: `1px solid ${theme.border_color}` }}>
                <button onClick={() => setQty(product.id, Math.max(1, (parseInt(qty) || 1) - 1), product.stocks)} className="p-1.5 hover:bg-gray-100 rounded-l-lg" disabled={qty <= 1}>
                  <Minus size={14} style={{ color: qty <= 1 ? '#d1d5db' : theme.text_primary }} />
                </button>
                <input type="number" value={qty}
                  onChange={(e) => setQty(product.id, e.target.value, product.stocks)}
                  onBlur={() => handleQtyBlur(product.id)}
                  className="w-12 text-center text-sm font-semibold border-x py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: theme.border_color, color: theme.text_primary, backgroundColor: 'transparent' }} min={1} max={product.stocks} />
                <button onClick={() => setQty(product.id, Math.min((parseInt(qty) || 1) + 1, product.stocks), product.stocks)} className="p-1.5 hover:bg-gray-100 rounded-r-lg" disabled={(parseInt(qty) || 1) >= product.stocks}>
                  <Plus size={14} style={{ color: (parseInt(qty) || 1) >= product.stocks ? '#d1d5db' : theme.text_primary }} />
                </button>
              </div>
              <button onClick={() => addToOrder(product)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.button_primary }}>
                <Plus size={14} /> Add
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render product list item inline
  const renderProductListItem = (product) => {
    const qty = getQty(product.id);
    return (
      <div key={product.id} className="bg-white rounded-xl p-3 flex gap-3 hover:shadow-md transition-all"
        style={{ border: `1px solid ${theme.border_color}` }}>
        <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate" style={{ color: theme.text_primary }}>{product.name}</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white flex-shrink-0" style={{ backgroundColor: product.varietyColor }}>{product.variety}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Star size={11} className="fill-yellow-400 text-yellow-400" />
                <span className="text-xs" style={{ color: theme.text_secondary }}>{product.rating}</span>
                {product.inStock ? <span className="text-xs text-green-600">{product.stocks} in stock</span> : <span className="text-xs text-red-500">Out of Stock</span>}
              </div>
            </div>
            <span className="text-base font-bold flex-shrink-0" style={{ color: theme.button_primary }}>₱{product.price.toLocaleString()}</span>
          </div>
          {product.inStock && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center rounded-lg" style={{ border: `1px solid ${theme.border_color}` }}>
                <button onClick={() => setQty(product.id, Math.max(1, (parseInt(qty) || 1) - 1), product.stocks)} className="p-1 hover:bg-gray-100 rounded-l-lg" disabled={qty <= 1}>
                  <Minus size={12} />
                </button>
                <input type="number" value={qty}
                  onChange={(e) => setQty(product.id, e.target.value, product.stocks)}
                  onBlur={() => handleQtyBlur(product.id)}
                  className="w-10 text-center text-xs font-semibold border-x py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: theme.border_color, color: theme.text_primary, backgroundColor: 'transparent' }} min={1} max={product.stocks} />
                <button onClick={() => setQty(product.id, Math.min((parseInt(qty) || 1) + 1, product.stocks), product.stocks)} className="p-1 hover:bg-gray-100 rounded-r-lg" disabled={(parseInt(qty) || 1) >= product.stocks}>
                  <Plus size={12} />
                </button>
              </div>
              <button onClick={() => addToOrder(product)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.button_primary }}>
                <Plus size={12} /> Add
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Order Panel (POS-style matching admin design)
  const renderOrderPanel = () => (
    <div className="bg-white rounded-xl overflow-hidden flex flex-col h-full" style={{ border: `2px solid ${theme.border_color}` }}>
      {/* Gradient Header - matching admin POS */}
      <div className="p-4 text-white shrink-0" style={{ background: `linear-gradient(to right, ${theme.button_primary}, ${theme.button_primary}dd)` }}>
        <h3 className="font-bold text-base flex items-center gap-2">
          <ShoppingCart size={18} />
          Current Order
          {currentOrder.length > 0 && (
            <span className="ml-auto bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
              {currentOrder.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} items
            </span>
          )}
        </h3>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        {/* Cart Items - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4">
          {currentOrder.length === 0 ? (
            <div className="text-center py-8 flex flex-col items-center justify-center h-full">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" style={{ color: theme.text_secondary }} />
              <p className="text-sm font-medium" style={{ color: theme.text_secondary }}>Cart is empty</p>
              <p className="text-xs" style={{ color: theme.text_secondary }}>Add products to start your order</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentOrder.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ backgroundColor: `${theme.button_primary}08`, border: `1px solid ${theme.border_color}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate" style={{ color: theme.text_primary }}>{item.name}</p>
                    <p className="text-xs font-medium" style={{ color: theme.button_primary }}>₱{item.price.toLocaleString()} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateOrderItemQty(item.id, Math.max(1, (parseInt(item.quantity) || 1) - 1))}
                      className="p-1 rounded hover:bg-gray-100" style={{ border: `1px solid ${theme.border_color}` }}>
                      <Minus size={12} style={{ color: theme.text_primary }} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold" style={{ color: theme.text_primary }}>{item.quantity}</span>
                    <button onClick={() => updateOrderItemQty(item.id, Math.min((parseInt(item.quantity) || 1) + 1, item.stocks))}
                      className="p-1 rounded hover:bg-gray-100" style={{ border: `1px solid ${theme.border_color}` }}>
                      <Plus size={12} style={{ color: theme.text_primary }} />
                    </button>
                    <button onClick={() => removeFromOrder(item.id)}
                      className="p-1 rounded ml-1 text-red-400 hover:text-red-500 hover:bg-red-50"
                      style={{ border: `1px solid ${theme.border_color}` }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method - always visible */}
        <div className="mb-4 shrink-0" style={{ borderTop: `2px solid ${theme.border_color}`, paddingTop: '16px' }}>
          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: theme.text_primary }}>Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map(method => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.value;
              return (
                <button key={method.value} onClick={() => setPaymentMethod(method.value)}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg transition-all font-semibold text-sm"
                  style={isSelected
                    ? { backgroundColor: `${theme.button_primary}10`, border: `2px solid ${theme.button_primary}`, color: theme.button_primary }
                    : { border: `1px solid ${theme.border_color}`, color: theme.text_secondary }
                  }>
                  <Icon size={18} />
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Section - always visible */}
        <div className="shrink-0" style={{ borderTop: `2px solid ${theme.border_color}`, paddingTop: '16px' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium" style={{ color: theme.text_secondary }}>Subtotal</span>
            <span className="text-sm font-semibold" style={{ color: theme.text_primary }}>₱{orderTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: `2px solid ${theme.border_color}` }}>
            <span className="font-bold" style={{ color: theme.text_primary }}>Total</span>
            <span className="text-xl font-bold" style={{ color: theme.button_primary }}>₱{orderTotal.toLocaleString()}</span>
          </div>

          {/* Proceed to Payment only (no void transaction for client) */}
          <button onClick={handlePlaceOrder}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.button_primary }}
            disabled={currentOrder.length === 0}>
            <Receipt size={16} /> Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Top bar: Header + Filters (fixed, no scroll) */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: theme.text_primary }}>Shop Products</h1>
            <p className="text-xs" style={{ color: theme.text_secondary }}>Browse our selection of premium quality rice products</p>
          </div>
          <p className="text-xs hidden sm:block" style={{ color: theme.text_secondary }}>
            <strong style={{ color: theme.text_primary }}>{filteredProducts.length}</strong> product(s)
          </p>
        </div>
        <div className="bg-white rounded-xl p-3" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.text_secondary }} />
              <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
                style={{ border: `1.5px solid ${theme.border_color}`, color: theme.text_primary }}
                onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                onBlur={(e) => e.target.style.borderColor = theme.border_color} />
            </div>
            <div className="flex items-center gap-2">
              <select value={selectedVariety} onChange={(e) => setSelectedVariety(e.target.value)}
                className="px-2.5 py-2 text-sm rounded-lg focus:outline-none appearance-none bg-white pr-7 cursor-pointer"
                style={{ border: `1.5px solid ${theme.border_color}`, color: theme.text_primary }}>
                {varieties.map(v => <option key={v} value={v}>{v === 'All' ? 'All Varieties' : v}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-2 text-sm rounded-lg focus:outline-none appearance-none bg-white pr-7 cursor-pointer"
                style={{ border: `1.5px solid ${theme.border_color}`, color: theme.text_primary }}>
                {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1.5px solid ${theme.border_color}` }}>
                <button onClick={() => setViewMode('grid')} className="p-1.5 transition-colors"
                  style={{ backgroundColor: viewMode === 'grid' ? theme.button_primary : 'transparent', color: viewMode === 'grid' ? '#fff' : theme.text_secondary }}>
                  <Grid size={14} />
                </button>
                <button onClick={() => setViewMode('list')} className="p-1.5 transition-colors"
                  style={{ backgroundColor: viewMode === 'list' ? theme.button_primary : 'transparent', color: viewMode === 'list' ? '#fff' : theme.text_secondary }}>
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main: Products (scrollable) + Order Panel (fixed) */}
      <div className="flex-1 flex gap-4 px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
        {/* Products - scrollable */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border_color}` }}>
                  <Skeleton variant="image" className="h-40 w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton variant="title" width="w-3/4" />
                    <Skeleton variant="text" width="w-1/2" />
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => <Skeleton key={j} variant="circle" width="w-3" height="h-3" />)}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Skeleton variant="title" width="w-16" />
                      <Skeleton variant="button" width="w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl" style={{ border: `1px solid ${theme.border_color}` }}>
              <Package size={48} className="mx-auto mb-4" style={{ color: theme.text_secondary }} />
              <h3 className="text-lg font-semibold" style={{ color: theme.text_primary }}>No products found</h3>
              <p className="text-sm mt-1" style={{ color: theme.text_secondary }}>Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => renderProductCard(product))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredProducts.map(product => renderProductListItem(product))}
            </div>
          )}
        </div>

        {/* Order Panel (desktop/tablet) - fixed, fills height */}
        <div className="hidden md:flex md:flex-col w-80 xl:w-96 shrink-0">
          {renderOrderPanel()}
        </div>
      </div>

      {/* Mobile Order Floating Bar (below md) */}
      <div className="md:hidden">
        {currentOrder.length > 0 && (
          <>
            {mobileOrderOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOrderOpen(false)} />}
            <div className="fixed bottom-16 left-0 right-0 z-50">
              {mobileOrderOpen && (
                <div className="bg-white max-h-[65vh] overflow-y-auto rounded-t-2xl shadow-2xl">
                  {renderOrderPanel()}
                </div>
              )}
              <button onClick={() => setMobileOrderOpen(!mobileOrderOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-white"
                style={{ backgroundColor: theme.button_primary }}>
                <span className="font-medium text-sm">{currentOrder.length} item(s) · ₱{orderTotal.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {mobileOrderOpen ? 'Close' : 'View Order'} {mobileOrderOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Payment Modal - Cash / GCash */}
      {showPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowPaymentModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              style={{ border: `2px solid ${theme.border_color}` }}>
              {/* Header */}
              <div className="p-5 text-white shrink-0"
                style={{ background: paymentMethod === 'cash' 
                  ? 'linear-gradient(135deg, #22c55e, #059669)' 
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                }}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {paymentMethod === 'cash' ? <DollarSign size={20} /> : <Smartphone size={20} />}
                  {paymentMethod === 'cash' ? 'Cash Payment' : 'GCash Payment'}
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  {paymentMethod === 'cash' ? 'Enter amount tendered' : 'Enter GCash reference number'}
                </p>
              </div>

              <div className="p-5">
                {/* Order Summary */}
                <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: `${theme.border_color}08` }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: theme.text_secondary }}>Items</span>
                    <span className="font-medium" style={{ color: theme.text_primary }}>{currentOrder.length} items</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${theme.border_color}20` }}>
                    <span className="font-bold" style={{ color: theme.text_primary }}>Total Due</span>
                    <span className="text-xl font-bold" style={{ color: theme.button_primary }}>₱{orderTotal.toLocaleString()}</span>
                  </div>
                </div>

                {paymentMethod === 'cash' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: theme.text_primary }}>Cash Tendered</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color: theme.text_secondary }}>₱</span>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 text-lg font-bold rounded-lg focus:outline-none focus:ring-2"
                          style={{ border: `2px solid ${theme.border_color}`, '--tw-ring-color': '#22c55e' }}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[orderTotal, Math.ceil(orderTotal / 100) * 100, Math.ceil(orderTotal / 500) * 500, Math.ceil(orderTotal / 1000) * 1000].filter((v, i, a) => a.indexOf(v) === i).map(amount => (
                        <button
                          key={amount}
                          onClick={() => setCashTendered(String(amount))}
                          className="py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-all"
                          style={{ border: `2px solid ${theme.border_color}`, color: theme.text_primary }}
                        >
                          ₱{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    {cashTendered && (
                      <div className={`rounded-lg p-3 text-center ${parseFloat(cashTendered) >= orderTotal ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: parseFloat(cashTendered) >= orderTotal ? '#16a34a' : '#dc2626' }}>
                          {parseFloat(cashTendered) >= orderTotal ? 'Change' : 'Insufficient'}
                        </p>
                        <p className={`text-2xl font-bold ${parseFloat(cashTendered) >= orderTotal ? 'text-green-600' : 'text-red-600'}`}>
                          ₱{Math.abs((parseFloat(cashTendered) || 0) - orderTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: theme.text_primary }}>GCash Reference Number</label>
                      <input
                        type="text"
                        value={gcashReference}
                        onChange={(e) => setGcashReference(e.target.value)}
                        placeholder="e.g. 1234 5678 9012"
                        className="w-full px-4 py-3 text-lg font-bold rounded-lg focus:outline-none focus:ring-2 tracking-wider"
                        style={{ border: `2px solid ${theme.border_color}`, '--tw-ring-color': '#3b82f6' }}
                        autoFocus
                      />
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">Payment Verification</p>
                      <p className="text-xs text-blue-600">Enter the GCash reference number from the payment confirmation as proof of payment.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 flex gap-3 shrink-0" style={{ borderTop: `2px solid ${theme.border_color}20` }}>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                  style={{ border: `2px solid ${theme.border_color}`, color: theme.text_secondary }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={paymentMethod === 'cash' ? (!cashTendered || parseFloat(cashTendered) < orderTotal) : !gcashReference.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ backgroundColor: paymentMethod === 'cash' ? '#22c55e' : '#3b82f6' }}
                >
                  <Receipt size={14} /> Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Order Placed Success Modal */}
      {showOrderModal && lastOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowOrderModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ border: `2px solid ${theme.border_color}` }}>
              {/* Success Header */}
              <div className="p-6 text-white text-center"
                style={{ background: `linear-gradient(135deg, ${theme.button_primary}, ${theme.border_color})` }}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold">Order Placed!</h3>
                <p className="text-sm text-white/80 mt-1">{lastOrder.orderId}</p>
              </div>

              {/* Order Details */}
              <div className="p-5">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: theme.text_secondary }}>Items</span>
                    <span className="font-medium" style={{ color: theme.text_primary }}>{lastOrder.itemCount} item(s)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: theme.text_secondary }}>Payment</span>
                    <span className="font-medium" style={{ color: theme.text_primary }}>{lastOrder.paymentMethod}</span>
                  </div>
                  {lastOrder.cashTendered && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text_secondary }}>Cash Tendered</span>
                        <span className="font-medium" style={{ color: theme.text_primary }}>₱{lastOrder.cashTendered.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text_secondary }}>Change</span>
                        <span className="font-bold text-green-600">₱{lastOrder.change.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {lastOrder.gcashReference && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: theme.text_secondary }}>GCash Ref</span>
                      <span className="font-medium tracking-wide" style={{ color: theme.text_primary }}>{lastOrder.gcashReference}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2" style={{ borderTop: `2px solid ${theme.border_color}20` }}>
                    <div className="flex justify-between">
                      <span className="font-bold" style={{ color: theme.text_primary }}>Total</span>
                      <span className="text-xl font-bold" style={{ color: theme.button_primary }}>₱{lastOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="rounded-lg p-3 mb-4 max-h-32 overflow-y-auto" style={{ backgroundColor: `${theme.border_color}08` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: theme.text_secondary }}>Items Ordered</p>
                  {lastOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span style={{ color: theme.text_secondary }}>{item.name} ×{item.quantity}</span>
                      <span className="font-medium" style={{ color: theme.text_primary }}>₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowOrderModal(false)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.button_primary }}
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

export default Shop;
