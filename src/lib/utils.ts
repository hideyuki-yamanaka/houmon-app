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
// ヒデさん指示 (2026-05-05):
//   3階層のうち入ってる項目だけを「・」区切りで連結。値が「仮」「不明」
//   なら住所と紛れないように 括弧付き「(仮)」「(不明)」で表示。
//
// 例:
//   honbu=豊岡本部, bu=豊岡部, district=英雄地区 → "豊岡本部・豊岡部・英雄地区"
//   honbu=東栄本部, bu=null, district=null      → "東栄本部"
//   honbu=豊岡本部, bu=豊岡部, district=仮       → "豊岡本部・豊岡部・(仮)"
//   全部 null/空                              → "(不明)"
// ──────────────────────────────────────────────────────────────
const ORG_PLACEHOLDERS: Record<string, string> = {
  '仮': '(仮)',
  '不明': '(不明)',
};
function orgPart(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  return ORG_PLACEHOLDERS[t] ?? t;
}
export function formatOrgLabel(
  m: { honbu?: string | null; bu?: string | null; district?: string | null },
): string {
  const parts = [orgPart(m.honbu), orgPart(m.bu), orgPart(m.district)].filter((x): x is string => x != null);
  if (parts.length === 0) return '(不明)';
  return parts.join('・');
}

/** 短縮版: 「本部」を省く (ピンの吹き出しなど 横スペース無いとき向け)。
 *  例: "豊岡本部・豊岡部・英雄地区" の "豊岡本部・" を抜いて "豊岡部・英雄地区"。
 *      "東栄本部" のように本部だけしか無いケースはそのまま返す。 */
export function formatOrgLabelShort(
  m: { honbu?: string | null; bu?: string | null; district?: string | null },
): string {
  const bu = orgPart(m.bu);
  const district = orgPart(m.district);
  const parts = [bu, district].filter((x): x is string => x != null);
  if (parts.length > 0) return parts.join('・');
  return formatOrgLabel(m);
}
