import { getAvailableApiSites } from '@/lib/config';
import { SearchResult } from '@/lib/types';

import { getDetailFromApi, searchFromApi } from './downstream';

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
  const apiSites = getAvailableApiSites();
  const apiSite = apiSites.find((site) => site.key === source);
  if (!apiSite) {
    throw new Error('无效的API来源');
  }
  if (fallbackTitle) {
    try {
      const searchData = await searchFromApi(apiSite, fallbackTitle.trim());
      const exactMatch = searchData.find(
        (item: SearchResult) =>
          item.source.toString() === source.toString() &&
          item.id.toString() === id.toString()
      );
      if (exactMatch) {
        return {
          id: exactMatch.id,
          title: exactMatch.title,
          poster: exactMatch.poster,
          episodes: exactMatch.episodes,
          source: exactMatch.source,
          source_name: exactMatch.source_name,
          class: exactMatch.class,
          year: exactMatch.year,
          desc: exactMatch.desc,
          type_name: exactMatch.type_name,
          douban_id: exactMatch.douban_id,
        } as VideoDetail;
      }
    } catch (error) {
      // do nothing
    }
  }

  // 调用 /api/detail 接口
  const detail = await getDetailFromApi(apiSite, id);

  return {
    id: detail.videoInfo.id,
    title: detail.videoInfo.title,
    poster: detail.videoInfo.cover || '',
    episodes: detail.episodes,
    source: detail.videoInfo.source,
    source_name: detail.videoInfo.source_name,
    class: detail.videoInfo.remarks,
    year: detail.videoInfo.year || '',
    desc: detail.videoInfo.desc,
    type_name: detail.videoInfo.type,
  };
}
