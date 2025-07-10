import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { deletePlayRecord, isFavorited, toggleFavorite } from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
}

export default function VideoCard({
  id,
  title = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAggregate = from === 'search' && !!items?.length;

  // 聚合数据（仅在 search 模式下）
  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;

    const countMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();
    const yearCountMap = new Map<string, number>();

    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
      if (item.year?.trim()) {
        const yearStr = item.year.trim();
        yearCountMap.set(yearStr, (yearCountMap.get(yearStr) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
      mostFrequentYear: getMostFrequent(yearCountMap),
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = String(
    aggregateData?.mostFrequentDoubanId ?? douban_id
  );
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.mostFrequentYear ?? year;

  // 获取收藏状态
  useEffect(() => {
    if (from === 'douban' || !actualSource || !actualId) return;
    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch (err) {
        throw new Error('检查收藏状态失败');
      }
    };
    fetchFavoriteStatus();
  }, [from, actualSource, actualId]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (from === 'douban' || !actualSource || !actualId) return;

      try {
        const newState = await toggleFavorite(actualSource, actualId, {
          title: actualTitle,
          source_name: source_name || '',
          year: actualYear || '',
          cover: actualPoster,
          total_episodes: actualEpisodes ?? 1,
          save_time: Date.now(),
        });
        setFavorited(newState);
      } catch (err) {
        throw new Error('切换收藏状态失败');
      }
    },
    [
      from,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (from !== 'playrecord' || !actualSource || !actualId) return;

      try {
        await deletePlayRecord(actualSource, actualId);
        setIsDeleting(true);
        onDelete?.();
      } catch (err) {
        throw new Error('删除播放记录失败');
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const handleClick = useCallback(() => {
    if (from === 'douban') {
      router.push(`/play?title=${encodeURIComponent(actualTitle.trim())}`);
    } else if (actualSource && actualId) {
      router.push(
        `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle
        )}${actualYear ? `&year=${actualYear}` : ''}`
      );
    }
  }, [from, actualSource, actualId, router, actualTitle, actualYear]);

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: true,
        showDoubanLink: false,
        showRating: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: !isAggregate,
        showCheckCircle: false,
        showDoubanLink: !!actualDoubanId,
        showRating: false,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: !!rate,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, actualDoubanId, rate]);

  return (
    <div
      className={`group relative w-full rounded-lg bg-transparent transition-all duration-300 transform ${
        isDeleting
          ? 'opacity-0 scale-90 translate-y-4'
          : 'hover:-translate-y-1 hover:scale-[1.02]'
      }`}
      onClick={handleClick}
    >
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-lg transition-all duration-300'>
        {/* 骨架屏 */}
        {!isLoaded && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}

        {/* 图片加载动画 */}
        <Image
          src={actualPoster}
          alt={actualTitle}
          fill
          className={`object-cover transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 blur-sm'
          } group-hover:scale-105`}
          onLoadingComplete={() => setIsLoaded(true)}
          referrerPolicy='no-referrer'
          priority={false}
        />

        {/* 悬浮层 - 添加渐变动画效果 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center'>
          {config.showPlayButton && (
            <PlayCircleIcon
              size={52}
              strokeWidth={1}
              className='text-white transition-all duration-300 transform hover:scale-110 hover:fill-green-500 rounded-full cursor-pointer opacity-80 hover:opacity-100'
            />
          )}

          {/* 已看 / 收藏按钮 - 添加弹出动画 */}
          {(config.showHeart || config.showCheckCircle) && (
            <div className='absolute bottom-3 right-3 flex items-center gap-3 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out'>
              {config.showCheckCircle && (
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    handleDeleteRecord(
                      e as unknown as React.MouseEvent<HTMLDivElement>
                    )
                  }
                  title='标记为已看'
                  className='p-1.5 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-white/30'
                >
                  <CheckCircle size={20} className='text-white' />
                </button>
              )}

              {config.showHeart && (
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    handleToggleFavorite(
                      e as unknown as React.MouseEvent<HTMLDivElement>
                    )
                  }
                  title={favorited ? '取消收藏' : '加入收藏'}
                  className='p-1.5 rounded-full transition-all duration-300 transform hover:scale-110 hover:bg-white/30'
                >
                  <Heart
                    size={20}
                    className={`transition-all duration-300 ${
                      favorited
                        ? 'fill-red-600 stroke-red-600'
                        : 'fill-transparent stroke-white hover:stroke-red-400'
                    }`}
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 集数徽章 / 标签元素 - 添加微动画 */}
        {config.showRating && rate && (
          <div className='absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-md transform transition-transform duration-300 group-hover:scale-110'>
            {rate}
          </div>
        )}

        {['playrecord', 'favorite'].includes(from) &&
          actualEpisodes &&
          actualEpisodes > 1 &&
          currentEpisode && (
            <div className='absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold rounded-md px-2 py-1 shadow-md transform transition-transform duration-300 group-hover:scale-105'>
              {currentEpisode}/{actualEpisodes}
            </div>
          )}

        {from === 'search' &&
          actualEpisodes &&
          actualEpisodes > 1 &&
          !currentEpisode && (
            <div className='absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold rounded-full w-8 h-8 flex items-center justify-center shadow-md transform transition-transform duration-300 group-hover:scale-105'>
              {actualEpisodes}
            </div>
          )}

        {/* 豆瓣链接按钮 - 添加滑入动画 */}
        {config.showDoubanLink && actualDoubanId && (
          <a
            href={`https://movie.douban.com/subject/${actualDoubanId}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='absolute top-2 left-2 opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300'
          >
            <div className='w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md hover:bg-green-600 transition-colors duration-200 transform hover:scale-105'>
              <Link size={16} className='text-white' />
            </div>
          </a>
        )}
      </div>

      {/* 进度条 - 移除进度变化动画 */}
      {config.showProgress && progress !== undefined && (
        <div className='mt-1 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
          <div
            className='h-full bg-green-500 rounded-full'
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 标题与来源信息 - 添加颜色过渡 */}
      <span className='mt-2 block text-center text-sm font-semibold truncate text-gray-900 dark:text-gray-100 transition-all duration-300 group-hover:text-green-600 dark:group-hover:text-green-400'>
        {actualTitle}
      </span>

      {config.showSourceName && source_name && (
        <span className='block text-center text-xs text-gray-500 dark:text-gray-400 mt-1 transform transition-all duration-300 group-hover:scale-105 group-hover:text-green-500 dark:group-hover:text-green-500'>
          <span className='inline-block border border-gray-500/60 dark:border-gray-400/60 px-2 py-0.5 rounded transition-all duration-300 group-hover:border-green-500/60'>
            {source_name}
          </span>
        </span>
      )}
    </div>
  );
}
