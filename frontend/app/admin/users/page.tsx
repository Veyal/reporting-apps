'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Shield, User, ArrowLeft, X, SlidersHorizontal, Mail, Lock, UserPlus } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'USER' | 'ADMIN';
  email?: string;
  lastLogin?: string;
  createdAt: string;
  _count?: {
    reports: number;
  };
}

export default function UsersPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempRoleFilter, setTempRoleFilter] = useState('');
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);
  const [showEditUserPopup, setShowEditUserPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN'
  });
  const [editUser, setEditUser] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN'
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
      fetchUsers();
    }
  }, [isAdmin, search, roleFilter]);

  const openFilterPopup = () => {
    setTempSearch(search);
    setTempRoleFilter(roleFilter);
    setShowFilterPopup(true);
  };

  const closeFilterPopup = () => {
    setShowFilterPopup(false);
  };

  const applyFilters = () => {
    setSearch(tempSearch);
    setRoleFilter(tempRoleFilter);
    setShowFilterPopup(false);
  };

  const clearFilters = () => {
    setTempSearch('');
    setTempRoleFilter('');
  };

  const hasActiveFilters = search || roleFilter;

  const openAddUserPopup = () => {
    setNewUser({
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'USER'
    });
    setFormErrors({});
    setShowAddUserPopup(true);
  };

  const closeAddUserPopup = () => {
    setShowAddUserPopup(false);
    setFormErrors({});
  };

  const openEditUserPopup = (user: User) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      name: user.name,
      email: user.email || '',
      password: '',
      role: user.role
    });
    setFormErrors({});
    setShowEditUserPopup(true);
  };

  const closeEditUserPopup = () => {
    setShowEditUserPopup(false);
    setEditingUser(null);
    setFormErrors({});
  };

  const openDeleteConfirm = (userId: string) => {
    setDeletingUserId(userId);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingUserId(null);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newUser.username.trim()) {
      errors.username = 'Username is required';
    } else if (newUser.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!newUser.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (newUser.email && !newUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (newUser.email && !/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!newUser.password) {
      errors.password = 'Password is required';
    } else if (newUser.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!editUser.username.trim()) {
      errors.username = 'Username is required';
    } else if (editUser.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!editUser.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (editUser.email && !editUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (editUser.email && !/\S+@\S+\.\S+/.test(editUser.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (editUser.password && editUser.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateForm()) return;
    
    try {
      setActionLoading(true);
      // Only send required fields to backend
      const userData = {
        username: newUser.username,
        name: newUser.name,
        password: newUser.password,
        role: newUser.role
      };
      const response = await adminAPI.createUser(userData);
      const createdUser = response.data.user || response.data;
      
      // Ensure _count field exists with default value
      const userWithCount = {
        ...createdUser,
        _count: createdUser._count || { reports: 0 }
      };
      
      setUsers(prev => [userWithCount, ...prev]);
      closeAddUserPopup();
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User Created',
        message: `${newUser.name} has been added successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to create user:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create user. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!validateEditForm() || !editingUser) return;
    
    try {
      setActionLoading(true);
      // Only send fields that are supported by backend
      const updateData: any = {
        name: editUser.name,
        role: editUser.role
      };
      if (editUser.password) {
        updateData.password = editUser.password;
      }
      
      const response = await adminAPI.updateUser(editingUser.id, updateData);
      const updatedUser = response.data.user || response.data;
      
      // Ensure _count field exists with default value
      const userWithCount = {
        ...updatedUser,
        _count: updatedUser._count || { reports: 0 }
      };
      
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? userWithCount : user
      ));
      closeEditUserPopup();
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User Updated',
        message: `${editUser.name} has been updated successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to update user:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update user. Please try again.',
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users || response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    
    try {
      setActionLoading(true);
      const deletedUser = users.find(user => user.id === deletingUserId);
      await adminAPI.deleteUser(deletingUserId);
      
      setUsers(prev => prev.filter(user => user.id !== deletingUserId));
      closeDeleteConfirm();
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User Deleted',
        message: `${deletedUser?.name} has been deleted successfully`,
        duration: 4000
      });
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete user. Please try again.',
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
    <div className="min-h-screen bg-gothic-900 pb-20">
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
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    User Management
                  </h1>
                  <p className="header-subtitle truncate">
                    Manage users, roles, and permissions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6">
        {/* Filter Button */}
        <div className="mb-6">
          <button
            onClick={openFilterPopup}
            className={`filter-button w-full ${
              hasActiveFilters ? 'filter-button-active' : 'filter-button-inactive'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium">
              {hasActiveFilters ? 'Filters Applied' : 'Search & Filter'}
            </span>
            {hasActiveFilters && (
              <div className="ml-auto flex items-center space-x-1">
                <span className="text-xs bg-accent-500 text-white px-2 py-0.5 rounded-full">
                  {[search, roleFilter].filter(Boolean).length}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Users Cards */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gothic-300">
              {users.length} user{users.length !== 1 ? 's' : ''} found
            </h2>
          </div>
        </div>
        
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="mobile-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gothic-700 rounded-full flex items-center justify-center flex-shrink-0">
                    {user.role === 'ADMIN' ? (
                      <Shield className="w-6 h-6 text-accent-500" />
                    ) : (
                      <User className="w-6 h-6 text-gothic-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gothic-100 text-sm truncate">{user.name}</h3>
                      <span className={`badge-small ${
                        user.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-gothic-400 mb-2">@{user.username}</p>
                    
                    <div className="text-xs">
                      <div>
                        <span className="text-gothic-500">Reports:</span>
                        <span className="text-gothic-300 ml-1">{user._count?.reports || 0}</span>
                      </div>
                      <div>
                        <span className="text-gothic-500">Created:</span>
                        <span className="text-gothic-300 ml-1">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2 ml-3">
                  {/* Status Info */}
                  <div className="text-right text-xs">
                    <div className="mb-1">
                      <span className="text-gothic-500">Last Login:</span>
                      <span className={`ml-1 ${
                        user.lastLogin ? 'text-green-400' : 'text-gothic-500'
                      }`}>
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => openEditUserPopup(user)}
                      className="w-8 h-8 bg-gothic-700 hover:bg-gothic-600 rounded-lg flex items-center justify-center transition-colors"
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4 text-accent-400" />
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm(user.id)}
                      className="w-8 h-8 bg-gothic-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gothic-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gothic-500" />
            </div>
            <h3 className="text-sm font-medium text-gothic-300 mb-2">No users found</h3>
            <p className="text-xs text-gothic-400 mb-4">
              {search || roleFilter 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first user'
              }
            </p>
            <button 
              onClick={openAddUserPopup}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={openAddUserPopup}
        className="fixed bottom-24 right-4 bg-accent-500 hover:bg-accent-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 z-[60] px-4 py-3"
      >
        <Plus className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Add</span>
      </button>

      {/* Filter Popup */}
      {showFilterPopup && (
        <div className="filter-popup" onClick={closeFilterPopup}>
          <div className="filter-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gothic-100">Search & Filter</h3>
              <button
                onClick={closeFilterPopup}
                className="text-gothic-400 hover:text-gothic-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="filter-section">
              <h4 className="filter-section-title">Search</h4>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gothic-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  className="input-gothic pl-8 w-full text-sm py-2"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title">Role</h4>
              <div className="space-y-1">
                {[
                  { value: '', label: 'All Roles', icon: User },
                  { value: 'ADMIN', label: 'Admin', icon: Shield },
                  { value: 'USER', label: 'User', icon: User },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      onClick={() => setTempRoleFilter(option.value)}
                      className={`filter-option ${
                        tempRoleFilter === option.value ? 'filter-option-active' : 'filter-option-inactive'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${
                        tempRoleFilter === option.value ? 'text-accent-400' : 'text-gothic-400'
                      }`} />
                      <span className={`text-xs ${
                        tempRoleFilter === option.value ? 'text-accent-400' : 'text-gothic-300'
                      }`}>
                        {option.label}
                      </span>
                      {tempRoleFilter === option.value && (
                        <div className="ml-auto w-1.5 h-1.5 bg-accent-500 rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={clearFilters}
                className="btn-secondary flex-1 text-xs py-2"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="btn-primary flex-1 text-xs py-2"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Popup */}
      {showAddUserPopup && (
        <div className="filter-popup" onClick={closeAddUserPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Add New User</h3>
              </div>
              <button
                onClick={closeAddUserPopup}
                className="text-gothic-400 hover:text-gothic-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">
                  Username *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className={`input-gothic pl-10 w-full ${formErrors.username ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.username && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className={`input-gothic pl-10 w-full ${formErrors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className={`input-gothic pl-10 w-full ${formErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className={`input-gothic pl-10 w-full ${formErrors.password ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gothic-300 mb-2">
                  Role
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'USER', label: 'User', icon: User, description: 'Standard user access' },
                    { value: 'ADMIN', label: 'Admin', icon: Shield, description: 'Full administrative access' },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.value}
                        onClick={() => setNewUser(prev => ({ ...prev, role: option.value as 'USER' | 'ADMIN' }))}
                        className={`filter-option ${
                          newUser.role === option.value ? 'filter-option-active' : 'filter-option-inactive'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${
                          newUser.role === option.value ? 'text-accent-400' : 'text-gothic-400'
                        }`} />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            newUser.role === option.value ? 'text-accent-400' : 'text-gothic-300'
                          }`}>
                            {option.label}
                          </span>
                          <p className={`text-xs ${
                            newUser.role === option.value ? 'text-accent-300' : 'text-gothic-500'
                          }`}>
                            {option.description}
                          </p>
                        </div>
                        {newUser.role === option.value && (
                          <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeAddUserPopup}
                className="btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={actionLoading}
                className="btn-primary flex-1 py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Popup */}
      {showEditUserPopup && editingUser && (
        <div className="filter-popup" onClick={closeEditUserPopup}>
          <div className="filter-content max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Edit User</h3>
              </div>
              <button
                onClick={closeEditUserPopup}
                className="text-gothic-400 hover:text-gothic-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">
                  Username *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={editUser.username}
                    onChange={(e) => setEditUser(prev => ({ ...prev, username: e.target.value }))}
                    className={`input-gothic pl-10 w-full text-sm py-2 ${formErrors.username ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.username && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={editUser.name}
                    onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                    className={`input-gothic pl-10 w-full text-sm py-2 ${formErrors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={editUser.email}
                    onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                    className={`input-gothic pl-10 w-full text-sm py-2 ${formErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gothic-400 w-4 h-4" />
                  <input
                    type="password"
                    placeholder="Leave empty to keep current password"
                    value={editUser.password}
                    onChange={(e) => setEditUser(prev => ({ ...prev, password: e.target.value }))}
                    className={`input-gothic pl-10 w-full text-sm py-2 ${formErrors.password ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>
                )}
                <p className="text-gothic-500 text-xs mt-1">Leave empty to keep current password</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gothic-300 mb-2">
                  Role
                </label>
                <div className="space-y-1">
                  {[
                    { value: 'USER', label: 'User', icon: User },
                    { value: 'ADMIN', label: 'Admin', icon: Shield },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.value}
                        onClick={() => setEditUser(prev => ({ ...prev, role: option.value as 'USER' | 'ADMIN' }))}
                        className={`filter-option py-2 px-3 ${
                          editUser.role === option.value ? 'filter-option-active' : 'filter-option-inactive'
                        }`}
                      >
                        <Icon className={`w-3 h-3 ${
                          editUser.role === option.value ? 'text-accent-400' : 'text-gothic-400'
                        }`} />
                        <span className={`text-xs ${
                          editUser.role === option.value ? 'text-accent-400' : 'text-gothic-300'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeEditUserPopup}
                className="btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={actionLoading}
                className="btn-primary flex-1 py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && deletingUserId && (
        <div className="filter-popup" onClick={closeDeleteConfirm}>
          <div className="filter-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gothic-100">Delete User</h3>
              </div>
              <button
                onClick={closeDeleteConfirm}
                className="text-gothic-400 hover:text-gothic-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gothic-300 text-sm mb-4">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              {(() => {
                const user = users.find(u => u.id === deletingUserId);
                return user ? (
                  <div className="bg-gothic-700/50 rounded-lg p-3 border border-gothic-600">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gothic-600 rounded-full flex items-center justify-center">
                        {user.role === 'ADMIN' ? (
                          <Shield className="w-4 h-4 text-accent-500" />
                        ) : (
                          <User className="w-4 h-4 text-gothic-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-gothic-100 text-sm font-medium">{user.name}</p>
                        <p className="text-gothic-400 text-xs">@{user.username}</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={closeDeleteConfirm}
                className="btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="btn-danger flex-1 py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
