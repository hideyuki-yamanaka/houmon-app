'use client';

// メンバー一括 PDF (印刷) ページ
//   - sessionStorage["print:memberIds"] に MembersListSheet が保存した
//     フィルタ済みメンバー ID リストを読み出して、その全員を A4 横レイアウトで
//     1人 1ページずつレンダリング。
//   - useEffect で window.print() を自動 fire (iOS Safari は手動操作が必要な
//     ので、画面上にも印刷ボタンを置く)。
//   - 印刷時は @page { size: A4 landscape } + page-break-after: always で
//     ブラウザの「PDF として保存」 で 1人1ページの PDF を生成できる。
//   - 訪問ログは新しい順 5 件まで全文 (それ以上ある場合は「他 N件あり」を表示)。

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../../lib/storage';
import { STATUS_GRID_ITEMS, VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../../../lib/constants';
import './print.css';

const SESSION_KEY = 'print:memberIds';

export default function MemberPrintPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[] | null>(null);
  const [visitsByMember, setVisitsByMember] = useState<Map<string, Visit[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // sessionStorage から ID リストを読んで、その人達だけ取得
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const idsRaw = typeof window !== 'undefined'
          ? window.sessionStorage.getItem(SESSION_KEY)
          : null;
        if (!idsRaw) {
          setError('印刷対象のメンバー情報が見つかりませんでした。ホームから やり直してください。');
          return;
        }
        const ids = JSON.parse(idsRaw) as string[];
        if (!Array.isArray(ids) || ids.length === 0) {
          setError('印刷対象のメンバーが0人です。');
          return;
        }
        const idSet = new Set(ids);

        const [allMembers, allVisits] = await Promise.all([
          getMembersWithVisitInfo(),
          getAllVisits(),
        ]);
        if (cancel) return;

        // フィルタ + 元の順序保持
        const filtered = allMembers.filter(m => idSet.has(m.id));
        // ID リストの順序通りに並べる
        const orderMap = new Map(ids.map((id, i) => [id, i]));
        filtered.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

        const vMap = new Map<string, Visit[]>();
        for (const v of allVisits) {
          const arr = vMap.get(v.memberId) ?? [];
          arr.push(v);
          vMap.set(v.memberId, arr);
        }
        // 各メンバーの訪問ログを新しい順 (visitedAt desc) に
        for (const arr of vMap.values()) {
          arr.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
        }

        setMembers(filtered);
        setVisitsByMember(vMap);
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancel = true; };
  }, []);

  // 全部読めたら ちょい待ってから印刷ダイアログを自動 fire
  useEffect(() => {
    if (!members) return;
    const t = window.setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [members]);

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 print-hide">
        <div className="max-w-md text-center">
          <p className="text-base text-[#374151] mb-4">{error}</p>
          <Link href="/" className="text-sm text-[#007AFF] underline">← ホームに戻る</Link>
        </div>
      </div>
    );
  }

  if (!members) {
    return (
      <div className="min-h-screen flex items-center justify-center print-hide">
        <p className="text-sm text-[#6E6E73]">読み込み中…</p>
      </div>
    );
  }

  const total = members.length;

  return (
    <>
      {/* 画面上のツールバー (印刷時は非表示) */}
      <div className="print-hide bg-[#F2F2F7] border-b border-[#E5E5EA] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-[#007AFF] text-sm">
            <ArrowLeft size={16} />
            ホームに戻る
          </Link>
          <div className="text-xs text-[#6E6E73]">
            印刷対象: <span className="font-bold text-[#000]">{total} 人</span>・出力日 {today}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#007AFF] text-white text-sm font-bold active:opacity-80"
          >
            <Printer size={16} />
            印刷 / PDF
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 text-xs text-[#6E6E73] leading-relaxed">
          <p>iPhone で「PDF として保存」したい場合は、印刷ダイアログ右上の <strong>共有 (□↑)</strong> から
          <strong>「ブックを表示する」</strong> または <strong>「ファイル」に保存</strong> を選んでください。</p>
        </div>
      </div>

      {/* 印刷本体 */}
      <main className="print-root">
        {members.map((m, i) => (
          <PrintPage
            key={m.id}
            member={m}
            visits={(visitsByMember.get(m.id) ?? []).slice(0, 5)}
            totalVisits={visitsByMember.get(m.id)?.length ?? 0}
            pageIndex={i}
            pageTotal={total}
            today={today}
          />
        ))}
      </main>
    </>
  );
}

// ─────────────────────────────────────────────
// 1人 1ページの印刷レイアウト (A4 横, 297×210mm)
// ─────────────────────────────────────────────
function PrintPage({
  member: m, visits, totalVisits, pageIndex, pageTotal, today,
}: {
  member: MemberWithVisitInfo;
  visits: Visit[];
  totalVisits: number;
  pageIndex: number;
  pageTotal: number;
  today: string;
}) {
  // ステータス7軸の評価
  const memberRecord = m as unknown as Record<string, string | null | undefined>;
  const statuses = STATUS_GRID_ITEMS.map(item => ({
    key: item.key,
    label: item.label,
    level: item.evaluate(memberRecord),
    rawValue: memberRecord[item.key] ?? memberRecord[snakeCase(item.key)] ?? null,
  }));

  // 情報メモを行ごとに分解 (空行は飛ばす)
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・') || '(組織未設定)';

  return (
    <article className="print-page">
      {/* ヘッダー */}
      <header className="print-page-header">
        <div className="print-page-name">
          <span className="print-page-kana">{m.nameKana ?? ''}</span>
          <h1>
            {m.name}
            {m.age != null && <span className="print-page-age">（{m.age}歳）</span>}
            {m.category === 'young' && <span className="print-tag-young">ヤング</span>}
          </h1>
          <div className="print-page-org">{orgLine}</div>
        </div>
        <div className="print-page-meta">
          <div>{m.address ?? '(住所未登録)'}</div>
          <div className="print-page-meta-sub">
            訪問サイクル {m.visitCycleDays}日 / 通算 {m.totalVisits} 回
          </div>
        </div>
      </header>

      {/* 本文 — 2 カラム */}
      <div className="print-page-body">
        {/* 左カラム: 基本情報 + 情報メモ */}
        <section className="print-col-left">
          <h2 className="print-section-title">基本情報</h2>
          <dl className="print-info-list">
            <Field label="読み仮名" value={m.nameKana} />
            <Field label="生年月日" value={m.birthday} />
            <Field label="入会日" value={m.enrollmentDate} />
            <Field label="役職" value={m.role} />
            <Field label="勤務先" value={m.workplace} />
            <Field label="家族" value={m.family} />
            <Field label="電話" value={m.phone} />
            <Field label="携帯" value={m.mobile} />
          </dl>

          <h2 className="print-section-title print-section-title--mt">情報メモ</h2>
          {infoLines.length > 0 ? (
            <ul className="print-info-memo">
              {infoLines.map((line, i) => (
                <li key={i}>{line.replace(/^[・•·]\s*/, '')}</li>
              ))}
            </ul>
          ) : (
            <div className="print-empty">記入なし</div>
          )}
        </section>

        {/* 右カラム: ステータス + 訪問ログ */}
        <section className="print-col-right">
          <h2 className="print-section-title">ステータス</h2>
          <div className="print-status-grid">
            {statuses.map(s => (
              <div key={s.key} className={`print-status-item print-status-item--${s.level}`}>
                <div className="print-status-label">{s.label}</div>
                <div className="print-status-value">
                  {s.level === 'good' ? '○' : s.level === 'mid' ? '△' : s.level === 'bad' ? '×' : '−'}
                </div>
                {s.rawValue && s.rawValue !== '（不明）' && (
                  <div className="print-status-raw">{s.rawValue}</div>
                )}
              </div>
            ))}
          </div>

          <h2 className="print-section-title print-section-title--mt">
            訪問ログ
            <span className="print-section-sub">
              （{totalVisits === 0 ? '0件' : totalVisits <= 5 ? `${totalVisits}件` : `直近5件 / 全${totalVisits}件`}）
            </span>
          </h2>
          {visits.length > 0 ? (
            <ul className="print-visits">
              {visits.map(v => (
                <PrintVisitItem key={v.id} visit={v} />
              ))}
              {totalVisits > 5 && (
                <li className="print-visit-more">…他 {totalVisits - 5} 件あり</li>
              )}
            </ul>
          ) : (
            <div className="print-empty">訪問ログがありません</div>
          )}
        </section>
      </div>

      {/* フッター */}
      <footer className="print-page-footer">
        <span>家庭訪問アプリ — 出力日 {today}</span>
        <span>{pageIndex + 1} / {pageTotal}</span>
      </footer>
    </article>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function PrintVisitItem({ visit }: { visit: Visit }) {
  const sCfg = VISIT_STATUS_CONFIG[visit.status];
  const date = visit.visitedAt;
  const hour = visit.visitedHour != null ? `${visit.visitedHour}時` : '';
  const respondents = (visit.respondents ?? []).map(r => RESPONDENT_CONFIG[r].label).join('・');
  return (
    <li className="print-visit">
      <div className="print-visit-head">
        <span className="print-visit-date">{date}{hour && ` ${hour}`}</span>
        <span
          className="print-visit-status"
          style={{ borderColor: sCfg.border, color: sCfg.text }}
        >
          {sCfg.label}
        </span>
        {respondents && <span className="print-visit-resp">対応 {respondents}</span>}
      </div>
      {visit.summary && <div className="print-visit-summary">{visit.summary}</div>}
    </li>
  );
}

// snake_case 変換 (member の DB 列名と camelCase キーの両対応)
function snakeCase(s: string): string {
  return s.replace(/[A-Z]/g, ch => '_' + ch.toLowerCase());
}
