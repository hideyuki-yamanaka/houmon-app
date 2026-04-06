import VisitDetailClient from './client';
import { getAllVisitIds } from '../../../lib/storage';

export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const ids = await getAllVisitIds();
    return ids.map(id => ({ id }));
  } catch {
    return [{ id: '_' }];
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
