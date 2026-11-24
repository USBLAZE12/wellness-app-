import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  CheckoutSession,
  HealthGoal,
  MemberUser,
  PaymentConfirmationReceipt,
  Plan,
} from '../types/wellness';

interface CheckoutDrawerProps {
  plan: Plan | null;
  isOpen: boolean;
  memberUser: MemberUser | null;
  memberToken: string | null;
  onSignOutMember: () => void;
  onClose: () => void;
  onPaymentConfirmed: (receipt: PaymentConfirmationReceipt) => void;
}

const HEALTH_GOALS: HealthGoal[] = ['Energy', 'Immunity', 'Gut Health', 'Daily Habit'];
const CITIES = ['Lahore', 'Islamabad', 'Rawalpindi', 'Karachi'];

export function CheckoutDrawer({
  plan,
  isOpen,
  memberUser,
  memberToken,
  onSignOutMember,
  onClose,
  onPaymentConfirmed,
}: CheckoutDrawerProps) {
  const [step, setStep] = useState<'form' | 'receipt'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [healthGoal, setHealthGoal] = useState<HealthGoal>('Daily Habit');
  const [city, setCity] = useState('Lahore');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentConfirmationReceipt | null>(null);

  useEffect(() => {
    if (memberUser) {
      setFullName(memberUser.full_name);
      setEmail(memberUser.email);
      setPhone(memberUser.phone);
      setHealthGoal(memberUser.health_goal);
    }
  }, [memberUser]);

  if (!isOpen || !plan) return null;

  function resetAndClose() {
    setStep('form');
    setErrorMsg(null);
    setReceipt(null);
    onClose();
  }

  async function handleConfirmReservation(e: FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (memberToken) {
        headers.Authorization = `Bearer ${memberToken}`;
      }

      const initRes = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          health_goal: healthGoal,
          plan_slug: plan.slug,
          delivery_address: deliveryAddress,
          city,
          payment_gateway: 'PayFast',
          payment_method: 'Card',
          sandbox_mode: true,
        }),
      });

      const initData = (await initRes.json()) as {
        ok?: boolean;
        session?: CheckoutSession;
        error?: string;
      };
      if (!initRes.ok || !initData.session) {
        setErrorMsg(initData.error || 'Could not reserve your spot. Please verify your inputs.');
        return;
      }

      const verifyRes = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: initData.session.session_token,
          outcome: 'success',
          account_reference: 'MEMBER-RESERVATION',
        }),
      });

      const verifyData = (await verifyRes.json()) as {
        ok?: boolean;
        receipt?: PaymentConfirmationReceipt;
        error?: string;
      };
      if (!verifyRes.ok || !verifyData.receipt) {
        setErrorMsg(verifyData.error || 'Unable to confirm slot reservation.');
        return;
      }

      setReceipt(verifyData.receipt);
      setStep('receipt');
      onPaymentConfirmed(verifyData.receipt);
    } catch {
      setErrorMsg('Network error completing your reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reserve your spot"
      className="fixed inset-0 z-50 flex justify-end bg-[#143628]/45 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-[#FAF8F5] h-full overflow-y-auto border-l border-[#143628]/15 flex flex-col justify-between">
        <div>
          <div className="px-6 py-5 border-b border-[#143628]/12 flex items-center justify-between gap-4 bg-white">
            <div>
              <p className="text-xs text-[#4A7C59] font-medium">
                {step === 'form' ? 'Step 3 · Spot Reservation' : 'Reservation Confirmed'}
              </p>
              <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                {plan.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Close reservation drawer"
              className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[#143628]/70 hover:text-[#143628] hover:bg-[#143628]/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 bg-[#F2EFE9] border-b border-[#143628]/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#143628]/70">{plan.billing_cycle}</p>
              <p className="text-sm font-medium text-[#143628]">
                {plan.shots_per_delivery} cold-pressed organic shots · Instant community access
              </p>
            </div>
            <p className="font-tabular text-xl font-semibold text-[#143628] shrink-0">
              Rs. {plan.price_pkr.toLocaleString()}
            </p>
          </div>

          {memberUser && (
            <div className="px-6 py-3 bg-white border-b border-[#143628]/10 flex items-center justify-between gap-3 text-xs">
              <p className="text-[#143628]/80">
                Signed in as <strong className="text-[#143628]">{memberUser.full_name}</strong> (
                {memberUser.email})
              </p>
              <button
                type="button"
                onClick={() => {
                  resetAndClose();
                  onSignOutMember();
                }}
                className="inline-flex items-center gap-1 text-[#143628]/70 hover:text-[#143628] underline cursor-pointer shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          <div className="p-6">
            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-900"
              >
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{errorMsg}</p>
              </div>
            )}

            {step === 'form' && (
              <form onSubmit={handleConfirmReservation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="res-name" className="block text-xs font-medium text-[#143628] mb-1">
                      Full Name
                    </label>
                    <input
                      id="res-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    />
                  </div>
                  <div>
                    <label htmlFor="res-phone" className="block text-xs font-medium text-[#143628] mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      id="res-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="res-email" className="block text-xs font-medium text-[#143628] mb-1">
                      Email Address
                    </label>
                    <input
                      id="res-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    />
                  </div>
                  <div>
                    <label htmlFor="res-goal" className="block text-xs font-medium text-[#143628] mb-1">
                      Wellness Goal
                    </label>
                    <select
                      id="res-goal"
                      value={healthGoal}
                      onChange={(e) => setHealthGoal(e.target.value as HealthGoal)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    >
                      {HEALTH_GOALS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="res-city" className="block text-xs font-medium text-[#143628] mb-1">
                      City
                    </label>
                    <select
                      id="res-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="res-address" className="block text-xs font-medium text-[#143628] mb-1">
                      Doorstep Delivery Address
                    </label>
                    <input
                      id="res-address"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House 14, Street 6, DHA Phase 5"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#F2EFE9] border border-[#143628]/10 rounded-lg text-xs text-[#143628]/75 leading-relaxed">
                  Confirming locks your batch slot under your member account and immediately reveals
                  your private Community Group Invite Link.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm My Spot — Rs. {plan.price_pkr.toLocaleString()}</span>
                </button>
              </form>
            )}

            {step === 'receipt' && receipt && (
              <div className="space-y-6">
                <div className="p-6 bg-white border border-[#4A7C59]/30 rounded-xl space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#4A7C59] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-[#4A7C59]">Spot Locked &amp; Verified</p>
                      <h3 className="font-editorial text-2xl font-semibold text-[#143628] mt-0.5">
                        Welcome to Vana Ritual, {fullName || 'Member'}.
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#143628]/10 text-xs">
                    <div>
                      <p className="text-[#143628]/60">Reservation Ref</p>
                      <p className="font-tabular font-semibold text-[#143628] mt-0.5">
                        {receipt.gateway_txn_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#143628]/60">Next Dispatch Date</p>
                      <p className="font-tabular font-semibold text-[#143628] mt-0.5">
                        {receipt.next_dispatch_date}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#143628]/60">Batch Allocation</p>
                      <p className="font-tabular font-semibold text-[#143628] mt-0.5">
                        {receipt.slots_taken} / {receipt.total_slots} filled
                      </p>
                    </div>
                    <div>
                      <p className="text-[#143628]/60">Plan Value</p>
                      <p className="font-tabular font-semibold text-[#143628] mt-0.5">
                        Rs. {receipt.amount_pkr.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#143628] text-[#FAF8F5] rounded-xl space-y-3">
                  <p className="text-xs font-medium text-[#C59B27]">
                    Immediate Community Group Access
                  </p>
                  <h4 className="font-editorial text-2xl font-semibold">
                    Join Your Inner Circle Group
                  </h4>
                  <p className="text-xs text-[#FAF8F5]/80 leading-relaxed">
                    Your Founding Member invite link is active now. Introduce yourself, join our
                    30-day morning ritual challenges, and get early retreat dates.
                  </p>
                  <a
                    href={receipt.community_invite_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold text-[#143628] bg-[#FAF8F5] rounded-md hover:bg-[#F2EFE9] transition-colors mt-1"
                  >
                    <span>Open Community Group Invite Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-full px-4 py-3 text-xs font-semibold text-[#143628] border border-[#143628]/20 rounded-md hover:bg-[#143628]/5 transition-colors cursor-pointer"
                >
                  Done &amp; Return to Page
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#143628]/10 bg-white flex items-center gap-2 text-xs text-[#143628]/65">
          <ShieldCheck className="w-4 h-4 text-[#4A7C59] shrink-0" />
          <span>Member-verified reservation · Atomic slot lock</span>
        </div>
      </div>
    </div>
  );
}
