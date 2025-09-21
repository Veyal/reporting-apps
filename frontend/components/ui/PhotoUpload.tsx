'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { photosAPI } from '@/lib/api';
import AuthenticatedImage from './AuthenticatedImage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface PhotoUploadProps {
  reportId: string;
  category: string;
  maxFiles?: number;
  existingPhotos?: any[];
  onUploadComplete?: (photos: any[]) => void;
  onUploadError?: (error: string) => void;
  onPhotoDelete?: (photoId: string) => void;
}

interface PhotoFile {
  file?: File; // Optional for already uploaded photos from backend
  preview?: string;
  id?: string;
  photoId?: string; // Backend photo ID for deletion
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
  deleting?: boolean;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  reportId,
  category,
  maxFiles = 10,
  existingPhotos = [],
  onUploadComplete,
  onUploadError,
  onPhotoDelete,
}) => {
  const [files, setFiles] = useState<PhotoFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load existing photos on mount
  useEffect(() => {
    if (existingPhotos.length > 0) {
      const photoFiles = existingPhotos.map(photo => ({
        photoId: photo.id,
        // Construct the photo URL - backend stores filename, we need full URL
        // API_BASE_URL already includes /api, so we don't need to add it again
        preview: photo.url || `${API_BASE_URL}/photos/file/${reportId}/${photo.filename}`,
        id: Math.random().toString(36).substr(2, 9),
        uploaded: true,
      }));
      setUploadedFiles(photoFiles);
      setFiles(photoFiles);
    }
  }, [existingPhotos]);

  const uploadSingleFile = async (photoFile: PhotoFile) => {
    if (!photoFile.file) {
      return { success: false, error: 'No file to upload' };
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('photos', photoFile.file); // Use the actual File object

    try {
      const response = await photosAPI.uploadPhotos(reportId, formData);
      return { success: true, data: response.data.photos };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Upload failed';
      return { success: false, error: errorMessage };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: PhotoFile[] = acceptedFiles.map(file => ({
      file: file, // Store the actual File object
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      uploading: true,
      uploaded: false,
    }));

    // Add files to the list immediately with uploading state
    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));

    // Upload each file automatically
    for (const file of newFiles) {
      const result = await uploadSingleFile(file);

      if (result.success) {
        // Mark as uploaded
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, uploading: false, uploaded: true }
            : f
        ));
        // Move to uploaded files
        setUploadedFiles(prev => [...prev, file]);
        onUploadComplete?.(result.data);
      } else {
        // Mark with error
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, uploading: false, error: result.error }
            : f
        ));
        onUploadError?.(result.error);
      }
    }
  }, [maxFiles, reportId, category, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploadedFiles.length >= maxFiles,
  });

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // If it has a photoId, it's from backend and needs to be deleted
    if (file.photoId && file.uploaded) {
      // Mark as deleting
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, deleting: true } : f
      ));

      try {
        await photosAPI.deletePhoto(reportId, file.photoId);
        // Remove from lists
        setFiles(prev => prev.filter(f => f.id !== fileId));
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        onPhotoDelete?.(file.photoId);
      } catch (error) {
        console.error('Failed to delete photo:', error);
        // Remove deleting state on error
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, deleting: false } : f
        ));
      }
    } else {
      // Just remove from local state
      setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === fileId);
        if (fileToRemove?.preview && fileToRemove.file) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
        return prev.filter(f => f.id !== fileId);
      });
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const getDropzoneClassName = () => {
    let className = 'dropzone p-8 text-center transition-colors duration-300';
    
    if (isDragReject) {
      className += ' dropzone-reject';
    } else if (isDragActive) {
      className += ' dropzone-active';
    }
    
    return className;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div {...getRootProps()} className={getDropzoneClassName()}>
        <input {...getInputProps()} />
        <div className="space-y-4">
          <Upload className={`w-12 h-12 text-gothic-400 mx-auto transition-transform duration-300 gpu-accelerated ${
            isDragActive ? 'scale-110 animate-bounce-in' : ''
          }`} />
          <div>
            <p className="text-gothic-200 font-medium mb-2 text-xs animate-fade-in">
              {isDragActive
                ? 'Drop photos here...'
                : isDragReject
                ? 'Invalid file type'
                : 'Drag & drop photos here, or click to select'
              }
            </p>
            <p className="text-gothic-400 text-xs animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Supports JPEG, PNG, GIF, WebP (max 10MB each)
            </p>
            <p className="text-gothic-500 text-xs mt-1 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              {uploadedFiles.length}/{maxFiles} photos uploaded
            </p>
          </div>
        </div>
      </div>

      {/* File Preview */}
      {files.length > 0 && (
        <div className="space-y-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="photo-item group animate-stagger-in gpu-accelerated hover-lift scale-tap"
                style={{animationDelay: `${0.4 + index * 0.1}s`}}
              >
                {file.uploaded && !file.file ? (
                  <AuthenticatedImage
                    src={file.preview || ''}
                    alt="Uploaded photo"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 gpu-accelerated"
                  />
                ) : (
                  <img
                    src={file.preview}
                    alt={file.file?.name || 'Uploaded photo'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 gpu-accelerated"
                  />
                )}
                <div className="absolute inset-0 bg-gothic-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex items-center justify-center space-x-2">
                    {file.deleting ? (
                      <div className="spinner w-6 h-6" />
                    ) : file.uploading ? (
                      <div className="spinner w-6 h-6" />
                    ) : file.error ? (
                      <>
                        <AlertCircle className="w-6 h-6 text-error" />
                        <button
                          onClick={() => removeFile(file.id!)}
                          className="p-2 bg-error/80 hover:bg-error rounded-full transition-all duration-200 scale-press gpu-accelerated"
                          title="Remove"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : (
                      <>
                        {file.uploaded && <CheckCircle className="w-5 h-5 text-success animate-check-bounce" />}
                        <button
                          onClick={() => removeFile(file.id!)}
                          className="p-2 bg-error/80 hover:bg-error rounded-full transition-all duration-200 scale-press gpu-accelerated"
                          title="Delete photo"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {file.error && (
                  <div className="absolute bottom-0 left-0 right-0 bg-error/90 text-white text-xs p-2">
                    {file.error}
                  </div>
                )}
                {file.uploading && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gothic-800/90 text-white text-xs p-2">
                    Uploading...
                  </div>
                )}
                {file.uploaded && !file.error && (
                  <div className="absolute top-2 right-2 animate-bounce-in">
                    <CheckCircle className="w-5 h-5 text-success animate-check-bounce" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
