'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, FileText, AlertTriangle, Package, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { reportsAPI } from '@/lib/api';

interface Report {
  id: string;
  type: 'OPENING' | 'CLOSING' | 'PROBLEM' | 'STOCK';
  title: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RESOLVED';
  createdAt: string;
  submittedAt?: string;
  resolvedAt?: string;
}

export default function DashboardPage() {
  const { isAuthenticated, user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated]);

  const fetchReports = async () => {
    try {
      const response = await reportsAPI.getReports({ limit: 10 });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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

  if (!isAuthenticated) {
    return null;
  }

  const reportTypeIcons = {
    OPENING: CheckCircle,
    CLOSING: CheckCircle,
    PROBLEM: AlertTriangle,
    STOCK: Package,
  };

  const reportTypeLabels = {
    OPENING: 'Opening',
    CLOSING: 'Closing',
    PROBLEM: 'Problem',
    STOCK: 'Stock',
  };

  const getReportTypeColors = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'text-green-400';
      case 'CLOSING':
        return 'text-orange-400';
      case 'PROBLEM':
        return 'text-red-400';
      case 'STOCK':
        return 'text-blue-400';
      default:
        return 'text-gothic-400';
    }
  };

  const statusColors = {
    DRAFT: 'status-draft',
    SUBMITTED: 'status-submitted',
    RESOLVED: 'status-resolved',
  };

  const recentReports = reports.slice(0, 5);
  const draftReports = reports.filter(r => r.status === 'DRAFT');
  const submittedReports = reports.filter(r => r.status === 'SUBMITTED');

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent-gradient rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Business Reports
                  </h1>
                  <p className="header-subtitle truncate">
                    Welcome back, {user?.name}
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
        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gothic-200 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/reports/create?type=OPENING" className="gothic-card-hover report-opening-bg p-3 text-center group min-h-[80px] flex flex-col justify-center animate-stagger-in stagger-delay-1 hover-lift">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1 group-active:animate-spring transition-transform gpu-accelerated" />
              <h3 className="font-medium text-green-400 mb-1 text-xs">Opening</h3>
              <p className="text-xs text-green-300">Daily procedures</p>
            </Link>

            <Link href="/reports/create?type=CLOSING" className="gothic-card-hover report-closing-bg p-3 text-center group min-h-[80px] flex flex-col justify-center animate-stagger-in stagger-delay-2 hover-lift">
              <CheckCircle className="w-6 h-6 text-orange-400 mx-auto mb-1 group-active:animate-spring transition-transform gpu-accelerated" />
              <h3 className="font-medium text-orange-400 mb-1 text-xs">Closing</h3>
              <p className="text-xs text-orange-300">Daily procedures</p>
            </Link>

            <Link href="/reports/create?type=PROBLEM" className="gothic-card-hover report-problem-bg p-3 text-center group min-h-[80px] flex flex-col justify-center animate-stagger-in stagger-delay-3 hover-lift">
              <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-1 group-active:animate-spring transition-transform gpu-accelerated" />
              <h3 className="font-medium text-red-400 mb-1 text-xs">Problem</h3>
              <p className="text-xs text-red-300">Report issues</p>
            </Link>

            <Link href="/reports/create?type=STOCK" className="gothic-card-hover report-stock-bg p-3 text-center group min-h-[80px] flex flex-col justify-center animate-stagger-in stagger-delay-4 hover-lift">
              <Package className="w-6 h-6 text-blue-400 mx-auto mb-1 group-active:animate-spring transition-transform gpu-accelerated" />
              <h3 className="font-medium text-blue-400 mb-1 text-xs">Stock</h3>
              <p className="text-xs text-blue-300">Inventory</p>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="mobile-card p-3 animate-stagger-in stagger-delay-5 hover-lift scale-tap">
            <div className="text-center">
              <p className="text-xs text-gothic-400 mb-1">Drafts</p>
              <p className="text-lg font-bold text-gothic-100">{draftReports.length}</p>
            </div>
          </div>

          <div className="mobile-card p-3 animate-stagger-in stagger-delay-6 hover-lift scale-tap">
            <div className="text-center">
              <p className="text-xs text-gothic-400 mb-1">Submitted</p>
              <p className="text-lg font-bold text-gothic-100">{submittedReports.length}</p>
            </div>
          </div>

          <div className="mobile-card p-3 animate-stagger-in hover-lift scale-tap" style={{animationDelay: '0.35s'}}>
            <div className="text-center">
              <p className="text-xs text-gothic-400 mb-1">Total</p>
              <p className="text-lg font-bold text-gothic-100">{reports.length}</p>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="mobile-card animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gothic-200">
              Recent Reports
            </h2>
            <Link href="/reports" className="text-accent-400 hover:text-accent-300 text-xs font-medium transition-colors scale-tap">
              View All →
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 text-gothic-500 mx-auto mb-3" />
              <h3 className="text-sm text-gothic-300 mb-1">No reports yet</h3>
              <p className="text-xs text-gothic-400 mb-3">Get started by creating your first report</p>
              <Link href="/reports/create" className="btn-primary text-xs px-3 py-2">
                <Plus className="w-4 h-4 mr-1" />
                Create Report
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map((report, index) => {
                const Icon = reportTypeIcons[report.type];
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-2 bg-gothic-800 rounded-lg scale-tap transition-colors animate-stagger-in gpu-accelerated"
                    style={{animationDelay: `${0.5 + index * 0.1}s`}}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${getReportTypeColors(report.type)} transition-transform gpu-accelerated`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gothic-100 text-xs truncate">{report.title}</h3>
                        <p className="text-xs text-gothic-400 truncate">
                          <span className={getReportTypeColors(report.type)}>{reportTypeLabels[report.type]}</span> • {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex items-center space-x-1">
                        <div className={`status-dot transition-all duration-200 ${
                          report.status === 'DRAFT' ? 'bg-yellow-400' :
                          report.status === 'SUBMITTED' ? 'bg-blue-400' :
                          report.status === 'RESOLVED' ? 'bg-green-400' : 'bg-gothic-500'
                        }`}></div>
                        <span className={`status-text ${
                          report.status === 'DRAFT' ? 'text-yellow-400' :
                          report.status === 'SUBMITTED' ? 'text-blue-400' :
                          report.status === 'RESOLVED' ? 'text-green-400' : 'text-gothic-400'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      {report.status === 'DRAFT' ? (
                        <Link href={`/reports/create?draft=${report.id}`} className="text-accent-400 active:text-accent-300 text-xs font-medium scale-tap">
                          Continue
                        </Link>
                      ) : (
                        <Link href={`/reports/${report.id}`} className="text-accent-400 active:text-accent-300 text-xs font-medium scale-tap">
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
