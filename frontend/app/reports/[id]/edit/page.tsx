'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Redirect Page for Legacy Edit Route
 *
 * This page automatically redirects to the new unified create/edit route
 * to maintain compatibility with existing bookmarks and links.
 */

export default function LegacyEditReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  useEffect(() => {
    // Redirect to the new unified route
    router.replace(`/reports/create?draft=${reportId}`);
  }, [reportId, router]);

  return (
    <div className="min-h-screen bg-gothic-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gothic-300 mt-4">Redirecting to the new editor...</p>
      </div>
    </div>
  );
}
