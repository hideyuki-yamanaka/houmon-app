'use client';

import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import MemberPin from '../../../components/MemberPin';
import { getMemberOrgColor } from '../../../lib/constants';

// ──────────────────────────────────────────────────────────────
// メンバーカード ボールド版 10 案
//   - ピン廃止 / 巨大化 / 別物に置き換え 等、大胆なレイアウト変更
//   - 住所必須、長文 (マンション+部屋番号) でも破綻しないこと
//   - 上品さ + 拡張性
// ──────────────────────────────────────────────────────────────

type Sample = {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  honbu: string; bu: string; district: string;
  district_for_color: string;
  category?: 'young' | 'general';
  visited: boolean;
  lastVisitText?: string;
  visitCount?: number;
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
    category: 'young', visited: true, visitCount: 1,
    lastVisitText: '2026年5月5日 14時(1回)', address: '旭川市東光6条8丁目',
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
    category: 'general', visited: true, visitCount: 3,
    lastVisitText: '2026年4月25日 15時(3回)',
    address: '旭川市豊岡14条5丁目タウンズ9001-102',
  },
  {
    id: '6', name: '塚本 拓実', nameKana: 'つかもとたくみ', age: 29,
    honbu: '豊岡本部', bu: '光陽部', district: '光輝地区', district_for_color: '光輝地区',
    category: 'general', visited: true, visitCount: 2,
    lastVisitText: '2026年4月28日 11時(2回)',
    address: '旭川市豊岡2条4丁目3-8第5豊岡マンション2F3号',
  },
];

function orgLabel(s: Sample) {
  return [s.honbu || '??本部', s.bu || '??部', s.district || '??地区'].join('・');
}
function shortVisit(text?: string) {
  if (!text) return null;
  const m = text.match(/(\d+)年(\d+)月(\d+)日(?:\s*(\d+)時)?/);
  if (!m) return text;
  return `${m[2]}/${m[3]}${m[4] ? ` ${m[4]}時` : ''}`;
}
function colorOf(s: Sample) {
  return getMemberOrgColor({ district: s.district_for_color, category: s.category, honbu: s.honbu });
}
function initial(name: string) {
  // 「朝日 涼太」 → 「朝」
  return name.replace(/\s+/g, '').charAt(0);
}

const youngBadge = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';

// ──────────────────────────────────────────────────────────────
// 案 1: 巨大ピン (左 64x88 を占有)
//   - ピン自体を大きくして 視認性を最大化、ヒーロー化
//   - 右側に名前・組織・住所・訪問日 をコンパクトに
// ──────────────────────────────────────────────────────────────
function Pattern1({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-center gap-3">
      <div className="shrink-0">
        <MemberPin
          member={{ district: s.district_for_color, category: s.category, honbu: s.honbu }}
          visited={s.visited}
          width={56}
          height={80}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[16px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] truncate">
          <MapPin size={12} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] flex items-center gap-1">
          <Clock size={10} />{shortVisit(s.lastVisitText) ?? '未訪問'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 2: ピン廃止・名前頭文字アバター (組織色背景)
//   - 円アバターに名前の頭文字。組織色で背景塗り
//   - 訪問済みは右下にチェックバッジ
// ──────────────────────────────────────────────────────────────
function Pattern2({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <div className="relative shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[20px]"
          style={{ background: c }}
        >
          {initial(s.name)}
        </div>
        {s.visited && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border-2 border-white">
            <span className="block w-full h-full rounded-full bg-[#10B981]" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] truncate">
          <MapPin size={11} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{shortVisit(s.lastVisitText) ?? '未訪問'}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 3: 組織色フル背景塗り (薄)
//   - カード全体を組織色 8% で塗りつぶし、ピン廃止
//   - 左に組織色の縦帯 (4px)、右に普通のテキスト
// ──────────────────────────────────────────────────────────────
function Pattern3({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div
      className="rounded-xl border border-black/5 overflow-hidden flex"
      style={{ background: `${c}10` }}
    >
      <span className="w-1.5 shrink-0" style={{ background: c }} />
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[16px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] font-medium" style={{ color: c }}>{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
          <MapPin size={12} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] mt-0.5 flex items-center gap-1">
          <Clock size={11} />{shortVisit(s.lastVisitText) ?? '未訪問'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 4: 訪問回数を巨大数字でヒーロー化 (左カラム)
//   - 左カラム = 訪問回数大 (24px black) + 訪問日小
//   - 名前と住所は右に。ピン廃止 (組織色は左カラム背景に)
// ──────────────────────────────────────────────────────────────
function Pattern4({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden flex items-stretch">
      <div
        className="shrink-0 w-16 flex flex-col items-center justify-center px-2 text-white"
        style={{ background: c }}
      >
        <span className="text-[28px] font-black tabular-nums leading-none">{s.visitCount ?? 0}</span>
        <span className="text-[9px] mt-0.5 opacity-90">回 訪問</span>
        {s.lastVisitText && (
          <span className="text-[9px] tabular-nums mt-1 opacity-80">{shortVisit(s.lastVisitText)}</span>
        )}
      </div>
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] truncate">
          <MapPin size={12} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 5: 住所ヒーロー (住所が一番大きい)
//   - 住所を 16px で主役に、名前は 13px サブ表示
//   - ピンは廃止、代わりに 左に大きな MapPin アイコン (組織色)
// ──────────────────────────────────────────────────────────────
function Pattern5({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${c}1A` }}>
        <MapPin size={22} strokeWidth={2} style={{ color: c }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold text-[#111] truncate">{s.address}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-subtext)] truncate">
          <span className="font-semibold text-[12px] text-[#111]">{s.name}</span>
          <span>({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-[var(--color-subtext)]">
          <span className="truncate">{orgLabel(s)}</span>
          <span className="shrink-0 flex items-center gap-1"><Clock size={10} />{shortVisit(s.lastVisitText) ?? '未訪問'}</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 self-center" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 6: ライン+ドット (装飾削減・タイポグラフィ重視)
//   - ピン廃止、左に小さな組織色ドット (8px) のみ
//   - 名前を大きく、雑誌風レイアウト
// ──────────────────────────────────────────────────────────────
function Pattern6({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card px-4 py-3 relative">
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: c }} />
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-[17px]">{s.name}</span>
        <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
        {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
      </div>
      <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
      <div className="mt-1.5 text-[12px] text-[var(--color-text)] truncate">{s.address}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--color-subtext)]">
        <span className="truncate">{orgLabel(s)}</span>
        <span className="shrink-0">{shortVisit(s.lastVisitText) ?? '未訪問'}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 7: 横帯ピン一体型 (ピンを横長の組織色帯に統合)
//   - 左から右に伸びる組織色の帯 (高さ 8px) がピンの代わり
//   - 訪問済みは帯がフィル、未訪問はストライプ
// ──────────────────────────────────────────────────────────────
function Pattern7({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="ios-card overflow-hidden">
      <div
        className="h-2"
        style={{
          background: s.visited
            ? c
            : `repeating-linear-gradient(45deg, ${c}, ${c} 4px, ${c}33 4px, ${c}33 8px)`,
        }}
      />
      <div className="px-3 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="mt-1 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
          <MapPin size={11} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-subtext)]">
          <Clock size={10} />{shortVisit(s.lastVisitText) ?? '未訪問'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 8: 円アバター + ステータスリング (ドーナツチャート風)
//   - 円アバターの周りを訪問済率や訪問回数のリングで囲む
//   - 訪問済 → 完全リング、未訪問 → 空リング
// ──────────────────────────────────────────────────────────────
function Pattern8({ s }: { s: Sample }) {
  const c = colorOf(s);
  const ringPercent = s.visited ? Math.min(100, (s.visitCount ?? 1) * 33) : 0;
  const r = 22, sw = 3;
  const cir = 2 * Math.PI * r;
  const dash = (ringPercent / 100) * cir;
  return (
    <div className="ios-card px-3 py-2.5 flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: 50, height: 50 }}>
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90 absolute inset-0">
          <circle cx="25" cy="25" r={r} fill="none" stroke="#E5E5E5" strokeWidth={sw} />
          <circle
            cx="25" cy="25" r={r} fill="none"
            stroke={c} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={`${dash} ${cir}`}
          />
        </svg>
        <div
          className="absolute inset-1 rounded-full flex items-center justify-center text-white font-bold text-[16px]"
          style={{ background: c }}
        >
          {initial(s.name)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] truncate">
          <MapPin size={11} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">
          {shortVisit(s.lastVisitText) ?? '未訪問'} {s.visitCount ? `・ ${s.visitCount}回` : ''}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 9: ハーフカード (上半分 組織色塗り、下半分 白)
//   - 上ブロック: 組織色背景 + 白文字で 名前+年齢+ヤング
//   - 下ブロック: 白背景 + 住所・訪問日
// ──────────────────────────────────────────────────────────────
function Pattern9({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="rounded-xl overflow-hidden border border-black/5">
      <div className="px-3 py-2.5 text-white" style={{ background: c }}>
        <span className="text-[10px] opacity-80 block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[16px]">{s.name}</span>
          <span className="text-[11px] opacity-80">({s.age})</span>
          {s.category === 'young' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white leading-none">ヤング</span>
          )}
          <ChevronRight size={20} className="text-white/70 shrink-0 ml-auto" />
        </div>
        <div className="text-[10px] opacity-90 truncate mt-0.5">{orgLabel(s)}</div>
      </div>
      <div className="bg-white px-3 py-2 flex items-center gap-2 text-[11px] text-[var(--color-subtext)]">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate flex-1">{s.address}</span>
        <span className="shrink-0 flex items-center gap-1 border-l border-[#EEE] pl-2">
          <Clock size={11} />{shortVisit(s.lastVisitText) ?? '未訪問'}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 10: テーブル行 (1 行 36px、密度最大)
//   - Notion/Airtable 風、密度最大化
//   - ドット + 名前 + 住所 + 訪問日 を 1 行で見渡せる
// ──────────────────────────────────────────────────────────────
function Pattern10({ s }: { s: Sample }) {
  const c = colorOf(s);
  return (
    <div className="border-b border-[#F0F0F0] active:bg-[#F7F7F8] flex items-center gap-2 px-2 h-10 text-[12px]">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
      <span className="font-semibold shrink-0 max-w-[6em] truncate">{s.name}</span>
      <span className="text-[10px] text-[var(--color-subtext)] shrink-0">({s.age})</span>
      {s.category === 'young' && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#0EA5E9] text-white leading-none shrink-0">Y</span>}
      <span className="flex-1 truncate text-[var(--color-subtext)]">{s.address}</span>
      <span className="text-[10px] text-[var(--color-subtext)] tabular-nums shrink-0">{shortVisit(s.lastVisitText) ?? '—'}</span>
      <ChevronRight size={14} className="text-[var(--color-icon-gray)] shrink-0" />
    </div>
  );
}

const patterns: { num: number; title: string; desc: string; Comp: (p: { s: Sample }) => React.JSX.Element; bare?: boolean }[] = [
  { num: 1, title: '巨大ピン (左 56x80)', desc: 'ピンをヒーロー化。視認性最大、所属が一目瞭然。', Comp: Pattern1 },
  { num: 2, title: 'イニシャルアバター (ピン廃止)', desc: '名前頭文字を組織色背景の円に。訪問済は緑チェックドット。', Comp: Pattern2 },
  { num: 3, title: '組織色フル背景塗り', desc: 'カード全体を組織色 (8%) で塗る。ピン廃止、左 1.5px 帯のみ。', Comp: Pattern3 },
  { num: 4, title: '訪問回数を巨大数字でヒーロー', desc: '左に組織色塗りカラム + 28px の回数表示。アクション履歴が主役。', Comp: Pattern4 },
  { num: 5, title: '住所ヒーロー (15px 太字)', desc: '住所を主役に。名前は副情報。営業者は地図見ながら開く前提。', Comp: Pattern5 },
  { num: 6, title: 'タイポグラフィ重視 (装飾削減)', desc: 'ピン廃止、左 1px 組織色ライン + 名前 17px。雑誌風。', Comp: Pattern6 },
  { num: 7, title: '横帯ピン (色帯の幅 8px)', desc: 'ピンを横長の帯に統合。訪問済=塗り、未訪問=ストライプ。', Comp: Pattern7 },
  { num: 8, title: 'アバター + ステータスリング', desc: '円アバター周囲のリングで訪問回数を視覚化 (1回=33%)。', Comp: Pattern8 },
  { num: 9, title: 'ハーフカード (上塗り+下白)', desc: '上半分が組織色背景に白文字。リッチ + 識別性高い。', Comp: Pattern9 },
  { num: 10, title: 'テーブル行 (h36 密度最大)', desc: 'Notion/Airtable 風 1 行表示。長いリストを一気に見渡せる。', Comp: Pattern10, bare: true },
];

export default function MockMemberCardsBoldPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">メンバーカード ボールド版 10 案</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            ピン廃止・巨大化・別物置換 等、大胆なレイアウト。住所必須、長文耐性確認。
          </p>
          <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>
        {patterns.map(p => (
          <section key={p.num} className="mb-6">
            <div className="mb-2">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">{p.desc}</p>
            </div>
            <div className={p.bare ? 'bg-white rounded-xl overflow-hidden' : 'space-y-1'}>
              {samples.map(s => <p.Comp key={s.id} s={s} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
