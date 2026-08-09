'use client';

// ──────────────────────────────────────────────────────────────
// /quick — AI おまかせ記録 (2026-08-09 ヒデさん指示で仕様変更)
//
// ホームの + ボタンの行き先。AI おまかせ入力を大きく主役に置いて、
// その下に「メンバーを登録」「訪問ログを記録」の手入力動線をぶら下げる。
//
// 流れ:
//   1) 大きい入力欄にダラダラ喋る (キーボードの地球儀アイコンから
//      Aqua Voice キーボードに切り替えれば そのまま音声入力できる)
//   2) AI が「メンバー情報」と「訪問ログ」に振り分ける
//   3) 喋られた名前を既存メンバーと照合
//        ぴったり 1 人 → その人の訪問ログとして扱う (確認画面で変更可)
//        見つからない → 新規メンバー登録として扱う
//   4) 1 画面に上下で並べて確認 → 「登録する」で一括登録
//
// 設計上の約束 (ヒデさん指示):
//   - 言っていないことは埋めない。AI が返さなかった項目は行として出さない。
//   - 例外は「日付」と「カテゴリ」だけ。訪問ログに必須なので既定値を使うが、
//     画面上で「言ってなかったので既定値です」と明示して選び直せるようにする。
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Sparkles, Loader2, UserPlus, NotebookPen, ArrowLeft, Search,
  AlertTriangle, PlusCircle, Check,
} from 'lucide-react';
import type { Member, Respondent, VisitStatus } from '../../lib/types';
import { createMember, createVisit, updateVisit, updateMember, getMembers } from '../../lib/storage';
import { supabase, isMockMode } from '../../lib/supabase';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../../lib/constants';
import { today as todayStr, formatOrgLabel } from '../../lib/utils';
import { tapHaptic } from '../../lib/haptics';
import { useSwipeBack } from '../../lib/useSwipeBack';

type Phase = 'input' | 'loading' | 'confirm';

interface AutoResult {
  hasVisit: boolean;
  person: { sei?: string; mei?: string; kana?: string };
  member: Record<string, unknown>;
  visit: Record<string, unknown>;
  leftover: string;
}

/** 確認画面の 1 行 */
interface Row {
  key: string;
  label: string;
  display: string;
  value: unknown;
}

const MEMBER_LABELS: Record<string, string> = {
  category: '区分', honbu: '本部', bu: '部・支部', district: '地区',
  address: '住所', phone: '自宅TEL', mobile: '携帯',
  birthday: '生年月日', enrollmentDate: '入会月日',
  role: '役職', family: '同居', educationLevel: '教学',
  workplace: '職場', notes: '備考', info: '情報',
};

// members テーブルのカラム名 (camelCase → snake_case)
const MEMBER_COLUMNS: Record<string, string> = {
  category: 'category', honbu: 'honbu', bu: 'bu', district: 'district',
  address: 'address', phone: 'phone', mobile: 'mobile',
  birthday: 'birthday', enrollmentDate: 'enrollment_date',
  role: 'role', family: 'family', educationLevel: 'education_level',
  workplace: 'workplace', notes: 'notes', info: 'info',
};

// AI が返すキー → Member オブジェクトのプロパティ名
const MEMBER_PROPS: Record<string, keyof Member> = {
  category: 'category', honbu: 'honbu', bu: 'bu', district: 'district',
  address: 'address', phone: 'phone', mobile: 'mobile',
  birthday: 'birthday', enrollmentDate: 'enrollmentDate',
  role: 'role', family: 'family', educationLevel: 'educationLevel',
  workplace: 'workplace', notes: 'notes', info: 'info',
};

// 自由記述なので「食い違い」ではなく「追記」として扱う項目
const APPENDABLE = new Set(['notes', 'info']);

const normalize = (s: string) => s.replace(/[\s　]/g, '');

const showValue = (field: string, v: unknown): string =>
  field === 'category' ? (v === 'young' ? 'ヤング' : '一般') : String(v ?? '');

/**
 * 既存メンバーの登録内容と、喋られた内容の食い違い (2026-08-09 ヒデさん指示)。
 *   add      … 登録が空 → 追加できる (既定 ON)
 *   conflict … 登録と違うことを言っている → 上書きになるので既定 OFF + 警告
 *   append   … 備考/情報。既存の文章に追記する形 (既定 OFF)
 *   same     … 一致。行としては出さず、件数だけ知らせる
 */
type DiffKind = 'add' | 'conflict' | 'append' | 'same';
interface Diff {
  field: string;
  label: string;
  kind: DiffKind;
  spoken: string;
  stored: string;
  /** DB に書き込む値 (append なら 既存 + 改行 + 喋った内容) */
  nextValue: string;
}

function computeDiffs(member: Member | null, spokenMember: Record<string, unknown> | undefined): Diff[] {
  if (!member || !spokenMember) return [];
  const out: Diff[] = [];
  for (const [field, label] of Object.entries(MEMBER_LABELS)) {
    const raw = spokenMember[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const spoken = showValue(field, raw);
    const storedRaw = member[MEMBER_PROPS[field]];
    const stored = storedRaw === undefined || storedRaw === null ? '' : showValue(field, storedRaw);

    if (!stored) {
      out.push({ field, label, kind: 'add', spoken, stored: '', nextValue: String(raw) });
    } else if (normalize(stored) === normalize(spoken)) {
      out.push({ field, label, kind: 'same', spoken, stored, nextValue: String(raw) });
    } else if (APPENDABLE.has(field)) {
      out.push({ field, label, kind: 'append', spoken, stored, nextValue: `${stored}\n${String(raw)}` });
    } else {
      out.push({ field, label, kind: 'conflict', spoken, stored, nextValue: String(raw) });
    }
  }
  return out;
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

export default function QuickClient() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [result, setResult] = useState<AutoResult | null>(null);

  // 確認画面の状態
  const [memberRows, setMemberRows] = useState<Row[]>([]);
  const [visitRows, setVisitRows] = useState<Row[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  /** 訪問ログの相手。null = 新規メンバーとして登録する */
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  /** 日付・カテゴリは訪問ログに必須なので、言われてなくても既定値を持つ */
  const [visitDate, setVisitDate] = useState(todayStr());
  const [visitDateWasSpoken, setVisitDateWasSpoken] = useState(false);
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('met_self');
  const [visitStatusWasSpoken, setVisitStatusWasSpoken] = useState(false);
  const [saving, setSaving] = useState(false);

  // 起動時にメンバー一覧を先読み (名前の照合に使う)
  useEffect(() => {
    getMembers().then(setMembers).catch(() => { /* 照合できなくても新規扱いで進める */ });
  }, []);

  // 入力欄に自動フォーカス → キーボードが即立ち上がる
  useEffect(() => {
    if (phase === 'input') {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 300);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  const spokenName = useMemo(() => {
    const p = result?.person ?? {};
    return [p.sei, p.mei].filter(Boolean).join(' ');
  }, [result]);

  // ── 既存データとの突き合わせ (2026-08-09 ヒデさん指示) ──
  // 「登録している本部と言っている本部が違う」「もう登録されてる人がいる」を
  // 登録前に気づけるようにする。targetMember は「変更」で切り替わるので、
  // state に固めずここで都度計算する。
  const diffs = useMemo(
    () => computeDiffs(targetMember, result?.member),
    [targetMember, result],
  );
  const [diffChecked, setDiffChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    // 空欄への追加だけ既定 ON。上書き (conflict) と追記 (append) は既定 OFF。
    setDiffChecked(Object.fromEntries(diffs.map(d => [d.field, d.kind === 'add'])));
  }, [diffs]);

  // 新規登録しようとしている時、似た名前の既存メンバーが居ないか。
  // 同姓の別人も拾うので「同一人物かどうか」はユーザーに判断してもらう。
  const duplicateCandidates = useMemo(() => {
    if (targetMember || !result) return [];
    const sei = normalize(result.person?.sei ?? '');
    const full = normalize([result.person?.sei, result.person?.mei].filter(Boolean).join(''));
    if (!sei && !full) return [];
    return members.filter(m => {
      const n = normalize(m.name);
      if (full.length >= 2 && (n.includes(full) || full.includes(n))) return true;
      return sei.length >= 2 && n.startsWith(sei);
    }).slice(0, 5);
  }, [targetMember, result, members]);

  // ── AI 呼び出し ──
  const handleExtract = async () => {
    if (!text.trim()) return;
    tapHaptic();
    setPhase('loading');
    setError(null);
    try {
      let data: AutoResult;
      if (isMockMode) {
        data = MOCK_RESULT;
      } else {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error('ログインし直してください');
        const res = await fetch('/api/ai-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            mode: 'auto',
            text: text.trim(),
            today: new Date().toLocaleDateString('sv-SE'),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `エラー (${res.status})`);
        data = json as AutoResult;
      }
      buildConfirm(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('input');
    }
  };

  // ── AI の結果 → 確認画面の状態 ──
  const buildConfirm = (data: AutoResult) => {
    setResult(data);

    // 名前の照合。空白を無視して「どちらかがどちらかを含む」で拾う。
    const full = normalize([data.person?.sei, data.person?.mei].filter(Boolean).join(''));
    const hits = full.length >= 2
      ? members.filter(m => {
        const n = normalize(m.name);
        return n.includes(full) || full.includes(n);
      })
      : [];
    // ぴったり 1 人だけなら自動で その人の記録として扱う (画面で変更可)
    setTargetMember(hits.length === 1 ? hits[0] : null);

    // メンバー行 (新規登録するときだけ意味を持つ)
    const mRows: Row[] = [];
    if (data.person?.sei) mRows.push({ key: 'sei', label: '名字', display: data.person.sei, value: data.person.sei });
    if (data.person?.mei) mRows.push({ key: 'mei', label: '名前', display: data.person.mei, value: data.person.mei });
    if (data.person?.kana) mRows.push({ key: 'kana', label: '読み仮名', display: data.person.kana, value: data.person.kana });
    for (const [k, label] of Object.entries(MEMBER_LABELS)) {
      const v = data.member?.[k];
      if (v === undefined || v === null || v === '') continue;
      const display = k === 'category' ? (v === 'young' ? 'ヤング' : '一般') : String(v);
      mRows.push({ key: `m_${k}`, label, display, value: v });
    }
    setMemberRows(mRows);

    // 訪問ログ行
    const vRows: Row[] = [];
    const hour = data.visit?.visitedHour;
    if (typeof hour === 'number' && hour >= 0 && hour <= 23) {
      vRows.push({ key: 'v_hour', label: '時刻', display: `${hour}時`, value: hour });
    }
    const resp = Array.isArray(data.visit?.respondents)
      ? (data.visit.respondents as string[]).filter((r): r is Respondent => r in RESPONDENT_CONFIG)
      : [];
    if (resp.length > 0) {
      vRows.push({
        key: 'v_respondents', label: '対応者',
        display: resp.map(r => RESPONDENT_CONFIG[r].label).join('・'), value: resp,
      });
    }
    const memo = typeof data.visit?.memo === 'string' ? data.visit.memo.trim() : '';
    if (memo) vRows.push({ key: 'v_memo', label: 'メモ', display: memo, value: memo });
    setVisitRows(vRows);

    // 日付 / カテゴリ は必須項目なので既定値を持たせつつ、言われたかどうかを覚える
    const spokenDate = typeof data.visit?.visitedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.visit.visitedAt)
      ? data.visit.visitedAt : null;
    setVisitDate(spokenDate ?? todayStr());
    setVisitDateWasSpoken(!!spokenDate);
    const spokenStatus = typeof data.visit?.status === 'string' && data.visit.status in VISIT_STATUS_CONFIG
      ? (data.visit.status as VisitStatus) : null;
    setVisitStatus(spokenStatus ?? 'met_self');
    setVisitStatusWasSpoken(!!spokenStatus);

    setChecked(Object.fromEntries([...mRows, ...vRows].map(r => [r.key, true])));
    setPhase('confirm');
  };

  // ── 登録 ──
  const isNewMember = targetMember === null;
  const nameFromRows = () => {
    const sei = memberRows.find(r => r.key === 'sei' && checked.sei)?.value as string | undefined;
    const mei = memberRows.find(r => r.key === 'mei' && checked.mei)?.value as string | undefined;
    return [sei, mei].filter(Boolean).join(' ');
  };
  const canSubmit = !saving && (isNewMember ? nameFromRows().length > 0 : true);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    tapHaptic();
    setSaving(true);
    setError(null);
    try {
      let memberId: string;

      if (isNewMember) {
        const input: Record<string, unknown> = { name: nameFromRows(), district: '' };
        const kana = memberRows.find(r => r.key === 'kana' && checked.kana)?.value;
        if (typeof kana === 'string') input.name_kana = kana;
        for (const row of memberRows) {
          if (!checked[row.key] || !row.key.startsWith('m_')) continue;
          const col = MEMBER_COLUMNS[row.key.slice(2)];
          if (col) input[col] = row.value;
        }
        const created = await createMember(input as Parameters<typeof createMember>[0]);
        memberId = created.id;
      } else {
        memberId = targetMember.id;
      }

      if (result?.hasVisit) {
        const visit = await createVisit(memberId, visitDate, visitStatus);
        const updates: Record<string, unknown> = {};
        const hour = visitRows.find(r => r.key === 'v_hour' && checked.v_hour)?.value;
        if (typeof hour === 'number') updates.visited_hour = hour;
        const resp = visitRows.find(r => r.key === 'v_respondents' && checked.v_respondents)?.value;
        if (Array.isArray(resp) && resp.length > 0) updates.respondents = resp;
        const memo = visitRows.find(r => r.key === 'v_memo' && checked.v_memo)?.value;
        if (typeof memo === 'string') updates.notes = plainTextToTiptap(memo);
        if (Object.keys(updates).length > 0) await updateVisit(visit.id, updates);
      }

      // 既存メンバーの情報更新は チェックを入れた項目だけ。
      // 上書き (conflict) は既定 OFF なので、明示的に選んだ時しか走らない。
      // 訪問ログの後に回すのは、ここで失敗しても記録そのものは残すため。
      if (!isNewMember) {
        const patch: Record<string, unknown> = {};
        for (const d of diffs) {
          if (d.kind === 'same' || !diffChecked[d.field]) continue;
          const col = MEMBER_COLUMNS[d.field];
          if (col) patch[col] = d.nextValue;
        }
        if (Object.keys(patch).length > 0) {
          try {
            await updateMember(memberId, patch);
          } catch (e) {
            setError(
              `${result?.hasVisit ? '訪問ログは登録できましたが、' : ''}メンバー情報の更新に失敗しました: ` +
              (e instanceof Error ? e.message : String(e)),
            );
            setSaving(false);
            return;
          }
        }
      }

      router.replace(`/members/${memberId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const pickerHits = useMemo(() => {
    const q = normalize(pickerQuery);
    if (!q) return members.slice(0, 40);
    return members.filter(m => normalize(m.name).includes(q) || normalize(m.nameKana ?? '').includes(q)).slice(0, 40);
  }, [members, pickerQuery]);

  const toggle = (key: string) => setChecked(c => ({ ...c, [key]: !c[key] }));

  // 突き合わせ結果を種類ごとに分けて表示する
  const conflictDiffs = diffs.filter(d => d.kind === 'conflict' || d.kind === 'append');
  const addDiffs = diffs.filter(d => d.kind === 'add');
  const sameDiffs = diffs.filter(d => d.kind === 'same');

  const RowList = ({ rows }: { rows: Row[] }) => (
    <ul className="divide-y divide-[#F0F0F0]">
      {rows.map(r => (
        <li key={r.key}>
          <label className="flex items-start gap-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!checked[r.key]}
              onChange={() => toggle(r.key)}
              className="w-5 h-5 mt-0.5 shrink-0 accent-[#6366F1]"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] text-[var(--color-subtext)]">{r.label}</span>
              <span className="block text-[14px] whitespace-pre-wrap break-words">{r.display}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-[var(--color-bg)] min-h-full">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-20 bg-[var(--color-bg)]">
        {phase === 'confirm' ? (
          <button
            onClick={() => { tapHaptic(); setPhase('input'); }}
            className="flex items-center gap-1 text-[var(--color-primary)] shrink-0"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">書き直す</span>
          </button>
        ) : (
          <button
            onClick={() => { tapHaptic(); if (window.history.length > 1) router.back(); else router.push('/'); }}
            className="flex items-center gap-1 text-[var(--color-primary)] shrink-0"
          >
            <ChevronLeft size={24} />
            <span className="text-sm">戻る</span>
          </button>
        )}
        <h1 className="text-lg font-bold truncate flex-1 text-center">
          {phase === 'confirm' ? '内容を確認' : 'AIにおまかせ記録'}
        </h1>
        <span className="w-16 shrink-0" />
      </nav>

      <div
        className="max-w-[1366px] mx-auto px-4 py-4 space-y-4"
        style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 32px)' }}
      >
        {/* ══════ 入力フェーズ ══════ */}
        {phase !== 'confirm' && (
          <>
            <div className="rounded-3xl p-[2px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-[0_8px_24px_rgba(99,102,241,0.28)]">
              <div className="bg-white rounded-[22px] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0">
                    <Sparkles size={17} className="text-white" />
                  </span>
                  <h2 className="text-[17px] font-bold">AIにおまかせ</h2>
                </div>
                <p className="text-[11px] text-[var(--color-subtext)] leading-relaxed mb-3">
                  思いついた順にダラダラ喋ってください。AI が「メンバーの情報」と
                  「訪問ログ」に振り分けて、登録する直前に確認画面を出します。
                </p>
                <details className="mb-3 text-[11px] text-[var(--color-subtext)]">
                  <summary className="cursor-pointer font-bold text-[var(--color-primary)]">
                    音声入力キーボードを最初から出すには
                  </summary>
                  <div className="mt-1.5 leading-relaxed">
                    どのキーボードを出すかはアプリ側からは指定できません（iOS の仕様）。
                    <strong>設定 → 一般 → キーボード → キーボード → 編集</strong> で
                    音声入力キーボードを<strong>一番上</strong>に並べ替えると、以降このアプリでも
                    最初からそれが立ち上がります。
                    その場だけ切り替えたい時は、キーボードの<strong>地球儀アイコン</strong>を長押しして選べます。
                  </div>
                </details>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={phase === 'loading'}
                  placeholder={'例）今日の夕方、豊岡本部の英雄地区の山田太郎さんとこに初めて行った。本人は不在でお母さんが出てきてくれて、最近仕事が忙しいらしい。次は日曜の昼がええって。'}
                  className="w-full h-52 rounded-2xl border border-[#E5E5EA] p-3 text-[15px] resize-none outline-none focus:border-[#6366F1] placeholder:text-[#C7C7CC] disabled:opacity-60"
                />
                {error && (
                  <p className="text-[12px] text-[#FF3B30] bg-[#FFE5E5] rounded-lg px-3 py-2 mt-2">{error}</p>
                )}
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={!text.trim() || phase === 'loading'}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[15px] font-bold active:opacity-85 disabled:opacity-30"
                >
                  {phase === 'loading' ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {phase === 'loading' ? '振り分け中…' : 'AIで振り分ける'}
                </button>
              </div>
            </div>

            {/* 手入力の動線 2 本 */}
            <div className="flex items-center gap-3 pt-1">
              <span className="flex-1 h-px bg-[#E5E5EA]" />
              <span className="text-[11px] text-[var(--color-subtext)]">自分で入力する</span>
              <span className="flex-1 h-px bg-[#E5E5EA]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/members/new"
                onClick={() => tapHaptic()}
                className="ios-card flex flex-col items-center justify-center gap-2 py-5 active:opacity-70 transition-opacity"
              >
                <UserPlus size={24} className="text-[var(--color-primary)]" />
                <span className="text-[13px] font-bold">メンバーを登録</span>
              </Link>
              <Link
                href="/visits/new"
                onClick={() => tapHaptic()}
                className="ios-card flex flex-col items-center justify-center gap-2 py-5 active:opacity-70 transition-opacity"
              >
                <NotebookPen size={24} className="text-[var(--color-primary)]" />
                <span className="text-[13px] font-bold">訪問ログを記録</span>
              </Link>
            </div>
          </>
        )}

        {/* ══════ 確認フェーズ ══════ */}
        {phase === 'confirm' && result && (
          <>
            {/* ── 相手 ── */}
            <div className="ios-card px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-bold">
                  {isNewMember ? 'メンバー（新規登録）' : 'メンバー（既存）'}
                </h3>
                <button
                  type="button"
                  onClick={() => { tapHaptic(); setPickerOpen(true); setPickerQuery(''); }}
                  className="text-[12px] font-bold text-[var(--color-primary)] active:opacity-60"
                >
                  変更
                </button>
              </div>

              {isNewMember ? (
                <>
                  <p className="text-[11px] text-[var(--color-subtext)] mb-1">
                    {spokenName
                      ? `「${spokenName}」さんは まだ登録されていないので、新しく登録します。`
                      : '名前が聞き取れませんでした。「変更」から既存メンバーを選ぶか、書き直してください。'}
                  </p>

                  {/* 似た名前の既存メンバーがいる時の重複警告 (2026-08-09 ヒデさん指示)。
                      同姓の別人も拾うので、同一人物かどうかはユーザーに判断してもらう。 */}
                  {duplicateCandidates.length > 0 && (
                    <div className="my-2 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#FED7AA]">
                        <AlertTriangle size={14} className="text-[#C2410C] shrink-0" />
                        <span className="text-[12px] font-bold text-[#C2410C]">
                          似た名前のメンバーが すでに登録されています
                        </span>
                      </div>
                      <ul className="divide-y divide-[#FED7AA]">
                        {duplicateCandidates.map(m => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => { tapHaptic(); setTargetMember(m); }}
                              className="w-full text-left px-3 py-2.5 active:bg-[#FFEAD0] flex items-center gap-2"
                            >
                              <span className="flex-1 min-w-0">
                                <span className="block text-[13px] font-bold">{m.name}</span>
                                <span className="block text-[11px] text-[var(--color-subtext)]">
                                  {formatOrgLabel(m)}
                                </span>
                              </span>
                              <span className="text-[11px] font-bold text-[var(--color-primary)] shrink-0">
                                この人にする
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="px-3 py-2 text-[10px] text-[#C2410C] border-t border-[#FED7AA]">
                        同じ人ならタップして選んでください。別人ならそのまま新規登録して大丈夫です。
                      </p>
                    </div>
                  )}

                  {memberRows.length > 0 ? <RowList rows={memberRows} /> : null}
                </>
              ) : (
                <div className="py-2">
                  <p className="text-[15px] font-bold">{targetMember.name}</p>
                  <p className="text-[11px] text-[var(--color-subtext)]">{formatOrgLabel(targetMember)}</p>
                  <p className="text-[11px] text-[var(--color-subtext)] mt-1.5">
                    この人の記録として登録します。違う人なら「変更」から選び直してください。
                  </p>

                  {/* 登録済みの内容との突き合わせ結果 */}
                  {conflictDiffs.length > 0 && (
                    <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FFF1F1] overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#FECACA]">
                        <AlertTriangle size={14} className="text-[#DC2626] shrink-0" />
                        <span className="text-[12px] font-bold text-[#DC2626]">
                          登録内容と違うことを言っています（{conflictDiffs.length}件）
                        </span>
                      </div>
                      <ul className="divide-y divide-[#FECACA]">
                        {conflictDiffs.map(d => (
                          <li key={d.field} className="px-3 py-2.5">
                            <p className="text-[11px] text-[var(--color-subtext)] mb-1">{d.label}</p>
                            <p className="text-[13px]">
                              <span className="line-through text-[var(--color-subtext)]">{d.stored}</span>
                              <span className="mx-1.5 text-[var(--color-subtext)]">→</span>
                              <span className="font-bold text-[#DC2626]">{d.spoken}</span>
                            </p>
                            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!diffChecked[d.field]}
                                onChange={() => setDiffChecked(c => ({ ...c, [d.field]: !c[d.field] }))}
                                className="w-4 h-4 accent-[#DC2626]"
                              />
                              <span className="text-[11px]">
                                {d.kind === 'append' ? '登録内容の後ろに追記する' : '喋った内容で上書きする'}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {addDiffs.length > 0 && (
                    <div className="mt-2 rounded-xl border border-[#D6E4FF] bg-[#F5F8FF] overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#D6E4FF]">
                        <PlusCircle size={14} className="text-[var(--color-primary)] shrink-0" />
                        <span className="text-[12px] font-bold text-[var(--color-primary)]">
                          まだ登録されていない項目（{addDiffs.length}件）
                        </span>
                      </div>
                      <ul className="divide-y divide-[#D6E4FF]">
                        {addDiffs.map(d => (
                          <li key={d.field}>
                            <label className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!diffChecked[d.field]}
                                onChange={() => setDiffChecked(c => ({ ...c, [d.field]: !c[d.field] }))}
                                className="w-4 h-4 mt-0.5 shrink-0 accent-[#6366F1]"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block text-[11px] text-[var(--color-subtext)]">{d.label}</span>
                                <span className="block text-[13px] whitespace-pre-wrap break-words">{d.spoken}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sameDiffs.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#1D7A3F] mt-2">
                      <Check size={13} className="shrink-0" />
                      {sameDiffs.map(d => d.label).join('・')} は登録内容と一致しています
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── 訪問ログ ── */}
            {result.hasVisit && (
              <div className="ios-card px-4 py-3">
                <h3 className="text-sm font-bold mb-2">訪問ログ</h3>

                <div className="pb-3 border-b border-[#F0F0F0]">
                  <label className="block text-[11px] text-[var(--color-subtext)] mb-1">
                    日付{!visitDateWasSpoken && <span className="text-[#C2410C]">（言ってなかったので今日にしています）</span>}
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="bg-[#F7F7F8] rounded-lg px-3 py-2 text-[15px] outline-none"
                  />
                </div>

                <div className="py-3 border-b border-[#F0F0F0]">
                  <label className="block text-[11px] text-[var(--color-subtext)] mb-1.5">
                    カテゴリ{!visitStatusWasSpoken && <span className="text-[#C2410C]">（言ってなかったので既定値です）</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(VISIT_STATUS_CONFIG) as [VisitStatus, { label: string }][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { tapHaptic(); setVisitStatus(key); }}
                        className={`chip ${visitStatus === key ? 'selected' : ''}`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {visitRows.length > 0
                  ? <RowList rows={visitRows} />
                  : <p className="text-[12px] text-[var(--color-subtext)] py-3">他に読み取れた項目はありません</p>}
              </div>
            )}

            {/* ── 振り分けきれなかった内容 ── */}
            {result.leftover && (
              <div className="bg-[#F7F7F8] rounded-2xl px-4 py-3">
                <p className="text-[11px] font-bold text-[var(--color-subtext)] mb-1">
                  どの項目にも入らなかった内容
                </p>
                <p className="text-[12px] whitespace-pre-wrap">{result.leftover}</p>
                <p className="text-[10px] text-[var(--color-subtext)] mt-1.5">
                  ※ この内容は登録されません。必要なら登録後にメンバーカードで足してください。
                </p>
              </div>
            )}

            {error && (
              <p className="text-[12px] text-[#FF3B30] bg-[#FFE5E5] rounded-xl px-3 py-2">
                登録に失敗しました: {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-[15px] font-bold active:opacity-80 disabled:opacity-30"
            >
              {saving ? '登録中…' : isNewMember
                ? (result.hasVisit ? 'メンバーと訪問ログを登録' : 'メンバーを登録')
                : '訪問ログを登録'}
            </button>
            {isNewMember && nameFromRows().length === 0 && (
              <p className="text-[11px] text-[var(--color-subtext)] text-center">
                名前が無いと登録できません。「変更」から既存メンバーを選ぶか、書き直してください。
              </p>
            )}
          </>
        )}
      </div>

      {/* ── メンバー選択モーダル ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div
            className="bg-white rounded-t-3xl overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="px-4 py-3 border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-bold">誰の記録ですか？</h2>
                <button
                  type="button"
                  onClick={() => { tapHaptic(); setPickerOpen(false); }}
                  className="text-[13px] text-[var(--color-primary)] font-bold"
                >
                  閉じる
                </button>
              </div>
              <div className="flex items-center gap-2 bg-[#F0F0F0] rounded-xl px-3 h-10">
                <Search size={16} className="text-[var(--color-subtext)] shrink-0" />
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="名前で探す"
                  className="flex-1 bg-transparent outline-none text-[14px]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {spokenName && (
                <button
                  type="button"
                  onClick={() => { tapHaptic(); setTargetMember(null); setPickerOpen(false); }}
                  className="w-full text-left px-4 py-3 border-b border-[#F0F0F0] active:bg-[#F5F5F5]"
                >
                  <span className="text-[14px] font-bold text-[var(--color-primary)]">
                    ＋「{spokenName}」を新規メンバーとして登録
                  </span>
                </button>
              )}
              <ul className="divide-y divide-[#F0F0F0]">
                {pickerHits.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => { tapHaptic(); setTargetMember(m); setPickerOpen(false); }}
                      className="w-full text-left px-4 py-3 active:bg-[#F5F5F5]"
                    >
                      <span className="block text-[14px] font-bold">{m.name}</span>
                      <span className="block text-[11px] text-[var(--color-subtext)]">{formatOrgLabel(m)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {pickerHits.length === 0 && (
                <p className="text-[13px] text-[var(--color-subtext)] text-center py-6">見つかりません</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// お試しモード (Supabase 未接続のローカル) 用のダミー結果。本番では使わない。
const MOCK_RESULT: AutoResult = {
  hasVisit: true,
  person: { sei: '山田', mei: '太郎' },
  member: { honbu: '豊岡本部', bu: '豊岡部', district: '英雄地区' },
  visit: {
    visitedHour: 17,
    status: 'met_family',
    respondents: ['mother'],
    memo: '本人は不在で、お母さんが対応してくださいました。\n最近は仕事が忙しいそうです。\n次回は日曜の昼にお願いしたいとのことでした。',
  },
  leftover: '',
};
