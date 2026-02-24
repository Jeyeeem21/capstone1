import { Monitor, Search, Plus, Minus, ShoppingCart, Trash2, DollarSign, Receipt, Package, Smartphone, XCircle, Tag, Clock, RotateCcw, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../../components/common';
import { Button, StatsCard, useToast } from '../../../components/ui';

const PointOfSale = () => {
  const toast = useToast();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSaleCompleteModal, setShowSaleCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [voidSearch, setVoidSearch] = useState('');
  const [selectedVoidTxn, setSelectedVoidTxn] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Mock recent transactions for void
  const [recentTransactions, setRecentTransactions] = useState([
    { id: 'ORD-20260224-001', time: '10:15 AM', items: 3, total: 2550, payment: 'Cash', status: 'completed' },
    { id: 'ORD-20260224-002', time: '10:32 AM', items: 2, total: 1300, payment: 'GCash', status: 'completed' },
    { id: 'ORD-20260224-003', time: '11:05 AM', items: 1, total: 850, payment: 'Cash', status: 'completed' },
    { id: 'ORD-20260224-004', time: '11:48 AM', items: 4, total: 3600, payment: 'Cash', status: 'completed' },
    { id: 'ORD-20260224-005', time: '12:20 PM', items: 2, total: 1700, payment: 'GCash', status: 'voided' },
    { id: 'ORD-20260224-006', time: '1:15 PM', items: 5, total: 4250, payment: 'Cash', status: 'completed' },
  ]);

  // Sample today's stats
  const todayStats = {
    totalSales: 45850,
    transactions: 24,
    itemsSold: 78,
    avgTransaction: 1910
  };

  const categories = ['Premium Rice', 'Regular Rice', 'Specialty Rice', 'Organic Rice'];

  const products = [
    { id: 1, name: 'Premium Jasmine Rice', price: 850, unit: 'per sack', stock: 120, category: 'Premium Rice' },
    { id: 2, name: 'Long Grain Rice', price: 650, unit: 'per sack', stock: 85, category: 'Regular Rice' },
    { id: 3, name: 'Brown Rice', price: 750, unit: 'per sack', stock: 45, category: 'Specialty Rice' },
    { id: 4, name: 'Glutinous Rice', price: 900, unit: 'per sack', stock: 60, category: 'Specialty Rice' },
    { id: 5, name: 'Basmati Rice', price: 1200, unit: 'per sack', stock: 30, category: 'Premium Rice' },
    { id: 6, name: 'Red Rice', price: 950, unit: 'per sack', stock: 25, category: 'Specialty Rice' },
    { id: 7, name: 'Black Rice', price: 1100, unit: 'per sack', stock: 15, category: 'Specialty Rice' },
    { id: 8, name: 'Wild Rice', price: 1350, unit: 'per sack', stock: 20, category: 'Organic Rice' },
    { id: 9, name: 'Sinandomeng Rice', price: 780, unit: 'per sack', stock: 100, category: 'Premium Rice' },
    { id: 10, name: 'NFA Rice', price: 450, unit: 'per sack', stock: 200, category: 'Regular Rice' },
    { id: 11, name: 'Organic Brown Rice', price: 1050, unit: 'per sack', stock: 35, category: 'Organic Rice' },
    { id: 12, name: 'Dinorado Rice', price: 820, unit: 'per sack', stock: 62, category: 'Premium Rice' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
    setVoidSearch('');
  };

  const confirmVoid = () => {
    if (!selectedVoidTxn || !voidReason.trim()) return;
    setRecentTransactions(prev => prev.map(t => 
      t.id === selectedVoidTxn.id ? { ...t, status: 'voided' } : t
    ));
    toast.success('Transaction Voided', `${selectedVoidTxn.id} voided — ₱${selectedVoidTxn.total.toLocaleString()} refund processed`);
    setShowVoidModal(false);
    setSelectedVoidTxn(null);
    setVoidReason('');
  };

  const filteredVoidTxns = recentTransactions.filter(t => 
    t.id.toLowerCase().includes(voidSearch.toLowerCase()) || 
    t.time.toLowerCase().includes(voidSearch.toLowerCase())
  );

  const completeSale = () => {
    if (cart.length > 0) {
      setCashTendered('');
      setGcashReference('');
      setShowPaymentModal(true);
    }
  };

  const confirmPayment = () => {
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < total) return;
    } else {
      if (!gcashReference.trim()) return;
    }
    
    const saleData = {
      items: [...cart],
      total,
      totalItems,
      paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'GCASH',
      transactionId: `KJP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashTendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : null,
      change: paymentMethod === 'cash' ? parseFloat(cashTendered) - total : null,
      gcashReference: paymentMethod === 'gcash' ? gcashReference : null,
    };
    setLastSale(saleData);
    setShowPaymentModal(false);
    setShowSaleCompleteModal(true);
    setCart([]);
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
          {/* Search and Category Filter */}
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none cursor-pointer min-w-[160px] font-medium"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
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
                  <p className="text-[10px] text-gray-400 mt-0.5">{product.stock} in stock</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-medium bg-primary-50 text-primary-600 rounded-full border border-primary-200">
                    {product.category}
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
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold text-sm
                      ${paymentMethod === 'cash' 
                        ? 'border-primary-500 bg-primary-50 text-primary-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
                      }
                    `}
                  >
                    <DollarSign size={18} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('gcash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold text-sm
                      ${paymentMethod === 'gcash' 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-primary-200 text-gray-600 hover:bg-primary-50'
                      }
                    `}
                  >
                    <Smartphone size={18} />
                    GCash
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
                    Complete Sale
                  </Button>
                  <Button onClick={voidTransaction} variant="danger" className="w-full" icon={XCircle}>
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
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod('cash')}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all font-semibold text-sm
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
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all font-semibold text-sm
                            ${paymentMethod === 'gcash' 
                              ? 'border-blue-500 bg-blue-50 text-blue-600' 
                              : 'border-primary-200 text-gray-600 hover:bg-primary-50'
                            }
                          `}
                        >
                          <Smartphone size={16} />
                          GCash
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
                        Complete Sale
                      </Button>
                      <Button onClick={() => { setMobileCartOpen(false); voidTransaction(); }} variant="danger" className="w-full" icon={XCircle}>
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

      {/* Payment Modal - Cash / GCash */}
      {showPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowPaymentModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-primary-200">
              {/* Header */}
              <div className={`p-5 text-white shrink-0 ${paymentMethod === 'cash' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {paymentMethod === 'cash' ? <DollarSign size={20} /> : <Smartphone size={20} />}
                  {paymentMethod === 'cash' ? 'Cash Payment' : 'GCash Payment'}
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  {paymentMethod === 'cash' ? 'Enter amount tendered by customer' : 'Enter GCash reference number'}
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
                ) : (
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
                  disabled={paymentMethod === 'cash' ? (!cashTendered || parseFloat(cashTendered) < total) : !gcashReference.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    paymentMethod === 'cash' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <Receipt size={14} /> Confirm Payment
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
                  disabled={!selectedVoidTxn || !voidReason.trim()}
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
                <h3 className="text-xl font-bold">Sale Complete!</h3>
                <p className="text-sm text-white/80 mt-1">{lastSale.transactionId}</p>
              </div>

              {/* Receipt Details */}
              <div className="p-5">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-800">{lastSale.time}</span>
                  </div>
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Items Sold</p>
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
