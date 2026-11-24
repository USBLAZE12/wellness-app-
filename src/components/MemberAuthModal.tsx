import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Loader2, Lock, X } from 'lucide-react';
import type { HealthGoal, Lead, MemberUser, Plan } from '../types/wellness';

interface MemberAuthModalProps {
  isOpen: boolean;
  pendingPlan: Plan | null;
  prefilledLead: Lead | null;
  onClose: () => void;
  onAuthenticated: (user: MemberUser, token: string) => void;
}

const HEALTH_GOALS: HealthGoal[] = ['Energy', 'Immunity', 'Gut Health', 'Daily Habit'];

export function MemberAuthModal({
  isOpen,
  pendingPlan,
  prefilledLead,
  onClose,
  onAuthenticated,
}: MemberAuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [healthGoal, setHealthGoal] = useState<HealthGoal>('Daily Habit');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledLead) {
      setFullName(prefilledLead.full_name);
      setEmail(prefilledLead.email);
      setPhone(prefilledLead.phone);
      setHealthGoal(prefilledLead.health_goal);
    }
  }, [prefilledLead]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? {
              full_name: fullName,
              email,
              phone,
              health_goal: healthGoal,
              password,
            }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        user?: MemberUser;
        error?: string;
      };

      if (!res.ok || !data.token || !data.user) {
        setErrorMsg(data.error || 'Authentication failed. Please check your details.');
        return;
      }

      setPassword('');
      onAuthenticated(data.user, data.token);
    } catch {
      setErrorMsg('Network error connecting to member account service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member login or account creation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#143628]/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-[#FAF8F5] border border-[#143628]/15 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 bg-white border-b border-[#143628]/12 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#4A7C59] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>
                {pendingPlan
                  ? `Reserving ${pendingPlan.name} · Rs. ${pendingPlan.price_pkr.toLocaleString()}`
                  : 'Member Account Access'}
              </span>
            </p>
            <h2 className="font-editorial text-2xl font-semibold text-[#143628] mt-1">
              {mode === 'register' ? 'Create Your Member Account' : 'Sign In to Your Account'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[#143628]/70 hover:text-[#143628] hover:bg-[#143628]/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2EFE9] border border-[#143628]/10 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#143628] text-[#FAF8F5]'
                  : 'text-[#143628]/75 hover:text-[#143628]'
              }`}
            >
              Create New Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#143628] text-[#FAF8F5]'
                  : 'text-[#143628]/75 hover:text-[#143628]'
              }`}
            >
              Existing Member Sign In
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-[#143628] mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ayesha Khan"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-phone" className="block text-xs font-medium text-[#143628] mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300 1234567"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-goal" className="block text-xs font-medium text-[#143628] mb-1">
                      Wellness Goal
                    </label>
                    <select
                      id="auth-goal"
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
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#143628] mb-1">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ayesha@example.pk"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#143628] mb-1">
                Password {mode === 'register' && <span className="text-[#143628]/55">(min. 6 characters)</span>}
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'register' ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#143628]/20 rounded-md focus:outline-none focus:border-[#143628]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'register'
                  ? 'Create Account & Continue to Reservation'
                  : 'Sign In & Continue to Reservation'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
