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
// 住所から建物名を除いた部分を返す（Googleマップの位置ずれ対策）
//   - 半角/全角スペース以降はすべて建物名とみなして除去
//   - スペースが無くても、末尾に「N丁目N-N」「N番地N」「N号」等の
//     番地表記が来たらそこで区切って以降を除去
//   - 表示はあくまで建物名込みのフル住所を使う（呼び出し側の責務）
// ──────────────────────────────────────────────────────────────
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
