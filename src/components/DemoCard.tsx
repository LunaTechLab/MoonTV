/* eslint-disable react-hooks/exhaustive-deps */

import { Link as LinkIcon, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface DemoCardProps {
  id: string;
  title: string;
  poster: string;
  rate?: string;
  type?: string;
}

// 优化的搜索图标组件，添加更多动画
function SearchCircle({
  className = '',
  fillColor = 'none',
  isHovered = false,
}: {
  className?: string;
  fillColor?: string;
  isHovered?: boolean;
}) {
  return (
    <svg
      width='44'
      height='44'
      viewBox='0 0 44 44'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={`${className} block relative transition-all duration-300 ${
        isHovered ? 'scale-105' : 'scale-95'
      }`}
    >
      <circle
        cx='22'
        cy='22'
        r='20'
        stroke='white'
        strokeWidth='1.5'
        fill={fillColor}
        className='transition-all duration-300'
      />
      <foreignObject x='0' y='0' width='44' height='44'>
        <div className='w-full h-full flex items-center justify-center'>
          <Search
            className='h-5 w-5 text-white transition-all duration-300'
            strokeWidth={2}
            style={{
              transform: isHovered ? 'rotate(15deg)' : 'rotate(0)',
              filter: isHovered
                ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))'
                : 'none',
            }}
          />
        </div>
      </foreignObject>
    </svg>
  );
}

const DemoCard = ({ id, title, poster, rate, type }: DemoCardProps) => {
  const [hover, setHover] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // 图片视差效果 - 优化 Safari 性能
  useEffect(() => {
    let requestId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 只有当移动超过阈值时才更新视差，减少 Safari 中的重绘
      if (Math.abs(x - lastX) > 5 || Math.abs(y - lastY) > 5) {
        lastX = x;
        lastY = y;

        // 使用 requestAnimationFrame 优化性能
        if (requestId) cancelAnimationFrame(requestId);
        requestId = requestAnimationFrame(() => {
          // 计算视差偏移量 (-5 到 5 之间)
          const xParallax = (x / rect.width - 0.5) * 10;
          const yParallax = (y / rect.height - 0.5) * 10;

          setParallax({ x: xParallax, y: yParallax });
        });
      }
    };

    const handleMouseLeave = () => {
      if (requestId) cancelAnimationFrame(requestId);
      setParallax({ x: 0, y: 0 });
    };

    if (cardRef.current) {
      cardRef.current.addEventListener('mousemove', handleMouseMove);
      cardRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.removeEventListener('mousemove', handleMouseMove);
        cardRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, []);

  const handleClick = () => {
    router.push(
      `/aggregate?q=${encodeURIComponent(title.trim())}&type=${type}`
    );
  };

  return (
    <div
      ref={cardRef}
      className='group relative w-full rounded-lg overflow-hidden bg-transparent flex flex-col cursor-pointer transition-all duration-300 ease-in-out'
      onClick={handleClick}
    >
      {/* 海报图片区域 */}
      <div
        className='relative w-full overflow-hidden rounded-md transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) safari-fix'
        style={{
          // 为 Safari 提供固定宽高比的后备方案
          paddingBottom: '150%', // 2:3 比例
          height: '0',
        }}
      >
        {/* 图片占位符 - 骨架屏效果 */}
        <ImagePlaceholder aspectRatio='aspect-[2/3]' />

        {/* 图片组件 */}
        <Image
          src={poster}
          alt={title}
          fill
          ref={imgRef}
          className={`object-cover transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:scale-[1.05]
                      ${
                        isLoaded
                          ? 'opacity-100 scale-100 blur-0'
                          : 'opacity-0 scale-95 blur-sm'
                      }`}
          onLoadingComplete={() => setIsLoaded(true)}
          referrerPolicy='no-referrer'
          priority={false}
          style={{
            transform: `scale(1.05) translate(${parallax.x}px, ${parallax.y}px)`,
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            // 修复 Safari 中可能的渲染问题
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
          }}
        />

        {/* 评分徽章 - 暗色模式优化 */}
        {rate && (
          <div className='absolute top-2 right-2 min-w-[1.25rem] h-4 w-4 sm:h-7 sm:w-7 sm:min-w-[1.5rem] bg-pink-500 dark:bg-pink-400 rounded-full flex items-center justify-center px-1 shadow-md transform transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) scale-100 group-hover:scale-110'>
            <span className='text-white text-[0.5rem] sm:text-xs font-bold leading-none'>
              {rate}
            </span>
          </div>
        )}

        {/* 悬浮层 - 搜索按钮 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center'>
          <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className={`transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) ${
              hover ? 'scale-110' : 'scale-90'
            }`}
          >
            <SearchCircle
              fillColor={hover ? '#22c55e' : 'none'}
              isHovered={hover}
            />
          </div>
        </div>

        {/* 外部链接按钮 - 暗色模式优化 */}
        <a
          href={`https://movie.douban.com/subject/${id}`}
          target='_blank'
          rel='noopener noreferrer'
          onClick={(e) => e.stopPropagation()}
          className='absolute top-2 left-2 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:translate-y-0 translate-y-[-10px]'
        >
          <div className='w-4 h-4 sm:w-7 sm:h-7 rounded-full bg-[#22c55e] dark:bg-[#16a34a] flex items-center justify-center shadow-md transition-all duration-300 ease-in-out hover:scale-110 hover:bg-[#16a34a] dark:hover:bg-[#15803d]'>
            <LinkIcon className='w-4 h-4 text-white' strokeWidth={2} />
          </div>
        </a>
      </div>

      {/* 信息层 - 暗色模式优化 */}
      <span className='mt-2 px-1 block font-semibold truncate w-full text-center text-xs sm:text-sm transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:translate-y-[-4px] opacity-80 group-hover:opacity-100'>
        <span className='text-gray-900 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400'>
          {title}
        </span>
      </span>
    </div>
  );
};

export default DemoCard;
