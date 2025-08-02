import { NextResponse } from 'next/server';

import { generateSearchVariants } from '@/lib/chinese-converter';
import { getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
  }

  const config = await getConfig();
  const apiSites = config.SourceConfig.filter((site) => !site.disabled);
  
  // 生成搜索關鍵字的繁簡變體
  const searchVariants = generateSearchVariants(query);
  
  // 對每個變體進行搜索
  const searchPromises = apiSites.flatMap((site) =>
    searchVariants.map((variant) => searchFromApi(site, variant))
  );

  try {
    const results = await Promise.all(searchPromises);
    let flattenedResults = results.flat();
    
    // 去重：基於 id + source 組合去重
    const uniqueResults = new Map();
    flattenedResults.forEach((result) => {
      const key = `${result.id}-${result.source}`;
      if (!uniqueResults.has(key)) {
        uniqueResults.set(key, result);
      }
    });
    flattenedResults = Array.from(uniqueResults.values());
    
    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }
    const cacheTime = await getCacheTime();

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
