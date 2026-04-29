'use client';

// ──────────────────────────────────────────────────────────────
// 「家庭訪問の回数」カードの 横棒グラフ案 3 パターン比較ページ
// (ヒデさん要望 2026-04-26):
//   - 元のカードから「カテゴリ別の割合 / 会えた率 / 横棒グラフ」を撤去予定
//   - 上の 12 週バーを 横棒グラフ にして、左側にラベル(今週/先週/2週間前 + 日付)
//   - 3 パターン UI を一旦プレビューで見比べてから本実装する
//
// このページは比較用モックなので、サンプルデータで見せる(本番データは関係なし)。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// ── 月曜始まりで「N 週前」のラベルと日付を生成 ──
function weekLabel(i: number): string {
  if (i === 0) return '今週';
  if (i === 1) return '先週';
  return `${i}週間前`;
}

// 月曜の日付を返す: 今週 i=0, 先週 i=1, ...
function mondayOf(i: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff - i * 7);
  return d;
}
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── サンプルデータ: 直近 12 週分の訪問回数(週ごと) ──
// 値はそれっぽく散らばらせる
const SAMPLE: number[] = [3, 2, 0, 0, 4, 1, 0, 2, 3, 0, 1, 2];
// 配列の index = 「今週からの過去」 = 0:今週, 1:先週, ...

// 共通のバー色
const BAR_HIT = '#10B981';   // 訪問あり: 緑
const BAR_EMPTY = '#F3F4F6'; // 訪問なし: 薄グレー
const TEXT_DIM = '#9CA3AF';
const TEXT = '#111';

export default function DashboardBarMockPage() {
  const weeks = SAMPLE.map((count, i) => ({
    i,
    count,
    label: weekLabel(i),
    date: fmtMD(mondayOf(i)),
  }));
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      {/* ナビ */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">
          家庭訪問の回数 横棒グラフ案
        </h1>
        <div className="w-14" />
      </nav>

      {/* 説明 */}
      <section className="px-4 pt-4">
        <p className="text-[13px] text-[#374151] leading-relaxed">
          「家庭訪問の回数」カードの中身を、12 週バーグラフを横向きにして
          左側に「今週／先週／2週間前…」+ 日付ラベルを置く案を 3 パターン作ったで。
          下のステータス内訳・会えた率はどの案でも撤去前提。
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">
          ※ サンプルデータ表示。本番データは反映してへん。
        </p>
      </section>

      {/* 案 A */}
      <section className="px-4 pt-6">
        <h2 className="text-[15px] font-bold mb-1">A. シンプル横棒（数字バー右）</h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          左にラベル＋日付、右に細めの横バー、その右端に件数を 1 行で。一番ミニマル。
        </p>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
          {/* Hero 数字 */}
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[64px] font-extrabold tabular-nums leading-none tracking-tight text-[#111]">
              {weeks.filter((w) => w.count > 0).length}
            </span>
            <span className="text-sm font-bold">回</span>
          </div>
          {/* 横棒リスト */}
          <div className="space-y-2">
            {weeks.map((w) => {
              const hit = w.count > 0;
              const widthPct = hit ? Math.max(8, (w.count / max) * 100) : 4;
              return (
                <div key={w.i} className="flex items-center gap-2">
                  {/* 左ラベル */}
                  <div className="w-[88px] shrink-0 flex items-baseline gap-1.5">
                    <span
                      className={`text-[12px] font-bold leading-none ${
                        w.i === 0 ? 'text-[#111]' : 'text-[#6B7280]'
                      }`}
                    >
                      {w.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-[#9CA3AF]">{w.date}</span>
                  </div>
                  {/* バー */}
                  <div className="flex-1 h-3 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        background: hit ? BAR_HIT : BAR_EMPTY,
                      }}
                    />
                  </div>
                  {/* 数字 */}
                  <span
                    className="w-7 text-right text-[12px] font-bold tabular-nums shrink-0"
                    style={{ color: hit ? TEXT : TEXT_DIM }}
                  >
                    {hit ? w.count : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 案 B */}
      <section className="px-4 pt-6">
        <h2 className="text-[15px] font-bold mb-1">B. 太バー＋オーバーレイ数字</h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          バー自体を太く(20px)して、その中に数字を白抜きで載せる。視認性◎。
        </p>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[64px] font-extrabold tabular-nums leading-none tracking-tight text-[#111]">
              {weeks.filter((w) => w.count > 0).length}
            </span>
            <span className="text-sm font-bold">回</span>
          </div>
          <div className="space-y-1.5">
            {weeks.map((w) => {
              const hit = w.count > 0;
              const widthPct = hit ? Math.max(12, (w.count / max) * 100) : 4;
              return (
                <div key={w.i} className="flex items-center gap-2.5">
                  <div className="w-[84px] shrink-0 flex flex-col items-end leading-tight">
                    <span
                      className={`text-[12px] font-bold ${
                        w.i === 0 ? 'text-[#111]' : 'text-[#6B7280]'
                      }`}
                    >
                      {w.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-[#9CA3AF]">{w.date}</span>
                  </div>
                  <div className="flex-1 h-5 rounded-md bg-[#F3F4F6] overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all flex items-center justify-end px-2"
                      style={{
                        width: `${widthPct}%`,
                        background: hit ? BAR_HIT : BAR_EMPTY,
                      }}
                    >
                      {hit && (
                        <span className="text-[11px] font-bold tabular-nums text-white">
                          {w.count}
                        </span>
                      )}
                    </div>
                    {!hit && (
                      <span className="absolute inset-y-0 left-2 flex items-center text-[11px] tabular-nums text-[#9CA3AF]">
                        0
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 案 C */}
      <section className="px-4 pt-6">
        <h2 className="text-[15px] font-bold mb-1">C. ラベル独立行 + 大きめバー</h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          ラベルとバーを 2 行で分ける。バーの数字は右側に大きく出して
          ジャンプ率を稼ぐ。スマホ縦持ちでも読みやすい。
        </p>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[64px] font-extrabold tabular-nums leading-none tracking-tight text-[#111]">
              {weeks.filter((w) => w.count > 0).length}
            </span>
            <span className="text-sm font-bold">回</span>
          </div>
          <div className="space-y-3">
            {weeks.map((w) => {
              const hit = w.count > 0;
              const widthPct = hit ? Math.max(12, (w.count / max) * 100) : 4;
              return (
                <div key={w.i}>
                  {/* ラベル(行1) */}
                  <div className="flex items-baseline justify-between mb-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-[12px] font-bold leading-none ${
                          w.i === 0 ? 'text-[#111]' : 'text-[#6B7280]'
                        }`}
                      >
                        {w.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-[#9CA3AF]">{w.date}</span>
                    </div>
                    <span
                      className="text-[15px] font-extrabold tabular-nums leading-none"
                      style={{ color: hit ? TEXT : TEXT_DIM }}
                    >
                      {hit ? w.count : 0}
                      <span className="text-[10px] font-normal text-[#9CA3AF] ml-0.5">回</span>
                    </span>
                  </div>
                  {/* バー(行2) */}
                  <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        background: hit ? BAR_HIT : BAR_EMPTY,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 補足 */}
      <section className="px-4 pt-8">
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          A〜C のうち気に入ったやつを教えてくれたら、ダッシュボードのカードを
          その案で本実装するで。「色をもっと濃く」「数字の位置こうしたい」みたいな
          細かいリクエストもまとめて言うてな。
        </p>
      </section>
    </div>
  );
}
