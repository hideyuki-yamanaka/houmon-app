'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ORG_HIERARCHY, getParentOrgKey, findParentOrg } from '../lib/constants';
import type { MemberCategory } from '../lib/types';

interface MemberLike {
  district: string;
  category?: MemberCategory;
  honbu?: string;
}

export interface FilterSelection {
  // カテゴリー（'general' | 'young'）。null なら全カテゴリー対象
  // parent が指定されてる時はそれが属するカテゴリーが暗黙的に決まる。
  category: MemberCategory | null;
  // 親組織キー（部名 or 本部名）。null なら親未選択（カテゴリーすべて or 全すべて）
  parent: string | null;
  // 地区キー（leaf）。parent 未選択時は使わない。
  leaf: string | null;
}

export const EMPTY_FILTER: FilterSelection = { category: null, parent: null, leaf: null };

interface Props {
  selection: FilterSelection;
  onChange: (sel: FilterSelection) => void;
  members?: MemberLike[];
}

// メンバーが指定 selection に該当するか
export function matchFilter(m: MemberLike, sel: FilterSelection): boolean {
  if (sel.category && (m.category ?? 'general') !== sel.category) return false;
  if (!sel.parent) return true;
  const p = getParentOrgKey(m);
  if (p !== sel.parent) return false;
  if (!sel.leaf) return true;
  return m.district === sel.leaf;
}

type SegKey = 'all' | 'young' | 'general';

export default function DistrictFilter({ selection, onChange, members }: Props) {
  // 親ごとの人数を数える
  const parentCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!members) return map;
    for (const m of members) {
      const p = getParentOrgKey(m);
      if (p) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  }, [members]);

  const leafCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!members) return map;
    for (const m of members) map.set(m.district, (map.get(m.district) ?? 0) + 1);
    return map;
  }, [members]);

  // カテゴリーごとの人数（男子部すべて／ヤングすべて 用）
  const categoryCounts = useMemo(() => {
    const map = new Map<MemberCategory, number>();
    if (!members) return map;
    for (const m of members) {
      const c: MemberCategory = m.category ?? 'general';
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [members]);

  const totalCount = members?.length ?? 0;
  const youngCount = categoryCounts.get('young') ?? 0;
  const generalCount = categoryCounts.get('general') ?? 0;

  const selectedParent = selection.parent ? findParentOrg(selection.parent) : null;
  // 親選択中なら親の所属カテゴリ。それ以外は selection.category。
  const selectedParentCategory: MemberCategory | null = selectedParent
    ? (ORG_HIERARCHY.find(c => c.parents.some(p => p.key === selection.parent))?.category ?? null)
    : null;
  const effectiveCategory: MemberCategory | null = selection.category ?? selectedParentCategory;

  const seg: SegKey = effectiveCategory === 'young' ? 'young' : effectiveCategory === 'general' ? 'general' : 'all';

  // 表示する親リスト（segに応じて絞る）
  const visibleCategories = useMemo(() => {
    if (seg === 'all') return ORG_HIERARCHY;
    return ORG_HIERARCHY.filter(c => c.category === seg);
  }, [seg]);

  const segments: { key: SegKey; label: string; count: number }[] = [
    { key: 'all',     label: 'すべて',  count: totalCount },
    { key: 'young',   label: 'ヤング',  count: youngCount },
    { key: 'general', label: '男子部',  count: generalCount },
  ];

  // アコーディオン開閉:
  //   seg !== 'all' なら自動で開く（ヤング/男子部 選択中は親チップを見せる）
  //   chevron で手動オーバーライド可能。セグメント切り替え時は manual をリセット
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const autoOpen = seg !== 'all';
  const open = manualOpen ?? autoOpen;

  const handleSegment = (key: SegKey) => {
    setManualOpen(null); // 自動展開ロジックに戻す
    if (key === 'all') {
      onChange(EMPTY_FILTER);
    } else {
      onChange({ category: key, parent: null, leaf: null });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* iOS風セグメンテッドコントロール: すべて/ヤング/男子部 + chevron */}
      <div className="flex items-center gap-1.5">
        <div className="bg-[#EEEEEF] rounded-xl p-1 flex gap-1 flex-1 min-w-0">
          {segments.map(s => {
            const active = seg === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleSegment(s.key)}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                  active
                    ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] text-[#111]'
                    : 'text-[#666] active:bg-[#E5E5E7]'
                }`}
              >
                {s.label}({s.count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setManualOpen(!open)}
          aria-label={open ? '詳細フィルターを閉じる' : '詳細フィルターを開く'}
          aria-expanded={open}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#EEEEEF] active:bg-[#E5E5E7]"
        >
          <ChevronDown
            size={18}
            className={`text-[#666] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* ── 親行: 選択中カテゴリーの親のみ表示（アコーディオン） ── */}
      {open && (
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 items-center px-1 animate-slide-down">
        {visibleCategories.map(cat =>
          cat.parents.map(parent => {
            const count = parentCounts.get(parent.key) ?? 0;
            const isSelected = selection.parent === parent.key;
            const isYoung = cat.category === 'young';
            return (
              <button
                key={parent.key}
                onClick={() => {
                  if (isSelected && !selection.leaf) {
                    // 同じ親をもう一度押したら親選択を解除（カテゴリは保持）
                    onChange({ category: cat.category, parent: null, leaf: null });
                  } else {
                    onChange({ category: cat.category, parent: parent.key, leaf: null });
                  }
                }}
                className={`chip whitespace-nowrap shrink-0 ${isSelected ? 'selected' : ''}`}
                style={isSelected
                  ? { backgroundColor: parent.hex, borderColor: parent.hex, color: '#fff' }
                  : isYoung
                  ? { borderColor: '#CBD5E1' }
                  : undefined}
                title={parent.key}
              >
                {parent.short}({count})
              </button>
            );
          })
        )}
      </div>
      )}

      {/* ── 子行：親が選択されてる時だけ出る ── */}
      {selectedParent && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 items-center animate-slide-down px-1">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">地区:</span>
          <button
            onClick={() => onChange({ category: selectedParentCategory, parent: selectedParent.key, leaf: null })}
            className={`chip chip-sm whitespace-nowrap shrink-0 ${selection.leaf === null ? 'selected' : ''}`}
            style={selection.leaf === null
              ? { backgroundColor: selectedParent.hex, borderColor: selectedParent.hex, color: '#fff' }
              : undefined}
          >
            {selectedParent.short}すべて
          </button>
          {selectedParent.children.map(leaf => {
            const count = leafCounts.get(leaf.key) ?? 0;
            const isSelected = selection.leaf === leaf.key;
            return (
              <button
                key={leaf.key}
                onClick={() => onChange({ category: selectedParentCategory, parent: selectedParent.key, leaf: leaf.key })}
                className={`chip chip-sm whitespace-nowrap shrink-0 ${isSelected ? 'selected' : ''}`}
                style={isSelected
                  ? { backgroundColor: leaf.hex, borderColor: leaf.hex, color: '#fff' }
                  : undefined}
                title={leaf.key}
              >
                {leaf.short}({count})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
