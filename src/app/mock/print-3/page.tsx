'use client';

import Link from 'next/link';
import { SAMPLE_MEMBER, SAMPLE_VISITS } from '../print/_sample';
import { A4LandscapeFrame } from '../../../components/print/PrintShell';
import { Layout3 } from '../../../components/print/PrintLayouts';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/print" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案3 ダッシュボード (ステータス重視)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">左半分にステータスを 2x4 で大きく表示 / 右に詳細。&quot;その人の今&quot; を一目で。</p>
      </div>
      <div className="max-w-[1366px] mx-auto">
        <A4LandscapeFrame>
          <Layout3 member={SAMPLE_MEMBER} visits={SAMPLE_VISITS} pageNo={1} pageTotal={1} />
        </A4LandscapeFrame>
      </div>
    </div>
  );
}
