'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Check, Loader2, Camera, X, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Member, Visit, VisitStatus, Respondent } from '../lib/types';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../lib/constants';
import { createVisit, updateVisit, uploadVisitImage } from '../lib/storage';
import { today } from '../lib/utils';
import TiptapEditor from './TiptapEditor';
import AddressIssueSection from './AddressIssueSection';
import AiAssistSheet, { type AiFieldRow } from './AiAssistSheet';

interface Props {
  member: Member;
  existingVisit?: Visit;
  initialDate?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ── Tiptap doc ⇄ 平文 (AI おまかせ入力の反映で使う) ──
// AI は平文で返してくるので、既存メモと繋いでから doc に組み直す。
function tiptapToPlainText(doc: Record<string, unknown> | undefined): string {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) return '';
  const lines: string[] = [];
  for (const node of doc.content as Record<string, unknown>[]) {
    if (!node || node.type !== 'paragraph') continue;
    const parts: string[] = [];
    for (const child of (node.content as Record<string, unknown>[] | undefined) ?? []) {
      if (child?.type === 'text' && typeof child.text === 'string') parts.push(child.text);
    }
    lines.push(parts.join(''));
  }
  return lines.join('\n').trim();
}

function plainTextToTiptap(text: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: text.split('\n').map(line => {
      const t = line.trim();
      return t ? { type: 'paragraph', content: [{ type: 'text', text: t }] } : { type: 'paragraph' };
    }),
  };
}

export default function VisitForm({ member, existingVisit, initialDate }: Props) {
  const router = useRouter();
  const [visitId, setVisitId] = useState<string | null>(existingVisit?.id ?? null);
  const [date, setDate] = useState(existingVisit?.visitedAt ?? initialDate ?? today());
  // 訪問時刻 (24時間表記、0-23、整数)。
  // 2026-05-05 ヒデさん指示で追加。1時間単位で十分との判断。
  // 2026-05-09 ヒデさん指示で 新規作成時は現在時刻を初期値にプリセット。
  // (既存ログ編集時は元の値を維持)
  const [hour, setHour] = useState<number | undefined>(
    existingVisit?.visitedHour ?? new Date().getHours(),
  );
  const [status, setStatus] = useState<VisitStatus>(existingVisit?.status ?? 'met_self');
  // 対応者(複数選択可) — 旧 single 'respondent' から配列に変更(2026-04-26)
  const [respondents, setRespondents] = useState<Respondent[]>(existingVisit?.respondents ?? []);
  const [notes, setNotes] = useState<Record<string, unknown> | undefined>(existingVisit?.notes);
  const [summary, setSummary] = useState(existingVisit?.summary ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [images, setImages] = useState<string[]>(existingVisit?.images ?? []);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]); // blob URLs for immediate preview
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // 手動「保存」ボタン押下時だけ出す完了トースト（自動保存では出さない）
  const [showSavedToast, setShowSavedToast] = useState(false);
  const manualSaveRef = useRef(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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
        // updates で渡ってきた status / visited_at を優先（state がまだ反映前の可能性があるため）
        const effectiveStatus = (updates.status as VisitStatus) ?? status;
        const effectiveDate = (updates.visited_at as string) ?? date;
        const visit = await createVisit(member.id, effectiveDate, effectiveStatus);
        setVisitId(visit.id);
        // 作成時に済ませられなかった残りの項目をまとめて 1 回で更新
        const extraUpdates: Record<string, unknown> = { ...updates };
        delete extraUpdates.status;
        delete extraUpdates.visited_at;
        if (respondents.length > 0 && extraUpdates.respondents === undefined) extraUpdates.respondents = respondents;
        if (notes && extraUpdates.notes === undefined) extraUpdates.notes = notes;
        if (summary && extraUpdates.summary === undefined) extraUpdates.summary = summary;
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
  }, [visitId, member.id, date, status, respondents, notes, summary]);

  // 手動保存ボタン: デバウンスをキャンセルして即保存
  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const updates: Record<string, unknown> = {
      status,
      visited_at: date,
    };
    if (respondents.length > 0) updates.respondents = respondents;
    if (notes) updates.notes = notes;
    if (summary) updates.summary = summary;
    if (images.length > 0) updates.images = images;
    manualSaveRef.current = true; // このセーブは手動 → 完了トースト出す対象
    save(updates);
  }, [save, status, date, respondents, notes, summary, images]);

  // saveState が 'saved' になったタイミングで、手動保存起因ならトースト表示
  useEffect(() => {
    if (saveState === 'saved' && manualSaveRef.current) {
      manualSaveRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setShowSavedToast(true);
      toastTimerRef.current = setTimeout(() => setShowSavedToast(false), 1800);
    }
  }, [saveState]);

  // トーストタイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
  // タップで on/off。現状の配列に含まれてれば外す、なければ追加。
  const handleRespondentToggle = (key: Respondent) => {
    const next = respondents.includes(key)
      ? respondents.filter(r => r !== key)
      : [...respondents, key];
    setRespondents(next);
    // 空配列の時は明示的に null を送って DB の値もクリアする
    debouncedSave({ respondents: next.length > 0 ? next : null }, true);
  };

  // 日付変更 → 即保存
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    debouncedSave({ visited_at: newDate }, true);
  };

  // 時刻変更 → 即保存。未設定 (空文字) は null を送って DB をクリア。
  const handleHourChange = (newHourRaw: string) => {
    const newHour = newHourRaw === '' ? undefined : Number(newHourRaw);
    setHour(newHour);
    debouncedSave({ visited_hour: newHour ?? null }, true);
  };

  // メモ変更 → デバウンス保存
  const handleNotesChange = (newNotes: Record<string, unknown>) => {
    setNotes(newNotes);
    debouncedSave({ notes: newNotes });
  };

  // ── AI おまかせ入力 (2026-08-09 ヒデさん指示) ──
  // 喋った内容を 日付/時刻/カテゴリ/対応者/メモ に振り分ける。
  // Tiptap は content プロップの後追い変更を見ないので、反映時に key を
  // 変えて作り直す (notesVersion)。
  const [notesVersion, setNotesVersion] = useState(0);

  const aiToRows = (f: Record<string, unknown>): AiFieldRow[] => {
    const rows: AiFieldRow[] = [];
    if (typeof f.visitedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.visitedAt)) {
      rows.push({ key: 'visitedAt', label: '日付', display: f.visitedAt, value: f.visitedAt });
    }
    if (typeof f.visitedHour === 'number' && f.visitedHour >= 0 && f.visitedHour <= 23) {
      rows.push({ key: 'visitedHour', label: '時刻', display: `${f.visitedHour}時`, value: f.visitedHour });
    }
    if (typeof f.status === 'string' && f.status in VISIT_STATUS_CONFIG) {
      const st = f.status as VisitStatus;
      rows.push({ key: 'status', label: 'カテゴリ', display: VISIT_STATUS_CONFIG[st].label, value: st });
    }
    if (Array.isArray(f.respondents)) {
      const list = (f.respondents as string[]).filter((r): r is Respondent => r in RESPONDENT_CONFIG);
      if (list.length > 0) {
        rows.push({
          key: 'respondents',
          label: '対応者',
          display: list.map(r => RESPONDENT_CONFIG[r].label).join('・'),
          value: list,
        });
      }
    }
    if (typeof f.memo === 'string' && f.memo.trim()) {
      rows.push({ key: 'memo', label: 'メモ', display: f.memo.trim(), value: f.memo.trim() });
    }
    return rows;
  };

  const applyAi = (rows: AiFieldRow[]) => {
    const get = (k: string) => rows.find(r => r.key === k)?.value;
    const updates: Record<string, unknown> = {};

    const newDate = get('visitedAt') as string | undefined;
    if (newDate) { setDate(newDate); updates.visited_at = newDate; }

    const newHour = get('visitedHour') as number | undefined;
    if (newHour !== undefined) { setHour(newHour); updates.visited_hour = newHour; }

    const newStatus = get('status') as VisitStatus | undefined;
    if (newStatus) { setStatus(newStatus); updates.status = newStatus; }

    const newResp = get('respondents') as Respondent[] | undefined;
    if (newResp) { setRespondents(newResp); updates.respondents = newResp.length > 0 ? newResp : null; }

    const memo = get('memo') as string | undefined;
    if (memo) {
      // 既存メモがあれば末尾に足す (上書きで消してしまわないように)
      const existing = tiptapToPlainText(notes);
      const merged = existing ? `${existing}\n${memo}` : memo;
      const doc = plainTextToTiptap(merged);
      setNotes(doc);
      setNotesVersion(v => v + 1);
      updates.notes = doc;
    }

    // 反映したものはそのまま保存まで通す (フォーム全体が自動保存方式のため)
    if (Object.keys(updates).length > 0) {
      if (!updates.status) updates.status = newStatus ?? status;
      if (!updates.visited_at) updates.visited_at = newDate ?? date;
      debouncedSave(updates, true);
    }
  };

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const fileArray = Array.from(files);

    // まずローカルプレビューを即座に表示（blob URL）
    const blobUrls = fileArray.map(f => URL.createObjectURL(f));
    setLocalPreviews(prev => [...prev, ...blobUrls]);

    // バックグラウンドでSupabaseにアップロード
    try {
      const newUrls: string[] = [];
      for (const file of fileArray) {
        const url = await uploadVisitImage(file);
        newUrls.push(url);
      }
      const updated = [...images, ...newUrls];
      setImages(updated);
      // アップロード成功 → blob URLをクリーンアップ
      setLocalPreviews(prev => prev.filter(u => !blobUrls.includes(u)));
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      debouncedSave({ images: updated }, true);
    } catch {
      setUploadError('写真のアップロードに失敗しました');
      // アップロード失敗してもプレビューは残す（ローカルのみ）
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 画像削除
  const handleImageRemove = (index: number) => {
    const allImages = [...images, ...localPreviews];
    const target = allImages[index];
    if (localPreviews.includes(target)) {
      // ローカルプレビューの削除
      setLocalPreviews(prev => prev.filter(u => u !== target));
      URL.revokeObjectURL(target);
    } else {
      // アップロード済み画像の削除
      const imgIndex = images.indexOf(target);
      if (imgIndex >= 0) {
        const updated = images.filter((_, i) => i !== imgIndex);
        setImages(updated);
        debouncedSave({ images: updated }, true);
      }
    }
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
          {member.name}さんへの訪問ログ
        </h1>
        <button
          type="button"
          onClick={handleManualSave}
          disabled={saveState === 'saving'}
          aria-label="保存"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#111] text-white text-[13px] font-bold px-3.5 py-1.5 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saveState === 'saving' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveState === 'saved' ? (
            <Check size={14} strokeWidth={2.4} />
          ) : null}
          保存
        </button>
      </nav>

      {/* フォーム本体 */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-[1366px] mx-auto px-4 pt-4 space-y-6">

          {/* AI おまかせ入力 (2026-08-09 ヒデさん指示)。
              喋った内容を 日付/時刻/カテゴリ/対応者/メモ に振り分けて、
              確認画面を挟んでからフォームに反映する。 */}
          <AiAssistSheet
            mode="visit"
            memberName={member.name}
            toRows={aiToRows}
            onApply={applyAi}
            buttonLabel="AIにおまかせで記録"
            placeholder={'例）今日の夕方5時ごろ訪問。本人は不在で、お母さんが出てきてくれた。最近は仕事が忙しいみたいで、帰りが遅いらしい。今度は日曜の昼に来てほしいと言われた。'}
          />

          {/* 日付 + 時刻 (時刻は 1時間単位、24時間表記、未設定可) */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">日付</label>
              <div className="inline-flex items-center gap-1.5 bg-white rounded-[10px] h-[44px] px-3">
                <input
                  type="date"
                  value={date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="bg-transparent outline-none text-[17px] text-[var(--color-text)] [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Calendar size={18} className="text-[var(--color-icon-gray)] shrink-0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">時刻</label>
              <select
                value={hour ?? ''}
                onChange={e => handleHourChange(e.target.value)}
                className="bg-white rounded-[10px] h-[44px] px-3 text-[17px] text-[var(--color-text)] outline-none"
              >
                <option value="">未設定</option>
                {Array.from({ length: 24 }, (_, i) => i).map(h => (
                  <option key={h} value={h}>{h}時</option>
                ))}
              </select>
            </div>
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
                    onClick={() => handleRespondentToggle(key)}
                    className={`chip ${respondents.includes(key) ? 'selected' : ''}`}
                    aria-pressed={respondents.includes(key)}
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
              // AI 反映で notes を外から差し替えた時、Tiptap は content プロップの
              // 変更を見ないので key を変えて作り直す
              key={notesVersion}
              content={notes}
              onChange={handleNotesChange}
            />
          </div>

          {/* 住所不明セクション (status='unknown_address' を選んだ時だけ表示)。
              ヒデさん指示 (2026-05-10): メモの下 に配置 (旧: 対応者の直後)。
              データはメンバー単位 (members.address_issue_*) で 訪問ログ詳細・
              メンバー詳細でも同じデータを編集する。 */}
          {status === 'unknown_address' && (
            <div className="ios-card overflow-hidden">
              <AddressIssueSection
                memberId={member.id}
                initialNote={member.addressIssueNote}
                initialResolved={member.addressIssueResolved}
              />
            </div>
          )}

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
            {/* アップロード済み画像 + ローカルプレビュー */}
            {(images.length > 0 || localPreviews.length > 0) && (
              <div className="flex gap-2 flex-wrap mb-3">
                {[...images, ...localPreviews].map((url, i) => (
                  <div key={i} className="relative w-[60px] h-20 rounded-lg overflow-hidden bg-[#F0F0F0]">
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
                    {localPreviews.includes(url) && uploading && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-red-500 mb-2">{uploadError}</p>
            )}
            <button
              type="button"
              className="p-4 w-full flex items-center justify-center gap-2 text-[var(--color-subtext)] rounded-xl border-2 border-dashed border-[#D0D0D0] active:bg-[#F5F5F5] transition-colors"
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

      {/* 保存完了トースト — 手動保存ボタン押下時だけフワッと出す。1.8秒で自動で消える */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-[60] transition-all duration-200 ${
          showSavedToast
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2'
        }`}
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2 bg-[#111] text-white rounded-full pl-3 pr-4 py-2.5 shadow-lg">
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={13} strokeWidth={3} className="text-white" />
          </span>
          <span className="text-sm font-bold">保存しました</span>
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
