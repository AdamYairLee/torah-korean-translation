-- Run once in your Supabase project's SQL Editor.
-- Paid article bodies and customer data must NEVER be committed to public GitHub.
create table if not exists public.torah_5787_articles (
  id text primary key,
  title text not null,
  blocks jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.torah_5787_membership_periods (
  transaction_id text primary key,
  buyer_email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint torah_5787_period_valid check (ends_at > starts_at)
);
create index if not exists torah_5787_membership_email on public.torah_5787_membership_periods (lower(buyer_email));
create table if not exists public.torah_5787_webhook_events (
  message_id text primary key,
  transaction_id text not null,
  event_type text not null,
  received_at timestamptz not null default now()
);
create table if not exists public.torah_5787_admins (
  user_id uuid primary key references auth.users(id)
);

-- Neither visitors nor authenticated clients may query paid content or rights directly.
alter table public.torah_5787_articles enable row level security;
alter table public.torah_5787_membership_periods enable row level security;
alter table public.torah_5787_webhook_events enable row level security;
alter table public.torah_5787_admins enable row level security;
revoke all on public.torah_5787_articles, public.torah_5787_membership_periods,
  public.torah_5787_webhook_events, public.torah_5787_admins from anon, authenticated;

-- Administrator access is assigned by an operator in the SQL Editor, never by browser input.
-- After you create and confirm the owner's Supabase login:
-- insert into public.torah_5787_admins(user_id)
-- select id from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
-- on conflict (user_id) do nothing;

-- First private article records are inserted only once the edited Word content is ready.
-- published_at must be the real publication time. '요약' is not imported.
