'use client';

/**
 * 検索UIの比較プレビューページ
 *
 * 検索バーにキーワードを入れると、モックデータに対して
 *   - 名前 / ふりがな / 住所 / 職場 / 地区 / 情報(info) / 備考(notes) / 家族 / 訪問ログsummary
 * を横断検索し、ヒットした箇所をハイライトして 5パターンの UI で並べて見せる。
 *
 * ユーザー(非エンジニア)に「どのUI好み？」を選んでもらうため、
 * 本番実装の前にこのページで見た目を吟味する。
 */

import { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  MapPin,
  FileText,
  Calendar,
  User,
  Briefcase,
  Users as UsersIcon,
  X,
  StickyNote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ════════════════════════════════════════════════════════
//  モックデータ
// ════════════════════════════════════════════════════════

type MockMember = {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  honbu: string;
  district: string;
  role?: string;
  address?: string;
  workplace?: string;
  family?: string;
  info?: string;
  notes?: string;
};

type MockVisit = {
  id: string;
  memberId: string;
  visitedAt: string;
  status: 'met' | 'absent' | 'refused';
  summary?: string;
};

const MOCK_MEMBERS: MockMember[] = [
  {
    id: 'ym-toei-01',
    name: '下山 夢斗',
    nameKana: 'しもやま ゆめと',
    age: 28,
    honbu: '東栄本部',
    district: '豊岡朝日川地区',
    role: '男子部',
    address: '旭川市豊岡3条5丁目',
    workplace: 'ユニクロ永山店',
    info: 'ニコニコした顔立ちで、髪の短い男の子。創価大経済学部出身、現在は創価大通信教育課程に在籍しながら学びを継続中。ユニクロ永山店で働いている(パートか社員かは不明)。元々軽いうつ傾向があったが、ユニクロの社員昇格試験に落ちたあたりから悪化し、以降は表舞台に出られない状態に。',
    notes: '坂本さん要注意案件',
  },
  {
    id: 'ym-toei-04',
    name: '沼畑 裕一',
    nameKana: 'ぬまはた ゆういち',
    age: 30,
    honbu: '東栄本部',
    district: '豊岡朝日川地区',
    role: '男子部',
    address: '旭川市豊岡2条1丁目',
    workplace: '建築関係(作業着姿)',
    info: 'お父さんが早年部の本部長。昔はちょくちょく会合に顔を出していた。2〜3年前くらいから、付き合っている女性と同棲中で実家に不在の状態が続く。拓殖大学北海道短期大学出身。',
    family: '父: 早年本部長',
  },
  {
    id: 'ym-toei-07',
    name: '山本 悠人',
    nameKana: 'やまもと ゆうと',
    age: 29,
    honbu: '東栄本部',
    district: '豊岡朝日川地区',
    role: '男子部長(愛称)',
    address: '旭川市豊岡1条4丁目',
    workplace: '医療道具販売',
    info: 'パーマでチリチリの髪、メガネをかけた小柄な男性。元々は牧口県にいたが、約1年前に英光圏エリアへ引越してきた。仕事は医療道具販売で、夜遅くまで働いており活動参加は少ない。出張で下川や遠方まで飛び回っているので、話しかけたら面白い話が聞けそう。',
  },
  {
    id: 'ym-toei-09',
    name: '木田 洋一',
    nameKana: 'きだ よういち',
    age: 27,
    honbu: '東栄本部',
    district: '豊岡朝日川地区',
    role: '男子部',
    address: '旭川市豊岡4条2丁目',
    workplace: '幼稚園送迎(運転手)',
    info: '創建長の息子さん。坂本さんの高校の同級生。高校卒業後に札幌に出たが、札幌で精神的に病んで仕事ができなくなり旭川へ帰郷。現在は幼稚園か保育園の子どもたちの送迎業務に就いている。うつ気味で病院にも通院中。',
    notes: '病院通院中',
  },
  {
    id: 'ym-asahi-04',
    name: '下田 一輝',
    nameKana: 'しもだ かずき',
    age: 26,
    honbu: '旭創価本部',
    district: '神楽地区',
    role: '男子部',
    address: '旭川市神楽岡7条4丁目',
    info: '坂本さんの幼馴染。あんまり学会活動に積極的ではないタイプ。家にいないことが多く、動きがトリッキー(友達とシェアハウスを始めたり、あちこち移動している)。LINEでの連絡はつく。',
    family: '一人暮らし(シェアハウス)',
  },
  {
    id: 'ym-asahi-05',
    name: '森島 正樹',
    nameKana: 'もりしま まさき',
    age: 29,
    honbu: '旭創価本部',
    district: '神居地区',
    role: '男子部',
    address: '旭川市神居5条11丁目',
    workplace: 'トレーラー運転手',
    info: '茨城の森島さんの弟さん。同じトレーラー運転手をしている。兄から内地で一緒にやらないかと誘われたが、俺は北海道がいいと残って現在の仕事を続けている。',
  },
  {
    id: 'ym-hga-05',
    name: '伊藤 直樹',
    nameKana: 'いとう なおき',
    age: 31,
    honbu: '東旭川本部',
    district: '朝日川豊岡地区',
    role: '男子部',
    address: '旭川市東旭川町1条3丁目',
    workplace: '地元企業(営業)',
    info: '東旭川本部で坂本さんが唯一把握している方。坂本さん曰く「東朝日川本部で分かるのは伊藤さんぐらい」。東旭川本部の訪問はまずこの方から開始するのが現実的。',
    family: '母と同居',
  },
  {
    id: 'ym-hga-02',
    name: '田中 翔',
    nameKana: 'たなか しょう',
    age: 28,
    honbu: '東旭川本部',
    district: '豊川地区',
    role: '男子部',
    address: '札幌市中央区(名簿備考に「札幌在住?」)',
    info: '名簿備考に「札幌在住?」と記載。坂本さんも「札幌にいるみたい」と確認。現状、旭川での訪問は難しい。',
  },
];

const MOCK_VISITS: MockVisit[] = [
  { id: 'v1', memberId: 'ym-toei-01', visitedAt: '2026-02-15', status: 'absent', summary: '朝日川の公園前を通った際に不在。また来週訪問予定。' },
  { id: 'v2', memberId: 'ym-toei-01', visitedAt: '2026-01-20', status: 'refused', summary: 'お母さんが対応。本人は病院から帰宅後寝ているとのこと。また時間置いて来ます。' },
  { id: 'v3', memberId: 'ym-toei-04', visitedAt: '2026-03-05', status: 'absent', summary: '仕事で不在。建築現場に入っているとのこと。' },
  { id: 'v4', memberId: 'ym-toei-07', visitedAt: '2026-03-20', status: 'met', summary: '仕事で忙しい様子。朝日川の新居に引っ越したばかりとのこと。医療関係の仕事で出張多い。' },
  { id: 'v5', memberId: 'ym-toei-09', visitedAt: '2026-02-28', status: 'met', summary: '病院帰りに少し話せた。通院はまだ続いている。焦らず行きましょうと声かけ。' },
  { id: 'v6', memberId: 'ym-asahi-04', visitedAt: '2026-04-01', status: 'absent', summary: 'シェアハウス訪問するも不在。友達経由でLINE送っておいた。' },
  { id: 'v7', memberId: 'ym-asahi-05', visitedAt: '2026-03-10', status: 'met', summary: 'トレーラーの運転で北海道内を回っているので、次回は会える時間調整してから。' },
  { id: 'v8', memberId: 'ym-hga-05', visitedAt: '2026-04-12', status: 'met', summary: '東旭川町の自宅にて対応。朝日川地区のメンバー把握状況について教えてもらう。' },
  { id: 'v9', memberId: 'ym-hga-05', visitedAt: '2026-02-05', status: 'met', summary: 'お母さんも一緒にお会いできた。家族で温かい雰囲気。' },
  { id: 'v10', memberId: 'ym-toei-04', visitedAt: '2026-01-15', status: 'absent', summary: '同棲相手の家におり実家不在。大学時代の友人経由で連絡試みる。' },
];

// ════════════════════════════════════════════════════════
//  マッチ検出ロジック
// ════════════════════════════════════════════════════════

interface SearchMatch {
  field: string;
  fieldLabel: string;
  fieldIcon: LucideIcon;
  text: string;
  visitedAt?: string;
}

interface SearchHit {
  member: MockMember;
  matches: SearchMatch[];
}

function searchAll(query: string, members: MockMember[], visits: MockVisit[]): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const m of members) {
    const matches: SearchMatch[] = [];

    if (m.name.toLowerCase().includes(q))
      matches.push({ field: 'name', fieldLabel: '名前', fieldIcon: User, text: m.name });
    if (m.nameKana.toLowerCase().includes(q))
      matches.push({ field: 'nameKana', fieldLabel: 'ふりがな', fieldIcon: User, text: m.nameKana });
    if (m.district.toLowerCase().includes(q))
      matches.push({ field: 'district', fieldLabel: '地区', fieldIcon: MapPin, text: m.district });
    if (m.address?.toLowerCase().includes(q))
      matches.push({ field: 'address', fieldLabel: '住所', fieldIcon: MapPin, text: m.address });
    if (m.workplace?.toLowerCase().includes(q))
      matches.push({ field: 'workplace', fieldLabel: '職場', fieldIcon: Briefcase, text: m.workplace });
    if (m.family?.toLowerCase().includes(q))
      matches.push({ field: 'family', fieldLabel: '家族', fieldIcon: UsersIcon, text: m.family ?? '' });
    if (m.info?.toLowerCase().includes(q))
      matches.push({ field: 'info', fieldLabel: '情報', fieldIcon: FileText, text: extractContext(m.info, q) });
    if (m.notes?.toLowerCase().includes(q))
      matches.push({ field: 'notes', fieldLabel: '備考', fieldIcon: StickyNote, text: extractContext(m.notes, q) });

    const memberVisits = visits.filter(v => v.memberId === m.id);
    for (const v of memberVisits) {
      if (v.summary?.toLowerCase().includes(q)) {
        matches.push({
          field: 'visit',
          fieldLabel: '訪問ログ',
          fieldIcon: Calendar,
          text: extractContext(v.summary, q),
          visitedAt: v.visitedAt,
        });
      }
    }

    if (matches.length > 0) hits.push({ member: m, matches });
  }
  return hits;
}

function extractContext(text: string, query: string, window = 28): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 60);
  const start = Math.max(0, idx - window);
  const end = Math.min(text.length, idx + query.length + window);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

// ════════════════════════════════════════════════════════
//  ハイライト用コンポーネント
// ════════════════════════════════════════════════════════

function Highlight({ text, query, className = '' }: { text: string; query: string; className?: string }) {
  if (!query) return <span className={className}>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? (
            <mark key={i} className="bg-yellow-200 text-black font-semibold rounded-sm px-0.5">
              {p}
            </mark>
          )
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// アバター(頭文字)
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.replace(/\s/g, '').charAt(0);
  const dim =
    size === 'sm' ? 'w-8 h-8 text-[12px]'
    : size === 'lg' ? 'w-14 h-14 text-[20px]'
    : 'w-10 h-10 text-[14px]';
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-bold flex items-center justify-center shrink-0 shadow-sm`}>
      {initial}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  パターン 1: コンパクト行 (Spotlight風)
// ════════════════════════════════════════════════════════

function PatternCompactList({ hits, query }: { hits: SearchHit[]; query: string }) {
  return (
    <ul className="divide-y divide-[#F0F0F0] bg-white rounded-lg overflow-hidden">
      {hits.flatMap(hit =>
        hit.matches.map((match, i) => {
          const Icon = match.fieldIcon;
          return (
            <li key={`${hit.member.id}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={hit.member.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-[14px]">
                    <Highlight text={hit.member.name} query={query} />
                  </span>
                  <span className="text-[10px] text-[var(--color-subtext)] truncate">
                    {hit.member.honbu}/{hit.member.district}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                  <Icon size={11} className="text-[var(--color-subtext)] shrink-0" />
                  <span className="text-[10px] text-[var(--color-subtext)] shrink-0">{match.fieldLabel}{match.visitedAt ? ` ${match.visitedAt.slice(5)}` : ''}:</span>
                  <span className="text-[12px] text-[var(--color-text)] truncate ml-1">
                    <Highlight text={match.text} query={query} />
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--color-icon-gray)] shrink-0" />
            </li>
          );
        })
      )}
    </ul>
  );
}

// ════════════════════════════════════════════════════════
//  パターン 2: 拡張カード (既存MemberCard + snippet)
// ════════════════════════════════════════════════════════

function PatternExpandedCard({ hits, query }: { hits: SearchHit[]; query: string }) {
  return (
    <div className="space-y-2">
      {hits.map(hit => (
        <div key={hit.member.id} className="bg-white rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 flex items-center gap-3">
            <Avatar name={hit.member.name} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">
                <Highlight text={hit.member.nameKana} query={query} />
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px]">
                  <Highlight text={hit.member.name} query={query} />
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                  <Highlight text={hit.member.district} query={query} />
                </span>
                <span className="text-[10px] text-[var(--color-subtext)]">{hit.member.age}歳</span>
                <span className="text-[10px] text-[var(--color-subtext)]">{hit.member.honbu}</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--color-icon-gray)]" />
          </div>
          <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] px-3 py-2 space-y-1.5">
            {hit.matches.slice(0, 3).map((match, i) => {
              const Icon = match.fieldIcon;
              return (
                <div key={i} className="flex gap-2 text-[12px] items-start">
                  <Icon size={12} className="text-[var(--color-subtext)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--color-subtext)] mr-1">
                      {match.fieldLabel}{match.visitedAt ? ` ・${match.visitedAt}` : ''}
                    </span>
                    <span className="leading-snug">
                      <Highlight text={match.text} query={query} />
                    </span>
                  </div>
                </div>
              );
            })}
            {hit.matches.length > 3 && (
              <div className="text-[10px] text-[var(--color-subtext)] pl-5">
                他に {hit.matches.length - 3} 件のマッチ
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  パターン 3: タグ + スニペット束
// ════════════════════════════════════════════════════════

function PatternTagged({ hits, query }: { hits: SearchHit[]; query: string }) {
  return (
    <div className="space-y-2">
      {hits.map(hit => {
        const uniqueFields = Array.from(new Set(hit.matches.map(m => m.fieldLabel)));
        return (
          <div key={hit.member.id} className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {uniqueFields.map(f => (
                <span key={f} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900">
                  {f}にヒット
                </span>
              ))}
              <span className="text-[10px] text-[var(--color-subtext)] ml-auto">
                {hit.matches.length}箇所
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={hit.member.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]">
                  <Highlight text={hit.member.name} query={query} />
                </div>
                <div className="text-[10px] text-[var(--color-subtext)] truncate">
                  {hit.member.honbu} / {hit.member.district} / {hit.member.age}歳
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-icon-gray)]" />
            </div>
            <div className="space-y-1 pl-10">
              {hit.matches.map((match, i) => (
                <div key={i} className="text-[12px] leading-snug">
                  <span className="text-[10px] text-[var(--color-subtext)] mr-1">
                    ・{match.fieldLabel}{match.visitedAt ? ` ${match.visitedAt.slice(5)}` : ''}:
                  </span>
                  <Highlight text={match.text} query={query} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  パターン 4: 2カラム (左=プロフィール / 右=マッチ文)
// ════════════════════════════════════════════════════════

function PatternTwoColumn({ hits, query }: { hits: SearchHit[]; query: string }) {
  return (
    <div className="space-y-2">
      {hits.map(hit => (
        <div key={hit.member.id} className="bg-white rounded-lg overflow-hidden flex">
          <div className="w-[38%] border-r border-[#F0F0F0] bg-[#FAFAFA] px-3 py-3 flex flex-col items-center gap-2 shrink-0">
            <Avatar name={hit.member.name} size="lg" />
            <div className="text-center min-w-0">
              <div className="font-bold text-[14px] leading-tight">
                <Highlight text={hit.member.name} query={query} />
              </div>
              <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">
                <Highlight text={hit.member.nameKana} query={query} />
              </div>
              <div className="text-[10px] text-[var(--color-subtext)] mt-1">{hit.member.age}歳</div>
              <div className="text-[10px] text-[var(--color-subtext)] leading-tight mt-1">
                <Highlight text={hit.member.district} query={query} />
              </div>
            </div>
          </div>
          <div className="flex-1 px-3 py-3 space-y-2 min-w-0">
            {hit.matches.slice(0, 3).map((match, i) => {
              const Icon = match.fieldIcon;
              return (
                <div key={i} className="text-[12px]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon size={10} className="text-[var(--color-subtext)]" />
                    <span className="text-[10px] font-semibold text-[var(--color-subtext)]">
                      {match.fieldLabel}{match.visitedAt ? ` (${match.visitedAt})` : ''}
                    </span>
                  </div>
                  <div className="text-[12px] leading-snug">
                    <Highlight text={match.text} query={query} />
                  </div>
                </div>
              );
            })}
            {hit.matches.length > 3 && (
              <div className="text-[10px] text-[var(--color-subtext)]">
                +他に {hit.matches.length - 3} 件
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  パターン 5: アコーディオン (閉じ小・開いて全マッチ)
// ════════════════════════════════════════════════════════

function PatternAccordion({ hits, query }: { hits: SearchHit[]; query: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <ul className="bg-white rounded-lg overflow-hidden divide-y divide-[#F0F0F0]">
      {hits.map(hit => {
        const isOpen = !!expanded[hit.member.id];
        const first = hit.matches[0];
        const FirstIcon = first?.fieldIcon;
        return (
          <li key={hit.member.id}>
            <button
              type="button"
              onClick={() => setExpanded(e => ({ ...e, [hit.member.id]: !e[hit.member.id] }))}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3 active:opacity-60"
            >
              <Avatar name={hit.member.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[14px]">
                    <Highlight text={hit.member.name} query={query} />
                  </span>
                  <span className="text-[10px] text-[var(--color-subtext)] truncate">
                    {hit.member.district}
                  </span>
                  <span className="text-[10px] font-bold text-yellow-800 bg-yellow-100 rounded-sm px-1 shrink-0">
                    {hit.matches.length}件
                  </span>
                </div>
                {!isOpen && first && FirstIcon && (
                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <FirstIcon size={10} className="text-[var(--color-subtext)] shrink-0" />
                    <span className="text-[10px] text-[var(--color-subtext)] shrink-0">{first.fieldLabel}:</span>
                    <span className="text-[11px] text-[var(--color-text)] truncate ml-1">
                      <Highlight text={first.text} query={query} />
                    </span>
                  </div>
                )}
              </div>
              {isOpen
                ? <ChevronDown size={16} className="text-[var(--color-icon-gray)]" />
                : <ChevronRight size={16} className="text-[var(--color-icon-gray)]" />
              }
            </button>
            {isOpen && (
              <div className="bg-[#FAFAFA] px-3 py-2 space-y-1.5 border-t border-[#F0F0F0]">
                {hit.matches.map((match, i) => {
                  const Icon = match.fieldIcon;
                  return (
                    <div key={i} className="flex gap-2 text-[12px] items-start">
                      <Icon size={12} className="text-[var(--color-subtext)] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-[var(--color-subtext)] mr-1">
                          {match.fieldLabel}{match.visitedAt ? ` ${match.visitedAt}` : ''}:
                        </span>
                        <span className="leading-snug">
                          <Highlight text={match.text} query={query} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ════════════════════════════════════════════════════════
//  メインページ
// ════════════════════════════════════════════════════════

type PatternId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

const PATTERNS: { id: PatternId; name: string; desc: string }[] = [
  { id: 'p1', name: 'P1: 密リスト', desc: '1ヒット=1行。マッチ箇所が多い時にサッと眺めやすい。Spotlight風。' },
  { id: 'p2', name: 'P2: 拡張カード', desc: '既存のメンバーカードそのまま。下にマッチ部分3件までスニペット。' },
  { id: 'p3', name: 'P3: タグ+束', desc: '上部に「情報にヒット」「訪問ログにヒット」などタグ表示。マッチ箇所ぜんぶ列挙。' },
  { id: 'p4', name: 'P4: 2カラム', desc: '左=本人プロフ / 右=マッチ文章。「文章検索」ぽい見た目。' },
  { id: 'p5', name: 'P5: 畳み込み', desc: '通常は1行だけ、タップで展開して全マッチ表示。情報密度を自分で調整できる。' },
];

const SUGGESTED_QUERIES = ['朝日川', 'ユニクロ', '病院', '大学', 'トレーラー', '同棲', '札幌', '母'];

export default function SearchPreviewPage() {
  const [query, setQuery] = useState('朝日川');
  const [pattern, setPattern] = useState<PatternId>('p1');

  const hits = useMemo(() => searchAll(query, MOCK_MEMBERS, MOCK_VISITS), [query]);
  const totalMatches = hits.reduce((s, h) => s + h.matches.length, 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-[12px] font-bold text-[var(--color-subtext)] mb-2 flex items-center gap-2">
          検索UI 5パターン比較
          <span className="text-[10px] font-normal text-[var(--color-subtext)]">/ モックデータ</span>
        </h1>
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtext)] z-10" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="キーワードで検索 (例: 朝日川, ユニクロ, 病院)"
            className="ios-input pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
              aria-label="クリア"
            >
              <X size={16} className="text-[var(--color-subtext)]" />
            </button>
          )}
        </div>
        {/* 検索キーワード候補 */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
          {SUGGESTED_QUERIES.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className={`chip chip-sm whitespace-nowrap ${query === q ? 'selected' : ''}`}
            >
              {q}
            </button>
          ))}
        </div>
        {/* パターン切替 */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {PATTERNS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPattern(p.id)}
              className={`chip chip-sm whitespace-nowrap ${pattern === p.id ? 'selected' : ''}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-subtext)] mt-1.5 leading-snug">
          {PATTERNS.find(p => p.id === pattern)?.desc}
        </p>
      </div>

      {/* 結果 */}
      <div className="px-3 py-3">
        {query && (
          <div className="text-[11px] text-[var(--color-subtext)] mb-2 px-1">
            「<span className="font-semibold text-[var(--color-text)]">{query}</span>」
            {hits.length}人ヒット・マッチ総数 {totalMatches} 件
          </div>
        )}
        {query && hits.length === 0 && (
          <div className="text-center py-12 text-[var(--color-subtext)] text-[13px]">
            該当なし
          </div>
        )}
        {!query && (
          <div className="text-center py-12 text-[var(--color-subtext)] text-[13px]">
            キーワードを入れてな
          </div>
        )}
        {pattern === 'p1' && <PatternCompactList hits={hits} query={query} />}
        {pattern === 'p2' && <PatternExpandedCard hits={hits} query={query} />}
        {pattern === 'p3' && <PatternTagged hits={hits} query={query} />}
        {pattern === 'p4' && <PatternTwoColumn hits={hits} query={query} />}
        {pattern === 'p5' && <PatternAccordion hits={hits} query={query} />}

        <div className="mt-8 text-[10px] text-[var(--color-subtext)] text-center leading-relaxed">
          ※ これは検索UI比較用のプレビューページ（モックデータ）。<br />
          本番データではないのでここで編集・削除しても影響なし。<br />
          好みのパターンが決まったら実装するで！
        </div>
      </div>
    </div>
  );
}
