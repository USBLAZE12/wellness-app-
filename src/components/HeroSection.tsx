import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Leaf, Loader2 } from 'lucide-react';
import type { HealthGoal, Lead, Plan, SiteSettings } from '../types/wellness';

interface HeroSectionProps {
  settings: SiteSettings;
  earlyBirdPlan?: Plan;
  signedUpLead: Lead | null;
  prefillGoal?: HealthGoal;
  onLeadCaptured: (lead: Lead) => void;
  onClaimEarlyBird: () => void;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const HEALTH_GOALS: HealthGoal[] = ['Energy', 'Immunity', 'Gut Health', 'Daily Habit'];

function computeCountdown(targetIso: string): CountdownParts {
  const diff = Math.max(0, Date.parse(targetIso) - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function HeroSection({
  settings,
  earlyBirdPlan,
  signedUpLead,
  prefillGoal = 'Daily Habit',
  onLeadCaptured,
  onClaimEarlyBird,
}: HeroSectionProps) {
  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    computeCountdown(settings.launch_date)
  );
  const [imgFailed, setImgFailed] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [healthGoal, setHealthGoal] = useState<HealthGoal>(prefillGoal);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setHealthGoal(prefillGoal);
  }, [prefillGoal]);

  useEffect(() => {
    setCountdown(computeCountdown(settings.launch_date));
    const timer = window.setInterval(() => {
      setCountdown(computeCountdown(settings.launch_date));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [settings.launch_date]);

  const totalSlots = earlyBirdPlan?.total_slots ?? settings.early_bird_total_slots;
  const slotsTaken = earlyBirdPlan?.slots_taken ?? settings.early_bird_slots_taken;
  const slotsRemaining = Math.max(0, totalSlots - slotsTaken);
  const isPreLaunch = settings.launch_mode === 'pre_launch';

  async function handleJoinInnerCircle(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          health_goal: healthGoal,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; lead?: Lead; error?: string };
      if (!res.ok || !data.lead) {
        setFormError(data.error || 'Please verify your details and try again.');
        return;
      }
      onLeadCaptured(data.lead);
      window.setTimeout(() => {
        document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' });
      }, 450);
    } catch {
      setFormError('Network error saving your Inner Circle registration.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="inner-circle" className="pt-10 pb-16 md:pt-12 md:pb-20">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Live Countdown Banner to January 1 Launch */}
        <div className="mb-8 pb-4 border-b border-[#143628]/12 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium text-[#4A7C59]">
            {isPreLaunch
              ? `January 1 Launch · ${slotsRemaining} of ${totalSlots} Founding Passes Remaining`
              : 'Live Weekly Cold-Chain Dispatch · Lahore, Islamabad & Karachi'}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#143628]/65">
              {isPreLaunch ? 'January 1 Launch Countdown' : 'Next Dispatch Cutoff'}
            </span>
            <span className="font-tabular text-sm font-semibold text-[#143628]">
              {String(countdown.days).padStart(2, '0')}d :{' '}
              {String(countdown.hours).padStart(2, '0')}h :{' '}
              {String(countdown.minutes).padStart(2, '0')}m :{' '}
              {String(countdown.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>

        {/* 2-Column Stage 1 Hero + Step 1 Inner Circle Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#C59B27] mb-3">
                Stage 01 · Your Daily Health &amp; Lifestyle Investment
              </p>

              <h1 className="font-editorial text-[clamp(2.35rem,4.1vw,3.75rem)] leading-[1.06] font-semibold tracking-tight text-[#143628] text-balance mb-5">
                Invest in Your Daily Ritual. Not Another Subscription.
              </h1>

              <p className="text-base leading-[1.65] text-[#143628]/80 max-w-xl">
                Seven cold-pressed organic root and botanical wellness shots delivered weekly to
                your doorstep—paired with a 30-day morning habit framework, private member
                challenges, and offline wellness retreats.
              </p>
            </div>

            {/* Step 1: Join the Inner Circle (Sign Up Form) */}
            <div className="bg-white border border-[#143628]/15 rounded-xl p-6">
              {signedUpLead ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#4A7C59] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#4A7C59]">
                        Step 1 Complete · Inner Circle Unlocked
                      </p>
                      <h2 className="font-editorial text-2xl font-semibold text-[#143628] mt-0.5">
                        Welcome, {signedUpLead.full_name}
                      </h2>
                      <p className="text-sm text-[#143628]/75 mt-1">
                        Your wellness goal (<strong className="font-medium text-[#143628]">{signedUpLead.health_goal}</strong>) is saved and pre-filled for your Founding Member reservation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={onClaimEarlyBird}
                      className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] transition-colors cursor-pointer"
                    >
                      <span>Continue to Reserve Spot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href="#philosophy"
                      className="text-xs font-medium text-[#143628] underline underline-offset-4"
                    >
                      Read the 30-Day Science
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleJoinInnerCircle} className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                      Step 1: Join the Inner Circle
                    </h2>
                    <span className="text-xs text-[#143628]/60">Takes 20 seconds</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="hero-full-name"
                        className="block text-xs font-medium text-[#143628] mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="hero-full-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ayesha Khan"
                        className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="hero-phone"
                        className="block text-xs font-medium text-[#143628] mb-1"
                      >
                        Phone / WhatsApp
                      </label>
                      <input
                        id="hero-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0300 1234567"
                        className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="hero-email"
                        className="block text-xs font-medium text-[#143628] mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="hero-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ayesha@example.pk"
                        className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="hero-goal"
                        className="block text-xs font-medium text-[#143628] mb-1"
                      >
                        Primary Wellness Goal
                      </label>
                      <select
                        id="hero-goal"
                        value={healthGoal}
                        onChange={(e) => setHealthGoal(e.target.value as HealthGoal)}
                        className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                      >
                        {HEALTH_GOALS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Join Inner Circle &amp; Unlock Founding Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Editorial Photography */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[360px] lg:min-h-[520px] rounded-xl overflow-hidden border border-[#143628]/10 bg-[#F2EFE9]">
              {!imgFailed ? (
                <img
                  src="/src/assets/images/hero_botanical_shots_1795507257101.jpg"
                  alt="Seven amber apothecary glass bottles of cold-pressed organic daily wellness shots inside a handcrafted oak dispatch box"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-[#F2EFE9] to-[#E5DFD3] text-center">
                  <Leaf className="w-10 h-10 text-[#4A7C59] mb-3" />
                  <p className="font-editorial text-2xl text-[#143628]">
                    Vana Ritual Seven-Day Apothecary Box
                  </p>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#143628]/85 via-[#143628]/45 to-transparent">
                <p className="text-xs font-medium text-[#FAF8F5]/85">
                  Weekly Cold-Pressed Crate · 7 × 60ml Glass Shots
                </p>
                <p className="font-editorial text-xl text-[#FAF8F5] mt-0.5">
                  Himalayan Turmeric, Moringa Leaf, Heirloom Ginger &amp; Wild Amla
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Proof Strip */}
        <div className="mt-12 pt-8 border-t border-[#143628]/12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="font-tabular text-2xl font-medium text-[#143628]">7 Shots</p>
            <p className="text-sm text-[#143628]/70 mt-1">
              Pressed within 12 hours of Monday doorstep dispatch
            </p>
          </div>
          <div>
            <p className="font-tabular text-2xl font-medium text-[#143628]">30 Days</p>
            <p className="text-sm text-[#143628]/70 mt-1">
              Structured daily morning habit &amp; circle check-ins
            </p>
          </div>
          <div>
            <p className="font-tabular text-2xl font-medium text-[#143628]">4°C Box</p>
            <p className="text-sm text-[#143628]/70 mt-1">
              Reusable glass bottles exchanged weekly at your door
            </p>
          </div>
          <div>
            <p className="font-tabular text-2xl font-medium text-[#143628]">3 Cities</p>
            <p className="text-sm text-[#143628]/70 mt-1">
              Offline gatherings &amp; seasonal mountain retreats
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
