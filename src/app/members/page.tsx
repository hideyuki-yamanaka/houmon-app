import { redirect } from 'next/navigation';

// /members は v2.1 でカレンダータブに置き換わった旧ルート。
// 既に PWA をインストール済みのユーザーが古い URL でアクセスしてきた場合や、
// 古いブックマーク経由で来た時のために /calendar へ転送する。
// 個別ページ /members/[id] は引き続き有効（メンバー詳細）。
export default function LegacyMembersPage() {
  redirect('/calendar');
}
