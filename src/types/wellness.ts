export type HealthGoal = 'Energy' | 'Immunity' | 'Gut Health' | 'Daily Habit';

export type PlanSlug = 'early-bird' | 'weekly' | 'bi-weekly' | 'monthly';

export type PaymentGateway = 'PayFast' | 'Safepay' | 'BankCard';

export type PaymentMethod = 'Card' | 'EasyPaisa' | 'JazzCash' | 'BankTransfer';

export type LaunchMode = 'pre_launch' | 'live_subscriptions';

export interface MemberUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  health_goal: HealthGoal;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface WellnessProduct {
  id: string;
  name: string;
  category: HealthGoal;
  tagline: string;
  botanicals: string;
  size_ml: number;
  price_pkr: number;
  is_active: boolean;
  image_url: string;
}

export interface Plan {
  id: string;
  slug: PlanSlug;
  name: string;
  billing_cycle: string;
  price_pkr: number;
  shots_per_delivery: number;
  perks: string[];
  total_slots: number;
  slots_taken: number;
  is_active: boolean;
}

export interface WellnessEvent {
  id: string;
  title: string;
  type: 'Wellness Retreat' | 'Community Meetup' | 'Habit Workshop';
  event_date: string;
  location: string;
  spots_available: number;
  description: string;
  image_url: string;
}

export interface SiteSettings {
  id: number;
  launch_mode: LaunchMode;
  launch_date: string;
  community_invite_link: string;
  early_bird_total_slots: number;
  early_bird_slots_taken: number;
  updated_at?: string;
}

export interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  health_goal: HealthGoal;
  has_early_bird: boolean;
  created_at: string;
}

export interface SubscriptionRecord {
  id: string;
  lead_id: string;
  member_id?: string | null;
  plan_id: string;
  delivery_address: string;
  city: string;
  payment_gateway: PaymentGateway;
  payment_method: PaymentMethod;
  amount_pkr: number;
  is_sandbox: boolean;
  gateway_txn_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed';
  status: 'reserved' | 'active' | 'paused';
  next_dispatch_date: string | null;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  plan_name?: string;
  plan_slug?: string;
  shots_per_delivery?: number;
}

export interface PaymentLog {
  id: string;
  subscription_id: string | null;
  gateway: string;
  payment_method: string | null;
  gateway_txn_id: string | null;
  event_type: string;
  status: 'info' | 'success' | 'failed';
  amount_pkr: number | null;
  is_sandbox: boolean;
  error_message: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface CheckoutSession {
  subscription_id: string;
  plan_slug: PlanSlug;
  plan_name: string;
  amount_pkr: number;
  gateway: PaymentGateway;
  payment_method: PaymentMethod;
  is_sandbox: boolean;
  session_token: string;
  gateway_reference: string;
  live_redirect_params?: Record<string, string>;
}

export interface PaymentConfirmationReceipt {
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
}
