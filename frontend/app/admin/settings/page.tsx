'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, RefreshCw, Database, Shield, Upload, Settings, Bell, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';

export default function SettingsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    systemName: 'Business Reporting App',
    maxFileSize: 10,
    maxFilesPerUpload: 10,
    sessionTimeout: 15,
    refreshTokenDays: 7,
    enableNotifications: true,
    enableAutoBackup: true,
    backupFrequency: 'daily',
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({...settings});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    // Fetch settings from backend
    const fetchSettings = async () => {
      try {
        const response = await adminAPI.getSettings();
        const data = response.data;
        const formattedSettings = {
          systemName: data.systemName,
          maxFileSize: data.maxFileSize,
          maxFilesPerUpload: data.maxFilesPerUpload,
          sessionTimeout: data.sessionTimeout,
          refreshTokenDays: data.refreshTokenDays,
          enableNotifications: data.enableNotifications,
          enableAutoBackup: data.enableAutoBackup,
          backupFrequency: data.backupFrequency,
        };
        setSettings(formattedSettings);
        setOriginalSettings(formattedSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load settings',
          duration: 5000
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchSettings();
    }
  }, [isAuthenticated, isAdmin, showToast]);

  useEffect(() => {
    // Check if settings have changed
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      setOriginalSettings({...settings});
      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'System settings have been updated successfully',
        duration: 4000
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save settings. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({...originalSettings});
    showToast({
      type: 'info',
      title: 'Settings Reset',
      message: 'All changes have been reverted',
      duration: 3000
    });
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
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    System Settings
                  </h1>
                  <p className="header-subtitle truncate">
                    Configure system preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6 pb-24">
        {/* Settings Groups */}
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <div className="flex items-center mb-3">
              <Globe className="w-4 h-4 text-gothic-400 mr-2" />
              <h2 className="text-sm font-medium text-gothic-300">General</h2>
            </div>
            <div className="gothic-card p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gothic-400 mb-1">System Name</label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                    className="input-gothic w-full text-sm"
                    placeholder="Enter system name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Settings */}
          <div>
            <div className="flex items-center mb-3">
              <Upload className="w-4 h-4 text-gothic-400 mr-2" />
              <h2 className="text-sm font-medium text-gothic-300">File Upload</h2>
            </div>
            <div className="gothic-card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gothic-400 mb-1">Max Size (MB)</label>
                  <input
                    type="number"
                    value={settings.maxFileSize}
                    onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 1 })}
                    className="input-gothic w-full text-sm"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gothic-400 mb-1">Max Files</label>
                  <input
                    type="number"
                    value={settings.maxFilesPerUpload}
                    onChange={(e) => setSettings({ ...settings, maxFilesPerUpload: parseInt(e.target.value) || 1 })}
                    className="input-gothic w-full text-sm"
                    min="1"
                    max="50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div>
            <div className="flex items-center mb-3">
              <Shield className="w-4 h-4 text-gothic-400 mr-2" />
              <h2 className="text-sm font-medium text-gothic-300">Security</h2>
            </div>
            <div className="gothic-card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gothic-400 mb-1">Session (min)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 5 })}
                    className="input-gothic w-full text-sm"
                    min="5"
                    max="60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gothic-400 mb-1">Token (days)</label>
                  <input
                    type="number"
                    value={settings.refreshTokenDays}
                    onChange={(e) => setSettings({ ...settings, refreshTokenDays: parseInt(e.target.value) || 1 })}
                    className="input-gothic w-full text-sm"
                    min="1"
                    max="30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <div className="flex items-center mb-3">
              <Bell className="w-4 h-4 text-gothic-400 mr-2" />
              <h2 className="text-sm font-medium text-gothic-300">Notifications</h2>
            </div>
            <div className="gothic-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gothic-100">Enable Notifications</p>
                  <p className="text-xs text-gothic-400 mt-0.5">Show toast notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gothic-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div>
            <div className="flex items-center mb-3">
              <Database className="w-4 h-4 text-gothic-400 mr-2" />
              <h2 className="text-sm font-medium text-gothic-300">Backup</h2>
            </div>
            <div className="gothic-card p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gothic-100">Auto Backup</p>
                    <p className="text-xs text-gothic-400 mt-0.5">Automatically backup data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableAutoBackup}
                      onChange={(e) => setSettings({ ...settings, enableAutoBackup: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gothic-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
                  </label>
                </div>

                {settings.enableAutoBackup && (
                  <div>
                    <label className="block text-xs font-medium text-gothic-400 mb-1">Frequency</label>
                    <select
                      value={settings.backupFrequency}
                      onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                      className="input-gothic w-full text-sm"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Floating Action Buttons */}
      {hasChanges && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-2">
          <button
            onClick={handleReset}
            className="bg-gothic-700 hover:bg-gothic-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 z-[60] px-4 py-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent-500 hover:bg-accent-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 z-[60] px-4 py-3 disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="text-sm font-medium ml-2">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Save</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}