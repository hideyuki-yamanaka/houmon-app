'use client';

// 案1 (詳細シートの★の隣) のレイアウト固定で、スキップアイコンだけ
// 6 パターン比較。各カードは「★ on + スキップ on」の active 状態と、
// off 状態の両方を見せる。タップで擬似的に on/off も切替可能。

import Link from 'next/link';
import { useState } from 'react';
import {
  SkipForward, EyeOff, Archive, Inbox, Pause, BookmarkMinus, Clock, MoonStar,
  Star,
  type LucideIcon,
} from 'lucide-react';

type IconSpec = {
  key: string;
  Icon: LucideIcon;
  label: string;
  nuance: string;
  activeColor: string;   // 背景
};

const ICONS: IconSpec[] = [
  { key: 'skip',     Icon: SkipForward,    label: 'SkipForward', nuance: '「⏭ スキップ」直球。意味そのまま',          activeColor: '#8E8E93' },
  { key: 'eye-off',  Icon: EyeOff,         label: 'EyeOff',      nuance: '「視界から隠す」感。マップ非表示と意味合致',  activeColor: '#5856D6' },
  { key: 'archive',  Icon: Archive,        label: 'Archive',     nuance: '「アーカイブ」感。後で復元できる安心感',     activeColor: '#FF9500' },
  { key: 'inbox',    Icon: Inbox,          label: 'Inbox',       nuance: '「保留に入れる」感。Gmail 風',              activeColor: '#34C759' },
  { key: 'pause',    Icon: Pause,          label: 'Pause',       nuance: '「一時停止」感。永続じゃない雰囲気',         activeColor: '#FF9500' },
  { key: 'bookmark', Icon: BookmarkMinus,  label: 'BookmarkMinus', nuance: '★ と対称。「ブックマーク外し」のメタ',  activeColor: '#8E8E93' },
  { key: 'clock',    Icon: Clock,          label: 'Clock',       nuance: '「後で」感。時間経ったら復活したい時に◎',   activeColor: '#5AC8FA' },
  { key: 'moon',     Icon: MoonStar,       label: 'MoonStar',    nuance: '「お休み中」感。可愛いが軽い印象',          activeColor: '#5856D6' },
];

function HeaderRow({ Icon, active, activeColor, onToggle, label }: {
  Icon: LucideIcon;
  active: boolean;
  activeColor: string;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-[#E45A5A] text-white font-bold text-[15px] flex items-center justify-center shrink-0">
        田
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-[14px] ${active ? 'text-[var(--color-subtext)] line-through' : ''}`}>
          田中 一郎
        </div>
        <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">本部A ・ 0.4km</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* ★ (常に on で見せる) */}
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 bg-[#FFCC00] border-[#FFCC00] text-white">
          <Star size={16} strokeWidth={2.2} fill="#FFFFFF" />
        </div>
        {/* スキップ候補アイコン */}
        <button
          onClick={onToggle}
          aria-label={label}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all active:scale-95"
          style={{
            background: active ? activeColor : '#FFFFFF',
            borderColor: active ? activeColor : '#E5E5EA',
            color: active ? '#FFFFFF' : '#999999',
          }}>
          <Icon size={16} strokeWidth={2.2} fill={active ? '#FFFFFF' : 'none'} />
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ICONS.map(i => [i.key, true]))  // 初期は全部 active で見せる
  );
  const toggle = (key: string) => setActiveMap(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/skip-ui-1" className="text-xs text-[var(--color-subtext)] underline">← 案1 に戻る</Link>
        <h1 className="text-xl font-bold mt-2">スキップアイコン 比較</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1 leading-relaxed">
          ★の隣に並ぶスキップアイコンの候補 8 種。タップで on/off 切替できる。
          色は active 時の塗り色も振ってあるので 合わせて見て。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4 flex flex-col gap-3 mb-12">
        {ICONS.map(spec => (
          <div key={spec.key} className="rounded-2xl border border-black/10 bg-white p-3">
            <HeaderRow
              Icon={spec.Icon}
              active={activeMap[spec.key]}
              activeColor={spec.activeColor}
              onToggle={() => toggle(spec.key)}
              label={spec.label}
            />
            <div className="mt-2.5 pt-2.5 border-t border-black/5 flex items-center gap-2 text-[11px]">
              <div className="font-mono font-bold text-[#111]">{spec.label}</div>
              <div className="text-[var(--color-subtext)]">— {spec.nuance}</div>
            </div>
          </div>
        ))}

        <div className="mt-2 text-[11px] text-[var(--color-subtext)] leading-relaxed">
          💡 タップで on/off 切替。お気に入りが決まったら教えてや。
          色も「これがいい / もうちょいトーン落として」とかフィードバックOK。
        </div>
      </div>
    </div>
  );
}
