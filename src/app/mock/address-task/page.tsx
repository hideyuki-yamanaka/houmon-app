'use client';

// 住所不明タスク UI 3案 比較。

import Link from 'next/link';
import { SampleVisitForm } from './_form';
import { SectionA, SectionB, SectionC } from './_sections';

const CASES = [
  {
    id: 1, name: '案A アコーディオン (シンプル)',
    caption: 'タップで開閉できる控えめなセクション。状態バッジ (未解決/解決済) はヘッダー右に常時表示。チェックボックス1つで状態切替。',
    Section: SectionA,
  },
  {
    id: 2, name: '案B 警告バナー (緊急感あり)',
    caption: '黄色バナーで未対応を強くアピール。常時展開、メモ入力欄が常に見える。状態切替は大きめのトグルボタン。',
    Section: SectionB,
  },
  {
    id: 3, name: '案C チケット型 (タスク管理アプリ風)',
    caption: 'タスク番号 (TASK-XXXX) + 作成日/最終更新日付き。ステータスを 2 ボタンの セグメント切替 で選ぶ。プロフェッショナル。',
    Section: SectionC,
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">住所不明タスク UI 3案 比較</h1>
        <p className="text-sm text-[#525252] leading-relaxed">
          訪問ログ作成画面でステータスを「住所不明」にしたとき出現する追加セクション。
          管理単位はメンバー / 状態は 未解決-解決済 / メモは長文 textarea で確定済み。
        </p>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-6">
        {CASES.map(({ id, name, caption, Section }) => (
          <section key={id}>
            <div className="px-1 mb-2">
              <Link href={`/mock/address-task-${id}`} className="text-base font-bold underline decoration-[#999] underline-offset-4 text-[#0A0A0A]">
                {name} →
              </Link>
              <p className="text-xs text-[#525252] mt-0.5 leading-relaxed">{caption}</p>
            </div>
            <SampleVisitForm addressIssueSlot={<Section />} />
          </section>
        ))}
      </div>

      <div className="max-w-md mx-auto mt-8 mb-12 text-center">
        <Link href="/" className="text-sm text-[#525252] underline underline-offset-4">← ホームに戻る</Link>
      </div>
    </div>
  );
}
