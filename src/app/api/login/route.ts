import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const result = process.env.PASSWORD;

    if (!result) {
      return NextResponse.json({ ok: true });
    }

    const { password } = await req.json();
    if (typeof password !== 'string') {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    const matched = password === result;

    if (!matched) {
      return NextResponse.json(
        { ok: false, error: '密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
