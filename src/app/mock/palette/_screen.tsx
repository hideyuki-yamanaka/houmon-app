'use client';

// パレット 1 案分の "全部入りサンプル画面" を描画するコンポーネント。
//   - 色トークン swatch
//   - ダッシュボード「訪問ログ内訳」カード
//   - メンバーリスト 3行
//   - 訪問ステータス チップ row
//   - ボトムタブバー (見た目だけ)

import type { Palette } from './_palettes';
import { SAMPLE_BREAKDOWN, SAMPLE_MEMBERS } from './_palettes';
import { Footprints, Move, Search, Star, MapPin, CalendarDays, LayoutDashboard } from 'lucide-react';

export function PaletteScreen({ palette: p }: { palette: Palette }) {
  const c = SAMPLE_BREAKDOWN;
  const total =
    c.met_self + c.met_family + c.refused + c.absent + c.unknown + c.moved;
  const met = c.met_self + c.met_family + c.refused;
  const metRate = Math.round((met / total) * 100);
  const pct = (n: number) => Math.round((n / total) * 100);

  // 訪問ステータス チップ: outlined タイプ (border + text + dot)
  const STATUS_CHIPS: { key: keyof Palette['status']; label: string }[] = [
    { key: 'met', label: '本人に会えた' },
    { key: 'absent', label: '不在' },
    { key: 'refused', label: '拒否' },
    { key: 'unknown', label: '住所不明' },
    { key: 'moved', label: '転居' },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: p.base.bg,
        color: p.base.text,
        border: `1px solid ${p.base.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* ─── ヘッダー (パレット名 + 哲学) ─── */}
      <div className="px-5 pt-5 pb-3" style={{ background: p.base.card, borderBottom: `1px solid ${p.base.border}` }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: p.base.text }}>
          {p.name}
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: p.base.subtext }}>
          {p.philosophy}
        </p>
      </div>

      {/* ─── カラースワッチ ─── */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          ベース・プライマリ
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          <Swatch color={p.base.bg} label="bg" textColor={p.base.text} />
          <Swatch color={p.base.card} label="card" textColor={p.base.text} />
          <Swatch color={p.primary} label="primary" textColor="#FFFFFF" />
          <Swatch color={p.base.text} label="text" textColor="#FFFFFF" />
          <Swatch color={p.base.subtext} label="subtext" textColor="#FFFFFF" />
        </div>
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          ステータス (会えた / 不在 / 拒否 / 住所不明 / 転居)
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          <Swatch color={p.status.met.bar} label="met" textColor="#FFFFFF" />
          <Swatch color={p.status.absent.bar} label="absent" textColor="#FFFFFF" />
          <Swatch color={p.status.refused.bar} label="refused" textColor="#FFFFFF" />
          <Swatch color={p.status.unknown.bar} label="unknown" textColor="#FFFFFF" />
          <Swatch color={p.status.moved.bar} label="moved" textColor="#FFFFFF" />
        </div>
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          タグ・本部色
        </div>
        <div className="flex gap-2 flex-wrap">
          <Swatch color={p.tags.young.bg} label="young" textColor={p.tags.young.fg} />
          <Swatch color={p.tags.star} label="star" textColor="#FFFFFF" />
          <Swatch color={p.org.honbu.higashiAsahikawa} label="東旭川" textColor="#FFFFFF" />
          <Swatch color={p.org.honbu.toyooka} label="豊岡" textColor="#FFFFFF" />
          <Swatch color={p.org.honbu.sokaAsahi} label="旭創価" textColor="#FFFFFF" />
          <Swatch color={p.org.honbu.toei} label="東栄" textColor="#FFFFFF" />
        </div>
      </div>

      {/* ─── 検索バー (ヘッダー) ─── */}
      <div className="px-4 pt-4">
        <div
          className="rounded-full flex items-center h-11 px-4"
          style={{ background: p.base.card, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <Search size={18} style={{ color: p.base.subtext }} />
          <span className="ml-2 text-sm" style={{ color: p.base.subtext }}>
            名前・住所から検索
          </span>
        </div>
      </div>

      {/* ─── ダッシュボード breakdown カード ─── */}
      <div className="px-4 pt-4">
        <div
          className="rounded-xl p-5"
          style={{
            background: p.base.card,
            boxShadow:
              '0 -1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.09)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-bold leading-tight" style={{ color: p.base.text }}>
                訪問ログ内訳
              </h3>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: p.base.subtext }}>
                直近12週分
              </p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-medium" style={{ color: p.base.subtext }}>
                会えた確率
              </span>
              <span
                className="tabular-nums leading-none font-bold"
                style={{
                  color: p.base.text,
                  fontSize: '2.6rem',
                  letterSpacing: '-0.03em',
                }}
              >
                {metRate}
              </span>
              <span className="text-xs font-bold" style={{ color: p.base.text }}>
                %
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: p.base.subtext }}>
              カテゴリ別の割合
            </span>
            <span className="text-[11px] font-bold" style={{ color: p.base.text }}>
              全 {total} 件
            </span>
          </div>
          <div
            className="flex rounded-full overflow-hidden mb-3"
            style={{ height: '0.875rem', background: p.base.border }}
          >
            <div
              style={{
                width: `${(met / total) * 100}%`,
                backgroundColor: p.status.met.bar,
              }}
            />
            <div
              style={{
                width: `${(c.absent / total) * 100}%`,
                backgroundColor: p.status.absent.bar,
              }}
            />
            <div
              style={{
                width: `${(c.unknown / total) * 100}%`,
                backgroundColor: p.status.unknown.bar,
              }}
            />
            <div
              style={{
                width: `${(c.moved / total) * 100}%`,
                backgroundColor: p.status.moved.bar,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <BlockTile label="会えた" pct={pct(met)} sub={`本人 ${c.met_self} / 家族 ${c.met_family} / 拒否 ${c.refused}`} colors={p.status.met} />
            <BlockTile label="不在" pct={pct(c.absent)} sub={`${c.absent} 件`} colors={p.status.absent} />
            <BlockTile label="住所不明" pct={pct(c.unknown)} sub={`${c.unknown} 件`} colors={p.status.unknown} />
            <BlockTile label="転居" pct={pct(c.moved)} sub={`${c.moved} 件`} colors={p.status.moved} />
          </div>
        </div>
      </div>

      {/* ─── 訪問ステータス chip 行 (Outlined) ─── */}
      <div className="px-4 pt-4">
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          訪問ステータス チップ
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map(({ key, label }) => (
            <StatusChip key={key} label={label} colors={p.status[key]} cardBg={p.base.card} />
          ))}
        </div>
      </div>

      {/* ─── メンバーカードのリスト ─── */}
      <div className="px-4 pt-4">
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          メンバーリスト
        </div>
        <div className="flex flex-col gap-2">
          {SAMPLE_MEMBERS.map(m => (
            <MemberRow key={m.id} member={m} palette={p} />
          ))}
        </div>
      </div>

      {/* ─── ストリートビュー + ピン編集 ボタン (シート上の浮きボタン サンプル) ─── */}
      <div className="px-4 pt-4">
        <div className="text-[10px] font-bold mb-2" style={{ color: p.base.subtext }}>
          シート上 浮きボタン
        </div>
        <div className="flex items-end gap-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: p.base.card, boxShadow: '0 3px 10px rgba(0,0,0,0.22)' }}
          >
            <Footprints size={22} style={{ color: p.base.subtext }} />
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: p.base.card, boxShadow: '0 3px 10px rgba(0,0,0,0.22)' }}
          >
            <Move size={22} style={{ color: p.base.subtext }} />
          </div>
        </div>
      </div>

      {/* ─── ボトムタブバー (見た目だけ) ─── */}
      <div className="mt-5 pt-3 pb-4 border-t" style={{ borderColor: p.base.border, background: p.base.card }}>
        <div className="flex items-center justify-around">
          <TabItem icon={<MapPin size={22} strokeWidth={2.2} />} label="ホーム" active color={p.primary} subColor={p.base.subtext} />
          <TabItem icon={<CalendarDays size={22} strokeWidth={1.8} />} label="カレンダー" active={false} color={p.primary} subColor={p.base.subtext} />
          <TabItem icon={<LayoutDashboard size={22} strokeWidth={1.8} />} label="ダッシュボード" active={false} color={p.primary} subColor={p.base.subtext} />
        </div>
      </div>
    </div>
  );
}

// ─── サブコンポーネント ───

function Swatch({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <div
      className="rounded-md text-[9px] font-mono px-1.5 py-1 flex flex-col items-start justify-center min-w-[60px]"
      style={{ background: color, color: textColor, border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <span className="font-bold">{label}</span>
      <span className="opacity-80">{color}</span>
    </div>
  );
}

function BlockTile({
  label, pct, sub, colors,
}: { label: string; pct: number; sub: string; colors: { bar: string; text: string; bg: string } }) {
  return (
    <div className="rounded-xl p-3" style={{ background: colors.bg }}>
      <div className="text-[10px] font-bold" style={{ color: colors.text }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className="font-extrabold tabular-nums leading-none"
          style={{ color: colors.text, fontSize: '1.5rem', letterSpacing: '-0.04em' }}
        >
          {pct}
        </span>
        <span className="text-[11px] font-bold" style={{ color: colors.text }}>%</span>
      </div>
      <div className="text-[9px] mt-1" style={{ color: colors.text, opacity: 0.85 }}>
        {sub}
      </div>
    </div>
  );
}

function StatusChip({
  label, colors, cardBg,
}: { label: string; colors: { bar: string; text: string; bg: string }; cardBg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: cardBg,
        border: `1.5px solid ${colors.bar}`,
        color: colors.text,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: colors.bar }}
      />
      {label}
    </span>
  );
}

function MemberRow({
  member: m,
  palette: p,
}: {
  member: typeof SAMPLE_MEMBERS[number];
  palette: Palette;
}) {
  // 組織色: districtIdx >= 0 なら district色、 < 0 なら本部色
  const honbuKey = m.honbu;
  const honbuColor =
    honbuKey === '東旭川本部' ? p.org.honbu.higashiAsahikawa
    : honbuKey === '豊岡本部' ? p.org.honbu.toyooka
    : honbuKey === '旭創価本部' ? p.org.honbu.sokaAsahi
    : honbuKey === '東栄本部' ? p.org.honbu.toei
    : p.base.subtext;
  const orgColor = m.districtIdx >= 0 ? p.org.districts[m.districtIdx] : honbuColor;

  // ピン アイコン (シンプル)
  return (
    <div
      className="rounded-xl p-3 flex items-start gap-2.5"
      style={{
        background: p.base.card,
        borderLeft: `4px solid ${orgColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[9px] mb-0.5" style={{ color: p.base.subtext }}>
          {m.nameKana}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[15px] font-bold" style={{ color: p.base.text }}>
            {m.name}
          </span>
          <span className="text-xs" style={{ color: p.base.subtext }}>
            ({m.age})
          </span>
          {m.young && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
              style={{ background: p.tags.young.bg, color: p.tags.young.fg }}
            >
              ヤング
            </span>
          )}
        </div>
        <div
          className="inline-flex items-center text-[10px] mt-1.5 px-2 py-0.5 rounded-md"
          style={{ background: `${orgColor}1A`, color: orgColor }}
        >
          {m.honbu}・{m.bu}{m.district ? `・${m.district}` : ''}
        </div>
        <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: p.base.subtext }}>
          <MapPin size={10} /> {m.address}
        </div>
      </div>
      {m.wantToVisit && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: p.tags.starBg }}
        >
          <Star size={16} style={{ color: p.tags.star, fill: p.tags.star }} />
        </div>
      )}
    </div>
  );
}

function TabItem({
  icon, label, active, color, subColor,
}: { icon: React.ReactNode; label: string; active: boolean; color: string; subColor: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ color: active ? color : subColor }}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}
