'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, Plus, User, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

const BottomNavigation = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

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
                onClick={() => setActiveTab(item.href)}
                className={`flex flex-col items-center justify-center min-w-0 transition-all duration-200 gpu-accelerated ${
                  isCreate
                    ? 'relative -mt-4'
                    : 'py-2 px-3 flex-1'
                } ${
                  item.active && !isCreate
                    ? 'text-accent-400'
                    : !isCreate && 'text-gothic-400 hover:text-gothic-200 scale-tap'
                }`}
              >
                {isCreate ? (
                  <>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg scale-press gpu-accelerated ${
                      item.active
                        ? 'bg-accent-gradient animate-nav-spring shadow-accent-500/30'
                        : 'bg-accent-500 hover:bg-accent-600 shadow-accent-500/20'
                    } ${item.active ? 'animate-bounce-in' : ''}`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-medium mt-1 text-gothic-300">{item.label}</span>
                  </>
                ) : (
                  <>
                    <Icon className={`w-5 h-5 mb-1 transition-transform duration-200 gpu-accelerated ${
                      item.active ? 'animate-nav-spring text-accent-400' : ''
                    }`} />
                    <span className={`text-xs font-medium truncate transition-all duration-200 ${
                      item.active ? 'animate-fade-in-up' : ''
                    }`}>{item.label}</span>
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
