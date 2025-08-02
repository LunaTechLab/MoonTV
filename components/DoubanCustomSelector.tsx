/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CustomCategory {
  name: string;
  type: 'movie' | 'tv';
  query: string;
}

interface DoubanCustomSelectorProps {
  customCategories: CustomCategory[];
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
}

const DoubanCustomSelector: React.FC<DoubanCustomSelectorProps> = ({
  customCategories,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
}) => {
  // 为不同的选择器创建独立的refs和状态
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 二级选择器滚动容器的ref
  const secondaryScrollContainerRef = useRef<HTMLDivElement>(null);

  // 根据 customCategories 生成一级选择器选项（按 type 分组，电影优先）
  const primaryOptions = React.useMemo(() => {
    const types = Array.from(new Set(customCategories.map((cat) => cat.type)));
    // 确保电影类型排在前面
    const sortedTypes = types.sort((a, b) => {
      if (a === 'movie' && b !== 'movie') return -1;
      if (a !== 'movie' && b === 'movie') return 1;
      return 0;
    });
    return sortedTypes.map((type) => ({
      label: type === 'movie' ? '电影' : '剧集',
      value: type,
    }));
  }, [customCategories]);

  // 根据选中的一级选项生成二级选择器选项
  const secondaryOptions = React.useMemo(() => {
    if (!primarySelection) return [];
    return customCategories
      .filter((cat) => cat.type === primarySelection)
      .map((cat) => ({
        label: cat.name || cat.query,
        value: cat.query,
      }));
  }, [customCategories, primarySelection]);

  // 处理二级选择器的鼠标滚轮事件（原生 DOM 事件）
  const handleSecondaryWheel = React.useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = secondaryScrollContainerRef.current;
    if (container) {
      const scrollAmount = e.deltaY * 2;
      container.scrollLeft += scrollAmount;
    }
  }, []);

  // 添加二级选择器的鼠标滚轮事件监听器
  useEffect(() => {
    const scrollContainer = secondaryScrollContainerRef.current;
    const capsuleContainer = secondaryContainerRef.current;

    if (scrollContainer && capsuleContainer) {
      // 同时监听滚动容器和胶囊容器的滚轮事件
      scrollContainer.addEventListener('wheel', handleSecondaryWheel, {
        passive: false,
      });
      capsuleContainer.addEventListener('wheel', handleSecondaryWheel, {
        passive: false,
      });

      return () => {
        scrollContainer.removeEventListener('wheel', handleSecondaryWheel);
        capsuleContainer.removeEventListener('wheel', handleSecondaryWheel);
      };
    }
  }, [handleSecondaryWheel]);

  // 当二级选项变化时重新添加事件监听器
  useEffect(() => {
    const scrollContainer = secondaryScrollContainerRef.current;
    const capsuleContainer = secondaryContainerRef.current;

    if (scrollContainer && capsuleContainer && secondaryOptions.length > 0) {
      // 重新添加事件监听器
      scrollContainer.addEventListener('wheel', handleSecondaryWheel, {
        passive: false,
      });
      capsuleContainer.addEventListener('wheel', handleSecondaryWheel, {
        passive: false,
      });

      return () => {
        scrollContainer.removeEventListener('wheel', handleSecondaryWheel);
        capsuleContainer.removeEventListener('wheel', handleSecondaryWheel);
      };
    }
  }, [handleSecondaryWheel, secondaryOptions]);

  // 更新指示器位置的通用函数
  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const button = buttonRefs.current[activeIndex];
        const container = containerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (buttonRect.width > 0) {
            setIndicatorStyle({
              left: buttonRect.left - containerRect.left,
              width: buttonRect.width,
            });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    // 主选择器初始位置
    if (primaryOptions.length > 0) {
      const activeIndex = primaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || primaryOptions[0].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    }

    // 副选择器初始位置
    if (secondaryOptions.length > 0) {
      const activeIndex = secondaryOptions.findIndex(
        (opt) => opt.value === (secondarySelection || secondaryOptions[0].value)
      );
      updateIndicatorPosition(
        activeIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
    }
  }, [primaryOptions, secondaryOptions]); // 当选项变化时重新计算

  // 监听主选择器变化
  useEffect(() => {
    if (primaryOptions.length > 0) {
      const activeIndex = primaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    }
  }, [primarySelection, primaryOptions]);

  // 监听副选择器变化
  useEffect(() => {
    if (secondaryOptions.length > 0) {
      const activeIndex = secondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
      return cleanup;
    }
  }, [secondarySelection, secondaryOptions]);

  // 渲染胶囊式选择器
  const renderCapsuleSelector = (
    options: { label: string; value: string }[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    isPrimary = false
  ) => {
    const containerRef = isPrimary
      ? primaryContainerRef
      : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary
      ? primaryIndicatorStyle
      : secondaryIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className='relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm'
      >
        {/* 滑动的白色背景指示器 */}
        {indicatorStyle.width > 0 && (
          <div
            className='absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  // 如果没有自定义分类，则不渲染任何内容
  if (!customCategories || customCategories.length === 0) {
    return null;
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* 两级选择器包装 */}
      <div className='space-y-3 sm:space-y-4'>
        {/* 一级选择器 */}
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
            类型
          </span>
          <div className='overflow-x-auto'>
            {renderCapsuleSelector(
              primaryOptions,
              primarySelection || primaryOptions[0]?.value,
              onPrimaryChange,
              true
            )}
          </div>
        </div>

        {/* 二级选择器 */}
        {secondaryOptions.length > 0 && (
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              片单
            </span>
            <div ref={secondaryScrollContainerRef} className='overflow-x-auto'>
              {renderCapsuleSelector(
                secondaryOptions,
                secondarySelection || secondaryOptions[0]?.value,
                onSecondaryChange,
                false
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoubanCustomSelector;
