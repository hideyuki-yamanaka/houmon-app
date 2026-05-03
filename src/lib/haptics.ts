// ──────────────────────────────────────────────────────────────
// haptics — 軽いタップ振動 (vibrate API)
//
// iOS Safari は vibrate 非対応 → no-op で何もしない。
// Android Chrome 等で 触覚フィードバック が出る。
// ──────────────────────────────────────────────────────────────

export function tapHaptic(durationMs: number = 10): void {
  if (typeof navigator === 'undefined') return;
  // Type-safe な参照: vibrate が無い環境もあるので optional chain
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(durationMs);
  } catch {
    // iOS や 一部環境で throw する可能性があるが UX に影響しないので握り潰す
  }
}
