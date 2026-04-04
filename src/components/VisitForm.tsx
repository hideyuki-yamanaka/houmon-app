'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Check, Loader2, Camera, X, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Member, Visit, VisitStatus, Respondent } from '../lib/types';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../lib/constants';
import { createVisit, updateVisit, uploadVisitImage } from '../lib/storage';
import { today } from '../lib/utils';
import TiptapEditor from './TiptapEditor';

interface Props {
  member: Member;
  existingVisit?: Visit;
  initialDate?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function VisitForm({ member, existingVisit, initialDate }: Props) {
  const router = useRouter();
  const [visitId, setVisitId] = useState<string | null>(existingVisit?.id ?? null);
  const [date, setDate] = useState(existingVisit?.visitedAt ?? initialDate ?? today());
  const [status, setStatus] = useState<VisitStatus>(existingVisit?.status ?? 'met');
  const [respondent, setRespondent] = useState<Respondent | undefined>(existingVisit?.respondent);
  const [notes, setNotes] = useState<Record<string, unknown> | undefined>(existingVisit?.notes);
  const [summary, setSummary] = useState(existingVisit?.summary ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [images, setImages] = useState<string[]>(existingVisit?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isCreatingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自動保存のコア関数
  const save = useCallback(async (updates: Record<string, unknown>) => {
    if (!visitId) {
      // まだ訪問レコードが作成されてない場合は作成
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;
      setSaveState('saving');
      try {
        const visit = await createVisit(member.id, date, status);
        setVisitId(visit.id);
        // 追加フィールドがあればすぐ更新
        const extraUpdates: Record<string, unknown> = {};
        if (respondent) extraUpdates.respondent = respondent;
        if (notes) extraUpdates.notes = notes;
        if (summary) extraUpdates.summary = summary;
        if (Object.keys(extraUpdates).length > 0) {
          await updateVisit(visit.id, extraUpdates);
        }
        setSaveState('saved');
      } catch {
        setSaveState('error');
      } finally {
        isCreatingRef.current = false;
      }
      return;
    }

    setSaveState('saving');
    try {
      await updateVisit(visitId, updates);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [visitId, member.id, date, status, respondent, notes, summary]);

  // デバウンス付き自動保存
  const debouncedSave = useCallback((updates: Record<string, unknown>, immediate = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (immediate) {
      save(updates);
    } else {
      saveTimerRef.current = setTimeout(() => save(updates), 1000);
    }
  }, [save]);

  // カテゴリ変更 → 即保存
  const handleStatusChange = (newStatus: VisitStatus) => {
    setStatus(newStatus);
    debouncedSave({ status: newStatus, visited_at: date }, true);
  };

  // 対応者変更 → 即保存
  const handleRespondentChange = (newRespondent: Respondent) => {
    setRespondent(newRespondent);
    debouncedSave({ respondent: newRespondent }, true);
  };

  // 日付変更 → 即保存
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    debouncedSave({ visited_at: newDate }, true);
  };

  // メモ変更 → デバウンス保存
  const handleNotesChange = (newNotes: Record<string, unknown>) => {
    setNotes(newNotes);
    debouncedSave({ notes: newNotes });
  };

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadVisitImage(file);
        newUrls.push(url);
      }
      const updated = [...images, ...newUrls];
      setImages(updated);
      debouncedSave({ images: updated }, true);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 画像削除
  const handleImageRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    debouncedSave({ images: updated }, true);
  };

  // ページ離脱時に未保存データを保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // synchronousに保存は難しいのでベストエフォート
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ナビバー */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-base font-bold truncate flex-1 text-center">
          {member.name} への訪問記録
        </h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      {/* フォーム本体 */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-[920px] mx-auto px-4 pt-4 space-y-6">

          {/* 日付 + 情報を見る */}
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">日付</label>
              <div className="inline-flex items-center gap-1.5 h-[44px] px-3">
                <input
                  type="date"
                  value={date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="bg-transparent outline-none text-[17px] text-[var(--color-text)]"
                />
                <Calendar size={18} className="text-[var(--color-icon-gray)] shrink-0" />
              </div>
            </div>
            <Link
              href={`/members/${member.id}`}
              className="flex items-center gap-1 text-sm text-[var(--color-primary)] whitespace-nowrap shrink-0 h-[44px]"
            >
              <User size={16} />
              情報を見る
            </Link>
          </div>

          {/* カテゴリ & 対応者 — PC: 2カラム / スマホ: 縦積み */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">カテゴリ</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(VISIT_STATUS_CONFIG) as [VisitStatus, typeof VISIT_STATUS_CONFIG[VisitStatus]][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    className={`chip ${status === key ? 'selected' : ''}`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">対応者</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(RESPONDENT_CONFIG) as [Respondent, typeof RESPONDENT_CONFIG[Respondent]][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleRespondentChange(key)}
                    className={`chip ${respondent === key ? 'selected' : ''}`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* メモ（Tiptapリッチテキスト） */}
          <div>
            <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">メモ</label>
            <TiptapEditor
              content={notes}
              onChange={handleNotesChange}
            />
          </div>

          {/* 画像アップロード */}
          <div>
            <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">写真</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            {/* アップロード済み画像 */}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {images.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#F0F0F0]">
                    <button type="button" onClick={() => setLightboxUrl(url)} className="w-full h-full">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleImageRemove(i); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="ios-card p-4 w-full flex items-center justify-center gap-2 text-[var(--color-subtext)] active:bg-[#F5F5F5] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-medium">アップロード中...</span>
                </>
              ) : (
                <>
                  <Camera size={20} />
                  <span className="text-sm font-medium">写真を追加</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ライトボックス（画像拡大表示） */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
