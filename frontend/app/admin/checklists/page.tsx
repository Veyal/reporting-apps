'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, ArrowLeft, CheckSquare, X, SlidersHorizontal, GripVertical } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChecklistTemplate {
  id: string;
  type: 'OPENING' | 'CLOSING';
  title: string;
  order: number;
  required: boolean;
  createdAt: string;
}

// Sortable Item Component
function SortableChecklistItem({
  item,
  onEdit,
  onDelete
}: {
  item: ChecklistTemplate;
  onEdit: (item: ChecklistTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gothic-card p-3 hover:bg-gothic-700 transition-colors ${
        isDragging ? 'shadow-xl z-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          className="cursor-grab active:cursor-grabbing touch-none mt-2"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-gothic-500 hover:text-gothic-300" />
        </button>

        <div className="w-8 h-8 bg-gothic-700 rounded flex items-center justify-center flex-shrink-0 mt-2">
          <span className="text-gothic-300 font-mono text-xs font-bold">{item.order}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* First line: Title only */}
          <div className="mb-2">
            <h3 className="text-gothic-100 font-medium text-sm">
              {item.title}
            </h3>
          </div>

          {/* Second line: Badge and buttons */}
          <div className="flex items-center justify-between">
            <span className={`badge-small ${
              item.required ? 'badge-error' : 'badge-secondary'
            }`}>
              {item.required ? 'Required' : 'Optional'}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(item)}
                className="w-7 h-7 bg-gothic-700 hover:bg-gothic-600 rounded flex items-center justify-center transition-colors"
              >
                <Edit className="w-3 h-3 text-accent-400" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="w-7 h-7 bg-gothic-700 hover:bg-red-900/20 rounded flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChecklistsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempTypeFilter, setTempTypeFilter] = useState('');
  const [showAddChecklistPopup, setShowAddChecklistPopup] = useState(false);
  const [showEditChecklistPopup, setShowEditChecklistPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistTemplate | null>(null);
  const [deletingChecklistId, setDeletingChecklistId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    type: 'OPENING' as 'OPENING' | 'CLOSING',
    title: '',
    order: 0,
    required: false
  });
  const [editChecklist, setEditChecklist] = useState({
    type: 'OPENING' as 'OPENING' | 'CLOSING',
    title: '',
    order: 0,
    required: false
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchChecklists();
    }
  }, [isAdmin, search, typeFilter]);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      
      const response = await adminAPI.getChecklists(params);
      setChecklists(response.data.checklists || response.data);
    } catch (error) {
      console.error('Failed to fetch checklists:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load checklist templates. Please try again.',
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

  // Add checklist functions
  const openAddChecklistPopup = () => {
    // Always set order to last position (will be calculated when type changes)
    const openingCount = checklists.filter(c => c.type === 'OPENING').length;
    setNewChecklist({
      type: 'OPENING',
      title: '',
      order: openingCount + 1,
      required: false
    });
    setFormErrors({});
    setShowAddChecklistPopup(true);
  };

  const closeAddChecklistPopup = () => {
    setShowAddChecklistPopup(false);
    setFormErrors({});
  };

  // Edit checklist functions
  const openEditChecklistPopup = (checklist: ChecklistTemplate) => {
    setEditingChecklist(checklist);
    setEditChecklist({
      type: checklist.type,
      title: checklist.title,
      order: checklist.order,
      required: checklist.required
    });
    setFormErrors({});
    setShowEditChecklistPopup(true);
  };

  const closeEditChecklistPopup = () => {
    setShowEditChecklistPopup(false);
    setEditingChecklist(null);
    setFormErrors({});
  };

  // Delete confirmation functions
  const openDeleteConfirm = (id: string) => {
    setDeletingChecklistId(id);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingChecklistId(null);
  };

  // Form validation
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!newChecklist.title.trim()) {
      errors.title = 'Title is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: {[key: string]: string} = {};

    if (!editChecklist.title.trim()) {
      errors.title = 'Title is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleAddChecklist = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading(true);
      // Ensure order is at the last position for the selected type
      const typeCount = checklists.filter(c => c.type === newChecklist.type).length;
      const checklistData = {
        ...newChecklist,
        order: typeCount + 1
      };

      const response = await adminAPI.createChecklist(checklistData);
      const createdChecklist = response.data.checklist || response.data;
      
      setChecklists(prev => [createdChecklist, ...prev]);
      closeAddChecklistPopup();
      
      showToast({
        type: 'success',
        title: 'Template Created',
        message: `${newChecklist.title} has been added successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to create checklist:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create template. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditChecklist = async () => {
    if (!validateEditForm() || !editingChecklist) return;
    
    try {
      setActionLoading(true);
      const response = await adminAPI.updateChecklist(editingChecklist.id, editChecklist);
      const updatedChecklist = response.data.checklist || response.data;
      
      setChecklists(prev => prev.map(item => 
        item.id === editingChecklist.id ? updatedChecklist : item
      ));
      closeEditChecklistPopup();
      
      showToast({
        type: 'success',
        title: 'Template Updated',
        message: `${editChecklist.title} has been updated successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to update checklist:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update template. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent, type: 'OPENING' | 'CLOSING') => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const typeChecklists = checklists.filter(c => c.type === type);
    const oldIndex = typeChecklists.findIndex(item => item.id === active.id);
    const newIndex = typeChecklists.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update local state immediately for smooth UX
    const reorderedTypeChecklists = arrayMove(typeChecklists, oldIndex, newIndex);

    // Update orders
    const updatedTypeChecklists = reorderedTypeChecklists.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    // Update the main checklists state
    setChecklists(prev => {
      const otherTypeChecklists = prev.filter(c => c.type !== type);
      return [...otherTypeChecklists, ...updatedTypeChecklists].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.order - b.order;
      });
    });

    // Save to backend
    try {
      setIsSavingOrder(true);
      const updateData = updatedTypeChecklists.map(item => ({
        id: item.id,
        order: item.order
      }));

      await adminAPI.updateChecklistOrder(updateData);

      showToast({
        type: 'success',
        title: 'Order Updated',
        message: 'Checklist order has been updated',
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      // Revert on error
      fetchChecklists();
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update order. Please try again.',
        duration: 5000
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDeleteChecklist = async () => {
    if (!deletingChecklistId) return;
    
    try {
      setActionLoading(true);
      const deletedChecklist = checklists.find(item => item.id === deletingChecklistId);
      await adminAPI.deleteChecklist(deletingChecklistId);
      
      setChecklists(prev => prev.filter(item => item.id !== deletingChecklistId));
      closeDeleteConfirm();
      
      showToast({
        type: 'success',
        title: 'Template Deleted',
        message: `${deletedChecklist?.title} has been deleted successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to delete checklist:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete template. Please try again.',
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
                  <CheckSquare className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Checklist Templates
                  </h1>
                  <p className="header-subtitle truncate">
                    Manage checklist templates for reports
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

        {/* Grouped Checklists */}
        {['OPENING', 'CLOSING'].map(type => {
          const typeChecklists = checklists
            .filter(c => c.type === type)
            .sort((a, b) => a.order - b.order);

          if (typeChecklists.length === 0) return null;

          return (
            <div key={type} className="mb-8">
              <div className="flex items-center mb-4">
                <span className={`badge-small ${type === 'OPENING' ? 'badge-primary' : 'badge-warning'} mr-3`}>
                  {type}
                </span>
                <h2 className="text-sm font-medium text-gothic-300">
                  {type === 'OPENING' ? 'Opening Checklists' : 'Closing Checklists'}
                </h2>
                <span className="ml-auto text-xs text-gothic-400">
                  {typeChecklists.length} template{typeChecklists.length !== 1 ? 's' : ''}
                </span>
                {isSavingOrder && (
                  <span className="text-xs text-accent-400 ml-2">Saving...</span>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, type as 'OPENING' | 'CLOSING')}
              >
                <SortableContext
                  items={typeChecklists.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {typeChecklists.map((item) => (
                      <SortableChecklistItem
                        key={item.id}
                        item={item}
                        onEdit={openEditChecklistPopup}
                        onDelete={openDeleteConfirm}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}

        {checklists.length === 0 && (
          <div className="gothic-card p-12 text-center">
            <div className="w-12 h-12 bg-gothic-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-6 h-6 text-gothic-400" />
            </div>
            <h3 className="text-sm font-medium text-gothic-300 mb-2">No templates found</h3>
            <p className="text-xs text-gothic-400 mb-6">
              {search || typeFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first checklist template'
              }
            </p>
            {!search && !typeFilter && (
              <button
                onClick={openAddChecklistPopup}
                className="btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Template
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={openAddChecklistPopup}
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
                    placeholder="Search templates..."
                    className="input-gothic w-full pl-9 text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gothic-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">Type</label>
                <select
                  value={tempTypeFilter}
                  onChange={(e) => setTempTypeFilter(e.target.value)}
                  className="input-gothic w-full text-sm"
                >
                  <option value="">All Types</option>
                  <option value="OPENING">Opening</option>
                  <option value="CLOSING">Closing</option>
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

      {/* Add Checklist Popup */}
      {showAddChecklistPopup && (
        <div className="filter-popup" onClick={closeAddChecklistPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Add New Template</h3>
              </div>
              <button
                onClick={closeAddChecklistPopup}
                className="text-gothic-400 hover:text-gothic-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Type *</label>
                <select
                  value={newChecklist.type}
                  onChange={(e) => {
                    const type = e.target.value as 'OPENING' | 'CLOSING';
                    const typeCount = checklists.filter(c => c.type === type).length;
                    setNewChecklist({
                      ...newChecklist,
                      type,
                      order: typeCount + 1
                    });
                  }}
                  className="input-gothic w-full"
                >
                  <option value="OPENING">Opening</option>
                  <option value="CLOSING">Closing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newChecklist.title}
                  onChange={(e) => setNewChecklist({ ...newChecklist, title: e.target.value })}
                  placeholder="Enter checklist title"
                  className={`input-gothic w-full ${formErrors.title ? 'border-red-500' : ''}`}
                />
                {formErrors.title && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="required"
                  checked={newChecklist.required}
                  onChange={(e) => setNewChecklist({ ...newChecklist, required: e.target.checked })}
                  className="w-4 h-4 text-accent-500 bg-gothic-800 border-gothic-600 rounded focus:ring-accent-500"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gothic-300">
                  Required checklist item
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeAddChecklistPopup}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddChecklist}
                className="btn-primary flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Checklist Popup */}
      {showEditChecklistPopup && editingChecklist && (
        <div className="filter-popup" onClick={closeEditChecklistPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Edit Template</h3>
              </div>
              <button
                onClick={closeEditChecklistPopup}
                className="text-gothic-400 hover:text-gothic-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Type *</label>
                <select
                  value={editChecklist.type}
                  onChange={(e) => setEditChecklist({ ...editChecklist, type: e.target.value as 'OPENING' | 'CLOSING' })}
                  className="input-gothic w-full"
                >
                  <option value="OPENING">Opening</option>
                  <option value="CLOSING">Closing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={editChecklist.title}
                  onChange={(e) => setEditChecklist({ ...editChecklist, title: e.target.value })}
                  placeholder="Enter checklist title"
                  className={`input-gothic w-full ${formErrors.title ? 'border-red-500' : ''}`}
                />
                {formErrors.title && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editRequired"
                  checked={editChecklist.required}
                  onChange={(e) => setEditChecklist({ ...editChecklist, required: e.target.checked })}
                  className="w-4 h-4 text-accent-500 bg-gothic-800 border-gothic-600 rounded focus:ring-accent-500"
                />
                <label htmlFor="editRequired" className="ml-2 text-sm text-gothic-300">
                  Required checklist item
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeEditChecklistPopup}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditChecklist}
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
      {showDeleteConfirm && deletingChecklistId && (
        <div className="filter-popup" onClick={closeDeleteConfirm}>
          <div className="filter-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gothic-100 mb-2">Delete Template</h3>
              <p className="text-gothic-400 text-sm mb-6">
                Are you sure you want to delete this checklist template? This action cannot be undone.
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
                  onClick={handleDeleteChecklist}
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
