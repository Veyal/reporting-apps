'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Package, Scale, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { stockAPI, StockReport, StockReportItem, StockReportStats } from '@/lib/stockApi';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface StockReportFormProps {
  reportId: string;
  onComplete?: () => void;
}

const StockReportForm: React.FC<StockReportFormProps> = ({ reportId, onComplete }) => {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [stockDate, setStockDate] = useState(today);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [stats, setStats] = useState<StockReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const hasDifferenceStats = typeof stats?.totalDifference === 'number';
  const totalDifference = hasDifferenceStats ? Number(stats?.totalDifference) : 0;
  const negativeDiffCount = stats?.negativeDifferences?.length ?? 0;
  const positiveDiffCount = stats?.positiveDifferences?.length ?? 0;

  // Load existing stock report if any, or auto-initialize for new reports
  useEffect(() => {
    if (!hasInitialized && reportId) {
      setHasInitialized(true);
      loadOrInitializeStockReport();
    }
  }, [reportId, hasInitialized]);

  useEffect(() => {
    if (!isAdmin && stockDate !== today) {
      setStockDate(today);
    }
  }, [isAdmin, stockDate, today]);

  const loadOrInitializeStockReport = async () => {
    try {
      setLoading(true);
      // Try to load existing stock report
      const data = await stockAPI.getStockReport(reportId);
      console.log('Stock report GET response:', data);

      if (data.stockReport && data.stockReport.items && data.stockReport.items.length > 0) {
        // Only consider it loaded if there's actual data
        setStockReport(data.stockReport);
        setStats(data.stats);
        setStockDate(data.stockReport.stockDate.split('T')[0]);
      } else {
        // No stock report or empty, show date selector instead of auto-initializing
        console.log('No stock report data found, waiting for user to select date...');
        setLoading(false);
      }
    } catch (error: any) {
      // API error, show date selector
      console.log('Error loading stock report:', error.response?.status);
      console.log('Waiting for user to select date...');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const loadStockReport = async () => {
    try {
      const data = await stockAPI.getStockReport(reportId);
      if (data.stockReport) {
        setStockReport(data.stockReport);
        setStats(data.stats);
        setStockDate(data.stockReport.stockDate.split('T')[0]);
      }
    } catch (error) {
      console.log('Failed to load stock report');
    }
  };

  const initializeReport = async (selectedDate?: string) => {
    try {
      setInitializing(true);
      const dateToUse = selectedDate || stockDate;
      console.log('Calling stock API to initialize report:', reportId, 'with date:', dateToUse);
      const effectiveDate = isAdmin ? dateToUse : today;
      const response = await stockAPI.initializeStockReport(reportId, effectiveDate);
      console.log('Stock API response:', response);

      if (response.stockReport) {
        setStockReport(response.stockReport);

        // Check if we got any items
        if (!response.stockReport.items || response.stockReport.items.length === 0) {
          showToast({
            type: 'warning',
            title: 'No data found',
            message: `No raw materials data found for ${new Date(effectiveDate).toLocaleDateString()}. Try selecting a different date.`,
            duration: 5000
          });
          // Clear the report to show date selector again
          setStockReport(null);
          return false;
        }

        // Try to load stats separately, but don't fail if it doesn't work
        try {
          const statsData = await stockAPI.getStockReport(reportId);
          if (statsData.stats) {
            setStats(statsData.stats);
          }
        } catch (e) {
          console.log('Could not load stats yet');
        }

        showToast({
          type: 'success',
          title: 'Stock data fetched successfully',
          message: `Found ${response.stockReport.items.length} raw materials for ${new Date(effectiveDate).toLocaleDateString()}`,
          duration: 3000
        });
        return true;
      } else {
        throw new Error('No stock report data returned');
      }
    } catch (error: any) {
      console.error('Failed to initialize stock report:', error);
      console.error('Error details:', error.response?.data);
      showToast({
        type: 'error',
        title: 'Failed to fetch stock data',
        message: error.response?.data?.message || 'Please try again',
        duration: 5000
      });
      return false;
    } finally {
      setInitializing(false);
    }
  };

  const handleItemUpdate = async (item: StockReportItem, actualClosing: number, notes: string) => {
    try {
      await stockAPI.updateStockItem(item.id, {
        actualClosing,
        notes
      });

      // Reload stock report
      await loadStockReport();
      setEditingItem(null);
      showToast({
        type: 'success',
        title: 'Stock item updated',
        duration: 2000
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Failed to update stock item',
        duration: 3000
      });
    }
  };

  const handlePhotoUpload = async (item: StockReportItem, file: File) => {
    try {
      const result = await stockAPI.uploadStockPhoto(item.id, file);

      // Update item with photo
      await stockAPI.updateStockItem(item.id, {
        actualClosing: item.actualClosing || 0,
        photoId: result.photo.id
      });

      await loadStockReport();
      showToast({
        type: 'success',
        title: 'Photo uploaded successfully',
        duration: 2000
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to upload photo',
        duration: 3000
      });
    }
  };

  const finalizeReport = async () => {
    try {
      await stockAPI.finalizeStockReport(reportId);
      showToast({
        type: 'success',
        title: 'Stock report finalized',
        duration: 3000
      });
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Failed to finalize report',
        message: error.response?.data?.message,
        duration: 5000
      });
    }
  };

  if (loading || initializing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-400 mx-auto mb-3" />
          <p className="text-xs text-gothic-300">
            {initializing ? 'Fetching raw materials from Olsera...' : 'Loading stock report...'}
          </p>
        </div>
      </div>
    );
  }

  if (!stockReport) {
    return (
      <div className="gothic-card p-6">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <Calendar className="w-10 h-10 text-accent-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gothic-100 mb-2">
              Select Stock Count Date
            </h3>
            <p className="text-xs text-gothic-400">
              Choose the date for which you want to fetch raw materials data
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gothic-300 mb-2">
                Stock Date
              </label>
              <input
                type="date"
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                max={today}
                min={isAdmin ? undefined : today}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-gothic-800 border border-gothic-700 rounded-lg text-gothic-100 text-sm focus:outline-none focus:border-accent-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>

            <button
              onClick={() => initializeReport(stockDate)}
              disabled={!stockDate || initializing}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              {initializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching Raw Materials...</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Fetch Raw Materials Data</span>
                </>
              )}
            </button>

            <div className="bg-gothic-800 rounded-lg p-3 mt-4">
              {isAdmin ? (
                <p className="text-xs text-gothic-400">
                  <strong className="text-gothic-300">Note:</strong> This will fetch all raw materials (Bahan Baku)
                  consumed on the selected date from the Olsera POS system. Make sure to select the correct date
                  for your stock count.
                </p>
              ) : (
                <p className="text-xs text-gothic-400">
                  Stock reports can only be submitted for today. Contact an administrator if a correction for a previous date is needed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      {stats && (
        <div className="gothic-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gothic-100">Stock Report Progress</h3>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gothic-400">
                {new Date(stockReport.stockDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {isAdmin && stockReport.items.every(item => !item.completed) && (
                <button
                  onClick={() => {
                    if (confirm('This will clear current data and fetch new data. Continue?')) {
                      setStockReport(null);
                      setStats(null);
                    }
                  }}
                  className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Change Date
                </button>
              )}
            </div>
          </div>

          <div className={`grid gap-3 ${hasDifferenceStats ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-gothic-800 rounded-lg p-3">
              <p className="text-xs text-gothic-400 mb-1">Completion</p>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gothic-100">
                  {stats.completionPercentage}%
                </span>
                <span className="text-xs text-gothic-400">
                  ({stats.completedItems}/{stats.totalItems})
                </span>
              </div>
              <div className="mt-2 bg-gothic-700 rounded-full h-2">
                <div
                  className="bg-accent-400 h-2 rounded-full transition-all"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>

            {hasDifferenceStats && (
              <div className="bg-gothic-800 rounded-lg p-3">
                <p className="text-xs text-gothic-400 mb-1">Total Difference</p>
                <p className={`text-lg font-bold ${
                  totalDifference < 0 ? 'text-red-400' :
                  totalDifference > 0 ? 'text-green-400' :
                  'text-gothic-100'
                }`}>
                  {totalDifference > 0 ? '+' : ''}{totalDifference.toFixed(0)}g
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-red-400">
                    ↓ {negativeDiffCount}
                  </span>
                  <span className="text-xs text-green-400">
                    ↑ {positiveDiffCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Items List */}
      <div className="space-y-2">
        {stockReport.items.map((item) => (
          <div
            key={item.id}
            className={`gothic-card p-4 ${
              item.completed ? 'border-green-900' : 'border-gothic-700'
            }`}
          >
            {editingItem === item.id ? (
              <StockItemEditor
                item={item}
                onSave={(actualClosing, notes) => handleItemUpdate(item, actualClosing, notes)}
                onCancel={() => setEditingItem(null)}
                onPhotoUpload={(file) => handlePhotoUpload(item, file)}
                showToast={showToast}
              />
            ) : (
              <StockItemDisplay
                item={item}
                onEdit={() => setEditingItem(item.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Finalize Button */}
      {stats && stats.completionPercentage === 100 && (
        <button
          onClick={finalizeReport}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Finalize Stock Report</span>
        </button>
      )}
    </div>
  );
};

// Stock Item Display Component
const StockItemDisplay: React.FC<{
  item: StockReportItem;
  onEdit: () => void;
}> = ({ item, onEdit }) => {
  const openingStock = typeof item.openingStock === 'number' ? item.openingStock : null;
  const expectedOut = typeof item.expectedOut === 'number' ? item.expectedOut : null;
  const expectedClosing = openingStock !== null && expectedOut !== null
    ? openingStock - expectedOut
    : null;
  const showReferenceData = openingStock !== null && expectedOut !== null && expectedClosing !== null;
  const hasActualClosing = item.actualClosing !== null && item.actualClosing !== undefined;
  const showDifference = showReferenceData && typeof item.difference === 'number';

  return (
    <div onClick={onEdit} className="cursor-pointer">
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
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>

      {showReferenceData && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gothic-400">Opening Stock: </span>
            <span className="text-gothic-200">{openingStock}g</span>
          </div>
          <div>
            <span className="text-gothic-400">Used (from POS): </span>
            <span className="text-gothic-200">{expectedOut}g</span>
          </div>
          <div>
            <span className="text-gothic-400">Expected Closing: </span>
            <span className="text-gothic-200">{expectedClosing}g</span>
          </div>
        </div>
      )}

      {hasActualClosing && (
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          <div>
            <span className="text-gothic-400">Actual Closing: </span>
            <span className="text-gothic-100 font-medium">{item.actualClosing}g</span>
          </div>
          {showDifference && (
            <div className="col-span-2">
              <span className="text-gothic-400">Difference: </span>
              <span className={`font-medium ${
                (item.difference || 0) < 0 ? 'text-red-400' :
                (item.difference || 0) > 0 ? 'text-green-400' :
                'text-gothic-100'
              }`}>
                {item.difference !== null && item.difference !== undefined && (
                  <>
                    {item.difference > 0 ? '+' : ''}{item.difference.toFixed(0)}g
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {item.notes && (
        <p className="text-xs text-gothic-300 mt-2 italic">Note: {item.notes}</p>
      )}

      {item.photoId && (
        <div className="mt-2">
          <span className="text-xs text-green-400 flex items-center space-x-1">
            <Camera className="w-3 h-3" />
            <span>Photo attached</span>
          </span>
        </div>
      )}
    </div>
  );
};

// Stock Item Editor Component
const StockItemEditor: React.FC<{
  item: StockReportItem;
  onSave: (actualClosing: number, notes: string) => void;
  onCancel: () => void;
  onPhotoUpload: (file: File) => void;
  showToast: any;
}> = ({ item, onSave, onCancel, onPhotoUpload, showToast }) => {
  const [actualClosing, setActualClosing] = useState(item.actualClosing?.toString() || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const openingStock = typeof item.openingStock === 'number' ? item.openingStock : null;
  const expectedOut = typeof item.expectedOut === 'number' ? item.expectedOut : null;
  const expectedClosing = openingStock !== null && expectedOut !== null
    ? openingStock - expectedOut
    : null;
  const showReferenceData = openingStock !== null && expectedOut !== null && expectedClosing !== null;

  const handleSave = () => {
    const closingValue = parseFloat(actualClosing);
    if (isNaN(closingValue) || closingValue < 0) {
      showToast({
        type: 'error',
        title: 'Invalid closing stock',
        message: 'Please enter a valid positive number',
        duration: 3000
      });
      return;
    }

    if (photoFile) {
      onPhotoUpload(photoFile);
    }

    onSave(closingValue, notes);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gothic-800 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gothic-100 mb-2">
          {item.productName}
        </h4>
        {showReferenceData && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gothic-400">Opening: </span>
              <span className="text-gothic-200 font-medium">{openingStock}g</span>
            </div>
            <div>
              <span className="text-gothic-400">Used: </span>
              <span className="text-gothic-200 font-medium">{expectedOut}g</span>
            </div>
            <div className="col-span-2">
              <span className="text-gothic-400">Expected: </span>
              <span className="text-gothic-200 font-medium">{expectedClosing}g</span>
            </div>
          </div>
        )}
        {!showReferenceData && (
          <p className="text-xs text-gothic-400">
            Enter the actual stock measured for this item.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gothic-300 mb-2 flex items-center space-x-1">
            <Scale className="w-3 h-3 text-accent-400" />
            <span>Actual Weight (from scale)</span>
          </label>
          <input
            type="number"
            value={actualClosing}
            onChange={(e) => setActualClosing(e.target.value)}
            className="w-full px-3 py-2 bg-gothic-800 border border-gothic-700 rounded-lg text-gothic-100 text-sm placeholder-gothic-500 focus:outline-none focus:border-accent-400 transition-colors"
            placeholder="Enter weight in grams"
            min="0"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-xs text-gothic-300 mb-2 flex items-center space-x-1">
            <Camera className="w-3 h-3 text-gothic-400" />
            <span>Photo (Optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 bg-gothic-800 border border-gothic-700 rounded-lg text-gothic-100 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gothic-700 file:text-gothic-300 hover:file:bg-gothic-600 transition-colors"
          />
          {photoFile && (
            <p className="text-xs text-green-400 mt-2 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>{photoFile.name}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gothic-300 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gothic-800 border border-gothic-700 rounded-lg text-gothic-100 text-xs placeholder-gothic-500 focus:outline-none focus:border-accent-400 transition-colors resize-none"
            rows={2}
            placeholder="Any observations or issues..."
          />
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!actualClosing}
            className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg text-xs font-medium hover:bg-accent-600 disabled:bg-gothic-700 disabled:text-gothic-500 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gothic-700 text-gothic-300 rounded-lg text-xs font-medium hover:bg-gothic-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockReportForm;
