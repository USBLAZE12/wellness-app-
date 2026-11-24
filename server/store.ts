import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  HealthGoal,
  LaunchMode,
  Lead,
  MemberUser,
  PaymentGateway,
  PaymentLog,
  PaymentMethod,
  Plan,
  PlanSlug,
  SiteSettings,
  SubscriptionRecord,
  WellnessEvent,
  WellnessProduct,
} from '../src/types/wellness.ts';

export interface StorageDiagnostics {
  mode: 'supabase' | 'app_memory';
  supabaseConfigured: boolean;
  schemaReady: boolean;
  supabaseUrl: string;
  reason?: string;
}

interface StoredMember extends MemberUser {
  password_salt: string;
  password_hash: string;
}

interface MemoryDatabase {
  settings: SiteSettings;
  plans: Plan[];
  products: WellnessProduct[];
  events: WellnessEvent[];
  members: StoredMember[];
  leads: Lead[];
  subscriptions: SubscriptionRecord[];
  paymentLogs: PaymentLog[];
}

const DEFAULT_SUPABASE_URL = 'https://vlrvoriorahryxgmljut.supabase.co';

const memoryDb: MemoryDatabase = {
  settings: {
    id: 1,
    launch_mode: 'pre_launch',
    launch_date: '2027-01-01T00:00:00Z',
    community_invite_link: 'https://chat.whatsapp.com/VanaRitualFoundingCircle',
    early_bird_total_slots: 100,
    early_bird_slots_taken: 68,
    updated_at: new Date().toISOString(),
  },
  plans: [
    {
      id: '11111111-1111-4111-8111-111111111101',
      slug: 'early-bird',
      name: 'Founding Member Pass',
      billing_cycle: 'One-time reservation',
      price_pkr: 100,
      shots_per_delivery: 7,
      perks: [
        'First weekly organic box prioritized on Jan 1 launch',
        'Immediate Founding Habit Circle community access',
        'Priority invitation to Margalla & seasonal retreats',
        'Locked-in founding pricing for 12 months',
      ],
      total_slots: 100,
      slots_taken: 68,
      is_active: true,
    },
    {
      id: '11111111-1111-4111-8111-111111111102',
      slug: 'weekly',
      name: 'Weekly Ritual Dispatch',
      billing_cycle: 'Billed weekly',
      price_pkr: 3400,
      shots_per_delivery: 7,
      perks: [
        '7 fresh cold-pressed organic shots every Monday morning',
        'Insulated glass bottle doorstep exchange',
        'Guided 60-second morning habit accountability',
        'Community meetup access in Lahore, Islamabad & Karachi',
      ],
      total_slots: 250,
      slots_taken: 41,
      is_active: true,
    },
    {
      id: '11111111-1111-4111-8111-111111111103',
      slug: 'bi-weekly',
      name: 'Bi-Weekly Rhythm',
      billing_cycle: 'Billed every 2 weeks',
      price_pkr: 6400,
      shots_per_delivery: 14,
      perks: [
        '14 organic shots across two consecutive Monday dispatches',
        'Seasonal formulation rotation (Energy, Immunity, Gut)',
        'Priority seat allocation at Habit Workshops',
        'Complimentary brass dosing spoon & ritual guide',
      ],
      total_slots: 150,
      slots_taken: 29,
      is_active: true,
    },
    {
      id: '11111111-1111-4111-8111-111111111104',
      slug: 'monthly',
      name: 'Monthly Sanctuary',
      billing_cycle: 'Billed monthly',
      price_pkr: 11900,
      shots_per_delivery: 28,
      perks: [
        '28 daily organic shots delivered across 4 weekly batches',
        'Dedicated habit check-in & personalized formulation mix',
        'Early access + member rate on Wellness Retreats',
        'Guest pass for one community courtyard gathering per quarter',
      ],
      total_slots: 100,
      slots_taken: 18,
      is_active: true,
    },
  ],
  products: [
    {
      id: '33333333-3333-4333-8333-333333333301',
      name: 'No. 01 Golden Turmeric & Galangal',
      category: 'Energy',
      tagline: 'Steady morning mitochondrial lift without caffeine crashes',
      botanicals: 'Organic Kasur turmeric · heirloom ginger · cracked black pepper · raw citrus',
      size_ml: 60,
      price_pkr: 520,
      is_active: true,
      image_url: '/src/assets/images/ritual_craft_shots_1795507258606.jpg',
    },
    {
      id: '33333333-3333-4333-8333-333333333302',
      name: 'No. 02 Emerald Moringa & Wild Amla',
      category: 'Immunity',
      tagline: 'High-chlorophyll natural vitamin C defense press',
      botanicals: 'Shade-dried moringa leaf · wild amla berry · sacred tulsi · green cardamom',
      size_ml: 60,
      price_pkr: 540,
      is_active: true,
      image_url: '/src/assets/images/hero_botanical_shots_1795507257101.jpg',
    },
    {
      id: '33333333-3333-4333-8333-333333333303',
      name: 'No. 03 Roasted Fennel & Raw Cider',
      category: 'Gut Health',
      tagline: 'Pre-breakfast digestive enzyme & microbiome primer',
      botanicals: 'Unfiltered raw apple cider · wild pudina · toasted saunf · Himalayan pink salt',
      size_ml: 60,
      price_pkr: 490,
      is_active: true,
      image_url: '/src/assets/images/ritual_craft_shots_1795507258606.jpg',
    },
    {
      id: '33333333-3333-4333-8333-333333333304',
      name: 'No. 04 Ashwagandha & Cacao Keystone',
      category: 'Daily Habit',
      tagline: 'Adaptogenic daily anchor for calm circadian focus',
      botanicals: 'Adaptogenic ashwagandha · raw cacao husk · Ceylon cinnamon · sea salt',
      size_ml: 60,
      price_pkr: 560,
      is_active: true,
      image_url: '/src/assets/images/hero_botanical_shots_1795507257101.jpg',
    },
  ],
  events: [
    {
      id: '22222222-2222-4222-8222-222222222201',
      title: 'Margalla Dawn Breathwork & Elixir Immersion',
      type: 'Wellness Retreat',
      event_date: '2027-02-14T06:30:00Z',
      location: 'Nathia Gali Pine Terrace, Islamabad Region',
      spots_available: 14,
      description:
        'A three-day restorative mountain gathering combining guided morning breathwork, cold-pressed botanical tastings, digital stillness, and nourishing whole-food dinners.',
      image_url: '/src/assets/images/retreat_sanctuary_1795507258661.jpg',
    },
    {
      id: '22222222-2222-4222-8222-222222222202',
      title: 'Sunday Courtyard Table: Gut Health & Slow Mornings',
      type: 'Community Meetup',
      event_date: '2027-01-17T09:00:00Z',
      location: 'Gulberg Botanical Courtyard, Lahore',
      spots_available: 22,
      description:
        'An unhurried morning table with fellow members. Sample seasonal turmeric-moringa formulations alongside fermented citrus plates and honest conversation.',
      image_url: '/src/assets/images/event_community_table_1795507259675.jpg',
    },
    {
      id: '22222222-2222-4222-8222-222222222203',
      title: 'The 60-Second Morning Architecture Workshop',
      type: 'Habit Workshop',
      event_date: '2027-01-24T10:30:00Z',
      location: 'Clifton Studio Space, Karachi',
      spots_available: 18,
      description:
        'Practical behavioral design with wellness practitioners: anchor circadian hydration, mineral absorption, and consistent morning routines without willpower fatigue.',
      image_url: '/src/assets/images/event_habit_workshop_1795507259206.jpg',
    },
  ],
  members: [],
  leads: [],
  subscriptions: [],
  paymentLogs: [],
};

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
}

function getSupabaseClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!serviceKey) {
    return null;
  }
  const url = getSupabaseUrl();
  if (!cachedClient || cachedKey !== `${url}:${serviceKey}`) {
    cachedClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedKey = `${url}:${serviceKey}`;
  }
  return cachedClient;
}

function hashMemberPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

function verifyMemberPassword(password: string, salt: string, storedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  return derived.length === storedBuf.length && crypto.timingSafeEqual(derived, storedBuf);
}

function stripMemberSecrets(member: StoredMember): MemberUser {
  const { password_salt: _s, password_hash: _h, ...safe } = member;
  return safe;
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const url = getSupabaseUrl();
  const client = getSupabaseClient();
  if (!client) {
    return {
      mode: 'app_memory',
      supabaseConfigured: false,
      schemaReady: false,
      supabaseUrl: url,
      reason: 'App-managed store active (accounts, catalog, subscriptions, and admin).',
    };
  }

  try {
    const { error } = await client.from('site_settings').select('id').limit(1);
    if (error) {
      return {
        mode: 'app_memory',
        supabaseConfigured: true,
        schemaReady: false,
        supabaseUrl: url,
        reason: `App-managed store active (external DB awaiting schema: ${error.message}).`,
      };
    }
    return {
      mode: 'supabase',
      supabaseConfigured: true,
      schemaReady: true,
      supabaseUrl: url,
    };
  } catch (err) {
    return {
      mode: 'app_memory',
      supabaseConfigured: true,
      schemaReady: false,
      supabaseUrl: url,
      reason: err instanceof Error ? err.message : 'App-managed store active.',
    };
  }
}

export async function getBootstrapData(): Promise<{
  settings: SiteSettings;
  plans: Plan[];
  products: WellnessProduct[];
  events: WellnessEvent[];
  storage: StorageDiagnostics;
}> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const [settingsRes, plansRes, eventsRes, productsRes] = await Promise.all([
      client.from('site_settings').select('*').eq('id', 1).single(),
      client.from('plans').select('*').eq('is_active', true).order('price_pkr', { ascending: true }),
      client.from('events').select('*').order('event_date', { ascending: true }),
      client.from('products').select('*').eq('is_active', true),
    ]);

    if (!settingsRes.error && settingsRes.data && !plansRes.error && plansRes.data && !eventsRes.error && eventsRes.data) {
      return {
        settings: settingsRes.data as SiteSettings,
        plans: plansRes.data as Plan[],
        products: !productsRes.error && productsRes.data ? (productsRes.data as WellnessProduct[]) : memoryDb.products.filter((p) => p.is_active),
        events: eventsRes.data as WellnessEvent[],
        storage: diag,
      };
    }
  }

  return {
    settings: { ...memoryDb.settings },
    plans: memoryDb.plans.filter((p) => p.is_active).map((p) => ({ ...p, perks: [...p.perks] })),
    products: memoryDb.products.filter((p) => p.is_active).map((p) => ({ ...p })),
    events: memoryDb.events.map((e) => ({ ...e })),
    storage: diag,
  };
}

// ----------------------------------------------------------------------------
// APP-MANAGED MEMBER ACCOUNTS
// ----------------------------------------------------------------------------
export async function registerMemberAccount(input: {
  full_name: string;
  email: string;
  phone: string;
  health_goal: HealthGoal;
  password: string;
}): Promise<MemberUser> {
  const email = input.email.trim().toLowerCase();
  const existing = memoryDb.members.find((m) => m.email === email);
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const { salt, hash } = hashMemberPassword(input.password);
  const member: StoredMember = {
    id: crypto.randomUUID(),
    full_name: input.full_name.trim(),
    email,
    phone: input.phone.trim(),
    health_goal: input.health_goal,
    status: 'active',
    password_salt: salt,
    password_hash: hash,
    created_at: new Date().toISOString(),
  };

  memoryDb.members.unshift(member);
  await upsertLead({
    full_name: member.full_name,
    email: member.email,
    phone: member.phone,
    health_goal: member.health_goal,
  });

  return stripMemberSecrets(member);
}

export async function authenticateMemberAccount(
  emailInput: string,
  password: string
): Promise<MemberUser> {
  const email = emailInput.trim().toLowerCase();
  const member = memoryDb.members.find((m) => m.email === email);
  if (!member || !verifyMemberPassword(password, member.password_salt, member.password_hash)) {
    throw new Error('Invalid email or password.');
  }
  if (member.status === 'suspended') {
    throw new Error('This member account has been suspended by an administrator.');
  }
  return stripMemberSecrets(member);
}

export async function getMemberById(memberId: string): Promise<MemberUser | null> {
  const member = memoryDb.members.find((m) => m.id === memberId);
  return member ? stripMemberSecrets(member) : null;
}

export async function updateMemberAdmin(
  memberId: string,
  patch: {
    full_name?: string;
    phone?: string;
    health_goal?: HealthGoal;
    status?: 'active' | 'suspended';
  }
): Promise<MemberUser> {
  const member = memoryDb.members.find((m) => m.id === memberId);
  if (!member) {
    throw new Error('Member not found');
  }
  if (typeof patch.full_name === 'string') member.full_name = patch.full_name.trim();
  if (typeof patch.phone === 'string') member.phone = patch.phone.trim();
  if (patch.health_goal) member.health_goal = patch.health_goal;
  if (patch.status) member.status = patch.status;
  return stripMemberSecrets(member);
}

export async function deleteMemberAdmin(memberId: string): Promise<void> {
  const idx = memoryDb.members.findIndex((m) => m.id === memberId);
  if (idx === -1) {
    throw new Error('Member not found');
  }
  memoryDb.members.splice(idx, 1);
}

// ----------------------------------------------------------------------------
// LEADS, PLANS, SUBSCRIPTIONS & ATOMIC RESERVATION
// ----------------------------------------------------------------------------
export async function upsertLead(input: {
  full_name: string;
  email: string;
  phone: string;
  health_goal: HealthGoal;
}): Promise<Lead> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('leads')
      .upsert(
        {
          full_name: input.full_name.trim(),
          email: normalizedEmail,
          phone: input.phone.trim(),
          health_goal: input.health_goal,
        },
        { onConflict: 'email' }
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(`Lead upsert failed: ${error.message}`);
    }
    return data as Lead;
  }

  const existing = memoryDb.leads.find((l) => l.email === normalizedEmail);
  if (existing) {
    existing.full_name = input.full_name.trim();
    existing.phone = input.phone.trim();
    existing.health_goal = input.health_goal;
    return { ...existing };
  }

  const created: Lead = {
    id: crypto.randomUUID(),
    full_name: input.full_name.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    health_goal: input.health_goal,
    has_early_bird: false,
    created_at: new Date().toISOString(),
  };
  memoryDb.leads.unshift(created);
  return { ...created };
}

export async function getPlanBySlug(slug: PlanSlug): Promise<Plan | null> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error || !data) return null;
    return data as Plan;
  }

  const plan = memoryDb.plans.find((p) => p.slug === slug && p.is_active);
  return plan ? { ...plan, perks: [...plan.perks] } : null;
}

export async function createPendingSubscription(input: {
  lead_id: string;
  member_id?: string | null;
  plan_id: string;
  delivery_address: string;
  city: string;
  payment_gateway: PaymentGateway;
  payment_method: PaymentMethod;
  amount_pkr: number;
  is_sandbox: boolean;
}): Promise<SubscriptionRecord> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('subscriptions')
      .insert({
        lead_id: input.lead_id,
        plan_id: input.plan_id,
        delivery_address: input.delivery_address.trim(),
        city: input.city.trim(),
        payment_gateway: input.payment_gateway,
        payment_method: input.payment_method,
        amount_pkr: input.amount_pkr,
        is_sandbox: input.is_sandbox,
        payment_status: 'pending',
        status: 'reserved',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
    return data as SubscriptionRecord;
  }

  const record: SubscriptionRecord = {
    id: crypto.randomUUID(),
    lead_id: input.lead_id,
    member_id: input.member_id ?? null,
    plan_id: input.plan_id,
    delivery_address: input.delivery_address.trim(),
    city: input.city.trim(),
    payment_gateway: input.payment_gateway,
    payment_method: input.payment_method,
    amount_pkr: input.amount_pkr,
    is_sandbox: input.is_sandbox,
    gateway_txn_id: null,
    payment_status: 'pending',
    status: 'reserved',
    next_dispatch_date: null,
    created_at: new Date().toISOString(),
  };
  memoryDb.subscriptions.unshift(record);
  return { ...record };
}

export async function logPaymentEvent(input: {
  subscription_id: string | null;
  gateway: string;
  payment_method?: string | null;
  gateway_txn_id?: string | null;
  event_type: string;
  status: 'info' | 'success' | 'failed';
  amount_pkr?: number | null;
  is_sandbox: boolean;
  error_message?: string | null;
  raw_payload?: Record<string, unknown>;
}): Promise<PaymentLog> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('payment_logs')
      .insert({
        subscription_id: input.subscription_id,
        gateway: input.gateway,
        payment_method: input.payment_method ?? null,
        gateway_txn_id: input.gateway_txn_id ?? null,
        event_type: input.event_type,
        status: input.status,
        amount_pkr: input.amount_pkr ?? null,
        is_sandbox: input.is_sandbox,
        error_message: input.error_message ?? null,
        raw_payload: input.raw_payload ?? {},
      })
      .select('*')
      .single();

    if (!error && data) {
      return data as PaymentLog;
    }
  }

  const log: PaymentLog = {
    id: crypto.randomUUID(),
    subscription_id: input.subscription_id,
    gateway: input.gateway,
    payment_method: input.payment_method ?? null,
    gateway_txn_id: input.gateway_txn_id ?? null,
    event_type: input.event_type,
    status: input.status,
    amount_pkr: input.amount_pkr ?? null,
    is_sandbox: input.is_sandbox,
    error_message: input.error_message ?? null,
    raw_payload: input.raw_payload ?? {},
    created_at: new Date().toISOString(),
  };
  memoryDb.paymentLogs.unshift(log);
  return { ...log };
}

export async function markSubscriptionFailed(
  subscriptionId: string,
  gatewayTxnId: string | null,
  reason: string,
  rawPayload: Record<string, unknown>
): Promise<void> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data: sub } = await client
      .from('subscriptions')
      .update({
        payment_status: 'failed',
        gateway_txn_id: gatewayTxnId,
      })
      .eq('id', subscriptionId)
      .select('*')
      .single();

    await logPaymentEvent({
      subscription_id: subscriptionId,
      gateway: sub?.payment_gateway ?? 'Unknown',
      payment_method: sub?.payment_method ?? null,
      gateway_txn_id: gatewayTxnId,
      event_type: 'payment_failed',
      status: 'failed',
      amount_pkr: sub?.amount_pkr ?? null,
      is_sandbox: sub?.is_sandbox ?? true,
      error_message: reason,
      raw_payload: rawPayload,
    });
    return;
  }

  const sub = memoryDb.subscriptions.find((s) => s.id === subscriptionId);
  if (sub) {
    sub.payment_status = 'failed';
    sub.gateway_txn_id = gatewayTxnId;
    await logPaymentEvent({
      subscription_id: subscriptionId,
      gateway: sub.payment_gateway,
      payment_method: sub.payment_method,
      gateway_txn_id: gatewayTxnId,
      event_type: 'payment_failed',
      status: 'failed',
      amount_pkr: sub.amount_pkr,
      is_sandbox: sub.is_sandbox,
      error_message: reason,
      raw_payload: rawPayload,
    });
  }
}

export async function reserveSlotOnPayment(
  subscriptionId: string,
  txnId: string
): Promise<{
  ok: boolean;
  subscription_id: string;
  plan_slug: PlanSlug;
  plan_name: string;
  gateway_txn_id: string;
  next_dispatch_date: string;
  slots_taken: number;
  total_slots: number;
  community_invite_link: string;
  amount_pkr: number;
  is_sandbox: boolean;
}> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client.rpc('reserve_slot_on_payment', {
      sub_id: subscriptionId,
      txn_id: txnId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data: sub } = await client
      .from('subscriptions')
      .select('amount_pkr, is_sandbox')
      .eq('id', subscriptionId)
      .single();

    return {
      ...(data as {
        ok: boolean;
        subscription_id: string;
        plan_slug: PlanSlug;
        plan_name: string;
        gateway_txn_id: string;
        next_dispatch_date: string;
        slots_taken: number;
        total_slots: number;
        community_invite_link: string;
      }),
      amount_pkr: sub?.amount_pkr ?? 0,
      is_sandbox: sub?.is_sandbox ?? true,
    };
  }

  const sub = memoryDb.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) {
    throw new Error('SUBSCRIPTION_NOT_FOUND');
  }
  const plan = memoryDb.plans.find((p) => p.id === sub.plan_id);
  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  if (sub.payment_status === 'paid') {
    return {
      ok: true,
      subscription_id: sub.id,
      plan_slug: plan.slug,
      plan_name: plan.name,
      gateway_txn_id: sub.gateway_txn_id || txnId,
      next_dispatch_date:
        sub.next_dispatch_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      slots_taken: plan.slots_taken,
      total_slots: plan.total_slots,
      community_invite_link: memoryDb.settings.community_invite_link,
      amount_pkr: sub.amount_pkr,
      is_sandbox: sub.is_sandbox,
    };
  }

  if (plan.slots_taken >= plan.total_slots) {
    throw new Error('SLOT_CAPACITY_REACHED');
  }

  if (
    plan.slug === 'early-bird' &&
    memoryDb.settings.early_bird_slots_taken >= memoryDb.settings.early_bird_total_slots
  ) {
    throw new Error('EARLY_BIRD_CAPACITY_REACHED');
  }

  const launchTime = Date.parse(memoryDb.settings.launch_date);
  const nextDispatchDate =
    memoryDb.settings.launch_mode === 'pre_launch' && launchTime > Date.now()
      ? new Date(launchTime + 3 * 86400000).toISOString().slice(0, 10)
      : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  sub.payment_status = 'paid';
  sub.gateway_txn_id = txnId;
  sub.status = plan.slug === 'early-bird' ? 'reserved' : 'active';
  sub.next_dispatch_date = nextDispatchDate;

  plan.slots_taken += 1;

  if (plan.slug === 'early-bird') {
    const lead = memoryDb.leads.find((l) => l.id === sub.lead_id);
    if (lead) {
      lead.has_early_bird = true;
    }
    memoryDb.settings.early_bird_slots_taken += 1;
    memoryDb.settings.updated_at = new Date().toISOString();
  }

  await logPaymentEvent({
    subscription_id: sub.id,
    gateway: sub.payment_gateway,
    payment_method: sub.payment_method,
    gateway_txn_id: txnId,
    event_type: 'payment_confirmed',
    status: 'success',
    amount_pkr: sub.amount_pkr,
    is_sandbox: sub.is_sandbox,
    raw_payload: { plan_slug: plan.slug, slots_taken: plan.slots_taken },
  });

  return {
    ok: true,
    subscription_id: sub.id,
    plan_slug: plan.slug,
    plan_name: plan.name,
    gateway_txn_id: txnId,
    next_dispatch_date: nextDispatchDate,
    slots_taken: plan.slots_taken,
    total_slots: plan.total_slots,
    community_invite_link: memoryDb.settings.community_invite_link,
    amount_pkr: sub.amount_pkr,
    is_sandbox: sub.is_sandbox,
  };
}

// ----------------------------------------------------------------------------
// ADMIN OVERVIEW & CRUD
// ----------------------------------------------------------------------------
export async function getAdminOverview(): Promise<{
  storage: StorageDiagnostics;
  settings: SiteSettings;
  plans: Plan[];
  products: WellnessProduct[];
  events: WellnessEvent[];
  members: MemberUser[];
  leads: Lead[];
  subscriptions: SubscriptionRecord[];
  paymentLogs: PaymentLog[];
}> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const [settingsRes, plansRes, eventsRes, leadsRes, subsRes, logsRes] = await Promise.all([
      client.from('site_settings').select('*').eq('id', 1).single(),
      client.from('plans').select('*').order('price_pkr', { ascending: true }),
      client.from('events').select('*').order('event_date', { ascending: true }),
      client.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
      client.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200),
      client.from('payment_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    const leadsList = (leadsRes.data ?? []) as Lead[];
    const plansList = (plansRes.data ?? []) as Plan[];
    const leadMap = new Map(leadsList.map((l) => [l.id, l]));
    const planMap = new Map(plansList.map((p) => [p.id, p]));

    const subs = ((subsRes.data ?? []) as SubscriptionRecord[]).map((s) => ({
      ...s,
      lead_name: leadMap.get(s.lead_id)?.full_name,
      lead_email: leadMap.get(s.lead_id)?.email,
      lead_phone: leadMap.get(s.lead_id)?.phone,
      plan_name: planMap.get(s.plan_id)?.name,
      plan_slug: planMap.get(s.plan_id)?.slug,
      shots_per_delivery: planMap.get(s.plan_id)?.shots_per_delivery,
    }));

    return {
      storage: diag,
      settings: (settingsRes.data as SiteSettings) ?? { ...memoryDb.settings },
      plans: plansList,
      products: memoryDb.products.map((p) => ({ ...p })),
      events: (eventsRes.data ?? []) as WellnessEvent[],
      members: memoryDb.members.map(stripMemberSecrets),
      leads: leadsList,
      subscriptions: subs,
      paymentLogs: (logsRes.data ?? []) as PaymentLog[],
    };
  }

  const leadMap = new Map(memoryDb.leads.map((l) => [l.id, l]));
  const planMap = new Map(memoryDb.plans.map((p) => [p.id, p]));

  return {
    storage: diag,
    settings: { ...memoryDb.settings },
    plans: memoryDb.plans.map((p) => ({ ...p, perks: [...p.perks] })),
    products: memoryDb.products.map((p) => ({ ...p })),
    events: memoryDb.events.map((e) => ({ ...e })),
    members: memoryDb.members.map(stripMemberSecrets),
    leads: memoryDb.leads.map((l) => ({ ...l })),
    subscriptions: memoryDb.subscriptions.map((s) => ({
      ...s,
      lead_name: leadMap.get(s.lead_id)?.full_name,
      lead_email: leadMap.get(s.lead_id)?.email,
      lead_phone: leadMap.get(s.lead_id)?.phone,
      plan_name: planMap.get(s.plan_id)?.name,
      plan_slug: planMap.get(s.plan_id)?.slug,
      shots_per_delivery: planMap.get(s.plan_id)?.shots_per_delivery,
    })),
    paymentLogs: memoryDb.paymentLogs.map((l) => ({ ...l })),
  };
}

export async function updateSiteSettings(patch: {
  launch_mode?: LaunchMode;
  launch_date?: string;
  community_invite_link?: string;
  early_bird_total_slots?: number;
  early_bird_slots_taken?: number;
}): Promise<SiteSettings> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('site_settings')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update site_settings: ${error.message}`);
    }
    return data as SiteSettings;
  }

  memoryDb.settings = {
    ...memoryDb.settings,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (
    typeof patch.early_bird_total_slots === 'number' ||
    typeof patch.early_bird_slots_taken === 'number'
  ) {
    const eb = memoryDb.plans.find((p) => p.slug === 'early-bird');
    if (eb) {
      if (typeof patch.early_bird_total_slots === 'number') {
        eb.total_slots = patch.early_bird_total_slots;
      }
      if (typeof patch.early_bird_slots_taken === 'number') {
        eb.slots_taken = patch.early_bird_slots_taken;
      }
    }
  }

  return { ...memoryDb.settings };
}

export async function updatePlanSlots(
  planId: string,
  patch: {
    name?: string;
    billing_cycle?: string;
    price_pkr?: number;
    shots_per_delivery?: number;
    total_slots?: number;
    slots_taken?: number;
    is_active?: boolean;
    perks?: string[];
  }
): Promise<Plan> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('plans')
      .update(patch)
      .eq('id', planId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Plan not found');
    }

    const updated = data as Plan;
    if (updated.slug === 'early-bird') {
      await client
        .from('site_settings')
        .update({
          early_bird_total_slots: updated.total_slots,
          early_bird_slots_taken: updated.slots_taken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }
    return updated;
  }

  const plan = memoryDb.plans.find((p) => p.id === planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  if (typeof patch.name === 'string') plan.name = patch.name.trim();
  if (typeof patch.billing_cycle === 'string') plan.billing_cycle = patch.billing_cycle.trim();
  if (typeof patch.price_pkr === 'number') plan.price_pkr = patch.price_pkr;
  if (typeof patch.shots_per_delivery === 'number') plan.shots_per_delivery = patch.shots_per_delivery;
  if (typeof patch.total_slots === 'number') plan.total_slots = patch.total_slots;
  if (typeof patch.slots_taken === 'number') plan.slots_taken = patch.slots_taken;
  if (typeof patch.is_active === 'boolean') plan.is_active = patch.is_active;
  if (Array.isArray(patch.perks)) plan.perks = [...patch.perks];

  if (plan.slug === 'early-bird') {
    memoryDb.settings.early_bird_total_slots = plan.total_slots;
    memoryDb.settings.early_bird_slots_taken = plan.slots_taken;
    memoryDb.settings.updated_at = new Date().toISOString();
  }

  return { ...plan, perks: [...plan.perks] };
}

export async function createProduct(input: Omit<WellnessProduct, 'id'>): Promise<WellnessProduct> {
  const product: WellnessProduct = {
    id: crypto.randomUUID(),
    ...input,
  };
  memoryDb.products.push(product);
  return { ...product };
}

export async function updateProduct(
  productId: string,
  patch: Partial<Omit<WellnessProduct, 'id'>>
): Promise<WellnessProduct> {
  const product = memoryDb.products.find((p) => p.id === productId);
  if (!product) {
    throw new Error('Product not found');
  }
  Object.assign(product, patch);
  return { ...product };
}

export async function deleteProduct(productId: string): Promise<void> {
  const idx = memoryDb.products.findIndex((p) => p.id === productId);
  if (idx === -1) {
    throw new Error('Product not found');
  }
  memoryDb.products.splice(idx, 1);
}

export async function updateSubscriptionAdmin(
  subId: string,
  patch: {
    status?: SubscriptionRecord['status'];
    payment_status?: SubscriptionRecord['payment_status'];
    next_dispatch_date?: string | null;
  }
): Promise<SubscriptionRecord> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('subscriptions')
      .update(patch)
      .eq('id', subId)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message || 'Subscription not found');
    }
    return data as SubscriptionRecord;
  }

  const sub = memoryDb.subscriptions.find((s) => s.id === subId);
  if (!sub) {
    throw new Error('Subscription not found');
  }
  if (patch.status) sub.status = patch.status;
  if (patch.payment_status) sub.payment_status = patch.payment_status;
  if (patch.next_dispatch_date !== undefined) sub.next_dispatch_date = patch.next_dispatch_date;
  return { ...sub };
}

export async function createEvent(input: Omit<WellnessEvent, 'id'>): Promise<WellnessEvent> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client.from('events').insert(input).select('*').single();
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create event');
    }
    return data as WellnessEvent;
  }

  const created: WellnessEvent = {
    id: crypto.randomUUID(),
    ...input,
  };
  memoryDb.events.push(created);
  return { ...created };
}

export async function updateEvent(
  eventId: string,
  patch: Partial<Omit<WellnessEvent, 'id'>>
): Promise<WellnessEvent> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { data, error } = await client
      .from('events')
      .update(patch)
      .eq('id', eventId)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message || 'Event not found');
    }
    return data as WellnessEvent;
  }

  const ev = memoryDb.events.find((e) => e.id === eventId);
  if (!ev) {
    throw new Error('Event not found');
  }
  Object.assign(ev, patch);
  return { ...ev };
}

export async function deleteEvent(eventId: string): Promise<void> {
  const diag = await getStorageDiagnostics();
  const client = diag.mode === 'supabase' ? getSupabaseClient() : null;

  if (client) {
    const { error } = await client.from('events').delete().eq('id', eventId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const idx = memoryDb.events.findIndex((e) => e.id === eventId);
  if (idx === -1) {
    throw new Error('Event not found');
  }
  memoryDb.events.splice(idx, 1);
}
