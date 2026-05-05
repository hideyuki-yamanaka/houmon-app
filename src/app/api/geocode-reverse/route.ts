// ──────────────────────────────────────────────────────────────
// /api/geocode-reverse — 緯度経度 から住所を求めるリバースジオコード
//
// 用途: メインマップでピンを長押しドラッグして移動した時、
//       新しい座標に対応する住所を取得して member.address に反映する。
//
// 注意:
//   - Nominatim (OpenStreetMap) を使う。日本の旭川市は番地レベルまでは
//     カバーが粗く、町丁目までしか取れないことが多い。
//   - 失敗時 / 取得不可時は { found: false } を返し、呼び出し側で
//     address を変更しないフォールバックをする。
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? '');
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'lat / lng が必要です' }, { status: 400 });
  }
  // zoom=18 = building, zoom=16 = street, zoom=14 = suburb 程度
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja&zoom=18&addressdetails=1`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'houmon-app (https://houmon-app-lilac.vercel.app/) hideyuki@dosanko.design',
      },
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Nominatim returned ${r.status}` }, { status: 502 });
    }
    const data = await r.json() as {
      display_name?: string;
      address?: Record<string, string>;
    };
    if (!data?.display_name) {
      return NextResponse.json({ found: false });
    }
    // 日本向けに 「都道府県・市町村・番地」 を組み立てる。Nominatim の
    // 返す address は キー名 (state, city, suburb, neighbourhood, road, house_number) が
    // 入る。日本の住所順に並べる。
    const a = data.address ?? {};
    const parts = [
      a.state,                      // 北海道
      a.city ?? a.county,           // 旭川市
      a.suburb ?? a.neighbourhood,  // 豊岡○条○丁目 等
      a.road,                       // 道路名 (日本では入らないことが多い)
      a.house_number,
    ].filter(Boolean) as string[];
    const composed = parts.join('');
    return NextResponse.json({
      found: true,
      address: composed || data.display_name,
      raw: data.display_name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
