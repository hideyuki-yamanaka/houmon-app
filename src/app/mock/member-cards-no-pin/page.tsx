'use client';

import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import { getMemberOrgColor, findOrgLeaf } from '../../../lib/constants';

// ──────────────────────────────────────────────────────────────
// メンバーカード ピンなし × 色分け 10 案 (訪問ログ付き)
//   - ピンアイコン廃止、色帯/背景/バッジ等で区別
//   - 訪問済みメンバーは下に訪問ログカルーセル相当の塊
//   - 住所必須、長文耐性
// ──────────────────────────────────────────────────────────────

type VisitLog = {
  date: string; // 「2026年5月5日 14時」
  statusLabel: string; // 「本人に会えた」等
  statusBorder: string;
  statusText: string;
  author?: string; // 山中、堀内など
  memo?: string;
  total?: number; // 訪問総数 (右上 1/N)
  index?: number;
};

type Sample = {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  honbu: string; bu: string; district: string;
  district_for_color: string;
  category?: 'young' | 'general';
  visited: boolean;
  visits?: VisitLog[];
  address?: string;
};

const samples: Sample[] = [
  {
    id: '1', name: '朝日 涼太', nameKana: 'あさひりょうた', age: 25,
    honbu: '豊岡本部', bu: '豊岡中央支部', district: '歓喜地区', district_for_color: '歓喜地区',
    category: 'young', visited: false, address: '旭川市豊岡5条7丁目1-10',
  },
  {
    id: '2', name: '伊藤 直樹', nameKana: 'いとうなおき', age: 27,
    honbu: '東旭川本部', bu: '', district: '', district_for_color: '',
    category: 'young', visited: true, address: '旭川市東光6条8丁目',
    visits: [{
      date: '2026年5月5日 14時', statusLabel: '住所不明',
      statusBorder: '#F59E0B', statusText: '#B45309',
      author: '山中', memo: '町目以降が不明です。', index: 1, total: 1,
    }],
  },
  {
    id: '3', name: '加藤 寿希也', nameKana: 'かとうじゅきや', age: 26,
    honbu: '豊岡本部', bu: '豊岡部', district: '香城地区', district_for_color: '香城地区',
    category: 'young', visited: false, address: '旭川市豊岡14条6丁目',
  },
  {
    id: '4', name: '我部山 翼', nameKana: 'かべやまつばさ', age: 27,
    honbu: '旭創価本部', bu: '東川部', district: '', district_for_color: '',
    category: 'young', visited: false, address: '東川町西町9丁目',
  },
  {
    id: '5', name: '三浦 史也', nameKana: 'みうらふみや', age: 31,
    honbu: '豊岡本部', bu: '豊岡部', district: '英雄地区', district_for_color: '英雄地区',
    category: 'general', visited: true, address: '旭川市豊岡14条5丁目タウンズ9001-102',
    visits: [
      { date: '2026年4月25日 15時', statusLabel: '本人に会えた', statusBorder: '#10B981', statusText: '#047857', author: '山中', memo: 'お元気そうでした。次回は教学について少し話したいです。', index: 1, total: 3 },
      { date: '2026年4月10日 11時', statusLabel: '家族に会えた', statusBorder: '#10B981', statusText: '#047857', author: '堀内', memo: '奥様が出てきてくれました。', index: 2, total: 3 },
      { date: '2026年3月20日 14時', statusLabel: '不在', statusBorder: '#9CA3AF', statusText: '#4B5563', author: '山中', index: 3, total: 3 },
    ],
  },
  {
    id: '6', name: '塚本 拓実', nameKana: 'つかもとたくみ', age: 29,
    honbu: '豊岡本部', bu: '光陽部', district: '光輝地区', district_for_color: '光輝地区',
    category: 'general', visited: true, address: '旭川市豊岡2条4丁目3-8第5豊岡マンション2F3号',
    visits: [
      { date: '2026年4月28日 11時', statusLabel: '不在', statusBorder: '#9CA3AF', statusText: '#4B5563', author: '山中', memo: 'インターホン応答なし。', index: 1, total: 2 },
      { date: '2026年4月3日 13時', statusLabel: '本人に会えた', statusBorder: '#10B981', statusText: '#047857', author: '山中', index: 2, total: 2 },
    ],
  },
];

function orgLabel(s: Sample) {
  return [s.honbu || '??本部', s.bu || '??部', s.district || '??地区'].join('・');
}
function colorOf(s: Sample) {
  return getMemberOrgColor({ district: s.district_for_color, category: s.category, honbu: s.honbu });
}
function shortDistrict(s: Sample) {
  if (!s.district) return s.honbu?.replace(/本部$/, '') || '??';
  const leaf = findOrgLeaf(s.district);
  return leaf?.short ?? s.district.replace(/地区$/, '');
}

const youngBadge = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';

// ──────────────────────────────────────────────────────────────
// 共通: ヘッダー部 (組織色を accentColor で指定)
// ──────────────────────────────────────────────────────────────
function Head({ s, accentColor }: { s: Sample; accentColor?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-[15px]">{s.name}</span>
        <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
        {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
      </div>
      <div className="mt-0.5">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] inline-block max-w-full truncate"
          style={accentColor ? { color: accentColor, background: `${accentColor}1A` } : undefined}
        >
          {orgLabel(s)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)] truncate">
        <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
        <span className="truncate">{s.address}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 共通: 訪問ログカルーセル (mock 簡易版)
//   - 実 VisitsCarousel の見た目を踏襲: グレー角丸 + 1段目: 日付/著者/ステータス + 右端 1/N
//   - 1件目だけ表示 + 「他 +N 件」 (noScroll 相当)
// ──────────────────────────────────────────────────────────────
function VisitLog({ s }: { s: Sample }) {
  if (!s.visited || !s.visits || s.visits.length === 0) return null;
  const v = s.visits[0];
  const remaining = (v.total ?? 1) - 1;
  return (
    <div className="bg-[#F2F2F4] rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-bold tabular-nums shrink-0">
            {v.date.replace(/\s\d+時/, '')}
            <span className="ml-1 text-[var(--color-subtext)] font-normal">{v.date.match(/\d+時/)?.[0]}</span>
          </span>
          {v.author && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E5E7EB] text-[#374151] flex items-center gap-1 shrink-0">
              <span className="w-3 h-3 rounded-full bg-[#9CA3AF]" /> {v.author}
            </span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0"
            style={{ borderColor: v.statusBorder, color: v.statusText }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.statusBorder }} />
            {v.statusLabel}
          </span>
        </div>
        {remaining > 0 && (
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 leading-none">
            他 +{remaining} 件
          </span>
        )}
      </div>
      {v.memo && (
        <p className="text-[11px] text-[var(--color-subtext)] line-clamp-2 leading-snug">{v.memo}</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 各案: ピンなしレイアウト (head + log を 1 つのカードに納める)
// ──────────────────────────────────────────────────────────────

// 案 1: 左 3px 細帯
function Pattern1({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden flex">
      <span className="w-[3px] shrink-0 self-stretch" style={{ background: c }} />
      <div className="flex-1 min-w-0">
        <div className="px-3 py-2.5"><Head s={s} /></div>
        {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
      </div>
    </div>
  );
}

// 案 2: 左 8px 太帯
function Pattern2({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden flex">
      <span className="w-2 shrink-0 self-stretch" style={{ background: c }} />
      <div className="flex-1 min-w-0">
        <div className="px-3 py-2.5"><Head s={s} /></div>
        {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
      </div>
    </div>
  );
}

// 案 3: 上端 2px 横ストライプ
function Pattern3({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div className="h-[2px]" style={{ background: c }} />
      <div className="px-3 py-2.5"><Head s={s} /></div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 4: 上端グラデ帯 (6px)
function Pattern4({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${c} 0%, ${c} 30%, ${c}55 100%)` }} />
      <div className="px-3 py-2.5"><Head s={s} /></div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 5: 左に大きなカラードット (12px)
function Pattern5({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <span className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ background: c }} />
        <Head s={s} />
      </div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 6: 名前下に色付き下線 (2px)
function Pattern6({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div className="px-3 py-2.5">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]" style={{ borderBottom: `2px solid ${c}`, paddingBottom: 1 }}>
            {s.name}
          </span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 text-[10px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)] truncate">
          <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
          <span className="truncate">{s.address}</span>
        </div>
      </div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 7: 背景全体 薄塗り (8%)
function Pattern7({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="rounded-xl border border-black/5 overflow-hidden" style={{ background: `${c}14` }}>
      <div className="px-3 py-2.5"><Head s={s} accentColor={c} /></div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 8: 左から右グラデ背景 (装飾)
function Pattern8({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden relative">
      <div
        className="absolute top-0 left-0 right-0 h-full pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${c}1F 0%, transparent 50%)` }}
      />
      <div className="relative">
        <div className="px-3 py-2.5"><Head s={s} /></div>
        {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
      </div>
    </div>
  );
}

// 案 9: 短縮地区名バッジ (40x40)
function Pattern9({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[11px] leading-tight text-center px-1"
          style={{ background: c }}
        >
          {shortDistrict(s)}
        </div>
        <Head s={s} />
      </div>
      {s.visited && <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>}
    </div>
  );
}

// 案 10: 訪問済=塗り、未訪問=破線
function Pattern10({ s }: { s: Sample }) {
  const c = colorOf(s);
  if (s.visited) {
    return (
      <div className="rounded-xl overflow-hidden border border-black/5" style={{ background: `${c}14` }}>
        <div className="border-l-4" style={{ borderLeftColor: c }}>
          <div className="px-3 py-2.5"><Head s={s} accentColor={c} /></div>
          <div className="mx-3 mt-0.5 mb-1.5"><VisitLog s={s} /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="ios-card overflow-hidden flex">
      <span className="w-1 shrink-0 self-stretch border-l-2 border-dashed" style={{ borderColor: c }} />
      <div className="flex-1 px-3 py-2.5"><Head s={s} /></div>
    </div>
  );
}

const patterns: { num: number; title: string; desc: string; Comp: (p: { s: Sample }) => React.JSX.Element }[] = [
  { num: 1, title: '左 3px 細帯', desc: '極シンプル。控えめだが帰属色がちゃんと伝わる。', Comp: Pattern1 },
  { num: 2, title: '左 8px 太帯', desc: '識別性 UP。リスト全体で組織の分布が一目でわかる。', Comp: Pattern2 },
  { num: 3, title: '上端 2px 横ストライプ', desc: '上端のシンプルな線。控えめで上品。', Comp: Pattern3 },
  { num: 4, title: '上端グラデ帯 (6px)', desc: '左濃→右薄のグラデで奥行き。ヘッダー的なリッチさ。', Comp: Pattern4 },
  { num: 5, title: '左に大きなカラードット (12px)', desc: '点だけで色を伝達。最もミニマル。', Comp: Pattern5 },
  { num: 6, title: '名前下に色下線 (2px)', desc: '装飾を名前に集中。タイポ重視で品が良い。', Comp: Pattern6 },
  { num: 7, title: '背景全体 薄塗り (8%)', desc: 'カード全体が組織色になじむ。穏やか + 識別性両立。', Comp: Pattern7 },
  { num: 8, title: '左から右グラデ背景', desc: '左から薄く広がる組織色グラデ。装飾感。', Comp: Pattern8 },
  { num: 9, title: '短縮地区名バッジ (40x40)', desc: 'ピンの代わりに地区名バッジ。情報量も担保。', Comp: Pattern9 },
  { num: 10, title: '訪問済=塗り、未訪問=破線', desc: '状態 × 色。訪問済はカード全体薄塗り、未訪問は破線左帯。', Comp: Pattern10 },
];

export default function MockMemberCardsNoPinPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">メンバーカード ピンなし × 色分け 10 案</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            ピンアイコン廃止。色帯・背景・バッジ等で組織区別。訪問ログカルーセル付き。
          </p>
          <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>
        {patterns.map(p => (
          <section key={p.num} className="mb-6">
            <div className="mb-2">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">{p.desc}</p>
            </div>
            <div className="space-y-1">
              {samples.map(s => <p.Comp key={s.id} s={s} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
