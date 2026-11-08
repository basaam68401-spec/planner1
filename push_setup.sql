-- Additive setup for Planner for Best Life 7.8.2 Web Push.
-- Run after cron_setup.sql. Existing planner_states and Telegram tables are untouched.
create table if not exists public.planner_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists planner_push_subscriptions_user_id_idx on public.planner_push_subscriptions(user_id);
alter table public.planner_push_subscriptions enable row level security;
revoke all on public.planner_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.planner_push_subscriptions to authenticated;
drop policy if exists "planner push select own" on public.planner_push_subscriptions;
drop policy if exists "planner push insert own" on public.planner_push_subscriptions;
drop policy if exists "planner push update own" on public.planner_push_subscriptions;
drop policy if exists "planner push delete own" on public.planner_push_subscriptions;
create policy "planner push select own" on public.planner_push_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy "planner push insert own" on public.planner_push_subscriptions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "planner push update own" on public.planner_push_subscriptions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "planner push delete own" on public.planner_push_subscriptions for delete to authenticated using ((select auth.uid())=user_id);

-- Reuse the existing Vault secret created by cron_setup.sql.
-- Deploy planner-push-cron and set VAPID_* and PLANNER_CRON_SECRET first.
select cron.unschedule(jobid) from cron.job where jobname='planner-web-push-every-minute';
select cron.schedule('planner-web-push-every-minute','* * * * *',$$
  select net.http_post(
    url := 'https://esrqfulstdqnpbaldbko.supabase.co/functions/v1/planner-push-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='planner_cron_secret' limit 1)
    ),
    body := jsonb_build_object('source','pg_cron','requested_at',now()),
    timeout_milliseconds := 15000
  ) as request_id;
$$);
