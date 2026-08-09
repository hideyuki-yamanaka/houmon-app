import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, fmt = 'M/d') {
  return format(parseISO(dateStr), fmt, { locale: ja });
}

export function formatDateFull(dateStr: string) {
  return format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja });
}

export function daysSince(dateStr: string): number {
  return differenceInDays(new Date(), parseISO(dateStr));
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ──────────────────────────────────────────────────────────────
// 訪問ログのメモを「ひと続きの平文」として取り出す。
// 旧 summary(plain text) と 新 notes(TipTap JSON) の両方に対応:
//   1) summary に値があれば優先(古いログ向け)
//   2) なければ notes の TipTap JSON を再帰でテキスト抽出
//   3) どちらも空なら ''
// メモ 2 行省略表示(line-clamp-2)などプレビュー用途に使う。
// ──────────────────────────────────────────────────────────────
function tiptapToPlain(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { text?: unknown; content?: unknown };
  if (typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) {
    return n.content.map(tiptapToPlain).filter(Boolean).join('\n');
  }
  return '';
}

export function extractMemoText(visit: { summary?: string; notes?: Record<string, unknown> | unknown }): string {
  if (visit.summary && visit.summary.trim()) return visit.summary;
  if (visit.notes) return tiptapToPlain(visit.notes).trim();
  return '';
}

// 印刷用 — notes (Tiptap 全文) を優先して取り出す。
// extractMemoText は preview 用途で summary を優先するが、印刷物では本文を
// 全部出したい (ヒデさん指示 2026-05-10)。 summary は legacy fallback。
export function extractFullMemoText(visit: { summary?: string; notes?: Record<string, unknown> | unknown }): string {
  if (visit.notes) {
    const t = tiptapToPlain(visit.notes).trim();
    if (t) return t;
  }
  return visit.summary?.trim() || '';
}

// ──────────────────────────────────────────────────────────────
// 住所から建物名を除いた部分を返す（Googleマップの位置ずれ対策）
//   - 半角/全角スペース以降はすべて建物名とみなして除去
//   - スペースが無くても、末尾に「N丁目N-N」「N番地N」「N号」等の
//     番地表記が来たらそこで区切って以降を除去
//   - 表示はあくまで建物名込みのフル住所を使う（呼び出し側の責務）
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// 年齢計算
//   - 生年月日を正として毎年自動で加齢させる（保存済みの age より優先）
//   - 生年月日が未入力のときだけ、保存済みの age を使う（fallback）
//   - どちらも無ければ null
// 生年月日は "1989/7/28" "1989-07-28" どちらも受ける
// ──────────────────────────────────────────────────────────────
export function calcAgeFromBirthday(birthday: string | undefined | null): number | null {
  if (!birthday) return null;
  const parts = birthday.replace(/\//g, '-').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

/** 生年月日ベースの年齢を最優先、無ければ保存済み age、さらに無ければ null */
export function resolveAge(m: { birthday?: string | null; age?: number | null }): number | null {
  const fromBirth = calcAgeFromBirthday(m.birthday ?? undefined);
  if (fromBirth != null) return fromBirth;
  if (typeof m.age === 'number' && m.age >= 0) return m.age;
  return null;
}

export function stripBuildingName(address: string): string {
  const trimmed = address.trim();
  // 1) スペース区切りがあればそこで切る
  const bySpace = trimmed.split(/[\s　]+/)[0];
  if (bySpace && bySpace !== trimmed) return bySpace;
  // 2) スペース無し: 番地パターンの末尾で切る
  //    例) 豊岡2条3丁目12-34パレス豊岡401号 → 豊岡2条3丁目12-34
  const patterns: RegExp[] = [
    /^(.*?\d+丁目\d+(?:[-–−ー]\d+)*)/,
    /^(.*?\d+番地?(?:\d+号?)?)/,
    /^(.*?\d+条\d+丁目)/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m && m[1] && m[1].length < trimmed.length) return m[1];
  }
  return trimmed;
}

// ──────────────────────────────────────────────────────────────
// 組織情報 (本部 / 部・支部 / 地区) を一行ラベルに整形
//
// ヒデさん指示 (2026-05-05 更新):
//   3階層を必ず 3 つ表示する。空なら "--本部 / --部 / --地区" の
//   placeholder を入れて、どの項目が埋まってないか一目でわかるように。
//   値が推測 (xxxInferred=true) のときは値の中に「(仮)」を挿入する。
//   例「英雄(仮)地区」「豊岡(仮)部」「豊岡(仮)本部」。
//
// 例:
//   honbu=豊岡本部, bu=豊岡部, district=英雄地区 (全部確定)
//      → "豊岡本部・豊岡部・英雄地区"
//   honbu=東栄本部, bu=null, district=null
//      → "東栄本部・--部・--地区"
//   honbu=豊岡本部, bu=豊岡部, district=英雄地区 (district が推測)
//      → "豊岡本部・豊岡部・英雄(仮)地区"
//   全部 null/空                              → "--本部・--部・--地区"
//
// 旧仕様で値そのものが「仮」「不明」だったケースは括弧付きで表示 (互換)。
// ──────────────────────────────────────────────────────────────
const ORG_PLACEHOLDERS: Record<string, string> = {
  '仮': '(仮)',
  '不明': '(不明)',
};

const ORG_SUFFIX = { honbu: '本部', bu: '部', district: '地区' } as const;
const ORG_EMPTY = { honbu: '??本部', bu: '??部', district: '??地区' } as const;

type OrgKind = keyof typeof ORG_SUFFIX;

/** 値+推測フラグから 1 部品の表示文字列を作る。
 *  - 空 → "--本部" 等の placeholder
 *  - 値そのものが「仮」「不明」 → "(仮)" "(不明)"
 *  - 推測フラグ true → 値の語尾 (本部/部/支部/地区) の手前に "(仮)" を挿入
 *    例: "英雄地区" + inferred=true → "英雄(仮)地区"
 *    例: "豊岡中央支部" + inferred=true → "豊岡中央(仮)支部"
 *    例: 語尾が見つからなければ末尾に "(仮)" を付加 → "XX(仮)" */
function orgPart(kind: OrgKind, value: string | null | undefined, inferred: boolean): string {
  if (!value || !value.trim()) return ORG_EMPTY[kind];
  const t = value.trim();
  const placeholder = ORG_PLACEHOLDERS[t];
  if (placeholder) return placeholder;
  if (!inferred) return t;
  // 推測フラグ true → 語尾の手前に「(仮)」を挿入
  // 「部」より「支部」を優先 (長い接尾辞を先にチェック)
  const SUFFIXES = kind === 'bu' ? ['支部', '部'] : [ORG_SUFFIX[kind]];
  for (const s of SUFFIXES) {
    if (t.endsWith(s) && t.length > s.length) {
      return t.slice(0, -s.length) + '(仮)' + s;
    }
  }
  return t + '(仮)';
}

/**
 * 「住所不明」タグの判定 (2026-08-09 ヒデさん指示)。
 *
 * 住所テキストが空、または 地図に置く座標が無い人は マップにピンが出ないので
 * そのままだと 一覧の中で埋もれて 行方不明になる。該当者にはメンバーカードで
 * 「住所不明」タグを出し、一覧シートのヘッダーから その人達だけに絞り込める
 * ようにしている。住所が分かった時点で メンバーカードから追記すれば消える。
 */
export function hasUnknownAddress(
  m: { address?: string | null; lat?: number | null; lng?: number | null },
): boolean {
  if (!m.address || !m.address.trim()) return true;
  return m.lat == null || m.lng == null;
}

export function formatOrgLabel(
  m: {
    honbu?: string | null;
    bu?: string | null;
    district?: string | null;
    honbuInferred?: boolean;
    buInferred?: boolean;
    districtInferred?: boolean;
  },
): string {
  return [
    orgPart('honbu', m.honbu, m.honbuInferred ?? false),
    orgPart('bu', m.bu, m.buInferred ?? false),
    orgPart('district', m.district, m.districtInferred ?? false),
  ].join('・');
}

/** 短縮版エイリアス: ヒデさん指示 (2026-05-05) で「本部・部・地区を必ず ・ 区切りで
 *  3つとも見せて」となったので フル版と同じ出力に統一。呼び出し側互換のため
 *  関数自体は残す。 */
export function formatOrgLabelShort(
  m: {
    honbu?: string | null;
    bu?: string | null;
    district?: string | null;
    honbuInferred?: boolean;
    buInferred?: boolean;
    districtInferred?: boolean;
  },
): string {
  return formatOrgLabel(m);
}
