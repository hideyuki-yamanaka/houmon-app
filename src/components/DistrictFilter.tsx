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
  // 親組織キー（部名 or 本部名）。null なら「すべて」
  parent: string | null;
  // 地区キー（leaf）。parent 未選択時は使わない。
  leaf: string | null;
}

interface Props {
  selection: FilterSelection;
  onChange: (sel: FilterSelection) => void;
  members?: MemberLike[];
}

// メンバーが指定 parent / leaf に該当するか
export function matchFilter(m: MemberLike, sel: FilterSelection): boolean {
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

  const totalCount = members?.length ?? null;

  const selectedParent = selection.parent ? findParentOrg(selection.parent) : null;
  const selectedCategory: MemberCategory | null = selectedParent
    ? (ORG_HIERARCHY.find(c => c.parents.some(p => p.key === selection.parent))?.category ?? null)
    : null;

  return (
    <div className="flex flex-col gap-1">
      {/* ── 親行：カテゴリーごとに区切って表示 ── */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 items-center">
        <button
          onClick={() => onChange({ parent: null, leaf: null })}
          className={`chip whitespace-nowrap ${selection.parent === null ? 'selected' : ''}`}
        >
          すべて{totalCount !== null ? `(${totalCount})` : ''}
        </button>

        {ORG_HIERARCHY.map((cat, idx) => (
          <div key={cat.category} className="flex items-center gap-1.5">
            {/* カテゴリー境界：薄い縦線＋ラベル */}
            <div className="flex items-center gap-1 pl-0.5">
              <div className="w-px h-5 bg-[#E0E0E0]" aria-hidden />
              <span className="text-[10px] font-semibold text-[var(--color-subtext)] shrink-0">
                {cat.label}
              </span>
            </div>
            {cat.parents.map(parent => {
              const count = parentCounts.get(parent.key) ?? 0;
              const isSelected = selection.parent === parent.key;
              const isYoung = cat.category === 'young';
              return (
                <button
                  key={parent.key}
                  onClick={() => {
                    // 同じ親を押したら解除
                    if (isSelected && !selection.leaf) {
                      onChange({ parent: null, leaf: null });
                    } else {
                      onChange({ parent: parent.key, leaf: null });
                    }
                  }}
                  className={`chip whitespace-nowrap ${isSelected ? 'selected' : ''}`}
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
            {/* カテゴリー間の補助空白 */}
            {idx < ORG_HIERARCHY.length - 1 && <div className="w-0.5 shrink-0" />}
          </div>
        ))}
      </div>

      {/* ── 子行：親が選択されてる時だけ出る ── */}
      {selectedParent && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 items-center animate-slide-down">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">
            {selectedCategory === 'young' ? '地区:' : '地区:'}
          </span>
          <button
            onClick={() => onChange({ parent: selectedParent.key, leaf: null })}
            className={`chip chip-sm whitespace-nowrap ${selection.leaf === null ? 'selected' : ''}`}
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
                onClick={() => onChange({ parent: selectedParent.key, leaf: leaf.key })}
                className={`chip chip-sm whitespace-nowrap ${isSelected ? 'selected' : ''}`}
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
