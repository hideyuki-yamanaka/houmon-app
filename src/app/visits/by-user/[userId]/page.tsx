'use client';

// ──────────────────────────────────────────────────────────────
// /visits/by-user/[userId]?range=today|week
//
// 通知タップ時の遷移先。
// 指定 userId が 「本日 / 今週」 訪問した unique メンバー一覧を表示。
//
// 例: 「ヤマナカさんが今週 5 人 訪問しました」 タップ
//     → このページで 5 人が並ぶ → 各メンバーをタップで詳細遷移
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { getMyProfile } from '../../../../lib/profile';
import type { Member } from '../../../../lib/types';
import { useSwipeBack } from '../../../../lib/useSwipeBack';
import { tapHaptic } from '../../../../lib/haptics';

type Range = 'today' | 'week';

interface VisitedMember {
  member: Member;
  lastVisitedAt: string;
  visitCount: number;
}

export default function VisitsByUserPage() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  useSwipeBack(() => router.back());

  const userId = params?.userId ?? '';
  const range = (searchParams?.get('range') as Range) ?? 'today';

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<VisitedMember[]>([]);
  const [authorName, setAuthorName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // 範囲の開始日 (JST) を計算
  const sinceISO = useMemo(() => {
    const now = new Date();
    const jstOffsetMs = 9 * 60 * 60 * 1000;
    const todayJST = new Date(now.getTime() + jstOffsetMs);
    if (range === 'today') return todayJST.toISOString().slice(0, 10);
    // week = 直近 7 日 (今日含む)
    const weekStart = new Date(todayJST.getTime() - 6 * 24 * 60 * 60 * 1000);
    return weekStart.toISOString().slice(0, 10);
  }, [range]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 作成者の表示名 (自分なら getMyProfile、他人なら profiles から個別取得)
        const me = await getMyProfile();
        if (me?.user_id === userId) {
          setAuthorName(me.display_name);
        } else {
          // チームメンバーの profile は get_team_profiles で読める
          const { data } = await supabase.rpc('get_team_profiles');
          const found = (data as { user_id: string; display_name: string }[] ?? [])
            .find(p => p.user_id === userId);
          setAuthorName(found?.display_name ?? '');
        }

        // userId が created_by の visits を range で絞って取得
        const { data: visits, error: vErr } = await supabase
          .from('visits')
          .select('member_id, visited_at')
          .eq('created_by', userId)
          .gte('visited_at', sinceISO)
          .is('deleted_at', null)
          .order('visited_at', { ascending: false });
        if (vErr) throw vErr;

        // unique member_id を抽出 (最新訪問日 + 件数)
        const map = new Map<string, { lastVisitedAt: string; count: number }>();
        for (const v of visits ?? []) {
          const mid = v.member_id as string;
          const date = v.visited_at as string;
          const cur = map.get(mid);
          if (!cur) map.set(mid, { lastVisitedAt: date, count: 1 });
          else {
            cur.count++;
            if (date > cur.lastVisitedAt) cur.lastVisitedAt = date;
          }
        }

        if (map.size === 0) {
          if (!cancelled) {
            setMembers([]);
            setLoading(false);
          }
          return;
        }

        // member 情報を一括取得
        const memberIds = Array.from(map.keys());
        const { data: memberRows, error: mErr } = await supabase
          .from('members')
          .select('*')
          .in('id', memberIds);
        if (mErr) throw mErr;

        const result: VisitedMember[] = (memberRows ?? [])
          .map(m => {
            const info = map.get(m.id as string);
            return {
              member: {
                id: m.id as string,
                name: m.name as string,
                nameKana: (m.name_kana as string | null) ?? undefined,
                district: m.district as string,
                address: (m.address as string | null) ?? undefined,
                lat: (m.lat as number | null) ?? undefined,
                lng: (m.lng as number | null) ?? undefined,
                category: (m.category as string | undefined) ?? '',
                visitCycleDays: (m.visit_cycle_days as number) ?? 0,
              } as unknown as Member,
              lastVisitedAt: info?.lastVisitedAt ?? '',
              visitCount: info?.count ?? 0,
            };
          })
          .sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt));

        if (!cancelled) {
          setMembers(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, sinceISO]);

  const rangeLabel = range === 'today' ? '本日' : '今週';
  const headerText = authorName
    ? `${authorName}さんが${rangeLabel} ${members.length} 人 訪問しました`
    : `${rangeLabel} ${members.length} 人 訪問しました`;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <button
            type="button"
            onClick={() => { tapHaptic(); router.back(); }}
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12 truncate">
            {rangeLabel}の訪問
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-3">
        {/* サマリー */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 px-4 py-3">
          <p className="text-[14px] font-bold text-gray-900 leading-relaxed">{headerText}</p>
        </section>

        {/* ローディング / エラー / 一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[13px] text-gray-500 gap-2">
            <Loader2 size={16} className="animate-spin" />
            読み込み中…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-[13px] text-red-700">
            {error}
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 px-4 py-8 text-center text-[13px] text-gray-500">
            {rangeLabel}の訪問記録はありません
          </div>
        ) : (
          <ul className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden divide-y divide-black/5">
            {members.map(({ member, lastVisitedAt, visitCount }) => (
              <li key={member.id}>
                <Link
                  href={`/members/${member.id}`}
                  onClick={() => tapHaptic()}
                  className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
                >
                  <MapPin size={18} className="text-[var(--color-primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold truncate">{member.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{member.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}</span>
                      <span>·</span>
                      <span>{lastVisitedAt}</span>
                      {visitCount > 1 && (
                        <>
                          <span>·</span>
                          <span>{visitCount}回</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
