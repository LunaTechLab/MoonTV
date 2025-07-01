'use client';

import Link from 'next/link';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

const MobileHeader = () => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden relative w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm dark:bg-gray-900/70 dark:border-gray-700/50'>
      <div className='h-12 flex items-center justify-center'>
        <Link
          href='/'
          className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'
        >
          {siteName}
        </Link>
      </div>
      <div className='absolute top-1/2 right-4 -translate-y-1/2'>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default MobileHeader;
