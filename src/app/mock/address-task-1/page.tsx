'use client';

import Link from 'next/link';
import { SampleVisitForm } from '../address-task/_form';
import { SectionA } from '../address-task/_sections';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/address-task" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案A アコーディオン (シンプル)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">タップで開閉できる控えめなセクション。状態バッジ (未解決/解決済) はヘッダー右に常時表示。</p>
      </div>
      <div className="max-w-md mx-auto">
        <SampleVisitForm addressIssueSlot={<SectionA />} />
      </div>
    </div>
  );
}
