import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Star, 
  Grid,
  List,
  ArrowRight,
  Leaf,
  Award,
  Truck,
  RefreshCw
} from 'lucide-react';
import { Button, Skeleton } from '../../../components/ui';
import { productsApi } from '../../../api';

// Fallback products if API is unavailable
const fallbackProducts = [
  {
    id: 1,
    name: 'Premium Jasmine Rice',
    category: 'premium',
    description: 'Aromatic, long-grain rice with a subtle floral fragrance.',
    price: 850,
    unit: '25kg',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop',
    rating: 4.9,
    reviews_count: 128,
    tags: ['Best Seller', 'Aromatic'],
    in_stock: true,
  },
  {
    id: 2,
    name: 'Long Grain White Rice',
    category: 'standard',
    description: 'Classic, fluffy rice that stays separate when cooked.',
    price: 650,
    unit: '25kg',
    image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=300&fit=crop',
    rating: 4.7,
    reviews_count: 95,
    tags: ['Popular'],
    in_stock: true,
  },
  {
    id: 3,
    name: 'Brown Rice',
    category: 'specialty',
    description: 'Nutritious whole grain rice with a nutty flavor.',
    price: 750,
    unit: '25kg',
    image: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400&h=300&fit=crop',
    rating: 4.8,
    reviews_count: 67,
    tags: ['Healthy Choice', 'Whole Grain'],
    in_stock: true,
  },
  {
    id: 4,
    name: 'Glutinous Rice',
    category: 'specialty',
    description: 'Sticky rice perfect for traditional Filipino desserts.',
    price: 900,
    unit: '25kg',
    image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop',
    rating: 4.6,
    reviews_count: 54,
    tags: ['For Desserts'],
    in_stock: true,
  },
];

const fallbackCategories = [
  { id: 'all', name: 'All Products', count: 12 },
  { id: 'premium', name: 'Premium', count: 4 },
  { id: 'standard', name: 'Standard', count: 3 },
  { id: 'specialty', name: 'Specialty', count: 3 },
  { id: 'organic', name: 'Organic', count: 2 },
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [isFromCache, setIsFromCache] = useState(false);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      const result = await productsApi.getAll({
        search: searchTerm,
        category: selectedCategory,
        sort: sortBy,
      });

      if (result.success && result.data.length > 0) {
        setProducts(result.data);
        setIsFromCache(result.fromCache || false);
      } else {
        setProducts(fallbackProducts);
        setIsFromCache(true);
      }
      
      setLoading(false);
    };

    const timeoutId = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, sortBy]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const result = await productsApi.getCategories();
      if (result.success && result.data.length > 0) {
        setCategories(result.data);
      }
    };
    fetchCategories();
  }, []);

  // Normalize product data
  const normalizeProduct = (product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    price: parseFloat(product.price),
    unit: product.unit,
    image: product.image,
    rating: parseFloat(product.rating || 0),
    reviewsCount: product.reviews_count || product.reviewsCount || 0,
    tags: product.tags || [],
    inStock: product.in_stock ?? product.inStock ?? true,
  });

  const normalizedProducts = products.map(normalizeProduct);

  const filteredProducts = normalizedProducts.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (product.category || '') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      default: return b.reviewsCount - a.reviewsCount;
    }
  });

  const features = [
    { icon: Leaf, text: 'Fresh from Farm' },
    { icon: Award, text: 'Quality Guaranteed' },
    { icon: Truck, text: 'Fast Delivery' },
  ];

  const handleRetry = () => {
    productsApi.resetAvailability();
    window.location.reload();
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1920&h=600&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1 bg-button-500/20 border border-button-500/30 text-button-300 rounded-full text-sm font-medium mb-6">
            Our Products
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Premium Rice Selection
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Discover our wide range of quality rice products, from premium jasmine to nutritious brown rice
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                <feature.icon size={16} className="text-button-400" />
                <span className="text-sm text-white">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 bg-gradient-to-b from-white to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline/Cache Notice */}
          {isFromCache && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
              <p className="text-yellow-800 text-sm">
                Showing cached data. Server may be unavailable.
              </p>
              <button 
                onClick={handleRetry}
                className="flex items-center gap-2 text-yellow-700 hover:text-yellow-800 font-medium text-sm"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-primary-100 p-4 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-button-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                      selectedCategory === category.id
                        ? 'bg-button-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                    <span className={`ml-1 ${selectedCategory === category.id ? 'text-white/70' : 'text-gray-400'}`}>
                      ({category.count})
                    </span>
                  </button>
                ))}
              </div>

              {/* Sort & View */}
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-gray-100 border-2 border-transparent rounded-lg text-sm focus:outline-none focus:border-button-500 cursor-pointer"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-button-600' : 'text-gray-500'
                    }`}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-button-600' : 'text-gray-500'
                    }`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {loading ? (
                <Skeleton variant="text" width="w-40" />
              ) : (
                <>Showing <span className="font-semibold text-gray-800">{sortedProducts.length}</span> products</>
              )}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg border-2 border-primary-100">
                  <Skeleton variant="image" className="h-48 w-full rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton variant="title" width="w-3/4" />
                    <Skeleton variant="text" width="w-1/2" />
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => <Skeleton key={j} variant="circle" width="w-4" height="h-4" />)}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Skeleton variant="title" width="w-20" />
                      <Skeleton variant="button" width="w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products Grid */}
          {!loading && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
                <div 
                  key={product.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg shadow-primary-100/50 hover:shadow-xl transition-all duration-300 border-2 border-primary-300 hover:border-button-400"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                        <span className="px-4 py-2 bg-red-500 text-white font-medium rounded-full">Out of Stock</span>
                      </div>
                    )}
                    {product.tags.length > 0 && product.inStock && (
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {product.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-button-500 text-white text-xs font-medium rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 mb-2">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{product.rating}</span>
                      <span className="text-sm text-gray-400">({product.reviewsCount})</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-button-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold text-button-600">₱{product.price.toLocaleString()}</span>
                        <span className="text-sm text-gray-400 ml-1">/{product.unit}</span>
                      </div>
                      <Link to="/contact">
                        <Button size="sm" disabled={!product.inStock} className="!bg-button-500 hover:!bg-button-600 text-white">
                          {product.inStock ? 'Inquire' : 'Sold Out'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products List */}
          {!loading && viewMode === 'list' && (
            <div className="space-y-4">
              {sortedProducts.map((product) => (
                <div 
                  key={product.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg shadow-primary-100/50 hover:shadow-xl transition-all duration-300 border-2 border-primary-300 hover:border-button-400 flex flex-col sm:flex-row"
                >
                  <div className="relative w-full sm:w-64 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                        <span className="px-4 py-2 bg-red-500 text-white font-medium rounded-full">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {product.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-button-100 text-button-700 text-xs font-medium rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-button-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-gray-500 mb-4">{product.description}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-700">{product.rating}</span>
                          <span className="text-gray-400">({product.reviewsCount} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-3xl font-bold text-button-600">₱{product.price.toLocaleString()}</span>
                        <span className="text-gray-400 ml-1">/{product.unit}</span>
                      </div>
                      <Link to="/contact">
                        <Button disabled={!product.inStock} className="!bg-button-500 hover:!bg-button-600 text-white">
                          {product.inStock ? 'Inquire Now' : 'Out of Stock'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && sortedProducts.length === 0 && (
            <div className="text-center py-16">
              <Package size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
              <Button onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="!bg-button-500 hover:!bg-button-600 text-white">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-button-700 via-button-600 to-button-700 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Need Bulk Orders or Custom Packaging?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Contact us for wholesale pricing, bulk orders, or custom packaging solutions for your business.
          </p>
          <Link to="/contact">
            <Button size="lg" className="px-8 bg-white !text-button-700 hover:bg-gray-100 group font-semibold">
              Contact for Wholesale
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Products;
