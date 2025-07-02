/* eslint-disable react-hooks/exhaustive-deps, no-console */

'use client';

import { LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';

function AggregatePageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const title = searchParams.get('title')?.trim() || '';
  const year = searchParams.get('year')?.trim() || '';
  const type = searchParams.get('type')?.trim() || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query) {
      setError('缺少搜索关键词');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error('搜索失败');
        }
        const data = await res.json();
        const all: SearchResult[] = data.results || [];
        const map = new Map<string, SearchResult[]>();
        all.forEach((r) => {
          // 根据传入参数进行精确匹配：
          // 1. 如果提供了 title，则按 title 精确匹配，否则按 query 精确匹配；
          // 2. 如果还提供了 year，则额外按 year 精确匹配。
          const titleMatch = title ? r.title === title : r.title === query;
          const yearMatch = year ? r.year === year : true;
          if (!titleMatch || !yearMatch) {
            return;
          }
          // 如果还传入了 type，则按 type 精确匹配
          if (type === 'tv' && r.episodes.length === 1) {
            return;
          }
          if (type === 'movie' && r.episodes.length !== 1) {
            return;
          }
          const key = `${r.title}-${r.year}`;
          const arr = map.get(key) || [];
          arr.push(r);
          map.set(key, arr);
        });
        if (map.size === 0 && type) {
          // 无匹配，忽略 type 做重新匹配
          all.forEach((r) => {
            const titleMatch = title ? r.title === title : r.title === query;
            const yearMatch = year ? r.year === year : true;
            if (!titleMatch || !yearMatch) {
              return;
            }
            const key = `${r.title}-${r.year}`;
            const arr = map.get(key) || [];
            arr.push(r);
            map.set(key, arr);
          });
        }
        if (map.size == 1) {
          setResults(Array.from(map.values()).flat());
        } else if (map.size > 1) {
          // 存在多个匹配，跳转到搜索页
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜索失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query, router]);

  // 选出信息最完整的字段
  const chooseString = (vals: (string | undefined)[]): string | undefined => {
    return vals.reduce<string | undefined>((best, v) => {
      if (!v) return best;
      if (!best) return v;
      return v.length > best.length ? v : best;
    }, undefined);
  };
  // 出现次数最多的非 0 数字
  const chooseNumber = (vals: (number | undefined)[]): number | undefined => {
    const countMap = new Map<number, number>();
    vals.forEach((v) => {
      if (v !== undefined && v !== 0) {
        countMap.set(v, (countMap.get(v) || 0) + 1);
      }
    });
    let selected: number | undefined = undefined;
    let maxCount = 0;
    countMap.forEach((cnt, num) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        selected = num;
      }
    });
    return selected;
  };

  const aggregatedInfo = {
    title: title || query,
    cover: chooseString(results.map((d) => d.poster)),
    desc: chooseString(results.map((d) => d.desc)),
    type: chooseString(results.map((d) => d.type_name)),
    year: chooseString(results.map((d) => d.year)),
    remarks: chooseString(results.map((d) => d.class)),
    douban_id: chooseNumber(results.map((d) => d.douban_id)),
  };

  const infoReady = Boolean(
    aggregatedInfo.cover ||
      aggregatedInfo.desc ||
      aggregatedInfo.type ||
      aggregatedInfo.year ||
      aggregatedInfo.remarks
  );

  const uniqueSources = Array.from(
    new Map(results.map((r) => [r.source, r])).values()
  );

  // 详情映射，便于快速获取每个源的集数
  const sourceDetailMap = new Map(results.map((d) => [d.source, d]));

  return (
    <PageLayout activePath='/aggregate'>
      <div className='flex flex-col min-h-full px-2 sm:px-10 pt-4 sm:pt-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] overflow-visible'>
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
        ) : !infoReady ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='text-gray-500 text-center'>
              <div className='text-lg font-semibold mb-2'>未找到匹配结果</div>
            </div>
          </div>
        ) : (
          <div className='max-w-[95%] mx-auto'>
            {/* 主信息区：左图右文 */}
            <div className='relative flex flex-col md:flex-row gap-8 mb-0 sm:mb-8 bg-transparent rounded-xl p-2 sm:p-6 md:items-start'>
              {/* 返回按钮 */}
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
                  src={aggregatedInfo.cover || '/images/placeholder.png'}
                  alt={aggregatedInfo.title}
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
                  {aggregatedInfo.title}
                  {aggregatedInfo.douban_id && (
                    <a
                      href={`https://movie.douban.com/subject/${aggregatedInfo.douban_id}/`}
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
                  {aggregatedInfo.remarks && (
                    <span className='text-green-600 font-semibold'>
                      {aggregatedInfo.remarks}
                    </span>
                  )}
                  {aggregatedInfo.year && <span>{aggregatedInfo.year}</span>}
                  {aggregatedInfo.type && <span>{aggregatedInfo.type}</span>}
                </div>
                <div
                  className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {aggregatedInfo.desc}
                </div>
              </div>
            </div>
            {/* 选播放源 */}
            {uniqueSources.length > 0 && (
              <div className='mt-0 sm:mt-8 bg-transparent rounded-xl p-2 sm:p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-xl font-semibold'>选择播放源</div>
                  <div className='text-gray-400 ml-2'>
                    共 {uniqueSources.length} 个
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,_minmax(6rem,_1fr))] sm:gap-4 justify-start'>
                  {uniqueSources.map((src) => {
                    const d = sourceDetailMap.get(src.source);
                    const epCount = d ? d.episodes.length : src.episodes.length;
                    return (
                      <a
                        key={src.source}
                        href={`/play?source=${src.source}&id=${
                          src.id
                        }&title=${encodeURIComponent(src.title)}${
                          src.year ? `&year=${src.year}` : ''
                        }&from=aggregate`}
                        className='relative flex items-center justify-center w-full h-14 bg-gray-500/80 hover:bg-green-500 dark:bg-gray-700/80 dark:hover:bg-green-600 rounded-lg transition-colors'
                      >
                        {/* 名称 */}
                        <span className='px-1 text-white text-sm font-medium truncate whitespace-nowrap'>
                          {src.source_name}
                        </span>
                        {/* 集数徽标 */}
                        {epCount && epCount > 1 ? (
                          <span className='absolute top-[2px] right-1 text-[10px] font-semibold text-green-900 bg-green-300/90 rounded-full px-1 pointer-events-none'>
                            {epCount}集
                          </span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function AggregatePage() {
  return (
    <Suspense>
      <AggregatePageClient />
    </Suspense>
  );
}
