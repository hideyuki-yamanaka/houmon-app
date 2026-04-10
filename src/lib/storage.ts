import { supabase, isMockMode } from './supabase';
import { nanoid } from 'nanoid';
import type { Member, MemberRow, MemberWithVisitInfo, Visit, VisitRow, VisitStatus, Respondent } from './types';
import { MOCK_MEMBERS, MOCK_VISITS, getMockMembersWithVisitInfo, getMockVisits } from './mock-data';

// ── Row → App 変換 ──

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    nameKana: row.name_kana ?? undefined,
    district: row.district,
    category: (row.category === 'young' ? 'young' : 'general'),
    honbu: row.honbu ?? undefined,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    phone: row.phone ?? undefined,
    mobile: row.mobile ?? undefined,
    birthday: row.birthday ?? undefined,
    enrollmentDate: row.enrollment_date ?? undefined,
    age: row.age ?? undefined,
    workplace: row.workplace ?? undefined,
    role: row.role ?? undefined,
    educationLevel: row.education_level ?? undefined,
    family: row.family ?? undefined,
    altarStatus: row.altar_status ?? undefined,
    dailyPractice: row.daily_practice ?? undefined,
    newspaper: row.newspaper ?? undefined,
    financialContribution: row.financial_contribution ?? undefined,
    activityStatus: row.activity_status ?? undefined,
    youthGroup: row.youth_group ?? undefined,
    notes: row.notes ?? undefined,
    visitCycleDays: row.visit_cycle_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    memberId: row.member_id,
    visitedAt: row.visited_at,
    status: row.status as VisitStatus,
    respondent: (row.respondent as Respondent) ?? undefined,
    notes: row.notes ?? undefined,
    summary: row.summary ?? undefined,
    keywords: row.keywords ?? undefined,
    images: row.images ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── メンバー CRUD ──

export async function getMembers(): Promise<Member[]> {
  if (isMockMode) return MOCK_MEMBERS;
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('district')
    .order('name');
  if (error) throw error;
  return (data as MemberRow[]).map(toMember);
}

export async function getMember(id: string): Promise<Member | null> {
  if (isMockMode) return MOCK_MEMBERS.find(m => m.id === id) ?? null;
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return toMember(data as MemberRow);
}

export async function updateMember(id: string, updates: Partial<MemberRow>): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getAllMemberIds(): Promise<string[]> {
  if (isMockMode) return MOCK_MEMBERS.map(m => m.id);
  const { data, error } = await supabase
    .from('members')
    .select('id');
  if (error) throw error;
  return (data as { id: string }[]).map(r => r.id);
}

export async function getAllVisitIds(): Promise<string[]> {
  if (isMockMode) return MOCK_VISITS.map(v => v.id);
  const { data, error } = await supabase
    .from('visits')
    .select('id')
    .is('deleted_at', null);
  if (error) throw error;
  return (data as { id: string }[]).map(r => r.id);
}

// ── 訪問記録 CRUD ──

export async function getVisits(memberId: string): Promise<Visit[]> {
  if (isMockMode) return getMockVisits(memberId);
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('member_id', memberId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: false });
  if (error) throw error;
  return (data as VisitRow[]).map(toVisit);
}

export async function getVisitById(id: string): Promise<(Visit & { memberName: string; memberDistrict: string }) | null> {
  if (isMockMode) {
    const v = MOCK_VISITS.find(v => v.id === id);
    if (!v) return null;
    const member = MOCK_MEMBERS.find(m => m.id === v.memberId);
    return { ...v, memberName: member?.name ?? '', memberDistrict: member?.district ?? '' };
  }
  const { data, error } = await supabase
    .from('visits')
    .select('*, members(name, district)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const row = data as VisitRow & { members?: { name: string; district: string } | null };
  return {
    ...toVisit(row),
    memberName: row.members?.name ?? '',
    memberDistrict: row.members?.district ?? '',
  };
}

export async function getVisitsByDate(date: string): Promise<(Visit & { memberName: string; memberDistrict: string })[]> {
  if (isMockMode) {
    return MOCK_VISITS
      .filter(v => v.visitedAt === date)
      .map(v => {
        const member = MOCK_MEMBERS.find(m => m.id === v.memberId);
        return { ...v, memberName: member?.name ?? '', memberDistrict: member?.district ?? '' };
      });
  }
  const { data, error } = await supabase
    .from('visits')
    .select('*, members(name, district)')
    .eq('visited_at', date)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: VisitRow & { members?: { name: string; district: string } | null }) => ({
    ...toVisit(row),
    memberName: row.members?.name ?? '',
    memberDistrict: row.members?.district ?? '',
  }));
}

export async function getVisitsByMonth(year: number, month: number): Promise<Visit[]> {
  if (isMockMode) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return MOCK_VISITS.filter(v => v.visitedAt.startsWith(prefix));
  }
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .gte('visited_at', start)
    .lt('visited_at', end)
    .is('deleted_at', null)
    .order('visited_at', { ascending: false });
  if (error) throw error;
  return (data as VisitRow[]).map(toVisit);
}

export async function createVisit(
  memberId: string,
  visitedAt: string,
  status: VisitStatus = 'met',
): Promise<Visit> {
  const id = nanoid(12);
  const now = new Date().toISOString();
  const row: VisitRow = {
    id,
    member_id: memberId,
    visited_at: visitedAt,
    status,
    respondent: null,
    notes: null,
    summary: null,
    keywords: null,
    images: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  if (isMockMode) {
    return toVisit(row);
  }
  const { error } = await supabase.from('visits').insert(row);
  if (error) throw error;
  return toVisit(row);
}

export async function updateVisit(id: string, updates: Partial<VisitRow>): Promise<void> {
  if (isMockMode) {
    return;
  }
  const { error } = await supabase
    .from('visits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteVisit(id: string): Promise<void> {
  await updateVisit(id, { deleted_at: new Date().toISOString() });
}

export async function restoreVisit(id: string): Promise<void> {
  await updateVisit(id, { deleted_at: null });
}

export async function permanentlyDeleteVisit(id: string): Promise<void> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
}

export async function getTrashedVisits(): Promise<(Visit & { memberName: string })[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*, members(name)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data as (VisitRow & { members: { name: string } })[]).map((row) => ({
    ...toVisit(row),
    memberName: row.members.name,
  }));
}

// ── 画像アップロード ──

export async function uploadVisitImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${nanoid(12)}.${ext}`;
  const filePath = `visit-images/${fileName}`;

  const { error } = await supabase.storage
    .from('visit-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage
    .from('visit-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ── 集計クエリ ──

// ──────────────────────────────────────────────────────────────
// 読み仮名が未入力のメンバーに、ざっくり推測した読み仮名を一括で入れる。
// - nameKana が空欄のメンバーだけ対象
// - 推測は guessKana() に任せる（末尾に「（仮）」付き）
// - ネットワーク負荷を抑えるため 5 件ずつパラレルで updateMember
// - 成功分はローカル配列にも反映して返す
// - サイレントにエラーは握りつぶす（オフラインでも致命傷にしない）
// ──────────────────────────────────────────────────────────────
async function backfillGuessedKana<T extends Member>(members: T[]): Promise<T[]> {
  // 動的 import にして、storage を使う側が kanaGuess を持ってなくても壊れないようにする
  const { guessKana } = await import('./kanaGuess');
  const targets = members.filter(m => !m.nameKana || m.nameKana.trim() === '');
  if (targets.length === 0) return members;

  const BATCH = 5;
  const applied = new Map<string, string>();
  for (let i = 0; i < targets.length; i += BATCH) {
    const slice = targets.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (m) => {
        const guess = guessKana(m.name);
        if (!guess) return;
        try {
          await updateMember(m.id, { name_kana: guess });
          applied.set(m.id, guess);
        } catch {
          /* サイレントに失敗 */
        }
      }),
    );
  }

  if (applied.size === 0) return members;
  return members.map(m =>
    applied.has(m.id) ? { ...m, nameKana: applied.get(m.id) } : m,
  );
}

// セッション中 1 回だけバックフィルを走らせるためのフラグ
// (Fast Refresh しても module scope は維持されるので実質「初回ロード時だけ」動く)
let kanaBackfillDone = false;

export async function getMembersWithVisitInfo(): Promise<MemberWithVisitInfo[]> {
  if (isMockMode) return getMockMembersWithVisitInfo();
  const [rawMembers, { data: visitData }] = await Promise.all([
    getMembers(),
    supabase
      .from('visits')
      .select('member_id, visited_at, status')
      .is('deleted_at', null)
      .order('visited_at', { ascending: false }),
  ]);

  // 読み仮名の一括バックフィル（初回だけ）。失敗しても元の配列で続行。
  let members = rawMembers;
  if (!kanaBackfillDone) {
    kanaBackfillDone = true;
    try {
      members = await backfillGuessedKana(rawMembers);
    } catch {
      members = rawMembers;
    }
  }

  const visitMap = new Map<string, { lastDate: string; lastStatus: string; count: number }>();
  for (const v of (visitData ?? []) as { member_id: string; visited_at: string; status: string }[]) {
    const existing = visitMap.get(v.member_id);
    if (existing) {
      existing.count++;
    } else {
      visitMap.set(v.member_id, { lastDate: v.visited_at, lastStatus: v.status, count: 1 });
    }
  }

  const now = new Date();
  return members.map((m) => {
    const info = visitMap.get(m.id);
    const daysSince = info
      ? Math.floor((now.getTime() - new Date(info.lastDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    return {
      ...m,
      lastVisitDate: info?.lastDate,
      lastVisitStatus: info?.lastStatus as VisitStatus | undefined,
      totalVisits: info?.count ?? 0,
      isOverdue: daysSince === undefined ? true : daysSince > m.visitCycleDays,
      daysSinceLastVisit: daysSince,
    };
  });
}

export async function getAllVisits(): Promise<Visit[]> {
  if (isMockMode) return MOCK_VISITS.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .is('deleted_at', null)
    .order('visited_at', { ascending: false });
  if (error) throw error;
  return (data as VisitRow[]).map(toVisit);
}
