'use client';

// 住所不明タスク UI (採用案A: アコーディオン)
// 2026-05-10 ヒデさん指示で導入 → 同日改修で 訪問カード内に埋め込む形に。
//
// 配置: 該当メンバーで 一番新しい status='unknown_address' の VisitCard の expansion
//       スロットに渡されて、視覚的に「同じカード」として表示される。
// データ: members.address_issue_note / address_issue_resolved (メンバー単位)
//
// 動作:
//  - ヘッダーをタップで開閉。状態バッジ (未解決/解決済み) はヘッダー右に常時表示。
//  - 中身は textarea (対応メモ) + チェックボックス (解決済みにする)。
//  - 編集は debounce 自動保存 (700ms)。
//
// スタイル: 親 (VisitCard) が ios-card (白背景 + 影 + 角丸) を提供するので、
//          このコンポーネントは内側の塊だけ提供。 outer は無装飾 div。

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { updateMember } from '../lib/storage';
import { tapHaptic } from '../lib/haptics';

interface Props {
  memberId: string;
  initialNote?: string;
  initialResolved?: boolean;
}

export default function AddressIssueSection({ memberId, initialNote, initialResolved }: Props) {
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState(initialNote ?? '');
  const [resolved, setResolved] = useState(initialResolved ?? false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // debounce 保存
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persist = (patch: { address_issue_note?: string | null; address_issue_resolved?: boolean }) => {
    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await updateMember(memberId, patch);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1500);
      } catch (e) {
        console.error('AddressIssueSection: save failed', e);
        setSaveState('idle');
      }
    }, 700);
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleNoteChange = (v: string) => {
    setNote(v);
    persist({ address_issue_note: v.length > 0 ? v : null });
  };
  const handleResolvedChange = (v: boolean) => {
    tapHaptic();
    setResolved(v);
    persist({ address_issue_resolved: v });
  };

  return (
    <div>
      {/* ヘッダー (タップで開閉) */}
      <button
        type="button"
        onClick={() => { tapHaptic(); setOpen(!open); }}
        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-[#F5F5F5] transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#FF9500]" />
          <span className="text-sm font-bold text-[#000]">住所不明</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: resolved ? '#D6F4DE' : '#FFEAD0',
              color: resolved ? '#1D7A3F' : '#C2410C',
            }}
          >
            {resolved ? '解決済み' : '未解決'}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-[#8E8E93]" /> : <ChevronDown size={16} className="text-[#8E8E93]" />}
      </button>

      {/* 中身 */}
      {open && (
        <div className="px-4 pb-3 border-t border-[#F0F0F0]">
          <p className="text-[10px] text-[#6E6E73] mt-2 mb-2">
            このメンバーの住所不明状態を管理します。複数の訪問で共有されます。
          </p>
          <textarea
            value={note}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder="対応メモ (例: 5/5 不在票投函 / 5/9 隣人に確認 → 転居の可能性高い)"
            className="w-full h-24 rounded-lg border border-[#E5E5EA] p-2 text-[12px] resize-none focus:outline-none focus:border-[#007AFF]"
          />
          <div className="flex items-center justify-between mt-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resolved}
                onChange={e => handleResolvedChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs">解決済みにする</span>
            </label>
            {saveState !== 'idle' && (
              <span className="text-[10px] text-[#8E8E93]">
                {saveState === 'saving' ? '保存中…' : '保存しました'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
