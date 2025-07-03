/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'edge';

// 最大保存条数（与客户端保持一致）
const HISTORY_LIMIT = 20;

/**
 * GET /api/searchhistory
 * 返回 string[]
 */
export async function GET() {
  try {
    const history = await db.getSearchHistory();
    return NextResponse.json(history, { status: 200 });
  } catch (err) {
    console.error('获取搜索历史失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/searchhistory
 * body: { keyword: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword: string = body.keyword?.trim();
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    await db.addSearchHistory(keyword);

    // 再次获取最新列表，确保客户端与服务端同步
    const history = await db.getSearchHistory();
    return NextResponse.json(history.slice(0, HISTORY_LIMIT), { status: 200 });
  } catch (err) {
    console.error('添加搜索历史失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/searchhistory
 *
 * 1. 不带 keyword -> 清空全部搜索历史
 * 2. 带 keyword=<kw> -> 删除单条关键字
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kw = searchParams.get('keyword')?.trim();

    await db.deleteSearchHistory(kw || undefined);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除搜索历史失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
