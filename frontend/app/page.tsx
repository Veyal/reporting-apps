'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading && !shouldRedirect) {
      // Small delay to ensure stable state before redirecting
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading, shouldRedirect]);

  useEffect(() => {
    if (shouldRedirect) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [shouldRedirect, isAuthenticated, router]);

  // Always show loading spinner while determining auth state
  return (
    <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
      <LoadingSpinner size="lg" />
      <div className="mt-4 text-gothic-400 text-sm">
        {shouldRedirect ? 'Redirecting...' : 'Checking authentication...'}
      </div>
    </div>
  );
}


