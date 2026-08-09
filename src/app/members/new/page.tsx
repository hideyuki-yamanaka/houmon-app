import { Suspense } from 'react';
import NewMemberClient from './client';

// /members/new は静的セグメントなので [id] より優先される（Next.js の
// ルーティング優先順位: static > dynamic）。id="new" のメンバーは作れない
// 想定だが、nanoid(12) しか発行しないので衝突しない。

export default function NewMemberPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    }>
      <NewMemberClient />
    </Suspense>
  );
}
