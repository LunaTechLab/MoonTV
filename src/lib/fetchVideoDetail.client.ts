export interface VideoDetail {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
}

interface FetchVideoDetailOptions {
  source: string;
  id: string;
  fallbackTitle?: string;
}

/**
 * 根据 source 与 id 获取视频详情。
 * 1. 若传入 fallbackTitle，则先调用 /api/search 搜索精确匹配。
 * 2. 若搜索未命中或未提供 fallbackTitle，则直接调用 /api/detail。
 */
export async function fetchVideoDetail({
  source,
  id,
  fallbackTitle = '',
}: FetchVideoDetailOptions): Promise<VideoDetail> {
  // 优先通过搜索接口查找精确匹配
  if (fallbackTitle) {
    try {
      const searchResp = await fetch(
        `/api/search?q=${encodeURIComponent(fallbackTitle.trim())}`
      );
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        const exactMatch = searchData.results.find(
          (item: VideoDetail) =>
            item.source.toString() === source.toString() &&
            item.id.toString() === id.toString()
        );
        if (exactMatch) {
          return exactMatch as VideoDetail;
        }
      }
    } catch (error) {
      // do nothing
    }
  }

  // 调用 /api/detail 接口
  const response = await fetch(`/api/detail?source=${source}&id=${id}`);
  if (!response.ok) {
    throw new Error('获取详情失败');
  }
  const data = await response.json();

  return {
    id: data?.videoInfo?.id || id,
    title: data?.videoInfo?.title.trim() || fallbackTitle.trim(),
    poster: data?.videoInfo?.cover || '',
    episodes: data?.episodes || [],
    source: data?.videoInfo?.source || source,
    source_name: data?.videoInfo?.source_name || '',
    class: data?.videoInfo?.remarks || '',
    year: data?.videoInfo?.year || 'unknown',
    desc: data?.videoInfo?.desc || '',
    type_name: data?.videoInfo?.type || '',
  } as VideoDetail;
}
