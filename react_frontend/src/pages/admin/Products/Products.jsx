import { useState, useCallback, useMemo } from 'react';
import { Package, Box, Tag, DollarSign, CheckCircle, XCircle, Trash2, Scale, Hash, Calendar, ShoppingCart } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';

const CACHE_KEY = '/products';
const CATEGORIES_CACHE_KEY = '/categories';

const Products = () => {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ 
    product_name: '', 
    category_id: '', 
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Super-fast data fetching with cache
  const { 
    data: products, 
    loading, 
    isRefreshing,
    refetch 
  } = useDataFetch('/products', {
    cacheKey: CACHE_KEY,
    initialData: [],
  });

  // Fetch categories for dropdown
  const { 
    data: categories, 
    refetch: refetchCategories 
  } = useDataFetch('/categories', {
    cacheKey: CATEGORIES_CACHE_KEY,
    initialData: [],
  });

  // Memoized category options for dropdown
  const categoryOptions = useMemo(() => {
    return categories
      .filter(c => c.status === 'Active')
      .map(c => ({
        value: String(c.id),
        label: c.name
      }));
  }, [categories]);

  const statusOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ], []);

  const handleAdd = useCallback(() => {
    setFormData({ 
      product_name: '', 
      category_id: '', 
      status: 'active'
    });
    setErrors({});
    refetchCategories();
    setIsAddModalOpen(true);
  }, [refetchCategories]);

  const handleView = useCallback((item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormData({ 
      product_name: item.product_name, 
      category_id: String(item.category_id), 
      status: item.status
    });
    setErrors({});
    refetchCategories();
    setIsEditModalOpen(true);
  }, [refetchCategories]);

  const handleDelete = useCallback((item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleAddSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const submitData = {
        product_name: formData.product_name,
        category_id: parseInt(formData.category_id),
        price: 0,
        stocks: 0,
        unit: 'kg',
        weight: null,
        status: formData.status,
      };
      const response = await apiClient.post('/products', submitData);
      
      if (response.success && response.data) {
        const productName = formData.product_name;
        // Close modal first
        setIsAddModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Product Added', `${productName} has been added successfully.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error adding product:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).join(', ');
        toast.error('Validation Error', `Please fix the following fields: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to add product');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const submitData = {
        product_name: formData.product_name,
        category_id: parseInt(formData.category_id),
        price: selectedItem.price,
        stocks: selectedItem.stocks,
        unit: selectedItem.unit,
        weight: selectedItem.weight,
        status: formData.status,
      };
      const response = await apiClient.put(`/products/${selectedItem.product_id}`, submitData);
      
      if (response.success && response.data) {
        const productName = formData.product_name;
        // Close modal first
        setIsEditModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Product Updated', `${productName} has been updated.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).join(', ');
        toast.error('Validation Error', `Please fix the following fields: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to update product');
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      const response = await apiClient.delete(`/products/${selectedItem.product_id}`);
      
      if (response.success) {
        const productName = selectedItem.product_name;
        // Close modal first
        setIsDeleteModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Product Removed', `${productName} has been removed.`);
        });
        return;
      } else {
        throw new Error(response.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error', 'Failed to delete product');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const inactiveProducts = products.filter(p => p.status === 'inactive').length;
  const inStockProducts = products.filter(p => (p.stocks || 0) > 0).length;
  const outOfStockProducts = products.filter(p => (p.stocks || 0) <= 0).length;

  // Table columns
  const columns = useMemo(() => [
    { header: 'Product Name', accessor: 'product_name' },
    { 
      header: 'Category', 
      accessor: 'category_name',
      cell: (row) => (
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${row.category_color}20`, 
            color: row.category_color 
          }}
        >
          {row.category_name}
        </span>
      )
    },
    { 
      header: 'Price', 
      accessor: 'price_formatted',
      cell: (row) => (
        <span className="font-semibold text-green-600">{row.price_formatted}</span>
      )
    },
    { 
      header: 'Stocks', 
      accessor: 'stocks',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${row.stocks > 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {row.stocks.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">{row.unit}</span>
        </div>
      )
    },
    { 
      header: 'Weight', 
      accessor: 'weight_formatted',
      cell: (row) => (
        <span className="text-gray-600">{row.weight_formatted || '-'}</span>
      )
    },
    { 
      header: 'Stock Status', 
      accessor: 'stock_status',
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.is_in_stock 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {row.stock_status}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status === 'active' ? 'Active' : 'Inactive'} />
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <ActionButtons
          onView={() => handleView(row)}
          onEdit={() => handleEdit(row)}
          onDelete={() => handleDelete(row)}
        />
      )
    }
  ], [handleView, handleEdit, handleDelete]);

  // ViewDetailItem component for view modal
  const ViewDetailItem = ({ icon: Icon, label, value, iconColor = 'text-primary-500', compact = false }) => (
    <div className={`flex items-start gap-2 ${compact ? 'p-2' : 'p-3'} bg-primary-50/30 rounded-xl border-2 border-primary-200`}>
      <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-white shadow-sm ${iconColor}`}>
        <Icon size={compact ? 14 : 18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 uppercase tracking-wide truncate`}>{label}</p>
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-800 mt-0.5 truncate`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title="Products" 
        description="Manage your product inventory and catalog" 
        icon={Package}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard 
            label="Total Products" 
            value={totalProducts} 
            icon={Package} 
            trend={`${activeProducts} active`}
            color="primary"
          />
          <StatsCard 
            label="Active" 
            value={activeProducts} 
            icon={CheckCircle} 
            trend="Available for sale"
            color="green"
          />
          <StatsCard 
            label="In Stock" 
            value={inStockProducts} 
            icon={Box} 
            trend={`${outOfStockProducts} out of stock`}
            color="blue"
          />
          <StatsCard 
            label="Inactive" 
            value={inactiveProducts} 
            icon={XCircle} 
            trend="Not available"
            color="gray"
          />
        </div>
      )}

      {/* Products Table */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <DataTable 
          title="Product Inventory"
          subtitle="Manage your rice products"
          columns={columns} 
          data={products} 
          searchPlaceholder="Search products..." 
          filterField="status"
          filterOptions={['active', 'inactive']}
          filterPlaceholder="All Status"
          onAdd={handleAdd}
          addLabel="Add Product"
          onRowDoubleClick={handleView}
        />
      )}

      {/* Add Modal */}
      <FormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddSubmit} 
        title="Add New Product" 
        submitText="Add Product" 
        size="md"
        loading={saving}
      >
        {({ submitted }) => (
          <>
            <FormInput 
              label="Product Name" 
              name="product_name" 
              value={formData.product_name} 
              onChange={handleFormChange} 
              required 
              placeholder="e.g. Premium Rice"
              error={errors.product_name}
              submitted={submitted}
            />
            <FormSelect 
              label="Category" 
              name="category_id" 
              value={formData.category_id} 
              onChange={handleFormChange} 
              options={categoryOptions} 
              required
              placeholder="Select a category"
              error={errors.category_id}
              submitted={submitted}
            />
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSubmit={handleEditSubmit} 
        title="Edit Product" 
        submitText="Save Changes" 
        size="md"
        loading={saving}
      >
        {({ submitted }) => (
          <>
            <FormInput 
              label="Product Name" 
              name="product_name" 
              value={formData.product_name} 
              onChange={handleFormChange} 
              required 
              placeholder="e.g. Premium Rice"
              error={errors.product_name}
              submitted={submitted}
            />
            <FormSelect 
              label="Category" 
              name="category_id" 
              value={formData.category_id} 
              onChange={handleFormChange} 
              options={categoryOptions} 
              required
              placeholder="Select a category"
              error={errors.category_id}
              submitted={submitted}
            />
            <FormSelect 
              label="Status" 
              name="status" 
              value={formData.status} 
              onChange={handleFormChange} 
              options={statusOptions}
              submitted={submitted}
            />
          </>
        )}
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedItem?.product_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        icon={Trash2}
        isLoading={saving}
      />

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Product Details" 
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setIsViewModalOpen(false);
                handleEdit(selectedItem);
              }}
              className="px-4 py-2 bg-button-500 hover:bg-button-600 text-white rounded-lg transition-colors"
            >
              Edit Product
            </button>
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-3">
            {/* Header with Status */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedItem.product_name}</h3>
                <p className="text-xs text-gray-500">Product ID: #{String(selectedItem.product_id).padStart(4, '0')}</p>
              </div>
              <StatusBadge status={selectedItem.status === 'active' ? 'Active' : 'Inactive'} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-2">
              <ViewDetailItem icon={Hash} label="Product ID" value={`#${String(selectedItem.product_id).padStart(4, '0')}`} compact />
              <ViewDetailItem icon={Tag} label="Category" value={selectedItem.category_name} iconColor="text-blue-500" compact />
              <ViewDetailItem icon={DollarSign} label="Price" value={selectedItem.price_formatted} iconColor="text-green-500" compact />
              <ViewDetailItem icon={Box} label="Stocks" value={`${selectedItem.stocks.toLocaleString()} ${selectedItem.unit}`} iconColor="text-blue-500" compact />
              <ViewDetailItem icon={Scale} label="Weight" value={selectedItem.weight_formatted || 'N/A'} iconColor="text-purple-500" compact />
              <ViewDetailItem icon={ShoppingCart} label="Stock Status" value={selectedItem.stock_status} iconColor={selectedItem.is_in_stock ? 'text-green-500' : 'text-red-500'} compact />
              <ViewDetailItem icon={Calendar} label="Created" value={selectedItem.created_date} iconColor="text-gray-500" compact />
            </div>

            {/* Price Summary */}
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Unit Price</span>
                <span className="text-xl font-bold text-green-600">{selectedItem.price_formatted}</span>
              </div>
              {selectedItem.stocks > 0 && (
                <div className="mt-1 text-xs text-gray-600">
                  Total Value: <strong className="text-green-600">₱{(selectedItem.price * selectedItem.stocks).toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
