/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import {
  type MediaProviderAdapter,
  AirPlayButton,
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Menu,
  RadioGroup,
  SeekButton,
} from '@vidstack/react';
import {
  AirPlayIcon,
  CheckIcon,
  SeekBackward10Icon,
  SeekForward10Icon,
} from '@vidstack/react/icons';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import Hls from 'hls.js';
import { Heart } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';

import 'vidstack/styles/defaults.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import {
  deletePlayRecord,
  generateStorageKey,
  getAllPlayRecords,
  isFavorited,
  savePlayRecord,
  toggleFavorite,
} from '@/lib/db.client';
import {
  type VideoDetail,
  fetchVideoDetail,
} from '@/lib/fetchVideoDetail.client';
import { SearchResult } from '@/lib/types';

// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

function PlayPageClient() {
  const searchParams = useSearchParams();
  // @ts-ignore
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用 useState 保存视频详情
  const [detail, setDetail] = useState<VideoDetail | null>(null);

  // 初始标题：如果 URL 中携带 title 参数，则优先使用
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '');
  const videoYear = searchParams.get('year') || '';
  const [videoCover, setVideoCover] = useState('');

  const [currentSource, setCurrentSource] = useState(
    searchParams.get('source') || ''
  );
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '');
  const [sourceChanging, setSourceChanging] = useState(false);
  const initialIndex = parseInt(searchParams.get('index') || '1') - 1; // 转换为0基数组索引

  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(initialIndex);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [shortcutText, setShortcutText] = useState('');
  const [shortcutDirection, setShortcutDirection] = useState('');
  const [reverseEpisodeOrder, setReverseEpisodeOrder] = useState(false);
  const shortcutHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NEW STATE: 控制快进/快退按钮是否显示
  const [showSkipButtons, setShowSkipButtons] = useState(true);

  // 使用 ResizeObserver 根据 MediaPlayer 元素尺寸动态决定按钮显隐
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    const updateShowSkipButtons = () => {
      const el: HTMLElement | undefined = (playerRef.current as any)?.el;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // width < 576 或 height < 380 时隐藏
      setShowSkipButtons(!(rect.width < 576 || rect.height < 380));
    };

    // 尝试立即更新一次
    updateShowSkipButtons();

    const observer = new ResizeObserver(updateShowSkipButtons);
    // 有可能此时 el 还未就绪，使用轮询确保绑定
    let retryTimer: NodeJS.Timeout | null = null;
    const attachObserver = () => {
      const el: HTMLElement | undefined = (playerRef.current as any)?.el;
      if (el) {
        observer.observe(el);
        if (retryTimer) clearInterval(retryTimer);
      }
    };

    attachObserver();
    if (!(playerRef.current as any)?.el) {
      // 如果首次未获取到 el，继续重试直至获取
      retryTimer = setInterval(attachObserver, 200);
    }

    // orientationchange 也可能影响高/宽
    window.addEventListener('orientationchange', updateShowSkipButtons);

    return () => {
      observer.disconnect();
      if (retryTimer) clearInterval(retryTimer);
      window.removeEventListener('orientationchange', updateShowSkipButtons);
    };
  }, []);

  // 换源相关状态
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasSearchedRef = useRef(false);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // 总集数：从 detail 中获取，保证随 detail 更新而变化
  const totalEpisodes = detail?.episodes?.length || 0;

  // 收藏状态
  const [favorited, setFavorited] = useState(false);
  // 是否显示旋转提示（5s 后自动隐藏）
  const [showOrientationTip, setShowOrientationTip] = useState(false);
  const orientationTipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 当前是否处于竖屏，用于控制"强制横屏"按钮显隐
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : true
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);

  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);
  const detailRef = useRef<VideoDetail | null>(detail);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);

  // 标记是否已触发过一次 sourcechange（首次不重建播放器）
  const hasSourceChangedRef = useRef(false);

  // 当播放器因重建而触发一次额外的 sourcechange 时，用于忽略那一次
  const ignoreSourceChangeRef = useRef(false);

  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);

  // 新增：去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled, _setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
    }
    return true;
  });

  // 长按三倍速相关
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const normalPlaybackRateRef = useRef<number>(1);
  // 标记长按是否已生效
  const longPressActiveRef = useRef<boolean>(false);

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
  }, [currentSource, currentId, detail, currentEpisodeIndex, videoTitle]);

  // 解决 iOS Safari 100vh 不准确的问题：将视口高度写入 CSS 变量 --vh
  const setVH = useCallback(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`
      );
    }
  }, []);

  // 解决 iOS Safari 100vh 不准确的问题：将视口高度写入 CSS 变量 --vh
  useEffect(() => {
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, [setVH]);

  // 根据 detail 和集数索引更新视频地址（仅当地址真正变化时）
  const updateVideoUrl = (
    detailData: VideoDetail | null,
    episodeIndex: number
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }
    const newUrl = detailData?.episodes[episodeIndex] || '';
    if (newUrl !== videoUrl) {
      setVideoUrl(newUrl);
      playerContainerRef.current?.focus();
    }
  };

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 确保初始状态与URL参数同步
  useEffect(() => {
    const urlSource = searchParams.get('source');
    const urlId = searchParams.get('id');

    if (urlSource && urlSource !== currentSource) {
      setCurrentSource(urlSource);
    }
    if (urlId && urlId !== currentId) {
      setCurrentId(urlId);
    }
  }, [searchParams, currentSource, currentId]);

  useEffect(() => {
    if (!currentSource || !currentId) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        const detailData = await fetchVideoDetail({
          source: currentSource,
          id: currentId,
          fallbackTitle: videoTitle.trim(),
          fallbackYear: videoYear,
        });

        // 更新状态保存详情
        setVideoTitle(detailData.title || videoTitle);
        setVideoCover(detailData.poster);
        setDetail(detailData);

        // 确保集数索引在有效范围内
        if (currentEpisodeIndex >= detailData.episodes.length) {
          console.log('currentEpisodeIndex', currentEpisodeIndex);
          setCurrentEpisodeIndex(0);
        }

        // 清理URL参数（移除index参数）
        if (searchParams.has('index')) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('index');
          newUrl.searchParams.delete('position');
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取视频详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [currentSource]);

  /* -------------------- 播放记录处理 -------------------- */
  useEffect(() => {
    // 仅在初次挂载时检查播放记录
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      try {
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(currentSource, currentId);
        const record = allRecords[key];

        // URL 参数
        const urlIndexParam = searchParams.get('index');
        const urlPositionParam = searchParams.get('position');

        // 当index参数存在时的处理逻辑
        if (urlIndexParam) {
          const urlIndex = parseInt(urlIndexParam, 10) - 1;
          let targetTime = 0; // 默认从0开始

          // 只有index参数和position参数都存在时才生效position
          if (urlPositionParam) {
            targetTime = parseInt(urlPositionParam, 10);
          } else if (record && urlIndex === record.index - 1) {
            // 如果有同集播放记录则跳转到播放记录处
            targetTime = record.play_time;
          }
          // 否则从0开始（targetTime已经是0）

          // 更新当前选集索引
          if (urlIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(urlIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        } else if (record) {
          // 没有index参数但有播放记录时，使用原有逻辑
          const targetIndex = record.index - 1;
          const targetTime = record.play_time;

          // 更新当前选集索引
          if (targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(targetIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, []);

  // 播放器事件处理
  const onCanPlay = () => {
    console.log('播放器准备就绪');
    setError(null);

    // 若存在需要恢复的播放进度，则跳转
    if (
      playerRef.current &&
      resumeTimeRef.current &&
      resumeTimeRef.current > 0
    ) {
      try {
        const duration = playerRef.current.duration || 0;
        let target = resumeTimeRef.current;
        // 如果目标时间距离结尾过近，为避免自动触发下一集，向前偏移 5 秒
        if (duration && target >= duration - 2) {
          target = Math.max(0, duration - 5);
        }
        playerRef.current.currentTime = target;
      } catch (err) {
        console.warn('恢复播放进度失败:', err);
      }
      resumeTimeRef.current = null;
    }

    if (playerRef.current) {
      setTimeout(() => {
        try {
          playerRef.current.volume = lastVolumeRef.current;
        } catch (_) {
          // 忽略异常
        }
      }, 0);
    }

    // 绑定长按三倍速事件
    playerRef.current?.addEventListener('touchstart', handleLongPressStart);
    playerRef.current?.addEventListener('touchend', handleLongPressEnd);
  };

  const onEnded = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx < d.episodes.length - 1) {
      setTimeout(() => {
        setCurrentEpisodeIndex(idx + 1);
      }, 1000);
    }
  };

  const onTimeUpdate = () => {
    const now = Date.now();
    if (now - lastSaveTimeRef.current > 5000) {
      saveCurrentPlayProgress();
      lastSaveTimeRef.current = now;
    }
  };

  const handlePlayerError = (e: any) => {
    console.error('播放器错误:', e);
    setError('视频播放失败');
  };

  // 页面卸载和隐藏时保存播放进度
  useEffect(() => {
    // 页面即将卸载时保存播放进度
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
    };

    // 页面可见性变化时保存播放进度
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEpisodeIndex, detail, playerRef.current]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (shortcutHintTimeoutRef.current) {
        clearTimeout(shortcutHintTimeoutRef.current);
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // 当视频标题变化时重置搜索状态
  useEffect(() => {
    if (videoTitle) {
      hasSearchedRef.current = false;
      setSearchResults([]);
      setSearchError(null);
    }
  }, [videoTitle]);

  // 添加键盘事件监听器 (使用 refs 避免重复绑定)
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // 处理选集切换
  const handleEpisodeChange = (episodeIndex: number) => {
    if (episodeIndex >= 0 && episodeIndex < totalEpisodes) {
      // 在更换集数前保存当前播放进度
      if (playerRef.current && !playerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      playerRef.current;
      setCurrentEpisodeIndex(episodeIndex);
      setShowEpisodePanel(false);
    }
  };

  // 处理下一集
  const handleNextEpisode = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx < d.episodes.length - 1) {
      if (playerRef.current && !playerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(idx + 1);
    }
  };

  // 处理上一集
  const handlePreviousEpisode = () => {
    const idx = currentEpisodeIndexRef.current;
    if (detailRef.current && idx > 0) {
      if (playerRef.current && !playerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(idx - 1);
    }
  };

  // 搜索视频源
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!response.ok) {
        throw new Error('搜索失败');
      }
      const data = await response.json();

      // 处理搜索结果：每个数据源只展示一个，优先展示与title同名的结果
      const processedResults: SearchResult[] = [];
      const sourceMap = new Map<string, SearchResult[]>();

      // 按数据源分组
      data.results?.forEach((result: SearchResult) => {
        if (!sourceMap.has(result.source)) {
          sourceMap.set(result.source, []);
        }
        const list = sourceMap.get(result.source);
        if (list) {
          list.push(result);
        }
      });

      // 为每个数据源选择最佳结果
      sourceMap.forEach((results) => {
        if (results.length === 0) return;

        // 只选择和当前视频标题完全匹配的结果，如果有年份，还需要年份完全匹配
        const exactMatch = results.find(
          (result) =>
            result.title.toLowerCase() === videoTitle.toLowerCase() &&
            (videoYear
              ? result.year.toLowerCase() === videoYear.toLowerCase()
              : true) &&
            detailRef.current?.episodes.length &&
            ((detailRef.current?.episodes.length === 1 &&
              result.episodes.length === 1) ||
              (detailRef.current?.episodes.length > 1 &&
                result.episodes.length > 1))
        );

        if (exactMatch) {
          processedResults.push(exactMatch);
          return;
        }
      });

      setSearchResults(processedResults);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : '搜索失败');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string
  ) => {
    try {
      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = playerRef.current?.currentTime || 0;

      // 显示换源加载状态
      setSourceChanging(true);
      setError(null);

      // 清除前一个历史记录
      if (currentSource && currentId) {
        try {
          await deletePlayRecord(currentSource, currentId);
          console.log('已清除前一个播放记录');
        } catch (err) {
          console.error('清除播放记录失败:', err);
        }
      }

      // 获取新源的详情
      const newDetail = await fetchVideoDetail({
        source: newSource,
        id: newId,
        fallbackTitle: newTitle.trim(),
        fallbackYear: videoYear,
      });

      // 尝试跳转到当前正在播放的集数
      let targetIndex = currentEpisodeIndex;

      // 如果当前集数超出新源的范围，则跳转到第一集
      if (!newDetail.episodes || targetIndex >= newDetail.episodes.length) {
        targetIndex = 0;
      }

      // 如果仍然是同一集数且播放进度有效，则在播放器就绪后恢复到原始进度
      if (targetIndex === currentEpisodeIndex && currentPlayTime > 1) {
        resumeTimeRef.current = currentPlayTime;
      } else {
        // 否则从头开始播放，防止影响后续选集逻辑
        resumeTimeRef.current = 0;
      }

      // 更新URL参数（不刷新页面）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', newSource);
      newUrl.searchParams.set('id', newId);
      window.history.replaceState({}, '', newUrl.toString());

      // 关闭换源面板
      setShowSourcePanel(false);

      setVideoTitle(newDetail.title || newTitle);
      setVideoCover(newDetail.poster);
      setCurrentSource(newSource);
      setCurrentId(newId);
      setDetail(newDetail);
      setCurrentEpisodeIndex(targetIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : '换源失败');
    } finally {
      setSourceChanging(false);
    }
  };

  // 处理播放源面板展开
  const handleSourcePanelOpen = () => {
    setShowSourcePanel(true);
    playerContainerRef.current?.focus();
    // 只在第一次展开时搜索
    if (videoTitle && !hasSearchedRef.current) {
      handleSearch(videoTitle);
      hasSearchedRef.current = true;
    }
  };

  // 显示快捷键提示
  const displayShortcutHint = (text: string, direction: string) => {
    setShortcutText(text);
    setShortcutDirection(direction);
    setShowShortcutHint(true);

    // 清除之前的超时
    if (shortcutHintTimeoutRef.current) {
      clearTimeout(shortcutHintTimeoutRef.current);
    }

    // 2秒后隐藏
    shortcutHintTimeoutRef.current = setTimeout(() => {
      setShowShortcutHint(false);
    }, 2000);
  };

  // 处理全局快捷键
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // 忽略输入框中的按键事件
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return;

    // Alt + 左箭头 = 上一集
    if (e.altKey && e.key === 'ArrowLeft') {
      if (detailRef.current && currentEpisodeIndexRef.current > 0) {
        handlePreviousEpisode();
        displayShortcutHint('上一集', 'left');
      } else {
        displayShortcutHint('已经是第一集了', 'error');
      }
      e.preventDefault();
    }

    // Alt + 右箭头 = 下一集
    if (e.altKey && e.key === 'ArrowRight') {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && idx < d.episodes.length - 1) {
        handleNextEpisode();
        displayShortcutHint('下一集', 'right');
      } else {
        displayShortcutHint('已经是最后一集了', 'error');
      }
      e.preventDefault();
    }

    if (!playerRef.current) return;
    const player = playerRef.current;

    // 左箭头 = 快退
    if (!e.altKey && e.key === 'ArrowLeft') {
      if (player.currentTime > 5) {
        player.currentTime -= 10;
        displayShortcutHint('快退', 'left');
      }
      e.preventDefault();
    }

    // 右箭头 = 快进
    if (!e.altKey && e.key === 'ArrowRight') {
      if (player.currentTime < player.duration - 5) {
        player.currentTime += 10;
        displayShortcutHint('快进', 'right');
      }
      e.preventDefault();
    }

    // 上箭头 = 音量+
    if (e.key === 'ArrowUp') {
      const currentVolume = player.volume;
      if (currentVolume < 1) {
        player.volume += 0.1;
        displayShortcutHint(
          `音量 ${Math.round((currentVolume + 0.1) * 100)}`,
          'up'
        );
      } else {
        displayShortcutHint('音量 100', 'up');
      }
      e.preventDefault();
    }

    // 下箭头 = 音量-
    if (e.key === 'ArrowDown') {
      const currentVolume = player.volume;
      if (currentVolume > 0) {
        player.volume -= 0.1;
        displayShortcutHint(
          `音量 ${Math.round((currentVolume - 0.1) * 100)}`,
          'down'
        );
      } else {
        displayShortcutHint('音量 0', 'down');
      }
      e.preventDefault();
    }

    // 空格 = 播放/暂停
    if (e.key === ' ') {
      if (playerRef.current.paused) {
        playerRef.current.play();
        displayShortcutHint('播放', 'play');
      } else {
        playerRef.current.pause();
        displayShortcutHint('暂停', 'pause');
      }
      e.preventDefault();
    }

    // f 键 = 切换全屏
    if (e.key === 'f' || e.key === 'F') {
      if (player.state.fullscreen) {
        player.exitFullscreen();
      } else {
        player.enterFullscreen();
      }
      e.preventDefault();
    }
  };

  // 保存播放进度的函数
  const saveCurrentPlayProgress = async () => {
    if (
      !playerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = playerRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;

    // 如果播放时间太短（少于5秒）或者视频时长无效，不保存
    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      await savePlayRecord(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        source_name: detailRef.current?.source_name,
        cover: videoCover,
        year: detailRef.current?.year || videoYear || '',
        index: currentEpisodeIndexRef.current + 1, // 转换为1基索引
        total_episodes: totalEpisodes,
        play_time: Math.floor(currentTime),
        total_time: Math.floor(duration),
        save_time: Date.now(),
      });

      lastSaveTimeRef.current = Date.now();
      console.log('播放进度已保存:', {
        title: videoTitleRef.current,
        episode: currentEpisodeIndexRef.current + 1,
        progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  // 每当 source 或 id 变化时检查收藏状态
  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const fav = await isFavorited(currentSource, currentId);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [currentSource, currentId]);

  // 切换收藏
  const handleToggleFavorite = async () => {
    if (!currentSource || !currentId) return;

    try {
      const newState = await toggleFavorite(currentSource, currentId, {
        title: videoTitle,
        source_name: detail?.source_name || '',
        year: detail?.year || videoYear || '',
        cover: videoCover || '',
        total_episodes: totalEpisodes || 1,
        save_time: Date.now(),
      });
      setFavorited(newState);
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  // 监听屏幕方向变化：竖屏时显示提示蒙层
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(orientation: portrait)');

    const update = () => {
      const portrait = mql.matches;

      // 更新竖屏状态
      setIsPortrait(portrait);

      // 在进入竖屏时显示提示，5 秒后自动隐藏
      if (portrait) {
        setShowOrientationTip(true);
        if (orientationTipTimeoutRef.current) {
          clearTimeout(orientationTipTimeoutRef.current);
        }
        orientationTipTimeoutRef.current = setTimeout(() => {
          setShowOrientationTip(false);
        }, 5000);
      } else {
        setShowOrientationTip(false);
        if (orientationTipTimeoutRef.current) {
          clearTimeout(orientationTipTimeoutRef.current);
          orientationTipTimeoutRef.current = null;
        }
      }
    };

    // 初始执行一次
    update();

    if (mql.addEventListener) {
      mql.addEventListener('change', update);
    } else {
      // Safari < 14
      // @ts-ignore
      mql.addListener(update);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', update);
      } else {
        // @ts-ignore
        mql.removeListener(update);
      }
    };
  }, []);

  // 用户点击悬浮按钮 -> 请求全屏并锁定横屏
  const handleForceLandscape = async () => {
    try {
      playerRef.current?.enterFullscreen();

      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (err) {
      console.warn('强制横屏失败:', err);
    }
  };

  // 进入/退出全屏时锁定/解锁横屏（保持原有逻辑）
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const lockLandscape = async () => {
      try {
        // 某些浏览器需要在用户手势触发后才能调用
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (err) {
        console.warn('横屏锁定失败:', err);
      }
    };

    const unlock = () => {
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (_) {
        // 忽略解锁屏幕方向失败的错误
      }
    };

    const player = playerRef.current;
    if (!player) return;

    return player.subscribe(({ fullscreen }: any) => {
      setIsFullscreen(fullscreen);
      if (fullscreen) {
        lockLandscape();
      } else {
        unlock();
        // 强制重绘逻辑，解决退出全屏的黑屏/白边问题
        const playerEl = playerRef.current?.el as HTMLElement | null;
        if (playerEl) {
          playerEl.style.display = 'none';
          setTimeout(() => {
            playerEl.style.display = '';
            setVH();
          }, 0);
        }
      }
    });
  }, [playerRef.current, setVH]);

  useEffect(() => {
    // 播放页挂载时，锁定页面滚动并消除 body 100vh 带来的额外空白
    if (typeof document === 'undefined') return;

    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;

    // 记录原始样式，供卸载时恢复
    const originalBodyMinH = bodyStyle.minHeight;
    const originalBodyH = bodyStyle.height;
    const originalBodyOverflow = bodyStyle.overflow;
    const originalHtmlOverflow = htmlStyle.overflow;

    bodyStyle.minHeight = '0';
    bodyStyle.height = 'auto';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overflow = 'hidden';

    return () => {
      bodyStyle.minHeight = originalBodyMinH;
      bodyStyle.height = originalBodyH;
      bodyStyle.overflow = originalBodyOverflow;
      htmlStyle.overflow = originalHtmlOverflow;
    };
  }, []);

  /* -------------------- 设置 meta theme-color 为纯黑 -------------------- */
  useEffect(() => {
    const originalThemeColorTags = Array.from(
      document.querySelectorAll('meta[name="theme-color"]')
    );

    // 移除已有的 theme-color 标签
    originalThemeColorTags.forEach((tag) => tag.remove());

    // 添加播放页专用的 theme-color 标签
    const playerThemeColorTag = document.createElement('meta');
    playerThemeColorTag.name = 'theme-color';
    playerThemeColorTag.content = '#000000';
    document.head.appendChild(playerThemeColorTag);

    // 组件卸载时恢复原有的 theme-color 标签
    return () => {
      playerThemeColorTag.remove();
      originalThemeColorTags.forEach((tag) => document.head.appendChild(tag));
    };
  }, []);

  // Safari(WebKit) 专用：用于强制重新挂载 <MediaPlayer>，实现"销毁并重建"效果
  const [playerReloadKey, setPlayerReloadKey] = useState(0);

  // 实时记录音量变化
  const handleVolumeChange = () => {
    const v = playerRef.current?.volume;
    if (typeof v === 'number' && !Number.isNaN(v)) {
      lastVolumeRef.current = v;
    }
  };

  // 长按三倍速处理
  const handleLongPressStart = (e: TouchEvent) => {
    if (playerRef.current?.paused || playerRef.current?.playbackRate === 3.0) {
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest('.custom_topbar') ||
      target.closest('.custom_episodes_panel') ||
      target.closest('.custom_source_panel')
    ) {
      return;
    }
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = setTimeout(() => {
      if (playerRef.current) {
        normalPlaybackRateRef.current = playerRef.current.playbackRate || 1;
        playerRef.current.playbackRate = 3.0;
        longPressActiveRef.current = true; // 记录长按已激活
        displayShortcutHint('3倍速', 'play');
      }
    }, 300); // 按压 300ms 触发
  };

  const handleLongPressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    // 只有在长按激活过且当前倍速为 3.0 时才恢复，防止误触
    if (playerRef.current && longPressActiveRef.current) {
      playerRef.current.playbackRate = normalPlaybackRateRef.current || 1;
      longPressActiveRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className='min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden overscroll-contain'>
        <div className='text-white text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4'></div>
          <div className='text-lg'>加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden overscroll-contain'>
        <div className='text-white text-center'>
          <div className='text-xl font-semibold mb-4 text-red-400'>
            播放失败
          </div>
          <div className='text-base mb-6'>{error}</div>
          <button
            onClick={() => {
              if (videoTitle) {
                window.location.href = `/aggregate?q=${encodeURIComponent(
                  videoTitle.trim()
                )}${videoYear ? `&year=${encodeURIComponent(videoYear)}` : ''}`;
              } else {
                window.location.href = '/';
              }
            }}
            className='px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors'
          >
            {videoTitle ? '返回选源' : '返回首页'}
          </button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className='min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden overscroll-contain'>
        <div className='text-white text-center'>
          <div className='text-xl font-semibold mb-4'>未找到视频</div>
          <button
            onClick={() => {
              // 返回选源页
              if (videoTitle) {
                window.location.href = `/aggregate?q=${encodeURIComponent(
                  videoTitle.trim()
                )}${videoYear ? `&year=${encodeURIComponent(videoYear)}` : ''}`;
              } else {
                window.location.href = '/';
              }
            }}
            className='px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors'
          >
            {videoTitle ? '返回选源' : '返回首页'}
          </button>
        </div>
      </div>
    );
  }

  const PlayerUITopbar = ({
    videoTitle,
    favorited,
    totalEpisodes,
    currentEpisodeIndex,
    sourceName,
    onToggleFavorite,
    onOpenSourcePanel,
  }: {
    videoTitle: string;
    favorited: boolean;
    totalEpisodes: number;
    currentEpisodeIndex: number;
    sourceName: string;
    onToggleFavorite: () => void;
    onOpenSourcePanel: () => void;
  }) => {
    return (
      <div
        data-top-bar
        className='absolute custom_topbar top-0 left-0 right-0 transition-opacity duration-300 z-10 opacity-0 pointer-events-none group-data-[controls]:opacity-100 group-data-[controls]:pointer-events-auto'
      >
        <div className='bg-black/60 backdrop-blur-sm px-0 sm:px-6 py-4 relative flex items-center sm:justify-center'>
          {/* 返回按钮 */}
          <button
            onClick={() => {
              // 如果当下是全屏状态，先退出全屏，而不是直接后退
              if (isFullscreen) {
                playerRef.current?.exitFullscreen();
                return;
              }
              window.history.back();
            }}
            className='absolute vds-button left-0 sm:left-6 text-white hover:text-gray-300 transition-colors p-2'
          >
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
                fill='currentColor'
              />
            </svg>
          </button>

          {/* 中央标题及集数信息 */}
          <div
            className={`sm:text-center ${
              !isFullscreen ? 'ml-10 sm:ml-0 text-left' : 'w-full text-center'
            }`}
          >
            <div className='flex items-center justify-center gap-2 max-w-xs mx-auto'>
              <span className='text-white font-semibold text-lg truncate'>
                {videoTitle}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className='flex-shrink-0'
              >
                <FavoriteIcon filled={favorited} />
              </button>
            </div>

            {totalEpisodes > 1 && (
              <div
                className='text-gray-300 text-sm mt-0.5 cursor-pointer'
                onClick={() => {
                  setShowEpisodePanel(true);
                  playerContainerRef.current?.focus();
                }}
              >
                第 {currentEpisodeIndex + 1} 集 / 共 {totalEpisodes} 集
              </div>
            )}
          </div>

          <div className='absolute right-2 sm:right-6 flex flex-row items-center space-x-1'>
            {totalEpisodes > 1 && (
              <div
                className='vds-button text-sm'
                onClick={() => {
                  setShowEpisodePanel(true);
                  playerContainerRef.current?.focus();
                }}
              >
                选集
              </div>
            )}
            {sourceName && (
              <span
                className='text-gray-300 text-sm border border-gray-500/60 px-2 py-[1px] rounded cursor-pointer hover:bg-gray-600/30 transition-colors'
                onClick={onOpenSourcePanel}
              >
                {sourceName}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';

    // 按行分割M3U8内容
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 只过滤#EXT-X-DISCONTINUITY标识
      if (!line.includes('#EXT-X-DISCONTINUITY')) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config: any) {
      super(config);
      const load = this.load.bind(this);
      this.load = function (context, config, callbacks) {
        // 拦截manifest和level请求
        if (
          (context as any).type === 'manifest' ||
          (context as any).type === 'level'
        ) {
          const onSuccess = callbacks.onSuccess;
          callbacks.onSuccess = function (response, stats, context) {
            // 如果是m3u8文件，处理内容以移除广告分段
            if (response.data && typeof response.data === 'string') {
              // 过滤掉广告段 - 实现更精确的广告过滤逻辑
              response.data = filterAdsFromM3U8(response.data);
            }
            return onSuccess(response, stats, context, null);
          };
        }
        // 执行原始load方法
        load(context, config, callbacks);
      };
    }
  }
  const onProviderChange = (provider: MediaProviderAdapter | null) => {
    class extendedHls extends Hls {
      constructor(config: any) {
        // 调用父类构造函数
        // @ts-ignore
        super(config);
      }

      attachMedia(media: HTMLMediaElement): void {
        super.attachMedia(media);

        media.disableRemotePlayback = false;
        media.autoplay = true;
      }
    }
    if (isHLSProvider(provider)) {
      provider.library = extendedHls;
      provider.config = {
        debug: false, // 关闭日志
        enableWorker: true, // WebWorker 解码，降低主线程压力
        lowLatencyMode: true, // 开启低延迟 LL-HLS
        /* 缓冲/内存相关 */
        maxBufferLength: 30, // 前向缓冲最大 30s，过大容易导致高延迟
        backBufferLength: 30, // 仅保留 30s 已播放内容，避免内存占用
        maxBufferSize: 60 * 1000 * 1000, // 约 60MB，超出后触发清理
        /* 自定义loader */
        loader: blockAdEnabled ? CustomHlsJsLoader : Hls.DefaultConfig.loader,
      };
    }
  };

  const onSourceChange = () => {
    // 仅在 WebKit（Safari）环境下重建播放器，解决部分资源切换后黑屏或无法播放的问题
    const isWebkit =
      typeof window !== 'undefined' &&
      typeof (window as any).webkitConvertPointFromNodeToPage === 'function';

    if (ignoreSourceChangeRef.current) {
      // 这一次是由我们手动重建引起的，直接忽略
      ignoreSourceChangeRef.current = false;
      return;
    }

    if (isWebkit) {
      // 第一次真实的 sourcechange，仅设置标记，不重建
      if (!hasSourceChangedRef.current) {
        hasSourceChangedRef.current = true;
        return;
      }

      // 第二次（用户真正切换源）开始重建播放器
      // 设置标志，下一次由重建带来的 sourcechange 忽略
      console.log('destory player and rebuild');
      ignoreSourceChangeRef.current = true;
      setPlayerReloadKey((k) => k + 1);
    }
  };

  return (
    <div
      ref={playerContainerRef}
      tabIndex={-1}
      className='bg-black fixed inset-0 overflow-hidden overscroll-contain'
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* 竖屏提示蒙层 */}
      {showOrientationTip && (
        <div className='fixed bottom-16 left-1/2 -translate-x-1/2 z-[190] flex items-center px-4 py-2 rounded bg-black/70 text-white space-x-2 pointer-events-none backdrop-blur-sm'>
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
          <span className='text-sm'>请横屏观看</span>
        </div>
      )}

      {/* 强制横屏按钮：仅在移动端竖屏时显示 */}
      {isPortrait && (
        <button
          onClick={handleForceLandscape}
          className='fixed bottom-16 left-4 z-[85] w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center md:hidden'
        >
          <svg className='w-5 h-5' viewBox='0 0 1024 1024' fill='currentColor'>
            <path d='M298.666667 469.333333h597.333333c46.933333 0 85.333333 38.4 85.333333 85.333334v341.333333c0 46.933333-38.4 85.333333-85.333333 85.333333H298.666667c-46.933333 0-85.333333-38.4-85.333334-85.333333v-341.333333c0-46.933333 38.4-85.333333 85.333334-85.333334z m0 85.333334v341.333333h597.333333v-341.333333H298.666667z m170.666666-512c46.933333 0 85.333333 38.4 85.333334 85.333333v298.666667h-85.333334V128H128v597.333333h42.666667v85.333334H128c-46.933333 0-85.333333-38.4-85.333333-85.333334V128c0-46.933333 38.4-85.333333 85.333333-85.333333h341.333333z m115.2 42.666666c128 0 238.933333 89.6 268.8 213.333334v4.266666l46.933334-51.2L951.466667 298.666667 853.333333 396.8c-17.066667 21.333333-51.2 8.533333-55.466666-17.066667V366.933333c0-115.2-89.6-213.333333-204.8-217.6h-8.533334V85.333333z' />
          </svg>
        </button>
      )}

      {/* 换源加载遮罩 */}
      {sourceChanging && (
        <div className='fixed inset-0 bg-black/50 z-[200] flex items-center justify-center'>
          <div className='text-white text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2'></div>
            <div className='text-sm'>换源中...</div>
          </div>
        </div>
      )}

      {/* 播放器容器 */}
      <MediaPlayer
        ref={playerRef}
        className='w-full h-full group'
        src={videoUrl}
        poster={videoCover}
        playsInline
        autoPlay
        volume={0.7}
        crossOrigin='anonymous'
        controlsDelay={3000}
        key={playerReloadKey}
        onCanPlay={onCanPlay}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        onPause={saveCurrentPlayProgress}
        onError={handlePlayerError}
        onProviderChange={onProviderChange}
        onSourceChange={onSourceChange}
        onVolumeChange={handleVolumeChange}
      >
        <MediaProvider />
        <PlayerUITopbar
          videoTitle={videoTitle}
          favorited={favorited}
          totalEpisodes={totalEpisodes}
          currentEpisodeIndex={currentEpisodeIndex}
          sourceName={detail?.source_name || ''}
          onToggleFavorite={handleToggleFavorite}
          onOpenSourcePanel={handleSourcePanelOpen}
        />
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          noScrubGesture={true}
          slots={{
            googleCastButton: null,
            settingsMenu: null,
            captionButton: null,
            // muteButton: null, // 隐藏静音按钮
            // volumeSlider: null, // 隐藏音量条
            airPlayButton: null, // 隐藏默认 AirPlay 按钮
            beforeCurrentTime: (
              <>
                {totalEpisodes > 1 && (
                  // 下一集按钮放在时间显示前
                  <button
                    className='vds-button mr-2'
                    onClick={handleNextEpisode}
                    aria-label='Next Episode'
                  >
                    <svg
                      className='vds-icon'
                      viewBox='0 0 32 32'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M6 24l12-8L6 8v16zM22 8v16h3V8h-3z'
                        fill='currentColor'
                      />
                    </svg>
                  </button>
                )}
              </>
            ),
            beforeFullscreenButton: (
              <>
                <button
                  className='vds-button'
                  aria-label={blockAdEnabled ? '关闭去广告' : '开启去广告'}
                  onClick={() => {
                    const newVal = !blockAdEnabled;
                    try {
                      saveCurrentPlayProgress();
                      localStorage.setItem('enable_blockad', String(newVal));
                    } catch (_) {
                      // ignore
                    }
                    window.location.reload();
                  }}
                >
                  <AdBlockIcon enabled={blockAdEnabled} />
                </button>
                <PlaybackRateButton
                  playerRef={playerRef}
                  playerContainerRef={playerContainerRef}
                />
                {/* 自定义 AirPlay 按钮 */}
                <AirPlayButton className='vds-button'>
                  <AirPlayIcon className='vds-icon' />
                </AirPlayButton>
              </>
            ),
            // 快退 10 秒按钮（根据播放器尺寸决定显隐）
            beforePlayButton: (
              <>
                {showSkipButtons && (
                  <SeekButton className='vds-button' seconds={-10}>
                    <SeekBackward10Icon className='vds-icon' />
                  </SeekButton>
                )}
              </>
            ),
            afterPlayButton: (
              <>
                {showSkipButtons && (
                  <SeekButton className='vds-button' seconds={10}>
                    <SeekForward10Icon className='vds-icon' />
                  </SeekButton>
                )}
              </>
            ),
          }}
        />

        {/* 选集侧拉面板 */}
        {totalEpisodes > 1 && (
          <div data-episode-panel>
            {/* 遮罩层 */}
            {showEpisodePanel && (
              <div
                className='fixed inset-0 bg-black/50 z-[110]'
                onClick={() => {
                  setShowEpisodePanel(false);
                  playerContainerRef.current?.focus();
                }}
              />
            )}

            {/* 侧拉面板 */}
            <div
              className={`fixed custom_episodes_panel top-0 right-0 h-full w-full mobile-landscape:w-1/2 md:w-80 bg-black/40 backdrop-blur-xl z-[110] transform transition-transform duration-300 ${
                showEpisodePanel ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className='p-6 h-full flex flex-col'>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center gap-4'>
                    <h3 className='text-white text-xl font-semibold'>
                      选集列表
                    </h3>
                    {/* 倒序小字 */}
                    <span
                      onClick={() => setReverseEpisodeOrder((prev) => !prev)}
                      className={`text-sm cursor-pointer select-none transition-colors ${
                        reverseEpisodeOrder
                          ? 'text-green-500'
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                    >
                      倒序
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowEpisodePanel(false);
                      playerContainerRef.current?.focus();
                    }}
                    className='text-gray-400 hover:text-white transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='text-gray-300 text-sm mb-4'>
                  当前: 第 {currentEpisodeIndex + 1} 集 / 共 {totalEpisodes} 集
                </div>

                <div className='flex-1 overflow-y-auto'>
                  <div className='grid grid-cols-4 gap-3'>
                    {(reverseEpisodeOrder
                      ? Array.from(
                          { length: totalEpisodes },
                          (_, i) => i
                        ).reverse()
                      : Array.from({ length: totalEpisodes }, (_, i) => i)
                    ).map((idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEpisodeChange(idx)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          idx === currentEpisodeIndex
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 换源侧拉面板 */}
        <div data-source-panel>
          {/* 遮罩层 */}
          {showSourcePanel && (
            <div
              className='fixed inset-0 bg-black/50 z-[110]'
              onClick={() => {
                setShowSourcePanel(false);
                playerContainerRef.current?.focus();
              }}
            />
          )}

          {/* 侧拉面板 */}
          <div
            className={`fixed custom_source_panel top-0 right-0 h-full w-full mobile-landscape:w-1/2 md:w-96 bg-black/40 backdrop-blur-xl z-[110] transform transition-transform duration-300 ${
              showSourcePanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className='p-6 h-full flex flex-col'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-white text-xl font-semibold'>播放源</h3>
                <button
                  onClick={() => {
                    setShowSourcePanel(false);
                    playerContainerRef.current?.focus();
                  }}
                  className='text-gray-400 hover:text-white transition-colors'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>

              {/* 搜索结果 */}
              <div className='flex-1 overflow-y-auto'>
                {searchLoading && (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500'></div>
                    <span className='text-gray-300 ml-3'>搜索中...</span>
                  </div>
                )}

                {searchError && (
                  <div className='text-red-400 text-center py-4'>
                    {searchError}
                  </div>
                )}

                {!searchLoading &&
                  !searchError &&
                  searchResults.length === 0 && (
                    <div className='text-gray-400 text-center py-8'>
                      未找到相关视频源
                    </div>
                  )}

                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <div className='grid grid-cols-2 gap-4'>
                    {[
                      ...searchResults.filter(
                        (r) =>
                          r.source === currentSource &&
                          String(r.id) === String(currentId)
                      ),
                      ...searchResults.filter(
                        (r) =>
                          !(
                            r.source === currentSource &&
                            String(r.id) === String(currentId)
                          )
                      ),
                    ].map((result) => {
                      const isCurrentSource =
                        result.source === currentSource &&
                        String(result.id) === String(currentId);
                      return (
                        <div
                          key={`${result.source}-${result.id}`}
                          className={`rounded-lg transition-colors border-2 ${
                            isCurrentSource
                              ? 'border-green-500 bg-green-500/20 cursor-not-allowed opacity-60'
                              : 'border-transparent bg-transparent hover:bg-gray-600/30 cursor-pointer'
                          }`}
                          onClick={() =>
                            !isCurrentSource &&
                            handleSourceChange(
                              result.source,
                              result.id,
                              result.title
                            )
                          }
                        >
                          {/* 视频封面 */}
                          <div className='aspect-[2/3] rounded-t-lg overflow-hidden flex items-center justify-center p-1 relative'>
                            <img
                              src={result.poster}
                              alt={result.title}
                              className='w-full h-full object-cover rounded'
                              referrerPolicy='no-referrer'
                            />

                            {/* 集数圆形指示器 */}
                            {result.episodes && (
                              <div className='absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                                <span className='text-white text-xs font-bold'>
                                  {result.episodes.length}
                                </span>
                              </div>
                            )}

                            {isCurrentSource && (
                              <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                                <div className='bg-green-500 text-white text-xs px-3 py-1 rounded shadow-lg'>
                                  当前播放
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 视频信息 */}
                          <div className='p-2 bg-transparent text-center'>
                            <h4 className='text-white font-medium text-sm line-clamp-2 mb-2 leading-tight'>
                              {result.title}
                            </h4>
                            <div className='text-gray-400 text-xs space-y-1'>
                              <div className='inline-block border border-gray-500/60 rounded px-2 py-[1px]'>
                                {result.source_name}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 快捷键提示 */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 ${
            showShortcutHint ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='bg-black/80 backdrop-blur-sm rounded p-4 flex items-center space-x-3'>
            <svg
              className='w-6 h-6 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              {shortcutDirection === 'left' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M15 19l-7-7 7-7'
                ></path>
              )}
              {shortcutDirection === 'right' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                ></path>
              )}
              {shortcutDirection === 'up' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M5 15l7-7 7 7'
                ></path>
              )}
              {shortcutDirection === 'down' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M19 9l-7 7-7-7'
                ></path>
              )}
              {shortcutDirection === 'play' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M8 5v14l11-7L8 5z'
                ></path>
              )}
              {shortcutDirection === 'pause' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M6 6h4v12H6zm8 0h4v12h-4z'
                ></path>
              )}
              {shortcutDirection === 'error' && (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M6 18L18 6M6 6l12 12'
                ></path>
              )}
            </svg>
            <span className='text-white font-medium'>{shortcutText}</span>
          </div>
        </div>
      </MediaPlayer>
    </div>
  );
}

const PlaybackRateButton = ({
  playerRef,
  playerContainerRef,
}: {
  playerRef: React.RefObject<any>;
  playerContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  const [rate, setRate] = useState(1);
  const rates = [0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    // @ts-ignore
    const unsubscribe = player.subscribe(({ playbackRate }) => {
      setRate(playbackRate);
    });
    return unsubscribe;
  }, [playerRef]);

  return (
    <Menu.Root className='vds-menu'>
      <Menu.Button className='vds-menu-button vds-button' aria-label='Settings'>
        <span>倍速</span>
      </Menu.Button>
      <Menu.Items className='vds-menu-items' placement='top' offset={0}>
        <RadioGroup.Root
          className='vds-radio-group'
          aria-label='Custom Options'
          value={rate.toString()}
          onChange={(value: string) => {
            const player = playerRef.current;
            if (!player) {
              return;
            }
            player.playbackRate = Number(value);
            playerContainerRef.current?.focus();
          }}
        >
          {[...rates].reverse().map((rate) => (
            <RadioGroup.Item
              className='vds-radio'
              value={rate.toString()}
              key={rate}
            >
              <CheckIcon className='vds-icon' />
              <span className='vds-radio-label'>{rate}</span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </Menu.Items>
    </Menu.Root>
  );
};

const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-5 w-5'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='#ef4444' /* Tailwind red-500 */
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return <Heart className='h-5 w-5 stroke-[2] text-gray-300' />;
};

// 新增：去广告图标组件
const AdBlockIcon = ({ enabled }: { enabled: boolean }) => {
  return (
    <svg
      className='h-6 w-6 vds-icon' // 略微放大尺寸
      viewBox='0 0 32 32'
      xmlns='http://www.w3.org/2000/svg'
    >
      {/* "AD" 文字，居中显示 */}
      <text
        x='50%'
        y='50%'
        fontSize='20'
        fontWeight='bold'
        textAnchor='middle'
        dominantBaseline='middle'
        fill='#ffffff'
      >
        AD
      </text>
      {enabled && (
        <line
          x1='4'
          y1='4'
          x2='28'
          y2='28'
          stroke='#ffffff'
          strokeWidth='4'
          strokeLinecap='round'
        />
      )}
    </svg>
  );
};

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageClient />
    </Suspense>
  );
}
