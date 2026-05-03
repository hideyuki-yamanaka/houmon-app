'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Member, Visit } from '../../../lib/types';
import { getMember, getVisits } from '../../../lib/storage';
import MemberInfo from '../../../components/MemberInfo';
import InfoSection from '../../../components/InfoSection';
import VisitCard from '../../../components/VisitCard';
import { useSwipeBack } from '../../../lib/useSwipeBack';
import { tapHaptic } from '../../../lib/haptics';

/**
 * 検索ヒットから飛んで来た時に、指定セクションにスクロール＋一瞬フラッシュする。
 * URL のクエリパラメータ:
 *   hl    : 'basic' | 'info' | 'visit'  — どのセクションを強調するか
 *   q     : 検索クエリ                  — 各フィールド内の文字をハイライト
 *   vid   : Visit.id                    — hl=visit の時だけ使う
 *   field : search.ts の SearchMatch.field — hl=basic の時、MemberInfo がアコーディオン自動展開判定に使用
 */
export default function MemberDetailClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const hl = searchParams.get('hl');           // 'basic' | 'info' | 'visit' | null
  const q = searchParams.get('q') ?? '';       // ハイライト対象クエリ
  const vid = searchParams.get('vid');         // 訪問ログの id
  const hlField = searchParams.get('field');   // 'workplace' | 'notes' など細かいフィールド

  const [member, setMember] = useState<Member | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // iOS 風 「左端から右にスワイプで戻る」
  useSwipeBack(() => router.back());

  // フラッシュ対象のセクション DOM id。表示後に一瞬リングアニメを走らせてスッと消す。
  const [flashId, setFlashId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    Promise.all([getMember(id), getVisits(id)])
      .then(([m, v]) => {
        setMember(m);
        setVisits(v);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ホームに戻ってきた時、マップがこのメンバーのピンを中央に表示するよう記録する。
  // page.tsx 側が sessionStorage から読み込んで selectedId に復元 → PanToSelected が発火。
  useEffect(() => {
    try { sessionStorage.setItem('houmon_lastViewedMemberId', id); } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    const handlePopState = () => fetchData();
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('focus', fetchData);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('focus', fetchData);
    };
  }, [fetchData]);

  // ハイライト対象セクションのスクロール + フラッシュ処理
  // member データが揃ってから 1 回だけ実行(依存配列を絞って再発火を防ぐ)
  const targetSectionId = useMemo(() => {
    if (!hl) return null;
    if (hl === 'info') return 'section-info';
    if (hl === 'basic') return 'section-basic';
    if (hl === 'visit') return vid ? `visit-${vid}` : 'section-visits';
    return null;
  }, [hl, vid]);

  useEffect(() => {
    if (!member) return;
    if (!targetSectionId) return;
    // DOM が描画されるのを 1 フレーム待ってからスクロール
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(targetSectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setFlashId(targetSectionId);
    }, 120);
    // 2.5 秒でリングを消す
    const clearTimer = setTimeout(() => setFlashId(null), 2600);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [member, targetSectionId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">メンバーが見つかりません</p>
      </div>
    );
  }

  // フラッシュ中の視覚効果 — Tailwind の ring + transition で控えめに。
  // 2.5 秒後に setFlashId(null) で class が外れる → 自然にフェード。
  const flashCls = (sectionId: string) =>
    flashId === sectionId
      ? 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-[var(--color-bg)] rounded-2xl transition-shadow duration-500'
      : 'transition-shadow duration-500';

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => { tapHaptic(); if (window.history.length > 1) router.back(); else router.push('/members'); }} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-lg font-bold truncate flex-1 text-center">{member.name}</h1>
        <div className="w-14" />
      </nav>

      <div className="flex-1 overflow-y-auto">
        {/* pb は最小限 (4=16px)。下のタブバー領域は親 layout の outer pb で確保済 */}
        <div className="max-w-[1366px] mx-auto px-4 py-4 pb-4 space-y-4">
          <div id="section-basic" className={flashCls('section-basic')}>
            <MemberInfo
              member={member}
              onUpdate={(updates) => setMember(prev => prev ? { ...prev, ...updates } : prev)}
              highlightQuery={hl === 'basic' ? q : undefined}
              highlightField={hl === 'basic' ? hlField : undefined}
            />
          </div>

          <div id="section-info" className={flashCls('section-info')}>
            <InfoSection
              member={member}
              onUpdate={(updates) => setMember(prev => prev ? { ...prev, ...updates } : prev)}
              highlightQuery={hl === 'info' ? q : undefined}
            />
          </div>

          <div id="section-visits" className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-3">
              訪問ログ（{visits.length}件）
            </h3>
            {visits.length === 0 ? (
              <p className="text-sm text-[var(--color-subtext)]">まだ訪問ログがありません</p>
            ) : (
              <div className="space-y-2">
                {visits.map(v => (
                  <div
                    key={v.id}
                    id={`visit-${v.id}`}
                    className={flashCls(`visit-${v.id}`)}
                  >
                    <VisitCard
                      visit={v}
                      highlightQuery={hl === 'visit' && vid === v.id ? q : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/visits/new?memberId=${member.id}`}
        onClick={() => tapHaptic()}
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
