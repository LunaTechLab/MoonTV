/* eslint-disable react-hooks/exhaustive-deps, no-console */

'use client';

import { Heart, LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import type { PlayRecord } from '@/lib/db.client';
import {
  generateStorageKey,
  getAllPlayRecords,
  isFavorited,
  toggleFavorite,
} from '@/lib/db.client';
import { type VideoDetail, fetchVideoDetail } from '@/lib/fetchVideoDetail';

import PageLayout from '@/components/PageLayout';

function DetailPageClient() {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playRecord, setPlayRecord] = useState<PlayRecord | null>(null);
  const [favorited, setFavorited] = useState(false);
  // 是否倒序显示选集
  const [reverseEpisodeOrder, setReverseEpisodeOrder] = useState(false);

  const fallbackTitle = searchParams.get('title') || '';
  const fallbackYear = searchParams.get('year') || '';

  // 格式化剩余时间（如 1h 50m）
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (parts.length === 0) parts.push('0m');
    return parts.join(' ');
  };

  useEffect(() => {
    const source = searchParams.get('source');
    const id = searchParams.get('id');

    if (!source || !id) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 获取视频详情
        const detailData = await fetchVideoDetail({
          source,
          id,
          fallbackTitle,
          fallbackYear,
        });
        setDetail(detailData);

        // 获取播放记录
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(source, id);
        setPlayRecord(allRecords[key] || null);

        // 检查收藏状态
        try {
          const fav = await isFavorited(source, id);
          setFavorited(fav);
        } catch (checkErr) {
          console.error('检查收藏状态失败:', checkErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  // 切换收藏状态
  const handleToggleFavorite = async () => {
    const source = searchParams.get('source');
    const id = searchParams.get('id');
    if (!source || !id || !detail) return;

    try {
      const newState = await toggleFavorite(source, id, {
        title: detail.title,
        source_name: detail.source_name,
        year: detail.year || fallbackYear || '',
        cover: detail.poster || '',
        total_episodes: detail.episodes.length || 1,
        save_time: Date.now(),
      });
      setFavorited(newState);
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  return (
    <PageLayout activePath='/detail'>
      <div className='flex flex-col min-h-full px-2 sm:px-10 pt-4 sm:pt-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] overflow-visible'>
        {/* 顶部返回按钮已移入右侧信息容器 */}
        {loading ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='text-red-500 text-center'>
              <div className='text-lg font-semibold mb-2'>加载失败</div>
              <div className='text-sm'>{error}</div>
            </div>
          </div>
        ) : !detail ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='text-gray-500 text-center'>
              <div className='text-lg font-semibold mb-2'>未找到视频详情</div>
            </div>
          </div>
        ) : (
          <div className='max-w-[95%] mx-auto'>
            {/* 主信息区：左图右文 */}
            <div className='relative flex flex-col md:flex-row gap-8 mb-0 sm:mb-8 bg-transparent rounded-xl p-2 sm:p-6 md:items-start'>
              {/* 返回按钮放置在主信息区左上角 */}
              <button
                onClick={() => {
                  window.history.back();
                }}
                className='absolute top-0 left-0 -translate-x-[40%] -translate-y-[30%] sm:-translate-x-[180%] sm:-translate-y-1/2 p-2 rounded transition-colors'
              >
                <svg
                  className='h-5 w-5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-500 transition-colors'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15 19l-7-7 7-7'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
              {/* 封面 */}
              <div className='flex-shrink-0 w-full max-w-[200px] sm:max-w-none md:w-72 mx-auto'>
                <Image
                  src={detail.poster || '/images/placeholder.png'}
                  alt={detail.title || fallbackTitle}
                  width={288}
                  height={432}
                  className='w-full rounded-xl object-cover'
                  style={{ aspectRatio: '2/3' }}
                  priority
                  unoptimized
                />
              </div>
              {/* 右侧信息 */}
              <div
                className='flex-1 flex flex-col min-h-0'
                style={{ height: '430px' }}
              >
                <h1 className='text-3xl font-bold mb-2 tracking-wide flex items-center flex-shrink-0 text-center md:text-left w-full'>
                  {detail.title || fallbackTitle}
                  {detail.douban_id && (
                    <a
                      href={`https://movie.douban.com/subject/${detail.douban_id}/`}
                      target='_blank'
                      rel='noopener noreferrer'
                      onClick={(e) => e.stopPropagation()}
                      className='ml-2'
                    >
                      <LinkIcon className='w-4 h-4' strokeWidth={2} />
                    </a>
                  )}
                </h1>
                <div className='flex flex-wrap items-center gap-3 text-base mb-4 opacity-80 flex-shrink-0'>
                  {detail.class && (
                    <span className='text-green-600 font-semibold'>
                      {detail.class}
                    </span>
                  )}
                  {(detail.year || fallbackYear) && (
                    <span>{detail.year || fallbackYear}</span>
                  )}
                  {detail.source_name && (
                    <span className='border border-gray-500/60 px-2 py-[1px] rounded'>
                      {detail.source_name}
                    </span>
                  )}
                  {detail.type_name && <span>{detail.type_name}</span>}
                </div>
                {/* 按钮区域 */}
                <div className='flex items-center gap-4 mb-4 flex-shrink-0'>
                  {playRecord ? (
                    <>
                      {/* 恢复播放 */}
                      <a
                        href={`/play?source=${searchParams.get(
                          'source'
                        )}&id=${searchParams.get(
                          'id'
                        )}&title=${encodeURIComponent(detail.title)}${
                          detail.year || fallbackYear
                            ? `&year=${detail.year || fallbackYear}`
                            : ''
                        }`}
                        className='flex items-center justify-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-white'
                      >
                        <div className='w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent'></div>
                        <span>恢复播放</span>
                      </a>
                      {/* 从头开始 */}
                      <a
                        href={`/play?source=${searchParams.get(
                          'source'
                        )}&id=${searchParams.get(
                          'id'
                        )}&index=1&position=0&title=${encodeURIComponent(
                          detail.title
                        )}${
                          detail.year || fallbackYear
                            ? `&year=${detail.year || fallbackYear}`
                            : ''
                        }`}
                        className='hidden sm:flex items-center justify-center gap-2 px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-white'
                      >
                        <div className='w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent'></div>
                        <span>从头开始</span>
                      </a>
                    </>
                  ) : (
                    <>
                      {/* 播放 */}
                      <a
                        href={`/play?source=${searchParams.get(
                          'source'
                        )}&id=${searchParams.get(
                          'id'
                        )}&index=1&position=0&title=${encodeURIComponent(
                          detail.title
                        )}${
                          detail.year || fallbackYear
                            ? `&year=${detail.year || fallbackYear}`
                            : ''
                        }`}
                        className='flex items-center justify-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-white'
                      >
                        <div className='w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent'></div>
                        <span>播放</span>
                      </a>
                    </>
                  )}
                  {/* 爱心按钮 */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                      favorited
                        ? 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                        : 'bg-gray-400 hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 stroke-[2] ${
                        favorited ? 'text-red-500' : 'text-white'
                      }`}
                      fill={favorited ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                {/* 播放记录进度条 */}
                {playRecord && (
                  <div className='mb-4 flex items-center gap-3 w-full max-w-sm'>
                    {/* 进度条 */}
                    <div className='flex-1 h-1 bg-gray-600 rounded-sm overflow-hidden'>
                      <div
                        className='h-full bg-green-500'
                        style={{
                          width: `${
                            (playRecord.play_time / playRecord.total_time) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    {/* 剩余时间 */}
                    <span className='text-gray-600/60 dark:text-gray-400/60 text-xs whitespace-nowrap'>
                      {playRecord.total_episodes > 1
                        ? `第${playRecord.index}集 剩余 `
                        : '剩余 '}
                      {formatDuration(
                        playRecord.total_time - playRecord.play_time
                      )}
                    </span>
                  </div>
                )}
                {detail.desc && (
                  <div
                    className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {detail.desc}
                  </div>
                )}
              </div>
            </div>
            {/* 选集按钮区 */}
            {detail.episodes && detail.episodes.length > 0 && (
              <div className='mt-0 sm:mt-8 bg-transparent rounded-xl p-2 sm:p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-xl font-semibold'>选集</div>
                  <div className='text-gray-400 ml-2'>
                    共 {detail.episodes.length} 集
                  </div>
                  {/* 倒序切换 */}
                  <span
                    onClick={() => setReverseEpisodeOrder((prev) => !prev)}
                    className={`ml-4 text-sm cursor-pointer select-none transition-colors ${
                      reverseEpisodeOrder
                        ? 'text-green-500'
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    倒序
                  </span>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,_minmax(6rem,_6rem))] sm:gap-4 justify-start'>
                  {(reverseEpisodeOrder
                    ? Array.from(
                        { length: detail.episodes.length },
                        (_, i) => i
                      ).reverse()
                    : Array.from(
                        { length: detail.episodes.length },
                        (_, i) => i
                      )
                  ).map((idx) => (
                    <a
                      key={idx}
                      href={`/play?source=${searchParams.get(
                        'source'
                      )}&id=${searchParams.get('id')}&index=${
                        idx + 1
                      }&position=0&title=${encodeURIComponent(detail.title)}${
                        detail.year || fallbackYear
                          ? `&year=${detail.year || fallbackYear}`
                          : ''
                      }`}
                      className='bg-gray-500/80 hover:bg-green-500 dark:bg-gray-700/80 dark:hover:bg-green-600 text-white px-5 py-2 rounded-lg transition-colors text-base font-medium w-24 text-center'
                    >
                      {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function DetailPage() {
  return (
    <Suspense>
      <DetailPageClient />
    </Suspense>
  );
}
