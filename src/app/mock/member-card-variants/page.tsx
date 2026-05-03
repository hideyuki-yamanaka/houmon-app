'use client';

// ──────────────────────────────────────────────────────────────
// メンバーカード + 横カルーセル訪問ログ — D 系 10 バリエーション
//
// ヒデさん要望(2026-05-03 改訂):
//   - 訪問ログカードは「横幅いっぱいフィル」、横スワイプで次が出る
//   - 他にもカードがあるとひと目で分かる工夫(ドット・数字・矢印・peek 等)
//   - メンバーカード/ログのカラー反転、外枠ベタ塗り無し、コンパクト化等
//   - 10 案を実画面風プレビューで比較
//
// 全パターン共通: scroll-snap + 横スクロール、indexトラッキングで現在位置表示。
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronLeft as ChevL, ChevronRight as ChevR } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus } from '../../../lib/types';

// ── サンプルデータ ──
type SampleVisit = { id: string; date: string; status: VisitStatus; memo: string };
type SampleMember = {
  id: string; name: string; kana: string; district: string; age: number;
  visits: SampleVisit[];
};

const HIDETO: SampleMember = {
  id: 'm1', name: '高桑 秀都', kana: 'たかくわ ひでと', district: '英雄地区', age: 24,
  visits: [
    { id: 'v1', date: '2026-04-25', status: 'absent',
      memo: '集合マンションみたいな形の一番右が高桑さんがいる場所で、3階。ピンポンして不在だったので、お菓子を置いて帰ってきました。' },
    { id: 'v2', date: '2026-04-12', status: 'met_family',
      memo: 'お母さんが対応してくれた。本人は仕事で不在。来週末また伺うことを約束。' },
    { id: 'v3', date: '2026-03-29', status: 'met_self',
      memo: '本人と話せた。元気そうで何より。' },
  ],
};
const FUJI: SampleMember = {
  id: 'm2', name: '藤崎 勇輝', kana: 'ふじさき ゆうき', district: '正義地区', age: 28,
  visits: [
    { id: 'v4', date: '2026-04-25', status: 'met_family', memo: '父親が対応。元気そう。' },
  ],
};
const ASAHI: SampleMember = {
  id: 'm3', name: '朝日 涼太', kana: 'あさひ りょうた', district: '歓喜地区', age: 25,
  visits: [],
};
const ALL = [HIDETO, FUJI, ASAHI];

function fmtJaDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

// ── 共通: スクロール位置を index にトラッキングする hook ──
function useCarouselIndex(itemCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      const next = Math.round(el.scrollLeft / w);
      if (next !== idx) setIdx(Math.max(0, Math.min(itemCount - 1, next)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [idx, itemCount]);
  const scrollTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return { ref, idx, scrollTo };
}

// ── 共通: ピン ──
function PinSvg() {
  return (
    <svg width="18" height="26" viewBox="0 0 28 40" fill="none">
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#0EA5E9" stroke="#0284C7" strokeWidth="1"/>
      <circle cx="14" cy="13.5" r="5" fill="#fff"/>
    </svg>
  );
}

// ── メンバーヘッダー(共通) ──
function MemberHead({ m, dark = false }: { m: SampleMember; dark?: boolean }) {
  return (
    <div className={`px-3 py-2.5 flex items-center gap-3 ${dark ? 'bg-[#F5F5F5]' : 'bg-white'}`}>
      <span className="w-7 h-10 shrink-0 inline-flex items-center justify-center"><PinSvg/></span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{m.name}</span>
          <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">{m.district}</span>
          <span className="text-[11px] text-[#6B7280]">{m.visits.length > 0 ? `${m.visits.length} 回訪問` : '未訪問'}</span>
        </div>
      </div>
    </div>
  );
}

// ── 訪問ログ 1 件分(中身、共通) ──
function LogContent({ v, compact = false }: { v: SampleVisit; compact?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[12px] font-bold tabular-nums">{fmtJaDate(v.date)}</span>
        <StatusChip status={v.status} size="sm" />
      </div>
      <p className={`text-[11px] text-[#374151] leading-snug ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
        {v.memo}
      </p>
    </>
  );
}

// ── 空状態 ──
function Empty({ tone = 'gray' }: { tone?: 'gray' | 'white' }) {
  return (
    <div className={`px-3 py-2.5 text-center ${tone === 'gray' ? 'bg-[#F5F5F5]' : 'bg-white'}`}>
      <span className="text-[11px] text-[#9CA3AF]">訪問ログはまだありません</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// インジケーター部品集
// ──────────────────────────────────────────────────────────────
function Dots({ count, active, onJump }: { count: number; active: number; onJump?: (i: number) => void }) {
  return (
    <div className="flex justify-center gap-1.5 py-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump?.(i)}
          aria-label={`${i + 1}件目`}
          className={`rounded-full transition-all ${
            i === active ? 'w-4 h-1.5 bg-[#111]' : 'w-1.5 h-1.5 bg-[#D1D5DB]'
          }`}
        />
      ))}
    </div>
  );
}
function NumIndicator({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex justify-end px-3 py-1">
      <span className="text-[10px] tabular-nums text-[#6B7280]">{active + 1} / {count}</span>
    </div>
  );
}
function ProgressBar({ count, active }: { count: number; active: number }) {
  return (
    <div className="px-3 py-1.5">
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-[3px] rounded-full transition-colors ${
              i === active ? 'bg-[#111]' : 'bg-[#E5E7EB]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
function Arrows({ count, active, onJump }: { count: number; active: number; onJump: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <button
        type="button"
        disabled={active === 0}
        onClick={() => onJump(active - 1)}
        className="p-0.5 disabled:opacity-30"
        aria-label="前のログ"
      >
        <ChevL size={16} className="text-[#6B7280]" />
      </button>
      <span className="text-[10px] tabular-nums text-[#6B7280]">{active + 1} / {count}</span>
      <button
        type="button"
        disabled={active === count - 1}
        onClick={() => onJump(active + 1)}
        className="p-0.5 disabled:opacity-30"
        aria-label="次のログ"
      >
        <ChevR size={16} className="text-[#6B7280]" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// バリエーション本体
//   variant ごとに見た目を switch
// ──────────────────────────────────────────────────────────────
type Variant =
  | 'adopted'   // 採用候補A: 上12 / 下16 + 数字右端 + スクロールバー有
  | 'adopted_b' // 採用候補B: 上下12px + スクロールバー無し
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  | 'D6' | 'D7' | 'D8' | 'D9' | 'D10'
  | 'baseline'; // 比較用: 現状(横スワイプ無し)

const VARIANTS: { key: Variant; label: string; desc: string }[] = [
  { key: 'adopted',   label: '★ 採用候補A', desc: '上12 / 下16 + 数字右端。スクロールバー有(調整スライダー付き)' },
  { key: 'adopted_b', label: '★ 採用候補B', desc: '上下 12px(均等) + スクロールバー非表示版' },
  { key: 'D1',  label: 'D1 標準ドット',  desc: 'メンバー白 + ログ薄グレー、フル幅、下にドット' },
  { key: 'D2',  label: 'D2 反転配色',    desc: 'メンバーグレー + ログ白、ドット下' },
  { key: 'D3',  label: 'D3 外枠なしフラット', desc: 'カード自体の外枠を撤去、ベース背景に直置き' },
  { key: 'D4',  label: 'D4 数字 (1/3)',  desc: 'ドット代わりに右に「1 / 3」を小さく表示' },
  { key: 'D5',  label: 'D5 プログレスバー', desc: 'ストーリー風バー(現在位置だけ濃い)' },
  { key: 'D6',  label: 'D6 Peek',         desc: '次のカードがチラ見え。物理的に「もう一枚あるで」感' },
  { key: 'D7',  label: 'D7 重なりシルエット', desc: '裏に薄い 2 枚目シルエット。ドット併用' },
  { key: 'D8',  label: 'D8 矢印タップ',     desc: '左右の矢印で進める(指タッチ無しでも操作可)' },
  { key: 'D9',  label: 'D9 コンパクト1行', desc: 'メモ 1 行に圧縮、最低高さで密度UP' },
  { key: 'D10', label: 'D10 統合カード',   desc: 'メンバー & ログを 1 枚の大カードに統合(区切り線のみ)' },
  { key: 'baseline', label: '現状', desc: '訪問ログ無し(現状の MemberCard)' },
];

// ====================== ★ 採用候補: D3 + D4 + コンパクト ======================
// - 外枠の白ベタ塗りなし(シート背景に直置き、行間の薄ボーダーで仕切るだけ)
// - インジケーターは右上の小さな数字 1/3 のみ(ドット無し)
// - 縦パディングを詰めてコンパクトに
function Adopted({ m }: { m: SampleMember }) {
  // 数字 N/全件 は map の i で表現するので idx は受け取らない(scroll 同期は ref のみ使用)
  const { ref } = useCarouselIndex(m.visits.length);
  return (
    <div className="border-b border-[#E5E7EB] pb-1.5">
      {/* メンバーヘッダー(コンパクト: py-1.5) */}
      <div className="px-3 py-1.5 flex items-center gap-3">
        <span className="w-6 h-9 shrink-0 inline-flex items-center justify-center"><PinSvg/></span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[14px] leading-tight">{m.name}</span>
            <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">{m.district}</span>
            <span className="text-[11px] text-[#6B7280]">{m.visits.length > 0 ? `${m.visits.length} 回訪問` : '未訪問'}</span>
          </div>
        </div>
      </div>
      {/* ログセクション(外枠なし、シート背景にグレーボックスを直接乗せる)
          - 上下 padding は CSS 変数で動的調整(下のスライダー UI から)
          - 数字 N/全件 は日付・チップと同じ行に置いて両端揃え(右端) */}
      {m.visits.length === 0 ? null : (
        <div className="bg-[#F2F2F4] rounded-lg mx-3 mt-1">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map((v, i) => (
              <div
                key={v.id}
                className="shrink-0 w-full px-3"
                style={{
                  scrollSnapAlign: 'start',
                  paddingTop: 'var(--mock-grey-pt, 12px)',
                  paddingBottom: 'var(--mock-grey-pb, 16px)',
                }}
              >
                {/* 上段: 日付 + チップ ─ 数字(右端) */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-bold tabular-nums shrink-0">
                      {fmtJaDate(v.date)}
                    </span>
                    <StatusChip status={v.status} size="sm" />
                  </div>
                  {m.visits.length > 1 && (
                    <span className="text-[10px] tabular-nums text-[#6B7280] shrink-0">
                      {i + 1} / {m.visits.length}
                    </span>
                  )}
                </div>
                {/* 下段: メモ 2 行 */}
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================== ★ 採用候補B: 上下 12px + スクロールバー無し ======================
// adopted (A) と違いは:
//   - padding 上下とも 12px 固定 (調整スライダー無し、均等)
//   - 横スクロールバー(下に出るあのスライダーの棒)を CSS で非表示化
function AdoptedB({ m }: { m: SampleMember }) {
  const { ref } = useCarouselIndex(m.visits.length);
  return (
    <div className="border-b border-[#E5E7EB] pb-1.5">
      {/* メンバーヘッダー(コンパクト) */}
      <div className="px-3 py-1.5 flex items-center gap-3">
        <span className="w-6 h-9 shrink-0 inline-flex items-center justify-center"><PinSvg/></span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[14px] leading-tight">{m.name}</span>
            <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">{m.district}</span>
            <span className="text-[11px] text-[#6B7280]">{m.visits.length > 0 ? `${m.visits.length} 回訪問` : '未訪問'}</span>
          </div>
        </div>
      </div>
      {m.visits.length === 0 ? null : (
        <div className="bg-[#F2F2F4] rounded-lg mx-3 mt-1">
          <div
            ref={ref}
            className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',          // Firefox
              msOverflowStyle: 'none' as 'none', // 旧 IE/Edge(念のため)
            }}
          >
            {m.visits.map((v, i) => (
              <div
                key={v.id}
                className="shrink-0 w-full"
                style={{
                  scrollSnapAlign: 'start',
                  paddingTop: 'var(--mock-numb-pt, 12px)',
                  paddingBottom: 'var(--mock-numb-pb, 12px)',
                  paddingLeft: 'var(--mock-numb-pl, 12px)',
                  paddingRight: 'var(--mock-numb-pr, 12px)',
                }}
              >
                {/* 上段: 日付+チップ ─ 数字(右端)
                    数字のサイズ&揃えは CSS 変数で動的調整(下のツールから) */}
                <div
                  className="flex justify-between gap-2 mb-1"
                  style={{ alignItems: 'var(--mock-numb-align, center)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-bold tabular-nums shrink-0">
                      {fmtJaDate(v.date)}
                    </span>
                    <StatusChip status={v.status} size="sm" />
                  </div>
                  {m.visits.length > 1 && (
                    <span
                      className="tabular-nums text-[#6B7280] shrink-0 leading-none"
                      style={{
                        fontSize: 'var(--mock-numb-size, 10px)',
                        letterSpacing: 'var(--mock-numb-tracking, 0em)',
                      }}
                    >
                      {i + 1} / {m.visits.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================== D1: 標準ドット ======================
function D1({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m} />
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D2: 反転配色 ======================
function D2({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-[#F5F5F5]">
      <MemberHead m={m} dark/>
      {m.visits.length === 0 ? <Empty tone="white"/> : (
        <div className="bg-white border-t border-[#E5E7EB]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D3: 外枠なしフラット ======================
function D3({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="border-b border-[#E5E7EB] pb-2">
      {/* 外枠なし — シート背景にそのまま乗る */}
      <MemberHead m={m} />
      {m.visits.length === 0 ? null : (
        <div className="bg-[#F5F5F5] rounded-lg mx-3 mt-1">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D4: 数字インジケーター ======================
function D4({ m }: { m: SampleMember }) {
  const { ref, idx } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5] relative">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && (
            <span className="absolute top-1.5 right-2 text-[10px] tabular-nums text-[#6B7280] bg-white/80 px-1.5 py-0.5 rounded-full">
              {idx + 1} / {m.visits.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ====================== D5: プログレスバー(ストーリー風) ======================
function D5({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5]">
          {m.visits.length > 1 && <ProgressBar count={m.visits.length} active={idx}/>}
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2 pb-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {/* dummy use of scrollTo for touch */}
          <button type="button" onClick={() => scrollTo(0)} className="hidden" aria-hidden tabIndex={-1}/>
        </div>
      )}
    </div>
  );
}

// ====================== D6: Peek(次カードちょい見え) ======================
function D6({ m }: { m: SampleMember }) {
  const itemCount = m.visits.length;
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth - 24; // 1 枚分は w - peek 分
      const next = Math.round(el.scrollLeft / w);
      setIdx(Math.max(0, Math.min(itemCount - 1, next)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [itemCount]);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {itemCount === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map((v, i) => (
              <div
                key={v.id}
                className="shrink-0 px-3 py-2.5"
                style={{
                  scrollSnapAlign: 'start',
                  // 100% から 「次がちょっと見える」分(24px)を引く。最後だけはフル幅
                  width: i === itemCount - 1 ? '100%' : 'calc(100% - 24px)',
                }}
              >
                <div className="bg-white rounded-md px-2.5 py-2 shadow-sm">
                  <LogContent v={v} />
                </div>
              </div>
            ))}
          </div>
          {itemCount > 1 && <Dots count={itemCount} active={idx}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D7: 重なりシルエット ======================
function D7({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  const remaining = m.visits.length - 1 - idx;
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5] relative pb-1">
          {/* 裏に重なりシルエット(2 件以上の時、残数分だけ右に少しずれて表示) */}
          {remaining > 0 && (
            <div
              className="absolute right-2 top-2 bottom-2 rounded-md bg-white border border-[#E5E7EB]"
              style={{ width: 18, transform: 'translateX(6px)' }}
              aria-hidden
            />
          )}
          <div ref={ref} className="relative flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <div className="bg-white rounded-md p-2 shadow-sm border border-[#F0F0F0]">
                  <LogContent v={v} />
                </div>
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D8: 矢印タップ ======================
function D8({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Arrows count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D9: コンパクト 1 行 ======================
function D9({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? <Empty/> : (
        <div className="bg-[#F5F5F5]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} compact />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== D10: 統合カード(区切り線のみ) ======================
function D10({ m }: { m: SampleMember }) {
  const { ref, idx, scrollTo } = useCarouselIndex(m.visits.length);
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
      <MemberHead m={m}/>
      {m.visits.length === 0 ? null : (
        <div className="border-t border-dashed border-[#E5E7EB]">
          <div ref={ref} className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {m.visits.map(v => (
              <div key={v.id} className="shrink-0 w-full px-3 py-2.5" style={{ scrollSnapAlign: 'start' }}>
                <LogContent v={v} />
              </div>
            ))}
          </div>
          {m.visits.length > 1 && <Dots count={m.visits.length} active={idx} onJump={scrollTo}/>}
        </div>
      )}
    </div>
  );
}

// ====================== baseline: 現状 ======================
function Baseline({ m }: { m: SampleMember }) {
  const last = m.visits[0];
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-3 py-2.5 flex items-center gap-3">
      <span className="w-7 h-10 shrink-0 inline-flex items-center justify-center"><PinSvg/></span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{m.name}</span>
          <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">{m.district}</span>
          <span className="text-[11px] text-[#6B7280]">{last ? `${fmtJaDate(last.date)}(${m.visits.length}回)` : '----年--月--日'}</span>
        </div>
      </div>
    </div>
  );
}

function renderCard(variant: Variant, m: SampleMember) {
  switch (variant) {
    case 'adopted':   return <Adopted m={m}/>;
    case 'adopted_b': return <AdoptedB m={m}/>;
    case 'D1':  return <D1 m={m}/>;
    case 'D2':  return <D2 m={m}/>;
    case 'D3':  return <D3 m={m}/>;
    case 'D4':  return <D4 m={m}/>;
    case 'D5':  return <D5 m={m}/>;
    case 'D6':  return <D6 m={m}/>;
    case 'D7':  return <D7 m={m}/>;
    case 'D8':  return <D8 m={m}/>;
    case 'D9':  return <D9 m={m}/>;
    case 'D10': return <D10 m={m}/>;
    case 'baseline': return <Baseline m={m}/>;
  }
}

// ── padding 用の共通スライダー行 ──
function PadSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] text-[#6B7280] w-7 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={32}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#111]"
        aria-label={`${label}パディング`}
      />
      <span className="text-[10px] tabular-nums w-10 text-right text-[#374151]">{value} px</span>
    </div>
  );
}

// ── マップ風背景 ──
function FakeMapBg() {
  return (
    <div className="absolute inset-0" style={{
      background: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
      backgroundImage: 'linear-gradient(#D1D5DB22 1px, transparent 1px), linear-gradient(90deg, #D1D5DB22 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}>
      {[
        ['18%','24%'], ['42%','18%'], ['68%','36%'], ['28%','52%'], ['56%','44%'],
      ].map(([l, t], i) => (
        <span key={i} className="absolute" style={{ left: l, top: t }}><PinSvg/></span>
      ))}
    </div>
  );
}

// localStorage キー(padding 調整値の保存用)
const PAD_STORAGE = 'mock-member-card-pad-v1';
// localStorage キー(B 数字スタイル保存用)
const NUMB_STORAGE = 'mock-member-card-numb-v1';
// localStorage キー(B グレーボックス内 上下左右 padding 保存用)
const NUMB_PAD_STORAGE = 'mock-member-card-numb-pad-v1';

type NumAlign = 'flex-start' | 'center' | 'flex-end' | 'baseline';
const NUM_ALIGN_OPTIONS: { val: NumAlign; label: string }[] = [
  { val: 'flex-start', label: '上' },
  { val: 'center',     label: '中' },
  { val: 'flex-end',   label: '下' },
  { val: 'baseline',   label: 'ベース' },
];

export default function MemberCardVariantsPage() {
  const [variant, setVariant] = useState<Variant>('adopted');

  // ── 採用候補のグレーセクション 上下 padding 調整スライダー ──
  // localStorage に保存して、リロード後も値を維持
  // (デフォルト: 上 12 / 下 16 = ヒデさん検証で確定した値)
  const [padTop, setPadTop] = useState<number>(12);
  const [padBot, setPadBot] = useState<number>(16);
  // 初回マウント: localStorage から復元
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PAD_STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.top === 'number') setPadTop(v.top);
        if (typeof v.bot === 'number') setPadBot(v.bot);
      }
    } catch { /* ignore */ }
  }, []);
  // padTop / padBot が変わったら CSS 変数 + localStorage 同期
  useEffect(() => {
    document.documentElement.style.setProperty('--mock-grey-pt', `${padTop}px`);
    document.documentElement.style.setProperty('--mock-grey-pb', `${padBot}px`);
    try {
      window.localStorage.setItem(PAD_STORAGE, JSON.stringify({ top: padTop, bot: padBot }));
    } catch { /* ignore */ }
  }, [padTop, padBot]);

  // ── B 用: グレーボックス内の 上下左右 padding ──
  const [bPadTop, setBPadTop]   = useState<number>(12);
  const [bPadBot, setBPadBot]   = useState<number>(12);
  const [bPadL,   setBPadL]     = useState<number>(12);
  const [bPadR,   setBPadR]     = useState<number>(12);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NUMB_PAD_STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.t === 'number') setBPadTop(v.t);
        if (typeof v.b === 'number') setBPadBot(v.b);
        if (typeof v.l === 'number') setBPadL(v.l);
        if (typeof v.r === 'number') setBPadR(v.r);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--mock-numb-pt', `${bPadTop}px`);
    document.documentElement.style.setProperty('--mock-numb-pb', `${bPadBot}px`);
    document.documentElement.style.setProperty('--mock-numb-pl', `${bPadL}px`);
    document.documentElement.style.setProperty('--mock-numb-pr', `${bPadR}px`);
    try {
      window.localStorage.setItem(
        NUMB_PAD_STORAGE,
        JSON.stringify({ t: bPadTop, b: bPadBot, l: bPadL, r: bPadR }),
      );
    } catch { /* ignore */ }
  }, [bPadTop, bPadBot, bPadL, bPadR]);

  // ── B 用: 数字 (1/3) のサイズ・上下揃え・letter-spacing ──
  const [numSize, setNumSize] = useState<number>(10);
  const [numAlign, setNumAlign] = useState<NumAlign>('center');
  const [numTracking, setNumTracking] = useState<number>(0); // em 単位
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NUMB_STORAGE);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.size === 'number') setNumSize(v.size);
        if (typeof v.align === 'string') setNumAlign(v.align);
        if (typeof v.tracking === 'number') setNumTracking(v.tracking);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--mock-numb-size', `${numSize}px`);
    document.documentElement.style.setProperty('--mock-numb-align', numAlign);
    document.documentElement.style.setProperty('--mock-numb-tracking', `${numTracking}em`);
    try {
      window.localStorage.setItem(
        NUMB_STORAGE,
        JSON.stringify({ size: numSize, align: numAlign, tracking: numTracking }),
      );
    } catch { /* ignore */ }
  }, [numSize, numAlign, numTracking]);

  // D3 / 採用候補 はカードに外枠が無いので、シート内の背景を利用するため bg をそのまま使う
  const sheetBg = '#FFFFFF';

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22}/>
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">D系 10案 + 現状</h1>
        <div className="w-14"/>
      </nav>

      <section className="px-4 pt-3 pb-1">
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          訪問ログは横幅フィル + 横スワイプで切替。下のドット/数字/矢印などで「他にもある」を伝える 10 案。
          実画面風プレビューで比較してな。
        </p>
      </section>

      {/* 切替セグメント sticky */}
      <section className="sticky top-[52px] z-20 bg-[#F5F5F7] px-4 pt-2 pb-2 border-b border-[#E5E7EB]">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4">
          {VARIANTS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => setVariant(v.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                variant === v.key
                  ? 'bg-[#111] text-white'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] active:bg-[#F0F0F0]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#6B7280] mt-1.5">
          {VARIANTS.find(v => v.key === variant)?.desc}
        </p>
      </section>

      {/* B 用: 数字 (1/3) のサイズ・上下揃え 調整 — adopted_b 選択時のみ */}
      {variant === 'adopted_b' && (
        <section className="px-4 pt-2 pb-2">
          <div className="rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#111]">数字 (1/3) のサイズと揃え</span>
              <button
                type="button"
                onClick={() => { setNumSize(10); setNumAlign('center'); setNumTracking(0); }}
                className="text-[10px] text-[#6B7280] active:opacity-60"
                title="既定値(10px / 中央 / tracking 0)に戻す"
              >
                リセット
              </button>
            </div>
            {/* サイズ */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-[#6B7280] w-10 shrink-0">サイズ</span>
              <input
                type="range"
                min={8}
                max={16}
                step={1}
                value={numSize}
                onChange={(e) => setNumSize(Number(e.target.value))}
                className="flex-1 accent-[#111]"
                aria-label="数字のサイズ"
              />
              <span className="text-[10px] tabular-nums w-10 text-right text-[#374151]">{numSize} px</span>
            </div>
            {/* 揃え(セグメント) */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-[#6B7280] w-10 shrink-0">揃え</span>
              <div className="flex-1 inline-flex p-0.5 bg-[#F3F4F6] rounded-md">
                {NUM_ALIGN_OPTIONS.map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setNumAlign(opt.val)}
                    className={`flex-1 px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      numAlign === opt.val
                        ? 'bg-white text-[#111] shadow-sm'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 文字間 (letter-spacing em) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] w-10 shrink-0">文字間</span>
              <input
                type="range"
                min={-0.1}
                max={0.1}
                step={0.005}
                value={numTracking}
                onChange={(e) => setNumTracking(Number(e.target.value))}
                className="flex-1 accent-[#111]"
                aria-label="数字の文字間 (letter-spacing em)"
              />
              <span className="text-[10px] tabular-nums w-14 text-right text-[#374151]">
                {numTracking.toFixed(3)} em
              </span>
            </div>
            {/* グレーボックス 上下左右 padding (4 軸個別) */}
            <div className="mt-2 pt-2 border-t border-[#F0F0F0]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#111]">グレーボックス 上下左右パディング</span>
                <button
                  type="button"
                  onClick={() => { setBPadTop(12); setBPadBot(12); setBPadL(12); setBPadR(12); }}
                  className="text-[10px] text-[#6B7280] active:opacity-60"
                  title="全部 12px に戻す"
                >
                  リセット
                </button>
              </div>
              <PadSlider label="上" value={bPadTop} onChange={setBPadTop}/>
              <PadSlider label="下" value={bPadBot} onChange={setBPadBot}/>
              <PadSlider label="左" value={bPadL}   onChange={setBPadL}/>
              <PadSlider label="右" value={bPadR}   onChange={setBPadR}/>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 leading-tight">
              数字スタイル(サイズ/揃え/文字間) と グレーボックス内の 上下左右 padding を調整。
              値は端末に保存(リロード後も有効)。
            </p>
          </div>
        </section>
      )}

      {/* グレーセクション padding 調整ツール — 採用候補A のときだけ表示 */}
      {variant === 'adopted' && (
        <section className="px-4 pt-2 pb-2">
          <div className="rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#111]">グレーセクションの上下パディング</span>
              <button
                type="button"
                onClick={() => { setPadTop(12); setPadBot(16); }}
                className="text-[10px] text-[#6B7280] active:opacity-60"
                title="既定値(12/16)に戻す"
              >
                リセット
              </button>
            </div>
            {/* 上 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-[#6B7280] w-7 shrink-0">上</span>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={padTop}
                onChange={(e) => setPadTop(Number(e.target.value))}
                className="flex-1 accent-[#111]"
                aria-label="上パディング"
              />
              <span className="text-[10px] tabular-nums w-10 text-right text-[#374151]">{padTop} px</span>
            </div>
            {/* 下 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] w-7 shrink-0">下</span>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={padBot}
                onChange={(e) => setPadBot(Number(e.target.value))}
                className="flex-1 accent-[#111]"
                aria-label="下パディング"
              />
              <span className="text-[10px] tabular-nums w-10 text-right text-[#374151]">{padBot} px</span>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 leading-tight">
              スライダーをいじると下のプレビューに即反映。値は端末に保存される(リロード後も有効)。
            </p>
          </div>
        </section>
      )}

      {/* 実画面風プレビュー */}
      <section className="px-3 pt-4">
        <div
          className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm"
          style={{ height: 760, maxWidth: 480, margin: '0 auto' }}
        >
          {/* マップ風 */}
          <div className="absolute inset-x-0 top-0 h-[260px]">
            <FakeMapBg/>
          </div>
          {/* ボトムシート風 */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex flex-col"
               style={{ top: 220, background: sheetBg }}
          >
            <div className="flex justify-center pt-2 pb-2">
              <div className="w-9 h-[5px] rounded-full bg-gray-300"/>
            </div>
            <div className="px-4 pb-2 border-b border-[#F0F0F0] shrink-0 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-bold">メンバー</h2>
                <span className="text-xs text-[#6B7280]">3人</span>
              </div>
              <span className="text-xs text-[#9CA3AF]">並び順 ▼</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {ALL.map(m => <div key={m.id}>{renderCard(variant, m)}</div>)}
              <p className="text-[10px] text-center text-[#9CA3AF] pt-2">↑ ボトムシート内をスクロール</p>
            </div>
          </div>
        </div>
      </section>

      {/* 操作ヒント */}
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 text-[11px] text-[#6B7280] leading-relaxed">
          <strong className="text-[#111]">使い方:</strong>
          高桑(3 件)の訪問ログを<u>左にスワイプ</u>(PCならドラッグ)で次のログへ切替。
          ドット/数字/矢印などインジケーターも各案ごとに違うで。
        </div>
      </section>

      {/* 10 案サマリ */}
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-4">
          <h3 className="text-[13px] font-bold mb-2">10 案の特徴</h3>
          <ul className="text-[12px] text-[#374151] space-y-1.5 leading-relaxed">
            <li><b>D1 標準ドット</b> — 配色そのまま、下にドット</li>
            <li><b>D2 反転配色</b> — メンバー部がグレー、ログが白</li>
            <li><b>D3 外枠なし</b> — カードの白枠を外し、シート背景に直置き</li>
            <li><b>D4 数字 (1/3)</b> — ドット代わりに右上に小さく数字</li>
            <li><b>D5 プログレスバー</b> — Instagram ストーリー風</li>
            <li><b>D6 Peek</b> — 次のカードがチラッと見える(右に余白で予告)</li>
            <li><b>D7 シルエット</b> — 裏に薄く 2 枚目が透ける</li>
            <li><b>D8 矢印タップ</b> — 左右の矢印で進める。スワイプ + タップ両対応</li>
            <li><b>D9 コンパクト1行</b> — メモ 1 行に圧縮、密度UP</li>
            <li><b>D10 統合カード</b> — 上下を 1 枚カードに統合、点線で区切り</li>
          </ul>
          <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
            気に入った案 + 「ドットの色をもう少し濃く」「Peek 量を 24 → 32px」みたいな
            微調整も気軽に〜。
          </p>
        </div>
      </section>
    </div>
  );
}
