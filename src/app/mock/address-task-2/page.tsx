'use client';

import Link from 'next/link';
import { SampleVisitForm } from '../address-task/_form';
import { SectionB } from '../address-task/_sections';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/address-task" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案B 警告バナー (緊急感あり)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">黄色バナーで未対応を強くアピール。常時展開、メモ入力欄が常に見える。</p>
      </div>
      <div className="max-w-md mx-auto">
        <SampleVisitForm addressIssueSlot={<SectionB />} />
      </div>
    </div>
  );
}
