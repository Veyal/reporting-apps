'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, ArrowLeft, Image, Camera, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';

interface PhotoCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  reportType: string;
  minRequired: number;
  maxAllowed: number;
  order: number;
  active: boolean;
  createdAt: string;
}

export default function PhotoCategoriesPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempTypeFilter, setTempTypeFilter] = useState('');
  const [showAddCategoryPopup, setShowAddCategoryPopup] = useState(false);
  const [showEditCategoryPopup, setShowEditCategoryPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PhotoCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({
    code: '',
    name: '',
    description: '',
    reportType: 'OPENING',
    minRequired: 1,
    maxAllowed: 5,
    active: true
  });
  const [editCategory, setEditCategory] = useState({
    code: '',
    name: '',
    description: '',
    reportType: 'OPENING',
    minRequired: 1,
    maxAllowed: 5,
    active: true
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchCategories();
    }
  }, [isAdmin, search, typeFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.reportType = typeFilter;

      const response = await adminAPI.getPhotoCategories(params);
      const categoriesData = response.data.categories || response.data;

      // Apply client-side filtering for search if backend doesn't support it
      let filteredCategories = categoriesData;
      if (search) {
        filteredCategories = filteredCategories.filter((item: PhotoCategory) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.code.toLowerCase().includes(search.toLowerCase())
        );
      }

      setCategories(filteredCategories);
    } catch (error) {
      console.error('Failed to fetch photo categories:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load photo categories',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter popup functions
  const openFilterPopup = () => {
    setTempSearch(search);
    setTempTypeFilter(typeFilter);
    setShowFilterPopup(true);
  };

  const closeFilterPopup = () => {
    setShowFilterPopup(false);
  };

  const applyFilters = () => {
    setSearch(tempSearch);
    setTypeFilter(tempTypeFilter);
    closeFilterPopup();
  };

  const clearFilters = () => {
    setTempSearch('');
    setTempTypeFilter('');
    setSearch('');
    setTypeFilter('');
  };

  // Add category functions
  const openAddCategoryPopup = () => {
    setNewCategory({
      code: '',
      name: '',
      description: '',
      reportType: 'OPENING',
      minRequired: 1,
      maxAllowed: 5,
      active: true
    });
    setFormErrors({});
    setShowAddCategoryPopup(true);
  };

  const closeAddCategoryPopup = () => {
    setShowAddCategoryPopup(false);
    setFormErrors({});
  };

  // Edit category functions
  const openEditCategoryPopup = (category: PhotoCategory) => {
    setEditingCategory(category);
    setEditCategory({
      code: category.code,
      name: category.name,
      description: category.description || '',
      reportType: category.reportType,
      minRequired: category.minRequired,
      maxAllowed: category.maxAllowed,
      active: category.active
    });
    setFormErrors({});
    setShowEditCategoryPopup(true);
  };

  const closeEditCategoryPopup = () => {
    setShowEditCategoryPopup(false);
    setEditingCategory(null);
    setFormErrors({});
  };

  // Delete confirmation functions
  const openDeleteConfirm = (id: string) => {
    setDeletingCategoryId(id);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingCategoryId(null);
  };

  // Form validation
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!newCategory.code.trim()) {
      errors.code = 'Code is required';
    }
    if (!newCategory.name.trim()) {
      errors.name = 'Name is required';
    }
    if (newCategory.minRequired < 0) {
      errors.minRequired = 'Minimum must be 0 or greater';
    }
    if (newCategory.maxAllowed < 1) {
      errors.maxAllowed = 'Maximum must be at least 1';
    }
    if (newCategory.maxAllowed < newCategory.minRequired) {
      errors.maxAllowed = 'Maximum must be greater than or equal to minimum';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: {[key: string]: string} = {};

    if (!editCategory.name.trim()) {
      errors.name = 'Name is required';
    }
    if (editCategory.minRequired < 0) {
      errors.minRequired = 'Minimum must be 0 or greater';
    }
    if (editCategory.maxAllowed < 1) {
      errors.maxAllowed = 'Maximum must be at least 1';
    }
    if (editCategory.maxAllowed < editCategory.minRequired) {
      errors.maxAllowed = 'Maximum must be greater than or equal to minimum';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleAddCategory = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading(true);
      const response = await adminAPI.createPhotoCategory(newCategory);
      const createdCategory = response.data.category || response.data;

      setCategories(prev => [...prev, createdCategory]);
      closeAddCategoryPopup();

      showToast({
        type: 'success',
        title: 'Category Created',
        message: `${newCategory.name} has been added successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to create category:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create category. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!validateEditForm() || !editingCategory) return;

    try {
      setActionLoading(true);
      // Exclude code and reportType from update as they can't be changed
      const { code, reportType, ...updateData } = editCategory;
      const response = await adminAPI.updatePhotoCategory(editingCategory.id, updateData);
      const updatedCategory = response.data.category || response.data;

      setCategories(prev => prev.map(item =>
        item.id === editingCategory.id ? updatedCategory : item
      ));
      closeEditCategoryPopup();

      showToast({
        type: 'success',
        title: 'Category Updated',
        message: `${editCategory.name} has been updated successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to update category:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update category. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;

    try {
      setActionLoading(true);
      const deletedCategory = categories.find(item => item.id === deletingCategoryId);
      await adminAPI.deletePhotoCategory(deletingCategoryId);

      setCategories(prev => prev.filter(item => item.id !== deletingCategoryId));
      closeDeleteConfirm();

      showToast({
        type: 'success',
        title: 'Category Deleted',
        message: `${deletedCategory?.name} has been deleted successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete category. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const getReportTypeBadgeClass = (type: string) => {
    switch(type) {
      case 'OPENING': return 'badge-primary';
      case 'CLOSING': return 'badge-warning';
      case 'PROBLEM': return 'badge-error';
      case 'STOCK': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gothic-900">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.history.back()}
                  className="w-10 h-10 bg-gothic-700 hover:bg-gothic-600 rounded-xl flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gothic-300" />
                </button>
                <div className="w-10 h-10 bg-accent-gradient rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Photo Categories
                  </h1>
                  <p className="header-subtitle truncate">
                    Manage photo upload categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6 pb-24">
        {/* Filter Button */}
        <div className="mb-6">
          <button
            onClick={openFilterPopup}
            className={`filter-button w-full ${
              (search || typeFilter) ? 'filter-button-active' : 'filter-button-inactive'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium">
              {(search || typeFilter) ? 'Filters Applied' : 'Search & Filter'}
            </span>
            {(search || typeFilter) && (
              <div className="ml-auto flex items-center space-x-1">
                <span className="text-xs bg-accent-500 text-white px-2 py-0.5 rounded-full">
                  {[search, typeFilter].filter(Boolean).length}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Categories List - Grouped by Type */}
        {['OPENING', 'CLOSING', 'PROBLEM', 'STOCK'].map(type => {
          const typeCategories = categories
            .filter(c => c.reportType === type)
            .sort((a, b) => a.order - b.order);

          if (typeCategories.length === 0) return null;

          return (
            <div key={type} className="mb-8">
              <div className="flex items-center mb-4">
                <span className={`badge-small ${getReportTypeBadgeClass(type)} mr-3`}>
                  {type}
                </span>
                <h2 className="text-sm font-medium text-gothic-300">
                  {type.charAt(0) + type.slice(1).toLowerCase()} Categories
                </h2>
                <span className="ml-auto text-xs text-gothic-400">
                  {typeCategories.length} categor{typeCategories.length !== 1 ? 'ies' : 'y'}
                </span>
              </div>

              <div className="space-y-3">
                {typeCategories.map((category) => (
                  <div key={category.id} className="gothic-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gothic-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Camera className="w-5 h-5 text-gothic-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* First line: Name and Code */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gothic-100 font-medium text-sm">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-xs text-gothic-400 mt-1">{category.description}</p>
                            )}
                          </div>
                          <code className="text-gothic-300 text-xs bg-gothic-800 px-2 py-1 rounded ml-2 flex-shrink-0">
                            {category.code}
                          </code>
                        </div>

                        {/* Second line: Status and Requirements */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`badge-small ${category.active ? 'badge-success' : 'badge-secondary'}`}>
                              {category.active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gothic-400">
                              Min: {category.minRequired} • Max: {category.maxAllowed}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCategoryPopup(category)}
                              className="w-7 h-7 bg-gothic-700 hover:bg-gothic-600 rounded flex items-center justify-center transition-colors"
                            >
                              <Edit className="w-3 h-3 text-accent-400" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(category.id)}
                              className="w-7 h-7 bg-gothic-700 hover:bg-red-900/20 rounded flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="gothic-card p-12 text-center">
            <div className="w-12 h-12 bg-gothic-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Image className="w-6 h-6 text-gothic-400" />
            </div>
            <h3 className="text-sm font-medium text-gothic-300 mb-2">No categories found</h3>
            <p className="text-xs text-gothic-400 mb-6">
              {search || typeFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first category'
              }
            </p>
            {!search && !typeFilter && (
              <button
                onClick={openAddCategoryPopup}
                className="btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Category
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={openAddCategoryPopup}
        className="fixed bottom-24 right-4 bg-accent-500 hover:bg-accent-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 z-[60] px-4 py-3"
      >
        <Plus className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Add</span>
      </button>

      {/* Filter Popup */}
      {showFilterPopup && (
        <div className="filter-popup" onClick={closeFilterPopup}>
          <div className="filter-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gothic-100">Search & Filter</h3>
              <button
                onClick={closeFilterPopup}
                className="text-gothic-400 hover:text-gothic-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempSearch}
                    onChange={(e) => setTempSearch(e.target.value)}
                    placeholder="Search categories..."
                    className="input-gothic w-full pl-9 text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gothic-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">Report Type</label>
                <select
                  value={tempTypeFilter}
                  onChange={(e) => setTempTypeFilter(e.target.value)}
                  className="input-gothic w-full text-sm"
                >
                  <option value="">All Types</option>
                  <option value="OPENING">Opening</option>
                  <option value="CLOSING">Closing</option>
                  <option value="PROBLEM">Problem</option>
                  <option value="STOCK">Stock</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-5">
              <button
                onClick={clearFilters}
                className="btn-secondary flex-1 text-sm"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="btn-primary flex-1 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Popup */}
      {showAddCategoryPopup && (
        <div className="filter-popup" onClick={closeAddCategoryPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Add Photo Category</h3>
              </div>
              <button onClick={closeAddCategoryPopup} className="text-gothic-400 hover:text-gothic-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Code *</label>
                <input
                  type="text"
                  value={newCategory.code}
                  onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., OPENING_ENTRANCE"
                  className={`input-gothic w-full ${formErrors.code ? 'border-red-500' : ''}`}
                />
                {formErrors.code && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Category name"
                  className={`input-gothic w-full ${formErrors.name ? 'border-red-500' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Description</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Optional description"
                  className="input-gothic w-full"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Report Type *</label>
                <select
                  value={newCategory.reportType}
                  onChange={(e) => setNewCategory({ ...newCategory, reportType: e.target.value })}
                  className="input-gothic w-full"
                >
                  <option value="OPENING">Opening</option>
                  <option value="CLOSING">Closing</option>
                  <option value="PROBLEM">Problem</option>
                  <option value="STOCK">Stock</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Min Required</label>
                  <input
                    type="number"
                    value={newCategory.minRequired}
                    onChange={(e) => setNewCategory({ ...newCategory, minRequired: parseInt(e.target.value) || 0 })}
                    min="0"
                    className={`input-gothic w-full ${formErrors.minRequired ? 'border-red-500' : ''}`}
                  />
                  {formErrors.minRequired && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.minRequired}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Max Allowed</label>
                  <input
                    type="number"
                    value={newCategory.maxAllowed}
                    onChange={(e) => setNewCategory({ ...newCategory, maxAllowed: parseInt(e.target.value) || 1 })}
                    min="1"
                    className={`input-gothic w-full ${formErrors.maxAllowed ? 'border-red-500' : ''}`}
                  />
                  {formErrors.maxAllowed && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.maxAllowed}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={newCategory.active}
                  onChange={(e) => setNewCategory({ ...newCategory, active: e.target.checked })}
                  className="w-4 h-4 text-accent-500 bg-gothic-800 border-gothic-600 rounded focus:ring-accent-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-gothic-300">
                  Active category
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeAddCategoryPopup}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="btn-primary flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Popup */}
      {showEditCategoryPopup && editingCategory && (
        <div className="filter-popup" onClick={closeEditCategoryPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Edit Photo Category</h3>
              </div>
              <button onClick={closeEditCategoryPopup} className="text-gothic-400 hover:text-gothic-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Code</label>
                  <input
                    type="text"
                    value={editingCategory.code}
                    disabled
                    className="input-gothic w-full opacity-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Report Type</label>
                  <input
                    type="text"
                    value={editingCategory.reportType}
                    disabled
                    className="input-gothic w-full opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-gothic-400 -mt-2">Code and report type cannot be changed</p>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={editCategory.name}
                  onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                  placeholder="Category name"
                  className={`input-gothic w-full ${formErrors.name ? 'border-red-500' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Description</label>
                <textarea
                  value={editCategory.description}
                  onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                  placeholder="Optional description"
                  className="input-gothic w-full"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Min Required</label>
                  <input
                    type="number"
                    value={editCategory.minRequired}
                    onChange={(e) => setEditCategory({ ...editCategory, minRequired: parseInt(e.target.value) || 0 })}
                    min="0"
                    className={`input-gothic w-full ${formErrors.minRequired ? 'border-red-500' : ''}`}
                  />
                  {formErrors.minRequired && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.minRequired}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gothic-300 mb-2">Max Allowed</label>
                  <input
                    type="number"
                    value={editCategory.maxAllowed}
                    onChange={(e) => setEditCategory({ ...editCategory, maxAllowed: parseInt(e.target.value) || 1 })}
                    min="1"
                    className={`input-gothic w-full ${formErrors.maxAllowed ? 'border-red-500' : ''}`}
                  />
                  {formErrors.maxAllowed && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.maxAllowed}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editCategory.active}
                  onChange={(e) => setEditCategory({ ...editCategory, active: e.target.checked })}
                  className="w-4 h-4 text-accent-500 bg-gothic-800 border-gothic-600 rounded focus:ring-accent-500"
                />
                <label htmlFor="editActive" className="ml-2 text-sm text-gothic-300">
                  Active category
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeEditCategoryPopup}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditCategory}
                className="btn-primary flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && deletingCategoryId && (
        <div className="filter-popup" onClick={closeDeleteConfirm}>
          <div className="filter-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gothic-100 mb-2">Delete Category</h3>
              <p className="text-gothic-400 text-sm mb-6">
                Are you sure you want to delete this photo category? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="btn-secondary flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="btn-error flex-1"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}