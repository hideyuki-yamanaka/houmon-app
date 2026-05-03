'use client';

// ──────────────────────────────────────────────────────────────
// /settings/sharing — 共有・招待 設定画面
//
// セクション構成:
//   1. メアド招待 (メアド + ロール → メール送信)
//   2. リンクだけ発行 (メール送信なし、コピー / 共有 / QR)
//   3. 発行中リンク 一覧 (取り消しボタン)
//   4. 共有してる人 一覧 (権限変更 / 外す)
//
// 関数は全部 src/lib/sharing.ts に集約済。ここは UI のみ。
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Loader2,
  Send,
  Link as LinkIcon,
  Copy,
  Share2,
  QrCode,
  Trash2,
  Users,
  Mail,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  buildInviteUrl,
  issueInviteLink,
  listInviteTokens,
  listTeamMembers,
  removeTeamMember,
  revokeInviteToken,
  sendInviteByEmail,
  updateTeamMemberRole,
  type TeamMemberInfo,
} from '../../../lib/sharing';
import type { InviteTokenRow, TeamRole } from '../../../lib/types';
import { useSwipeBack } from '../../../lib/useSwipeBack';

export default function SharingSettingsPage() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  // 共通: 一覧データ
  const [tokens, setTokens] = useState<InviteTokenRow[]>([]);
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setListLoading(true);
    const [t, m] = await Promise.all([listInviteTokens(), listTeamMembers()]);
    setTokens(t);
    setMembers(m);
    setListLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // トースト 2秒で消す
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      {/* ヘッダ */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">共有・招待</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-5">
        {/* 1. メアド招待 */}
        <SectionEmailInvite onSent={() => { setToast('メールを送りました'); refresh(); }} />

        {/* 2. リンクだけ発行 */}
        <SectionIssueLink onIssued={() => { setToast('リンクを発行しました'); refresh(); }} />

        {/* 3. 発行中リンク */}
        <SectionTokens
          tokens={tokens}
          loading={listLoading}
          onRevoked={() => { setToast('リンクを取り消しました'); refresh(); }}
        />

        {/* 4. 共有してる人 */}
        <SectionMembers
          members={members}
          loading={listLoading}
          onChanged={() => { refresh(); }}
        />
      </main>

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#111] text-white text-[13px] px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          <Check size={14} />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── セクション 1: メアド招待 ─────────────────────────────────────
function SectionEmailInvite({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setError(null);
    setBusy(true);
    const res = await sendInviteByEmail(email.trim(), role);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? '送信に失敗しました');
      return;
    }
    setEmail('');
    onSent();
  };

  return (
    <Section title="メールで招待を送る" icon={<Mail size={14} />}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          className="w-full h-11 rounded-[10px] border border-[#E5E7EB] px-3 text-[15px] outline-none focus:border-[var(--color-primary)]"
        />
        <RoleToggle value={role} onChange={setRole} />
        {error && (
          <p className="text-xs text-red-600 flex items-start gap-1">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {busy ? '送信中…' : '招待を送る'}
        </button>
        <p className="text-[11px] text-[var(--color-subtext)] leading-relaxed">
          相手のメールに 招待リンクが届きます。リンクは 30 日間有効。
        </p>
      </form>
    </Section>
  );
}

// ── セクション 2: リンクだけ発行 ────────────────────────────────
function SectionIssueLink({ onIssued }: { onIssued: () => void }) {
  const [role, setRole] = useState<TeamRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ token: string; url: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleIssue = async () => {
    if (busy) return;
    setBusy(true);
    setShowQr(false);
    setQrDataUrl(null);
    const row = await issueInviteLink(role);
    setBusy(false);
    if (!row) {
      alert('リンク発行に失敗しました');
      return;
    }
    setIssued({ token: row.token, url: buildInviteUrl(row.token) });
    onIssued();
  };

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('コピーに失敗しました');
    }
  };

  const handleShare = async () => {
    if (!issued) return;
    const shareData = {
      title: '家庭訪問アプリ にご招待',
      text: '家庭訪問アプリ にご招待します。下のリンクから入ってください。',
      url: issued.url,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch {
        /* ユーザーがキャンセル: ignore */
      }
    } else {
      // フォールバック: コピー
      handleCopy();
    }
  };

  const handleShowQr = async () => {
    if (!issued) return;
    if (showQr) {
      setShowQr(false);
      return;
    }
    if (!qrDataUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(issued.url, {
          width: 280,
          margin: 1,
          color: { dark: '#111111', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch {
        alert('QR コード生成に失敗しました');
        return;
      }
    }
    setShowQr(true);
  };

  return (
    <Section title="リンクだけ発行 (メール送信なし)" icon={<LinkIcon size={14} />}>
      <div className="space-y-3">
        <RoleToggle value={role} onChange={setRole} />
        <button
          type="button"
          onClick={handleIssue}
          disabled={busy}
          className="w-full h-11 rounded-full bg-white text-[#111] border border-[#111] text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
          {busy ? '発行中…' : 'リンクを発行'}
        </button>

        {issued && (
          <div className="rounded-[10px] border border-[#E5E7EB] bg-[#FAFAFA] p-3 space-y-2">
            <p className="text-[11px] text-[var(--color-subtext)]">発行されたリンク</p>
            <p className="text-[12px] font-mono break-all text-[#111] bg-white border border-[#E5E7EB] rounded px-2 py-1.5">
              {issued.url}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 h-10 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-medium inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 h-10 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-medium inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Share2 size={14} />
                共有
              </button>
              <button
                onClick={handleShowQr}
                className="flex-1 h-10 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-medium inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <QrCode size={14} />
                QR
              </button>
            </div>
            {showQr && qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="招待リンク QR コード"
                className="mx-auto rounded-lg border border-[#E5E7EB] bg-white p-2"
                width={280}
                height={280}
              />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

// ── セクション 3: 発行中リンク 一覧 ─────────────────────────────
function SectionTokens({
  tokens,
  loading,
  onRevoked,
}: {
  tokens: InviteTokenRow[];
  loading: boolean;
  onRevoked: () => void;
}) {
  const handleRevoke = async (token: string) => {
    if (!window.confirm('このリンクを取り消しますか？\n相手はもうリンクを使えなくなります。')) {
      return;
    }
    const ok = await revokeInviteToken(token);
    if (!ok) {
      alert('取り消しに失敗しました');
      return;
    }
    onRevoked();
  };

  return (
    <Section title="発行中の招待リンク" icon={<LinkIcon size={14} />}>
      {loading ? (
        <Loader2 size={18} className="animate-spin mx-auto text-[var(--color-subtext)]" />
      ) : tokens.length === 0 ? (
        <p className="text-[12px] text-[var(--color-subtext)] text-center py-2">
          発行中のリンクはありません
        </p>
      ) : (
        <ul className="divide-y divide-[#F0F0F0]">
          {tokens.map(t => (
            <TokenRow key={t.token} token={t} onRevoke={handleRevoke} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function TokenRow({
  token,
  onRevoke,
}: {
  token: InviteTokenRow;
  onRevoke: (token: string) => void;
}) {
  const isUsed = !!token.used_at;
  const isExpired = !isUsed && new Date(token.expires_at) <= new Date();
  const status = isUsed ? '使用済み' : isExpired ? '期限切れ' : '有効';
  const statusColor = isUsed
    ? 'text-gray-500 bg-gray-100'
    : isExpired
    ? 'text-amber-700 bg-amber-100'
    : 'text-emerald-700 bg-emerald-100';

  return (
    <li className="py-2.5 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColor}`}>
            {status}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4338CA] font-bold">
            {token.role === 'editor' ? '編集' : '閲覧'}
          </span>
        </div>
        <p className="text-[11px] text-[var(--color-subtext)] mt-1 font-mono truncate">
          {token.token.slice(0, 8)}…
        </p>
        <p className="text-[10px] text-[var(--color-subtext)]">
          発行: {formatDate(token.created_at)}
        </p>
      </div>
      <button
        onClick={() => onRevoke(token.token)}
        aria-label="リンクを取り消す"
        className="shrink-0 w-9 h-9 rounded-full hover:bg-red-50 text-red-600 inline-flex items-center justify-center active:scale-95"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

// ── セクション 4: 共有してる人 一覧 ─────────────────────────────
function SectionMembers({
  members,
  loading,
  onChanged,
}: {
  members: TeamMemberInfo[];
  loading: boolean;
  onChanged: () => void;
}) {
  const handleRoleChange = async (memberId: string, role: TeamRole) => {
    const ok = await updateTeamMemberRole(memberId, role);
    if (!ok) {
      alert('権限変更に失敗しました');
      return;
    }
    onChanged();
  };

  const handleRemove = async (memberId: string, email: string | null) => {
    if (
      !window.confirm(
        `${email ?? 'このユーザー'} を共有から外しますか？\n相手はデータを見られなくなります。`,
      )
    ) {
      return;
    }
    const ok = await removeTeamMember(memberId);
    if (!ok) {
      alert('外すのに失敗しました');
      return;
    }
    onChanged();
  };

  return (
    <Section title="共有してる人" icon={<Users size={14} />}>
      {loading ? (
        <Loader2 size={18} className="animate-spin mx-auto text-[var(--color-subtext)]" />
      ) : members.length === 0 ? (
        <p className="text-[12px] text-[var(--color-subtext)] text-center py-2">
          まだ誰とも共有していません
        </p>
      ) : (
        <ul className="divide-y divide-[#F0F0F0]">
          {members.map(m => (
            <li key={m.member_id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#111] truncate">
                  {m.email ?? '(メアド非公開)'}
                </p>
                <p className="text-[10px] text-[var(--color-subtext)]">
                  招待: {formatDate(m.invited_at)}
                </p>
              </div>
              <select
                value={m.role}
                onChange={e => handleRoleChange(m.member_id, e.target.value as TeamRole)}
                className="text-[12px] border border-[#E5E7EB] rounded-full px-2 py-1 bg-white"
              >
                <option value="viewer">閲覧</option>
                <option value="editor">編集</option>
              </select>
              <button
                onClick={() => handleRemove(m.member_id, m.email)}
                aria-label="外す"
                className="shrink-0 w-9 h-9 rounded-full hover:bg-red-50 text-red-600 inline-flex items-center justify-center active:scale-95"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── 共通 UI ──────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/5 flex items-center gap-1.5">
        {icon && <span className="text-gray-500">{icon}</span>}
        <h2 className="text-[12px] font-semibold text-gray-500">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function RoleToggle({
  value,
  onChange,
}: {
  value: TeamRole;
  onChange: (v: TeamRole) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[12px]">
      {(['viewer', 'editor'] as const).map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-full font-bold transition-all ${
            value === r ? 'bg-white text-[#111] shadow-sm' : 'text-[#666]'
          }`}
        >
          {r === 'viewer' ? '閲覧' : '編集'}
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

