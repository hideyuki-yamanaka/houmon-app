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

// iOS / Google Maps風の上品なバネ感（emphasized decelerate）
const SHEET_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SHEET_DURATION_MS = 380;
const SHEET_TRANSITION = `transform ${SHEET_DURATION_MS}ms ${SHEET_EASE}`;

// ──────────────────────────────────────────────────────────────
// 設計メモ（重要: iPhone でガクガクする真の原因と対策）
// ──────────────────────────────────────────────────────────────
// [過去の失敗]
//   JSX のインラインスタイルに `height: fullHRef.current` を書いていた。
//   iOS Safari は URL バーの伸縮時に visualViewport.resize を発火し、そのたびに
//   React が forceRender → 新しい height が DOM に書き込まれる → レイアウト再計算
//   → 380ms transition 中にコンポジターレイヤーが無効化 → ガクガク。
//
// [今回の設計]
//   1. sheet の border box は CSS の `top` と `bottom` だけで決める。
//      `top: TOP_GAP; bottom: calc(TAB_H + safe-area-inset-bottom)`。
//      ブラウザが visualViewport に合わせて自動で高さ調整する。JS は一切触らない。
//   2. React のインラインスタイルから `height` を完全に削除。
//      SwipeableBottomSheet が再レンダーされても、sheet DOM の height 属性は
//      変化しない → レイアウト再計算なし → transform レイヤー安定。
//   3. Transform は常に imperative に書く。resize 時も React 経由せず
//      直接 DOM を更新して現在の snap 位置を再計算する。
//   4. getSnapY は sheetRef.current.offsetHeight を直接読む（DOM truth）。
//      React state や ref キャッシュに頼らない。DOM が唯一の source of truth。
// ──────────────────────────────────────────────────────────────

export default function SwipeableBottomSheet({ open, onClose, peekHeight, zIndex = 40, children }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
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

  // DOM から直接高さを読む。CSS の top/bottom 指定で自動計算されたサイズ。
  const getSheetHeight = useCallback(() => {
    const el = sheetRef.current;
    if (el) return el.offsetHeight;
    // フォールバック: マウント前
    if (typeof window !== 'undefined') {
      return Math.max(200, window.innerHeight - TOP_GAP - TAB_H);
    }
    return 600;
  }, []);

  const getSnapY = useCallback(
    (s: SheetSnap) => {
      const fh = getSheetHeight();
      if (s === 'full') return 0;
      if (s === 'peek') return Math.max(0, fh - peekHeight);
      return fh + 40; // closed: 画面外（余裕を持たせる）
    },
    [peekHeight, getSheetHeight],
  );

  const applyY = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? SHEET_TRANSITION : 'none';
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  // ref callback: DOM マウント直後に同期で初期 transform をセット
  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      sheetRef.current = el;
      if (el) {
        // 現在の snap（初回は 'closed'）に応じた位置でマウント
        const y = getSnapY(snapRef.current);
        el.style.transition = 'none';
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      }
    },
    [getSnapY],
  );

  // open/close の制御
  useEffect(() => {
    if (open) {
      if (!visible) {
        snapRef.current = 'closed';
        _setSnap('closed');
        setVisible(true);
      }
    } else if (visible) {
      // 閉じアニメ
      applyY(getSnapY('closed'), true);
      setSnap('closed');
      const t = window.setTimeout(() => setVisible(false), SHEET_DURATION_MS + 20);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // マウント後、一度だけ peek へアニメ
  useEffect(() => {
    if (!visible) return;
    // setTimeout(0) で次のマクロタスクへ。paint を 1 frame 走らせてから transition を適用。
    const id = window.setTimeout(() => {
      applyY(getSnapY('peek'), true);
      setSnap('peek');
    }, 0);
    return () => window.clearTimeout(id);
  }, [visible, applyY, getSnapY, setSnap]);

  // resize 対応: React 再レンダーは一切しない。DOM を直接更新して現在 snap を再適用。
  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      if (!sheetRef.current) return;
      // transition: none で即時適用（resize 中のアニメは不要）
      applyY(getSnapY(snapRef.current), false);
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [visible, applyY, getSnapY]);

  // コンテンツの touchAction 動的管理
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !visible) return;

    if (snap !== 'full') {
      content.style.touchAction = 'none';
      return;
    }

    const update = () => {
      content.style.touchAction = content.scrollTop <= 0 ? 'none' : 'pan-y';
    };
    update();
    content.addEventListener('scroll', update, { passive: true });
    return () => content.removeEventListener('scroll', update);
  }, [visible, snap]);

  // タッチジェスチャー
  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!sheet || !handle || !visible) return;

    let dragging = false;
    let confirmed = false;
    let startY = 0;
    let startTY = 0;
    let currentTY = getSnapY(snapRef.current);
    let lastY = 0;
    let lastT = 0;
    let vel = 0;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      currentTY = getSnapY(snapRef.current);
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

      if (!confirmed) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return;
        if (snapRef.current === 'full') {
          const scrollTop = content?.scrollTop ?? 0;
          if (scrollTop > 1 || dy < 0) {
            dragging = false;
            return;
          }
        }
        confirmed = true;
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
      if (!confirmed) return;

      const peekY = getSnapY('peek');
      const fullY = getSnapY('full');
      const closedY = getSnapY('closed');

      let target: SheetSnap;
      if (vel > V_THRESHOLD) {
        target = snapRef.current === 'full' ? 'peek' : 'closed';
      } else if (vel < -V_THRESHOLD) {
        target = 'full';
      } else {
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
      ref={refCallback}
      className="fixed left-0 right-0 bg-white max-w-[1366px] mx-auto bottom-sheet"
      style={{
        // CSS だけで border box を決める。JS は一切 height を触らない。
        // ブラウザが visualViewport に合わせて自動でサイズ調整する。
        top: `${TOP_GAP}px`,
        bottom: `calc(${TAB_H}px + env(safe-area-inset-bottom))`,
        zIndex,
        overflow: 'hidden',
        // transform は JSX style に書かない（reconciler が触らないように）
        // ref callback で imperative にセットする
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        // GPU レイヤー昇格と独立した paint コンテキスト
        contain: 'layout paint',
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
        }}
      >
        {children(snap)}
      </div>
    </div>
  );
}
