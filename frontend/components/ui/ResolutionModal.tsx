'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string) => void;
  reportTitle?: string;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportTitle
}) => {
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolution.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(resolution.trim());
      setResolution('');
      onClose();
    } catch (error) {
      // Error handling will be done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setResolution('');
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="gothic-card w-full max-w-md mx-auto p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-semibold text-gothic-100">
            Mark as Resolved
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg hover:bg-gothic-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gothic-300" />
          </button>
        </div>

        {/* Report title if provided */}
        {reportTitle && (
          <div className="mb-4">
            <p className="text-sm text-gothic-300">
              <span className="text-gothic-400">Report:</span> {reportTitle}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="resolution" className="form-label">
              Resolution Details <span className="text-red-400">*</span>
            </label>
            <textarea
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this issue was resolved..."
              className="input-gothic w-full h-32 resize-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !resolution.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Mark Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolutionModal;