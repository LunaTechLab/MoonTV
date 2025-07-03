/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * 退出登录按钮
 *
 * 功能：
 * 1. 清除 localStorage 中保存的 username 和 password
 * 2. 跳转到 /login 页面
 */
export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('username');
      localStorage.removeItem('password');
    }
    // 使用 replace，避免用户返回上一页时仍然处于已登录状态
    router.replace('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
      aria-label='Logout'
    >
      <LogOut className='w-full h-full' />
    </button>
  );
}
