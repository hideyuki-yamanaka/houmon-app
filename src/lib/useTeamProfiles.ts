'use client';

// ──────────────────────────────────────────────────────────────
// useTeamProfiles — チーム全員のプロフィールをロードして Map で返す hook
//
// 訪問ログ表示時に created_by → 表示名/色 を引きたいので、
// マウント時に1回 RPC 叩いて結果をキャッシュしとく。
//
// 戻り値:
//   { profileMap, lookup, loading }
//   - profileMap: user_id → Profile の Map
//   - lookup(userId): { displayName, color, initial } を一発で返すヘルパー
//   - loading: 取得中か
//
// ※ ライフタイムは hook 利用コンポーネント単位 (グローバルキャッシュは未実装)。
//   将来複数画面で頻繁に叩くようになったら React Query 等を検討。
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { getTeamProfiles, colorForUser, initialOf, type Profile, type AuthorColor } from './profile';

export interface AuthorInfo {
  userId: string | null | undefined;
  displayName: string;
  color: AuthorColor;
  initial: string;
}

export function useTeamProfiles(): {
  profileMap: Map<string, Profile>;
  lookup: (userId: string | null | undefined) => AuthorInfo;
  loading: boolean;
} {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTeamProfiles()
      .then(ps => { if (!cancelled) setProfiles(ps); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.user_id, p);
    return m;
  }, [profiles]);

  const lookup = useMemo(() => {
    return (userId: string | null | undefined): AuthorInfo => {
      const p = userId ? profileMap.get(userId) : null;
      const displayName = p?.display_name ?? (userId ? '不明なユーザー' : '');
      return {
        userId,
        displayName,
        color: colorForUser(userId),
        initial: initialOf(displayName),
      };
    };
  }, [profileMap]);

  return { profileMap, lookup, loading };
}
