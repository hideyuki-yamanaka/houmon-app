'use client';

// 共通: 訪問ログ作成フォームのサンプル UI。
// ステータスは住所不明で固定 (このセクションが現れる条件)。
// 子要素として 各案の「住所不明タスクセクション」を slot で受け取る。

import type { ReactNode } from 'react';

export function SampleVisitForm({ children, addressIssueSlot }: { children?: ReactNode; addressIssueSlot: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#F2F2F7] p-3 shadow-sm">
      {/* メンバーミニ情報 */}
      <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
        <div className="text-[10px] text-[#6E6E73]">あさひりょうた</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <h3 className="text-base font-bold">朝日 涼太</h3>
          <span className="text-xs text-[#6E6E73]">(25)</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#5AC8FA] text-white">ヤング</span>
        </div>
        <div className="text-[11px] text-[#6E6E73] mt-1">旭川市豊岡5条7丁目1-10</div>
      </div>

      {/* 日時 */}
      <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
        <div className="text-[10px] font-bold text-[#6E6E73] mb-1">日時</div>
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-bold">2026年5月9日</span>
          <span className="text-sm">15時</span>
        </div>
      </div>

      {/* ステータス: 住所不明 (orange highlighted) */}
      <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
        <div className="text-[10px] font-bold text-[#6E6E73] mb-2">ステータス</div>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="本人に会えた" color="#34C759" />
          <Chip label="家族に会えた" color="#34C759" />
          <Chip label="不在" color="#8E8E93" />
          <Chip label="拒否" color="#FF3B30" />
          <Chip label="住所不明" color="#FF9500" selected />
          <Chip label="転居" color="#AF52DE" />
        </div>
      </div>

      {/* ★ 追加セクション (各案で異なる) ★ */}
      {addressIssueSlot}

      {/* 対応者 (簡略) */}
      <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
        <div className="text-[10px] font-bold text-[#6E6E73] mb-2">対応者</div>
        <div className="text-xs text-[#8E8E93]">未選択</div>
      </div>

      {/* 備考 (簡略) */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="text-[10px] font-bold text-[#6E6E73] mb-2">備考</div>
        <div className="h-12 rounded bg-[#F2F2F7]" />
      </div>

      {children}
    </div>
  );
}

function Chip({ label, color, selected }: { label: string; color: string; selected?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: selected ? `${color}1A` : 'white',
        border: `1.5px solid ${color}`,
        color: selected ? color : '#3C3C43',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
