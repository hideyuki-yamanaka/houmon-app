'use client';

// ──────────────────────────────────────────────────────────────
// /settings — アプリ設定画面
//
// 当面は プッシュ通知の オプトイン トグルだけ。Phase 2 で アカウント情報や
// チーム招待 UI もここに追加していく予定。
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, BellOff, Loader2, AlertCircle } from 'lucide-react';
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from '../../lib/push';
import { useSwipeBack } from '../../lib/useSwipeBack';

export default function SettingsPage() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getPushSubscriptionStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async () => {
    if (busy || !status) return;
    setBusy(true);
    setError(null);

    if (status === 'subscribed') {
      const res = await unsubscribeFromPush();
      if (!res.ok) setError(res.reason);
    } else {
      const res = await subscribeToPush();
      if (!res.ok) setError(res.reason);
    }

    setBusy(false);
    refresh();
  };

  const isOn = status === 'subscribed';
  const canToggle =
    !!status && status !== 'unsupported' && status !== 'denied';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* ヘッダ */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">設定</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-6">
        {/* 通知セクション */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">通知</h2>
          </div>

          <div className="px-4 py-4 flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {isOn ? (
                <Bell size={20} className="text-[var(--color-primary)]" />
              ) : (
                <BellOff size={20} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-gray-900">通知を受け取る</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                訪問予定のリマインドや 締切の お知らせを送るで
              </div>
              {status === 'unsupported' && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    このブラウザはプッシュ通知に対応してへん (iOS は ホームに追加してから 試してな)
                  </span>
                </div>
              )}
              {status === 'denied' && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>過去に拒否してるで。ブラウザの設定から手動で許可し直してな</span>
                </div>
              )}
              {error && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-red-600">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Toggle
              checked={isOn}
              disabled={!canToggle || busy}
              onChange={handleToggle}
              loading={busy}
            />
          </div>
        </section>

        <p className="text-[11px] text-gray-400 px-2">
          通知の配信機能は順次追加予定や (現在は購読登録のみ)
        </p>
      </main>
    </div>
  );
}

// ─── トグル スイッチ (シンプル実装) ───────────────────────────────
function Toggle({
  checked,
  disabled,
  loading,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
      } ${disabled ? 'opacity-50' : 'active:scale-95'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {loading && (
          <Loader2
            size={14}
            className="absolute inset-0 m-auto animate-spin text-gray-500"
          />
        )}
      </span>
    </button>
  );
}
