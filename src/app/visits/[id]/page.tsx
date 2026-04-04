'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Visit } from '../../../lib/types';
import { getVisitById, softDeleteVisit } from '../../../lib/storage';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../../../lib/constants';
import { formatDate } from '../../../lib/utils';
import type { VisitStatus, Respondent } from '../../../lib/types';

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [visit, setVisit] = useState<(Visit & { memberName: string; memberDistrict: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchVisit = useCallback(() => {
    getVisitById(id)
      .then(setVisit)
      .catch(() => setVisit(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchVisit(); }, [fetchVisit]);

  // 編集画面から戻ったときにデータを再取得
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchVisit();
    };
    const handlePopState = () => fetchVisit();
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('focus', fetchVisit);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('focus', fetchVisit);
    };
  }, [fetchVisit]);

  const handleDelete = async () => {
    if (!visit || deleting) return;
    if (!confirm('この訪問記録をゴミ箱に移動しますか？')) return;
    setDeleting(true);
    try {
      await softDeleteVisit(visit.id);
      router.back();
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">訪問記録が見つかりません</p>
      </div>
    );
  }

  const statusConfig = VISIT_STATUS_CONFIG[visit.status as VisitStatus];
  const respondentConfig = visit.respondent ? RESPONDENT_CONFIG[visit.respondent as Respondent] : null;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ナビバー */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-base font-bold truncate flex-1 text-center">訪問ログ</h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-4 py-4 space-y-4">

          {/* メンバー名 + 地区 */}
          <Link href={`/members/${visit.memberId}`} className="block">
            <div className="ios-card px-4 py-3 flex items-center gap-2 active:bg-[#F5F5F5] transition-colors">
              <span className="font-bold text-[15px]">{visit.memberName}</span>
              <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
              <span className="flex-1" />
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                {visit.memberDistrict.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
              </span>
            </div>
          </Link>

          {/* 訪問情報カード */}
          <div className="ios-card p-4 space-y-4 hover:!opacity-100">
            {/* 日付 + 編集ボタン */}
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-[10px] text-[var(--color-subtext)] mb-1">日付</div>
                <div className="text-sm font-medium">{formatDate(visit.visitedAt, 'yyyy年M月d日')}</div>
              </div>
              <Link
                href={`/visits/new?memberId=${visit.memberId}&visitId=${visit.id}`}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
              >
                <Pencil size={18} className="text-gray-500" />
              </Link>
            </div>

            {/* カテゴリ & 対応者 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-[var(--color-subtext)] mb-1">カテゴリ</div>
                {statusConfig ? (
                  <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-subtext)]">—</span>
                )}
              </div>
              <div>
                <div className="text-[10px] text-[var(--color-subtext)] mb-1">対応者</div>
                {respondentConfig ? (
                  <span className="text-sm font-medium">{respondentConfig.label}</span>
                ) : (
                  <span className="text-sm text-[var(--color-subtext)]">—</span>
                )}
              </div>
            </div>

            {/* サマリー / メモ */}
            {visit.summary && (
              <div>
                <div className="text-[10px] text-[var(--color-subtext)] mb-1">メモ</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{visit.summary}</p>
              </div>
            )}

            {/* 写真 */}
            {visit.images && visit.images.length > 0 && (
              <div>
                <div className="text-[10px] text-[var(--color-subtext)] mb-1">写真</div>
                <div className="flex gap-2 flex-wrap">
                  {visit.images.map((url, i) => (
                    <div key={i} className="w-[60px] h-20 rounded-lg overflow-hidden bg-[#F0F0F0]">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 削除ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 py-2 px-3 text-[var(--color-subtext)] hover:opacity-70 active:opacity-50 transition-opacity text-sm font-medium"
            >
              <Trash2 size={14} />
              {deleting ? '削除中...' : 'ゴミ箱に移動'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
