'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, Settings, BarChart3, FileText, Image, CheckSquare } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';

export default function AdminPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    reportsByType: {},
    reportsByStatus: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      const data = response.data;

      setStats({
        totalUsers: data.userStats?.USER + data.userStats?.ADMIN || 0,
        totalReports: data.totalReports || 0,
        reportsByType: data.reportsByType || {},
        reportsByStatus: data.reportsByStatus || {},
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
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

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'text-accent-500',
    },
    {
      title: 'Checklist Templates',
      description: 'Configure checklist templates',
      icon: CheckSquare,
      href: '/admin/checklists',
      color: 'text-success',
    },
    {
      title: 'Photo Categories',
      description: 'Manage photo upload categories',
      icon: Image,
      href: '/admin/photo-categories',
      color: 'text-warning',
    },
    {
      title: 'System Settings',
      description: 'Configure system parameters',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-gothic-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Admin Panel
                  </h1>
                  <p className="header-subtitle truncate">
                    System management and configuration
                  </p>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <span className="header-badge">
                Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gothic-400 mb-1">Total Users</p>
                <p className="text-xl font-bold text-gothic-100">{stats.totalUsers}</p>
              </div>
              <Users className="w-5 h-5 text-accent-500" />
            </div>
          </div>
          
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gothic-400 mb-1">Total Reports</p>
                <p className="text-xl font-bold text-gothic-100">{stats.totalReports}</p>
              </div>
              <FileText className="w-5 h-5 text-green-500" />
            </div>
          </div>
          
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gothic-400 mb-1">Draft Reports</p>
                <p className="text-xl font-bold text-gothic-100">{stats.reportsByStatus.DRAFT}</p>
              </div>
              <FileText className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gothic-400 mb-1">Resolved</p>
                <p className="text-xl font-bold text-gothic-100">{stats.reportsByStatus.RESOLVED}</p>
              </div>
              <CheckSquare className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        {/* Admin Sections */}
        <div className="space-y-3 mb-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                onClick={() => router.push(section.href)}
                className="mobile-card p-4 group active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-6 h-6 ${section.color} group-active:scale-110 transition-transform`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gothic-100 group-active:text-accent-400 transition-colors truncate">
                      {section.title}
                    </h3>
                    <p className="text-xs text-gothic-400 truncate">{section.description}</p>
                  </div>
                  <div className="text-gothic-500 group-active:text-accent-400 transition-colors">
                    →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reports by Type */}
        <div className="mobile-card">
          <h2 className="text-sm font-semibold text-gothic-200 mb-4">
            Reports by Type
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.reportsByType).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gothic-800 rounded-lg">
                <div className="text-lg font-bold text-gothic-100 mb-1">{count}</div>
                <div className="text-xs text-gothic-400 capitalize">{type.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
