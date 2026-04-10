-- ========================================
-- 家庭訪問アプリ Supabase Schema
-- ========================================

-- メンバーテーブル
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  mobile TEXT,
  birthday TEXT,
  enrollment_date TEXT,
  age INTEGER,
  workplace TEXT,
  role TEXT,
  education_level TEXT,
  family TEXT,
  altar_status TEXT,
  daily_practice TEXT,
  newspaper TEXT,
  financial_contribution TEXT,
  activity_status TEXT,
  youth_group TEXT,
  notes TEXT,
  visit_cycle_days INTEGER DEFAULT 30,
  category TEXT NOT NULL DEFAULT 'general', -- 'general' | 'young'
  honbu TEXT,                                -- ヤング限定: "東栄本部" "豊岡本部" など
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 既存DB向け移行:
-- ALTER TABLE members ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
-- ALTER TABLE members ADD COLUMN IF NOT EXISTS honbu TEXT;

-- 訪問記録テーブル
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  visited_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'met',
  respondent TEXT,
  notes JSONB,
  summary TEXT,
  keywords TEXT[],
  images TEXT[],
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_visits_member_id ON visits(member_id);
CREATE INDEX idx_visits_visited_at ON visits(visited_at);
CREATE INDEX idx_members_district ON members(district);

-- RLS（Row Level Security）はオフ（個人利用のため）
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- 全員アクセス可能ポリシー（認証不要）
CREATE POLICY "Allow all on members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on visits" ON visits FOR ALL USING (true) WITH CHECK (true);
