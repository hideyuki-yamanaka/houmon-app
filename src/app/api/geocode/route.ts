// ──────────────────────────────────────────────────────────────
// /api/geocode — 住所から 緯度経度 を求めるプロキシ
//
// 用途: メンバーピン位置編集画面の「住所から再取得」ボタン用。
// 経由先: Nominatim (OpenStreetMap 公式の無料ジオコーディング)。
//
// 注意:
//   - Nominatim 利用ポリシー上 User-Agent 必須、1 req/sec 制限あり。
//     家庭訪問アプリの利用頻度なら問題にならない見込み。
//   - サーバー側で叩くことで CORS 回避 + UA 設定 + 将来的な
//     キャッシュ追加にも対応しやすい。
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: 'q (address) is required' }, { status: 400 });
  }
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ja`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'houmon-app (https://houmon-app-lilac.vercel.app/) hideyuki@dosanko.design',
      },
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Nominatim returned ${r.status}` },
        { status: 502 },
      );
    }
    const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data[0]) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({
      found: true,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
