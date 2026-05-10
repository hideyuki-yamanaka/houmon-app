'use client';

// 印刷レイアウト 5案。それぞれ A4 横の中に納まる JSX。
// 共通サンプルメンバー + 訪問ログを受け取って描画する。

import type { MemberWithVisitInfo, Visit } from '../../lib/types';
import { STATUS_GRID_ITEMS } from '../../lib/constants';
import {
  PRINT_COLORS as C,
  VISIT_STATUS_COLOR,
  VISIT_STATUS_LABEL,
  RESPONDENT_LABEL,
} from './PrintShell';

type Props = { member: MemberWithVisitInfo; visits: Visit[]; pageNo?: number; pageTotal?: number };

// ─────────────────────────────────────────────
// 共通: ステータス軸を評価
// ─────────────────────────────────────────────
function evaluateStatuses(member: MemberWithVisitInfo) {
  const rec = member as unknown as Record<string, string | null | undefined>;
  return STATUS_GRID_ITEMS.map(item => ({
    key: item.key,
    label: item.label,
    level: item.evaluate(rec),
    raw: rec[item.key] ?? rec[snake(item.key)] ?? null,
  }));
}
function snake(s: string) { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }

const LEVEL_MARK: Record<string, string> = { good: '○', mid: '△', bad: '×', unknown: '−' };
function levelStyle(level: string) {
  const v = level === 'good' ? C.good : level === 'mid' ? C.mid : level === 'bad' ? C.bad : C.unk;
  return { background: v.bg, borderColor: v.border, color: v.text };
}

// ─────────────────────────────────────────────
// 案1: 2 カラム (現状) — 左に基本情報+メモ / 右にステータス+訪問ログ
// ─────────────────────────────────────────────
export function Layout1({ member: m, visits, pageNo = 1, pageTotal = 1 }: Props) {
  const statuses = evaluateStatuses(m);
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '12mm 14mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* ヘッダー */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1pt solid ${C.border}`, paddingBottom: '4mm', marginBottom: '6mm' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10pt', color: C.muted, marginBottom: '1mm' }}>{m.nameKana}</div>
          <h1 style={{ fontSize: '22pt', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'baseline', gap: '2mm', flexWrap: 'wrap' }}>
            {m.name}
            {m.age != null && <span style={{ fontSize: '13pt', fontWeight: 500, color: C.sub }}>（{m.age}歳）</span>}
            {m.category === 'young' && <YoungTag />}
          </h1>
          <div style={{ marginTop: '1.5mm', fontSize: '11pt', color: C.sub }}>{orgLine}</div>
        </div>
        <div style={{ textAlign: 'right', maxWidth: '100mm', fontSize: '11pt', color: C.sub }}>
          <div>{m.address}</div>
          <div style={{ fontSize: '9pt', color: C.muted, marginTop: '1mm' }}>訪問サイクル {m.visitCycleDays}日 / 通算 {m.totalVisits} 回</div>
        </div>
      </header>
      {/* 本体 2 カラム */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8mm', flex: 1 }}>
        <div>
          <SectionTitle>基本情報</SectionTitle>
          <BasicInfoList m={m} />
          <SectionTitle mt>情報メモ</SectionTitle>
          <MemoBullets lines={infoLines} />
        </div>
        <div>
          <SectionTitle>ステータス</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2mm' }}>
            {statuses.map(s => (
              <div key={s.key} style={{ ...levelStyle(s.level), border: `0.5pt solid`, borderRadius: '1.5mm', padding: '2mm 2.5mm', minHeight: '14mm' }}>
                <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted, marginBottom: '1mm' }}>{s.label}</div>
                <div style={{ fontSize: '16pt', fontWeight: 800, lineHeight: 1 }}>{LEVEL_MARK[s.level]}</div>
                {s.raw && s.raw !== '（不明）' && <div style={{ fontSize: '8pt', color: C.sub, marginTop: '1mm' }}>{s.raw}</div>}
              </div>
            ))}
          </div>
          <SectionTitle mt sub={`直近 ${visits.length}件 / 全${m.totalVisits}件`}>訪問ログ</SectionTitle>
          <VisitList visits={visits.slice(0, 5)} />
        </div>
      </div>
      {/* フッター */}
      <Footer today={today} pageNo={pageNo} pageTotal={pageTotal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案2: 横3段構成 (新聞風) — 上=ヘッダ大 / 中=ステータス横一列 / 下=メモ|訪問ログ
// ─────────────────────────────────────────────
export function Layout2({ member: m, visits, pageNo = 1, pageTotal = 1 }: Props) {
  const statuses = evaluateStatuses(m);
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '11mm 13mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* ヘッダー帯 (フル幅・大きめ) */}
      <header style={{ background: C.bg, borderRadius: '2mm', padding: '5mm 7mm', marginBottom: '5mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8mm' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10pt', color: C.muted, marginBottom: '0.5mm' }}>{m.nameKana}</div>
            <h1 style={{ fontSize: '26pt', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'baseline', gap: '3mm', flexWrap: 'wrap' }}>
              {m.name}
              {m.age != null && <span style={{ fontSize: '14pt', fontWeight: 500, color: C.sub }}>（{m.age}歳）</span>}
              {m.category === 'young' && <YoungTag />}
            </h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10pt', color: C.sub, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: '11pt' }}>{orgLine}</div>
            <div>{m.address}</div>
            <div style={{ fontSize: '9pt', color: C.muted }}>訪問サイクル {m.visitCycleDays}日 / 通算 {m.totalVisits}回</div>
          </div>
        </div>
      </header>
      {/* ステータス帯 (横一列、各 1 ブロック狭め) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2mm', marginBottom: '6mm' }}>
        {statuses.map(s => (
          <div key={s.key} style={{ ...levelStyle(s.level), border: `0.6pt solid`, borderRadius: '1.5mm', padding: '2mm', textAlign: 'center', minHeight: '18mm', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted }}>{s.label}</div>
            <div style={{ fontSize: '20pt', fontWeight: 800, lineHeight: 1 }}>{LEVEL_MARK[s.level]}</div>
            {s.raw && s.raw !== '（不明）' && <div style={{ fontSize: '7pt', color: C.sub, marginTop: '1mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.raw}</div>}
          </div>
        ))}
      </div>
      {/* 下段 2 カラム: 基本情報+メモ / 訪問ログ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '8mm', flex: 1, minHeight: 0 }}>
        <div>
          <SectionTitle>基本情報</SectionTitle>
          <BasicInfoList m={m} />
          <SectionTitle mt>情報メモ</SectionTitle>
          <MemoBullets lines={infoLines} />
        </div>
        <div>
          <SectionTitle sub={`直近 ${visits.length}件 / 全${m.totalVisits}件`}>訪問ログ</SectionTitle>
          <VisitList visits={visits.slice(0, 5)} />
        </div>
      </div>
      <Footer today={today} pageNo={pageNo} pageTotal={pageTotal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案3: ステータス重視ダッシュボード — 左に大きいステータス / 右に詳細
// ─────────────────────────────────────────────
export function Layout3({ member: m, visits, pageNo = 1, pageTotal = 1 }: Props) {
  const statuses = evaluateStatuses(m);
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・');
  const today = new Date().toISOString().slice(0, 10);
  const goodCount = statuses.filter(s => s.level === 'good').length;
  const totalCount = statuses.length;

  return (
    <div style={{ padding: '11mm 13mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
        <div>
          <div style={{ fontSize: '10pt', color: C.muted }}>{m.nameKana}</div>
          <h1 style={{ fontSize: '22pt', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
            {m.name}
            {m.age != null && <span style={{ fontSize: '13pt', fontWeight: 500, color: C.sub }}>（{m.age}歳）</span>}
            {m.category === 'young' && <YoungTag />}
          </h1>
          <div style={{ fontSize: '10pt', color: C.sub, marginTop: '1mm' }}>{orgLine} ・ {m.address}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9pt', color: C.muted }}>
          <div>訪問サイクル {m.visitCycleDays}日 / 通算 {m.totalVisits}回</div>
          {m.lastVisitDate && <div style={{ marginTop: '1mm' }}>最終訪問 {m.lastVisitDate}</div>}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '7mm', flex: 1, minHeight: 0 }}>
        {/* 左: ステータス (大きめ 4 列) + 達成率サマリ */}
        <div>
          <SectionTitle sub={`達成 ${goodCount} / ${totalCount}`}>ステータス</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3mm' }}>
            {statuses.map(s => (
              <div key={s.key} style={{ ...levelStyle(s.level), border: `0.6pt solid`, borderRadius: '2mm', padding: '4mm 5mm', minHeight: '24mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '11pt', fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: '24pt', fontWeight: 900, lineHeight: 1 }}>{LEVEL_MARK[s.level]}</div>
                </div>
                {s.raw && s.raw !== '（不明）' && <div style={{ fontSize: '8.5pt', color: C.sub, marginTop: '1.5mm' }}>{s.raw}</div>}
              </div>
            ))}
          </div>
        </div>
        {/* 右: 基本情報 + メモ + 訪問ログ要約 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SectionTitle>基本情報</SectionTitle>
          <BasicInfoList m={m} compact />
          <SectionTitle mt>情報メモ</SectionTitle>
          <MemoBullets lines={infoLines.slice(0, 4)} />
          <SectionTitle mt sub={`直近 ${Math.min(visits.length, 3)}件`}>訪問ログ</SectionTitle>
          <VisitList visits={visits.slice(0, 3)} compact />
        </div>
      </div>
      <Footer today={today} pageNo={pageNo} pageTotal={pageTotal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案4: タイムライン重視 — 左に基本情報コンパクト / 右に訪問ログ詳細タイムライン
// ─────────────────────────────────────────────
export function Layout4({ member: m, visits, pageNo = 1, pageTotal = 1 }: Props) {
  const statuses = evaluateStatuses(m);
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '11mm 13mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <header style={{ borderBottom: `1pt solid ${C.border}`, paddingBottom: '3mm', marginBottom: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '10pt', color: C.muted }}>{m.nameKana}</div>
          <h1 style={{ fontSize: '22pt', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
            {m.name}
            {m.age != null && <span style={{ fontSize: '13pt', fontWeight: 500, color: C.sub }}>（{m.age}歳）</span>}
            {m.category === 'young' && <YoungTag />}
          </h1>
          <div style={{ fontSize: '10pt', color: C.sub, marginTop: '1mm' }}>{orgLine} ・ {m.address}</div>
        </div>
        <div style={{ fontSize: '9pt', color: C.muted, textAlign: 'right' }}>
          訪問サイクル {m.visitCycleDays}日 / 通算 {m.totalVisits}回
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8mm', flex: 1, minHeight: 0 }}>
        {/* 左: 基本情報 + ステータス (簡易) + メモ */}
        <div>
          <SectionTitle>基本情報</SectionTitle>
          <BasicInfoList m={m} compact />
          <SectionTitle mt>ステータス</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1mm' }}>
            {statuses.map(s => (
              <div key={s.key} style={{ ...levelStyle(s.level), border: `0.5pt solid`, borderRadius: '1mm', padding: '1.5mm 1mm', textAlign: 'center' }}>
                <div style={{ fontSize: '7.5pt', fontWeight: 700, color: C.muted }}>{s.label}</div>
                <div style={{ fontSize: '13pt', fontWeight: 800, lineHeight: 1 }}>{LEVEL_MARK[s.level]}</div>
              </div>
            ))}
          </div>
          <SectionTitle mt>情報メモ</SectionTitle>
          <MemoBullets lines={infoLines} />
        </div>
        {/* 右: 訪問ログをタイムライン風に */}
        <div style={{ minHeight: 0 }}>
          <SectionTitle sub={`直近 ${visits.length}件 / 全${m.totalVisits}件`}>訪問タイムライン</SectionTitle>
          <div style={{ position: 'relative', paddingLeft: '6mm' }}>
            <div style={{ position: 'absolute', left: '2mm', top: '2mm', bottom: '2mm', width: '0.5pt', background: C.border }} />
            {visits.slice(0, 5).map(v => {
              const sCol = VISIT_STATUS_COLOR[v.status];
              const respondents = (v.respondents ?? []).map(r => RESPONDENT_LABEL[r]).join('・');
              return (
                <div key={v.id} style={{ position: 'relative', marginBottom: '4mm' }}>
                  <div style={{ position: 'absolute', left: '-5mm', top: '1mm', width: '3mm', height: '3mm', borderRadius: '50%', background: sCol.border, border: `1pt solid #FFFFFF`, boxShadow: `0 0 0 0.5pt ${C.border}` }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', marginBottom: '0.8mm' }}>
                    <div style={{ fontSize: '11pt', fontWeight: 800 }}>{v.visitedAt}{v.visitedHour != null && ` ${v.visitedHour}時`}</div>
                    <span style={{ fontSize: '8.5pt', fontWeight: 700, border: `0.6pt solid ${sCol.border}`, color: sCol.text, padding: '0.2mm 1.5mm', borderRadius: '5mm' }}>
                      {VISIT_STATUS_LABEL[v.status]}
                    </span>
                    {respondents && <span style={{ fontSize: '9pt', color: C.muted }}>対応 {respondents}</span>}
                  </div>
                  {v.summary && <div style={{ fontSize: '10pt', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{v.summary}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer today={today} pageNo={pageNo} pageTotal={pageTotal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案5: ミニマル名簿風 (情報密度高め・表組み)
// ─────────────────────────────────────────────
export function Layout5({ member: m, visits, pageNo = 1, pageTotal = 1 }: Props) {
  const statuses = evaluateStatuses(m);
  const infoLines = (m.info ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const orgLine = [m.honbu, m.bu, m.district].filter(Boolean).join('・');
  const today = new Date().toISOString().slice(0, 10);

  const Cell = ({ label, value }: { label: string; value?: string | null }) => (
    <>
      <div style={{ fontSize: '8.5pt', fontWeight: 700, color: C.muted, padding: '1.2mm 2.5mm', borderRight: `0.4pt solid ${C.borderSoft}`, borderBottom: `0.4pt solid ${C.borderSoft}`, background: '#FAFAFA' }}>{label}</div>
      <div style={{ fontSize: '10pt', padding: '1.2mm 2.5mm', borderBottom: `0.4pt solid ${C.borderSoft}` }}>{value || '—'}</div>
    </>
  );

  return (
    <div style={{ padding: '10mm 12mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* 細めヘッダー */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1.5pt solid ${C.text}`, paddingBottom: '2mm', marginBottom: '4mm' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3mm', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 800, margin: 0 }}>{m.name}</h1>
          {m.age != null && <span style={{ fontSize: '11pt', color: C.sub }}>（{m.age}歳）</span>}
          <span style={{ fontSize: '9pt', color: C.muted }}>{m.nameKana}</span>
          {m.category === 'young' && <YoungTag />}
        </div>
        <div style={{ fontSize: '10pt', color: C.sub }}>{orgLine}</div>
      </header>
      {/* 4 カラム表組み */}
      <div style={{ display: 'grid', gridTemplateColumns: '24mm 1fr 24mm 1fr', border: `0.5pt solid ${C.borderSoft}`, marginBottom: '5mm' }}>
        <Cell label="住所" value={m.address} />
        <Cell label="電話" value={m.phone} />
        <Cell label="携帯" value={m.mobile} />
        <Cell label="生年月日" value={m.birthday} />
        <Cell label="役職" value={m.role} />
        <Cell label="勤務先" value={m.workplace} />
        <Cell label="家族" value={m.family} />
        <Cell label="入会日" value={m.enrollmentDate} />
        <Cell label="サイクル" value={`${m.visitCycleDays}日 / 通算${m.totalVisits}回`} />
      </div>
      {/* ステータスを表 1 行で */}
      <div style={{ marginBottom: '5mm' }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted, marginBottom: '1.5mm' }}>ステータス</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: `0.5pt solid ${C.borderSoft}` }}>
          {statuses.map((s, i) => (
            <div key={s.key} style={{ ...levelStyle(s.level), padding: '2mm 2mm', textAlign: 'center', borderRight: i < statuses.length - 1 ? `0.4pt solid ${C.borderSoft}` : undefined }}>
              <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted }}>{s.label}</div>
              <div style={{ fontSize: '15pt', fontWeight: 800, lineHeight: 1 }}>{LEVEL_MARK[s.level]}</div>
              {s.raw && s.raw !== '（不明）' && <div style={{ fontSize: '7pt', color: C.sub, marginTop: '0.5mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.raw}</div>}
            </div>
          ))}
        </div>
      </div>
      {/* 情報メモ + 訪問ログ 横並び */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '6mm', flex: 1, minHeight: 0 }}>
        <div>
          <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted, marginBottom: '1.5mm' }}>情報メモ</div>
          <MemoBullets lines={infoLines} />
        </div>
        <div>
          <div style={{ fontSize: '9pt', fontWeight: 700, color: C.muted, marginBottom: '1.5mm' }}>
            訪問ログ <span style={{ fontWeight: 500, color: C.muted }}>(直近{visits.length}件 / 全{m.totalVisits}件)</span>
          </div>
          {/* 訪問ログを表組みで */}
          <div style={{ border: `0.5pt solid ${C.borderSoft}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '24mm 22mm 16mm 1fr', background: '#FAFAFA', borderBottom: `0.5pt solid ${C.borderSoft}` }}>
              <Th>日時</Th><Th>状態</Th><Th>対応</Th><Th>備考</Th>
            </div>
            {visits.slice(0, 5).map(v => {
              const sCol = VISIT_STATUS_COLOR[v.status];
              const respondents = (v.respondents ?? []).map(r => RESPONDENT_LABEL[r]).join('・');
              return (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '24mm 22mm 16mm 1fr', borderBottom: `0.4pt solid ${C.borderSoft}` }}>
                  <Td>{v.visitedAt}{v.visitedHour != null && ` ${v.visitedHour}時`}</Td>
                  <Td>
                    <span style={{ fontSize: '8.5pt', fontWeight: 700, border: `0.5pt solid ${sCol.border}`, color: sCol.text, padding: '0.1mm 1.2mm', borderRadius: '5mm' }}>
                      {VISIT_STATUS_LABEL[v.status]}
                    </span>
                  </Td>
                  <Td>{respondents || '—'}</Td>
                  <Td>{v.summary}</Td>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer today={today} pageNo={pageNo} pageTotal={pageTotal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// サブコンポーネント
// ─────────────────────────────────────────────
function YoungTag() {
  return (
    <span style={{ fontSize: '10pt', fontWeight: 700, background: C.young, color: '#FFFFFF', padding: '0.5mm 2mm', borderRadius: '2mm', letterSpacing: '0.04em', marginLeft: '2mm' }}>
      ヤング
    </span>
  );
}

function SectionTitle({ children, sub, mt }: { children: React.ReactNode; sub?: string; mt?: boolean }) {
  return (
    <h2 style={{ fontSize: '12pt', fontWeight: 700, margin: mt ? '6mm 0 2mm' : '0 0 2mm', paddingBottom: '1mm', borderBottom: `0.5pt solid ${C.border}`, display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
      {children}
      {sub && <span style={{ fontSize: '9pt', fontWeight: 500, color: C.muted }}>（{sub}）</span>}
    </h2>
  );
}

function BasicInfoList({ m, compact }: { m: MemberWithVisitInfo; compact?: boolean }) {
  const items: { label: string; value?: string | null }[] = [
    { label: '読み仮名', value: m.nameKana },
    { label: '生年月日', value: m.birthday },
    { label: '入会日', value: m.enrollmentDate },
    { label: '役職', value: m.role },
    { label: '勤務先', value: m.workplace },
    { label: '家族', value: m.family },
    { label: '電話', value: m.phone },
    { label: '携帯', value: m.mobile },
  ].filter(it => it.value);
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: compact ? '20mm 1fr' : '22mm 1fr', gap: '1mm 3mm', margin: 0 }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt style={{ fontSize: compact ? '9pt' : '9.5pt', color: C.muted }}>{it.label}</dt>
          <dd style={{ fontSize: compact ? '10pt' : '10.5pt', margin: 0, wordBreak: 'break-all' }}>{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
import React from 'react';

function MemoBullets({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <div style={{ fontSize: '10pt', color: C.muted, fontStyle: 'italic' }}>記入なし</div>;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {lines.map((line, i) => (
        <li key={i} style={{ fontSize: '10.5pt', margin: '0 0 1.2mm', paddingLeft: '4mm', position: 'relative', lineHeight: 1.55 }}>
          <span style={{ position: 'absolute', left: 0, color: C.muted }}>・</span>
          {line.replace(/^[・•·]\s*/, '')}
        </li>
      ))}
    </ul>
  );
}

function VisitList({ visits, compact }: { visits: Visit[]; compact?: boolean }) {
  if (visits.length === 0) return <div style={{ fontSize: '10pt', color: C.muted, fontStyle: 'italic' }}>訪問ログがありません</div>;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {visits.map(v => {
        const sCol = VISIT_STATUS_COLOR[v.status];
        const respondents = (v.respondents ?? []).map(r => RESPONDENT_LABEL[r]).join('・');
        return (
          <li key={v.id} style={{ borderLeft: `1.5pt solid ${C.primary}`, padding: compact ? '0.5mm 0 1mm 2.5mm' : '1mm 0 1.5mm 3mm', marginBottom: compact ? '1.5mm' : '2mm' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', flexWrap: 'wrap', marginBottom: '0.6mm' }}>
              <span style={{ fontSize: compact ? '9.5pt' : '10pt', fontWeight: 700 }}>{v.visitedAt}{v.visitedHour != null && ` ${v.visitedHour}時`}</span>
              <span style={{ fontSize: compact ? '8pt' : '8.5pt', fontWeight: 700, border: `0.6pt solid ${sCol.border}`, color: sCol.text, padding: '0.2mm 1.5mm', borderRadius: '5mm' }}>
                {VISIT_STATUS_LABEL[v.status]}
              </span>
              {respondents && <span style={{ fontSize: compact ? '8.5pt' : '9pt', color: C.muted }}>対応 {respondents}</span>}
            </div>
            {v.summary && <div style={{ fontSize: compact ? '9.5pt' : '10pt', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{v.summary}</div>}
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ today, pageNo, pageTotal }: { today: string; pageNo: number; pageTotal: number }) {
  return (
    <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5pt solid ${C.borderSoft}`, paddingTop: '2.5mm', marginTop: '5mm', fontSize: '8.5pt', color: C.muted }}>
      <span>家庭訪問アプリ — 出力日 {today}</span>
      <span>{pageNo} / {pageTotal}</span>
    </footer>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '8.5pt', fontWeight: 700, color: C.muted, padding: '1.2mm 2mm', borderRight: `0.4pt solid ${C.borderSoft}` }}>{children}</div>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '9.5pt', padding: '1.5mm 2mm', borderRight: `0.4pt solid ${C.borderSoft}`, lineHeight: 1.4, wordBreak: 'break-all' }}>{children}</div>;
}
