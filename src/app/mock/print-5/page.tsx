'use client';

import Link from 'next/link';
import { SAMPLE_MEMBER, SAMPLE_VISITS } from '../print/_sample';
import { A4LandscapeFrame } from '../print/_shell';
import { Layout5 } from '../print/_layouts';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/print" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案5 名簿風 (情報密度・表組)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">基本情報と訪問ログを表で整然と。1ページに最大限の情報を載せる業務帳票風。</p>
      </div>
      <div className="max-w-[1366px] mx-auto">
        <A4LandscapeFrame>
          <Layout5 member={SAMPLE_MEMBER} visits={SAMPLE_VISITS} pageNo={1} pageTotal={1} />
        </A4LandscapeFrame>
      </div>
    </div>
  );
}
