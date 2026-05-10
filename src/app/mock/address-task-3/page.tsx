'use client';

import Link from 'next/link';
import { SampleVisitForm } from '../address-task/_form';
import { SectionC } from '../address-task/_sections';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/address-task" className="text-sm text-[#525252] underline underline-offset-4">← 比較ページに戻る</Link>
        <h1 className="text-xl font-bold mt-2">案C チケット型 (タスク管理アプリ風)</h1>
        <p className="text-xs text-[#525252] mt-1 leading-relaxed">タスク番号 + 作成日/最終更新日付き。状態は 2 ボタンのセグメント切替。</p>
      </div>
      <div className="max-w-md mx-auto">
        <SampleVisitForm addressIssueSlot={<SectionC />} />
      </div>
    </div>
  );
}
