-- 商業化相關：每日用量、訂閱、帳務明細 + 原子扣量 RPC
-- 於 Supabase SQL Editor 執行，或使用 Supabase CLI：supabase db push

-- ─── usage_daily：依租戶 + 使用者 + 日期計次 ───────────────────────────────
create table if not exists public.usage_daily (
  tenant_id text not null default 'default',
  user_id text not null,
  usage_date date not null,
  requests_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id, usage_date)
);

create index if not exists usage_daily_user_idx
  on public.usage_daily (user_id, usage_date desc);

-- ─── subscriptions：依租戶的使用者方案 ─────────────────────────────────────
create table if not exists public.subscriptions (
  tenant_id text not null default 'default',
  user_id text not null,
  plan_key text not null default 'free',
  status text not null default 'active',
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- ─── usage_ledger：扣量明細（稽核／對帳） ───────────────────────────────────
create table if not exists public.usage_ledger (
  id bigserial primary key,
  tenant_id text not null default 'default',
  user_id text not null,
  units integer not null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_ledger_user_created_idx
  on public.usage_ledger (tenant_id, user_id, created_at desc);

-- ─── 原子扣量：與 app/db.py 的 supabase.rpc("increment_usage_daily", ...) 對齊 ─
create or replace function public.increment_usage_daily(
  p_tenant_id text,
  p_user_id text,
  p_usage_date date,
  p_units integer
)
returns table (requests_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_units is null or p_units <= 0 then
    raise exception 'p_units must be positive';
  end if;

  insert into public.usage_daily (tenant_id, user_id, usage_date, requests_count, updated_at)
  values (p_tenant_id, p_user_id, p_usage_date, p_units, now())
  on conflict (tenant_id, user_id, usage_date)
  do update set
    requests_count = public.usage_daily.requests_count + excluded.requests_count,
    updated_at = now()
  returning public.usage_daily.requests_count into v_count;

  return query select v_count;
end;
$$;

revoke all on function public.increment_usage_daily(text, text, date, integer) from public;
grant execute on function public.increment_usage_daily(text, text, date, integer) to service_role;
-- 若日後改由已登入使用者（RLS）呼叫，再視需求 grant authenticated

-- ─── RLS（僅在「使用 anon key + JWT 含 tenant_id」時有意義；service_role 會繞過）─
alter table public.usage_daily enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_ledger enable row level security;

-- 預設拒絕；請依你的 JWT 結構調整 policy（此處為範例：claim `tenant_id`）
drop policy if exists tenant_isolation_usage_daily on public.usage_daily;
create policy tenant_isolation_usage_daily
  on public.usage_daily
  for all
  using (
    coalesce(tenant_id, 'default')
    = coalesce((current_setting('request.jwt.claims', true)::json ->> 'tenant_id'), 'default')
  );

drop policy if exists tenant_isolation_subscriptions on public.subscriptions;
create policy tenant_isolation_subscriptions
  on public.subscriptions
  for all
  using (
    coalesce(tenant_id, 'default')
    = coalesce((current_setting('request.jwt.claims', true)::json ->> 'tenant_id'), 'default')
  );

drop policy if exists tenant_isolation_usage_ledger on public.usage_ledger;
create policy tenant_isolation_usage_ledger
  on public.usage_ledger
  for all
  using (
    coalesce(tenant_id, 'default')
    = coalesce((current_setting('request.jwt.claims', true)::json ->> 'tenant_id'), 'default')
  );
