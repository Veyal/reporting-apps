'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, User, Settings } from 'lucide-react';
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

  const columnCount = Math.max(navItems.length, 1);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bottom-nav z-50">
      <div className="max-w-md mx-auto px-3 py-2">
        <div className="rounded-2xl border border-gothic-700/60 bg-gothic-900/95 shadow-[0_-6px_25px_rgba(0,0,0,0.5)] px-2 py-1.5">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveTab(item.href)}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all duration-200 text-[11px] font-medium ${
                    item.active
                      ? 'bg-gothic-800/70 text-white border border-gothic-600 shadow-inner shadow-black/30'
                      : 'text-gothic-400 hover:text-gothic-100 hover:bg-gothic-800/30'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      item.active ? 'scale-105 text-accent-300' : ''
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
