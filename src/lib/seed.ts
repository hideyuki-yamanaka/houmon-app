/**
 * KMLデータからメンバーを抽出するパーサー
 * 使い方: ブラウザコンソールまたはNode.jsスクリプトで実行
 */

import type { MemberRow } from './types';
import { nanoid } from 'nanoid';

interface ParsedMember {
  name: string;
  district: string;
  lat: number;
  lng: number;
  fields: Record<string, string>;
}

function parseDescription(desc: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = desc.split('\n');
  for (const line of lines) {
    const match = line.match(/^・(.+?):\s*(.+)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }
  // 地区名を取得
  const districtMatch = desc.match(/【(.+?)】/);
  if (districtMatch) {
    fields['地区'] = districtMatch[1];
  }
  return fields;
}

export function parseKML(kmlText: string): ParsedMember[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');
  const folders = doc.querySelectorAll('Folder');
  const members: ParsedMember[] = [];

  folders.forEach((folder) => {
    const districtName = folder.querySelector(':scope > name')?.textContent ?? '';
    const placemarks = folder.querySelectorAll('Placemark');

    placemarks.forEach((pm) => {
      const name = pm.querySelector('name')?.textContent?.trim() ?? '';
      const description = pm.querySelector('description')?.textContent ?? '';
      const coordsText = pm.querySelector('coordinates')?.textContent?.trim() ?? '';

      // KML座標はlng,lat,alt
      const [lngStr, latStr] = coordsText.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      const fields = parseDescription(description);

      members.push({
        name,
        district: districtName,
        lat: isNaN(lat) ? 0 : lat,
        lng: isNaN(lng) ? 0 : lng,
        fields,
      });
    });
  });

  return members;
}

export function membersToRows(parsed: ParsedMember[]): MemberRow[] {
  const now = new Date().toISOString();
  return parsed.map((p, i) => ({
    id: nanoid(12),
    name: p.name,
    name_kana: null,
    district: p.district,
    address: p.fields['住所'] ?? null,
    lat: p.lat || null,
    lng: p.lng || null,
    phone: p.fields['自宅TEL'] ?? null,
    mobile: p.fields['携帯'] ?? null,
    birthday: p.fields['生年月日'] ?? null,
    enrollment_date: p.fields['入会月日'] ?? null,
    age: p.fields['年齢'] ? parseInt(p.fields['年齢']) : null,
    workplace: p.fields['職場'] ?? null,
    role: p.fields['役職'] ?? null,
    education_level: p.fields['教学'] ?? null,
    family: p.fields['同居家族'] ?? null,
    altar_status: p.fields['御安置'] ?? null,
    daily_practice: p.fields['勤行'] ?? null,
    newspaper: p.fields['聖教購読'] ?? null,
    financial_contribution: p.fields['広布部員'] ?? null,
    activity_status: p.fields['活動状況'] ?? null,
    youth_group: p.fields['創牙'] ?? null,
    notes: p.fields['備考'] ?? null,
    visit_cycle_days: 30,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * Supabaseにメンバーデータを投入
 */
export async function seedMembers(kmlText: string) {
  const { supabase } = await import('./supabase');
  const parsed = parseKML(kmlText);
  const rows = membersToRows(parsed);

  // バッチインサート
  const { error } = await supabase.from('members').insert(rows);
  if (error) throw error;

  return { count: rows.length };
}
