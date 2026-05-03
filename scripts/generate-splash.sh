#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# iOS スプラッシュ画像 生成スクリプト
#
# public/icon-512x512.png を中央に配置した、各 iPhone 解像度の
# 起動画像を public/splash/ に生成する。
#
# 背景色: #F2F2F7 (manifest.json と揃える)
# アイコン色は元 PNG をそのまま使う (デザイン差し替えも自由)
#
# 必須: ImageMagick の `convert` コマンド
# ──────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON="$ROOT/public/icon-512x512.png"
OUT="$ROOT/public/splash"
BG="#F2F2F7"

CONVERT="${CONVERT_BIN:-/opt/ImageMagick/bin/convert}"
if ! command -v "$CONVERT" >/dev/null 2>&1; then
  CONVERT="$(command -v convert || true)"
fi
if [ -z "$CONVERT" ]; then
  echo "Error: ImageMagick convert not found" >&2
  exit 1
fi

mkdir -p "$OUT"

# WIDTH HEIGHT ICON_PX
SPECS=(
  "640 1136 256"   # iPhone SE 1st (5/5s/5c)
  "750 1334 300"   # iPhone 6/7/8/SE2/SE3
  "828 1792 320"   # iPhone XR / 11
  "1125 2436 400"  # iPhone X / XS / 11 Pro
  "1170 2532 420"  # iPhone 12/13/14
  "1179 2556 420"  # iPhone 14 Pro / 15 / 15 Pro
  "1242 2208 440"  # iPhone 6+/7+/8+
  "1242 2688 440"  # iPhone XS Max / 11 Pro Max
  "1284 2778 460"  # iPhone 12/13/14 Pro Max
  "1290 2796 460"  # iPhone 14 Pro Max / 15 Pro Max
)

for spec in "${SPECS[@]}"; do
  read -r W H I <<< "$spec"
  out_file="$OUT/apple-splash-${W}x${H}.png"
  "$CONVERT" -size "${W}x${H}" "xc:${BG}" \
    \( "$ICON" -resize "${I}x${I}" \) \
    -gravity center -composite \
    "$out_file"
  echo "  generated: $(basename "$out_file")"
done

echo "Done. ${#SPECS[@]} files in $OUT"
