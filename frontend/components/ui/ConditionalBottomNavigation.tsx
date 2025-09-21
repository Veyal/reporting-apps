'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import BottomNavigation from './BottomNavigation';

const ConditionalBottomNavigation = () => {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  // Don't render anything while loading or if not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  // Hide on report create/edit page
  if (pathname?.startsWith('/reports/create')) {
    return null;
  }

  return <BottomNavigation />;
};

export default ConditionalBottomNavigation;

