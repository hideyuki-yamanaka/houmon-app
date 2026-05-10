'use client';

// メンバー一括 PDF (印刷) ページ
//   - sessionStorage["print:memberIds"] に MembersListSheet が保存した
//     フィルタ済みメンバー ID リストを読み出して、その全員を A4 横レイアウトで
//     1人 1ページずつレンダリング。
//   - レイアウトは案4 タイムライン方式 (2026-05-09 ヒデさん採用)。
//
//   【画面プレビューと印刷の二段構え】
//   2026-05-09 ヒデさん指摘で 「画面プレビューが破綻してた」 → 完全に分離する設計に変更:
//
//     ┌─ 画面 (mobile/desktop 共通) ──────────────────────────────
//     │ .print-thumb-wrap = aspect-ratio 297/210 + width: 100%
//     │   .print-page    = position: absolute, 固定 1122×793px (A4 native)
//     │                    transform: scale(N) で wrapper に合わせ縮小
//     │ → スマホでも PDF サムネイル風にきれいに見える
//     │   (zoom や max-width で潰れなくなる)
//     │
//     ├─ 印刷時 (@media print) ──────────────────────────────────
//     │ .print-thumb-wrap = 297mm × 210mm (実寸)
//     │   .print-page    = transform 解除、relative 配置で 297×210mm
//     │ → ブラウザの A4 横ページに ぴったりはまる。N人 = N ページ。

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../../lib/storage';
import { Layout4 } from '../../../components/print/PrintLayouts';
import './print.css';

const SESSION_KEY = 'print:memberIds';

// A4 横の native ピクセルサイズ (96dpi 換算)
const A4_W = 1122.5; // 297mm
const A4_H = 793.7;  // 210mm

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

  // 2026-05-10 ヒデさん指摘: 自動 window.print() は iOS Safari が
  // 「このWebサイトから自動的に印刷することは禁止されています」警告を出す。
  // ユーザー操作 (印刷ボタンタップ) でのみ起動する設計に変更し、auto-fire 撤去。

  // 画面プレビュー用: wrapper 幅に合わせて .print-page に transform: scale を掛ける。
  // wrapper は aspect-ratio 297/210 で width: 100% なので 端末幅に応じて伸び縮み。
  // .print-page 自体は 1122×793px に固定して内部 mm 計算が崩れないように。
  useEffect(() => {
    if (!members) return;

    const updateScale = () => {
      const wrappers = document.querySelectorAll<HTMLElement>('.print-thumb-wrap');
      wrappers.forEach((wrapper) => {
        const w = wrapper.getBoundingClientRect().width;
        const scale = w / A4_W;
        const inner = wrapper.querySelector<HTMLElement>('.print-page');
        if (inner) {
          inner.style.transform = `scale(${scale})`;
          inner.style.transformOrigin = 'top left';
        }
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    // 各 wrapper の幅変化を監視 (mobile rotate 等)
    const ro = new ResizeObserver(updateScale);
    document.querySelectorAll('.print-thumb-wrap').forEach(w => ro.observe(w));

    return () => {
      window.removeEventListener('resize', updateScale);
      ro.disconnect();
    };
  }, [members]);

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
            印刷対象: <span className="font-bold text-[#000]">{total} 人</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#007AFF] text-white text-sm font-bold active:opacity-80"
          >
            <Printer size={16} />
            印刷 / PDF
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 text-[11px] text-[#6E6E73] leading-relaxed truncate">
          PDF 保存は 印刷ダイアログ → 共有 (□↑) → 「ファイル」に保存
        </div>
      </div>

      {/* 印刷本体 — Layout4 (タイムライン方式) で 1人1ページ */}
      <main className="print-root">
        {members.map((m, i) => (
          <div key={m.id} className="print-thumb-wrap">
            <article className="print-page">
              <Layout4
                member={m}
                visits={(visitsByMember.get(m.id) ?? []).slice(0, 5)}
                pageNo={i + 1}
                pageTotal={total}
              />
            </article>
          </div>
        ))}
      </main>
    </>
  );
}
