'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, MapPin, Clock } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { formatDate } from '../lib/utils';
import { getVisits } from '../lib/storage';
import SwipeableBottomSheet from './SwipeableBottomSheet';

interface Props {
  member: MemberWithVisitInfo | null;
  onClose: () => void;
}

export default function MemberBottomSheet({ member, onClose }: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  // 閉じるアニメーション中も前のメンバーを表示するため
  const lastMemberRef = useRef<MemberWithVisitInfo | null>(null);
  if (member) lastMemberRef.current = member;
  const displayMember = member ?? lastMemberRef.current;

  useEffect(() => {
    if (!member) return;
    setVisits([]);
    setLoading(true);
    getVisits(member.id)
      .then(v => setVisits(v.slice(0, 5)))
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, [member?.id]);

  return (
    <SwipeableBottomSheet
      open={!!member}
      onClose={onClose}
      peekHeight={270}
      zIndex={40}
    >
      {(snap) => {
        if (!displayMember) return null;
        const m = displayMember;

        return (
          <div className="flex flex-col">
            {/* ヘッダー: 名前 + 地区 */}
            <div className="px-4 pt-1 pb-3">
              <button
                onClick={() => router.push(`/members/${m.id}`)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-1.5 flex-1">
                  <h2 className="text-lg font-bold">{m.name}</h2>
                  <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                    {m.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-[var(--color-subtext)]">
                    <Clock size={16} strokeWidth={1.8} />
                    {m.lastVisitDate
                      ? `${formatDate(m.lastVisitDate, 'yyyy年M月d日')}（${m.totalVisits}回）`
                      : `${m.totalVisits}回`}
                  </span>
                </div>
              </button>

              {/* 住所（Googleマップ遷移リンク） */}
              {m.address && (
                <a
                  href={
                    m.lat != null && m.lng != null
                      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address.replace(/\s.*$/, ''))}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-2 text-sm text-[var(--color-subtext)] active:text-[var(--color-text)] transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <MapPin size={20} strokeWidth={1.8} className="text-[var(--color-icon-gray)] shrink-0" />
                  <span className="flex-1">{m.address}</span>
                </a>
              )}
            </div>

            {/* 訪問ログ */}
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-2">訪問ログ</h3>
              {loading ? (
                <p className="text-sm text-[var(--color-subtext)]">読み込み中...</p>
              ) : visits.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)]">まだ訪問ログがありません</p>
              ) : (
                <div className="space-y-2">
                  {visits.map(v => (
                    <button
                      key={v.id}
                      onClick={() => router.push(`/visits/${v.id}`)}
                      className="block w-full text-left"
                    >
                      <div className="px-3 py-2.5 rounded-lg bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors flex items-center gap-2">
                        <span className="text-sm font-medium shrink-0">
                          {formatDate(v.visitedAt, 'yyyy年M月d日')}
                        </span>
                        {v.summary && (
                          <span className="text-xs text-[var(--color-subtext)] truncate">
                            {v.summary}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {m.totalVisits > 5 && (
                    <button
                      onClick={() => router.push(`/members/${m.id}`)}
                      className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1"
                    >
                      もっと見る <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 訪問記録ボタン */}
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={() => router.push(`/visits/new?memberId=${m.id}`)}
                className="ios-button bg-[#111] text-white w-full"
              >
                <Plus size={20} className="mr-2" />
                訪問を記録する
              </button>
            </div>
          </div>
        );
      }}
    </SwipeableBottomSheet>
  );
}
