'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Member } from '../lib/types';

interface Props {
  members: Member[];
  onSelect: (member: Member) => void;
}

export default function MemberSelector({ members, onSelect }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.trim().toLowerCase();
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.district.toLowerCase().includes(q) ||
      (m.nameKana && m.nameKana.toLowerCase().includes(q))
    );
  }, [members, query]);

  // 地区ごとにグループ化
  const grouped = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of filtered) {
      const d = m.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '');
      const list = map.get(d) ?? [];
      list.push(m);
      map.set(d, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ナビバー */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-base font-bold truncate flex-1 text-center">メンバーを選択</h1>
        <div className="w-14" />
      </nav>

      {/* 検索 */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-icon-gray)]" />
          <input
            type="text"
            placeholder="名前・地区で検索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-[40px] rounded-[10px] pl-9 pr-3 text-sm bg-white outline-none focus:ring-1 focus:ring-[#999]"
          />
        </div>
      </div>

      {/* メンバーリスト */}
      <div className="flex-1 overflow-y-auto pb-24 -mt-px">
        {grouped.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)] text-center mt-8">該当するメンバーがいません</p>
        ) : (
          grouped.map(([district, members]) => (
            <div key={district}>
              <div className="py-1.5 px-4 bg-[var(--color-bg)] sticky top-0">
                <span className="text-xs font-semibold text-[var(--color-subtext)]">{district}</span>
              </div>
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m)}
                  className="w-full text-left ios-list-item"
                >
                  <span className="text-sm font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
