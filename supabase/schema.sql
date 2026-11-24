-- ============================================================================
-- Vana Ritual — Supabase PostgreSQL Schema & Atomic Slot Reservation RPC
-- ============================================================================
-- Execute this script in the Supabase SQL Editor for project:
-- https://vlrvoriorahryxgmljut.supabase.co
-- ============================================================================

create extension if not exists pgcrypto;

-- 0. MEMBERS TABLE (App-managed accounts)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  health_goal text not null check (health_goal in ('Energy', 'Immunity', 'Gut Health', 'Daily Habit')),
  password_salt text not null,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- 0b. PRODUCTS TABLE (Shot formulations & pricing managed in Admin)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Energy', 'Immunity', 'Gut Health', 'Daily Habit')),
  tagline text not null,
  botanicals text not null,
  size_ml integer not null default 60,
  price_pkr integer not null check (price_pkr >= 0),
  is_active boolean not null default true,
  image_url text not null
);

-- 1. LEADS TABLE
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  health_goal text not null check (health_goal in ('Energy', 'Immunity', 'Gut Health', 'Daily Habit')),
  has_early_bird boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_email on public.leads (email);

-- 2. PLANS TABLE
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('early-bird', 'weekly', 'bi-weekly', 'monthly')),
  name text not null,
  billing_cycle text not null,
  price_pkr integer not null check (price_pkr >= 0),
  shots_per_delivery integer not null check (shots_per_delivery > 0),
  perks jsonb not null default '[]'::jsonb,
  total_slots integer not null check (total_slots > 0),
  slots_taken integer not null default 0 check (slots_taken >= 0),
  is_active boolean not null default true
);

-- 3. SUBSCRIPTIONS TABLE
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  delivery_address text not null,
  city text not null,
  payment_gateway text not null check (payment_gateway in ('PayFast', 'Safepay', 'BankCard')),
  payment_method text not null default 'Card',
  amount_pkr integer not null default 0,
  is_sandbox boolean not null default false,
  gateway_txn_id text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  status text not null default 'reserved' check (status in ('reserved', 'active', 'paused')),
  next_dispatch_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_lead_id on public.subscriptions (lead_id);
create index if not exists idx_subscriptions_plan_id on public.subscriptions (plan_id);
create index if not exists idx_subscriptions_payment_status on public.subscriptions (payment_status);

-- 4. EVENTS TABLE
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('Wellness Retreat', 'Community Meetup', 'Habit Workshop')),
  event_date timestamptz not null,
  location text not null,
  spots_available integer not null default 0 check (spots_available >= 0),
  description text not null,
  image_url text not null
);

-- 5. SITE SETTINGS TABLE (SINGLETON)
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  launch_mode text not null default 'pre_launch' check (launch_mode in ('pre_launch', 'live_subscriptions')),
  launch_date timestamptz not null default '2027-01-01T00:00:00Z',
  community_invite_link text not null default 'https://chat.whatsapp.com/VanaRitualFoundingCircle',
  early_bird_total_slots integer not null default 100 check (early_bird_total_slots > 0),
  early_bird_slots_taken integer not null default 68 check (early_bird_slots_taken >= 0),
  updated_at timestamptz not null default now()
);

-- 6. PAYMENT LOGS TABLE (For reconciliation & debugging failed/rejected txns)
create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  gateway text not null,
  payment_method text,
  gateway_txn_id text,
  event_type text not null,
  status text not null check (status in ('info', 'success', 'failed')),
  amount_pkr integer,
  is_sandbox boolean not null default true,
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_logs_created_at on public.payment_logs (created_at desc);
create index if not exists idx_payment_logs_status on public.payment_logs (status);

-- 7. ATOMIC SLOT RESERVATION RPC
-- Marks subscription as paid, increments slots_taken on the chosen plan
-- (preventing overbooking when slots_taken >= total_slots), marks
-- has_early_bird = true if Early Bird, updates site_settings counter,
-- logs confirmation, and returns the community_invite_link immediately.
create or replace function public.reserve_slot_on_payment(
  sub_id uuid,
  txn_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_plan public.plans%rowtype;
  v_settings public.site_settings%rowtype;
  v_next_dispatch date;
begin
  -- Lock the subscription row first
  select * into v_sub
  from public.subscriptions
  where id = sub_id
  for update;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND';
  end if;

  -- Lock the plan row to guarantee atomic capacity check
  select * into v_plan
  from public.plans
  where id = v_sub.plan_id
  for update;

  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  -- Lock singleton site_settings row
  select * into v_settings
  from public.site_settings
  where id = 1
  for update;

  -- Idempotent return if already confirmed with same transaction
  if v_sub.payment_status = 'paid' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'subscription_id', v_sub.id,
      'plan_slug', v_plan.slug,
      'plan_name', v_plan.name,
      'gateway_txn_id', v_sub.gateway_txn_id,
      'next_dispatch_date', v_sub.next_dispatch_date,
      'slots_taken', v_plan.slots_taken,
      'total_slots', v_plan.total_slots,
      'community_invite_link', v_settings.community_invite_link
    );
  end if;

  -- Prevent overbooking
  if v_plan.slots_taken >= v_plan.total_slots then
    insert into public.payment_logs (
      subscription_id, gateway, payment_method, gateway_txn_id,
      event_type, status, amount_pkr, is_sandbox, error_message
    ) values (
      v_sub.id, v_sub.payment_gateway, v_sub.payment_method, txn_id,
      'slot_conflict', 'failed', v_sub.amount_pkr, v_sub.is_sandbox,
      'Plan slot capacity reached before payment confirmation'
    );
    raise exception 'SLOT_CAPACITY_REACHED';
  end if;

  if v_plan.slug = 'early-bird' and v_settings.early_bird_slots_taken >= v_settings.early_bird_total_slots then
    raise exception 'EARLY_BIRD_CAPACITY_REACHED';
  end if;

  -- Calculate next weekly dispatch date (first Monday after launch or +7 days)
  if v_settings.launch_mode = 'pre_launch' and v_settings.launch_date > now() then
    v_next_dispatch := (v_settings.launch_date at time zone 'UTC')::date + 3;
  else
    v_next_dispatch := current_date + 7;
  end if;

  -- Mark subscription paid & active/reserved
  update public.subscriptions
  set
    payment_status = 'paid',
    gateway_txn_id = txn_id,
    status = case when v_plan.slug = 'early-bird' then 'reserved' else 'active' end,
    next_dispatch_date = v_next_dispatch
  where id = v_sub.id;

  -- Atomically increment plan slot count
  update public.plans
  set slots_taken = slots_taken + 1
  where id = v_plan.id
  returning * into v_plan;

  -- Update early bird flags & singleton counters
  if v_plan.slug = 'early-bird' then
    update public.leads
    set has_early_bird = true
    where id = v_sub.lead_id;

    update public.site_settings
    set
      early_bird_slots_taken = early_bird_slots_taken + 1,
      updated_at = now()
    where id = 1
    returning * into v_settings;
  end if;

  insert into public.payment_logs (
    subscription_id, gateway, payment_method, gateway_txn_id,
    event_type, status, amount_pkr, is_sandbox, raw_payload
  ) values (
    v_sub.id, v_sub.payment_gateway, v_sub.payment_method, txn_id,
    'payment_confirmed', 'success', v_sub.amount_pkr, v_sub.is_sandbox,
    jsonb_build_object('plan_slug', v_plan.slug, 'slots_taken', v_plan.slots_taken)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'subscription_id', v_sub.id,
    'plan_slug', v_plan.slug,
    'plan_name', v_plan.name,
    'gateway_txn_id', txn_id,
    'next_dispatch_date', v_next_dispatch,
    'slots_taken', v_plan.slots_taken,
    'total_slots', v_plan.total_slots,
    'community_invite_link', v_settings.community_invite_link
  );
end;
$$;

-- 8. ROW LEVEL SECURITY
alter table public.leads enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.events enable row level security;
alter table public.site_settings enable row level security;
alter table public.payment_logs enable row level security;

-- Public read policies for storefront catalog & public settings
drop policy if exists "Public can read active plans" on public.plans;
create policy "Public can read active plans" on public.plans
  for select using (is_active = true);

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events" on public.events
  for select using (true);

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings
  for select using (true);

-- Service role performs all writes & reads on leads, subscriptions, payment_logs.

-- 9. SEED DATA (IDEMPOTENT)
insert into public.site_settings (
  id, launch_mode, launch_date, community_invite_link,
  early_bird_total_slots, early_bird_slots_taken
) values (
  1,
  'pre_launch',
  '2027-01-01T00:00:00Z',
  'https://chat.whatsapp.com/VanaRitualFoundingCircle',
  100,
  68
) on conflict (id) do nothing;

insert into public.plans (
  slug, name, billing_cycle, price_pkr, shots_per_delivery,
  perks, total_slots, slots_taken, is_active
) values
(
  'early-bird',
  'Founding Member Pass',
  'One-time reservation',
  100,
  7,
  '["First weekly organic box prioritized on Jan 2027 launch", "Immediate Founding Habit Circle community access", "Priority invitation to Margalla & seasonal retreats", "Locked-in founding pricing for 12 months"]'::jsonb,
  100,
  68,
  true
),
(
  'weekly',
  'Weekly Ritual Dispatch',
  'Billed weekly',
  3400,
  7,
  '["7 fresh cold-pressed organic shots every Monday morning", "Insulated glass bottle doorstep exchange", "Guided 60-second morning habit accountability", "Community meetup access in Lahore, Islamabad & Karachi"]'::jsonb,
  250,
  41,
  true
),
(
  'bi-weekly',
  'Bi-Weekly Rhythm',
  'Billed every 2 weeks',
  6400,
  14,
  '["14 organic shots across two consecutive Monday dispatches", "Seasonal formulation rotation (Energy, Immunity, Gut)", "Priority seat allocation at Habit Workshops", "Complimentary brass dosing spoon & ritual guide"]'::jsonb,
  150,
  29,
  true
),
(
  'monthly',
  'Monthly Sanctuary',
  'Billed monthly',
  11900,
  28,
  '["28 daily organic shots delivered across 4 weekly batches", "Dedicated habit check-in & personalized formulation mix", "Early access + member rate on Wellness Retreats", "Guest pass for one community courtyard gathering per quarter"]'::jsonb,
  100,
  18,
  true
)
on conflict (slug) do nothing;

insert into public.events (
  title, type, event_date, location, spots_available, description, image_url
)
select * from (values
  (
    'Margalla Dawn Breathwork & Elixir Immersion',
    'Wellness Retreat',
    '2027-02-14T06:30:00Z'::timestamptz,
    'Nathia Gali Pine Terrace, Islamabad Region',
    14,
    'A three-day restorative mountain gathering combining guided morning breathwork, cold-pressed botanical tastings, digital stillness, and nourishing whole-food dinners.',
    '/src/assets/images/retreat_sanctuary_1795507258661.jpg'
  ),
  (
    'Sunday Courtyard Table: Gut Health & Slow Mornings',
    'Community Meetup',
    '2027-01-17T09:00:00Z'::timestamptz,
    'Gulberg Botanical Courtyard, Lahore',
    22,
    'An unhurried morning table with fellow members. Sample seasonal turmeric-moringa formulations alongside fermented citrus plates and honest conversation.',
    '/src/assets/images/event_community_table_1795507259675.jpg'
  ),
  (
    'The 60-Second Morning Architecture Workshop',
    'Habit Workshop',
    '2027-01-24T10:30:00Z'::timestamptz,
    'Clifton Studio Space, Karachi',
    18,
    'Practical behavioral design with wellness practitioners: anchor circadian hydration, mineral absorption, and consistent morning routines without willpower fatigue.',
    '/src/assets/images/event_habit_workshop_1795507259206.jpg'
  )
) as v(title, type, event_date, location, spots_available, description, image_url)
where not exists (select 1 from public.events);
