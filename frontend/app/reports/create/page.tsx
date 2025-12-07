'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
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

export default function CreateReportPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [reportId, setReportId] = useState<string | null>(null);
  const [initializingReport, setInitializingReport] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState({ completed: 0, total: 0, requiredCompleted: 0, requiredTotal: 0 });
  const [photoRequirementsMet, setPhotoRequirementsMet] = useState(true);
  const [showPhotoSection, setShowPhotoSection] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle URL params - set report type
  useEffect(() => {
    if (authLoading) return;
    const type = searchParams.get('type');
    if (type && reportTypes[type as keyof typeof reportTypes]) {
      setReportType(type);
      // For STOCK reports, auto-create report so items can be saved
      if (type === 'STOCK') {
        initializeStockReport(type);
      }
    }
  }, [searchParams, authLoading, isAuthenticated]);

  // Check if can submit
  useEffect(() => {
    const hasTitle = formData.title.trim().length > 0;
    let checklistRequirementsMet = true;

    if ((reportType === 'OPENING' || reportType === 'CLOSING') && checklistProgress.requiredTotal > 0) {
      checklistRequirementsMet = checklistProgress.requiredCompleted === checklistProgress.requiredTotal;
    }

    setCanSubmit(hasTitle && checklistRequirementsMet && photoRequirementsMet);
  }, [formData.title, reportType, checklistProgress, photoRequirementsMet]);

  useEffect(() => {
    if (reportType) {
      setShowPhotoSection(true);
      setPhotoRequirementsMet(true);
    }
  }, [reportType]);

  // Initialize stock report (creates report so items can be saved)
  const initializeStockReport = async (type: string) => {
    try {
      setInitializingReport(true);
      const defaultTitle = `${reportTypes[type as keyof typeof reportTypes].label} - ${new Date().toLocaleDateString()}`;

      const response = await reportsAPI.createReport({
        type,
        title: defaultTitle,
        description: '',
      });

      setReportId(response.data.id);
      setFormData({ title: defaultTitle, description: '' });
    } catch (error) {
      console.error('Failed to initialize report:', error);
      showToast({
        type: 'error',
        title: 'Failed to initialize report',
        message: 'Please try again',
        duration: 5000
      });
    } finally {
      setInitializingReport(false);
    }
  };

  const handleChecklistProgress = useCallback((completed: number, total: number, requiredCompleted: number, requiredTotal: number) => {
    setChecklistProgress({ completed, total, requiredCompleted, requiredTotal });
  }, []);

  const handlePhotoRequirementsChange = useCallback((met: boolean) => {
    setPhotoRequirementsMet(met);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType || !canSubmit) return;

    setLoading(true);

    try {
      let finalReportId: string;

      if (reportId) {
        // Update existing report (for STOCK reports)
        await reportsAPI.updateReport(reportId, formData);
        finalReportId = reportId;
      } else {
        // Create new report
        const response = await reportsAPI.createReport({
          type: reportType,
          ...formData,
        });
        finalReportId = response.data.id;
      }

      // Submit the report
      await reportsAPI.submitReport(finalReportId);

      showToast({
        type: 'success',
        title: 'Report Submitted',
        message: 'Your report has been submitted successfully',
        duration: 3000
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit report:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to submit report. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || initializingReport) {
    return (
      <div className="min-h-screen bg-gothic-900 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        {initializingReport && (
          <p className="text-gothic-300 mt-4">Initializing report...</p>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
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
              {reportType ? reportTypes[reportType as keyof typeof reportTypes].label : 'Create Report'}
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
        ) : (
          /* Report Form */
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

              <form className="space-y-4">
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
                  reportId={reportId || undefined}
                  reportType={reportType as 'OPENING' | 'CLOSING'}
                  onProgressChange={handleChecklistProgress}
                  onLocalItemsChange={(items) => {
                    console.log('Local checklist items:', items);
                  }}
                />
              </div>
            )}

            {/* Stock Section - Only for STOCK reports */}
            {reportType === 'STOCK' && reportId && (
              <div className="gothic-card p-6">
                <h3 className="text-sm font-medium text-gothic-100 mb-4 flex items-center space-x-2">
                  <span>📦</span>
                  <span>Raw Materials Stock Tracking</span>
                </h3>
                <StockReportForm
                  reportId={reportId}
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

            {/* Photo Upload Section - Not for STOCK reports */}
            {showPhotoSection && reportType !== 'STOCK' && (
              <div className="gothic-card p-6">
                <PhotoUploadSection
                  reportId={reportId || undefined}
                  reportType={reportType}
                  onPhotosUpdate={(categoryId, photos) => {
                    console.log('Photos updated for category:', categoryId, photos);
                  }}
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
        )}
      </main>

      {/* Submit Button */}
      {reportType && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gothic-900 border-t border-gothic-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <div className="mobile-container py-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              title={!canSubmit ? 'Complete all required items to submit' : 'Submit report'}
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
