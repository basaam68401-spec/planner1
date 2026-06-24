-- Supabase setup for Planner 1405
-- Run this once in Supabase SQL Editor.

create table if not exists public.planner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema text default 'planner-1405-supabase-v2',
  local_updated_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_planner_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_planner_states_updated_at on public.planner_states;

create trigger set_planner_states_updated_at
before update on public.planner_states
for each row
execute function public.set_planner_states_updated_at();

alter table public.planner_states enable row level security;

drop policy if exists "planner_states select own row" on public.planner_states;
drop policy if exists "planner_states insert own row" on public.planner_states;
drop policy if exists "planner_states update own row" on public.planner_states;
drop policy if exists "planner_states delete own row" on public.planner_states;

create policy "planner_states select own row"
on public.planner_states
for select
to authenticated
using (auth.uid() = user_id);

create policy "planner_states insert own row"
on public.planner_states
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "planner_states update own row"
on public.planner_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "planner_states delete own row"
on public.planner_states
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.planner_states to authenticated;
