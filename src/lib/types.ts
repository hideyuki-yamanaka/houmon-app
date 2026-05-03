// ── メンバーカテゴリ ──
export type MemberCategory = 'general' | 'young';

// ── メンバー ──
export interface Member {
  id: string;
  name: string;
  nameKana?: string;
  district: string;                  // 男子部: "豊岡部英雄地区" など親+地区結合 / ヤング: "下山地区" など地区のみ
  category?: MemberCategory;         // 省略時は 'general' 扱い
  honbu?: string;                    // ヤング限定: "東栄本部" "豊岡本部" など親組織
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  mobile?: string;
  birthday?: string;
  enrollmentDate?: string;
  age?: number;
  workplace?: string;
  role?: string;
  educationLevel?: string;
  family?: string;
  altarStatus?: string;
  dailyPractice?: string;
  newspaper?: string;
  financialContribution?: string;
  activityStatus?: string;
  youthGroup?: string;
  notes?: string;
  info?: string;                     // 「情報」セクション(複数行、鉛筆アイコンで編集モード)
  visitCycleDays: number;
  /** 「行きたい」ブックマーク。ON にするとマップピンが星マークに変わる */
  wantToVisit?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── 訪問カテゴリ ──
// 2026-04-26: 旧 'met' を 'met_self'(本人に会えた)/'met_family'(家族に会えた)に
// 分割。SQL マイグレーション(2026-04-26-split-met-status.sql)で既存ログも仕分け済。
export type VisitStatus =
  | 'met_self'
  | 'met_family'
  | 'absent'
  | 'refused'
  | 'unknown_address'
  | 'moved';

// ── 対応者 ──
export type Respondent = 'father' | 'mother' | 'wife' | 'son' | 'sibling';

// ── 訪問記録 ──
export interface Visit {
  id: string;
  memberId: string;
  visitedAt: string; // YYYY-MM-DD
  status: VisitStatus;
  /** 対応者(複数可)。父+母 など同時に対応してくれた場合に複数入る。
   *  2026-04-26 に旧 single respondent から配列化(SQL マイグ済)。 */
  respondents?: Respondent[];
  notes?: Record<string, unknown>; // Tiptap JSON
  summary?: string;
  keywords?: string[];
  images?: string[];
  deletedAt?: string;
  /** この訪問記録を実際に書いた人 (auth.users.id)。
   *  共有機能の「誰が記入」表示用。古いデータでは undefined ありえる。 */
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── UI用の派生型 ──
export interface MemberWithVisitInfo extends Member {
  lastVisitDate?: string;
  lastVisitStatus?: VisitStatus;
  totalVisits: number;
  isOverdue: boolean;
  daysSinceLastVisit?: number;
}

export interface VisitWithMember extends Visit {
  memberName: string;
  memberDistrict: string;
}

// ── DBのスネークケース型 ──
export interface MemberRow {
  id: string;
  name: string;
  name_kana: string | null;
  district: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  mobile: string | null;
  birthday: string | null;
  enrollment_date: string | null;
  age: number | null;
  workplace: string | null;
  role: string | null;
  education_level: string | null;
  family: string | null;
  altar_status: string | null;
  daily_practice: string | null;
  newspaper: string | null;
  financial_contribution: string | null;
  activity_status: string | null;
  youth_group: string | null;
  notes: string | null;
  info: string | null;
  visit_cycle_days: number;
  category: string;
  honbu: string | null;
  /** 「行きたい」ブックマーク(ALTER TABLE で後付けカラム。古い行は NULL ありえる) */
  want_to_visit: boolean | null;
  /** マルチユーザー化(2026-05-03)。所有者の auth.users.id。
   *  既存行は移行直後だけ NULL ありえる(移行 SQL 後に NOT NULL 化する) */
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── マルチユーザー化 (2026-05-03 / B型: オーナー+招待) ──
//   members.user_id / visits.user_id は "オーナー" の id。
//   招待された人(team_memberships.member_id) もアクセス可だが
//   編集権限は role='editor' に絞られる。
export type TeamRole = 'viewer' | 'editor';

export interface TeamMembershipRow {
  owner_id: string;
  member_id: string;
  role: TeamRole;
  invited_at: string;
}

export interface InviteTokenRow {
  token: string;
  owner_id: string;
  role: TeamRole;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  note: string | null;
}

export interface VisitRow {
  id: string;
  member_id: string;
  /** マルチユーザー化(2026-05-03)。所有者の auth.users.id。 */
  user_id?: string | null;
  /** 訪問記録を実際に書いた人 (=auth.uid())。共有 UI で「誰が記入」表示に使う。
   *  既存行は user_id をバックフィル済(オーナー本人と見なす)。 */
  created_by?: string | null;
  visited_at: string;
  status: string;
  /** 旧: 単一対応者。後方互換のため当面残す(新規書き込みは respondents に行う)。 */
  respondent: string | null;
  /** 新: 対応者配列(2026-04-26 から)。Postgres TEXT[]。 */
  respondents: string[] | null;
  notes: Record<string, unknown> | null;
  summary: string | null;
  keywords: string[] | null;
  images: string[] | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
