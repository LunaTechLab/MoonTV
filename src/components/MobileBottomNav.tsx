'use client';

import {
  Clover,
  Film,
  Home,
  MessageCircleHeart,
  MountainSnow,
  Search,
  Star,
  Swords,
  Tv,
  VenetianMask,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Search, label: '搜索', href: '/search' },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie&tag=热门&title=热门电影',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv&tag=热门&title=热门剧集',
    },
    {
      icon: Star,
      label: '高分',
      href: '/douban?type=movie&tag=top250&title=豆瓣 Top250',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=tv&tag=综艺&title=综艺',
    },
    { icon: Swords, label: '美剧', href: '/douban?type=tv&tag=美剧' },
    {
      icon: MessageCircleHeart,
      label: '韩剧',
      href: '/douban?type=tv&tag=韩剧',
    },
    { icon: MountainSnow, label: '日剧', href: '/douban?type=tv&tag=日剧' },
    { icon: VenetianMask, label: '日漫', href: '/douban?type=tv&tag=日本动画' },
  ];

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const tagMatch = href.match(/tag=([^&]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`) &&
        decodedActive.includes(`tag=${tagMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-20 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 overflow-x-auto overscroll-x-contain whitespace-nowrap scrollbar-hide dark:bg-gray-900/80 dark:border-gray-700/50'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className='flex items-center'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className='flex-shrink-0 w-1/5'>
              <Link
                href={item.href}
                className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs'
              >
                <item.icon
                  className={`h-6 w-6 ${
                    active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span
                  className={
                    active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
