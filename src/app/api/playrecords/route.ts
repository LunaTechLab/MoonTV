/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { PlayRecord } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    const records = await db.getAllPlayRecords(user);
    return NextResponse.json(records, { status: 200 });
  } catch (err) {
    console.error('获取播放记录失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user,
      key,
      record,
    }: { user?: string; key: string; record: PlayRecord } = body;

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    if (!key || !record) {
      return NextResponse.json(
        { error: 'Missing key or record' },
        { status: 400 }
      );
    }

    // 验证播放记录数据
    if (!record.title || !record.source_name || record.index < 1) {
      return NextResponse.json(
        { error: 'Invalid record data' },
        { status: 400 }
      );
    }

    // 从key中解析source和id
    const [source, id] = key.split('+');
    if (!source || !id) {
      return NextResponse.json(
        { error: 'Invalid key format' },
        { status: 400 }
      );
    }

    // 保存播放记录（不包含user_id，将由savePlayRecord自动添加）
    const recordWithoutUserId = {
      title: record.title,
      source_name: record.source_name,
      cover: record.cover,
      index: record.index,
      total_episodes: record.total_episodes,
      play_time: record.play_time,
      total_time: record.total_time,
      save_time: record.save_time,
    };

    await db.savePlayRecord(user, source, id, recordWithoutUserId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('保存播放记录失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const user = searchParams.get('user');

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    if (key) {
      // 如果提供了 key，删除单条播放记录
      const [source, id] = key.split('+');
      if (!source || !id) {
        return NextResponse.json(
          { error: 'Invalid key format' },
          { status: 400 }
        );
      }

      await db.deletePlayRecord(user, source, id);
    } else {
      // 未提供 key，则清空全部播放记录
      // 目前 DbManager 没有对应方法，这里直接遍历删除
      const all = await db.getAllPlayRecords(user);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deletePlayRecord(user, s, i);
        })
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除播放记录失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
