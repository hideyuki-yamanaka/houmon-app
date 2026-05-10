'use client';

import Link from 'next/link';
import { SAMPLE_MEMBER, SAMPLE_VISITS } from '../print/_sample';
import { A4LandscapeFrame } from '../print/_shell';
import { Layout1 } from '../print/_layouts';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/print" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案1 2カラム (現状)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">左に基本情報＋メモ / 右にステータス＋訪問ログ。安定感あり、現実装ベース。</p>
      </div>
      <div className="max-w-[1366px] mx-auto">
        <A4LandscapeFrame>
          <Layout1 member={SAMPLE_MEMBER} visits={SAMPLE_VISITS} pageNo={1} pageTotal={1} />
        </A4LandscapeFrame>
      </div>
    </div>
  );
}
