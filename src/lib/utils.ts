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
