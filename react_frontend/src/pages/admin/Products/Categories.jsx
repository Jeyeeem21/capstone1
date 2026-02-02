import { useState, useCallback, useMemo } from 'react';
import { Tag, Layers, Package, CheckCircle, XCircle, Trash2, Palette } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, ActionButtons, StatsCard, FormModal, ConfirmModal, FormInput, FormSelect, FormTextarea, Modal, useToast, SkeletonStats, SkeletonTable } from '../../../components/ui';
import { apiClient } from '../../../api';
import { useDataFetch, invalidateCache } from '../../../hooks';

const CACHE_KEY = '/categories';

// Color presets for quick selection
const colorPresets = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Categories = () => {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    color: '#22c55e', 
    status: 'Active'
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Super-fast data fetching with cache
  const { 
    data: categories, 
    loading, 
    isRefreshing,
    refetch 
  } = useDataFetch('/categories', {
    cacheKey: CACHE_KEY,
    initialData: [],
  });

  const statusOptions = useMemo(() => [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ], []);

  const handleAdd = useCallback(() => {
    setFormData({ 
      name: '', 
      description: '', 
      color: '#22c55e', 
      status: 'Active'
    });
    setErrors({});
    setIsAddModalOpen(true);
  }, []);

  const handleView = useCallback((item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormData({ 
      name: item.name, 
      description: item.description || '', 
      color: item.color || '#22c55e', 
      status: item.status
    });
    setErrors({});
    setIsEditModalOpen(true);
  }, []);

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

  const handleColorChange = useCallback((color) => {
    setFormData(prev => ({ ...prev, color }));
  }, []);

  const handleAddSubmit = async () => {
    if (saving) return; // Prevent double submit
    setSaving(true);
    try {
      setErrors({});
      const response = await apiClient.post('/categories', formData);
      
      if (response.success && response.data) {
        const categoryName = formData.name;
        // Close modal first
        setIsAddModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Category Added', `${categoryName} has been added successfully.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error adding category:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).join(', ');
        toast.error('Validation Error', `Please fix the following fields: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to add category');
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
      const response = await apiClient.put(`/categories/${selectedItem.id}`, formData);
      
      if (response.success && response.data) {
        const categoryName = formData.name;
        // Close modal first
        setIsEditModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Category Updated', `${categoryName} has been updated.`);
        });
        return;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Error updating category:', error);
      if (error.response?.data?.errors || error.errors) {
        const backendErrors = error.response?.data?.errors || error.errors;
        setErrors(backendErrors);
        const fieldNames = Object.keys(backendErrors).join(', ');
        toast.error('Validation Error', `Please fix the following fields: ${fieldNames}`);
        throw error;
      } else {
        toast.error('Error', error.response?.data?.message || error.message || 'Failed to update category');
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
      const response = await apiClient.delete(`/categories/${selectedItem.id}`);
      
      if (response.success) {
        const categoryName = selectedItem.name;
        // Close modal first
        setIsDeleteModalOpen(false);
        
        // Refetch and toast together
        invalidateCache(CACHE_KEY);
        refetch().then(() => {
          toast.success('Category Removed', `${categoryName} has been removed.`);
        });
        return;
      } else {
        throw new Error(response.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error', 'Failed to delete category');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.status === 'Active').length;
  const inactiveCategories = categories.filter(c => c.status === 'Inactive').length;
  const totalProducts = categories.reduce((sum, c) => sum + (c.products_count || 0), 0);

  // Color preview component
  const ColorPreview = ({ color }) => (
    <div 
      className="w-6 h-6 rounded-full border-2 border-white shadow-sm" 
      style={{ backgroundColor: color }}
    />
  );

  // Color picker component (fill style like appearance settings)
  const ColorPicker = ({ value, onChange, label }) => (
    <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className="p-2 rounded-lg bg-white shadow-sm text-button-500">
          <Palette size={18} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
          <p className="text-xs text-gray-500">Used for card border in mobile view</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 hover:border-button-400 transition-colors"
            style={{ padding: 0 }}
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value.toUpperCase()}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onChange(val);
            }}
            className="w-full px-3 py-2 font-mono text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-button-500 focus:border-button-500"
            placeholder="#000000"
          />
        </div>
      </div>
      <div className="flex gap-1.5 mt-3">
        {colorPresets.map((preset, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(preset)}
            className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-all shadow-sm ${value === preset ? 'border-button-500 ring-2 ring-button-300' : 'border-gray-200 hover:border-button-400'}`}
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
      </div>
      {errors.color && <p className="text-red-500 text-xs mt-2">{errors.color[0]}</p>}
    </div>
  );

  const columns = useMemo(() => [
    { 
      header: 'Category', 
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ColorPreview color={row.color || '#22c55e'} />
          <p className="font-medium text-gray-800">{row.name}</p>
        </div>
      )
    },
    { 
      header: 'Description', 
      accessor: 'description',
      cell: (row) => (
        <p className="text-sm text-gray-600 truncate max-w-xs">
          {row.description || '-'}
        </p>
      )
    },
    { header: 'Products', accessor: 'products_count', cell: (row) => row.products_count || 0 },
    { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', sortable: false, cell: (row) => (
      <ActionButtons onView={() => handleView(row)} onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
    )},
  ], [handleView, handleEdit, handleDelete]);

  return (
    <div>
      <PageHeader 
        title="Categories" 
        description="Organize your products into categories" 
        icon={Tag}
        action={isRefreshing ? (
          <span className="text-xs text-gray-500 animate-pulse">Syncing...</span>
        ) : null}
      />

      {/* Stats Cards */}
      {loading && categories.length === 0 ? (
        <SkeletonStats count={4} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Categories" value={totalCategories} unit="categories" icon={Layers} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
          <StatsCard label="Active" value={activeCategories} unit="categories" icon={CheckCircle} iconBgColor="bg-gradient-to-br from-button-500 to-button-700" />
          <StatsCard label="Inactive" value={inactiveCategories} unit="categories" icon={XCircle} iconBgColor="bg-gradient-to-br from-red-400 to-red-600" />
          <StatsCard label="Total Products" value={totalProducts} unit="products" icon={Package} iconBgColor="bg-gradient-to-br from-button-400 to-button-600" />
        </div>
      )}

      {/* Table */}
      {loading && categories.length === 0 ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <DataTable 
          title="Category List" 
          subtitle="Manage all product categories" 
          columns={columns} 
          data={categories} 
          searchPlaceholder="Search categories..." 
          filterField="status" 
          filterPlaceholder="All Status" 
          onAdd={handleAdd} 
          addLabel="Add Category"
          onRowClick={handleView}
        />
      )}

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Category Details" 
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
              Edit Category
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
          <div className="space-y-4">
            {/* Category Name with Color */}
            <div 
              className="p-4 rounded-lg border-l-4"
              style={{ 
                borderLeftColor: selectedItem.color || '#22c55e',
                backgroundColor: `${selectedItem.color || '#22c55e'}10`
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 text-white rounded-lg"
                  style={{ backgroundColor: selectedItem.color || '#22c55e' }}
                >
                  <Tag size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-600">{selectedItem.description || 'No description'}</p>
                </div>
                <StatusBadge status={selectedItem.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Color */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Palette size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Border Color</p>
                  <div className="flex items-center gap-2">
                    <ColorPreview color={selectedItem.color || '#22c55e'} />
                    <span className="font-semibold text-gray-800 text-sm">{selectedItem.color || '#22c55e'}</span>
                  </div>
                </div>
              </div>

              {/* Products Count */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-button-50 to-primary-50 rounded-lg border-2 border-button-200">
                <div className="p-2 bg-button-500 text-white rounded-lg">
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Products</p>
                  <p className="text-xl font-bold text-button-600">{selectedItem.products_count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <FormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} title="Add New Category" submitText="Add Category" size="md" loading={saving}>
        {({ submitted }) => (
          <>
            <FormInput 
              label="Category Name" 
              name="name" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter category name" 
              submitted={submitted} 
              error={errors.name?.[0]} 
            />
            <FormTextarea 
              label="Description" 
              name="description" 
              value={formData.description} 
              onChange={handleFormChange} 
              placeholder="Enter category description (optional)" 
              rows={3} 
              submitted={submitted} 
              error={errors.description?.[0]} 
            />
            <ColorPicker 
              label="Border Color" 
              value={formData.color} 
              onChange={handleColorChange} 
            />
            <FormSelect 
              label="Status" 
              name="status" 
              value={formData.status} 
              onChange={handleFormChange} 
              options={statusOptions} 
              required 
              submitted={submitted} 
              error={errors.status?.[0]} 
            />
          </>
        )}
      </FormModal>

      {/* Edit Modal */}
      <FormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditSubmit} title="Edit Category" submitText="Save Changes" size="md" loading={saving}>
        {({ submitted }) => (
          <>
            <FormInput 
              label="Category Name" 
              name="name" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              placeholder="Enter category name" 
              submitted={submitted} 
              error={errors.name?.[0]} 
            />
            <FormTextarea 
              label="Description" 
              name="description" 
              value={formData.description} 
              onChange={handleFormChange} 
              placeholder="Enter category description (optional)" 
              rows={3} 
              submitted={submitted} 
              error={errors.description?.[0]} 
            />
            <ColorPicker 
              label="Border Color" 
              value={formData.color} 
              onChange={handleColorChange} 
            />
            <FormSelect 
              label="Status" 
              name="status" 
              value={formData.status} 
              onChange={handleFormChange} 
              options={statusOptions} 
              required 
              submitted={submitted} 
              error={errors.status?.[0]} 
            />
          </>
        )}
      </FormModal>

      <ConfirmModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteConfirm} 
        title="Remove Category" 
        message={`Are you sure you want to remove "${selectedItem?.name}"? The category will be soft deleted and hidden from the list, but remains in the database.`} 
        confirmText="Remove" 
        variant="danger" 
        icon={Trash2} 
        loading={saving}
      />
    </div>
  );
};

export default Categories;
