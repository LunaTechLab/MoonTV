'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';

import { useSite } from './SiteProvider';

interface Props {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { siteName } = useSite();
  const authenticate = useCallback(async () => {
    // 登录页
    if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
      setIsAuthenticated(true);
      return;
    }

    // 从localStorage获取密码
    const password = localStorage.getItem('password');
    const fullPath =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : pathname;

    // 尝试认证
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error('认证失败');

      setIsAuthenticated(true);
    } catch (error) {
      // 认证失败，清理并跳转登录
      setIsAuthenticated(false);
      localStorage.removeItem('password');
      router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    authenticate();
  }, [pathname, authenticate]);

  // 认证状态未知时显示加载状态
  if (!isAuthenticated) {
    return (
      <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden'>
        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>
        <div className='relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/40 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40 backdrop-blur-xl shadow-2xl p-10 dark:border dark:border-zinc-800'>
          <h1 className='text-green-600 tracking-tight text-center text-3xl font-extrabold mb-8 bg-clip-text drop-shadow-sm'>
            {siteName}
          </h1>
          <div className='flex justify-center my-10'>
            <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500' />
          </div>
          <p className='text-gray-700 dark:text-gray-300 font-medium text-lg text-center'>
            正在验证您的身份，请稍候...
          </p>
        </div>
      </div>
    );
  } else {
    return <>{children}</>;
  }
}
