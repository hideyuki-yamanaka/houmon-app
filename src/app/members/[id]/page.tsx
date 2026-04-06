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

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <MemberDetailClient />;
}
