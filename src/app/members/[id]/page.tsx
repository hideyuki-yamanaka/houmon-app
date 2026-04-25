import { Suspense } from 'react';
import MemberDetailClient from './client';
import { getAllMemberIds } from '../../../lib/storage';

// dynamicParams=true で、ビルド後に追加された新規メンバー id でも
// リクエスト時に SSR レンダーされる。false だと 404 になる(visits 側で
// 同じバグを踏んだので、ここも保険として true に揃える)。
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const ids = await getAllMemberIds();
    return ids.map(id => ({ id }));
  } catch {
    return [];
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
