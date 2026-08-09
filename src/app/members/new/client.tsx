'use client';

// ──────────────────────────────────────────────────────────────
// メンバー新規登録フォーム (2026-08-09 ヒデさん指示で新設)
//
// 動線 3 本から飛んでくる:
//   1. 検索バーのサジェスト   … /members/new?name=山田
//   2. ホーム地図の + ボタン   … /members/new?lat=..&lng=..      (地図中心)
//   3. 地図の長押し            … /members/new?lat=..&lng=..&address=..
//
// 入力ルール (ヒデさん指示):
//   - 名字 / 名前 は「どちらか片方」入っていれば登録できる
//   - 住所を含め それ以外は 全部任意。全項目にプレースホルダーを置く
//   - 細かい項目は登録後に メンバーカード側でいつでも編集できる
//     (MemberInfo が全フィールド インライン編集対応済み)
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronUp, MapPin, Loader2 } from 'lucide-react';
import { createMember } from '../../../lib/storage';
import { ORG_TREE } from '../../../lib/constants';
import { guessKana } from '../../../lib/kanaGuess';
import { tapHaptic } from '../../../lib/haptics';
import { useSwipeBack } from '../../../lib/useSwipeBack';
import AiAssistSheet, { type AiFieldRow } from '../../../components/AiAssistSheet';
import type { MemberCategory } from '../../../lib/types';

const UNSET = '';

// ── 共通の入力行 (ラベル + input) ──
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  half,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  half?: boolean;
  inputMode?: 'text' | 'tel' | 'numeric';
}) {
  return (
    <div className={`py-2.5 ${half ? '' : 'border-b border-[#F0F0F0]'}`}>
      <label className="block text-[11px] text-[var(--color-subtext)] mb-1">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-[15px] placeholder:text-[#C7C7CC]"
      />
    </div>
  );
}

// ── 選択肢 + 自由入力を兼ねる行 (datalist 方式) ──
function SelectableField({
  label,
  value,
  onChange,
  placeholder,
  options,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  listId: string;
}) {
  return (
    <div className="py-2.5 border-b border-[#F0F0F0]">
      <label className="block text-[11px] text-[var(--color-subtext)] mb-1">{label}</label>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-[15px] placeholder:text-[#C7C7CC]"
      />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
}

export default function NewMemberClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useSwipeBack(() => router.back());

  // ── クエリからの初期値 ──
  const initialName = searchParams.get('name') ?? '';
  const initialLat = searchParams.get('lat');
  const initialLng = searchParams.get('lng');
  const initialAddress = searchParams.get('address') ?? '';

  // ── 名前 ──
  // ヒデさん指示: 「名字・名前どちらか」が入っていれば登録可。
  // 検索バーから来た時は打った文字をそのまま名字に入れておく。
  const [sei, setSei] = useState(initialName);
  const [mei, setMei] = useState('');
  const [kana, setKana] = useState('');
  const kanaTouchedRef = useRef(false);

  // 漢字から読み仮名を自動推測 (ユーザーが自分で打ち始めたら以降は触らない)。
  // guessKana は読めない字を「？」で返すので、その場合は入れずに空のままにする
  // (「さ？き（仮）」みたいな値が最初から入ってると直す手間の方が大きい)。
  const fullName = useMemo(() => [sei.trim(), mei.trim()].filter(Boolean).join(' '), [sei, mei]);
  useEffect(() => {
    if (kanaTouchedRef.current) return;
    const guess = guessKana(fullName);
    setKana(guess.includes('？') ? '' : guess);
  }, [fullName]);

  // ── 組織 ──
  const [category, setCategory] = useState<MemberCategory>('general');
  const [honbu, setHonbu] = useState(UNSET);
  const [bu, setBu] = useState(UNSET);
  const [district, setDistrict] = useState(UNSET);

  const buOptions = useMemo(
    () => ORG_TREE.find((h) => h.key === honbu)?.bus ?? [],
    [honbu],
  );
  const districtOptions = useMemo(
    () => buOptions.find((b) => b.key === bu)?.districts ?? [],
    [buOptions, bu],
  );

  // ── 住所・座標 ──
  const [address, setAddress] = useState(initialAddress);
  const [lat, setLat] = useState<number | null>(initialLat ? parseFloat(initialLat) : null);
  const [lng, setLng] = useState<number | null>(initialLng ? parseFloat(initialLng) : null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);

  // 長押し/＋ボタンで座標だけ持って来た時、住所が空なら逆引きして埋める
  useEffect(() => {
    if (initialAddress || lat == null || lng == null) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/geocode-reverse?lat=${lat}&lng=${lng}`);
        const d = await r.json();
        if (!cancelled && d?.found && d.address) setAddress(d.address as string);
      } catch { /* 取れなくても任意項目なので放置 */ }
    })();
    return () => { cancelled = true; };
    // 初回だけ動けばよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    tapHaptic();
    setGeocoding(true);
    setGeocodeMsg(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(address.trim())}`);
      const d = await r.json();
      if (d?.found) {
        setLat(d.lat);
        setLng(d.lng);
        setGeocodeMsg('地図の位置が取れました');
      } else {
        setGeocodeMsg('この住所では位置が見つかりませんでした（登録は可能です）');
      }
    } catch {
      setGeocodeMsg('位置の取得に失敗しました（登録は可能です）');
    } finally {
      setGeocoding(false);
    }
  };

  // ── 詳しい項目 ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [role, setRole] = useState('');
  const [family, setFamily] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [birthday, setBirthday] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [notes, setNotes] = useState('');
  const [info, setInfo] = useState('');
  const [visitCycleDays, setVisitCycleDays] = useState('30');

  // ── AI おまかせ入力 (2026-08-09) ──
  // AI が返した項目 → 確認画面の行 に変換する。ここが「アプリ側の語彙」の定義。
  const aiToRows = (f: Record<string, unknown>): AiFieldRow[] => {
    const s = (k: string) => (typeof f[k] === 'string' ? (f[k] as string) : '');
    const rows: AiFieldRow[] = [];
    const push = (key: string, label: string, value: string) => {
      if (value) rows.push({ key, label, display: value, value });
    };
    push('sei', '名字', s('sei'));
    push('mei', '名前', s('mei'));
    push('kana', '読み仮名', s('kana'));
    if (f.category === 'young' || f.category === 'general') {
      rows.push({
        key: 'category',
        label: '区分',
        display: f.category === 'young' ? 'ヤング' : '一般',
        value: f.category,
      });
    }
    push('honbu', '本部', s('honbu'));
    push('bu', '部・支部', s('bu'));
    push('district', '地区', s('district'));
    push('address', '住所', s('address'));
    push('phone', '自宅TEL', s('phone'));
    push('mobile', '携帯', s('mobile'));
    push('birthday', '生年月日', s('birthday'));
    push('enrollmentDate', '入会月日', s('enrollmentDate'));
    push('role', '役職', s('role'));
    push('family', '同居', s('family'));
    push('educationLevel', '教学', s('educationLevel'));
    push('workplace', '職場', s('workplace'));
    push('notes', '備考', s('notes'));
    push('info', '情報', s('info'));
    return rows;
  };

  const applyAi = (rows: AiFieldRow[]) => {
    const get = (k: string) => rows.find(r => r.key === k)?.value as string | undefined;
    const setIf = (v: string | undefined, setter: (s: string) => void) => {
      if (v !== undefined) setter(v);
    };
    setIf(get('sei'), setSei);
    setIf(get('mei'), setMei);
    setIf(get('kana'), (v) => { kanaTouchedRef.current = true; setKana(v); });
    const cat = get('category');
    if (cat === 'young' || cat === 'general') setCategory(cat);
    // 組織は本部→部→地区の順に入れる (setHonbu が bu/district をリセットするため)
    const h = get('honbu');
    const b = get('bu');
    const d = get('district');
    if (h !== undefined) { setHonbu(h); setBu(''); setDistrict(''); }
    if (b !== undefined) setBu(b);
    if (d !== undefined) setDistrict(d);
    setIf(get('address'), setAddress);
    setIf(get('phone'), setPhone);
    setIf(get('mobile'), setMobile);
    setIf(get('birthday'), setBirthday);
    setIf(get('enrollmentDate'), setEnrollmentDate);
    setIf(get('role'), setRole);
    setIf(get('family'), setFamily);
    setIf(get('educationLevel'), setEducationLevel);
    setIf(get('workplace'), setWorkplace);
    setIf(get('notes'), setNotes);
    setIf(get('info'), setInfo);
    // 詳しい項目に入った値があるなら、見えるようにアコーディオンを開く
    const detailKeys = ['phone', 'mobile', 'birthday', 'enrollmentDate', 'role', 'family',
      'educationLevel', 'workplace', 'notes', 'info'];
    if (rows.some(r => detailKeys.includes(r.key))) setDetailOpen(true);
  };

  // ── 送信 ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = fullName.length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    tapHaptic();
    setSaving(true);
    setError(null);
    const nz = (v: string) => (v.trim() ? v.trim() : null);
    try {
      const created = await createMember({
        name: fullName,
        name_kana: nz(kana),
        category,
        honbu: nz(honbu),
        bu: nz(bu),
        district: district.trim(),
        address: nz(address),
        lat,
        lng,
        role: nz(role),
        family: nz(family),
        phone: nz(phone),
        mobile: nz(mobile),
        birthday: nz(birthday),
        enrollment_date: nz(enrollmentDate),
        education_level: nz(educationLevel),
        workplace: nz(workplace),
        notes: nz(notes),
        info: nz(info),
        visit_cycle_days: Number.parseInt(visitCycleDays, 10) || 30,
      });
      // 登録直後は そのメンバーのカードへ。残りの項目はそこで編集できる。
      router.replace(`/members/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--color-bg)] min-h-full">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-20 bg-[var(--color-bg)]">
        <button
          onClick={() => { tapHaptic(); if (window.history.length > 1) router.back(); else router.push('/'); }}
          className="flex items-center gap-1 text-[var(--color-primary)] shrink-0"
        >
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-lg font-bold truncate flex-1 text-center">メンバーを新規登録</h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-[#000] text-white rounded-full px-4 py-1.5 text-sm font-bold active:opacity-80 transition-opacity shrink-0 disabled:opacity-30"
        >
          {saving ? '登録中…' : '登録'}
        </button>
      </nav>

      <div
        className="max-w-[1366px] mx-auto px-4 py-4 space-y-4"
        style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 32px)' }}
      >
        {/* ── AI おまかせ入力 (2026-08-09 ヒデさん指示) ──
            ダラダラ喋った内容を項目ごとに振り分けて、確認画面を挟んでから反映する。 */}
        <AiAssistSheet
          mode="member"
          toRows={aiToRows}
          onApply={applyAi}
          placeholder={'例）豊岡本部の英雄地区の山田太郎さん、38歳。旭川市豊岡3条4丁目に住んでて、携帯は090-1234-5678。ユニクロで働いてる。お母さんと二人暮らしで、地区リーダーやってる。夜勤明けの午前は避けたほうがええ。'}
        />

        {/* ── 名前 ── */}
        <div className="ios-card px-4 py-1">
          <div className="grid grid-cols-2 gap-x-4 border-b border-[#F0F0F0]">
            <Field label="名字" value={sei} onChange={setSei} placeholder="山田" half />
            <Field label="名前" value={mei} onChange={setMei} placeholder="太郎" half />
          </div>
          <div className="py-2.5 border-b border-[#F0F0F0]">
            <label className="block text-[11px] text-[var(--color-subtext)] mb-1">読み仮名</label>
            <input
              value={kana}
              onChange={(e) => { kanaTouchedRef.current = true; setKana(e.target.value); }}
              placeholder="やまだ たろう"
              className="w-full bg-transparent outline-none text-[15px] placeholder:text-[#C7C7CC]"
            />
          </div>
          <div className="py-3">
            <label className="block text-[11px] text-[var(--color-subtext)] mb-1.5">区分</label>
            <div className="flex gap-2">
              {([
                { key: 'general', label: '一般' },
                { key: 'young', label: 'ヤング' },
              ] as const).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => { tapHaptic(); setCategory(c.key); }}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                    category === c.key
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[#F0F0F0] text-[var(--color-subtext)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 組織 (本部 → 部 → 地区) ── */}
        <div className="ios-card px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-2">組織</h3>
          <div className="space-y-2">
            <select
              value={honbu}
              onChange={(e) => { setHonbu(e.target.value); setBu(UNSET); setDistrict(UNSET); }}
              className="w-full bg-[#F7F7F8] rounded-xl px-3 py-2.5 text-[15px] outline-none"
            >
              <option value={UNSET}>本部（未設定でもOK）</option>
              {ORG_TREE.map((h) => <option key={h.key} value={h.key}>{h.key}</option>)}
            </select>
            <select
              value={bu}
              onChange={(e) => { setBu(e.target.value); setDistrict(UNSET); }}
              disabled={buOptions.length === 0}
              className="w-full bg-[#F7F7F8] rounded-xl px-3 py-2.5 text-[15px] outline-none disabled:opacity-40"
            >
              <option value={UNSET}>部・支部（未設定でもOK）</option>
              {buOptions.map((b) => <option key={b.key} value={b.key}>{b.key}</option>)}
            </select>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={districtOptions.length === 0}
              className="w-full bg-[#F7F7F8] rounded-xl px-3 py-2.5 text-[15px] outline-none disabled:opacity-40"
            >
              <option value={UNSET}>地区（未設定でもOK）</option>
              {districtOptions.map((d) => <option key={d.key} value={d.key}>{d.key}</option>)}
            </select>
          </div>
        </div>

        {/* ── 住所 ── */}
        <div className="ios-card px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-1">
            住所 <span className="font-normal text-[11px]">（任意・ざっくりでOK）</span>
          </h3>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="旭川市豊岡3条4丁目1-2 ○○ハイツ201"
            className="w-full bg-transparent outline-none text-[15px] py-2 placeholder:text-[#C7C7CC]"
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleGeocode}
              disabled={!address.trim() || geocoding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F0F0] text-[12px] font-bold text-[var(--color-subtext)] active:opacity-70 disabled:opacity-40"
            >
              {geocoding ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              住所から地図の位置を取得
            </button>
            {lat != null && lng != null && (
              <span className="text-[11px] text-[#34C759] font-bold">位置あり</span>
            )}
          </div>
          {geocodeMsg && (
            <p className="text-[11px] text-[var(--color-subtext)] mt-1.5">{geocodeMsg}</p>
          )}
          {(lat == null || lng == null) && (
            <p className="text-[11px] text-[#C2410C] bg-[#FFEAD0] rounded-lg px-2.5 py-1.5 mt-2">
              位置が無い人は地図にピンが出ません。メンバー一覧の「住所不明」タグから
              いつでも探せるので、分かった時点で追加すればOKです。
            </p>
          )}
        </div>

        {/* ── 詳しい項目 (折りたたみ) ── */}
        <div className="ios-card overflow-hidden">
          <button
            type="button"
            onClick={() => { tapHaptic(); setDetailOpen((o) => !o); }}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-[#F5F5F5]"
          >
            <span className="text-sm font-semibold text-[var(--color-subtext)]">
              詳しい項目（全部あとから編集できます）
            </span>
            {detailOpen
              ? <ChevronUp size={18} className="text-[#8E8E93]" />
              : <ChevronDown size={18} className="text-[#8E8E93]" />}
          </button>
          {detailOpen && (
            <div className="px-4 pb-3 border-t border-[#F0F0F0]">
              <div className="grid grid-cols-2 gap-x-4 border-b border-[#F0F0F0]">
                <Field label="役職" value={role} onChange={setRole} placeholder="地区リーダー" half />
                <Field label="同居" value={family} onChange={setFamily} placeholder="親" half />
              </div>
              <Field label="自宅TEL" value={phone} onChange={setPhone} placeholder="0166-00-0000" inputMode="tel" />
              <Field label="携帯" value={mobile} onChange={setMobile} placeholder="090-0000-0000" inputMode="tel" />
              <div className="grid grid-cols-2 gap-x-4 border-b border-[#F0F0F0]">
                <Field label="生年月日" value={birthday} onChange={setBirthday} placeholder="1995-04-01" type="date" half />
                <Field label="入会月日" value={enrollmentDate} onChange={setEnrollmentDate} placeholder="2010-05-03" type="date" half />
              </div>
              <SelectableField
                label="教学"
                value={educationLevel}
                onChange={setEducationLevel}
                placeholder="1級 / 2級 / 3級 / 任用試験"
                options={['1級', '2級', '3級', '任用試験']}
                listId="edu-options"
              />
              <Field label="職場" value={workplace} onChange={setWorkplace} placeholder="ユニクロ永山店" />
              <Field label="訪問サイクル（日）" value={visitCycleDays} onChange={setVisitCycleDays} placeholder="30" inputMode="numeric" />
              <div className="py-2.5 border-b border-[#F0F0F0]">
                <label className="block text-[11px] text-[var(--color-subtext)] mb-1">備考（ひと言）</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="夜勤明けの午前は避ける"
                  className="w-full bg-transparent outline-none text-[15px] placeholder:text-[#C7C7CC]"
                />
              </div>
              <div className="py-2.5">
                <label className="block text-[11px] text-[var(--color-subtext)] mb-1">情報（詳しいメモ・複数行OK）</label>
                <textarea
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  placeholder={'・どんな人か（見た目・雰囲気）\n・家族構成や活動状況\n・訪問時に気をつけること'}
                  className="w-full h-28 rounded-lg border border-[#E5E5EA] p-2 text-[13px] resize-none outline-none focus:border-[#007AFF] placeholder:text-[#C7C7CC]"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-[#FF3B30] bg-[#FFE5E5] rounded-xl px-3 py-2">
            登録に失敗しました: {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-[#000] text-white rounded-2xl py-3.5 text-[15px] font-bold active:opacity-80 transition-opacity disabled:opacity-30"
        >
          {saving ? '登録中…' : 'このメンバーを登録'}
        </button>
        {fullName.length === 0 && (
          <p className="text-[11px] text-[var(--color-subtext)] text-center">
            名字か名前、どちらかを入れると登録できます
          </p>
        )}
      </div>
    </div>
  );
}
