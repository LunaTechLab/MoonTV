'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden relative w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm dark:bg-gray-900/70 dark:border-gray-700/50'>
      {/* 返回按钮 */}
      {showBackButton && (
        <div className='absolute top-1/2 left-4 -translate-y-1/2'>
          <BackButton />
        </div>
      )}

      {/* 站点名称 */}
      <div className='h-12 flex items-center justify-center'>
        <Link
          href='/'
          className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'
        >
          {siteName}
        </Link>
      </div>

      {/* 右侧按钮 */}
      <div className='absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2'>
        <LogoutButton />
        <ThemeToggle />
      </div>
    </header>
  );
};

export default MobileHeader;
