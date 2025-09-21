'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { reportsAPI } from '@/lib/api';

interface ChecklistItem {
  id: string;
  templateId: string;
  completed: boolean;
  template: {
    id: string;
    title: string;
    required: boolean;
    order: number;
  };
}

interface ChecklistInterfaceProps {
  reportId?: string;
  reportType: 'OPENING' | 'CLOSING';
  onProgressChange?: (completed: number, total: number, requiredCompleted: number, requiredTotal: number) => void;
  onLocalItemsChange?: (items: any[]) => void;
  initialItems?: any[];
}

const ChecklistInterface: React.FC<ChecklistInterfaceProps> = ({
  reportId,
  reportType,
  onProgressChange,
  onLocalItemsChange,
  initialItems = [],
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(!reportId);

  useEffect(() => {
    if (reportId) {
      setLocalMode(false);
      fetchChecklistItems();
    } else {
      setLocalMode(true);
      fetchChecklistTemplates();
    }
  }, [reportId, reportType]);

  useEffect(() => {
    if (items.length > 0 && onProgressChange) {
      const completed = items.filter(item => item.completed).length;
      const total = items.length;
      const requiredCompleted = items.filter(item => item.template.required && item.completed).length;
      const requiredTotal = items.filter(item => item.template.required).length;

      onProgressChange(completed, total, requiredCompleted, requiredTotal);
    }
  }, [items]); // Remove onProgressChange from dependencies to prevent infinite loop

  const fetchChecklistItems = async () => {
    try {
      console.log('Fetching checklist items for report:', reportId);
      const response = await reportsAPI.getReport(reportId);
      console.log('Checklist response:', response.data.checklists);
      setItems(response.data.checklists || []);
    } catch (error) {
      console.error('Failed to fetch checklist items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklistTemplates = async () => {
    try {
      // Fetch checklist templates for this report type
      const response = await reportsAPI.getChecklistTemplates(reportType);

      // Convert templates to local checklist items
      const localItems = response.data.map((template: any) => ({
        id: `local-${template.id}`,
        templateId: template.id,
        completed: false,
        template: {
          id: template.id,
          title: template.title,
          required: template.required,
          order: template.order
        }
      }));

      setItems(localItems);
    } catch (error) {
      console.error('Failed to fetch checklist templates:', error);
      // Use default templates if API fails
      setItems(getDefaultTemplates(reportType));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTemplates = (type: string): ChecklistItem[] => {
    const templates = type === 'OPENING' ? [
      { id: '1', title: 'Unlock doors and disable alarm', required: true, order: 1 },
      { id: '2', title: 'Turn on all lights and equipment', required: true, order: 2 },
      { id: '3', title: 'Check and count cash register', required: true, order: 3 },
      { id: '4', title: 'Review daily schedule and assignments', required: false, order: 4 },
      { id: '5', title: 'Prepare workstations', required: false, order: 5 },
    ] : [
      { id: '1', title: 'Count and secure cash register', required: true, order: 1 },
      { id: '2', title: 'Clean and organize workspace', required: true, order: 2 },
      { id: '3', title: 'Turn off equipment and lights', required: true, order: 3 },
      { id: '4', title: 'Set alarm and lock all doors', required: true, order: 4 },
      { id: '5', title: 'Final security check', required: false, order: 5 },
    ];

    return templates.map(template => ({
      id: `local-${template.id}`,
      templateId: template.id,
      completed: false,
      template
    }));
  };

  const toggleItem = useCallback(async (itemId: string, completed: boolean) => {
    setUpdating(itemId);

    try {
      if (localMode) {
        // In local mode, just update state
        setItems(prev => {
          const updated = prev.map(item =>
            item.id === itemId ? { ...item, completed } : item
          );
          // Notify parent of changes
          if (onLocalItemsChange) {
            onLocalItemsChange(updated);
          }
          return updated;
        });
      } else {
        // In server mode, update via API
        await reportsAPI.updateChecklist(reportId!, itemId, completed);
        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, completed } : item
        ));
      }
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    } finally {
      setUpdating(null);
    }
  }, [reportId, localMode, onLocalItemsChange]);

  // Calculate progress data - must be before any conditional returns
  const progressData = useMemo(() => {
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const requiredCompleted = items.filter(item => item.template.required && item.completed).length;
    const requiredTotal = items.filter(item => item.template.required).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const requiredProgress = requiredTotal > 0 ? (requiredCompleted / requiredTotal) * 100 : 0;

    return { completed, total, requiredCompleted, requiredTotal, progress, requiredProgress };
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  // Check if all required items are completed
  const allRequiredComplete = progressData.requiredProgress === 100;

  return (
    <div className={`space-y-4 p-4 rounded-lg transition-all duration-300 ${
      allRequiredComplete ? 'bg-success/5 border border-success/20' : ''
    }`}>
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-gothic-100">
          Checklist Items {items.length > 0 && (
            <span className={`text-xs font-normal ml-2 ${
              allRequiredComplete ? 'text-success' : 'text-gothic-400'
            }`}>
              ({progressData.completed}/{progressData.total})
            </span>
          )}
        </h3>
        {allRequiredComplete && items.length > 0 && (
          <CheckCircle className="w-4 h-4 text-success" />
        )}
      </div>

      {/* Checklist Items */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gothic-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-3 text-gothic-500" />
          <p className="text-xs">No checklist items available</p>
        </div>
      ) : (
        <div className="space-y-2">
            {items
              .sort((a, b) => a.template.order - b.template.order)
              .map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id, !item.completed)}
                  disabled={updating === item.id}
                  className={`checklist-item w-full text-left transition-all duration-200 animate-stagger-in gpu-accelerated ${
                    item.completed ? 'bg-gothic-700/50' : 'hover:bg-gothic-700/30'
                  } ${updating === item.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 transition-colors ${
                      item.completed
                        ? 'text-success'
                        : 'text-gothic-400'
                    }`}>
                      {updating === item.id ? (
                        <div className="spinner w-5 h-5" />
                      ) : item.completed ? (
                        <CheckCircle className="w-5 h-5 animate-check-bounce" />
                      ) : (
                        <Circle className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className={`font-medium text-xs ${
                          item.completed ? 'text-gothic-200 line-through' : 'text-gothic-100'
                        }`}>
                          {item.template.title}
                        </p>
                        {item.template.required && (
                          <span className="badge badge-warning text-xs">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
    </div>
  );
};

export default ChecklistInterface;
