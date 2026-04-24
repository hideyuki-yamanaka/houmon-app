import { Suspense } from 'react';
import MemberDetailClient from './client';
import { getAllMemberIds } from '../../../lib/storage';

export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const ids = await getAllMemberIds();
    return ids.map(id => ({ id }));
  } catch {
    return [{ id: '_' }];
  }
}

// client.tsx は useSearchParams() を使うので prerender 時に Suspense で
// 包まないと Next.js がビルドエラー(missing-suspense-with-csr-bailout)を出す。
export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    }>
      <MemberDetailClient />
    </Suspense>
  );
}
