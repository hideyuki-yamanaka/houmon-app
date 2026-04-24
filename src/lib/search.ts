// ─────────────────────────────────────────────────────────
// メンバー横断検索: 名前/ふりがな/地区/住所/職場/家族/情報(info)/備考(notes)/訪問ログ(summary)
// のいずれかにマッチしたら「1ヒット=1エントリ」で返す。
// P1(密リスト)方式のUIと直結する前提で設計。
// ─────────────────────────────────────────────────────────

import type { LucideIcon } from 'lucide-react';
import {
  User,
  MapPin,
  Briefcase,
  FileText,
  StickyNote,
  Users as UsersIcon,
  Calendar,
} from 'lucide-react';
import type { Member, Visit } from './types';

export interface SearchMatch {
  field: string;
  fieldLabel: string;
  fieldIcon: LucideIcon;
  text: string;       // 該当箇所の周辺テキスト(長文は前後28字でトリム)
  visitedAt?: string; // 訪問ログのみ使用
  visitId?: string;   // 訪問ログのみ使用 — 詳細ページで該当カードにスクロールするための id
}

export interface SearchHit {
  member: Member;
  match: SearchMatch;
}

/**
 * キーワード検索。1メンバー内の複数フィールド・複数訪問でヒットしたら、
 * それぞれ別エントリとして返す(P1: 1ヒット=1行)。
 */
export function searchMembers(
  query: string,
  members: Member[],
  visits: Visit[]
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];

  for (const m of members) {
    // 名前・ふりがな
    if (m.name.toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'name', fieldLabel: '名前', fieldIcon: User, text: m.name },
      });
    }
    if ((m.nameKana ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'nameKana', fieldLabel: 'ふりがな', fieldIcon: User, text: m.nameKana ?? '' },
      });
    }
    // 地区・住所
    if (m.district.toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'district', fieldLabel: '地区', fieldIcon: MapPin, text: m.district },
      });
    }
    if ((m.address ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'address', fieldLabel: '住所', fieldIcon: MapPin, text: m.address ?? '' },
      });
    }
    // 職場・家族
    if ((m.workplace ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'workplace', fieldLabel: '職場', fieldIcon: Briefcase, text: m.workplace ?? '' },
      });
    }
    if ((m.family ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: { field: 'family', fieldLabel: '家族', fieldIcon: UsersIcon, text: m.family ?? '' },
      });
    }
    // 長文: info / notes
    if ((m.info ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: {
          field: 'info',
          fieldLabel: '情報',
          fieldIcon: FileText,
          text: extractContext(m.info ?? '', q),
        },
      });
    }
    if ((m.notes ?? '').toLowerCase().includes(q)) {
      hits.push({
        member: m,
        match: {
          field: 'notes',
          fieldLabel: '備考',
          fieldIcon: StickyNote,
          text: extractContext(m.notes ?? '', q),
        },
      });
    }
    // 訪問ログ
    const memberVisits = visits.filter(v => v.memberId === m.id && !v.deletedAt);
    for (const v of memberVisits) {
      if ((v.summary ?? '').toLowerCase().includes(q)) {
        hits.push({
          member: m,
          match: {
            field: 'visit',
            fieldLabel: '訪問ログ',
            fieldIcon: Calendar,
            text: extractContext(v.summary ?? '', q),
            visitedAt: v.visitedAt,
            visitId: v.id,
          },
        });
      }
    }
  }

  return hits;
}

/**
 * クエリの前後N字だけを抜き出す(長文対策)。
 * 端に "…" を付けて切り詰めを視覚化。
 */
function extractContext(text: string, query: string, window = 28): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 60);
  const start = Math.max(0, idx - window);
  const end = Math.min(text.length, idx + query.length + window);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
