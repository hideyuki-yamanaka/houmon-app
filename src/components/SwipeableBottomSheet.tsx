'use client';

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

export type SheetSnap = 'closed' | 'peek' | 'full';

interface Props {
  open: boolean;
  onClose: () => void;
  peekHeight: number; // px
  zIndex?: number;
  children: (snap: SheetSnap) => ReactNode;
}

const TAB_H = 60;
const TOP_GAP = 100; // 全画面時のトップマージン（検索バー分）
const V_THRESHOLD = 0.4; // px/ms — スワイプ速度しきい値
const DRAG_THRESHOLD = 8; // px — ドラッグ開始しきい値（タップと区別）
const HANDLE_H = 44; // ハンドル領域の高さ

export default function SwipeableBottomSheet({ open, onClose, peekHeight, zIndex = 40, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [snap, _setSnap] = useState<SheetSnap>('closed');
  const snapRef = useRef<SheetSnap>('closed');
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const setSnap = useCallback((s: SheetSnap) => {
    snapRef.current = s;
    _setSnap(s);
  }, []);

  const getFullH = useCallback(
    () => (typeof window !== 'undefined' ? window.innerHeight - TOP_GAP - TAB_H : 600),
    [],
  );

  const getSnapY = useCallback(
    (s: SheetSnap) => {
      const fh = getFullH();
      if (s === 'full') return 0;
      if (s === 'peek') return Math.max(0, fh - peekHeight);
      return fh + 20; // closed: 画面外
    },
    [getFullH, peekHeight],
  );

  const applyY = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate
      ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    el.style.transform = `translateY(${y}px)`;
  }, []);

  // ── open/close 制御 ──
  useEffect(() => {
    if (open) {
      setVisible(true);
      applyY(getSnapY('closed'), false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSnap('peek');
          applyY(getSnapY('peek'), true);
        });
      });
    } else if (visible) {
      setSnap('closed');
      applyY(getSnapY('closed'), true);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── タッチジェスチャー ──
  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!sheet || !handle || !visible) return;

    let dragging = false;
    let confirmed = false; // ドラッグ確定フラグ（DRAGしきい値超え）
    let startY = 0;
    let startTY = 0;
    let currentTY = getSnapY(snapRef.current);
    let lastY = 0;
    let lastT = 0;
    let vel = 0;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const isHandle = handle.contains(e.target as Node);
      const isContent = content?.contains(e.target as Node);

      // full モード: ハンドルからのみドラッグ開始
      // peek モード: シート全体からドラッグ可能
      if (snapRef.current === 'full' && !isHandle) return;
      if (!isHandle && !isContent) return;

      startY = touch.clientY;
      startTY = currentTY;
      lastY = touch.clientY;
      lastT = Date.now();
      vel = 0;
      dragging = true;
      confirmed = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      const dy = touch.clientY - startY;

      // ドラッグしきい値未満 → まだ確定しない（タップの可能性）
      if (!confirmed) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return;
        confirmed = true;
        // 開始位置をリセットしてジャンプ防止
        startY = touch.clientY;
        startTY = currentTY;
      }

      const now = Date.now();
      const dt = now - lastT;
      if (dt > 0) vel = (touch.clientY - lastY) / dt;
      lastY = touch.clientY;
      lastT = now;

      const closedY = getSnapY('closed');
      currentTY = Math.max(0, Math.min(closedY, startTY + (touch.clientY - startY)));
      applyY(currentTY, false);
      e.preventDefault();
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;

      // ドラッグ未確定 = タップ → 何もしない
      if (!confirmed) return;

      const peekY = getSnapY('peek');
      const fullY = getSnapY('full');
      const closedY = getSnapY('closed');

      let target: SheetSnap;

      if (vel > V_THRESHOLD) {
        // 下スワイプ
        target = snapRef.current === 'full' ? 'peek' : 'closed';
      } else if (vel < -V_THRESHOLD) {
        // 上スワイプ
        target = 'full';
      } else {
        // 最も近いスナップポイントへ
        const pts: [SheetSnap, number][] = [
          ['full', fullY],
          ['peek', peekY],
          ['closed', closedY],
        ];
        pts.sort((a, b) => Math.abs(currentTY - a[1]) - Math.abs(currentTY - b[1]));
        target = pts[0][0];
      }

      setSnap(target);
      currentTY = getSnapY(target);
      applyY(currentTY, true);
      if (target === 'closed') onCloseRef.current();
    };

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
    };
  }, [visible, getSnapY, applyY, setSnap]);

  if (!visible) return null;

  return (
    <div
      ref={sheetRef}
      className="fixed left-0 right-0 bg-white max-w-[1366px] mx-auto bottom-sheet"
      style={{
        bottom: `calc(${TAB_H}px + env(safe-area-inset-bottom))`,
        height: getFullH(),
        zIndex,
        overflow: 'hidden',
      }}
    >
      {/* ハンドルバー（ドラッグ領域） */}
      <div
        ref={handleRef}
        className="flex justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none', minHeight: HANDLE_H }}
      >
        <div className="w-9 h-[5px] rounded-full bg-gray-300" />
      </div>

      {/* コンテンツ */}
      <div
        ref={contentRef}
        style={{
          height: `calc(100% - ${HANDLE_H}px)`,
          overflowY: snap === 'full' ? 'auto' : 'hidden',
          overflowX: 'hidden',
          touchAction: snap === 'full' ? 'pan-y' : 'none',
        }}
      >
        {children(snap)}
      </div>
    </div>
  );
}
