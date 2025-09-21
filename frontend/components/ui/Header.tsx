'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showMenu = false,
  onMenuClick
}) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="sticky top-0 z-40 bg-gothic-900/95 backdrop-blur-md border-b border-gothic-800">
      <div className="mobile-container">
        <div className="flex items-center h-14">
          {showBack && (
            <button
              onClick={handleBack}
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gothic-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gothic-300" />
            </button>
          )}

          {showMenu && (
            <button
              onClick={onMenuClick}
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gothic-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gothic-300" />
            </button>
          )}

          <h1 className="text-sm font-display font-semibold text-gothic-100 truncate">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;