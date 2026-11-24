import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  KeyRound,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  HealthGoal,
  LaunchMode,
  Lead,
  MemberUser,
  Plan,
  SiteSettings,
  SubscriptionRecord,
  WellnessEvent,
  WellnessProduct,
} from '../types/wellness';

interface AdminConsoleProps {
  onSettingsUpdated: () => void;
}

type AdminTab = 'launch' | 'products' | 'plans' | 'members' | 'events';

const IMAGE_PRESETS = [
  { label: 'Golden Turmeric & Moringa Shot', value: '/src/assets/images/ritual_craft_shots_1795507258606.jpg' },
  { label: '7-Day Apothecary Dispatch Box', value: '/src/assets/images/hero_botanical_shots_1795507257101.jpg' },
  { label: 'Mountain Retreat Pavilion', value: '/src/assets/images/retreat_sanctuary_1795507258661.jpg' },
  { label: 'Courtyard Community Table', value: '/src/assets/images/event_community_table_1795507259675.jpg' },
  { label: 'Morning Habit Studio', value: '/src/assets/images/event_habit_workshop_1795507259206.jpg' },
];

export function AdminConsole({ onSettingsUpdated }: AdminConsoleProps) {
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    configured: boolean;
    source: 'env' | 'claimed' | 'unclaimed';
    username?: string;
  } | null>(null);
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('launch');
  const [loadingData, setLoadingData] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<WellnessProduct[]>([]);
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);

  // 1. Launch Control state
  const [inviteDraft, setInviteDraft] = useState('');
  const [modeDraft, setModeDraft] = useState<LaunchMode>('pre_launch');
  const [launchDateDraft, setLaunchDateDraft] = useState('2027-01-01T00:00:00Z');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // 2. Products Catalog state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<HealthGoal>('Energy');
  const [prodTagline, setProdTagline] = useState('');
  const [prodBotanicals, setProdBotanicals] = useState('');
  const [prodSizeMl, setProdSizeMl] = useState(60);
  const [prodPrice, setProdPrice] = useState(520);
  const [prodImage, setProdImage] = useState(IMAGE_PRESETS[0].value);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productNotice, setProductNotice] = useState<string | null>(null);

  // 3. Plans & Pricing state
  const [planEdits, setPlanEdits] = useState<
    Record<
      string,
      {
        name: string;
        billing_cycle: string;
        price_pkr: number;
        shots_per_delivery: number;
        total_slots: number;
        slots_taken: number;
        is_active: boolean;
      }
    >
  >({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);

  // 4. Members, Subscriptions & Dispatch Search
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [memberNotice, setMemberNotice] = useState<string | null>(null);

  // 5. Events & Retreats Manager
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<WellnessEvent['type']>('Community Meetup');
  const [evDate, setEvDate] = useState('2027-02-20T09:00');
  const [evLocation, setEvLocation] = useState('');
  const [evSpots, setEvSpots] = useState(20);
  const [evDescription, setEvDescription] = useState('');
  const [evImage, setEvImage] = useState(IMAGE_PRESETS[3].value);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => r.json())
      .then((d: { configured: boolean; source: 'env' | 'claimed' | 'unclaimed'; username?: string }) => {
        setAuthStatus(d);
        if (d.username) setUsernameInput(d.username);
      })
      .catch(() => setAuthStatus({ configured: false, source: 'unclaimed', username: 'admin' }));
  }, []);

  const loadOverview = useCallback(async (token: string) => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setBearerToken(null);
        return;
      }
      const data = (await res.json()) as {
        settings: SiteSettings;
        plans: Plan[];
        products: WellnessProduct[];
        events: WellnessEvent[];
        members: MemberUser[];
        leads: Lead[];
        subscriptions: SubscriptionRecord[];
      };
      setPlans(data.plans);
      setProducts(data.products ?? []);
      setEvents(data.events ?? []);
      setMembers(data.members ?? []);
      setLeads(data.leads);
      setSubscriptions(data.subscriptions);
      setInviteDraft(data.settings.community_invite_link);
      setModeDraft(data.settings.launch_mode);
      setLaunchDateDraft(data.settings.launch_date);

      const edits: typeof planEdits = {};
      for (const p of data.plans) {
        edits[p.id] = {
          name: p.name,
          billing_cycle: p.billing_cycle,
          price_pkr: p.price_pkr,
          shots_per_delivery: p.shots_per_delivery,
          total_slots: p.total_slots,
          slots_taken: p.slots_taken,
          is_active: p.is_active,
        };
      }
      setPlanEdits(edits);
    } finally {
      setLoadingData(false);
    }
  }, []);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const endpoint =
      authStatus?.source === 'unclaimed' ? '/api/admin/auth/claim' : '/api/admin/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, passcode: passcodeInput }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Invalid credentials.');
        return;
      }
      setBearerToken(data.token);
      setPasscodeInput('');
      setAuthStatus({
        configured: true,
        source: authStatus?.source === 'env' ? 'env' : 'claimed',
        username: usernameInput,
      });
      await loadOverview(data.token);
    } catch {
      setAuthError('Network error authenticating with server.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!bearerToken) return;
    setSavingSettings(true);
    setSaveNotice(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          launch_mode: modeDraft,
          community_invite_link: inviteDraft,
          launch_date: launchDateDraft,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSaveNotice(data.error || 'Could not save settings.');
        return;
      }
      setSaveNotice('Launch settings updated and synced to storefront.');
      onSettingsUpdated();
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleQuickToggleMode(nextMode: LaunchMode) {
    setModeDraft(nextMode);
    if (!bearerToken) return;
    setSavingSettings(true);
    setSaveNotice(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ launch_mode: nextMode }),
      });
      if (res.ok) {
        setSaveNotice(
          nextMode === 'pre_launch'
            ? 'Switched to Pre-Launch Mode (Early Bird).'
            : 'Switched to Live Subscriptions Mode.'
        );
        onSettingsUpdated();
      }
    } finally {
      setSavingSettings(false);
    }
  }

  // Products CRUD
  function startEditProduct(p: WellnessProduct) {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdTagline(p.tagline);
    setProdBotanicals(p.botanicals);
    setProdSizeMl(p.size_ml);
    setProdPrice(p.price_pkr);
    setProdImage(p.image_url);
    setProductNotice(null);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProdName('');
    setProdCategory('Energy');
    setProdTagline('');
    setProdBotanicals('');
    setProdSizeMl(60);
    setProdPrice(520);
    setProdImage(IMAGE_PRESETS[0].value);
  }

  async function handleSubmitProduct(e: FormEvent) {
    e.preventDefault();
    if (!bearerToken) return;
    setSavingProduct(true);
    setProductNotice(null);
    try {
      const url = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : '/api/admin/products';
      const method = editingProductId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          name: prodName,
          category: prodCategory,
          tagline: prodTagline,
          botanicals: prodBotanicals,
          size_ml: Number(prodSizeMl),
          price_pkr: Number(prodPrice),
          image_url: prodImage,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setProductNotice(data.error || 'Could not save product.');
        return;
      }
      setProductNotice(editingProductId ? 'Product updated.' : 'New wellness shot added.');
      resetProductForm();
      await loadOverview(bearerToken);
      onSettingsUpdated();
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleToggleProductActive(p: WellnessProduct) {
    if (!bearerToken) return;
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: !item.is_active } : item))
      );
      onSettingsUpdated();
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!bearerToken) return;
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      onSettingsUpdated();
    }
  }

  // Plans & Pricing
  async function handleSavePlan(planId: string) {
    if (!bearerToken) return;
    const draft = planEdits[planId];
    if (!draft) return;
    setSavingPlanId(planId);
    setPlanNotice(null);
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          name: draft.name,
          billing_cycle: draft.billing_cycle,
          price_pkr: Number(draft.price_pkr),
          shots_per_delivery: Number(draft.shots_per_delivery),
          total_slots: Number(draft.total_slots),
          slots_taken: Number(draft.slots_taken),
          is_active: draft.is_active,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; plan?: Plan; error?: string };
      if (!res.ok || !data.plan) {
        setPlanNotice(data.error || 'Failed to save plan updates.');
        return;
      }
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan! : p)));
      setPlanNotice(
        `Saved ${data.plan.name} — Rs. ${data.plan.price_pkr.toLocaleString()} (${data.plan.slots_taken}/${data.plan.total_slots} slots).`
      );
      onSettingsUpdated();
    } finally {
      setSavingPlanId(null);
    }
  }

  // Members & Subscriptions
  async function handleToggleMemberStatus(m: MemberUser) {
    if (!bearerToken) return;
    const nextStatus = m.status === 'active' ? 'suspended' : 'active';
    const res = await fetch(`/api/admin/members/${m.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, status: nextStatus } : item))
      );
      setMemberNotice(`Member ${m.full_name} marked as ${nextStatus}.`);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!bearerToken) return;
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMemberNotice('Member account removed.');
    }
  }

  async function handleUpdateSubStatus(
    subId: string,
    status: SubscriptionRecord['status'],
    payment_status: SubscriptionRecord['payment_status']
  ) {
    if (!bearerToken) return;
    const res = await fetch(`/api/admin/subscriptions/${subId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ status, payment_status }),
    });
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status, payment_status } : s))
      );
      setMemberNotice('Subscription status updated.');
    }
  }

  async function handleDownloadDispatchCsv() {
    if (!bearerToken) return;
    setExportingCsv(true);
    try {
      const res = await fetch('/api/admin/dispatch-csv', {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vana-ritual-dispatch-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  }

  // Events Manager
  function startEditEvent(ev: WellnessEvent) {
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvType(ev.type);
    setEvDate(ev.event_date.slice(0, 16));
    setEvLocation(ev.location);
    setEvSpots(ev.spots_available);
    setEvDescription(ev.description);
    setEvImage(ev.image_url);
    setEventNotice(null);
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEvTitle('');
    setEvType('Community Meetup');
    setEvDate('2027-02-20T09:00');
    setEvLocation('');
    setEvSpots(20);
    setEvDescription('');
    setEvImage(IMAGE_PRESETS[3].value);
  }

  async function handleSubmitEvent(e: FormEvent) {
    e.preventDefault();
    if (!bearerToken) return;
    setSavingEvent(true);
    setEventNotice(null);
    try {
      const url = editingEventId ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
      const method = editingEventId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          title: evTitle,
          type: evType,
          event_date: new Date(evDate).toISOString(),
          location: evLocation,
          spots_available: Number(evSpots),
          description: evDescription,
          image_url: evImage,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setEventNotice(data.error || 'Unable to save event.');
        return;
      }
      setEventNotice(editingEventId ? 'Event updated on homepage.' : 'New event published.');
      resetEventForm();
      await loadOverview(bearerToken);
      onSettingsUpdated();
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!bearerToken) return;
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      onSettingsUpdated();
    }
  }

  if (!bearerToken) {
    const isCheckingStatus = authStatus === null;
    const isUnclaimed = authStatus?.source === 'unclaimed';
    const isEnvManaged = authStatus?.source === 'env';
    return (
      <section className="py-20 min-h-[75vh] bg-[#FAF8F5]">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white border border-[#143628]/15 rounded-xl p-7 space-y-5">
            <div className="flex items-center gap-2.5 text-[#4A7C59]">
              <KeyRound className="w-5 h-5" />
              <p className="text-xs font-semibold">
                {isUnclaimed ? 'First-Run Admin Setup' : 'Brand Admin Sign-In'}
              </p>
            </div>

            <h1 className="font-editorial text-3xl font-semibold text-[#143628]">
              {isUnclaimed ? 'Initialize Admin Password' : 'Sign In to Brand Admin'}
            </h1>

            <p className="text-sm text-[#143628]/75 leading-relaxed">
              {isUnclaimed
                ? 'Username is configured as "admin". Enter your chosen admin password to lock and open the dashboard.'
                : 'Sign in with your admin username and password to manage products, pricing, plans, members, and subscriptions.'}
            </p>

            {authError && (
              <div role="alert" className="text-xs font-medium text-red-700 bg-red-50 p-3 rounded-md space-y-1.5">
                <p>{authError}</p>
                {isEnvManaged && (
                  <p className="text-[11px] text-red-800/85 font-normal leading-relaxed">
                    An <code className="font-mono">ADMIN_PASSCODE</code> secret is active on the server.
                    Update <code className="font-mono">ADMIN_PASSCODE</code> in{' '}
                    <strong>Settings → Secrets</strong> (or remove it to set a password directly here) and
                    restart the preview server.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-user" className="block text-xs font-medium text-[#143628] mb-1">
                  Username
                </label>
                <input
                  id="admin-user"
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                />
              </div>

              <div>
                <label htmlFor="admin-pass" className="block text-xs font-medium text-[#143628] mb-1">
                  Password
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  minLength={6}
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || isCheckingStatus}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 cursor-pointer"
              >
                {(authLoading || isCheckingStatus) && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isCheckingStatus
                    ? 'Checking Admin Status...'
                    : isUnclaimed
                      ? 'Activate Admin & Open Dashboard'
                      : 'Sign In to Dashboard'}
                </span>
              </button>
            </form>

            {isEnvManaged && !authError && (
              <p className="text-[11px] text-[#143628]/60 leading-relaxed pt-1 border-t border-[#143628]/10">
                Password is verified against your <code className="font-mono">ADMIN_PASSCODE</code>{' '}
                server secret in Settings → Secrets.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter(
    (m) =>
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q)
  );
  const filteredSubs = subscriptions.filter(
    (s) =>
      !q ||
      (s.lead_name || '').toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.delivery_address.toLowerCase().includes(q)
  );
  const filteredLeads = leads.filter(
    (l) => !q || l.full_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
  );

  const paidRevenuePkr = subscriptions
    .filter((s) => s.payment_status === 'paid')
    .reduce((acc, s) => acc + s.amount_pkr, 0);

  return (
    <section className="py-10 min-h-[82vh] bg-[#FAF8F5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#143628]/12 mb-6">
          <div>
            <p className="text-xs font-medium text-[#4A7C59]">Vana Ritual / Brand Admin (/admin)</p>
            <h1 className="font-editorial text-3xl font-semibold text-[#143628]">
              Storefront, Pricing, Products &amp; Member Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => bearerToken && loadOverview(bearerToken)}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#143628] bg-white border border-[#143628]/15 rounded-md hover:bg-[#F2EFE9] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setBearerToken(null)}
              className="px-3.5 py-2 text-xs font-medium text-[#143628]/75 hover:text-[#143628] cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* 4-Column KPI Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#143628]/12 rounded-xl p-4">
            <p className="text-xs text-[#143628]/65">Registered Members</p>
            <p className="font-tabular text-2xl font-semibold text-[#143628] mt-1">
              {members.length}
            </p>
          </div>
          <div className="bg-white border border-[#143628]/12 rounded-xl p-4">
            <p className="text-xs text-[#143628]/65">Subscriptions</p>
            <p className="font-tabular text-2xl font-semibold text-[#143628] mt-1">
              {subscriptions.length}
            </p>
          </div>
          <div className="bg-white border border-[#143628]/12 rounded-xl p-4">
            <p className="text-xs text-[#143628]/65">Active Products / Plans</p>
            <p className="font-tabular text-2xl font-semibold text-[#143628] mt-1">
              {products.filter((p) => p.is_active).length} / {plans.filter((p) => p.is_active).length}
            </p>
          </div>
          <div className="bg-white border border-[#143628]/12 rounded-xl p-4">
            <p className="text-xs text-[#143628]/65">Confirmed Revenue</p>
            <p className="font-tabular text-2xl font-semibold text-[#143628] mt-1">
              Rs. {paidRevenuePkr.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-1.5 bg-white border border-[#143628]/12 rounded-xl p-3">
            {(
              [
                { id: 'launch', label: 'Launch Control', icon: Sliders },
                { id: 'products', label: 'Products & Shots', icon: Package },
                { id: 'plans', label: 'Pricing, Plans & Slots', icon: Layers },
                { id: 'members', label: 'Members & Subscriptions', icon: Users },
                { id: 'events', label: 'Events & Retreats', icon: Calendar },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                    active
                      ? 'bg-[#143628] text-[#FAF8F5]'
                      : 'text-[#143628]/80 hover:bg-[#F2EFE9]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: LAUNCH CONTROL */}
            {activeTab === 'launch' && (
              <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Launch Control &amp; Community Invite Link
                  </h2>
                  <p className="text-xs text-[#143628]/65 mt-1">
                    Switch between Pre-Launch Early Bird and Live Subscriptions, and update the
                    community group link shown upon spot reservation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => handleQuickToggleMode('pre_launch')}
                    className={`p-4 text-left rounded-lg border transition-colors cursor-pointer ${
                      modeDraft === 'pre_launch'
                        ? 'bg-[#143628] text-[#FAF8F5] border-[#143628]'
                        : 'bg-[#FAF8F5] text-[#143628] border-[#143628]/15 hover:border-[#143628]/40'
                    }`}
                  >
                    <p className="text-xs font-semibold">Pre-Launch Mode (Early Bird)</p>
                    <p
                      className={`text-xs mt-1 ${
                        modeDraft === 'pre_launch' ? 'text-[#FAF8F5]/75' : 'text-[#143628]/65'
                      }`}
                    >
                      Shows January 1 countdown &amp; Founding Pass scarcity bar.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => handleQuickToggleMode('live_subscriptions')}
                    className={`p-4 text-left rounded-lg border transition-colors cursor-pointer ${
                      modeDraft === 'live_subscriptions'
                        ? 'bg-[#143628] text-[#FAF8F5] border-[#143628]'
                        : 'bg-[#FAF8F5] text-[#143628] border-[#143628]/15 hover:border-[#143628]/40'
                    }`}
                  >
                    <p className="text-xs font-semibold">Live Subscriptions Mode</p>
                    <p
                      className={`text-xs mt-1 ${
                        modeDraft === 'live_subscriptions' ? 'text-[#FAF8F5]/75' : 'text-[#143628]/65'
                      }`}
                    >
                      Prioritizes active Weekly, Bi-Weekly &amp; Monthly dispatch enrollment.
                    </p>
                  </button>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 pt-2 border-t border-[#143628]/10">
                  <div>
                    <label htmlFor="adm-invite-url" className="block text-xs font-medium text-[#143628] mb-1">
                      Community Group Invite Link
                    </label>
                    <input
                      id="adm-invite-url"
                      type="url"
                      required
                      value={inviteDraft}
                      onChange={(e) => setInviteDraft(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="adm-launch-dt" className="block text-xs font-medium text-[#143628] mb-1">
                      Launch Target Timestamp (ISO UTC)
                    </label>
                    <input
                      id="adm-launch-dt"
                      type="text"
                      required
                      value={launchDateDraft}
                      onChange={(e) => setLaunchDateDraft(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 cursor-pointer"
                    >
                      {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Settings</span>
                    </button>

                    {saveNotice && (
                      <p className="text-xs font-medium text-[#4A7C59] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{saveNotice}</span>
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: PRODUCTS & SHOTS MANAGER */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSubmitProduct}
                  className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                      {editingProductId ? 'Edit Wellness Shot Product' : 'Add New Wellness Shot'}
                    </h2>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="text-xs underline text-[#143628]/70 cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="p-name" className="block text-xs font-medium text-[#143628] mb-1">
                        Product Name
                      </label>
                      <input
                        id="p-name"
                        type="text"
                        required
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="No. 05 Wild Sea Buckthorn"
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="p-cat" className="block text-xs font-medium text-[#143628] mb-1">
                        Wellness Goal Category
                      </label>
                      <select
                        id="p-cat"
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value as HealthGoal)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      >
                        <option value="Energy">Energy</option>
                        <option value="Immunity">Immunity</option>
                        <option value="Gut Health">Gut Health</option>
                        <option value="Daily Habit">Daily Habit</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="p-price" className="block text-xs font-medium text-[#143628] mb-1">
                        Unit Price (PKR)
                      </label>
                      <input
                        id="p-price"
                        type="number"
                        min={0}
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="p-size" className="block text-xs font-medium text-[#143628] mb-1">
                        Bottle Size (ml)
                      </label>
                      <input
                        id="p-size"
                        type="number"
                        min={10}
                        required
                        value={prodSizeMl}
                        onChange={(e) => setProdSizeMl(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="p-img" className="block text-xs font-medium text-[#143628] mb-1">
                        Product Image
                      </label>
                      <select
                        id="p-img"
                        value={prodImage}
                        onChange={(e) => setProdImage(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      >
                        {IMAGE_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="p-tag" className="block text-xs font-medium text-[#143628] mb-1">
                      Editorial Tagline
                    </label>
                    <input
                      id="p-tag"
                      type="text"
                      required
                      value={prodTagline}
                      onChange={(e) => setProdTagline(e.target.value)}
                      placeholder="Cold-pressed antioxidant shot for steady focus"
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="p-bot" className="block text-xs font-medium text-[#143628] mb-1">
                      Botanical Ingredients
                    </label>
                    <input
                      id="p-bot"
                      type="text"
                      required
                      value={prodBotanicals}
                      onChange={(e) => setProdBotanicals(e.target.value)}
                      placeholder="Organic turmeric · ginger · black pepper · citrus"
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 cursor-pointer"
                    >
                      {savingProduct ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{editingProductId ? 'Save Product Changes' : 'Add Product'}</span>
                    </button>
                    {productNotice && (
                      <p className="text-xs font-medium text-[#4A7C59]">{productNotice}</p>
                    )}
                  </div>
                </form>

                <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-3">
                  <h3 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Product Catalog ({products.length})
                  </h3>
                  <div className="divide-y divide-[#143628]/10 text-xs">
                    {products.map((p) => (
                      <div key={p.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#143628]">
                            {p.name} ·{' '}
                            <span className="font-tabular">Rs. {p.price_pkr.toLocaleString()}</span>
                          </p>
                          <p className="text-[#143628]/65 mt-0.5">
                            {p.category} · <span className="font-tabular">{p.size_ml}ml</span> ·{' '}
                            {p.is_active ? 'Visible on Storefront' : 'Hidden'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(p)}
                            className="text-xs font-medium text-[#4A7C59] underline cursor-pointer"
                          >
                            {p.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditProduct(p)}
                            className="text-xs font-medium text-[#143628] underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            aria-label={`Delete ${p.name}`}
                            className="text-red-700 hover:text-red-900 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRICING, PLANS & SLOT MANAGER */}
            {activeTab === 'plans' && (
              <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Subscription Plans, Pricing &amp; Scarcity Slots
                  </h2>
                  <p className="text-xs text-[#143628]/65 mt-1">
                    Set pricing (PKR), shots per delivery, billing label, slots taken, total slots,
                    and storefront visibility for every membership tier.
                  </p>
                </div>

                {planNotice && (
                  <p className="text-xs font-medium text-[#4A7C59] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{planNotice}</span>
                  </p>
                )}

                <div className="space-y-4">
                  {plans.map((plan) => {
                    const edit = planEdits[plan.id] ?? {
                      name: plan.name,
                      billing_cycle: plan.billing_cycle,
                      price_pkr: plan.price_pkr,
                      shots_per_delivery: plan.shots_per_delivery,
                      total_slots: plan.total_slots,
                      slots_taken: plan.slots_taken,
                      is_active: plan.is_active,
                    };
                    const remaining = Math.max(0, edit.total_slots - edit.slots_taken);

                    return (
                      <div
                        key={plan.id}
                        className="p-4 bg-[#FAF8F5] border border-[#143628]/12 rounded-lg space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-[#4A7C59]">
                            Tier Slug: {plan.slug} ·{' '}
                            {remaining === 0 ? 'Batch Full' : `${remaining} remaining`}
                          </span>
                          <label className="inline-flex items-center gap-2 text-xs text-[#143628] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={edit.is_active}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: { ...edit, is_active: e.target.checked },
                                }))
                              }
                              className="accent-[#143628]"
                            />
                            <span>Active on Storefront</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                          <div className="lg:col-span-2">
                            <label className="block text-[11px] text-[#143628]/70 mb-1">
                              Plan Name
                            </label>
                            <input
                              type="text"
                              value={edit.name}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: { ...edit, name: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-[#143628]/20 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#143628]/70 mb-1">
                              Price (PKR)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={edit.price_pkr}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: { ...edit, price_pkr: Math.max(0, Number(e.target.value)) },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 font-tabular bg-white border border-[#143628]/20 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#143628]/70 mb-1">
                              Shots / Box
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={edit.shots_per_delivery}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: {
                                    ...edit,
                                    shots_per_delivery: Math.max(1, Number(e.target.value)),
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 font-tabular bg-white border border-[#143628]/20 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#143628]/70 mb-1">
                              Slots Taken
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={edit.slots_taken}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: {
                                    ...edit,
                                    slots_taken: Math.max(0, Number(e.target.value)),
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 font-tabular bg-white border border-[#143628]/20 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#143628]/70 mb-1">
                              Total Slots
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={edit.total_slots}
                              onChange={(e) =>
                                setPlanEdits((prev) => ({
                                  ...prev,
                                  [plan.id]: {
                                    ...edit,
                                    total_slots: Math.max(1, Number(e.target.value)),
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 font-tabular bg-white border border-[#143628]/20 rounded"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={savingPlanId === plan.id}
                            onClick={() => handleSavePlan(plan.id)}
                            className="px-4 py-2 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded hover:bg-[#1e4a38] disabled:opacity-60 cursor-pointer"
                          >
                            {savingPlanId === plan.id ? 'Saving...' : 'Save Plan Changes'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: MEMBERS, SUBSCRIPTIONS & CSV DISPATCH */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                        Registered Member Accounts ({filteredMembers.length})
                      </h2>
                      <p className="text-xs text-[#143628]/65">
                        Manage users who registered via the Reserve My Spot login screen.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={exportingCsv}
                      onClick={handleDownloadDispatchCsv}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{exportingCsv ? 'Exporting...' : 'Export CSV Dispatch List'}</span>
                    </button>
                  </div>

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members, subscriptions, or leads by name, email, phone, or city..."
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                  />

                  {memberNotice && (
                    <p className="text-xs font-medium text-[#4A7C59]">{memberNotice}</p>
                  )}

                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-[#143628]/65 py-3">
                      No registered member accounts yet. Accounts appear as soon as someone creates
                      one when clicking Reserve My Spot.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#143628]/12 text-[#143628]/65">
                          <tr>
                            <th className="py-2 pr-4 font-medium">Member</th>
                            <th className="py-2 pr-4 font-medium">Phone</th>
                            <th className="py-2 pr-4 font-medium">Goal</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#143628]/10">
                          {filteredMembers.map((m) => (
                            <tr key={m.id}>
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-[#143628]">{m.full_name}</p>
                                <p className="text-[11px] text-[#143628]/60">{m.email}</p>
                              </td>
                              <td className="py-3 pr-4 font-tabular">{m.phone}</td>
                              <td className="py-3 pr-4">{m.health_goal}</td>
                              <td className="py-3 pr-4 font-medium">
                                <span
                                  className={
                                    m.status === 'active' ? 'text-[#4A7C59]' : 'text-red-700'
                                  }
                                >
                                  {m.status}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberStatus(m)}
                                  className="underline text-[#143628] cursor-pointer"
                                >
                                  {m.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(m.id)}
                                  className="text-red-700 underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Subscriptions Control */}
                <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-3">
                  <h3 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Subscriptions &amp; Dispatch Status ({filteredSubs.length})
                  </h3>
                  {filteredSubs.length === 0 ? (
                    <p className="text-xs text-[#143628]/65">No subscriptions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#143628]/12 text-[#143628]/65">
                          <tr>
                            <th className="py-2 pr-4 font-medium">Subscriber</th>
                            <th className="py-2 pr-4 font-medium">Plan</th>
                            <th className="py-2 pr-4 font-medium">City &amp; Address</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 font-medium text-right">Manage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#143628]/10">
                          {filteredSubs.map((s) => (
                            <tr key={s.id}>
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-[#143628]">{s.lead_name || 'Member'}</p>
                                <p className="text-[11px] text-[#143628]/60">{s.lead_phone || s.lead_email}</p>
                              </td>
                              <td className="py-3 pr-4">
                                {s.plan_name || s.plan_slug} ·{' '}
                                <span className="font-tabular">Rs. {s.amount_pkr.toLocaleString()}</span>
                              </td>
                              <td className="py-3 pr-4 max-w-xs text-[#143628]/80">
                                {s.city} · {s.delivery_address}
                              </td>
                              <td className="py-3 pr-4 font-medium text-[#4A7C59]">
                                {s.status} ({s.payment_status})
                              </td>
                              <td className="py-3 text-right">
                                <select
                                  aria-label={`Change status for ${s.lead_name || s.id}`}
                                  value={s.status}
                                  onChange={(e) =>
                                    handleUpdateSubStatus(
                                      s.id,
                                      e.target.value as SubscriptionRecord['status'],
                                      s.payment_status
                                    )
                                  }
                                  className="px-2 py-1 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded"
                                >
                                  <option value="reserved">reserved</option>
                                  <option value="active">active</option>
                                  <option value="paused">paused</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Leads */}
                <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-3">
                  <h3 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Inner Circle Leads ({filteredLeads.length})
                  </h3>
                  {filteredLeads.length === 0 ? (
                    <p className="text-xs text-[#143628]/65">No leads captured yet.</p>
                  ) : (
                    <div className="divide-y divide-[#143628]/10 text-xs">
                      {filteredLeads.map((l) => (
                        <div key={l.id} className="py-2.5 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#143628]">{l.full_name}</p>
                            <p className="text-[#143628]/65">
                              {l.email} · <span className="font-tabular">{l.phone}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-[#143628]">{l.health_goal}</p>
                            <p className="text-[#4A7C59]">
                              {l.has_early_bird ? 'Early Bird Verified' : 'Lead'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: EVENTS & RETREATS MANAGER */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSubmitEvent}
                  className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-editorial text-2xl font-semibold text-[#143628]">
                      {editingEventId ? 'Edit Event / Retreat' : 'Add New Event or Retreat'}
                    </h2>
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={resetEventForm}
                        className="text-xs font-medium text-[#143628]/70 underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ev-title" className="block text-xs font-medium text-[#143628] mb-1">
                        Event Title
                      </label>
                      <input
                        id="ev-title"
                        type="text"
                        required
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        placeholder="Sunrise Breathwork & Cold-Press Table"
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="ev-type" className="block text-xs font-medium text-[#143628] mb-1">
                        Event Type
                      </label>
                      <select
                        id="ev-type"
                        value={evType}
                        onChange={(e) => setEvType(e.target.value as WellnessEvent['type'])}
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      >
                        <option value="Wellness Retreat">Wellness Retreat</option>
                        <option value="Community Meetup">Community Meetup</option>
                        <option value="Habit Workshop">Habit Workshop</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="ev-date" className="block text-xs font-medium text-[#143628] mb-1">
                        Date &amp; Time
                      </label>
                      <input
                        id="ev-date"
                        type="datetime-local"
                        required
                        value={evDate}
                        onChange={(e) => setEvDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="ev-loc" className="block text-xs font-medium text-[#143628] mb-1">
                        Location
                      </label>
                      <input
                        id="ev-loc"
                        type="text"
                        required
                        value={evLocation}
                        onChange={(e) => setEvLocation(e.target.value)}
                        placeholder="Gulberg Courtyard, Lahore"
                        className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="ev-spots" className="block text-xs font-medium text-[#143628] mb-1">
                        Spots Available
                      </label>
                      <input
                        id="ev-spots"
                        type="number"
                        min={0}
                        required
                        value={evSpots}
                        onChange={(e) => setEvSpots(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-tabular bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ev-img" className="block text-xs font-medium text-[#143628] mb-1">
                      Editorial Cover Image
                    </label>
                    <select
                      id="ev-img"
                      value={evImage}
                      onChange={(e) => setEvImage(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    >
                      {IMAGE_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ev-desc" className="block text-xs font-medium text-[#143628] mb-1">
                      Description
                    </label>
                    <textarea
                      id="ev-desc"
                      rows={2}
                      required
                      value={evDescription}
                      onChange={(e) => setEvDescription(e.target.value)}
                      placeholder="Describe the session format, host, and member takeaway..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#143628]/20 rounded-md"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={savingEvent}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 cursor-pointer"
                    >
                      {savingEvent ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{editingEventId ? 'Save Event Changes' : 'Publish Event'}</span>
                    </button>

                    {eventNotice && (
                      <p className="text-xs font-medium text-[#4A7C59]">{eventNotice}</p>
                    )}
                  </div>
                </form>

                <div className="bg-white border border-[#143628]/12 rounded-xl p-6 space-y-3">
                  <h3 className="font-editorial text-2xl font-semibold text-[#143628]">
                    Published Gatherings ({events.length})
                  </h3>
                  <div className="divide-y divide-[#143628]/10 text-xs">
                    {events.map((ev) => (
                      <div key={ev.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#143628]">{ev.title}</p>
                          <p className="text-[#143628]/65 mt-0.5">
                            {ev.type} · {new Date(ev.event_date).toLocaleDateString()} · {ev.location} ·{' '}
                            <span className="font-tabular">{ev.spots_available}</span> spots
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEditEvent(ev)}
                            className="text-xs font-medium text-[#143628] underline underline-offset-4 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            aria-label={`Delete ${ev.title}`}
                            className="text-red-700 hover:text-red-900 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
