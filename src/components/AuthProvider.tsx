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

    // 从localStorage获取密码和用户名
    const password = localStorage.getItem('password');
    const username = localStorage.getItem('username');
    const fullPath =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : pathname;

    // 尝试认证
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, username }),
      });

      if (!res.ok) throw new Error('认证失败');

      setIsAuthenticated(true);
    } catch (error) {
      // 认证失败，清理并跳转登录
      setIsAuthenticated(false);
      localStorage.removeItem('password');
      localStorage.removeItem('username');
      router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    authenticate();
  }, [pathname, authenticate]);

  // 认证状态未知时显示加载状态
  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-transparent'>
        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>
        <div className='text-center max-w-md mx-auto px-6'>
          {/* 动画认证图标 */}
          <div className='relative mb-8'>
            <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
              <div className='text-white text-4xl'>🔐</div>
              {/* 旋转光环 */}
              <div className='absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
            </div>

            {/* 浮动粒子效果 */}
            <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
              <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
              <div
                className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
                style={{ animationDelay: '0.5s' }}
              ></div>
              <div
                className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
                style={{ animationDelay: '1s' }}
              ></div>
            </div>
          </div>

          {/* 品牌标题 */}
          <h1 className='text-green-600 tracking-tight text-center text-3xl font-extrabold mb-8 bg-clip-text drop-shadow-sm'>
            {siteName}
          </h1>

          {/* 加载消息 */}
          <div className='space-y-2'>
            <p className='text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse'>
              正在验证您的身份...
            </p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              请稍候，马上就好
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    return <>{children}</>;
  }
}
