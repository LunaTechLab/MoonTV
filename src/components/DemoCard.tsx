import { Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface DemoCardProps {
  id: string;
  title: string;
  poster: string;
  rate?: string;
  type?: string;
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
      className={`${className} block relative`}
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

const DemoCard = ({ id, title, poster, rate, type }: DemoCardProps) => {
  const [hover, setHover] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleClick = () => {
    router.push(
      `/play?title=${encodeURIComponent(
        title.trim()
      )}&douban_id=${id}&type=${type}`
    );
  };

  return (
    <div
      className='group relative w-full rounded-lg bg-transparent flex flex-col cursor-pointer transition-all duration-300 ease-in-out'
      onClick={handleClick}
    >
      {/* 海报图片区域 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-md group-hover:scale-[1.02] transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) safari-fix'>
        {/* 图片占位符 - 骨架屏效果 */}
        <ImagePlaceholder aspectRatio='aspect-[2/3]' />

        {/* 图片组件 */}
        <Image
          src={poster}
          alt={title}
          fill
          ref={imgRef}
          className={`object-cover transition-transform duration-500 cubic-bezier(0.4,0,0.2,1) group-hover:scale-110
                      ${
                        isLoaded
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-95'
                      }`}
          onLoadingComplete={() => setIsLoaded(true)}
          referrerPolicy='no-referrer'
          priority={false}
        />

        {/* 评分徽章 - 暗色模式优化 */}
        {rate && (
          <div className='absolute top-2 right-2 min-w-[1.25rem] h-4 w-4 sm:h-7 sm:w-7 sm:min-w-[1.5rem] bg-pink-500 dark:bg-pink-400 rounded-full flex items-center justify-center px-1 shadow-md transform transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group-hover:scale-110 group-hover:rotate-3'>
            <span className='text-white text-[0.5rem] sm:text-xs font-bold leading-none'>
              {rate}
            </span>
          </div>
        )}

        {/* 悬浮层 - 搜索按钮 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex items-center justify-center'>
          <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className={`transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${
              hover ? 'scale-110 rotate-12' : 'scale-90'
            }`}
          >
            <PlayCircleSolid fillColor={hover ? '#22c55e' : 'none'} />
          </div>
        </div>

        {/* 外部链接按钮 - 暗色模式优化 */}
        <a
          href={`https://movie.douban.com/subject/${id}`}
          target='_blank'
          rel='noopener noreferrer'
          onClick={(e) => e.stopPropagation()}
          className='absolute top-2 left-2 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)'
        >
          <div className='w-4 h-4 sm:w-7 sm:h-7 rounded-full bg-[#22c55e] dark:bg-[#16a34a] flex items-center justify-center shadow-md opacity-70 hover:opacity-100 transition-all duration-200 ease-in-out hover:scale-110 hover:bg-[#16a34a] dark:hover:bg-[#15803d]'>
            <LinkIcon className='w-4 h-4 text-white' strokeWidth={2} />
          </div>
        </a>
      </div>

      {/* 信息层 - 暗色模式优化 */}
      <span className='mt-2 px-1 block font-semibold truncate w-full text-center text-xs sm:text-sm transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) group-hover:translate-y-[-2px] translate-y-1 opacity-80 group-hover:opacity-100'>
        <span className='text-gray-900 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400'>
          {title}
        </span>
      </span>
    </div>
  );
};

export default DemoCard;
