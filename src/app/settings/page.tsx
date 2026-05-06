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
import { ChevronLeft, Bell, BellOff, Loader2, AlertCircle, Users, ChevronRight, User as UserIcon, Sparkles } from 'lucide-react';
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from '../../lib/push';
import { useSwipeBack } from '../../lib/useSwipeBack';
import { tapHaptic } from '../../lib/haptics';
import { useOwnerContext } from '../../lib/auth';

// 2026-05-06 ヒデさん指示で「テスト通知を送信」ボタンを非表示。
// 通知周りでデバッグが必要になったら true に戻すと UI が復活する。
// (関連 import や handler はそのまま残してあるので fast に切替可能)
const SHOW_TEST_NOTIFY = false;

export default function SettingsPage() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  // 2026-05-06: 共有・招待 はオーナー (=ヒデさん) のみ表示。
  // 招待された人 (isOwner=false) のときは導線ごと非表示にする。
  const { isOwner } = useOwnerContext();

  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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
            onClick={() => tapHaptic()}
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
                訪問予定のリマインドや締切のお知らせを送ります
              </div>
              {status === 'unsupported' && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    このブラウザはプッシュ通知に対応していません (iOS はホームに追加してから試してください)
                  </span>
                </div>
              )}
              {status === 'denied' && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>過去に拒否されています。ブラウザの設定から手動で許可し直してください</span>
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

          {/* テスト送信ボタン (通知 ON 時のみ表示)。
              2026-05-06 SHOW_TEST_NOTIFY=false で常に非表示。
              復活させたい場合は当ファイル冒頭の SHOW_TEST_NOTIFY を true に。 */}
          {SHOW_TEST_NOTIFY && isOn && (
            <div className="px-4 pb-4 -mt-1">
              <button
                type="button"
                onClick={async () => {
                  tapHaptic();
                  setTestSending(true);
                  setTestResult(null);
                  try {
                    const { supabase } = await import('../../lib/supabase');
                    const { data: sess } = await supabase.auth.getSession();
                    const token = sess.session?.access_token;
                    if (!token) { setTestResult('ログインしていません'); return; }
                    const res = await fetch('/api/notify/test', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const j = await res.json();
                    if (!res.ok) { setTestResult(j.error ?? `失敗 (${res.status})`); return; }
                    setTestResult(j.succeeded > 0 ? '送信しました！スマホをご確認ください ✅' : '送信先 0 件…購読し直してください');
                  } catch (e) {
                    setTestResult(e instanceof Error ? e.message : String(e));
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending}
                className="text-[12px] text-[var(--color-primary)] font-bold active:opacity-60 disabled:opacity-40 inline-flex items-center gap-1"
              >
                {testSending ? <><Loader2 size={12} className="animate-spin" />送信中…</> : '🔔 テスト通知を送信'}
              </button>
              {testResult && (
                <p className="mt-1 text-[11px] text-gray-600">{testResult}</p>
              )}
            </div>
          )}
        </section>

        {/* 2026-05-06 ヒデさん指示で 補足文「📬 共有相手が…」を削除 */}

        {/* 共有・プロフィール・校正 セクション。
            2026-05-06 ヒデさん指示で 共有・招待 動線はオーナー (= ヒデさん) のみ表示。
            プロフィールと文書校正は誰でもアクセス可。 */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">アカウント</h2>
          </div>

          <Link
            href="/settings/profile"
            onClick={() => tapHaptic()}
            className="flex items-center gap-3 px-4 py-4 active:bg-gray-50 border-b border-black/5"
          >
            <UserIcon size={20} className="text-[var(--color-primary)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-gray-900">プロフィール</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                訪問ログに表示される自分の名前を設定
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </Link>

          {isOwner && (
            <Link
              href="/settings/sharing"
              onClick={() => tapHaptic()}
              className="flex items-center gap-3 px-4 py-4 active:bg-gray-50 border-b border-black/5"
            >
              <Users size={20} className="text-[var(--color-primary)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-gray-900">共有・招待</div>
                <div className="text-[12px] text-gray-500 mt-0.5">
                  家族と訪問記録を共有したり、招待リンクを発行
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </Link>
          )}

          <Link
            href="/settings/proofreading"
            onClick={() => tapHaptic()}
            className="flex items-center gap-3 px-4 py-4 active:bg-gray-50"
          >
            <Sparkles size={20} className="text-[var(--color-primary)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-gray-900">文書校正</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                訪問ログを AI でですます調に統一・誤字脱字を修正
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </Link>
        </section>
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
