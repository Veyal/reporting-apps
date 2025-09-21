'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Minus, Save } from 'lucide-react';
import { reportsAPI } from '@/lib/api';

interface StockItem {
  id: string;
  name: string;
  currentCount: number;
  minimumLevel: number;
  unit: string;
  category?: string;
}

interface StockSectionProps {
  reportId?: string;
  onStockUpdate?: (stockItems: StockItem[]) => void;
}

const StockSection: React.FC<StockSectionProps> = ({
  reportId,
  onStockUpdate,
}) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchStockData();
    }
  }, [reportId]);

  const fetchStockData = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      const response = await reportsAPI.getReport(reportId);
      const stockData = response.data.stockItems || [];
      setStockItems(stockData);
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      // Initialize with some default items if fetch fails
      setStockItems([
        { id: '1', name: 'Coffee Beans', currentCount: 0, minimumLevel: 5, unit: 'kg', category: 'Beverages' },
        { id: '2', name: 'Milk', currentCount: 0, minimumLevel: 10, unit: 'L', category: 'Beverages' },
        { id: '3', name: 'Sugar', currentCount: 0, minimumLevel: 2, unit: 'kg', category: 'Ingredients' },
        { id: '4', name: 'Paper Cups', currentCount: 0, minimumLevel: 100, unit: 'pcs', category: 'Supplies' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateItemCount = (itemId: string, newCount: number) => {
    const updatedItems = stockItems.map(item =>
      item.id === itemId
        ? { ...item, currentCount: Math.max(0, newCount) }
        : item
    );
    setStockItems(updatedItems);
    onStockUpdate?.(updatedItems);
  };

  const saveStockData = async () => {
    if (!reportId) return;

    try {
      setSaving(true);
      await reportsAPI.updateReport(reportId, {
        stockItems: stockItems
      });
    } catch (error) {
      console.error('Failed to save stock data:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="gothic-card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="spinner w-8 h-8" />
        </div>
      </div>
    );
  }

  const categorizedItems = stockItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-gothic-100 flex items-center space-x-2">
          <Package className="w-4 h-4" />
          <span>Stock Count</span>
        </h3>
        {reportId && (
          <button
            onClick={saveStockData}
            disabled={saving}
            className="btn-secondary text-xs px-3 py-1 flex items-center space-x-1"
          >
            {saving ? (
              <div className="spinner w-3 h-3" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>Save</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(categorizedItems).map(([category, items]) => (
          <div key={category} className="gothic-card p-4">
            <h4 className="text-xs font-medium text-gothic-200 mb-3 border-b border-gothic-700 pb-2">
              {category}
            </h4>

            <div className="space-y-3">
              {items.map((item) => {
                const isLowStock = item.currentCount < item.minimumLevel;

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gothic-700/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-medium text-gothic-100">
                          {item.name}
                        </p>
                        {isLowStock && (
                          <span className="badge badge-warning text-xs">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gothic-400">
                        Min: {item.minimumLevel} {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateItemCount(item.id, item.currentCount - 1)}
                        className="btn-ghost p-1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <div className="text-center min-w-[60px]">
                        <input
                          type="number"
                          value={item.currentCount}
                          onChange={(e) => updateItemCount(item.id, parseInt(e.target.value) || 0)}
                          className="input-gothic text-xs text-center w-16 py-1"
                          min="0"
                        />
                        <p className="text-xs text-gothic-400 mt-1">{item.unit}</p>
                      </div>

                      <button
                        onClick={() => updateItemCount(item.id, item.currentCount + 1)}
                        className="btn-ghost p-1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {stockItems.length === 0 && (
        <div className="gothic-card p-6 text-center">
          <Package className="w-8 h-8 text-gothic-500 mx-auto mb-3" />
          <p className="text-xs text-gothic-400">No stock items configured</p>
        </div>
      )}
    </div>
  );
};

export default StockSection;