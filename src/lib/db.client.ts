/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
'use client';

/**
 * 仅在浏览器端使用的数据库工具，目前基于 localStorage 实现。
 * 之所以单独拆分文件，是为了避免在客户端 bundle 中引入 `fs`, `path` 等 Node.js 内置模块，
 * 从而解决诸如 "Module not found: Can't resolve 'fs'" 的问题。
 *
 * 功能：
 * 1. 获取全部播放记录（getAllPlayRecords）。
 * 2. 保存播放记录（savePlayRecord）。
 *
 * 如后续需要在客户端读取收藏等其它数据，可按同样方式在此文件中补充实现。
 */

// ---- 类型 ----
export interface PlayRecord {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  index: number; // 第几集
  total_episodes: number; // 总集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总进度（秒）
  save_time: number; // 记录保存时间（时间戳）
  search_title?: string; // 搜索时使用的标题
}

// ---- 常量 ----
const PLAY_RECORDS_KEY = 'moontv_play_records';

// ---- 环境变量 ----
const STORAGE_TYPE = (() => {
  const raw =
    (typeof window !== 'undefined' &&
      (window as any).RUNTIME_CONFIG?.STORAGE_TYPE) ||
    (process.env.STORAGE_TYPE as 'localstorage' | 'redis' | undefined) ||
    'localstorage';
  // 兼容 redis => database
  return raw;
})();

// ---------------- 搜索历史相关常量 ----------------
const SEARCH_HISTORY_KEY = 'moontv_search_history';

// 搜索历史最大保存条数
const SEARCH_HISTORY_LIMIT = 20;

// ---- 工具函数 ----
async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`请求 ${path} 失败: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * 生成存储key
 */
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// ---- API ----
/**
 * 读取 localStorage 中的全部播放记录。
 * 在服务端渲染阶段 (window === undefined) 时返回空对象，避免报错。
 */
export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  // 若配置标明使用数据库，则从后端 API 拉取
  if (STORAGE_TYPE !== 'localstorage') {
    return fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`);
  }

  // 默认 / localstorage 流程
  if (typeof window === 'undefined') {
    // 服务器端渲染阶段直接返回空，交由客户端 useEffect 再行请求
    return {};
  }

  try {
    const raw = localStorage.getItem(PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PlayRecord>;
  } catch (err) {
    console.error('读取播放记录失败:', err);
    return {};
  }
}

/**
 * 保存播放记录到 localStorage 或通过 API 保存到数据库
 */
export async function savePlayRecord(
  source: string,
  id: string,
  record: PlayRecord
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 若配置标明使用数据库，则通过 API 保存
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      const res = await fetch('/api/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, record }),
      });
      if (!res.ok) throw new Error(`保存播放记录失败: ${res.status}`);
    } catch (err) {
      console.error('保存播放记录到数据库失败:', err);
      throw err;
    }
    return;
  }

  // 默认 / localstorage 流程
  if (typeof window === 'undefined') {
    console.warn('无法在服务端保存播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    allRecords[key] = record;
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
  } catch (err) {
    console.error('保存播放记录失败:', err);
    throw err;
  }
}

/**
 * 删除播放记录
 */
export async function deletePlayRecord(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 若配置标明使用数据库，则通过 API 删除
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      const res = await fetch(
        `/api/playrecords?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error(`删除播放记录失败: ${res.status}`);
    } catch (err) {
      console.error('删除播放记录到数据库失败:', err);
      throw err;
    }
    return;
  }

  // 默认 / localstorage 流程
  if (typeof window === 'undefined') {
    console.warn('无法在服务端删除播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    delete allRecords[key];
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    console.log('播放记录已删除:', key);
  } catch (err) {
    console.error('删除播放记录失败:', err);
    throw err;
  }
}

/* ---------------- 搜索历史相关 API ---------------- */

/**
 * 获取搜索历史
 */
export async function getSearchHistory(): Promise<string[]> {
  // 如果配置为使用数据库，则从后端 API 获取
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      return fetchFromApi<string[]>(`/api/searchhistory`);
    } catch (err) {
      console.error('获取搜索历史失败:', err);
      return [];
    }
  }

  // 默认从 localStorage 读取
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    // 仅返回字符串数组
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error('读取搜索历史失败:', err);
    return [];
  }
}

/**
 * 将关键字添加到搜索历史
 */
export async function addSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      await fetch('/api/searchhistory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: trimmed }),
      });
    } catch (err) {
      console.error('保存搜索历史失败:', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = [trimmed, ...history.filter((k) => k !== trimmed)];
    // 限制长度
    if (newHistory.length > SEARCH_HISTORY_LIMIT) {
      newHistory.length = SEARCH_HISTORY_LIMIT;
    }
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (err) {
    console.error('保存搜索历史失败:', err);
  }
}

/**
 * 清空搜索历史
 */
export async function clearSearchHistory(): Promise<void> {
  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      await fetch(`/api/searchhistory`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('清空搜索历史失败:', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/**
 * 删除单条搜索历史
 */
export async function deleteSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      await fetch(`/api/searchhistory?keyword=${encodeURIComponent(trimmed)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('删除搜索历史失败:', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = history.filter((k) => k !== trimmed);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (err) {
    console.error('删除搜索历史失败:', err);
  }
}

// ---------------- 收藏相关 API ----------------

// 收藏数据结构
export interface Favorite {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  total_episodes: number;
  save_time: number;
  search_title?: string; // 搜索时使用的标题
}

// 收藏在 localStorage 中使用的 key
const FAVORITES_KEY = 'moontv_favorites';

/**
 * 获取全部收藏
 */
export async function getAllFavorites(): Promise<Record<string, Favorite>> {
  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    return fetchFromApi<Record<string, Favorite>>(`/api/favorites`);
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Favorite>;
  } catch (err) {
    console.error('读取收藏失败:', err);
    return {};
  }
}

/**
 * 保存收藏
 */
export async function saveFavorite(
  source: string,
  id: string,
  favorite: Favorite
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, favorite }),
      });
      if (!res.ok) throw new Error(`保存收藏失败: ${res.status}`);
    } catch (err) {
      console.error('保存收藏到数据库失败:', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('无法在服务端保存收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    allFavorites[key] = favorite;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
  } catch (err) {
    console.error('保存收藏失败:', err);
    throw err;
  }
}

/**
 * 删除收藏
 */
export async function deleteFavorite(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      const res = await fetch(`/api/favorites?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`删除收藏失败: ${res.status}`);
    } catch (err) {
      console.error('删除收藏到数据库失败:', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('无法在服务端删除收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    delete allFavorites[key];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
  } catch (err) {
    console.error('删除收藏失败:', err);
    throw err;
  }
}

/**
 * 判断是否已收藏
 */
export async function isFavorited(
  source: string,
  id: string
): Promise<boolean> {
  const key = generateStorageKey(source, id);

  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      const res = await fetch(`/api/favorites?key=${encodeURIComponent(key)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data;
    } catch (err) {
      console.error('检查收藏状态失败:', err);
      return false;
    }
  }

  // localStorage 模式
  const allFavorites = await getAllFavorites();
  return !!allFavorites[key];
}

/**
 * 切换收藏状态
 * 返回切换后的状态（true = 已收藏）
 */
export async function toggleFavorite(
  source: string,
  id: string,
  favoriteData?: Favorite
): Promise<boolean> {
  const already = await isFavorited(source, id);

  if (already) {
    await deleteFavorite(source, id);
    return false;
  }

  if (!favoriteData) {
    throw new Error('收藏数据缺失');
  }

  await saveFavorite(source, id, favoriteData);
  return true;
}

/**
 * 清空全部播放记录
 */
export async function clearAllPlayRecords(): Promise<void> {
  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      await fetch(`/api/playrecords`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('清空播放记录失败:', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAY_RECORDS_KEY);
}

/**
 * 清空全部收藏
 */
export async function clearAllFavorites(): Promise<void> {
  // 数据库模式
  if (STORAGE_TYPE !== 'localstorage') {
    try {
      await fetch(`/api/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('清空收藏失败:', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FAVORITES_KEY);
}
