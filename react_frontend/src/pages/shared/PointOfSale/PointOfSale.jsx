import { Monitor, Search, Plus, Minus, ShoppingCart, Trash2, DollarSign, Receipt, Package, Smartphone, XCircle, Tag } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../../components/common';
import { Button, StatsCard } from '../../../components/ui';

const PointOfSale = () => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

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
    if (cart.length > 0 && window.confirm('Are you sure you want to void this transaction?')) {
      setCart([]);
    }
  };

  const completeSale = () => {
    if (cart.length > 0) {
      alert(`Sale completed!\nPayment Method: ${paymentMethod.toUpperCase()}\nTotal: ₱${total.toLocaleString()}`);
      setCart([]);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Today's Sales" value={`₱${todayStats.totalSales.toLocaleString()}`} unit="revenue" icon={DollarSign} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Transactions" value={todayStats.transactions} unit="orders" icon={Receipt} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Items Sold" value={todayStats.itemsSold} unit="items" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        <StatsCard label="Avg Transaction" value={`₱${todayStats.avgTransaction.toLocaleString()}`} unit="per order" icon={ShoppingCart} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 p-4">
          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b-2 border-primary-100">
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
          
          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border-2 border-primary-300 shadow-lg shadow-primary-100/50 sticky top-4 overflow-hidden">
            {/* Cart Header */}
            <div className="p-4 bg-gradient-to-r from-button-500 to-button-600 text-white border-b-2 border-button-600">
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

            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs">Click on products to add</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
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

                  {/* Payment Method */}
                  <div className="border-t-2 border-primary-200 pt-4 mb-4">
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

                  {/* Total Section */}
                  <div className="border-t-2 border-primary-200 pt-4">
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
                      <Button onClick={completeSale} className="w-full" icon={Receipt}>
                        Complete Sale
                      </Button>
                      <Button onClick={voidTransaction} variant="danger" className="w-full" icon={XCircle}>
                        Void Transaction
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointOfSale;
