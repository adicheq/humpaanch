-- Hum Paanch - Supabase Schema
-- Run this in the Supabase SQL Editor

create table meal_plans (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  day text not null,
  plan_data jsonb not null,
  dinner_options jsonb default '[]'::jsonb,
  winning_option text,
  status text default 'voting_open' check (status in ('voting_open', 'finalized')),
  created_at timestamptz default now()
);

create table votes (
  id uuid default gen_random_uuid() primary key,
  meal_plan_date date not null references meal_plans(date),
  member_id text not null check (member_id in ('kamini', 'riya', 'arth', 'aditya')),
  option_index int not null,
  created_at timestamptz default now(),
  unique(meal_plan_date, member_id)
);

create table requests (
  id uuid default gen_random_uuid() primary key,
  member_id text not null check (member_id in ('kamini', 'riya', 'arth', 'aditya')),
  message text not null,
  active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table meal_reactions (
  id uuid default gen_random_uuid() primary key,
  meal_plan_date date not null,
  meal_slot text not null,
  member_id text not null check (member_id in ('kamini', 'riya', 'arth', 'aditya')),
  reaction text not null check (reaction in ('ok', 'suggest_change')),
  comment text,
  created_at timestamptz default now(),
  unique(meal_plan_date, meal_slot, member_id)
);

create table member_tastes (
  id uuid default gen_random_uuid() primary key,
  member_id text not null check (member_id in ('kamini', 'riya', 'arth', 'aditya')),
  category text not null check (category in ('loves', 'dislikes', 'restrictions', 'breakfast_pref', 'dinner_pref', 'notes')),
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique(member_id, category)
);

create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  member_id text not null unique check (member_id in ('kamini', 'riya', 'arth', 'aditya')),
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- Enable RLS but allow all operations (no auth, family app)
alter table meal_plans enable row level security;
alter table votes enable row level security;
alter table requests enable row level security;
alter table meal_reactions enable row level security;
alter table member_tastes enable row level security;
alter table push_subscriptions enable row level security;

create policy "Allow all on meal_plans" on meal_plans for all using (true) with check (true);
create policy "Allow all on votes" on votes for all using (true) with check (true);
create policy "Allow all on requests" on requests for all using (true) with check (true);
create policy "Allow all on meal_reactions" on meal_reactions for all using (true) with check (true);
create policy "Allow all on member_tastes" on member_tastes for all using (true) with check (true);
create policy "Allow all on push_subscriptions" on push_subscriptions for all using (true) with check (true);

-- Enable realtime for votes (live voting updates)
alter publication supabase_realtime add table votes;
