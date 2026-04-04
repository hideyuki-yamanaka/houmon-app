'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Plus, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';
import { formatDate } from '../lib/utils';
import { getVisits } from '../lib/storage';

interface Props {
  member: MemberWithVisitInfo | null;
  onClose: () => void;
}

export default function MemberBottomSheet({ member, onClose }: Props) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [displayedMember, setDisplayedMember] = useState<MemberWithVisitInfo | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (member) {
      setDisplayedMember(member);
      // 少し遅延させてスライドアップ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else if (displayedMember) {
      // 閉じるアニメーション
      setShow(false);
      const timer = setTimeout(() => setDisplayedMember(null), 300);
      return () => clearTimeout(timer);
    }
  }, [member]);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    getVisits(member.id)
      .then(v => setVisits(v.slice(0, 3)))
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, [member?.id]);

  if (!displayedMember) return null;

  const m = displayedMember;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        ref={sheetRef}
        className={`absolute bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 bg-white bottom-sheet max-w-[920px] mx-auto pointer-events-auto transition-transform duration-300 ease-out ${
          show ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bottom-sheet-handle" />

        {/* ヘッダー: 名前 + 地区 */}
        <div className="px-4 pt-2 pb-3">
          <Link
            href={`/members/${m.id}`}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 flex-1">
              <h2 className="text-lg font-bold">{m.name}</h2>
              <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                {m.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
              </span>
              <span className="flex items-center gap-1 text-sm text-[var(--color-subtext)]">
                <Clock size={16} strokeWidth={1.8} />
                {m.lastVisitDate
                  ? `${formatDate(m.lastVisitDate, 'M/d')}（${m.totalVisits}回）`
                  : '未訪問'}
              </span>
            </div>
          </Link>

          {/* 住所（Googleマップ遷移リンク） */}
          {m.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-2 text-sm text-[var(--color-subtext)] active:text-[var(--color-text)] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <MapPin size={16} strokeWidth={1.8} className="text-[var(--color-icon-gray)] shrink-0" />
              <span className="flex-1">{m.address}</span>
            </a>
          )}
        </div>

        {/* 訪問ログ */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-xs font-semibold text-[var(--color-subtext)] mb-2">訪問ログ</h3>
          {loading ? (
            <p className="text-sm text-[var(--color-subtext)]">読み込み中...</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-[var(--color-subtext)]">まだ訪問記録がありません</p>
          ) : (
            <div className="space-y-2">
              {visits.map(v => {
                const statusConfig = VISIT_STATUS_CONFIG[v.status];
                return (
                  <Link key={v.id} href={`/visits/${v.id}`} className="block">
                    <div className="p-3 rounded-lg bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatDate(v.visitedAt, 'M/d')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      {v.summary && (
                        <p className="text-xs text-[var(--color-subtext)] mt-1 line-clamp-2">{v.summary}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
              {m.totalVisits > 3 && (
                <Link
                  href={`/members/${m.id}`}
                  className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1"
                >
                  もっと見る <ChevronRight size={16} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 訪問記録ボタン */}
        <div className="px-4 pb-4 pt-2">
          <Link
            href={`/visits/new?memberId=${m.id}`}
            className="ios-button bg-[#111] text-white"
          >
            <Plus size={20} className="mr-2" />
            訪問を記録する
          </Link>
        </div>
      </div>
    </div>
  );
}
