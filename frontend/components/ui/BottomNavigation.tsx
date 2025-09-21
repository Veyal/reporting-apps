'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, Plus, User, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BottomNavigation = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Home',
      active: pathname === '/dashboard'
    },
    {
      href: '/reports',
      icon: FileText,
      label: 'Reports',
      active: pathname.startsWith('/reports') && pathname !== '/reports/create'
    },
    {
      href: '/reports/create',
      icon: Plus,
      label: 'Create',
      active: pathname === '/reports/create'
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profile',
      active: pathname === '/profile'
    },
    ...(isAdmin ? [{
      href: '/admin',
      icon: Settings,
      label: 'Admin',
      active: pathname.startsWith('/admin')
    }] : [])
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bottom-nav z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCreate = item.label === 'Create';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-0 transition-all duration-200 ${
                  isCreate
                    ? 'relative -mt-4'
                    : 'py-2 px-3 flex-1'
                } ${
                  item.active && !isCreate
                    ? 'text-accent-400'
                    : !isCreate && 'text-gothic-400 hover:text-gothic-200 active:scale-95'
                }`}
              >
                {isCreate ? (
                  <>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                      item.active
                        ? 'bg-accent-gradient scale-110 shadow-accent-500/30'
                        : 'bg-accent-500 hover:bg-accent-600 active:scale-95 shadow-accent-500/20'
                    }`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-medium mt-1 text-gothic-300">{item.label}</span>
                  </>
                ) : (
                  <>
                    <Icon className={`w-5 h-5 mb-1 ${item.active ? 'scale-110' : ''} transition-transform duration-200`} />
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
