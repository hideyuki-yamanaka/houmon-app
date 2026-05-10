'use client';

// 住所不明タスク UI の 3 案。

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Circle, MapPin, FileText } from 'lucide-react';

// ─────────────────────────────────────────────
// 案A: アコーディオン展開式 (シンプル・控えめ)
// ─────────────────────────────────────────────
export function SectionA() {
  const [open, setOpen] = useState(true);
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState('5/5 不在票投函。\n5/9 隣人に確認 → 「2 週間前から見かけない」とのこと。\n→ 転居の可能性 高 / 次回 関係者に連絡予定。');

  return (
    <div className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden">
      {/* ヘッダー (タップで開閉) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-3 text-left active:bg-[#F2F2F7]"
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#FF9500]" />
          <span className="text-sm font-bold">住所不明タスク</span>
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
        <div className="px-3 pb-3 border-t border-[#E5E5EA]">
          <p className="text-[10px] text-[#6E6E73] mt-2 mb-2">
            このメンバー全体の住所不明タスクです。複数の訪問ログで共有されます。
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="対応メモ (例: 5/5 不在票投函 / 5/9 隣人に確認 → 転居の可能性高い)"
            className="w-full h-24 rounded-lg border border-[#E5E5EA] p-2 text-[12px] resize-none focus:outline-none focus:border-[#007AFF]"
          />
          <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resolved}
              onChange={e => setResolved(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-xs">解決済みにする</span>
            <span className="text-[10px] text-[#8E8E93]">(チェックでメンバーピンも通常色に戻る)</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 案B: 警告バナー型 (目立つ・緊急感)
// ─────────────────────────────────────────────
export function SectionB() {
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState('5/5 不在票投函。\n5/9 隣人に確認 → 「2 週間前から見かけない」。\n→ 転居の可能性 高 / 次回 関係者に連絡予定。');

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden border-2"
      style={{
        background: resolved ? '#D6F4DE' : '#FFEAD0',
        borderColor: resolved ? '#34C759' : '#FF9500',
      }}
    >
      {/* バナーヘッダー */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          {resolved
            ? <CheckCircle2 size={18} style={{ color: '#1D7A3F' }} />
            : <AlertTriangle size={18} style={{ color: '#C2410C' }} />}
          <div>
            <div
              className="text-[13px] font-extrabold"
              style={{ color: resolved ? '#1D7A3F' : '#C2410C' }}
            >
              {resolved ? '住所不明タスク：解決済み' : '住所不明タスク：未解決'}
            </div>
            <div className="text-[10px]" style={{ color: resolved ? '#1D7A3F' : '#92400E', opacity: 0.85 }}>
              対応メモを記録してタスクを進めてください
            </div>
          </div>
        </div>
      </div>

      {/* 中身 (常時展開) */}
      <div className="bg-white px-3 py-3">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="対応メモ"
          className="w-full h-24 rounded-lg border border-[#E5E5EA] p-2 text-[12px] resize-none focus:outline-none focus:border-[#007AFF]"
        />
        <button
          type="button"
          onClick={() => setResolved(!resolved)}
          className="w-full mt-2.5 py-2 rounded-lg text-xs font-bold transition-colors"
          style={{
            background: resolved ? '#FFEAD0' : '#34C759',
            color: resolved ? '#C2410C' : '#FFFFFF',
            border: resolved ? '1px solid #FF9500' : 'none',
          }}
        >
          {resolved ? '↩ 未解決に戻す' : '✓ 解決済みにする'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 案C: チケット型カード (タスク管理 アプリ風)
// ─────────────────────────────────────────────
export function SectionC() {
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState('5/5 不在票投函。\n5/9 隣人に確認 → 「2 週間前から見かけない」。\n→ 転居の可能性 高 / 次回 関係者に連絡予定。');

  return (
    <div className="bg-white rounded-xl mb-3 overflow-hidden shadow-sm border-l-[4px]" style={{ borderLeftColor: resolved ? '#34C759' : '#FF9500' }}>
      {/* ヘッダー: チケット番号風 */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#8E8E93]" />
          <span className="text-[10px] font-mono text-[#8E8E93]">TASK-{`{member_id}`.slice(0, 6)}</span>
        </div>
        <div className="text-[9px] text-[#8E8E93]">作成 5/5 ・ 最終更新 5/9</div>
      </div>

      <div className="px-3 pb-3">
        {/* タスクタイトル */}
        <div className="text-[14px] font-extrabold mb-1">住所不明タスク</div>
        <div className="text-[11px] text-[#6E6E73] mb-3">
          メンバー: 朝日 涼太 (豊岡本部・歓喜地区)
        </div>

        {/* ステータス トグル */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setResolved(false)}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: !resolved ? '#FFEAD0' : '#F2F2F7',
              color: !resolved ? '#C2410C' : '#8E8E93',
              border: !resolved ? '1.5px solid #FF9500' : '1.5px solid transparent',
            }}
          >
            <Circle size={12} fill={!resolved ? '#FF9500' : 'transparent'} />
            未解決
          </button>
          <button
            type="button"
            onClick={() => setResolved(true)}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: resolved ? '#D6F4DE' : '#F2F2F7',
              color: resolved ? '#1D7A3F' : '#8E8E93',
              border: resolved ? '1.5px solid #34C759' : '1.5px solid transparent',
            }}
          >
            <CheckCircle2 size={12} fill={resolved ? '#34C759' : 'transparent'} color={resolved ? 'white' : '#8E8E93'} />
            解決済み
          </button>
        </div>

        {/* メモ */}
        <div className="text-[10px] font-bold text-[#6E6E73] mb-1">対応メモ</div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="例: 隣人に確認 / 関係者へ連絡 / Maps で再検索 ..."
          className="w-full h-24 rounded-lg border border-[#E5E5EA] p-2 text-[12px] resize-none focus:outline-none focus:border-[#007AFF]"
        />
      </div>
    </div>
  );
}
