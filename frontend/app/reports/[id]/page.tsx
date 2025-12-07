'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Edit, Calendar, User, FileText, AlertTriangle, Package, CheckCircle, Clock, CheckSquare, Image as ImageIcon, Trash2, Send, Camera, Scale } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Header from '@/components/ui/Header';
import AuthenticatedImage from '@/components/ui/AuthenticatedImage';
import { reportsAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import ResolutionModal from '@/components/ui/ResolutionModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Report {
  id: string;
  type: 'OPENING' | 'CLOSING' | 'PROBLEM' | 'STOCK';
  title: string;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  resolvedAt?: string;
  user: {
    name: string;
    email: string;
  };
  photos?: Array<{
    id: string;
    filename: string;
    category: string;
    uploadedAt: string;
  }>;
  checklists?: Array<{
    id: string;
    completed: boolean;
    createdAt: string;
    template: {
      id: string;
      title: string;
      type: string;
      order: number;
      required: boolean;
    };
  }>;
  stockReport?: {
    id: string;
    stockDate: string;
    syncedAt?: string;
    completedAt?: string;
    items?: Array<{
      id: string;
      productName: string;
      productSku?: string;
      unit: string;
      openingStock: number;
      expectedOut: number;
      actualClosing?: number;
      difference?: number;
      notes?: string;
      completed: boolean;
    }>;
  };
}

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { isAuthenticated, user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReport();
    }
  }, [isAuthenticated, params.id]);

  // Auto-redirect after 5 seconds if report not found
  useEffect(() => {
    if (!loading && !report && !redirecting) {
      setRedirecting(true);
      const timer = setTimeout(() => {
        router.push('/reports');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [loading, report, redirecting, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getReport(params.id);
      setReport(response.data);
    } catch (error: any) {
      console.error('Failed to fetch report:', error);
      if (error.response?.status === 404) {
        // Don't show error toast for 404, just set report to null
        setReport(null);
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load report details'
        });
        setReport(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!report) return;

    try {
      await reportsAPI.submitReport(report.id);
      showToast({
        type: 'success',
        title: 'Report submitted successfully'
      });
      fetchReport(); // Refresh the report data
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      showToast({
        type: 'error',
        title: 'Failed to submit report',
        message: error.response?.data?.message
      });
    }
  };

  const handleResolve = async (resolution: string) => {
    if (!report) return;

    try {
      await reportsAPI.resolveReport(report.id, { resolution });
      showToast({
        type: 'success',
        title: 'Report resolved successfully'
      });
      setShowResolutionModal(false);
      fetchReport(); // Refresh the report data
    } catch (error: any) {
      console.error('Failed to resolve report:', error);
      showToast({
        type: 'error',
        title: 'Failed to resolve report',
        message: error.response?.data?.message
      });
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    try {
      await reportsAPI.deleteReport(report.id);
      showToast({
        type: 'success',
        title: 'Report deleted successfully'
      });
      router.push('/reports');
    } catch (error: any) {
      console.error('Failed to delete report:', error);
      showToast({
        type: 'error',
        title: 'Failed to delete report',
        message: error.response?.data?.message
      });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'SUBMITTED':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OPENING':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'CLOSING':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'PROBLEM':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'STOCK':
        return <Package className="w-5 h-5 text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-gothic-400" />;
    }
  };

  const getTypeColors = (type: string) => {
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
        return 'text-gothic-300';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    router.push('/login');
    return null;
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gothic-800 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gothic-400" />
            </div>
            <h1 className="text-2xl font-bold text-gothic-100 mb-2">Report Not Found</h1>
            <p className="text-gothic-300 mb-6">
              The report you're looking for doesn't exist or may have been deleted.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/reports"
              className="btn-primary inline-block"
            >
              Back to Reports
            </Link>
            <div className="text-sm text-gothic-400">
              <p>You will be redirected automatically in 5 seconds...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gothic-900 pb-32">
      <Header title="Report Details" showBack={true} />
      <main className="mobile-container py-4">
        {/* Report Header Card */}
        <div className="gothic-card p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getReportTypeBgColors(report.type)}`}>
              {getTypeIcon(report.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-display font-semibold text-gothic-100 mb-1">{report.title}</h1>
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className={`font-medium capitalize ${getTypeColors(report.type)}`}>
                  {report.type.toLowerCase()} report
                </span>
                <span className="text-gothic-500">•</span>
                <span className="text-gothic-400">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="mt-3">
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {getStatusIcon(report.status)}
                  <span className="capitalize">{report.status.toLowerCase()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="gothic-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gothic-700 flex items-center justify-center">
                <User className="w-4 h-4 text-gothic-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gothic-200">{report.user.name}</p>
                <p className="text-xs text-gothic-400">{report.user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Details */}
        <div className="space-y-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Description */}
            {report.description && (
              <div className="gothic-card p-6">
                <h2 className="text-sm font-display font-semibold text-gothic-100 mb-3">Description</h2>
                <p className="text-xs text-gothic-300 leading-relaxed">{report.description}</p>
              </div>
            )}

            {/* Photos */}
            {report.photos && report.photos.length > 0 && (
              <div className="gothic-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Camera className="w-4 h-4 text-gothic-400" />
                  <h2 className="text-sm font-display font-semibold text-gothic-100">
                    Photos ({report.photos.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {report.photos.map((photo) => (
                    <div key={photo.id} className="photo-item group">
                      <AuthenticatedImage
                        src={`${API_BASE_URL}/photos/file/${report.id}/${photo.filename}`}
                        alt={photo.category}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <span className="text-xs text-white font-medium">
                          {photo.category.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklists */}
            {report.checklists && report.checklists.length > 0 && (
              <div className="gothic-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <CheckSquare className="w-4 h-4 text-gothic-400" />
                  <h2 className="text-sm font-display font-semibold text-gothic-100">
                    Checklist Items
                  </h2>
                </div>
                <div className="space-y-2">
                  {report.checklists
                    .sort((a, b) => a.template.order - b.template.order)
                    .map((checklist) => (
                      <div key={checklist.id} className="checklist-item">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {checklist.completed ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gothic-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className={`text-xs font-medium ${checklist.completed ? 'text-gothic-400 line-through' : 'text-gothic-200'
                                }`}>
                                {checklist.template.title}
                              </p>
                              {checklist.template.required && (
                                <span className="badge badge-warning text-xs">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gothic-700">
                  <p className="text-xs text-gothic-400">
                    {report.checklists.filter(c => c.completed).length} of {report.checklists.length} completed
                  </p>
                </div>
              </div>
            )}

            {/* Stock Items - For STOCK reports */}
            {report.type === 'STOCK' && report.stockReport?.items && report.stockReport.items.length > 0 && (
              <div className="gothic-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-display font-semibold text-gothic-100">
                      Stock Items ({report.stockReport.items.length})
                    </h2>
                  </div>
                  <span className="text-xs text-gothic-400">
                    {new Date(report.stockReport.stockDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="space-y-3">
                  {report.stockReport.items.map((item) => {
                    const expectedClosing = item.openingStock - item.expectedOut;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${item.completed
                          ? 'bg-green-900/20 border-green-800'
                          : 'bg-gothic-800 border-gothic-700'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-xs font-medium text-gothic-100">
                              {item.productName}
                            </h4>
                            {item.productSku && (
                              <p className="text-xs text-gothic-400">SKU: {item.productSku}</p>
                            )}
                          </div>
                          {item.completed && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>

                        {isAdmin && (
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-gothic-400">Opening: </span>
                              <span className="text-gothic-200">{item.openingStock}g</span>
                            </div>
                            <div>
                              <span className="text-gothic-400">Used: </span>
                              <span className="text-gothic-200">{item.expectedOut}g</span>
                            </div>
                            <div>
                              <span className="text-gothic-400">Expected: </span>
                              <span className="text-gothic-200">{expectedClosing.toFixed(0)}g</span>
                            </div>
                          </div>
                        )}

                        {item.actualClosing !== null && item.actualClosing !== undefined && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1">
                              <Scale className="w-3 h-3 text-accent-400" />
                              <span className="text-gothic-300">Actual: </span>
                              <span className="text-gothic-100 font-medium">{item.actualClosing}g</span>
                            </div>
                            {isAdmin && item.difference !== null && item.difference !== undefined && (
                              <span className={`font-medium ${item.difference < 0 ? 'text-red-400' :
                                item.difference > 0 ? 'text-green-400' :
                                  'text-gothic-300'
                                }`}>
                                {item.difference > 0 ? '+' : ''}{item.difference.toFixed(0)}g diff
                              </span>
                            )}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-xs text-gothic-400 mt-2 italic">Note: {item.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gothic-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gothic-400">
                      {report.stockReport.items.filter(i => i.completed).length} of {report.stockReport.items.length} items completed
                    </span>
                    {report.stockReport.completedAt && (
                      <span className="text-green-400">
                        Finalized {new Date(report.stockReport.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div className="gothic-card p-6">
            <h3 className="text-sm font-display font-semibold text-gothic-100 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-gothic-500 mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gothic-200">Created</p>
                  <p className="text-xs text-gothic-400">
                    {new Date(report.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              {report.submittedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gothic-200">Submitted</p>
                    <p className="text-xs text-gothic-400">
                      {new Date(report.submittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
              {report.resolvedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gothic-200">Resolved</p>
                    <p className="text-xs text-gothic-400">
                      {new Date(report.resolvedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Buttons */}
      {report.status === 'DRAFT' && (
        <div className="fixed bottom-24 left-0 right-0 z-50">
          <div className="mobile-container">
            <div className="flex gap-3">
              <Link
                href={`/reports/create?draft=${report.id}`}
                className="flex-1 py-3 px-4 bg-gothic-700 hover:bg-gothic-600 text-white rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Draft</span>
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-3 px-4 bg-accent-500 hover:bg-accent-600 text-white rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium">Submit</span>
              </button>
            </div>
            {/* Delete button - show for drafts or admins */}
            {(report.status === 'DRAFT' || isAdmin) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full mt-3 py-3 px-4 bg-error/10 hover:bg-error/20 text-error rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Report</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Actions for Submitted/Resolved Reports */}
      {report.status !== 'DRAFT' && isAdmin && (
        <div className="fixed bottom-24 left-0 right-0 z-50">
          <div className="mobile-container">
            <div className="space-y-3">
              {/* Resolve button for submitted problem reports */}
              {report.status === 'SUBMITTED' && report.type === 'PROBLEM' && (
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="w-full py-3 px-4 bg-success hover:bg-success/90 text-white rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Mark as Resolved</span>
                </button>
              )}

              {/* Delete button for admins */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 px-4 bg-error/10 hover:bg-error/20 text-error rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal for Problem Reports */}
      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        onSubmit={handleResolve}
        reportTitle={report?.title}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
