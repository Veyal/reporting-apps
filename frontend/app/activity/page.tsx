'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ActivityPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gothic-900 pb-20">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-container">
          <div className="flex items-center h-20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="header-title truncate">
                    Activity
                  </h1>
                  <p className="header-subtitle truncate">
                    Notifications & Updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Coming Soon Content */}
      <main className="mobile-container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gothic-800 rounded-full flex items-center justify-center animate-pulse-subtle">
              <Bell className="w-10 h-10 text-gothic-500" />
            </div>
            <h2 className="text-xl font-display font-semibold text-gothic-100 mb-3">
              Coming Soon
            </h2>
            <p className="text-sm text-gothic-400 max-w-xs mx-auto">
              Activity feed and notifications will be available in the next update.
            </p>
            <div className="mt-8">
              <div className="inline-flex items-center space-x-2 text-xs text-gothic-500">
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse"></div>
                <span>In Development</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}