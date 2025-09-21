'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  className,
  fallback = '/placeholder.png'
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('accessToken');

        if (!token) {
          setError(true);
          setLoading(false);
          return;
        }

        const response = await axios.get(src, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob'
        });

        // Create object URL from blob
        const imageUrl = URL.createObjectURL(response.data);
        setImageSrc(imageUrl);
        setError(false);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    // Cleanup
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`${className} bg-gothic-700 animate-pulse`} />
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-gothic-700 flex items-center justify-center`}>
        <span className="text-gothic-500 text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc || fallback}
      alt={alt}
      className={className}
    />
  );
};

export default AuthenticatedImage;