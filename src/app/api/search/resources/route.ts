import { NextResponse } from 'next/server';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';

export const runtime = 'edge';

// OrionTV 兼容接口
export async function GET() {
  try {
    const apiSites = getAvailableApiSites();
    const cacheTime = getCacheTime();

    return NextResponse.json(apiSites, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '获取资源失败' }, { status: 500 });
  }
}
