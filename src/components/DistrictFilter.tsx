'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ORG_TREE } from '../lib/constants';
import type { MemberCategory } from '../lib/types';

// ──────────────────────────────────────────────────────────────
// 3 階層フィルター (本部 → 部 → 地区)
//   2026-05-05 phase C で 2 階層 (parent → leaf) から 3 階層に変更。
//   - 1 段目: 本部 chips (常に表示)
//   - 2 段目: 部 chips (本部選択中のみ)
//   - 3 段目: 地区 chips (部選択中、かつ district が定義されている bu のみ)
//   カテゴリー (ヤング/男子部) はセグメンテッドコントロールで別軸に保持。
// ──────────────────────────────────────────────────────────────

interface MemberLike {
  district: string;
  category?: MemberCategory;
  honbu?: string;
  bu?: string;
}

/** 「未設定の人だけ抽出」を表すセンチネル値。
 *  例: bu=NONE_SENTINEL → honbu 内で部 が空のメンバーのみマッチ */
export const NONE_SENTINEL = '__NONE__';

export interface FilterSelection {
  /** カテゴリー ('general' | 'young')。null なら両方対象 */
  category: MemberCategory | null;
  /** 本部キー。null なら全本部、NONE_SENTINEL なら本部未設定の人のみ */
  honbu: string | null;
  /** 部キー。null なら全部、NONE_SENTINEL なら部未設定の人のみ。honbu 未選択時は無視 */
  bu: string | null;
  /** 地区キー。null なら全地区、NONE_SENTINEL なら地区未設定の人のみ。bu 未選択時は無視 */
  district: string | null;
}

export const EMPTY_FILTER: FilterSelection = { category: null, honbu: null, bu: null, district: null };

/** 旧 FilterSelection (parent/leaf) を 新形式 (honbu/bu/district) に移行 */
export function migrateFilter(raw: unknown): FilterSelection {
  if (!raw || typeof raw !== 'object') return EMPTY_FILTER;
  const r = raw as Record<string, unknown>;
  // 既に新形式
  if ('honbu' in r || 'bu' in r || 'district' in r) {
    return {
      category: (r.category as MemberCategory | null) ?? null,
      honbu: (r.honbu as string | null) ?? null,
      bu: (r.bu as string | null) ?? null,
      district: (r.district as string | null) ?? null,
    };
  }
  // 旧形式 (parent/leaf) → なるべく対応する位置に振り分け
  const category = (r.category as MemberCategory | null) ?? null;
  const parent = (r.parent as string | null) ?? null;
  const leaf = (r.leaf as string | null) ?? null;
  if (!parent) return { category, honbu: null, bu: null, district: null };
  // parent が本部名なら honbu として、そうでなければ bu として扱う
  const honbuMatch = ORG_TREE.find(h => h.key === parent);
  if (honbuMatch) return { category, honbu: parent, bu: null, district: leaf };
  // bu の場合は所属本部を逆引き
  for (const honbu of ORG_TREE) {
    if (honbu.bus.find(b => b.key === parent)) {
      return { category, honbu: honbu.key, bu: parent, district: leaf };
    }
  }
  return { category, honbu: null, bu: null, district: null };
}

interface Props {
  selection: FilterSelection;
  onChange: (sel: FilterSelection) => void;
  members?: MemberLike[];
  alwaysOpen?: boolean;
}

// メンバーが指定 selection に該当するか
export function matchFilter(m: MemberLike, sel: FilterSelection): boolean {
  if (sel.category && (m.category ?? 'general') !== sel.category) return false;
  const h = (m.honbu ?? '').trim();
  const b = (m.bu ?? '').trim();
  const d = (m.district ?? '').trim();
  if (sel.honbu) {
    if (sel.honbu === NONE_SENTINEL ? h !== '' : h !== sel.honbu) return false;
  }
  if (sel.bu) {
    if (sel.bu === NONE_SENTINEL ? b !== '' : b !== sel.bu) return false;
  }
  if (sel.district) {
    if (sel.district === NONE_SENTINEL ? d !== '' : d !== sel.district) return false;
  }
  return true;
}

type SegKey = 'all' | 'young' | 'general';

export default function DistrictFilter({ selection, onChange, members, alwaysOpen = false }: Props) {
  // 各階層ごとのカウント (現在のカテゴリー絞り込み下で計算)
  // honbuNone/buNone/distNone は「その階層が空欄のメンバー数」(--本部/--部/--地区 chip 用)
  const counts = useMemo(() => {
    const honbuC = new Map<string, number>();
    const buC = new Map<string, number>();
    const distC = new Map<string, number>();
    const cat = new Map<MemberCategory, number>();
    let honbuNone = 0;
    const buNoneByHonbu = new Map<string, number>();
    const distNoneByBu = new Map<string, number>();
    for (const m of members ?? []) {
      const c: MemberCategory = m.category ?? 'general';
      cat.set(c, (cat.get(c) ?? 0) + 1);
      if (selection.category && c !== selection.category) continue;
      const h = (m.honbu ?? '').trim();
      const b = (m.bu ?? '').trim();
      const d = (m.district ?? '').trim();
      if (h) honbuC.set(h, (honbuC.get(h) ?? 0) + 1);
      else honbuNone++;
      if (h) {
        if (b) buC.set(`${h}|${b}`, (buC.get(`${h}|${b}`) ?? 0) + 1);
        else buNoneByHonbu.set(h, (buNoneByHonbu.get(h) ?? 0) + 1);
      }
      if (b) {
        if (d) distC.set(`${b}|${d}`, (distC.get(`${b}|${d}`) ?? 0) + 1);
        else distNoneByBu.set(b, (distNoneByBu.get(b) ?? 0) + 1);
      }
    }
    return { honbuC, buC, distC, cat, honbuNone, buNoneByHonbu, distNoneByBu };
  }, [members, selection.category]);

  const totalCount = members?.length ?? 0;
  const youngCount = counts.cat.get('young') ?? 0;
  const generalCount = counts.cat.get('general') ?? 0;

  const seg: SegKey = selection.category === 'young' ? 'young' : selection.category === 'general' ? 'general' : 'all';
  const segments: { key: SegKey; label: string; count: number }[] = [
    { key: 'all',     label: 'すべて',  count: totalCount },
    { key: 'young',   label: 'ヤング',  count: youngCount },
    { key: 'general', label: '男子部',  count: generalCount },
  ];

  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const autoOpen = !!selection.honbu || seg !== 'all';
  const open = alwaysOpen ? true : (manualOpen ?? autoOpen);

  const handleSegment = (key: SegKey) => {
    setManualOpen(null);
    if (key === 'all') {
      onChange(EMPTY_FILTER);
    } else {
      onChange({ category: key, honbu: null, bu: null, district: null });
    }
  };

  // selectedHonbu は honbu が NONE_SENTINEL の時は null (実体ナシ)
  const selectedHonbu = selection.honbu && selection.honbu !== NONE_SENTINEL
    ? ORG_TREE.find(h => h.key === selection.honbu) ?? null
    : null;
  const selectedBu = selectedHonbu && selection.bu && selection.bu !== NONE_SENTINEL
    ? selectedHonbu.bus.find(b => b.key === selection.bu) ?? null
    : null;
  // --地区 placeholder の色 (グレー系)
  const NONE_HEX = '#9CA3AF';

  return (
    <div className="flex flex-col gap-1.5">
      {/* iOS風セグメンテッドコントロール */}
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
        {!alwaysOpen && (
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
        )}
      </div>

      {/* ── 1段目: 本部 ── */}
      {open && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 items-center px-1 animate-slide-down">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">本部:</span>
          {ORG_TREE.map(honbu => {
            const c = counts.honbuC.get(honbu.key) ?? 0;
            const isSelected = selection.honbu === honbu.key;
            return (
              <button
                key={honbu.key}
                onClick={() => {
                  if (isSelected && !selection.bu) {
                    onChange({ category: selection.category, honbu: null, bu: null, district: null });
                  } else {
                    onChange({ category: selection.category, honbu: honbu.key, bu: null, district: null });
                  }
                }}
                className={`chip whitespace-nowrap shrink-0 ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { backgroundColor: honbu.hex, borderColor: honbu.hex, color: '#fff' } : undefined}
                title={honbu.key}
              >
                {honbu.short}本部({c})
              </button>
            );
          })}
          {/* --本部: 本部未設定の人だけ抽出 */}
          {(() => {
            const isSel = selection.honbu === NONE_SENTINEL;
            return (
              <button
                onClick={() => onChange({
                  category: selection.category,
                  honbu: isSel ? null : NONE_SENTINEL,
                  bu: null, district: null,
                })}
                className={`chip whitespace-nowrap shrink-0 ${isSel ? 'selected' : ''}`}
                style={isSel ? { backgroundColor: NONE_HEX, borderColor: NONE_HEX, color: '#fff' } : undefined}
                title="本部未設定"
              >
                --本部({counts.honbuNone})
              </button>
            );
          })()}
        </div>
      )}

      {/* ── 2段目: 部 ── */}
      {open && selectedHonbu && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 items-center animate-slide-down px-1">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">部:</span>
          <button
            onClick={() => onChange({ category: selection.category, honbu: selectedHonbu.key, bu: null, district: null })}
            className={`chip chip-sm whitespace-nowrap shrink-0 ${selection.bu === null ? 'selected' : ''}`}
            style={selection.bu === null
              ? { backgroundColor: selectedHonbu.hex, borderColor: selectedHonbu.hex, color: '#fff' }
              : undefined}
          >
            すべての部
          </button>
          {selectedHonbu.bus.map(bu => {
            const c = counts.buC.get(`${selectedHonbu.key}|${bu.key}`) ?? 0;
            const isSelected = selection.bu === bu.key;
            return (
              <button
                key={bu.key}
                onClick={() => onChange({ category: selection.category, honbu: selectedHonbu.key, bu: bu.key, district: null })}
                className={`chip chip-sm whitespace-nowrap shrink-0 ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { backgroundColor: bu.hex, borderColor: bu.hex, color: '#fff' } : undefined}
                title={bu.key}
              >
                {bu.short}({c})
              </button>
            );
          })}
          {/* --部: 部未設定の人 (honbu 配下) */}
          {(() => {
            const isSel = selection.bu === NONE_SENTINEL;
            const noneCount = counts.buNoneByHonbu.get(selectedHonbu.key) ?? 0;
            return (
              <button
                onClick={() => onChange({
                  category: selection.category, honbu: selectedHonbu.key,
                  bu: isSel ? null : NONE_SENTINEL, district: null,
                })}
                className={`chip chip-sm whitespace-nowrap shrink-0 ${isSel ? 'selected' : ''}`}
                style={isSel ? { backgroundColor: NONE_HEX, borderColor: NONE_HEX, color: '#fff' } : undefined}
                title="部未設定"
              >
                --部({noneCount})
              </button>
            );
          })()}
        </div>
      )}

      {/* ── 3段目: 地区 ── 部選択中なら必ず表示 (districts 空でも --地区 placeholder を出す) */}
      {open && selectedBu && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 items-center animate-slide-down px-1">
          <span className="text-[10px] text-[var(--color-subtext)] shrink-0 pl-0.5">地区:</span>
          {selectedBu.districts.length > 0 && (
            <button
              onClick={() => onChange({ category: selection.category, honbu: selection.honbu, bu: selectedBu.key, district: null })}
              className={`chip chip-sm whitespace-nowrap shrink-0 ${selection.district === null ? 'selected' : ''}`}
              style={selection.district === null
                ? { backgroundColor: selectedBu.hex, borderColor: selectedBu.hex, color: '#fff' }
                : undefined}
            >
              すべての地区
            </button>
          )}
          {selectedBu.districts.map(d => {
            const c = counts.distC.get(`${selectedBu.key}|${d.key}`) ?? 0;
            const isSelected = selection.district === d.key;
            return (
              <button
                key={d.key}
                onClick={() => onChange({ category: selection.category, honbu: selection.honbu, bu: selectedBu.key, district: d.key })}
                className={`chip chip-sm whitespace-nowrap shrink-0 ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { backgroundColor: d.hex, borderColor: d.hex, color: '#fff' } : undefined}
                title={d.key}
              >
                {d.short}({c})
              </button>
            );
          })}
          {/* --地区: 地区未設定の人 (bu 配下)。districts が空の bu でも常に表示 */}
          {(() => {
            const isSel = selection.district === NONE_SENTINEL;
            const noneCount = counts.distNoneByBu.get(selectedBu.key) ?? 0;
            return (
              <button
                onClick={() => onChange({
                  category: selection.category, honbu: selection.honbu, bu: selectedBu.key,
                  district: isSel ? null : NONE_SENTINEL,
                })}
                className={`chip chip-sm whitespace-nowrap shrink-0 ${isSel ? 'selected' : ''}`}
                style={isSel ? { backgroundColor: NONE_HEX, borderColor: NONE_HEX, color: '#fff' } : undefined}
                title="地区未設定"
              >
                --地区({noneCount})
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
