'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar, LogOut, Lock, Eye, EyeOff, Activity, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { authAPI } from '@/lib/api';

export default function ProfilePage() {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    // Redirect will happen automatically due to auth state change
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'New passwords do not match',
        duration: 3000
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Password must be at least 8 characters',
        duration: 3000
      });
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Password changed successfully',
        duration: 4000
      });
      setShowChangePassword(false);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to change password',
        duration: 5000
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Profile
                  </h1>
                  <p className="header-subtitle truncate">
                    Manage your account settings
                  </p>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <span className="header-badge">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6">
        {/* Profile Info Card */}
        <div className="gothic-card p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-accent-gradient rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gothic-100">{user?.name}</h2>
                <p className="text-xs text-gothic-400">@{user?.username}</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-accent-500/20 text-accent-400 rounded-lg text-xs font-medium">
              {user?.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gothic-800 rounded-lg p-3">
              <div className="flex items-center mb-1">
                <Mail className="w-4 h-4 text-gothic-400 mr-2" />
                <p className="text-xs text-gothic-400">Email</p>
              </div>
              <p className="text-xs text-gothic-200 truncate">{user?.username || 'N/A'}</p>
            </div>

            <div className="bg-gothic-800 rounded-lg p-3">
              <div className="flex items-center mb-1">
                <Calendar className="w-4 h-4 text-gothic-400 mr-2" />
                <p className="text-xs text-gothic-400">Joined</p>
              </div>
              <p className="text-xs text-gothic-200">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
              </p>
            </div>

            <div className="bg-gothic-800 rounded-lg p-3">
              <div className="flex items-center mb-1">
                <Activity className="w-4 h-4 text-gothic-400 mr-2" />
                <p className="text-xs text-gothic-400">Status</p>
              </div>
              <p className="text-xs text-green-400">Active</p>
            </div>

            <div className="bg-gothic-800 rounded-lg p-3">
              <div className="flex items-center mb-1">
                <Clock className="w-4 h-4 text-gothic-400 mr-2" />
                <p className="text-xs text-gothic-400">Last Login</p>
              </div>
              <p className="text-xs text-gothic-200">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Just now'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="gothic-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Lock className="w-4 h-4 text-gothic-400 mr-2" />
              <h3 className="text-sm font-medium text-gothic-300">Security</h3>
            </div>
          </div>

          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full py-2 px-3 bg-gothic-700 hover:bg-gothic-600 rounded-lg text-sm text-gothic-200 transition-colors"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gothic-400 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.old ? 'text' : 'password'}
                    value={passwords.oldPassword}
                    onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                    className="input-gothic w-full text-sm pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gothic-400 hover:text-gothic-200"
                  >
                    {showPasswords.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gothic-400 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="input-gothic w-full text-sm pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gothic-400 hover:text-gothic-200"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gothic-400 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="input-gothic w-full text-sm pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gothic-400 hover:text-gothic-200"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="py-2 px-3 bg-gothic-700 hover:bg-gothic-600 rounded-lg text-sm text-gothic-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword}
                  className="py-2 px-3 bg-accent-500 hover:bg-accent-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {changingPassword ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="gothic-card p-4">
          <div className="flex items-center mb-3">
            <LogOut className="w-4 h-4 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-gothic-300">Session</h3>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}