/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const {
      username,
      password,
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      SearchResultDefaultAggregate,
    } = body as {
      username?: string;
      password?: string;
      SiteName: string;
      Announcement: string;
      SearchDownstreamMaxPage: number;
      SiteInterfaceCacheTime: number;
      SearchResultDefaultAggregate: boolean;
    };

    // 参数校验
    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof SearchResultDefaultAggregate !== 'boolean'
    ) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const adminConfig = getConfig();
    const storage = getStorage();

    // 权限与密码校验
    if (username === process.env.USERNAME) {
      // 站长
      if (password !== process.env.PASSWORD) {
        return NextResponse.json({ error: '密码错误' }, { status: 401 });
      }
    } else {
      // 管理员
      const user = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }

      if (!storage || typeof storage.verifyUser !== 'function') {
        return NextResponse.json(
          { error: '存储未配置用户认证' },
          { status: 500 }
        );
      }

      const ok = await storage.verifyUser(username, password);
      if (!ok) {
        return NextResponse.json({ error: '密码错误' }, { status: 401 });
      }
    }

    // 更新缓存中的站点设置
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      SearchResultDefaultAggregate,
    };

    // 写入数据库
    if (storage && typeof (storage as any).setAdminConfig === 'function') {
      await (storage as any).setAdminConfig(adminConfig);
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store', // 不缓存结果
        },
      }
    );
  } catch (error) {
    console.error('更新站点配置失败:', error);
    return NextResponse.json(
      {
        error: '更新站点配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
