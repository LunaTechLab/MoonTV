/* eslint-disable react-hooks/exhaustive-deps */

import { Heart, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { deletePlayRecord, isFavorited, toggleFavorite } from '@/lib/db.client';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes?: number;
  source_name: string;
  progress?: number;
  year?: string;
  from?: string;
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;
}

function CheckCircleCustom() {
  return (
    <span className='inline-flex items-center justify-center'>
      <svg
        width='24'
        height='24'
        viewBox='0 0 32 32'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <circle cx='16' cy='16' r='13' stroke='white' strokeWidth='2' />
        <path
          d='M11 16.5L15 20L21 13.5'
          stroke='white'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  );
}

function PlayCircleSolid({
  className = '',
  fillColor = 'none',
}: {
  className?: string;
  fillColor?: string;
}) {
  return (
    <svg
      width='44'
      height='44'
      viewBox='0 0 44 44'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={`${className} block relative`}
    >
      <circle
        cx='22'
        cy='22'
        r='20'
        stroke='white'
        strokeWidth='1.5'
        fill={fillColor}
      />
      <polygon points='19,15 19,29 29,22' fill='white' />
    </svg>
  );
}

export default function VideoCard({
  id,
  title,
  poster,
  episodes,
  source,
  source_name,
  progress,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
}: VideoCardProps) {
  const [playHover, setPlayHover] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 检查初始收藏状态
  useEffect(() => {
    (async () => {
      try {
        const fav = await isFavorited(source, id);
        setFavorited(fav);
      } catch (err) {
        throw new Error('检查收藏状态失败');
      }
    })();
  }, [source, id]);

  // 切换收藏状态
  const handleToggleFavorite = async (
    e: React.MouseEvent<HTMLSpanElement | SVGElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const newState = await toggleFavorite(source, id, {
        title,
        source_name,
        year: year || '',
        cover: poster,
        total_episodes: episodes ?? 1,
        save_time: Date.now(),
      });
      setFavorited(newState);
    } catch (err) {
      // 如果删除失败且是收藏夹，恢复显示
      if (isDeleting) {
        setIsDeleting(false);
      }
      throw new Error('切换收藏状态失败');
    }
  };

  // 删除对应播放记录
  const handleDeleteRecord = async (
    e: React.MouseEvent<HTMLSpanElement | SVGElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await deletePlayRecord(source, id);
      onDelete?.();
    } catch (err) {
      throw new Error('删除播放记录失败');
    }
  };

  // 图片视差效果 - 参考 DemoCard，优化 Safari 性能
  useEffect(() => {
    let requestId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 只有在移动超过阈值时才更新，减少重绘
      if (Math.abs(x - lastX) > 5 || Math.abs(y - lastY) > 5) {
        lastX = x;
        lastY = y;

        if (requestId) cancelAnimationFrame(requestId);
        requestId = requestAnimationFrame(() => {
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

  const hideCheckCircle = from === 'favorites' || from === 'search';
  const alwaysShowHeart = from !== 'favorites';

  return (
    <Link
      href={`/detail?source=${source}&id=${id}&title=${encodeURIComponent(
        title.trim()
      )}${year ? `&year=${year}` : ''}${from ? `&from=${from}` : ''}`}
    >
      <div
        ref={cardRef}
        className={`group relative w-full rounded-lg overflow-hidden bg-transparent flex flex-col cursor-pointer transition-all duration-300 ease-in-out ${
          isDeleting ? 'opacity-0 scale-90' : ''
        }`}
      >
        {/* 海报图片容器 */}
        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-md transition-all duration-400 cubic-bezier(0.4,0,0.2,1)'>
          {/* 图片占位符 - 骨架屏效果 */}
          <ImagePlaceholder aspectRatio='aspect-[2/3]' />

          <Image
            src={poster}
            alt={title}
            fill
            className={`object-cover transition-all duration-700 cubic-bezier(0.34,1.56,0.64,1) group-hover:scale-[1.05]
                      ${
                        isLoaded
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-95'
                      }`}
            onLoadingComplete={() => setIsLoaded(true)}
            referrerPolicy='no-referrer'
            priority={false}
            style={{
              transform: `scale(1.05) translate(${parallax.x}px, ${parallax.y}px)`,
              transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
            }}
          />
          {/* Hover 效果层 */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent ${
              alwaysShowHeart
                ? 'opacity-50 group-hover:opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            } transition-all duration-300 cubic-bezier(0.4,0,0.2,1) flex items-center justify-center overflow-hidden`}
          >
            {/* 播放按钮 */}
            <div className='absolute inset-0 flex items-center justify-center pointer-events-auto'>
              <div
                className={`transition-all duration-300 cubic-bezier(0.34,1.56,0.64,1) ${
                  playHover ? 'scale-110 opacity-100' : 'scale-90 opacity-70'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(
                    `/play?source=${source}&id=${id}&title=${encodeURIComponent(
                      title
                    )}${year ? `&year=${year}` : ''}`
                  );
                }}
                onMouseEnter={() => setPlayHover(true)}
                onMouseLeave={() => setPlayHover(false)}
              >
                <PlayCircleSolid fillColor={playHover ? '#22c55e' : 'none'} />
              </div>
            </div>

            {/* 右侧操作按钮组 */}
            <div className='absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex items-center gap-3 transform transition-all duration-300 cubic-bezier(0.4,0,0.2,1) group-hover:scale-110'>
              {!hideCheckCircle && (
                <span
                  onClick={handleDeleteRecord}
                  title='标记已看'
                  className='inline-flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200'
                >
                  <CheckCircleCustom />
                </span>
              )}

              <span
                onClick={handleToggleFavorite}
                title={favorited ? '移除收藏' : '加入收藏'}
                className={`inline-flex items-center justify-center ${
                  alwaysShowHeart ? 'opacity-100' : 'opacity-70'
                } hover:opacity-100 transition-opacity duration-200`}
              >
                <Heart
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    favorited ? 'scale-105 text-red-500' : 'text-white/90'
                  }`}
                  strokeWidth={2}
                  fill={favorited ? 'currentColor' : 'none'}
                />
              </span>
            </div>
          </div>
          {/* 继续观看 - 集数矩形展示框 */}
          {episodes && episodes > 1 && currentEpisode && (
            <div className='absolute top-2 right-2 min-w-[1.875rem] h-5 sm:h-7 sm:min-w-[2.5rem] bg-green-500/90 dark:bg-green-600/90 rounded-md flex items-center justify-center px-2 shadow-md text-[0.55rem] sm:text-xs'>
              <span className='text-white font-bold leading-none'>
                {currentEpisode}
                <span className='mx-1 text-white/80'>/</span>
              </span>
              <span className='text-white font-bold leading-none'>
                {episodes}
              </span>
            </div>
          )}
          {/* 搜索非聚合 - 集数圆形展示框 */}
          {episodes && episodes > 1 && !currentEpisode && (
            <div className='absolute top-2 right-2 w-4 h-4 sm:w-7 sm:h-7 rounded-full bg-green-500/90 dark:bg-green-600/90 flex items-center justify-center shadow-md text-[0.55rem] sm:text-xs'>
              <span className='text-white font-bold leading-none'>
                {episodes}
              </span>
            </div>
          )}
          {/* 豆瓣链接按钮 */}
          {douban_id && from === 'search' && (
            <a
              href={`https://movie.douban.com/subject/${douban_id}`}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className='absolute top-2 left-2 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 cubic-bezier(0.4,0,0.2,1)'
            >
              <div className='w-4 h-4 sm:w-7 sm:h-7 rounded-full bg-[#22c55e] flex items-center justify-center shadow-md opacity-70 hover:opacity-100 transition-all duration-200 ease-in-out hover:scale-110 hover:bg-[#16a34a]'>
                <LinkIcon className='w-4 h-4 text-white' strokeWidth={2} />
              </div>
            </a>
          )}
        </div>

        {/* 播放进度条 - 移至图片容器外部，标题上方 */}
        {progress !== undefined && (
          <div className='mt-1 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
            <div
              className='h-full bg-[#22c55e] rounded-full transition-all duration-200'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 信息层 - 与 DemoCard 对齐的动画 */}
        <span className='mt-2 px-1 block font-semibold truncate w-full text-center text-xs sm:text-sm transition-all duration-500 cubic-bezier(0.34,1.56,0.64,1) group-hover:translate-y-[-4px] opacity-80 group-hover:opacity-100'>
          <span className='text-gray-900 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400'>
            {title}
          </span>
        </span>

        {/* 来源信息 */}
        {source && (
          <span className='mt-1 px-1 block text-gray-500 text-[0.5rem] sm:text-xs w-full text-center dark:text-gray-400 transition-all duration-500 cubic-bezier(0.34,1.56,0.64,1) group-hover:translate-y-[-4px] opacity-80 group-hover:opacity-100'>
            <span className='inline-block border border-gray-500/60 rounded px-2 py-[1px] dark:border-gray-400/60'>
              {source_name}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
