'use client';

import { useMemo } from 'react';
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

  const totalCount = members?.length ?? null;

  const selectedParent = selection.parent ? findParentOrg(selection.parent) : null;
  const selectedCategory: MemberCategory | null = selectedParent
    ? (ORG_HIERARCHY.find(c => c.parents.some(p => p.key === selection.parent))?.category ?? null)
    : null;

  return (
    <div className="flex flex-col gap-1">
      {/* ── 親行：カテゴリーごとに区切って表示 ── */}
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-0.5 items-center px-1">
        <button
          onClick={() => onChange(EMPTY_FILTER)}
          className={`chip whitespace-nowrap shrink-0 ${selection.category === null && selection.parent === null ? 'selected' : ''}`}
        >
          すべて{totalCount !== null ? `(${totalCount})` : ''}
        </button>

        {ORG_HIERARCHY.map((cat, idx) => {
          const isYoung = cat.category === 'young';
          const catAllSelected = selection.category === cat.category && selection.parent === null;
          const catCount = categoryCounts.get(cat.category) ?? 0;
          return (
            <div key={cat.category} className="flex items-center gap-1.5 md:gap-2 shrink-0 pl-3 md:pl-5">
              {/* カテゴリー境界：薄い縦線＋ラベル */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-px h-5 bg-[#E0E0E0] shrink-0" aria-hidden />
                <span className="text-[10px] font-semibold text-[var(--color-subtext)] shrink-0 whitespace-nowrap">
                  {cat.label}
                </span>
              </div>
              {/* カテゴリー全体「すべて」チップ */}
              <button
                onClick={() => {
                  if (catAllSelected) {
                    onChange(EMPTY_FILTER);
                  } else {
                    onChange({ category: cat.category, parent: null, leaf: null });
                  }
                }}
                className={`chip whitespace-nowrap shrink-0 ${catAllSelected ? 'selected' : ''}`}
                style={catAllSelected
                  ? { backgroundColor: '#222', borderColor: '#222', color: '#fff' }
                  : isYoung
                  ? { borderColor: '#CBD5E1' }
                  : undefined}
              >
                すべて({catCount})
              </button>
              {cat.parents.map(parent => {
                const count = parentCounts.get(parent.key) ?? 0;
                const isSelected = selection.parent === parent.key;
                return (
                  <button
                    key={parent.key}
                    onClick={() => {
                      // 同じ親を押したら解除
                      if (isSelected && !selection.leaf) {
                        onChange(EMPTY_FILTER);
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
              })}
              {idx < ORG_HIERARCHY.length - 1 && <div className="w-0.5 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ── 子行：親が選択されてる時だけ出る ── */}
      {selectedParent && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 items-center animate-slide-down px-1">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">
            {selectedCategory === 'young' ? '地区:' : '地区:'}
          </span>
          <button
            onClick={() => onChange({ category: selectedCategory, parent: selectedParent.key, leaf: null })}
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
                onClick={() => onChange({ category: selectedCategory, parent: selectedParent.key, leaf: leaf.key })}
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
