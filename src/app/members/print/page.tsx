'use client';

// メンバー一括 PDF (印刷) ページ
//   - sessionStorage["print:memberIds"] に MembersListSheet が保存した
//     フィルタ済みメンバー ID リストを読み出して、その全員を A4 横レイアウトで
//     1人 1ページずつレンダリング。
//   - レイアウトは案4 タイムライン方式 (2026-05-09 ヒデさん採用)。
//   - useEffect で window.print() を自動 fire (iOS Safari は手動操作が必要な
//     ので、画面上にも印刷ボタンを置く)。
//   - 印刷時は @page { size: A4 landscape } + page-break-after: always で
//     ブラウザの「PDF として保存」 で 1人1ページの PDF を生成できる。
//   - 訪問ログは新しい順 5 件まで全文 (それ以上ある場合はタイムラインの最後に
//     「他 N件あり」を表示)。

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../../lib/storage';
import { Layout4 } from '../../../components/print/PrintLayouts';
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

        // フィルタ + ID リストの並び順を保持
        const filtered = allMembers.filter(m => idSet.has(m.id));
        const orderMap = new Map(ids.map((id, i) => [id, i]));
        filtered.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

        const vMap = new Map<string, Visit[]>();
        for (const v of allVisits) {
          const arr = vMap.get(v.memberId) ?? [];
          arr.push(v);
          vMap.set(v.memberId, arr);
        }
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

  const todayLabel = new Date().toISOString().slice(0, 10);

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
            印刷対象: <span className="font-bold text-[#000]">{total} 人</span>・出力日 {todayLabel}
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

      {/* 印刷本体 — Layout4 (タイムライン方式) で 1人1ページ */}
      <main className="print-root">
        {members.map((m, i) => (
          <article key={m.id} className="print-page">
            <Layout4
              member={m}
              visits={(visitsByMember.get(m.id) ?? []).slice(0, 5)}
              pageNo={i + 1}
              pageTotal={total}
            />
          </article>
        ))}
      </main>
    </>
  );
}
