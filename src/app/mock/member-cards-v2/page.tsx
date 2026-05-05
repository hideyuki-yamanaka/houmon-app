'use client';

import Link from 'next/link';
import { ChevronRight, Clock, MapPin, Building2, Calendar } from 'lucide-react';
import MemberPin from '../../../components/MemberPin';

// ──────────────────────────────────────────────────────────────
// メンバーカード v2 (住所追加 × 10 案)
//
// 要件:
//   - 住所行を追加 (長文 / 部屋番号付きケース耐性)
//   - 組織 / ヤング / 訪問日 / 住所 全部入っても破綻しない
//   - 上品でコンパクトな構成、拡張性高い
//
// 確認: /mock/member-cards-v2
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
    category: 'young', visited: false,
    address: '旭川市豊岡5条7丁目1-10',
  },
  {
    id: '2', name: '伊藤 直樹', nameKana: 'いとうなおき', age: 27,
    honbu: '東旭川本部', bu: '', district: '', district_for_color: '',
    category: 'young', visited: true,
    lastVisitText: '2026年5月5日 14時(1回)', visitCount: 1,
    address: '旭川市東光6条8丁目',
  },
  {
    id: '3', name: '加藤 寿希也', nameKana: 'かとうじゅきや', age: 26,
    honbu: '豊岡本部', bu: '豊岡部', district: '香城地区', district_for_color: '香城地区',
    category: 'young', visited: false,
    address: '旭川市豊岡14条6丁目',
  },
  {
    id: '4', name: '我部山 翼', nameKana: 'かべやまつばさ', age: 27,
    honbu: '旭創価本部', bu: '東川部', district: '', district_for_color: '',
    category: 'young', visited: false,
    address: '東川町西町9丁目',
  },
  {
    id: '5', name: '三浦 史也', nameKana: 'みうらふみや', age: 31,
    honbu: '豊岡本部', bu: '豊岡部', district: '英雄地区', district_for_color: '英雄地区',
    category: 'general', visited: true,
    lastVisitText: '2026年4月25日 15時(3回)', visitCount: 3,
    address: '旭川市豊岡14条5丁目タウンズ9001-102', // 長い住所
  },
  {
    id: '6', name: '塚本 拓実', nameKana: 'つかもとたくみ', age: 29,
    honbu: '豊岡本部', bu: '光陽部', district: '光輝地区', district_for_color: '光輝地区',
    category: 'general', visited: true,
    lastVisitText: '2026年4月28日 11時(2回)', visitCount: 2,
    address: '旭川市豊岡2条4丁目3-8第5豊岡マンション2F3号', // さらに長い
  },
];

function orgLabel(s: Sample) {
  return [s.honbu || '??本部', s.bu || '??部', s.district || '??地区'].join('・');
}
function shortVisit(text?: string) {
  if (!text) return '----';
  const m = text.match(/(\d+)年(\d+)月(\d+)日(?:\s*(\d+)時)?(?:\((\d+)回\))?/);
  if (!m) return text;
  return `${m[2]}/${m[3]}${m[4] ? ` ${m[4]}時` : ''}`;
}
function Pin({ s }: { s: Sample }) {
  return <MemberPin member={{ district: s.district_for_color, category: s.category, honbu: s.honbu }} visited={s.visited} />;
}

const youngBadge = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';
const youngOutline = 'text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#0EA5E9] text-[#0EA5E9] leading-none whitespace-nowrap';

// ──────────────────────────────────────────────────────────────
// 案 1: 4 行スタック (現状の延長 + 住所行追加)
//   - 一番安全で実装コスト低い。
//   - 住所は MapPin アイコン付きで他の行と差別化
// ──────────────────────────────────────────────────────────────
function Pattern1({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] inline-block max-w-full truncate">
            {orgLabel(s)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-subtext)] truncate">
          <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
          <span className="truncate">{s.address || '住所未設定'}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 2: 2 段カード (上ブロック: アイデンティティ、下ブロック: 訪問+住所)
//   - 細い区切り線で 2 段に分割。上は名前ベースの顔情報、下は活動メタ。
//   - 高級感あり。下段は左に訪問日、右に住所
// ──────────────────────────────────────────────────────────────
function Pattern2({ s }: { s: Sample }) {
  return (
    <div className="ios-card overflow-hidden">
      <div className="px-3 pt-2.5 pb-2 flex items-start gap-3">
        <Pin s={s} />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">{s.name}</span>
            <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
            {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
            <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        </div>
      </div>
      <div className="border-t border-[#F0F0F0] px-3 py-1.5 flex items-center gap-2 text-[11px] text-[var(--color-subtext)] bg-[#FAFAFA]">
        <span className="flex items-center gap-1 shrink-0">
          <Clock size={11} strokeWidth={1.8} />
          {shortVisit(s.lastVisitText) || '未訪問'}
        </span>
        <span className="text-[#D4D4D4]">|</span>
        <span className="flex items-center gap-1 min-w-0 flex-1">
          <MapPin size={11} strokeWidth={1.8} className="shrink-0" />
          <span className="truncate">{s.address || '住所未設定'}</span>
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 3: 左カラム広め (ピン下に組織色アクセント) + 右に整列
//   - ピン下に組織色のミニバー → 視認性 UP、装飾性高い
//   - 右側は名前 / 組織 / 住所 / 訪問
// ──────────────────────────────────────────────────────────────
function Pattern3({ s }: { s: Sample }) {
  const orgHex = (s.district_for_color && s.honbu) ? '#2563EB' : '#9AA0A6'; // 簡易置換
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0 gap-1">
        <Pin s={s} />
        <span className="block w-7 h-0.5 rounded-full" style={{ background: orgHex, opacity: 0.7 }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngOutline}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
          <MapPin size={12} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address || '住所未設定'}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-subtext)]">
          <Clock size={11} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 4: 訪問日を右上独立、住所を最下段 (メイン)
//   - 訪問日時を右にスッと逃がして、左本文に集中
//   - 住所が一番目立つレイアウト
// ──────────────────────────────────────────────────────────────
function Pattern4({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5">
      <div className="flex items-start gap-3">
        <Pin s={s} />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[15px]">{s.name}</span>
            <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
            {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <ChevronRight size={20} className="text-[var(--color-icon-gray)]" />
          {s.lastVisitText && (
            <span className="text-[10px] text-[var(--color-subtext)] tabular-nums whitespace-nowrap">
              {shortVisit(s.lastVisitText)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1.5 ml-9 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
        <MapPin size={12} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
        <span className="truncate">{s.address || '住所未設定'}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 5: 上下区切り + 左帯にステータス色 (高級感)
//   - 左 3px の縦帯にメンバーカテゴリ色 (ヤング: シアン, 一般: グレー)
//   - 内側に名前/組織 + 細いセパレータ + 住所/訪問
// ──────────────────────────────────────────────────────────────
function Pattern5({ s }: { s: Sample }) {
  const stripe = s.category === 'young' ? '#0EA5E9' : '#D4D4D8';
  return (
    <div className="ios-card overflow-hidden flex">
      <span className="w-[3px] shrink-0" style={{ background: stripe }} />
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-start gap-3">
          <Pin s={s} />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px]">{s.name}</span>
              <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
              <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
          </div>
        </div>
        <div className="mt-1.5 ml-9 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-subtext)]">
          <span className="flex items-center gap-1"><MapPin size={11} strokeWidth={1.8} /></span>
          <span className="truncate">{s.address || '住所未設定'}</span>
          <span className="flex items-center gap-1"><Clock size={11} strokeWidth={1.8} /></span>
          <span className="truncate">{s.lastVisitText ?? '----年--月--日'}</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 6: アイコン整列メタ (3 列メタ行: 組織・住所・訪問)
//   - 組織もチップ廃止、シンプルなアイコン + テキスト で統一感
//   - すべて MapPin / Building / Clock の小アイコンで揃える
// ──────────────────────────────────────────────────────────────
function Pattern6({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1.5 grid grid-cols-[14px_1fr] gap-x-1.5 gap-y-1 text-[11px] text-[var(--color-subtext)]">
          <Building2 size={12} className="mt-0.5" />
          <span className="truncate">{orgLabel(s)}</span>
          <MapPin size={12} className="mt-0.5" />
          <span className="truncate">{s.address || '住所未設定'}</span>
          <Clock size={12} className="mt-0.5" />
          <span className="truncate">{s.lastVisitText ?? '----年--月--日'}</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 7: ヘッダー帯 (組織色のうっすらグラデーション)
//   - カード上部に組織色の細い帯 (グラデ). 視覚的に所属がわかる
//   - 住所と訪問は下半分のフラット領域
// ──────────────────────────────────────────────────────────────
function Pattern7({ s }: { s: Sample }) {
  const hex = s.district_for_color ? '#2563EB' : '#9AA0A6';
  return (
    <div className="ios-card overflow-hidden">
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${hex} 0%, ${hex}33 100%)` }}
      />
      <div className="px-3 py-2.5 flex items-start gap-3">
        <Pin s={s} />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">{s.name}</span>
            <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
            {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
            <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
            <MapPin size={12} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
            <span className="truncate">{s.address || '住所未設定'}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-subtext)]">
            <Clock size={11} strokeWidth={1.8} />
            {s.lastVisitText ?? '未訪問'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 8: 「住所が主役」 — 名前下に住所、組織は折り畳み風小チップ
//   - 訪問の頻度が高い運用なら、住所が一番役立つ → 視覚優先順位を住所トップ
//   - ヤング+年齢は名前右
// ──────────────────────────────────────────────────────────────
function Pattern8({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-text)] font-medium truncate">
          <MapPin size={13} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
          <span className="truncate">{s.address || '住所未設定'}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--color-subtext)]">
          <span className="px-1.5 py-0.5 rounded bg-[#F0F0F0] truncate max-w-[180px]">{orgLabel(s)}</span>
          <span className="flex items-center gap-1">
            <Clock size={11} strokeWidth={1.8} />
            {shortVisit(s.lastVisitText) || '未訪問'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 9: 右下に訪問バッジ (Pillスタイル)、住所は中段メイン
//   - 訪問日時を 角丸 pill に。視覚的にラベル感が出る
//   - 未訪問はグレー pill 「未訪問」
// ──────────────────────────────────────────────────────────────
function Pattern9({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate min-w-0">
            <MapPin size={12} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
            <span className="truncate">{s.address || '住所未設定'}</span>
          </div>
          {s.lastVisitText ? (
            <span className="shrink-0 text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center gap-1">
              <Clock size={10} strokeWidth={2} />
              {shortVisit(s.lastVisitText)}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAFA] text-[var(--color-subtext)] border border-[#EEEEEE]">
              未訪問
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 10: タイムライン風 (左に大きな日付セル、右に本体)
//   - 左カラムに直近訪問日 (年/月/日) を縦に表示。コラム的でリッチ
//   - 未訪問は左カラムが「—」だけ (高さは保持)
// ──────────────────────────────────────────────────────────────
function Pattern10({ s }: { s: Sample }) {
  const dateMatch = s.lastVisitText?.match(/(\d+)年(\d+)月(\d+)日/);
  return (
    <div className="ios-card px-3 py-2.5 flex items-stretch gap-3">
      <div className="shrink-0 w-12 flex flex-col items-center justify-center text-center border-r border-[#F0F0F0] pr-2.5">
        {dateMatch ? (
          <>
            <span className="text-[9px] text-[var(--color-subtext)] tabular-nums leading-none">{dateMatch[1]}</span>
            <span className="text-[15px] font-black tabular-nums leading-none mt-0.5">{dateMatch[2]}/{dateMatch[3]}</span>
            <span className="text-[9px] text-[var(--color-subtext)] mt-0.5">{s.visitCount}回</span>
          </>
        ) : (
          <span className="text-[14px] text-[var(--color-subtext)]">—</span>
        )}
      </div>
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Pin s={s} />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">{s.name}</span>
            <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
            {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
            <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-text)] truncate">
            <MapPin size={12} strokeWidth={1.8} className="shrink-0 text-[var(--color-subtext)]" />
            <span className="truncate">{s.address || '住所未設定'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const patterns: { num: number; title: string; desc: string; Comp: (p: { s: Sample }) => React.JSX.Element }[] = [
  { num: 1, title: '4 行スタック (現状の延長)', desc: '名前+ヤング / 組織 / 住所 / 訪問日 を 4 行に。最も実装が薄く安全。', Comp: Pattern1 },
  { num: 2, title: '2 段カード (上: 顔情報, 下: メタ)', desc: '細い区切り線で 2 段化。下段は薄背景で「補足情報」感を出す。', Comp: Pattern2 },
  { num: 3, title: 'ピン下に組織色アクセント', desc: 'ピンの下に組織色のミニバー。装飾的で帰属が一目でわかる。', Comp: Pattern3 },
  { num: 4, title: '訪問日を右独立 + 住所主役', desc: '訪問日時を右に逃がし、住所を最下段にメイン配置。', Comp: Pattern4 },
  { num: 5, title: '左カラー帯 + 整列グリッド', desc: 'カード左 3px の帯でメンバー区分。下段はラベル/値の grid 配置で美しく整列。', Comp: Pattern5 },
  { num: 6, title: 'アイコン整列メタ (3 行)', desc: 'Building/MapPin/Clock の icon を 14px グリッドで揃え、シンプルで均整。', Comp: Pattern6 },
  { num: 7, title: 'ヘッダー帯 (組織色グラデ)', desc: 'カード上部に組織色のグラデ帯。一目で所属が伝わるリッチ表現。', Comp: Pattern7 },
  { num: 8, title: '住所が主役 (組織小チップ)', desc: '住所をフォント太く目立たせ、組織と訪問日は副次的に圧縮。訪問運用向け。', Comp: Pattern8 },
  { num: 9, title: '訪問 pill バッジ + 住所メイン', desc: '訪問日を緑 pill にしてラベル化、住所と並列配置。状態の差が伝わりやすい。', Comp: Pattern9 },
  { num: 10, title: 'タイムライン風 (左セルに日付)', desc: '左カラムに直近訪問日 (M/D + 回数) を立てて、訪問履歴感を演出。', Comp: Pattern10 },
];

export default function MockMemberCardsV2Page() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">メンバーカード v2 (住所追加 × 10 案)</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            住所を追加した上で、コンパクトかつ拡張性のある構成。長文住所 (マンション + 部屋番号) でも破綻しないことを確認。
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
