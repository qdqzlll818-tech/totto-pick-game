-- Run this once in the Supabase SQL Editor after creating the project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '托托玩家',
  coins integer not null default 0,
  clears integer not null default 0,
  best_score integer not null default 0,
  equipped_skin text not null default 'default',
  updated_at timestamptz not null default now()
);

create table if not exists public.level_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null,
  completed boolean not null default false,
  best_score integer not null default 0,
  best_time_ms integer,
  completed_at timestamptz,
  primary key (user_id, level_id)
);

create table if not exists public.user_skins (
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);

alter table public.profiles enable row level security;
alter table public.level_progress enable row level security;
alter table public.user_skins enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own progress" on public.level_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own skins" on public.user_skins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
