/* eslint-disable no-console */

import { db } from '@/lib/db';
import { type VideoDetail, fetchVideoDetail } from '@/lib/fetchVideoDetail';

const STORAGE_TYPE = process.env.NEXT_PUBLIC_STORAGE_TYPE ?? 'localstorage';

async function refreshRecordAndFavorites() {
  if (STORAGE_TYPE === 'localstorage') {
    return;
  }

  try {
    const users = await db.getAllUsers();
    // 函数级缓存：key 为 `${source}+${id}`，值为 Promise<VideoDetail>
    const detailCache = new Map<string, Promise<VideoDetail>>();

    // 获取详情 Promise（带缓存）
    const getDetail = (
      source: string,
      id: string,
      fallbackTitle: string
    ): Promise<VideoDetail> => {
      const key = `${source}+${id}`;
      let promise = detailCache.get(key);
      if (!promise) {
        promise = fetchVideoDetail({
          source,
          id,
          fallbackTitle: fallbackTitle.trim(),
        });
        detailCache.set(key, promise);
      }
      return promise;
    };

    for (const user of users) {
      // 播放记录
      const playRecords = await db.getAllPlayRecords(user);
      for (const [key, record] of Object.entries(playRecords)) {
        const [source, id] = key.split('+');
        if (!source || !id) continue;

        const detail: VideoDetail = await getDetail(source, id, record.title);

        const episodeCount = detail.episodes?.length || 0;
        if (episodeCount > 0 && episodeCount !== record.total_episodes) {
          await db.savePlayRecord(user, source, id, {
            title: record.title,
            source_name: record.source_name,
            cover: record.cover,
            index: record.index,
            total_episodes: episodeCount,
            play_time: record.play_time,
            total_time: record.total_time,
            save_time: record.save_time,
          });
        }
      }

      // 收藏
      const favorites = await db.getAllFavorites(user);
      for (const [key, fav] of Object.entries(favorites)) {
        const [source, id] = key.split('+');
        if (!source || !id) continue;

        const favDetail: VideoDetail = await getDetail(source, id, fav.title);

        const favEpisodeCount = favDetail.episodes?.length || 0;
        if (favEpisodeCount > 0 && favEpisodeCount !== fav.total_episodes) {
          await db.saveFavorite(user, source, id, {
            title: fav.title,
            source_name: fav.source_name,
            cover: fav.cover,
            total_episodes: favEpisodeCount,
            save_time: fav.save_time,
          });
        }
      }
    }
  } catch (err) {
    console.error('刷新播放记录/收藏失败', err);
  }
}

export default refreshRecordAndFavorites;
