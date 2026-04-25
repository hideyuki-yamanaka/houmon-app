import VisitDetailClient from './client';
import { getAllVisitIds } from '../../../lib/storage';

// 🔴 重要: dynamicParams は必ず true。
// 訪問ログはアプリ稼働中にどんどん新規追加される。false にしてしまうと
// 「ビルド時に存在した id しか開けない＝新規ログをタップしても 404」
// という致命的バグになる(2026-04-25 修正済)。
//
// generateStaticParams はビルド時の prefetch 用にだけ残してある:
//   - 既存ログは静的に prerender されるので初回表示が速い
//   - 新規追加されたログは要求時に SSR で生成される
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const ids = await getAllVisitIds();
    return ids.map(id => ({ id }));
  } catch {
    return [];
  }
}

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <VisitDetailClient />;
}
