'use client';

// ──────────────────────────────────────────────────────────────
// /invite/[token] — 招待リンクから来た人の入口ページ
//
// ・未ログイン → /login?next=/invite/<token> に飛ばす
// ・ログイン済み → redeem_invite_token RPC を叩いて参加処理
// ・結果に応じてやさしい日本語のメッセージを出す
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, UserX, Clock, Link2Off } from 'lucide-react';
import { useAuthUser } from '../../../lib/auth';
import {
  redeemInviteToken,
  getOwnerDisplayNames,
  type RedeemResult,
} from '../../../lib/sharing';

type State =
  | { kind: 'loading' }
  | { kind: 'redirect-login' }
  | { kind: 'success'; ownerName: string | null }
  | {
      kind: 'error';
      reason: 'self' | 'expired' | 'used' | 'not_found' | 'unauthenticated' | 'unknown';
    };

export default function InviteRedeemPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const { user, loading: authLoading } = useAuthUser();
  const [state, setState] = useState<State>({ kind: 'loading' });

  // 未ログイン → /login へ next 付きで飛ばす
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      try {
        sessionStorage.setItem('houmon:auth_next', `/invite/${token}`);
      } catch {
        /* ignore */
      }
      setState({ kind: 'redirect-login' });
      router.replace(`/login?next=/invite/${token}`);
    }
  }, [authLoading, user, router, token]);

  // ログイン済み → redeem 実行
  useEffect(() => {
    if (authLoading || !user || !token) return;
    let cancelled = false;
    (async () => {
      const res: RedeemResult = await redeemInviteToken(token);
      if (cancelled) return;
      if (res.ok) {
        // オーナー名を解決
        const names = await getOwnerDisplayNames();
        if (cancelled) return;
        const ownerName = names.find(n => n.owner_id === res.owner_id)?.display_name ?? null;
        setState({ kind: 'success', ownerName });
        // 1.5 秒後にホーム
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } else {
        setState({ kind: 'error', reason: res.reason });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center">
        {state.kind === 'loading' && (
          <>
            <Loader2 size={28} className="animate-spin mx-auto text-[var(--color-subtext)] mb-3" />
            <p className="text-sm text-[var(--color-subtext)]">参加処理中…</p>
          </>
        )}

        {state.kind === 'redirect-login' && (
          <>
            <Loader2 size={28} className="animate-spin mx-auto text-[var(--color-subtext)] mb-3" />
            <p className="text-sm text-[var(--color-subtext)]">ログイン画面へ移動中…</p>
          </>
        )}

        {state.kind === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#10B981]/10 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle2 size={26} className="text-[#10B981]" />
            </div>
            <h2 className="text-base font-bold mb-1">参加完了</h2>
            <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
              {state.ownerName ? (
                <>
                  <strong className="text-[#111]">{state.ownerName}さん</strong>
                  のデータに参加しました
                </>
              ) : (
                'データに参加しました'
              )}
              <br />
              ホームに移動します…
            </p>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <ErrorIcon reason={state.reason} />
            <h2 className="text-base font-bold mb-1 mt-3">{titleFor(state.reason)}</h2>
            <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
              {messageFor(state.reason)}
            </p>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="mt-5 w-full h-11 rounded-full bg-[#111] text-white text-[14px] font-bold active:scale-95 transition-transform"
            >
              ホームへ戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorIcon({
  reason,
}: {
  reason: 'self' | 'expired' | 'used' | 'not_found' | 'unauthenticated' | 'unknown';
}) {
  const wrap = 'w-14 h-14 rounded-full mx-auto flex items-center justify-center';
  if (reason === 'expired') {
    return (
      <div className={`${wrap} bg-amber-100`}>
        <Clock size={26} className="text-amber-600" />
      </div>
    );
  }
  if (reason === 'used') {
    return (
      <div className={`${wrap} bg-gray-100`}>
        <Link2Off size={26} className="text-gray-500" />
      </div>
    );
  }
  if (reason === 'self') {
    return (
      <div className={`${wrap} bg-blue-100`}>
        <UserX size={26} className="text-blue-600" />
      </div>
    );
  }
  return (
    <div className={`${wrap} bg-red-100`}>
      <AlertCircle size={26} className="text-red-600" />
    </div>
  );
}

function titleFor(reason: string): string {
  switch (reason) {
    case 'self':
      return 'ご自身用のリンクです';
    case 'expired':
      return 'リンクの有効期限切れ';
    case 'used':
      return 'このリンクは使用済みです';
    case 'not_found':
      return 'リンクが見つかりません';
    case 'unauthenticated':
      return 'ログインが必要です';
    default:
      return 'エラーが発生しました';
  }
}

function messageFor(reason: string): string {
  switch (reason) {
    case 'self':
      return '他の人に送ってくださいね';
    case 'expired':
      return '発行した方に新しいリンクを頼んでください';
    case 'used':
      return '発行した方に新しいリンクを頼んでください';
    case 'not_found':
      return 'リンクが正しくありません。コピペミスがないか確認してください';
    case 'unauthenticated':
      return 'もう一度 ログインしてからリンクを開いてください';
    default:
      return 'しばらくしてからやり直してください';
  }
}
