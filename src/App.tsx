import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { RitualSection } from './components/RitualSection';
import { MembershipSection } from './components/MembershipSection';
import { GatheringsSection } from './components/GatheringsSection';
import { MemberAuthModal } from './components/MemberAuthModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { AdminConsole } from './components/AdminConsole';
import { Footer } from './components/Footer';
import type {
  HealthGoal,
  Lead,
  MemberUser,
  PaymentConfirmationReceipt,
  Plan,
  SiteSettings,
  WellnessEvent,
  WellnessProduct,
} from './types/wellness';

const FALLBACK_SETTINGS: SiteSettings = {
  id: 1,
  launch_mode: 'pre_launch',
  launch_date: '2027-01-01T00:00:00Z',
  community_invite_link: 'https://chat.whatsapp.com/VanaRitualFoundingCircle',
  early_bird_total_slots: 100,
  early_bird_slots_taken: 68,
};

export default function App() {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<WellnessProduct[]>([]);
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [signedUpLead, setSignedUpLead] = useState<Lead | null>(null);
  const [memberUser, setMemberUser] = useState<MemberUser | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [isAdminView, setIsAdminView] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.pathname === '/admin'
  );
  const [leadGoalPrefill, setLeadGoalPrefill] = useState<HealthGoal>('Daily Habit');

  useEffect(() => {
    const onPopState = () => {
      setIsAdminView(window.location.pathname === '/admin');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((path: '/' | '/admin') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setIsAdminView(path === '/admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) {
        throw new Error('Unable to load membership data');
      }
      const data = (await res.json()) as {
        settings: SiteSettings;
        plans: Plan[];
        products: WellnessProduct[];
        events: WellnessEvent[];
      };
      setSettings(data.settings);
      setPlans(data.plans);
      setProducts(data.products ?? []);
      setEvents(data.events);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const earlyBirdPlan = plans.find((p) => p.slug === 'early-bird');

  function startPlanFlow(plan: Plan) {
    setSelectedPlan(plan);
    if (!memberUser || !memberToken) {
      setAuthModalOpen(true);
    } else {
      setCheckoutOpen(true);
    }
  }

  function handlePrimaryHeroAction() {
    if (
      settings.launch_mode === 'pre_launch' &&
      earlyBirdPlan &&
      earlyBirdPlan.slots_taken < earlyBirdPlan.total_slots
    ) {
      startPlanFlow(earlyBirdPlan);
    } else {
      document.getElementById('membership')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleAuthenticated(user: MemberUser, token: string) {
    setMemberUser(user);
    setMemberToken(token);
    setAuthModalOpen(false);
    if (selectedPlan) {
      setCheckoutOpen(true);
    }
  }

  function handlePaymentConfirmed(_receipt: PaymentConfirmationReceipt) {
    fetchBootstrap();
  }

  function handleJoinPriorityList() {
    const el = document.getElementById('hero-full-name') || document.getElementById('inner-circle');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (el instanceof HTMLInputElement) el.focus();
    }, 350);
  }

  function handleReserveGathering(event: WellnessEvent) {
    if (event.type === 'Wellness Retreat') setLeadGoalPrefill('Daily Habit');
    else if (event.type === 'Community Meetup') setLeadGoalPrefill('Gut Health');
    else setLeadGoalPrefill('Energy');

    handleJoinPriorityList();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#143628]">
      <Navbar
        launchMode={settings.launch_mode}
        onPrimaryAction={handlePrimaryHeroAction}
        onNavigateHome={() => navigateTo('/')}
        onOpenAdmin={() => navigateTo('/admin')}
        isAdminView={isAdminView}
      />

      <main className="flex-1">
        {isAdminView ? (
          <AdminConsole onSettingsUpdated={fetchBootstrap} />
        ) : (
          <>
            {loadError && (
              <div className="max-w-[1200px] mx-auto px-6 pt-6">
                <p
                  role="alert"
                  className="text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3"
                >
                  {loadError}
                </p>
              </div>
            )}

            {/* Stage 1: Entry & Sign-Up Hero */}
            <HeroSection
              settings={settings}
              earlyBirdPlan={earlyBirdPlan}
              signedUpLead={signedUpLead}
              prefillGoal={leadGoalPrefill}
              onLeadCaptured={(lead) => setSignedUpLead(lead)}
              onClaimEarlyBird={handlePrimaryHeroAction}
            />

            {/* Stage 2: About Us, Products & 30-Day Science + Member Benefits */}
            <RitualSection
              initialGoal={memberUser?.health_goal ?? signedUpLead?.health_goal ?? 'Energy'}
              products={products}
            />

            {/* Stage 2 (cont.): Dynamic Community Events & Retreats */}
            <GatheringsSection events={events} onReserveGathering={handleReserveGathering} />

            {/* Stage 3: Reserve Early Bird (Rs. 100) & Limited-Slot Plans */}
            {loading && plans.length === 0 ? (
              <section className="py-20 max-w-[1200px] mx-auto px-6">
                <p className="text-sm text-[#143628]/65">Loading membership allocation...</p>
              </section>
            ) : (
              <MembershipSection
                plans={plans}
                settings={settings}
                launchMode={settings.launch_mode}
                onSelectPlan={startPlanFlow}
                onJoinPriorityList={handleJoinPriorityList}
              />
            )}
          </>
        )}
      </main>

      <Footer onOpenAdmin={() => navigateTo('/admin')} isAdminView={isAdminView} />

      <MemberAuthModal
        isOpen={authModalOpen}
        pendingPlan={selectedPlan}
        prefilledLead={signedUpLead}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      <CheckoutDrawer
        plan={selectedPlan}
        isOpen={checkoutOpen}
        memberUser={memberUser}
        memberToken={memberToken}
        onSignOutMember={() => {
          setMemberUser(null);
          setMemberToken(null);
        }}
        onClose={() => setCheckoutOpen(false)}
        onPaymentConfirmed={handlePaymentConfirmed}
      />
    </div>
  );
}
