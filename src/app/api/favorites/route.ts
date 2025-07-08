/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { Favorite } from '@/lib/types';

export const runtime = 'edge';

/**
 * GET /api/favorites
 *
 * 支持两种调用方式：
 * 1. 不带 query，返回全部收藏列表（Record<string, Favorite>）。
 * 2. 带 key=source+id，返回单条收藏（Favorite | null）。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const user = searchParams.get('user');

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    // 查询单条收藏
    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        return NextResponse.json(
          { error: 'Invalid key format' },
          { status: 400 }
        );
      }
      const fav = await db.getFavorite(user, source, id);
      return NextResponse.json(fav, { status: 200 });
    }

    // 查询全部收藏
    const favorites = await db.getAllFavorites(user);
    return NextResponse.json(favorites, { status: 200 });
  } catch (err) {
    console.error('获取收藏失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * body: { user?: string; key: string; favorite: Favorite }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user,
      key,
      favorite,
    }: { user?: string; key: string; favorite: Favorite } = body;

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    if (!key || !favorite) {
      return NextResponse.json(
        { error: 'Missing key or favorite' },
        { status: 400 }
      );
    }

    // 验证必要字段
    if (!favorite.title || !favorite.source_name) {
      return NextResponse.json(
        { error: 'Invalid favorite data' },
        { status: 400 }
      );
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return NextResponse.json(
        { error: 'Invalid key format' },
        { status: 400 }
      );
    }

    const favoriteWithoutUserId = {
      ...favorite,
      save_time: favorite.save_time ?? Date.now(),
    } as Omit<Favorite, 'user_id'>;

    await db.saveFavorite(user, source, id, favoriteWithoutUserId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('保存收藏失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/favorites
 *
 * 1. 不带 query -> 清空全部收藏
 * 2. 带 key=source+id -> 删除单条收藏
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const user = searchParams.get('user');

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    if (key) {
      // 删除单条
      const [source, id] = key.split('+');
      if (!source || !id) {
        return NextResponse.json(
          { error: 'Invalid key format' },
          { status: 400 }
        );
      }
      await db.deleteFavorite(user, source, id);
    } else {
      // 清空全部
      const all = await db.getAllFavorites(user);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deleteFavorite(user, s, i);
        })
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除收藏失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
