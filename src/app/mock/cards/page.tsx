'use client';

import Link from 'next/link';
import { ChevronRight, Clock, MapPin, AlertTriangle } from 'lucide-react';
import MemberPin from '../../../components/MemberPin';
import { getMemberOrgColor } from '../../../lib/constants';

// ──────────────────────────────────────────────────────────────
// メンバーカード レイアウト 10 案 (デザイン検討用 mock ページ)
//   折り返しが起きる原因: 1行に「組織ラベル(長い)」「ヤング」「訪問日時(長い)」が
//   全部押し込まれてるため。スマホ幅ではほぼ確実に破綻。
//   → 各案で 行分割 / タグ移動 / 表示縮約 のいずれかを試す。
//
//   /mock/cards で閲覧可能 (認証不要)
// ──────────────────────────────────────────────────────────────

type Sample = {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  honbu: string;
  bu: string;
  district: string;
  district_for_color: string;
  category?: 'young' | 'general';
  visited: boolean;
  lastVisitText?: string; // 「2026年5月5日 14時(1回)」など
  visitCount?: number;
  unknownAddress?: boolean; // 直近訪問で住所不明
};

// スクショから写経した実例 5 件 + 折り返し問題が出やすい人を 1 名追加
const samples: Sample[] = [
  {
    id: '1', name: '朝日 涼太', nameKana: 'あさひりょうた', age: 25,
    honbu: '豊岡本部', bu: '豊岡中央支部', district: '歓喜地区',
    district_for_color: '歓喜地区',
    category: 'young', visited: false,
  },
  {
    id: '2', name: '伊藤 直樹', nameKana: 'いとうなおき', age: 27,
    honbu: '東旭川本部', bu: '', district: '',
    district_for_color: '',
    category: 'young', visited: true,
    lastVisitText: '2026年5月5日 14時(1回)', visitCount: 1, unknownAddress: true,
  },
  {
    id: '3', name: '加藤 寿希也', nameKana: 'かとうじゅきや', age: 26,
    honbu: '豊岡本部', bu: '豊岡部', district: '香城地区',
    district_for_color: '香城地区',
    category: 'young', visited: false,
  },
  {
    id: '4', name: '我部山 翼', nameKana: 'かべやまつばさ', age: 27,
    honbu: '旭創価本部', bu: '東川部', district: '',
    district_for_color: '',
    category: 'young', visited: false,
  },
  {
    id: '5', name: '川合 開也', nameKana: 'かわいかいや', age: 26,
    honbu: '豊岡本部', bu: '光陽部', district: '光陽地区',
    district_for_color: '光陽地区',
    category: 'young', visited: true,
    lastVisitText: '2026年5月5日 14時(1回)', visitCount: 1,
  },
  // 一般メンバー(ヤングタグ無し)も 1 件混ぜて見え方確認
  {
    id: '6', name: '渡辺 信行', nameKana: 'わたなべのぶゆき', age: 58,
    honbu: '豊岡本部', bu: '豊岡中央支部', district: '幸福地区',
    district_for_color: '幸福地区',
    category: 'general', visited: true,
    lastVisitText: '2026年3月28日 10時(3回)', visitCount: 3,
  },
];

// 表示用の組織ラベル整形 (utils.ts の formatOrgLabel と同等の簡易版)
function orgLabel(s: Sample) {
  const honbu = s.honbu || '--本部';
  const bu = s.bu || '--部';
  const district = s.district || '--地区';
  return `${honbu}・${bu}・${district}`;
}
function orgParts(s: Sample) {
  return {
    honbu: s.honbu || '--本部',
    bu: s.bu || '--部',
    district: s.district || '--地区',
    hasGap: !s.bu || !s.district,
  };
}

// 各案で使う色 (ピンと同じロジック)
function colorOf(s: Sample) {
  return getMemberOrgColor({ district: s.district_for_color, category: s.category, honbu: s.honbu });
}

// 共通: ピン
function Pin({ s }: { s: Sample }) {
  return <MemberPin member={{ district: s.district_for_color, category: s.category, honbu: s.honbu }} visited={s.visited} />;
}

// 共通: ヤングバッジ (色違いバリエーション 2 種)
const youngClasses = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';
const youngOutlineClasses = 'text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#0EA5E9] text-[#0EA5E9] leading-none whitespace-nowrap';

// 訪問日時の「年」省略版を作る
function shortVisit(text?: string) {
  if (!text) return '----';
  // 「2026年5月5日 14時(1回)」→ 「5/5 14時」
  const m = text.match(/(\d+)年(\d+)月(\d+)日(?:\s*(\d+)時)?(?:\((\d+)回\))?/);
  if (!m) return text;
  const md = `${m[2]}/${m[3]}`;
  const hh = m[4] ? ` ${m[4]}時` : '';
  return `${md}${hh}`;
}

// ──────────────────────────────────────────────────────────────
// 案 1: 名前+年齢+ヤング を 1 行目、組織を 2 行目、訪問日を 3 行目に分離
//        → 元の「1 行に詰め込み」をやめて 完全に縦分割
//        → スマホ幅でも折り返し発生せず、視線が縦に流れる
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
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">
          {orgLabel(s)}
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
// 案 2: ヤングを名前行に移動、組織+訪問日 を 1 行に。
//        訪問日は省略形 (5/5 14時) にすることで横幅を稼ぐ
// ──────────────────────────────────────────────────────────────
function Pattern2({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] truncate">
            {orgLabel(s)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-subtext)] shrink-0">
            <Clock size={12} strokeWidth={1.8} />
            {s.lastVisitText ? `${shortVisit(s.lastVisitText)}${s.visitCount ? `(${s.visitCount})` : ''}` : '--/--'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 3: ヤングをカード左の縦帯 (border-l) に変換 → タグ自体を消す
//        本体は 「名前 / 組織 / 訪問日」の 3 行
// ──────────────────────────────────────────────────────────────
function Pattern3({ s }: { s: Sample }) {
  return (
    <div className={`ios-card px-3 py-2.5 flex items-start gap-3 ${s.category === 'young' ? 'border-l-4 border-l-[#0EA5E9]' : ''}`}>
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 4: 2 カラム (左: メイン情報、右: 訪問日時を独立配置)
//        → 訪問日時を右に逃すことで本文の横幅を確保。アウトラインヤング。
// ──────────────────────────────────────────────────────────────
function Pattern4({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngOutlineClasses}>ヤング</span>}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <ChevronRight size={20} className="text-[var(--color-icon-gray)]" />
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-subtext)] whitespace-nowrap">
          <Clock size={11} strokeWidth={1.8} />
          {s.lastVisitText ? shortVisit(s.lastVisitText) : '--/--'}
        </span>
        {s.visitCount ? <span className="text-[9px] text-[var(--color-subtext)]">{s.visitCount}回</span> : null}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 5: パンくず方式 (本部 › 部 › 地区)
//        矢印区切り＋ヤングは名前横、訪問日は名前右の小さい時計のみ
// ──────────────────────────────────────────────────────────────
function Pattern5({ s }: { s: Sample }) {
  const p = orgParts(s);
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-subtext)] truncate">
          <span>{p.honbu}</span>
          <span className="text-[9px] opacity-60">›</span>
          <span>{p.bu}</span>
          <span className="text-[9px] opacity-60">›</span>
          <span>{p.district}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '未訪問'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 6: 3 つの細チップ分割 (本部 / 部 / 地区)
//        各チップが別 pill になっているので折り返しても見栄えが破綻しにくい。
//        ヤングは名前横、訪問日は別行。
// ──────────────────────────────────────────────────────────────
function Pattern6({ s }: { s: Sample }) {
  const p = orgParts(s);
  const chip = (text: string, dim?: boolean) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${dim ? 'bg-transparent border border-dashed border-[#D4D4D4] text-[var(--color-subtext)]' : 'bg-[#F0F0F0] text-[var(--color-subtext)]'}`}>{text}</span>
  );
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {chip(p.honbu, !s.honbu)}
          {chip(p.bu, !s.bu)}
          {chip(p.district, !s.district)}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 7: ミニマル (1 行目: 名前+ヤング, 2 行目: 組織のみ)
//        訪問日時はカード右上の小ドット (色＝訪問済み/未) のみ。
//        詳細はタップ後の画面で見る前提。視認性優先で情報量カット。
// ──────────────────────────────────────────────────────────────
function Pattern7({ s }: { s: Sample }) {
  const dot = s.visited ? colorOf(s) : 'transparent';
  return (
    <div className="ios-card px-3 py-3 flex items-center gap-3 relative">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="w-2 h-2 rounded-full border border-[#D4D4D4]"
          style={{ background: dot }}
          title={s.visited ? `直近: ${s.lastVisitText}` : '未訪問'}
        />
        <ChevronRight size={20} className="text-[var(--color-icon-gray)]" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 8: ヤングをピン左下のリボン状アイコンに統合
//        本文は「名前 / 組織 / 訪問日」の 3 行、タグ・チップ無し。
// ──────────────────────────────────────────────────────────────
function Pattern8({ s }: { s: Sample }) {
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <div className="relative shrink-0">
        <Pin s={s} />
        {s.category === 'young' && (
          <span className="absolute -bottom-1 -left-1 text-[8px] font-bold px-1 py-0.5 rounded bg-[#0EA5E9] text-white leading-none">Y</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-subtext)] truncate">{orgLabel(s)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 9: 「未訪問」は訪問行を表示せず、訪問済みのみ表示
//        訪問が無い時は組織行の右に「未」グレーチップだけ。
//        ヤングは名前右の小バッジ、組織は単一チップ。
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
          {s.category === 'young' && <span className={youngClasses}>ヤング</span>}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] truncate">
            {orgLabel(s)}
          </span>
          {s.lastVisitText ? (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-subtext)] shrink-0">
              <Clock size={12} strokeWidth={1.8} />
              {shortVisit(s.lastVisitText)}
              {s.visitCount ? `(${s.visitCount})` : ''}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAFAFA] text-[var(--color-subtext)] border border-[#EEEEEE] shrink-0">未訪問</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 10: 階層ごとに色付け＋空欄は「？」アイコン
//         ヤングは名前左にカテゴリチップ (アウトライン)
//         訪問日は別行、件数は丸チップ。
// ──────────────────────────────────────────────────────────────
function Pattern10({ s }: { s: Sample }) {
  const p = orgParts(s);
  return (
    <div className="ios-card px-3 py-2.5 flex items-start gap-3">
      <Pin s={s} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          {s.category === 'young' && <span className={youngOutlineClasses}>YOUNG</span>}
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[var(--color-subtext)]">({s.age})</span>
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 ml-auto" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] truncate">
          <MapPin size={11} className="text-[var(--color-subtext)] shrink-0" />
          <span className={s.honbu ? 'text-[var(--color-text)]' : 'text-[#BBBBBB]'}>{p.honbu}</span>
          <span className="text-[var(--color-subtext)]">/</span>
          <span className={s.bu ? 'text-[var(--color-text)]' : 'text-[#BBBBBB]'}>{p.bu}</span>
          <span className="text-[var(--color-subtext)]">/</span>
          <span className={s.district ? 'text-[var(--color-text)]' : 'text-[#BBBBBB]'}>{p.district}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-subtext)]">
          <span className="flex items-center gap-1">
            <Clock size={12} strokeWidth={1.8} />
            {s.lastVisitText ? s.lastVisitText.replace(/\((\d+)回\)/, '') : '----年--月--日'}
          </span>
          {s.visitCount ? (
            <span className="px-1.5 py-0.5 rounded-full bg-[#F0F0F0] text-[10px]">{s.visitCount}回</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const patterns: { num: number; title: string; desc: string; Comp: (p: { s: Sample }) => React.JSX.Element }[] = [
  { num: 1, title: '完全縦分割 3 行', desc: '名前/組織/訪問日 を 3 行に。ヤングは名前行末。折り返し原因の混雑を解消。', Comp: Pattern1 },
  { num: 2, title: '訪問日を省略形に', desc: '組織と訪問日(5/5 14時)を 1 行で並列。ヤングは名前行。', Comp: Pattern2 },
  { num: 3, title: 'ヤングを左帯に変換', desc: 'カードの左 4px ボーダーがヤング判定。タグ自体は消去。本文すっきり。', Comp: Pattern3 },
  { num: 4, title: '訪問日を右独立カラム', desc: '左に組織、右に訪問日時 (上下 stack)。本文の横幅を最大化。', Comp: Pattern4 },
  { num: 5, title: 'パンくず方式', desc: '本部 › 部 › 地区 を矢印区切り。横幅は同じだが視覚的階層がはっきりする。', Comp: Pattern5 },
  { num: 6, title: '3 チップ分割', desc: '本部/部/地区を別 pill に。flex-wrap 許容で折り返しても綺麗。空欄は破線で「未設定」を可視化。', Comp: Pattern6 },
  { num: 7, title: 'ミニマル + 訪問ドット', desc: '訪問日時を右上の色ドットだけに圧縮。情報量を最小化、リスト密度UP。', Comp: Pattern7 },
  { num: 8, title: 'ヤングをピン埋め込み', desc: 'ピン左下に「Y」リボン。本文タグを完全に消し、テキスト行に集中。', Comp: Pattern8 },
  { num: 9, title: '訪問日 or 未訪問チップ', desc: '訪問済み→省略訪問日、未訪問→「未訪問」チップ。常に同じ位置に何か出る。', Comp: Pattern9 },
  { num: 10, title: '階層ごとにグレーアウト', desc: '空欄(--)を薄色にして「埋まってない」が一目でわかる。MapPinアイコン+スラッシュ区切り。', Comp: Pattern10 },
];

export default function MockCardsPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">メンバーカード レイアウト 10 案</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            折り返し問題の解消パターン。スマホ実機幅 (375〜420px) を想定。
          </p>
          <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        {patterns.map((p) => (
          <section key={p.num} className="mb-6">
            <div className="mb-2">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">{p.desc}</p>
            </div>
            <div className="space-y-1">
              {samples.map((s) => (
                <p.Comp key={s.id} s={s} />
              ))}
              {/* 案 2 だけ住所不明 banner も再現 */}
              {p.num === 2 && (
                <div className="rounded-lg bg-[#F0F0F0] px-3 py-2 ml-9">
                  <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                    <span className="font-bold">2026年5月5日</span>
                    <span className="text-[var(--color-subtext)]">14時</span>
                    <span className="text-[var(--color-subtext)]">山中</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-[#F59E0B] text-[#B45309]">
                      <AlertTriangle size={10} /> 住所不明
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">町目以降が不明です。</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
