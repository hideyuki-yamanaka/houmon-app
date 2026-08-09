import { Suspense } from 'react';
import QuickClient from './client';

// /quick — ホームの + ボタンの行き先 (2026-08-09 ヒデさん指示で新設)。
// AI おまかせ入力を主役に据えて、その下に「メンバー登録」「訪問ログ記録」の
// 手入力動線を 2 本ぶら下げる画面。

export default function QuickPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    }>
      <QuickClient />
    </Suspense>
  );
}
