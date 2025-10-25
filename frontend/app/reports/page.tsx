'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, Filter, FileText, AlertTriangle, Package, CheckCircle, ArrowLeft, X, SlidersHorizontal, Clock, Edit } from 'lucide-react';
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
  user: {
    name: string;
    username: string;
  };
}

export default function ReportsPage() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [groupedReports, setGroupedReports] = useState<{[key: string]: Report[]}>({});
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempFilterType, setTempFilterType] = useState('');
  const [tempFilterStatus, setTempFilterStatus] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated, search, filterType, filterStatus]);

  const groupReportsByDate = (reports: Report[]) => {
    const grouped: {[key: string]: Report[]} = {};
    
    reports.forEach(report => {
      const date = new Date(report.createdAt);
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(report);
    });
    
    // Sort reports within each date group by creation time (newest first)
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    
    return grouped;
  };

  const openFilterPopup = () => {
    setTempSearch(search);
    setTempFilterType(filterType);
    setTempFilterStatus(filterStatus);
    setShowFilterPopup(true);
  };

  const closeFilterPopup = () => {
    setShowFilterPopup(false);
  };

  const applyFilters = () => {
    setSearch(tempSearch);
    setFilterType(tempFilterType);
    setFilterStatus(tempFilterStatus);
    setShowFilterPopup(false);
  };

  const clearFilters = () => {
    setTempSearch('');
    setTempFilterType('');
    setTempFilterStatus('');
  };

  const hasActiveFilters = search || filterType || filterStatus;

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;

      const response = await reportsAPI.getReports(params);
      // Sort reports: unresolved problems first, then drafts, then by submitted date
      const sortedReports = response.data.reports.sort((a: Report, b: Report) => {
        // Unresolved problem reports go first (highest priority)
        const aIsUnresolvedProblem = a.type === 'PROBLEM' && a.status === 'SUBMITTED';
        const bIsUnresolvedProblem = b.type === 'PROBLEM' && b.status === 'SUBMITTED';

        if (aIsUnresolvedProblem && !bIsUnresolvedProblem) return -1;
        if (!aIsUnresolvedProblem && bIsUnresolvedProblem) return 1;

        // Then drafts
        if (!a.submittedAt && b.submittedAt) return -1;
        if (a.submittedAt && !b.submittedAt) return 1;

        // Both submitted or both drafts - sort by date
        if (a.submittedAt && b.submittedAt) {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        }
        // Both drafts - sort by created date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setReports(sortedReports);
      setGroupedReports(groupReportsByDate(sortedReports));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getReportTypeBgColors = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'report-opening-bg';
      case 'CLOSING':
        return 'report-closing-bg';
      case 'PROBLEM':
        return 'report-problem-bg';
      case 'STOCK':
        return 'report-stock-bg';
      default:
        return 'bg-gothic-800';
    }
  };

  const statusColors = {
    DRAFT: 'status-draft',
    SUBMITTED: 'status-submitted',
    RESOLVED: 'status-resolved',
  };

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    All Reports
                  </h1>
                  <p className="header-subtitle truncate">
                    Manage and view all reports
                  </p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="header-actions">
                <span className="header-badge">
                  ADMIN
                </span>
              </div>
            )}
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
                  {[search, filterType, filterStatus].filter(Boolean).length}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Reports Cards */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gothic-300">
              {reports.length} report{reports.length !== 1 ? 's' : ''} found
            </h2>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gothic-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gothic-500" />
            </div>
            <h3 className="text-sm font-medium text-gothic-300 mb-2">No reports found</h3>
            <p className="text-xs text-gothic-400 mb-4">
              {search || filterType || filterStatus
                ? 'Try adjusting your filters'
                : 'Get started by creating your first report'
              }
            </p>
            <Link href="/reports/create" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => {
              const Icon = reportTypeIcons[report.type];

              // Check if we need to show a date divider
              const currentDate = report.submittedAt ?
                new Date(report.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                'Draft Reports';

              const previousReport = index > 0 ? reports[index - 1] : null;
              const previousDate = previousReport ?
                (previousReport.submittedAt ?
                  new Date(previousReport.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                  'Draft Reports'
                ) : null;

              const showDateDivider = !previousDate || currentDate !== previousDate;

              return (
                <div key={report.id}>
                  {/* Date Divider */}
                  {showDateDivider && (
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-px bg-gothic-700 flex-1" />
                      <span className="text-xs font-medium text-gothic-400 px-2">
                        {currentDate}
                      </span>
                      <div className="h-px bg-gothic-700 flex-1" />
                    </div>
                  )}

                  {/* Report Card - Color coded based on status and highlight unresolved problems */}
                  <div className={`mobile-card transition-all duration-200 ${
                    report.type === 'PROBLEM' && report.status === 'SUBMITTED' ?
                      'border-l-4 border-l-red-500 bg-red-500/10 ring-2 ring-red-500/20 animate-pulse-subtle' :
                    report.status === 'DRAFT' ? 'border-l-4 border-l-yellow-400/50 bg-yellow-400/5' :
                    report.status === 'SUBMITTED' ? 'border-l-4 border-l-blue-400/50' :
                    report.status === 'RESOLVED' ? 'border-l-4 border-l-green-400/50 bg-green-400/5' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getReportTypeBgColors(report.type)}`}>
                          <Icon className={`w-6 h-6 ${getReportTypeColors(report.type)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gothic-100 text-sm truncate">{report.title}</h3>
                          </div>
                          <p className="text-xs text-gothic-400 mb-2">{reportTypeLabels[report.type]} • By {report.user.name}</p>

                          <div className="text-xs text-gothic-300">
                            {report.submittedAt ? (
                              <>
                                Submitted {new Date(report.submittedAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {report.resolvedAt && (
                                  <span className="text-success ml-2">
                                    • Resolved
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gothic-400">
                                Not submitted yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 ml-3">
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1">
                          {report.status === 'DRAFT' && (
                            <Link
                              href={`/reports/create?draft=${report.id}`}
                              className="w-8 h-8 bg-gothic-700 hover:bg-gothic-600 rounded-lg flex items-center justify-center transition-colors"
                              title="Continue draft"
                            >
                              <Edit className="w-4 h-4 text-accent-400" />
                            </Link>
                          )}
                          <Link
                            href={`/reports/${report.id}`}
                            className="w-8 h-8 bg-gothic-700 hover:bg-gothic-600 rounded-lg flex items-center justify-center transition-colors"
                            title="View report"
                          >
                            <FileText className="w-4 h-4 text-gothic-400" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
                  placeholder="Search reports..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  className="input-gothic pl-8 w-full text-sm py-2"
                />
              </div>
            </div>

            {/* Report Type */}
            <div className="filter-section">
              <h4 className="filter-section-title">Report Type</h4>
              <div className="space-y-1">
                {[
                  { value: '', label: 'All Types', icon: FileText },
                  { value: 'OPENING', label: 'Opening', icon: CheckCircle },
                  { value: 'CLOSING', label: 'Closing', icon: Clock },
                  { value: 'PROBLEM', label: 'Problem', icon: AlertTriangle },
                  { value: 'STOCK', label: 'Stock', icon: Package },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      onClick={() => setTempFilterType(option.value)}
                      className={`filter-option ${
                        tempFilterType === option.value ? 'filter-option-active' : 'filter-option-inactive'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${
                        tempFilterType === option.value ? 'text-accent-400' : 'text-gothic-400'
                      }`} />
                      <span className={`text-xs ${
                        tempFilterType === option.value ? 'text-accent-400' : 'text-gothic-300'
                      }`}>
                        {option.label}
                      </span>
                      {tempFilterType === option.value && (
                        <div className="ml-auto w-1.5 h-1.5 bg-accent-500 rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="filter-section">
              <h4 className="filter-section-title">Status</h4>
              <div className="space-y-1">
                {[
                  { value: '', label: 'All Status' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'RESOLVED', label: 'Resolved' },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setTempFilterStatus(option.value)}
                    className={`filter-option ${
                      tempFilterStatus === option.value ? 'filter-option-active' : 'filter-option-inactive'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
                      tempFilterStatus === option.value
                        ? 'bg-accent-500 border-accent-500'
                        : 'border-gothic-600'
                    }`}>
                      {tempFilterStatus === option.value && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-xs ${
                      tempFilterStatus === option.value ? 'text-accent-400' : 'text-gothic-300'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                ))}
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
    </div>
  );
}
