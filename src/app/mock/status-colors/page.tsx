'use client';

// ──────────────────────────────────────────────────────────────
// 訪問ステータス用タグの 3 カラーパターン比較ページ
// ヒデさん要望(2026-04-26): 現状 met_family の bg-emerald-50 が薄すぎて
// 視認性が悪く、色が溶けて見える。再構築の前に 3 案を並べて選ぶ。
//
// サンプル: 6 ステータスを 各案で表示
// 背景は白カード / 薄グレーカード の 2 通りでも見せる(現実の使われ方を再現)
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft, Clock } from 'lucide-react';

type StatusKey =
  | 'met_self'
  | 'met_family'
  | 'absent'
  | 'refused'
  | 'unknown_address'
  | 'moved';

const ORDER: StatusKey[] = [
  'met_self',
  'met_family',
  'absent',
  'refused',
  'unknown_address',
  'moved',
];

const LABEL: Record<StatusKey, string> = {
  met_self: '本人に会えた',
  met_family: '家族に会えた',
  absent: '不在',
  refused: '拒否',
  unknown_address: '住所不明',
  moved: '転居',
};

// ── 案 A: ピル型ベタ塗り ──
// 背景にしっかり色を入れ、文字を白抜き。コントラスト最大。一目で読める。
const A: Record<StatusKey, { bg: string; text: string }> = {
  met_self:        { bg: '#059669', text: '#FFFFFF' }, // 濃い緑
  met_family:      { bg: '#10B981', text: '#FFFFFF' }, // 緑
  absent:          { bg: '#6B7280', text: '#FFFFFF' }, // グレー
  refused:         { bg: '#EF4444', text: '#FFFFFF' }, // 赤
  unknown_address: { bg: '#F59E0B', text: '#FFFFFF' }, // アンバー
  moved:           { bg: '#8B5CF6', text: '#FFFFFF' }, // 紫
};

// ── 案 B: ソフトカラー(背景薄+文字濃)+左ドット ──
// 背景はパステル、文字は濃い同系色、左に色付きドットでカテゴリ識別。
// 白背景でも溶けない明度差を確保。
const B: Record<StatusKey, { bg: string; text: string; dot: string }> = {
  met_self:        { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  met_family:      { bg: '#A7F3D0', text: '#047857', dot: '#10B981' },
  absent:          { bg: '#E5E7EB', text: '#374151', dot: '#6B7280' },
  refused:         { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  unknown_address: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  moved:           { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
};

// ── 案 C: アウトライン型(白背景+色枠+色文字)+左ドット ──
// 背景は白基調を崩さず、ボーダーで境界、文字も濃い色。スッキリ系。
const C: Record<StatusKey, { border: string; text: string; dot: string }> = {
  met_self:        { border: '#10B981', text: '#047857', dot: '#10B981' },
  met_family:      { border: '#34D399', text: '#059669', dot: '#34D399' },
  absent:          { border: '#9CA3AF', text: '#4B5563', dot: '#6B7280' },
  refused:         { border: '#EF4444', text: '#B91C1C', dot: '#EF4444' },
  unknown_address: { border: '#F59E0B', text: '#B45309', dot: '#F59E0B' },
  moved:           { border: '#8B5CF6', text: '#6D28D9', dot: '#8B5CF6' },
};

// ── 共通: タグ本体 ──
function ChipA({ k }: { k: StatusKey }) {
  const c = A[k];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {LABEL[k]}
    </span>
  );
}
function ChipB({ k }: { k: StatusKey }) {
  const c = B[k];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {LABEL[k]}
    </span>
  );
}
function ChipC({ k }: { k: StatusKey }) {
  const c = C[k];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold bg-white"
      style={{ border: `1.5px solid ${c.border}`, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {LABEL[k]}
    </span>
  );
}

// ── 訪問ログカード風プレビュー(現実の使われ方) ──
function VisitCardPreview({ chip }: { chip: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold">2026年4月25日</span>
          {chip}
        </div>
        <p className="text-sm text-[#6B7280] mt-1.5">
          家族のお父さんが対応してくれた。元気そうで何より。
        </p>
      </div>
    </div>
  );
}

// ── ボトムシート訪問ログプレビュー ──
function BottomSheetVisitRow({ chip }: { chip: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[#F5F5F5] flex items-center gap-2">
      <span className="text-sm font-medium shrink-0">2026年4月25日</span>
      {chip}
      <span className="text-xs text-[#6B7280] truncate">短い要約のメモがここに入る</span>
    </div>
  );
}

// ── ヘッダー(タグセット 1 行) ──
function ChipRow({ render }: { render: (k: StatusKey) => React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ORDER.map(k => <span key={k}>{render(k)}</span>)}
    </div>
  );
}

export default function StatusColorsMockPage() {
  const sections: {
    title: string;
    desc: string;
    chip: (k: StatusKey) => React.ReactNode;
  }[] = [
    {
      title: 'A. ピル型ベタ塗り(白抜き文字)',
      desc:
        '背景に色しっかり、文字は白抜き。コントラスト最強でパッと識別できる。情報密度の高いリストでも埋もれない。',
      chip: k => <ChipA k={k} />,
    },
    {
      title: 'B. ソフトカラー(背景薄+文字濃)+左ドット',
      desc:
        '背景はパステル、文字は濃い同系色。左の小ドットでカテゴリ即識別。' +
        '白背景でも溶けない明度差を確保。iOS 風で日常使いに馴染む。',
      chip: k => <ChipB k={k} />,
    },
    {
      title: 'C. アウトライン型(白背景+色枠+色文字)',
      desc:
        '白基調を崩さず、ボーダーと文字色で識別。地図やカードリストの背景色と干渉しないスッキリ系。',
      chip: k => <ChipC k={k} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">ステータスタグ 3 案</h1>
        <div className="w-14" />
      </nav>

      <section className="px-4 pt-4">
        <p className="text-[13px] text-[#374151] leading-relaxed">
          訪問ログのカード等で使うステータスタグを 3 パターンで比較。
          現状 「家族に会えた」 の背景色が薄くて溶けて見える問題を解消するため、
          各案でちゃんと識別できるか並べて確認してな。
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">
          ※ 採用後は VisitCard / 訪問ログ詳細 / メンバーボトムシート / ダッシュボード等、
          関係する画面ぜんぶ反映する。
        </p>
      </section>

      <div className="px-4 pt-4 space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-[15px] font-bold mb-1">{s.title}</h2>
            <p className="text-[12px] text-[#6B7280] mb-3 leading-relaxed">{s.desc}</p>

            {/* タグ単体 (白背景) */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-2">
              <div className="text-[10px] text-[#9CA3AF] mb-1.5">単体表示(白背景)</div>
              <ChipRow render={s.chip} />
            </div>

            {/* タグ単体 (薄グレー背景) */}
            <div className="bg-[#F0F0F0] rounded-2xl border border-[#E5E7EB] p-3 mb-2">
              <div className="text-[10px] text-[#9CA3AF] mb-1.5">単体表示(薄グレー背景)</div>
              <ChipRow render={s.chip} />
            </div>

            {/* 訪問ログカード風 */}
            <div className="space-y-2 mt-3">
              <div className="text-[10px] text-[#9CA3AF] mb-1">訪問ログカード風(メンバー詳細)</div>
              {ORDER.slice(0, 3).map(k => (
                <VisitCardPreview key={k} chip={s.chip(k)} />
              ))}
            </div>

            {/* ボトムシート訪問ログ風 */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mt-3 space-y-1.5">
              <div className="text-[10px] text-[#9CA3AF] mb-1">ボトムシート訪問ログ行</div>
              {ORDER.slice(0, 4).map(k => (
                <BottomSheetVisitRow key={k} chip={s.chip(k)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="px-4 pt-8">
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          A〜C のうち気に入った案 + 個別調整(「不在の色だけグレーをもう少し濃く」など)を
          教えてくれたら本実装する。組み合わせ案 (例: ピル型ベース + ドット追加 みたいな)
          も歓迎やで。
        </p>
      </section>
    </div>
  );
}
