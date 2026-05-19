-- ============================================================
-- Hum Paanch Multi-Tenancy Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create families table
CREATE TABLE IF NOT EXISTS families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id),
  member_id text NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '👤',
  color text NOT NULL DEFAULT 'bg-gray-500',
  is_child boolean DEFAULT false,
  dietary_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_id, member_id)
);

-- Step 3: Insert Soni family
INSERT INTO families (id, name, invite_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'Soni Family', 'SONI2026')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Insert Soni family members
INSERT INTO family_members (family_id, member_id, name, emoji, color, is_child, dietary_info) VALUES
('00000000-0000-0000-0000-000000000001', 'kamini', 'Kamini', 'K', 'bg-pink-500', false, '{"type": "jain", "notes": "Pure vegetarian, Jain. Health conscious - loves oats, millets, sandwiches, overnight oats, chia pudding. Also likes indulging sometimes - parathas, chole bhature, pav bhaji. Lunch: roti, sabzi, dal, sometimes chawal. Dinner before 7 PM - prefers something different than sabzi roti, likes soups. Eats onion, garlic, aloo."}'),
('00000000-0000-0000-0000-000000000001', 'riya', 'Riya', 'R', 'bg-purple-500', false, '{"type": "veg+egg", "notes": "Loves good tasting food, loves eggs in breakfast (all kinds). Likes most sabzis and dals. Loves maggi. Comes home after office and gym around 8:30 PM."}'),
('00000000-0000-0000-0000-000000000001', 'arth', 'Arth', 'A', 'bg-blue-500', false, '{"type": "veg+egg", "notes": "Likes most things, least choosy. Can eat most things."}'),
('00000000-0000-0000-0000-000000000001', 'aditya', 'Aditya', 'Ad', 'bg-green-500', false, '{"type": "veg+egg", "notes": "Can eat most basic things but cannot eat karela, lauki and other non-tasty things. Loves south indian food, dosa, uttapam."}'),
('00000000-0000-0000-0000-000000000001', 'nyra', 'Nyra', 'N', 'bg-violet-500', true, '{"type": "veg", "notes": "8 years old, goes to school at 8 AM, breakfast at 7:45 AM. Very picky eater - likes milk, chocos, cereals, all fruits, roti, aloo, bhindi, french fries. Does not like junk food, dal, chawal. Takes a lot of time during meals."}')
ON CONFLICT (family_id, member_id) DO NOTHING;

-- Step 5: Add family_id to all existing tables
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE votes ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE meal_reactions ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE member_tastes ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);
ALTER TABLE member_pins ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id);

-- Step 6: Backfill all existing data to Soni family
UPDATE meal_plans SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE votes SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE requests SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE meal_reactions SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE member_tastes SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE push_subscriptions SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;
UPDATE member_pins SET family_id = '00000000-0000-0000-0000-000000000001' WHERE family_id IS NULL;

-- Step 7: Make family_id NOT NULL
ALTER TABLE meal_plans ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE votes ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE requests ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE meal_reactions ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE member_tastes ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE member_pins ALTER COLUMN family_id SET NOT NULL;

-- Step 8: Drop old hardcoded member_id CHECK constraints
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_member_id_check;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_member_id_check;
ALTER TABLE meal_reactions DROP CONSTRAINT IF EXISTS meal_reactions_member_id_check;
ALTER TABLE member_tastes DROP CONSTRAINT IF EXISTS member_tastes_member_id_check;
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_member_id_check;

-- Step 9: Update unique constraints to be family-scoped
-- Drop old unique constraints and add family-scoped ones

-- meal_plans: unique on (family_id, date) instead of just (date)
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_date_key;
ALTER TABLE meal_plans ADD CONSTRAINT meal_plans_family_date_key UNIQUE(family_id, date);

-- votes: unique on (family_id, meal_plan_date, member_id)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_meal_plan_date_member_id_key;
ALTER TABLE votes ADD CONSTRAINT votes_family_date_member_key UNIQUE(family_id, meal_plan_date, member_id);

-- member_tastes: unique on (family_id, member_id, category)
ALTER TABLE member_tastes DROP CONSTRAINT IF EXISTS member_tastes_member_id_category_key;
ALTER TABLE member_tastes ADD CONSTRAINT member_tastes_family_member_category_key UNIQUE(family_id, member_id, category);

-- push_subscriptions: unique on (family_id, member_id)
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_member_id_key;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_family_member_key UNIQUE(family_id, member_id);

-- member_pins: unique on (family_id, member_id)
ALTER TABLE member_pins DROP CONSTRAINT IF EXISTS member_pins_member_id_key;
ALTER TABLE member_pins ADD CONSTRAINT member_pins_family_member_key UNIQUE(family_id, member_id);

-- Step 10: Enable RLS on new tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on family_members" ON family_members FOR ALL USING (true) WITH CHECK (true);

-- Step 11: Add indexes for family_id lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_id ON meal_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_votes_family_id ON votes(family_id);
CREATE INDEX IF NOT EXISTS idx_requests_family_id ON requests(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_reactions_family_id ON meal_reactions(family_id);
CREATE INDEX IF NOT EXISTS idx_member_tastes_family_id ON member_tastes(family_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_family_id ON push_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_member_pins_family_id ON member_pins(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
