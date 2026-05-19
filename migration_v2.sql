-- ============================================================
-- Hum Paanch V2 Migration
-- Adds: pantry, contexts, finish-log, refresh-log, kid badges,
--       plan locks, dish variations, dish tags
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================

-- 1) Pantry items (per family) ----------------------------------
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  name text NOT NULL,
  category text,                   -- veg / dairy / staple / spice / etc.
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','low','out')),
  notes text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_id, name)
);
CREATE INDEX IF NOT EXISTS idx_pantry_family ON pantry_items(family_id);
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pantry_items" ON pantry_items;
CREATE POLICY "Allow all on pantry_items" ON pantry_items FOR ALL USING (true) WITH CHECK (true);


-- 2) Meal contexts (travel / guests / fasting / exam / going_out) -
CREATE TABLE IF NOT EXISTS meal_contexts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  date_start date NOT NULL,
  date_end date NOT NULL,
  member_id text,                  -- null = whole family
  type text NOT NULL CHECK (type IN ('travel','guests','fasting','exam','going_out','sick','celebration','other')),
  note text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contexts_family_date ON meal_contexts(family_id, date_start, date_end);
ALTER TABLE meal_contexts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on meal_contexts" ON meal_contexts;
CREATE POLICY "Allow all on meal_contexts" ON meal_contexts FOR ALL USING (true) WITH CHECK (true);


-- 3) Finish-log: did you actually eat it? -----------------------
CREATE TABLE IF NOT EXISTS meal_finish_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  meal_plan_date date NOT NULL,
  meal_slot text NOT NULL,         -- breakfast | lunch | dinner | lunchbox | dinner_kamini | dinner_nyra
  member_id text NOT NULL,
  finish_rate text NOT NULL CHECK (finish_rate IN ('loved','ate_all','ate_some','refused','ordered_out','skipped')),
  dish_name text,                  -- snapshot of what was served
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_id, meal_plan_date, meal_slot, member_id)
);
CREATE INDEX IF NOT EXISTS idx_finish_log_family_date ON meal_finish_log(family_id, meal_plan_date);
CREATE INDEX IF NOT EXISTS idx_finish_log_member_dish ON meal_finish_log(family_id, member_id, dish_name);
ALTER TABLE meal_finish_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on meal_finish_log" ON meal_finish_log;
CREATE POLICY "Allow all on meal_finish_log" ON meal_finish_log FOR ALL USING (true) WITH CHECK (true);


-- 4) Refresh log: per-slot regeneration audit -------------------
CREATE TABLE IF NOT EXISTS refresh_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  meal_plan_date date NOT NULL,
  meal_slot text NOT NULL,
  member_scope text DEFAULT 'all', -- 'all' | member_id
  reason_tag text,                 -- 'similar' | 'lighter' | 'mood' | 'no_ingredient' | 'other'
  reason_note text,
  old_value text,
  new_value text,
  triggered_by text,               -- member_id who clicked refresh
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_family_date ON refresh_log(family_id, meal_plan_date);
ALTER TABLE refresh_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on refresh_log" ON refresh_log;
CREATE POLICY "Allow all on refresh_log" ON refresh_log FOR ALL USING (true) WITH CHECK (true);


-- 5) Kid badges (gamification) ----------------------------------
CREATE TABLE IF NOT EXISTS kid_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  member_id text NOT NULL,
  badge_key text NOT NULL,         -- 'tried_new', 'finished_week', 'veg_warrior'
  badge_label text NOT NULL,
  badge_emoji text DEFAULT '🏅',
  earned_for text,                 -- e.g. "Finished bhindi for 5 days"
  earned_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_badges_family_member ON kid_badges(family_id, member_id);
ALTER TABLE kid_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on kid_badges" ON kid_badges;
CREATE POLICY "Allow all on kid_badges" ON kid_badges FOR ALL USING (true) WITH CHECK (true);


-- 6) Plan locks: pin a slot before generation -------------------
CREATE TABLE IF NOT EXISTS plan_locks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  date date NOT NULL,
  meal_slot text NOT NULL,
  member_scope text DEFAULT 'default',
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_id, date, meal_slot, member_scope)
);
CREATE INDEX IF NOT EXISTS idx_plan_locks_family_date ON plan_locks(family_id, date);
ALTER TABLE plan_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on plan_locks" ON plan_locks;
CREATE POLICY "Allow all on plan_locks" ON plan_locks FOR ALL USING (true) WITH CHECK (true);


-- 7) Dish variations cache (LLM-generated, reused) --------------
CREATE TABLE IF NOT EXISTS dish_variations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid REFERENCES families(id),       -- null = global
  base_dish text NOT NULL,
  variations jsonb NOT NULL,                    -- [{name, tags[], notes}]
  generated_at timestamptz DEFAULT now(),
  UNIQUE(family_id, base_dish)
);
CREATE INDEX IF NOT EXISTS idx_variations_dish ON dish_variations(base_dish);
ALTER TABLE dish_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on dish_variations" ON dish_variations;
CREATE POLICY "Allow all on dish_variations" ON dish_variations FOR ALL USING (true) WITH CHECK (true);


-- 8) Dish tags: normalized tags for diversity scoring -----------
CREATE TABLE IF NOT EXISTS dish_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  dish_name text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,      -- ['paneer','north_indian','dal','soup',...]
  cuisine text,
  base_protein text,                            -- 'paneer', 'dal', 'eggs', 'mushroom', etc.
  meal_category text,                           -- 'soup', 'sabzi', 'rice_dish', 'noodles', etc.
  is_indulgent boolean DEFAULT false,
  is_millet boolean DEFAULT false,
  has_eggs boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_id, dish_name)
);
CREATE INDEX IF NOT EXISTS idx_dish_tags_family ON dish_tags(family_id);
ALTER TABLE dish_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on dish_tags" ON dish_tags;
CREATE POLICY "Allow all on dish_tags" ON dish_tags FOR ALL USING (true) WITH CHECK (true);


-- 9) Quick-log: free-text capture -------------------------------
CREATE TABLE IF NOT EXISTS quick_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  member_id text,
  raw_text text NOT NULL,
  parsed_kind text,                -- 'finish_rate' | 'context' | 'request' | 'pantry' | 'note'
  parsed_payload jsonb,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quick_logs_family ON quick_logs(family_id, created_at DESC);
ALTER TABLE quick_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on quick_logs" ON quick_logs;
CREATE POLICY "Allow all on quick_logs" ON quick_logs FOR ALL USING (true) WITH CHECK (true);


-- 10) Seed: starter pantry for Soni family (idempotent) ---------
INSERT INTO pantry_items (family_id, name, category, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'atta',         'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'rice',         'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'milk',         'dairy',  'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'curd',         'dairy',  'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'paneer',       'dairy',  'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'eggs',         'protein','in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'potato',       'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'onion',        'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'tomato',       'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'bhindi',       'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'gobhi',        'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'spinach',      'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'green peas',   'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'mushroom',     'veg',    'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'arhar dal',    'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'moong dal',    'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'chana dal',    'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'rajma',        'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'chole',        'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'oats',         'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'ragi',         'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'bread',        'staple', 'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'pav',          'staple', 'low'),
  ('00000000-0000-0000-0000-000000000001', 'fresh fruits', 'fruit',  'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'butter',       'dairy',  'in_stock'),
  ('00000000-0000-0000-0000-000000000001', 'cheese',       'dairy',  'in_stock')
ON CONFLICT (family_id, name) DO NOTHING;
