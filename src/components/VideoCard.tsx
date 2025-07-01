import { Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { deletePlayRecord, isFavorited, toggleFavorite } from '@/lib/db.client';

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
      className={className}
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
  onDelete,
}: VideoCardProps) {
  const [playHover, setPlayHover] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const router = useRouter();

  // 检查初始收藏状态
  useEffect(() => {
    (async () => {
      try {
        const fav = await isFavorited(source, id);
        setFavorited(fav);
      } catch (err) {
        /* eslint-disable no-console */
        console.error('检查收藏状态失败:', err);
      }
    })();
    // 仅在组件挂载或 source/id 变化时运行
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
      /* eslint-disable no-console */
      console.error('切换收藏失败:', err);
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

      // 通知父组件更新
      onDelete?.();
    } catch (err) {
      /* eslint-disable no-console */
      console.error('删除播放记录失败:', err);
    }
  };

  const hideCheckCircle = from === 'favorites' || from === 'search';

  return (
    <Link
      href={`/detail?source=${source}&id=${id}&title=${encodeURIComponent(
        title
      )}${year ? `&year=${year}` : ''}${from ? `&from=${from}` : ''}`}
    >
      <div className='group relative w-full rounded-lg bg-transparent shadow-none flex flex-col'>
        {/* 海报图片 - 2:3 比例 */}
        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-md'>
          <Image
            src={poster}
            alt={title}
            fill
            className='object-cover'
            unoptimized
          />

          {/* Hover 效果 */}
          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center group pointer-events-none'>
            <div className='absolute inset-0 flex items-center justify-center pointer-events-auto'>
              <div
                className={`transition-all duration-200 pointer-events-auto ${
                  playHover ? 'scale-110' : ''
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
            <div className='absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex items-center gap-6'>
              {!hideCheckCircle && (
                <span
                  onClick={handleDeleteRecord}
                  title='标记已看'
                  className='inline-flex items-center justify-center pointer-events-auto'
                >
                  <CheckCircleCustom />
                </span>
              )}
              {favorited && (
                <span className='inline-flex w-4 h-4 sm:w-6 sm:h-6 pointer-events-none' />
              )}
              {!favorited && (
                <span
                  onClick={handleToggleFavorite}
                  title={favorited ? '移除收藏' : '加入收藏'}
                  className='inline-flex items-center justify-center pointer-events-auto'
                >
                  <Heart
                    className={`h-4 w-4 sm:h-6 sm:w-6 stroke-[2] ${
                      favorited ? 'text-red-500' : 'text-white/90'
                    }`}
                    fill={favorited ? 'currentColor' : 'none'}
                  />
                </span>
              )}
            </div>
          </div>

          {/* 集数指示器 - 绿色小圆球 */}
          {episodes && episodes > 1 && (
            <div className='absolute top-2 right-2 w-4 h-4 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center'>
              <span className='text-white text-[0.5rem] sm:text-xs font-bold'>
                {episodes}
              </span>
            </div>
          )}

          {/* 播放进度条 */}
          {progress !== undefined && (
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600'>
              <div
                className='h-full bg-blue-500 transition-all duration-300'
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* 当前播放集数 */}
          {currentEpisode && episodes && episodes > 1 && (
            <div className='absolute top-2 left-2 w-4 h-4 sm:w-7 sm:h-7 bg-blue-500 rounded-full flex items-center justify-center'>
              <span className='text-white text-[0.5rem] sm:text-xs font-bold'>
                {currentEpisode}
              </span>
            </div>
          )}
        </div>

        {/* 信息层 */}
        <div className='absolute top-[calc(100%+0.5rem)] left-0 right-0'>
          <div className='flex flex-col items-center justify-center'>
            <span className='text-gray-900 font-semibold truncate w-full text-center text-xs sm:text-sm dark:text-gray-200'>
              {title}
            </span>
            {source && (
              <span className='text-gray-500 text-[0.5rem] sm:text-xs w-full text-center mt-1 dark:text-gray-400'>
                <span className='inline-block border border-gray-500/60 rounded px-2 py-[1px] dark:border-gray-400/60'>
                  {source_name}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 收藏夹始终显示红心 */}
        {favorited && (
          <div className='absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex items-center'>
            <span
              onClick={handleToggleFavorite}
              title={favorited ? '移除收藏' : '加入收藏'}
              className='inline-flex items-center justify-center'
            >
              <Heart
                className={`h-4 w-4 sm:h-6 sm:w-6 stroke-[2] ${
                  favorited ? 'text-red-500' : 'text-white/90'
                }`}
                fill={favorited ? 'currentColor' : 'none'}
              />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
