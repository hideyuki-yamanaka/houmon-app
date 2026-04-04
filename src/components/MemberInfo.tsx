'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Member, MemberRow } from '../lib/types';
import { STATUS_GRID_ITEMS, STATUS_LEVEL_DISPLAY, type StatusLevel } from '../lib/constants';
import { updateMember } from '../lib/storage';

interface Props {
  member: Member;
  onUpdate?: (updated: Partial<Member>) => void;
}

const FIELD_TO_COLUMN: Record<string, string> = {
  name: 'name', nameKana: 'name_kana', role: 'role', address: 'address',
  birthday: 'birthday', age: 'age', enrollmentDate: 'enrollment_date',
  phone: 'phone', mobile: 'mobile', workplace: 'workplace',
  educationLevel: 'education_level', family: 'family', altarStatus: 'altar_status',
  dailyPractice: 'daily_practice', newspaper: 'newspaper',
  financialContribution: 'financial_contribution', activityStatus: 'activity_status',
  youthGroup: 'youth_group', notes: 'notes',
};

// ── ステータスセル（タップで切替・大きいアイコン＋縦積みプルダウン） ──
function StatusCell({ item, member, memberId, onSaved }: {
  item: typeof STATUS_GRID_ITEMS[0];
  member: Record<string, string | null | undefined>;
  memberId: string;
  onSaved: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const level = item.evaluate(member);
  const display = STATUS_LEVEL_DISPLAY[level];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const options: { level: StatusLevel; symbol: string; color: string }[] = [
    { level: 'good', ...STATUS_LEVEL_DISPLAY.good },
    { level: 'mid', ...STATUS_LEVEL_DISPLAY.mid },
    { level: 'bad', ...STATUS_LEVEL_DISPLAY.bad },
    { level: 'unknown', ...STATUS_LEVEL_DISPLAY.unknown },
  ];

  const handleSelect = async (selected: StatusLevel) => {
    setOpen(false);
    const column = FIELD_TO_COLUMN[item.key];
    if (!column) return;
    const valueMap: Record<StatusLevel, string> = { good: '○', mid: '△', bad: '×', unknown: '' };
    const newVal = valueMap[selected];
    try {
      await updateMember(memberId, { [column]: newVal || null } as Partial<MemberRow>);
      onSaved(item.key, newVal);
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="w-full text-center py-1 rounded-lg transition-transform duration-150 hover:translate-y-[-2px] cursor-pointer">
        <div className="text-[11px] text-[var(--color-subtext)] mb-1.5">{item.label}</div>
        <div className={`text-4xl font-bold ${display.color} transition-transform duration-150`}>{display.symbol}</div>
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg z-10 flex flex-col overflow-hidden min-w-[52px]">
          {options.map(opt => (
            <button
              key={opt.level}
              onClick={() => handleSelect(opt.level)}
              className={`px-4 py-2.5 text-2xl font-bold ${opt.color} ${level === opt.level ? 'bg-[#F0F0F0]' : ''} active:bg-[#E8E8E8] border-b border-[#F0F0F0] last:border-b-0`}
            >
              {opt.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 日付ピッカーフィールド ──
function DateField({ label, value, fieldKey, memberId, onSaved, half }: {
  label: string; value: string | undefined; fieldKey: string;
  memberId: string; onSaved: (key: string, value: string) => void;
  half?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "1989/7/28" → "1989-07-28" に変換
  const toISODate = (v: string | undefined): string => {
    if (!v) return '';
    const parts = v.replace(/\//g, '-').split('-');
    if (parts.length === 3) {
      return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return v;
  };

  // "1989-07-28" → "1989/7/28" に変換（表示用）
  const toDisplayDate = (v: string): string => {
    const parts = v.split('-');
    if (parts.length === 3) {
      return `${Number(parts[0])}/${Number(parts[1])}/${Number(parts[2])}`;
    }
    return v;
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const displayVal = newVal ? toDisplayDate(newVal) : '';
    const column = FIELD_TO_COLUMN[fieldKey];
    if (!column) return;
    try {
      await updateMember(memberId, { [column]: displayVal || null } as Partial<MemberRow>);
      onSaved(fieldKey, displayVal);
    } catch { /* ignore */ }
  };

  const displayValue = value != null && value !== '' ? String(value) : '';

  return (
    <div
      className={`py-2 cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] ${half ? '' : 'border-b border-[#F0F0F0]'}`}
      onClick={() => inputRef.current?.showPicker?.()}
    >
      <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">{label}</div>
      <div className="relative">
        {displayValue
          ? <span className="text-sm">{displayValue}</span>
          : <span className="text-sm text-[#CCC] italic">未入力</span>
        }
        <input
          ref={inputRef}
          type="date"
          value={toISODate(value)}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 w-full cursor-pointer"
        />
      </div>
    </div>
  );
}

// ── 年齢ドラムロールピッカー ──
function AgeField({ value, memberId, onSaved, half }: {
  value: number | undefined;
  memberId: string;
  onSaved: (key: string, value: string) => void;
  half?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 開いたとき現在の値までスクロール
  useEffect(() => {
    if (open && scrollRef.current && value != null) {
      const itemH = 44;
      const scrollTo = Math.max(0, (value - 2) * itemH);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [open, value]);

  const handleSelect = async (age: number) => {
    setOpen(false);
    const column = FIELD_TO_COLUMN.age;
    if (!column) return;
    try {
      await updateMember(memberId, { [column]: age } as Partial<MemberRow>);
      onSaved('age', String(age));
    } catch { /* ignore */ }
  };

  const displayValue = value != null ? `${value}歳` : '';

  return (
    <div ref={ref} className={`py-2 relative ${half ? '' : 'border-b border-[#F0F0F0]'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left cursor-pointer transition-transform duration-150 hover:translate-y-[-1px]"
      >
        <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">年齢</div>
        {displayValue
          ? <span className="text-sm">{displayValue}</span>
          : <span className="text-sm text-[#CCC] italic">未入力</span>
        }
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg z-20 w-24 overflow-hidden">
          <div
            ref={scrollRef}
            className="max-h-[220px] overflow-y-auto overscroll-contain"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {Array.from({ length: 101 }, (_, i) => i).map(age => (
              <button
                key={age}
                onClick={() => handleSelect(age)}
                style={{ scrollSnapAlign: 'center' }}
                className={`w-full h-[44px] flex items-center justify-center text-base font-medium
                  ${value === age ? 'bg-[#F0F0F0] font-bold' : ''}
                  active:bg-[#E8E8E8] border-b border-[#F5F5F5] last:border-b-0`}
              >
                {age}歳
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── インライン編集フィールド ──
function EditableField({ label, value, fieldKey, memberId, link, onSaved, half }: {
  label: string; value: string | number | undefined; fieldKey: string;
  memberId: string; link?: string; onSaved: (key: string, value: string) => void;
  half?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const save = useCallback(async () => {
    setEditing(false);
    const newVal = editValue.trim();
    if (newVal === String(value ?? '')) return;
    const column = FIELD_TO_COLUMN[fieldKey];
    if (!column) return;
    try {
      await updateMember(memberId, { [column]: newVal || null } as Partial<MemberRow>);
      onSaved(fieldKey, newVal);
    } catch { setEditValue(String(value ?? '')); }
  }, [editValue, value, fieldKey, memberId, onSaved]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { setEditValue(String(value ?? '')); setEditing(false); }
  };

  const displayValue = value != null && value !== '' ? String(value) : '';

  if (editing) {
    return (
      <div className={`py-2 ${half ? '' : 'border-b border-[#F0F0F0]'}`}>
        <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">{label}</div>
        <input ref={inputRef} type="text" value={editValue}
          onChange={e => setEditValue(e.target.value)} onBlur={save} onKeyDown={handleKeyDown}
          className="text-sm w-full bg-transparent outline-none caret-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className={`py-2 cursor-pointer transition-transform duration-150 hover:translate-y-[-1px] ${half ? '' : 'border-b border-[#F0F0F0]'}`}
      onClick={() => { setEditValue(displayValue); setEditing(true); }}>
      <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">{label}</div>
      {displayValue ? (
        link ? (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[var(--color-text)] flex items-center gap-1"
            onClick={e => e.stopPropagation()}>
            {displayValue}
            <ExternalLink size={16} className="text-[var(--color-icon-gray)]" />
          </a>
        ) : <span className="text-sm">{displayValue}</span>
      ) : <span className="text-sm text-[#CCC] italic">未入力</span>}
    </div>
  );
}

export default function MemberInfo({ member, onUpdate }: Props) {
  const [local, setLocal] = useState(member);
  useEffect(() => { setLocal(member); }, [member]);

  const handleSaved = useCallback((key: string, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value || undefined }));
    onUpdate?.({ [key]: value || undefined });
  }, [onUpdate]);

  const F = (key: string, label: string, value: string | number | undefined, opts?: { link?: string; half?: boolean }) => (
    <EditableField key={key} fieldKey={key} label={label} value={value}
      memberId={local.id} link={opts?.link} onSaved={handleSaved} half={opts?.half} />
  );

  return (
    <div className="space-y-4">
      {/* 基本情報 */}
      <div className="ios-card p-4">
        <h3 className="text-xs font-semibold text-[var(--color-subtext)] mb-2">基本情報</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
            {local.district}
          </span>
        </div>

        {/* 読み仮名 & 役職 — 2カラム */}
        <div className="grid grid-cols-2 gap-x-4 border-b border-[#F0F0F0]">
          {F('nameKana', '読み仮名', local.nameKana, { half: true })}
          {F('role', '役職', local.role, { half: true })}
        </div>

        {F('address', '住所', local.address, { link: local.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.address)}` : undefined })}

        {/* 日付 & 年齢 — カレンダーピッカー / ドラムロール */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 border-b border-[#F0F0F0]">
          <DateField label="生年月日" value={local.birthday} fieldKey="birthday"
            memberId={local.id} onSaved={handleSaved} half />
          <AgeField value={local.age} memberId={local.id} onSaved={handleSaved} half />
          <DateField label="入会月日" value={local.enrollmentDate} fieldKey="enrollmentDate"
            memberId={local.id} onSaved={handleSaved} half />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 border-b border-[#F0F0F0]">
          {F('phone', '自宅TEL', local.phone, { link: local.phone ? `tel:${local.phone}` : undefined, half: true })}
          {F('mobile', '携帯', local.mobile, { link: local.mobile ? `tel:${local.mobile}` : undefined, half: true })}
          {F('educationLevel', '教学', local.educationLevel, { half: true })}
        </div>

        {/* 職場 & 同居家族 — 縦並び */}
        {F('workplace', '職場', local.workplace)}
        {F('family', '同居家族', local.family)}

        {F('notes', '備考', local.notes)}
      </div>

      {/* ○×△ ステータスグリッド（タップで編集） */}
      <div className="ios-card px-4 pt-4 pb-6">
        <h3 className="text-xs font-semibold text-[var(--color-subtext)] mb-3">ステータス</h3>
        <div className="grid grid-cols-7 gap-2 text-center">
          {STATUS_GRID_ITEMS.map(item => (
            <StatusCell key={item.key} item={item} memberId={local.id}
              member={local as unknown as Record<string, string | null | undefined>}
              onSaved={handleSaved} />
          ))}
        </div>
      </div>
    </div>
  );
}
