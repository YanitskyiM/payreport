create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  worker_name text not null default 'Alex Johnson',
  hourly_rate double precision not null default 28,
  weekly_goal_hours double precision not null default 40,
  overworks_rate double precision not null default 1.5,
  active_shift_start timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source text not null check (source in ('timer', 'manual')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists time_entries_user_id_start_at_idx
  on public.time_entries (user_id, start_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "time_entries_select_own" on public.time_entries;
create policy "time_entries_select_own"
on public.time_entries
for select
using (auth.uid() = user_id);

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own"
on public.time_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own"
on public.time_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own"
on public.time_entries
for delete
using (auth.uid() = user_id);

alter table public.profiles
  add column if not exists overworks_rate double precision not null default 1.5;

-- Push notification subscriptions (one row per device per user)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

