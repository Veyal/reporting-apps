'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Send, FileText, AlertCircle, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ChecklistInterface from '@/components/ui/ChecklistInterface';
import StockReportForm from '@/components/reports/StockReportForm';
import PhotoUploadSection from '@/components/ui/PhotoUploadSection';
import { reportsAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const reportTypes = {
  OPENING: {
    label: 'Opening Report',
    description: 'Daily opening procedures and checklist',
    icon: '🌅',
  },
  CLOSING: {
    label: 'Closing Report',
    description: 'Daily closing procedures and checklist',
    icon: '🌙',
  },
  PROBLEM: {
    label: 'Problem Report',
    description: 'Report issues and problems',
    icon: '⚠️',
  },
  STOCK: {
    label: 'Stock Report',
    description: 'Raw materials inventory from Olsera',
    icon: '📦',
  },
};

interface DraftReport {
  id: string;
  title: string;
  createdAt: string;
  type: string;
}

export default function CreateReportPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [checkingDrafts, setCheckingDrafts] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [checklistProgress, setChecklistProgress] = useState({ completed: 0, total: 0, requiredCompleted: 0, requiredTotal: 0 });
  const [photoRequirementsMet, setPhotoRequirementsMet] = useState(true); // Default to true for reports without photo requirements
  const [showPhotoSection, setShowPhotoSection] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    // Don't do anything until authentication is loaded
    if (authLoading) return;

    const draftParam = searchParams.get('draft');
    const type = searchParams.get('type');

    if (draftParam) {
      // Draft mode: load existing draft
      setIsDraftMode(true);
      setDraftId(draftParam);
      loadDraftReport(draftParam);
    } else if (type && reportTypes[type as keyof typeof reportTypes]) {
      // New report mode: set type and check for existing drafts
      setReportType(type);
      // Check for existing drafts before auto-creating
      checkForDrafts(type);
    }
  }, [searchParams, authLoading, isAuthenticated]);

  useEffect(() => {
    // Check if report can be submitted based on requirements
    const hasTitle = formData.title.trim().length > 0;
    let checklistRequirementsMet = true;

    // For OPENING/CLOSING reports, check if required checklist items are completed
    if ((reportType === 'OPENING' || reportType === 'CLOSING') && checklistProgress.requiredTotal > 0) {
      checklistRequirementsMet = checklistProgress.requiredCompleted === checklistProgress.requiredTotal;
    }

    // All requirements must be met: title, checklist (if applicable), and photos
    setCanSubmit(hasTitle && checklistRequirementsMet && photoRequirementsMet);
  }, [formData.title, reportType, checklistProgress, photoRequirementsMet]);

  useEffect(() => {
    if (reportType) {
      setShowPhotoSection(true);
      setPhotoRequirementsMet(true);
    }
  }, [reportType]);

  const loadDraftReport = async (draftId: string) => {
    try {
      setLoadingDraft(true);
      const response = await reportsAPI.getReport(draftId);
      const draft = response.data;

      // Set form data from draft
      setReportType(draft.type);
      setFormData({
        title: draft.title || '',
        description: draft.description || ''
      });
      // Mark as draft mode
      setIsDraftMode(true);
      setDraftId(draftId);
    } catch (error) {
      console.error('Failed to load draft:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load draft. Please try again.',
        duration: 5000
      });
      // Redirect back to reports page on error
      router.push('/reports');
    } finally {
      setLoadingDraft(false);
    }
  };

  const checkForDrafts = async (type: string) => {
    try {
      setCheckingDrafts(true);
      const response = await reportsAPI.getReports({
        type,
        status: 'DRAFT',
        limit: '10'
      });

      if (response.data.reports.length > 0) {
        setDrafts(response.data.reports);
        setShowDraftModal(true);
      } else if (type === 'STOCK') {
        // For STOCK reports, auto-create draft immediately if no existing drafts
        await autoCreateDraft(type);
      }
    } catch (error) {
      console.error('Failed to check for drafts:', error);
    } finally {
      setCheckingDrafts(false);
    }
  };

  const handleContinueDraft = (draftId: string) => {
    setShowDraftModal(false);
    router.push(`/reports/create?draft=${draftId}`);
  };

  const handleCreateNew = () => {
    setShowDraftModal(false);
    setDrafts([]);
    // For STOCK reports, auto-create a new draft to prevent the form showing with empty draftId
    if (reportType === 'STOCK') {
      autoCreateDraft(reportType);
    }
  };

  const autoCreateDraft = async (type: string) => {
    try {
      setLoading(true);

      // Generate default title
      const defaultTitle = `${reportTypes[type as keyof typeof reportTypes].label} - ${new Date().toLocaleDateString()}`;

      // Create draft immediately
      const response = await reportsAPI.createReport({
        type,
        title: defaultTitle,
        description: '',
      });

      const newDraftId = response.data.id;

      // Update state to reflect draft mode
      setDraftId(newDraftId);
      setIsDraftMode(true);
      setFormData({
        title: defaultTitle,
        description: ''
      });

      // Update URL to include draft ID without page reload
      const newUrl = `/reports/create?draft=${newDraftId}`;
      window.history.replaceState({}, '', newUrl);

      showToast({
        type: 'success',
        title: 'Draft created',
        message: 'Your draft has been auto-saved',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to auto-create draft:', error);
      showToast({
        type: 'error',
        title: 'Failed to create draft',
        message: 'Please try again',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistProgress = useCallback((completed: number, total: number, requiredCompleted: number, requiredTotal: number) => {
    setChecklistProgress({ completed, total, requiredCompleted, requiredTotal });
  }, []);

  const handlePhotosUpdate = (categoryId: string, photos: any[]) => {
    // Handle photo updates if needed
    console.log('Photos updated for category:', categoryId, photos);
  };

  const handlePhotoRequirementsChange = useCallback((met: boolean) => {
    setPhotoRequirementsMet(met);
  }, []);

  const handleStockUpdate = (stockItems: any[]) => {
    // Handle stock updates if needed
    console.log('Stock updated:', stockItems);
  };

  const handleDelete = async () => {
    if (!isDraftMode || !draftId) return;

    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      await reportsAPI.deleteReport(draftId);
      showToast({
        type: 'success',
        title: 'Draft deleted successfully',
        duration: 3000
      });
      router.push('/reports');
    } catch (error: any) {
      console.error('Failed to delete draft:', error);
      showToast({
        type: 'error',
        title: 'Failed to delete draft',
        message: error.response?.data?.message,
        duration: 5000
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent, submit = false) => {
    e.preventDefault();
    if (!reportType) return;

    setLoading(true);
    setSaving(!submit);

    try {
      let reportId: string;

      if (isDraftMode && draftId) {
        // Update existing draft (don't send type field for updates)
        await reportsAPI.updateReport(draftId, {
          ...formData,
        });
        reportId = draftId;

        showToast({
          type: 'success',
          title: 'Draft Updated',
          message: 'Your changes have been saved',
          duration: 3000
        });
      } else {
        // Create new report
        const response = await reportsAPI.createReport({
          type: reportType,
          ...formData,
        });
        reportId = response.data.id;

        showToast({
          type: 'success',
          title: 'Report Created',
          message: 'Your report has been created successfully',
          duration: 3000
        });
      }

      if (submit) {
        await reportsAPI.submitReport(reportId);
        showToast({
          type: 'success',
          title: 'Report Submitted',
          message: 'Your report has been submitted successfully',
          duration: 3000
        });
        router.push('/dashboard');
      } else {
        // Stay on the same page if just saving
        if (!isDraftMode) {
          // For new reports, switch to draft mode after first save
          setIsDraftMode(true);
          setDraftId(reportId);
          router.replace(`/reports/create?draft=${reportId}`);
        }
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save report. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  if (authLoading || loadingDraft) {
    return (
      <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        {loadingDraft && (
          <p className="text-gothic-300 mt-4">Loading draft...</p>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header with back button - simplified and sticky */}
      <header className="sticky top-0 z-40 bg-gothic-900/95 backdrop-blur-md border-b border-gothic-800">
        <div className="mobile-container">
          <div className="flex items-center h-14">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gothic-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gothic-300" />
            </button>
            <h1 className="text-sm font-display font-semibold text-gothic-100">
              {isDraftMode ? 'Edit Report' : reportType ? reportTypes[reportType as keyof typeof reportTypes].label : 'Create Report'}
            </h1>
          </div>
        </div>
      </header>

      <main className="mobile-container py-6">
        {!reportType ? (
          /* Report Type Selection */
          <div className="space-y-6">
            <h2 className="text-xl font-display font-semibold text-gothic-100">
              Choose Report Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(reportTypes).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className="gothic-card-hover p-6 text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{info.icon}</span>
                    <div>
                      <h3 className="font-medium text-gothic-100 mb-2 group-hover:text-accent-400 transition-colors">
                        {info.label}
                      </h3>
                      <p className="text-gothic-400 text-sm">{info.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : checkingDrafts ? (
          /* Checking for drafts */
          <div className="gothic-card p-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gothic-300 mt-4">Checking for existing drafts...</p>
          </div>
        ) : !showDraftModal ? (
          /* Report Form - Multi-section layout */
          <div className="space-y-6">
            {/* Header Section */}
            <div className="gothic-card p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{reportTypes[reportType as keyof typeof reportTypes]?.icon}</span>
                <h2 className="text-xl font-display font-semibold text-gothic-100">
                  {reportTypes[reportType as keyof typeof reportTypes]?.label}
                </h2>
              </div>
              <p className="text-gothic-400 text-sm">
                {reportTypes[reportType as keyof typeof reportTypes]?.description}
              </p>
            </div>

            {/* Report Details Section */}
            <div className="gothic-card p-6">
              <h3 className="text-sm font-display font-semibold text-gothic-100 mb-4">
                Report Details
              </h3>

              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                <div className="form-group">
                  <label htmlFor="title" className="form-label text-xs">
                    Report Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-gothic w-full text-xs"
                    placeholder="Enter report title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label text-xs">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-gothic w-full h-24 resize-none text-xs"
                    placeholder="Enter report description (optional)"
                  />
                </div>
              </form>
            </div>

            {/* Checklist Section - Only for OPENING/CLOSING reports */}
            {(reportType === 'OPENING' || reportType === 'CLOSING') && (
              <div className="gothic-card">
                <ChecklistInterface
                  reportId={draftId || undefined}
                  reportType={reportType as 'OPENING' | 'CLOSING'}
                  onProgressChange={handleChecklistProgress}
                  onLocalItemsChange={(items) => {
                    // Store local checklist items if needed
                    console.log('Local checklist items:', items);
                  }}
                />
              </div>
            )}

            {/* Stock Section - Only for STOCK reports */}
            {reportType === 'STOCK' && draftId && (
              <div className="gothic-card p-6">
                <h3 className="text-sm font-medium text-gothic-100 mb-4 flex items-center space-x-2">
                  <span>📦</span>
                  <span>Raw Materials Stock Tracking</span>
                </h3>
                <StockReportForm
                  reportId={draftId}
                  onComplete={() => {
                    showToast({
                      type: 'success',
                      title: 'Stock report completed',
                      message: 'All items have been tracked',
                      duration: 3000
                    });
                  }}
                />
              </div>
            )}

            {/* Photo Upload Section */}
            {showPhotoSection && (
              <div className="gothic-card p-6">
                <PhotoUploadSection
                  reportId={draftId || undefined}
                  reportType={reportType}
                  onPhotosUpdate={handlePhotosUpdate}
                  onRequirementsChange={handlePhotoRequirementsChange}
                  onCategoriesLoaded={(count) => {
                    setShowPhotoSection(count > 0);
                    if (count === 0) {
                      setPhotoRequirementsMet(true);
                    }
                  }}
                />
              </div>
            )}

          </div>
        ) : (
          /* Draft Modal is shown - show minimal content */
          <div className="gothic-card p-8 text-center">
            <p className="text-gothic-300">Please make a selection in the modal above.</p>
          </div>
        )}

        {/* Draft Modal */}
        {showDraftModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gothic-800 rounded-lg border border-gothic-700 w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gothic-100">
                    Existing Drafts Found
                  </h3>
                </div>

                <p className="text-gothic-300 mb-6">
                  You have {drafts.length} draft {reportTypes[reportType as keyof typeof reportTypes]?.label.toLowerCase()}(s).
                  Would you like to continue with an existing draft or create a new one?
                </p>

                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between p-3 bg-gothic-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gothic-400" />
                        <div>
                          <p className="text-gothic-200 font-medium">{draft.title}</p>
                          <p className="text-xs text-gothic-400">
                            Created {new Date(draft.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleContinueDraft(draft.id)}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Continue
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateNew}
                    className="btn-secondary flex-1"
                  >
                    Create New
                  </button>
                  <button
                    onClick={() => {
                      setShowDraftModal(false);
                      router.push('/dashboard');
                    }}
                    className="btn-primary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {reportType && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gothic-900 border-t border-gothic-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <div className="mobile-container py-4">
            {/* Submit Button */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !canSubmit}
              title={!canSubmit ? 'Complete all required items and photos to submit' : 'Submit report'}
              className={`w-full py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200 ${!canSubmit || loading
                ? 'bg-gothic-700 text-gothic-400 cursor-not-allowed opacity-50'
                : 'bg-accent-500 hover:bg-accent-600 text-white active:scale-95'
                }`}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="text-sm font-medium">Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">Submit Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
