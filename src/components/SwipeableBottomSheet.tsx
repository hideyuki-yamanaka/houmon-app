'use client';

import { useRef, useState, useEffect, useCallback, useImperativeHandle, type ReactNode, type Ref } from 'react';

export type SheetSnap = 'closed' | 'mini' | 'peek' | 'full';

/** 親から imperative にスナップ位置を制御するハンドル */
export interface SheetHandle {
  snapTo: (snap: SheetSnap) => void;
  getSnap: () => SheetSnap;
}

interface Props {
  open: boolean;
  onClose: () => void;
  peekHeight: number; // px
  /**
   * mini スナップ時の可視高さ(px)。省略時は 'mini' スナップ無効。
   * 指定すると snapTo('mini') で peek よりさらに下がった小さい状態にできる。
   */
  miniHeight?: number;
  zIndex?: number;
  children: (snap: SheetSnap) => ReactNode;
  /** 親から snap を制御したい時の ref */
  handleRef?: Ref<SheetHandle>;
  /**
   * シートの上端の外側に浮かぶ要素（例: ストリートビューボタン）。
   * シートと同じ transform コンテナ内に配置されるため、シートの動きに追従する。
   * full スナップ時は透明化して非表示。
   */
  renderAbove?: (snap: SheetSnap) => ReactNode;
  /**
   * ジェスチャーで閉じれるか。false の場合、下にスワイプしても closed には行かず
   * peek に戻る（ホームの常時表示シート向け）。onClose は呼ばれない。
   * デフォルト true.
   */
  closable?: boolean;
  /**
   * 全画面(full)時のトップマージン。px 数値 or CSS calc 文字列。
   * 例: 100  /  'env(safe-area-inset-top)'
   * 小さくするとシートが画面上部ギリギリまで上がる（検索バーを覆う等）。
   * 省略時は 100。
   */
  topGap?: number | string;
}

const TAB_H = 60;
const DEFAULT_TOP_GAP: number = 100; // 全画面時のトップマージン（検索バー分）
const V_THRESHOLD = 0.4; // px/ms — スワイプ速度しきい値
const DRAG_THRESHOLD = 8; // px — ドラッグ開始しきい値（タップと区別）
const HANDLE_H = 28; // ハンドル領域の高さ（pill 本体 + 上下 padding のギリギリ）

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

export default function SwipeableBottomSheet({ open, onClose, peekHeight, miniHeight, zIndex = 40, children, renderAbove, closable = true, topGap = DEFAULT_TOP_GAP, handleRef }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
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
    // フォールバック: マウント前（string topGap は計算できないので 100 で近似）
    const topGapPx = typeof topGap === 'number' ? topGap : 100;
    if (typeof window !== 'undefined') {
      return Math.max(200, window.innerHeight - topGapPx - TAB_H);
    }
    return 600;
  }, [topGap]);

  const getSnapY = useCallback(
    (s: SheetSnap) => {
      const fh = getSheetHeight();
      if (s === 'full') return 0;
      if (s === 'peek') return Math.max(0, fh - peekHeight);
      if (s === 'mini') {
        // miniHeight 未指定なら peek と同じ高さに fallback
        const h = miniHeight ?? peekHeight;
        return Math.max(0, fh - h);
      }
      return fh + 40; // closed: 画面外（余裕を持たせる）
    },
    [peekHeight, miniHeight, getSheetHeight],
  );

  const applyY = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? SHEET_TRANSITION : 'none';
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  // 親から imperative にスナップ制御したい時の handle
  useImperativeHandle(
    handleRef,
    () => ({
      snapTo: (s: SheetSnap) => {
        if (s === snapRef.current) return;
        setSnap(s);
        applyY(getSnapY(s), true);
        if (s === 'closed') onCloseRef.current();
      },
      getSnap: () => snapRef.current,
    }),
    [setSnap, applyY, getSnapY],
  );

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
    const handle = dragHandleRef.current;
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
      const miniY = miniHeight != null ? getSnapY('mini') : null;
      const hasMini = miniY != null;

      let target: SheetSnap;
      if (vel > V_THRESHOLD) {
        // 高速下スワイプ: full→peek、peek→(mini or closed)、mini→closed
        if (snapRef.current === 'full') target = 'peek';
        else if (snapRef.current === 'peek') target = hasMini ? 'mini' : 'closed';
        else target = 'closed';
      } else if (vel < -V_THRESHOLD) {
        // 高速上スワイプ: 常に full（mini/peek/closed のどこからでも）
        target = 'full';
      } else {
        // 速度遅い → 最寄りのスナップ位置へ
        const pts: [SheetSnap, number][] = [['full', fullY], ['peek', peekY]];
        if (hasMini) pts.push(['mini', miniY!]);
        if (closable) pts.push(['closed', closedY]);
        pts.sort((a, b) => Math.abs(currentTY - a[1]) - Math.abs(currentTY - b[1]));
        target = pts[0][0];
      }

      // closable=false のシートは closed に落とさず mini or peek にとどめる
      if (!closable && target === 'closed') target = hasMini ? 'mini' : 'peek';

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
  }, [visible, getSnapY, applyY, setSnap, closable]);

  if (!visible) return null;

  return (
    <div
      ref={refCallback}
      className="fixed left-0 right-0 max-w-[1366px] mx-auto"
      style={{
        // CSS だけで border box を決める。JS は一切 height を触らない。
        // ブラウザが visualViewport に合わせて自動でサイズ調整する。
        top: typeof topGap === 'number' ? `${topGap}px` : topGap,
        bottom: `calc(${TAB_H}px + env(safe-area-inset-bottom))`,
        zIndex,
        // transform は JSX style に書かない（reconciler が触らないように）
        // ref callback で imperative にセットする
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        // この外側コンテナは overflow を clip しない。clip は内側の視覚シートで行う。
        // こうすることで renderAbove スロットをシート上端の外側に浮かべられる。
      }}
    >
      {/* シートの外・上側に浮かぶスロット（例: ストリートビューボタン）
          シートと同じ transform に乗るのでスワイプに追従する */}
      {renderAbove && (
        <div
          className="absolute left-4 transition-opacity duration-300"
          style={{
            bottom: 'calc(100% + 12px)',
            opacity: snap === 'full' ? 0 : 1,
            pointerEvents: snap === 'full' ? 'none' : 'auto',
          }}
        >
          {renderAbove(snap)}
        </div>
      )}

      {/* 視覚的なシート本体 — ここで bg / 角丸 / overflow clip を担当 */}
      <div
        className="absolute inset-0 bg-white bottom-sheet"
        style={{
          overflow: 'hidden',
          // GPU レイヤー昇格と独立した paint コンテキスト（内側だけに適用）
          contain: 'layout paint',
          // full スナップ時は角丸 0（画面上端まで伸びてる時に角丸があると不自然）。
          // それ以外は .bottom-sheet の 16px を維持。
          borderRadius: snap === 'full' ? '0' : undefined,
          transition: 'border-radius 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* ハンドルバー（ドラッグ領域） */}
        <div
          ref={dragHandleRef}
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
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
    </div>
  );
}
