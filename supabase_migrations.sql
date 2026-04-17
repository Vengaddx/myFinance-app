-- Run these in your Supabase SQL editor

-- 1. income_records: for Cash Flow / Savings Rate feature
CREATE TABLE IF NOT EXISTS income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'Salary',
  amount NUMERIC NOT NULL DEFAULT 0,
  month_key TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own income records" ON income_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. allocation_targets: for Rebalancing Alert feature
CREATE TABLE IF NOT EXISTS allocation_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  target_pct NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(user_id, category)
);
ALTER TABLE allocation_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own allocation targets" ON allocation_targets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
