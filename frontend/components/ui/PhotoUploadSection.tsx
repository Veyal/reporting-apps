'use client';

import { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle } from 'lucide-react';
import PhotoUpload from './PhotoUpload';
import { photosAPI } from '@/lib/api';

interface PhotoCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  minRequired: number;
  maxAllowed: number;
  reportType: string;
  active: boolean;
  order: number;
}

interface PhotoUploadSectionProps {
  reportId?: string;
  reportType: string;
  onPhotosUpdate?: (categoryId: string, photos: any[]) => void;
  onRequirementsChange?: (met: boolean) => void;
}

const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  reportId,
  reportType,
  onPhotosUpdate,
  onRequirementsChange,
}) => {
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchPhotoCategories();
  }, [reportType]);

  useEffect(() => {
    if (reportId) {
      fetchExistingPhotos();
    }
  }, [reportId, reportType]);

  // Check if all photo requirements are met
  useEffect(() => {
    if (categories.length > 0 && onRequirementsChange) {
      const allRequirementsMet = categories.every(category => {
        if (category.minRequired === 0) return true; // Optional categories don't block submission
        const photoCount = uploadedPhotos[category.code]?.length || 0;
        return photoCount >= category.minRequired;
      });
      onRequirementsChange(allRequirementsMet);
    }
  }, [uploadedPhotos, categories, onRequirementsChange]);

  const fetchPhotoCategories = async () => {
    try {
      setLoading(true);
      const response = await photosAPI.getCategories(reportType);
      console.log('Photo categories response:', response.data);
      // Backend returns array directly, not wrapped in object
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch photo categories:', error);
      // Set default categories based on report type
      const defaultCategories = getDefaultCategories(reportType);
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingPhotos = async () => {
    if (!reportId) return;

    try {
      // Fetch all photos for this report
      const response = await photosAPI.getPhotos(reportId);
      console.log('Existing photos response:', response.data);

      // Group photos by category
      const photosByCategory: Record<string, any[]> = {};
      if (Array.isArray(response.data)) {
        response.data.forEach((photo: any) => {
          const categoryKey = photo.category || 'uncategorized';
          if (!photosByCategory[categoryKey]) {
            photosByCategory[categoryKey] = [];
          }
          photosByCategory[categoryKey].push(photo);
        });
      }

      setUploadedPhotos(photosByCategory);
    } catch (error) {
      console.error('Failed to fetch existing photos:', error);
      setUploadedPhotos({});
    }
  };

  const getDefaultCategories = (type: string): PhotoCategory[] => {
    switch (type) {
      case 'OPENING':
        return [
          {
            id: 'opening-general',
            code: 'OPENING_GENERAL',
            name: 'General Setup',
            description: 'Overall setup and preparation photos',
            minRequired: 1,
            maxAllowed: 5,
            reportType: 'OPENING',
            active: true,
            order: 0,
          },
          {
            id: 'opening-equipment',
            code: 'OPENING_EQUIPMENT',
            name: 'Equipment Check',
            description: 'Equipment status and condition',
            minRequired: 0,
            maxAllowed: 3,
            reportType: 'OPENING',
            active: true,
            order: 1,
          },
        ];
      case 'CLOSING':
        return [
          {
            id: 'closing-cleanup',
            code: 'CLOSING_CLEANUP',
            name: 'Cleanup',
            description: 'Final cleanup and organization',
            minRequired: 1,
            maxAllowed: 5,
            reportType: 'CLOSING',
            active: true,
            order: 0,
          },
          {
            id: 'closing-security',
            code: 'CLOSING_SECURITY',
            name: 'Security Check',
            description: 'Security measures and checks',
            minRequired: 0,
            maxAllowed: 3,
            reportType: 'CLOSING',
            active: true,
            order: 1,
          },
        ];
      case 'PROBLEM':
        return [
          {
            id: 'problem-issue',
            code: 'PROBLEM_ISSUE',
            name: 'Problem Documentation',
            description: 'Photos documenting the issue',
            minRequired: 1,
            maxAllowed: 10,
            reportType: 'PROBLEM',
            active: true,
            order: 0,
          },
          {
            id: 'problem-context',
            code: 'PROBLEM_CONTEXT',
            name: 'Context',
            description: 'Surrounding area and context',
            minRequired: 0,
            maxAllowed: 5,
            reportType: 'PROBLEM',
            active: true,
            order: 1,
          },
        ];
      case 'STOCK':
        return [
          {
            id: 'stock-inventory',
            code: 'STOCK_INVENTORY',
            name: 'Inventory Overview',
            description: 'General inventory and stock photos',
            minRequired: 1,
            maxAllowed: 10,
            reportType: 'STOCK',
            active: true,
            order: 0,
          },
          {
            id: 'stock-low',
            code: 'STOCK_LOW',
            name: 'Low Stock Items',
            description: 'Items that are running low',
            minRequired: 0,
            maxAllowed: 10,
            reportType: 'STOCK',
            active: true,
            order: 1,
          },
        ];
      default:
        return [];
    }
  };

  const handleUploadComplete = (categoryCode: string, photos: any[]) => {
    setUploadedPhotos(prev => ({
      ...prev,
      [categoryCode]: [...(prev[categoryCode] || []), ...photos]
    }));
    onPhotosUpdate?.(categoryCode, photos);
  };

  const handlePhotoDelete = (categoryCode: string, photoId: string) => {
    setUploadedPhotos(prev => ({
      ...prev,
      [categoryCode]: (prev[categoryCode] || []).filter(p => p.id !== photoId)
    }));
  };

  const handleUploadError = (error: string) => {
    console.error('Photo upload error:', error);
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

  if (categories.length === 0) {
    return (
      <div className="gothic-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Camera className="w-4 h-4 text-gothic-400" />
          <h3 className="text-sm font-display font-semibold text-gothic-100">
            Photo Upload
          </h3>
        </div>
        <div className="text-center py-8">
          <Camera className="w-8 h-8 text-gothic-500 mx-auto mb-3" />
          <p className="text-xs text-gothic-400">No photo categories configured for this report type</p>
        </div>
      </div>
    );
  }

  const getRequirementsMet = (category: PhotoCategory) => {
    const photoCount = uploadedPhotos[category.code]?.length || 0;
    const minMet = photoCount >= category.minRequired;
    const required = category.minRequired > 0;

    return {
      photoCount,
      minMet,
      required,
      isValid: !required || minMet
    };
  };

  // Check if all photo requirements are met
  const allRequirementsMet = categories.every(category => {
    if (category.minRequired === 0) return true;
    const photoCount = uploadedPhotos[category.code]?.length || 0;
    return photoCount >= category.minRequired;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-gothic-400" />
          <h3 className="text-sm font-display font-semibold text-gothic-100">
            Photo Upload
          </h3>
        </div>
        {allRequirementsMet && categories.some(c => c.minRequired > 0) && (
          <CheckCircle className="w-4 h-4 text-success" />
        )}
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const requirements = getRequirementsMet(category);

          return (
            <div key={category.id} className={`gothic-card p-4 transition-all duration-300 ${
              requirements.minMet && category.minRequired > 0 ? 'bg-success/5 border border-success/20' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-medium text-gothic-200">
                      {category.name}
                      <span className={`text-xs font-normal ml-2 ${
                        requirements.minMet ? 'text-success' : 'text-gothic-400'
                      }`}>
                        ({requirements.photoCount}/{category.maxAllowed})
                      </span>
                    </h4>
                    {category.minRequired > 0 && (
                      <>
                        {requirements.minMet ? (
                          <CheckCircle className="w-3 h-3 text-success" />
                        ) : (
                          <span className="badge badge-warning text-xs">
                            Min: {category.minRequired}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-xs text-gothic-400 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              {reportId ? (
                <PhotoUpload
                  reportId={reportId}
                  category={category.code}
                  maxFiles={category.maxAllowed}
                  existingPhotos={uploadedPhotos[category.code] || []}
                  onUploadComplete={(photos) => handleUploadComplete(category.code, photos)}
                  onPhotoDelete={(photoId) => handlePhotoDelete(category.code, photoId)}
                  onUploadError={handleUploadError}
                />
              ) : (
                <div className="text-center py-6 bg-gothic-700/30 rounded-lg border-2 border-dashed border-gothic-600">
                  <Camera className="w-6 h-6 text-gothic-500 mx-auto mb-2" />
                  <p className="text-xs text-gothic-400">
                    Save draft first to enable photo uploads
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Requirements Summary */}
      {categories.some(c => c.minRequired > 0) && (
        <div className="gothic-card p-4">
          <h4 className="text-xs font-medium text-gothic-200 mb-3">Photo Requirements Summary</h4>
          <div className="space-y-2">
            {categories
              .filter(c => c.minRequired > 0)
              .map(category => {
                const requirements = getRequirementsMet(category);
                return (
                  <div key={category.id} className="flex items-center justify-between text-xs">
                    <span className="text-gothic-300">{category.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gothic-400">
                        {requirements.photoCount}/{category.minRequired}
                      </span>
                      {requirements.isValid ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-warning">!</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploadSection;