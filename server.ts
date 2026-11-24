import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  authenticateMemberAccount,
  createEvent,
  createPendingSubscription,
  createProduct,
  deleteEvent,
  deleteMemberAdmin,
  deleteProduct,
  getAdminOverview,
  getBootstrapData,
  getMemberById,
  getPlanBySlug,
  getStorageDiagnostics,
  logPaymentEvent,
  markSubscriptionFailed,
  registerMemberAccount,
  reserveSlotOnPayment,
  updateEvent,
  updateMemberAdmin,
  updatePlanSlots,
  updateProduct,
  updateSiteSettings,
  updateSubscriptionAdmin,
  upsertLead,
} from './server/store.ts';
import {
  buildLiveGatewayParams,
  hasLiveGatewayCredentials,
  signCheckoutToken,
  verifyCheckoutToken,
  verifyPayFastWebhookSignature,
  verifySafepayWebhookSignature,
} from './server/payments.ts';
import type {
  HealthGoal,
  LaunchMode,
  PaymentGateway,
  PaymentMethod,
  PlanSlug,
  SubscriptionRecord,
  WellnessEvent,
} from './src/types/wellness.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEALTH_GOALS = new Set<HealthGoal>(['Energy', 'Immunity', 'Gut Health', 'Daily Habit']);
const PLAN_SLUGS = new Set<PlanSlug>(['early-bird', 'weekly', 'bi-weekly', 'monthly']);
const GATEWAYS = new Set<PaymentGateway>(['PayFast', 'Safepay', 'BankCard']);
const PAYMENT_METHODS = new Set<PaymentMethod>(['Card', 'EasyPaisa', 'JazzCash', 'BankTransfer']);
const LAUNCH_MODES = new Set<LaunchMode>(['pre_launch', 'live_subscriptions']);
const EVENT_TYPES = new Set<WellnessEvent['type']>([
  'Wellness Retreat',
  'Community Meetup',
  'Habit Workshop',
]);
const SUB_STATUSES = new Set<SubscriptionRecord['status']>(['reserved', 'active', 'paused']);
const PAY_STATUSES = new Set<SubscriptionRecord['payment_status']>(['pending', 'paid', 'failed']);

// Ephemeral in-memory signing secret for Admin & Member Bearer tokens when env secret is unset
const TOKEN_SIGNING_SECRET =
  process.env.SESSION_SIGNING_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'admin';

// First-run claimed admin password hash (used only when ADMIN_PASSCODE env is unset)
let claimedAdminHash: { salt: string; derivedKey: string } | null = null;

function hashPassword(password: string, salt?: string): { salt: string; derivedKey: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, derivedKey };
}

function verifyPasswordAgainstEnvOrClaimed(candidate: string): boolean {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(envPasscode).digest();
    return crypto.timingSafeEqual(a, b);
  }
  if (!claimedAdminHash) return false;
  const check = crypto.scryptSync(candidate, claimedAdminHash.salt, 64);
  const stored = Buffer.from(claimedAdminHash.derivedKey, 'hex');
  return check.length === stored.length && crypto.timingSafeEqual(check, stored);
}

function issueSignedToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: Date.now() + 12 * 60 * 60 * 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySignedToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const claims = token ? verifySignedToken(token) : null;
  if (!claims || claims.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized. Valid admin Bearer session required.' });
    return;
  }
  next();
}

function extractMemberId(req: Request): string | null {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const claims = token ? verifySignedToken(token) : null;
  if (claims && claims.role === 'member' && typeof claims.sub === 'string') {
    return claims.sub;
  }
  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+92|0)?3\d{9}$/.test(cleaned) || /^\+?\d{8,15}$/.test(cleaned);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function createServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    express.json({
      limit: '256kb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // --------------------------------------------------------------------------
  // PUBLIC HEALTH & BOOTSTRAP ROUTES
  // --------------------------------------------------------------------------
  app.get('/api/health', async (_req, res) => {
    try {
      const storage = await getStorageDiagnostics();
      res.json({ ok: true, storage });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Health check failed',
      });
    }
  });

  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load catalog',
      });
    }
  });

  // --------------------------------------------------------------------------
  // APP-MANAGED MEMBER ACCOUNT AUTH (/api/auth/*)
  // --------------------------------------------------------------------------
  app.post('/api/auth/register', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const health_goal = (
        typeof body.health_goal === 'string' ? body.health_goal : 'Daily Habit'
      ) as HealthGoal;

      if (full_name.length < 2) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Please enter a valid mobile/WhatsApp number.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      if (!HEALTH_GOALS.has(health_goal)) {
        res.status(400).json({ error: 'Please choose a valid wellness goal.' });
        return;
      }

      const user = await registerMemberAccount({
        full_name,
        email,
        phone,
        health_goal,
        password,
      });

      const token = issueSignedToken({ role: 'member', sub: user.id, email: user.email });
      res.status(201).json({ ok: true, token, user });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      res.status(msg.includes('already exists') ? 409 : 400).json({ error: msg });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!isValidEmail(email) || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const user = await authenticateMemberAccount(email, password);
      const token = issueSignedToken({ role: 'member', sub: user.id, email: user.email });
      res.json({ ok: true, token, user });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Invalid email or password.',
      });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const memberId = extractMemberId(req);
    if (!memberId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = await getMemberById(memberId);
    if (!user) {
      res.status(401).json({ error: 'Account no longer active' });
      return;
    }
    res.json({ ok: true, user });
  });

  // --------------------------------------------------------------------------
  // LEAD CAPTURE ROUTE
  // --------------------------------------------------------------------------
  app.post('/api/leads', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const health_goal = (
        typeof body.health_goal === 'string' ? body.health_goal : 'Daily Habit'
      ) as HealthGoal;

      if (full_name.length < 2) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Please enter a valid mobile number (e.g. 0300 1234567).' });
        return;
      }
      if (!HEALTH_GOALS.has(health_goal)) {
        res.status(400).json({ error: 'Please choose a valid health goal.' });
        return;
      }

      const lead = await upsertLead({ full_name, email, phone, health_goal });
      res.status(201).json({ ok: true, lead });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to save lead details',
      });
    }
  });

  // --------------------------------------------------------------------------
  // ON-SITE RESERVATION & CHECKOUT INITIATION (/api/checkout)
  // --------------------------------------------------------------------------
  app.post('/api/checkout', async (req, res) => {
    try {
      const memberId = extractMemberId(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const health_goal = (
        typeof body.health_goal === 'string' ? body.health_goal : 'Daily Habit'
      ) as HealthGoal;
      const plan_slug = (
        typeof body.plan_slug === 'string' ? body.plan_slug : 'early-bird'
      ) as PlanSlug;
      const delivery_address =
        typeof body.delivery_address === 'string' ? body.delivery_address.trim() : '';
      const city = typeof body.city === 'string' ? body.city.trim() : '';
      const payment_gateway = (
        typeof body.payment_gateway === 'string' ? body.payment_gateway : 'PayFast'
      ) as PaymentGateway;
      const payment_method = (
        typeof body.payment_method === 'string' ? body.payment_method : 'Card'
      ) as PaymentMethod;
      const sandbox_mode = body.sandbox_mode !== false;

      if (full_name.length < 2) {
        res.status(400).json({ error: 'Full name is required.' });
        return;
      }
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Valid email address is required.' });
        return;
      }
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Valid mobile number is required.' });
        return;
      }
      if (!HEALTH_GOALS.has(health_goal)) {
        res.status(400).json({ error: 'Invalid health goal selection.' });
        return;
      }
      if (!PLAN_SLUGS.has(plan_slug)) {
        res.status(400).json({ error: 'Selected membership plan is invalid.' });
        return;
      }
      if (delivery_address.length < 6 || city.length < 2) {
        res.status(400).json({ error: 'Complete street address and city are required.' });
        return;
      }
      if (!GATEWAYS.has(payment_gateway) || !PAYMENT_METHODS.has(payment_method)) {
        res.status(400).json({ error: 'Unsupported payment method selected.' });
        return;
      }

      const plan = await getPlanBySlug(plan_slug);
      if (!plan) {
        res.status(404).json({ error: 'Membership plan not found or inactive.' });
        return;
      }
      if (plan.slots_taken >= plan.total_slots) {
        res.status(409).json({ error: 'All slots for this batch have been claimed.' });
        return;
      }

      const lead = await upsertLead({ full_name, email, phone, health_goal });
      const subscription = await createPendingSubscription({
        lead_id: lead.id,
        member_id: memberId,
        plan_id: plan.id,
        delivery_address,
        city,
        payment_gateway,
        payment_method,
        amount_pkr: plan.price_pkr,
        is_sandbox: sandbox_mode,
      });

      await logPaymentEvent({
        subscription_id: subscription.id,
        gateway: payment_gateway,
        payment_method,
        event_type: 'checkout_initiated',
        status: 'info',
        amount_pkr: plan.price_pkr,
        is_sandbox: sandbox_mode,
        raw_payload: { plan_slug: plan.slug, city },
      });

      if (!sandbox_mode && !hasLiveGatewayCredentials(payment_gateway)) {
        const message = `${payment_gateway} live merchant credentials are not configured yet.`;
        await markSubscriptionFailed(subscription.id, null, message, {
          reason: 'LIVE_GATEWAY_KEYS_MISSING',
          gateway: payment_gateway,
        });
        res.status(422).json({
          error: message,
          code: 'LIVE_GATEWAY_KEYS_MISSING',
          subscription_id: subscription.id,
        });
        return;
      }

      const sessionToken = signCheckoutToken({
        subscription_id: subscription.id,
        plan_slug: plan.slug,
        amount_pkr: plan.price_pkr,
        gateway: payment_gateway,
        payment_method,
        is_sandbox: sandbox_mode,
      });

      const appUrl =
        process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;

      const liveParams = !sandbox_mode
        ? buildLiveGatewayParams({
            gateway: payment_gateway,
            subscriptionId: subscription.id,
            amountPkr: plan.price_pkr,
            customerEmail: lead.email,
            customerPhone: lead.phone,
            appUrl,
          })
        : undefined;

      res.status(201).json({
        ok: true,
        session: {
          subscription_id: subscription.id,
          plan_slug: plan.slug,
          plan_name: plan.name,
          amount_pkr: plan.price_pkr,
          gateway: payment_gateway,
          payment_method,
          is_sandbox: sandbox_mode,
          session_token: sessionToken,
          gateway_reference: `VR-${subscription.id.slice(0, 8).toUpperCase()}`,
          live_redirect_params: liveParams,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Checkout initialization failed',
      });
    }
  });

  app.post('/api/checkout/verify', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const session_token = typeof body.session_token === 'string' ? body.session_token.trim() : '';
      const outcome = body.outcome === 'failed' ? 'failed' : 'success';
      const account_reference =
        typeof body.account_reference === 'string' ? body.account_reference.trim() : '';
      const failure_reason =
        typeof body.failure_reason === 'string'
          ? body.failure_reason.trim()
          : 'Authorization declined';

      const claims = verifyCheckoutToken(session_token);
      if (!claims) {
        res.status(400).json({ error: 'Reservation session expired or invalid.' });
        return;
      }

      if (!claims.is_sandbox) {
        res.status(400).json({
          error: 'Live gateway transactions are confirmed via signed webhooks.',
        });
        return;
      }

      const txnId = `VR-RES-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      if (outcome === 'failed') {
        await markSubscriptionFailed(claims.subscription_id, txnId, failure_reason, {
          payment_method: claims.payment_method,
          account_reference: account_reference ? `***${account_reference.slice(-4)}` : null,
        });
        res.status(402).json({
          ok: false,
          error: failure_reason,
          gateway_txn_id: txnId,
          subscription_id: claims.subscription_id,
        });
        return;
      }

      const receipt = await reserveSlotOnPayment(claims.subscription_id, txnId);
      res.json({ ok: true, receipt });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reservation verification failed';
      if (message.includes('CAPACITY_REACHED')) {
        res.status(409).json({
          error: 'All slots in this batch were just claimed. Please join next week’s priority list.',
        });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  // --------------------------------------------------------------------------
  // GATEWAY WEBHOOKS (KEPT READY FOR LIVE KEYS)
  // --------------------------------------------------------------------------
  app.post('/api/webhooks/payfast', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const basketId = typeof body.basket_id === 'string' ? body.basket_id : '';
      const errCode = typeof body.err_code === 'string' ? body.err_code : '';
      const txnId = typeof body.transaction_id === 'string' ? body.transaction_id : `PF-${Date.now()}`;
      const validationHash = typeof body.validation_hash === 'string' ? body.validation_hash : '';

      if (!verifyPayFastWebhookSignature({ basket_id: basketId, err_code: errCode, validation_hash: validationHash })) {
        res.status(401).json({ error: 'Invalid PayFast signature' });
        return;
      }
      if (errCode !== '000') {
        await markSubscriptionFailed(basketId, txnId, `PayFast error ${errCode}`, body);
        res.json({ ok: false, recorded: true });
        return;
      }
      const receipt = await reserveSlotOnPayment(basketId, txnId);
      res.json({ ok: true, receipt });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'PayFast webhook error' });
    }
  });

  app.post('/api/webhooks/safepay', async (req, res) => {
    try {
      const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body ?? {});
      const sig = req.header('X-SFPY-SIGNATURE') || '';
      const body = (req.body ?? {}) as Record<string, unknown>;
      const data = (body.data ?? {}) as Record<string, unknown>;
      const subId = typeof data.order_id === 'string' ? data.order_id : '';
      const tracker = typeof data.tracker === 'string' ? data.tracker : `SP-${Date.now()}`;
      const state = typeof data.state === 'string' ? data.state : '';

      if (!verifySafepayWebhookSignature(rawBody, sig)) {
        res.status(401).json({ error: 'Invalid Safepay signature' });
        return;
      }
      if (state !== 'PAID') {
        await markSubscriptionFailed(subId, tracker, `Safepay state: ${state}`, data);
        res.json({ ok: false, recorded: true });
        return;
      }
      const receipt = await reserveSlotOnPayment(subId, tracker);
      res.json({ ok: true, receipt });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Safepay webhook error' });
    }
  });

  // --------------------------------------------------------------------------
  // ADMIN AUTH & FULL BRAND OPERATIONS (/api/admin/*)
  // --------------------------------------------------------------------------
  app.get('/api/admin/auth/status', (_req, res) => {
    const envPasscodeSet = Boolean(process.env.ADMIN_PASSCODE?.trim());
    res.json({
      configured: envPasscodeSet || Boolean(claimedAdminHash),
      source: envPasscodeSet ? 'env' : claimedAdminHash ? 'claimed' : 'unclaimed',
      username: ADMIN_USERNAME,
    });
  });

  app.post('/api/admin/auth/claim', (req, res) => {
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(409).json({
        error: 'Admin password is already configured in server secrets. Sign in directly.',
      });
      return;
    }
    if (claimedAdminHash) {
      res.status(409).json({ error: 'Admin password has already been claimed. Sign in instead.' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username.trim() : ADMIN_USERNAME;
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';

    if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
      res.status(400).json({ error: `Admin username must be "${ADMIN_USERNAME}".` });
      return;
    }
    if (passcode.length < 6) {
      res.status(400).json({ error: 'Choose an admin password of at least 6 characters.' });
      return;
    }

    claimedAdminHash = hashPassword(passcode);
    const token = issueSignedToken({ role: 'admin', username: ADMIN_USERNAME });
    res.status(201).json({ ok: true, token });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const envPasscodeSet = Boolean(process.env.ADMIN_PASSCODE?.trim());
    if (!envPasscodeSet && !claimedAdminHash) {
      res.status(428).json({ error: 'No admin password claimed yet. Complete first-run setup first.' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';

    if (
      username.toLowerCase() !== ADMIN_USERNAME.toLowerCase() ||
      !passcode ||
      !verifyPasswordAgainstEnvOrClaimed(passcode)
    ) {
      res.status(401).json({ error: 'Invalid admin username or password.' });
      return;
    }
    const token = issueSignedToken({ role: 'admin', username: ADMIN_USERNAME });
    res.json({ ok: true, token });
  });

  app.post('/api/admin/auth/change-password', requireAdmin, (req, res) => {
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(409).json({
        error:
          'Admin password is managed by the ADMIN_PASSCODE environment secret. Update it in Settings -> Secrets.',
      });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const nextPasscode = typeof body.new_passcode === 'string' ? body.new_passcode.trim() : '';
    if (nextPasscode.length < 6) {
      res.status(400).json({ error: 'New admin password must be at least 6 characters.' });
      return;
    }
    claimedAdminHash = hashPassword(nextPasscode);
    res.json({ ok: true });
  });

  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const overview = await getAdminOverview();
      res.json(overview);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to load admin overview',
      });
    }
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: {
        launch_mode?: LaunchMode;
        launch_date?: string;
        community_invite_link?: string;
        early_bird_total_slots?: number;
        early_bird_slots_taken?: number;
      } = {};

      if (typeof body.launch_mode === 'string') {
        if (!LAUNCH_MODES.has(body.launch_mode as LaunchMode)) {
          res.status(400).json({ error: 'Invalid launch_mode value.' });
          return;
        }
        patch.launch_mode = body.launch_mode as LaunchMode;
      }

      if (typeof body.launch_date === 'string') {
        const ts = Date.parse(body.launch_date);
        if (Number.isNaN(ts)) {
          res.status(400).json({ error: 'Invalid launch_date ISO timestamp.' });
          return;
        }
        patch.launch_date = new Date(ts).toISOString();
      }

      if (typeof body.community_invite_link === 'string') {
        const trimmed = body.community_invite_link.trim();
        if (!isValidHttpUrl(trimmed)) {
          res.status(400).json({ error: 'Community invite link must be a valid https:// or http:// URL.' });
          return;
        }
        patch.community_invite_link = trimmed;
      }

      if (typeof body.early_bird_total_slots === 'number' && Number.isInteger(body.early_bird_total_slots)) {
        patch.early_bird_total_slots = Math.max(1, body.early_bird_total_slots);
      }

      if (typeof body.early_bird_slots_taken === 'number' && Number.isInteger(body.early_bird_slots_taken)) {
        patch.early_bird_slots_taken = Math.max(0, body.early_bird_slots_taken);
      }

      const updated = await updateSiteSettings(patch);
      res.json({ ok: true, settings: updated });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update site settings',
      });
    }
  });

  app.patch('/api/admin/plans/:id', requireAdmin, async (req, res) => {
    try {
      const planId = req.params.id;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: {
        name?: string;
        billing_cycle?: string;
        price_pkr?: number;
        shots_per_delivery?: number;
        total_slots?: number;
        slots_taken?: number;
        is_active?: boolean;
        perks?: string[];
      } = {};

      if (typeof body.name === 'string' && body.name.trim().length >= 2) {
        patch.name = body.name.trim();
      }
      if (typeof body.billing_cycle === 'string' && body.billing_cycle.trim().length >= 2) {
        patch.billing_cycle = body.billing_cycle.trim();
      }
      if (typeof body.price_pkr === 'number' && Number.isInteger(body.price_pkr) && body.price_pkr >= 0) {
        patch.price_pkr = body.price_pkr;
      }
      if (
        typeof body.shots_per_delivery === 'number' &&
        Number.isInteger(body.shots_per_delivery) &&
        body.shots_per_delivery >= 1
      ) {
        patch.shots_per_delivery = body.shots_per_delivery;
      }
      if (typeof body.total_slots === 'number' && Number.isInteger(body.total_slots)) {
        if (body.total_slots < 1 || body.total_slots > 100000) {
          res.status(400).json({ error: 'total_slots must be between 1 and 100000.' });
          return;
        }
        patch.total_slots = body.total_slots;
      }
      if (typeof body.slots_taken === 'number' && Number.isInteger(body.slots_taken)) {
        if (body.slots_taken < 0 || body.slots_taken > 100000) {
          res.status(400).json({ error: 'slots_taken must be between 0 and 100000.' });
          return;
        }
        patch.slots_taken = body.slots_taken;
      }
      if (typeof body.is_active === 'boolean') {
        patch.is_active = body.is_active;
      }
      if (Array.isArray(body.perks)) {
        patch.perks = body.perks.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }

      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: 'No valid plan fields provided.' });
        return;
      }

      const plan = await updatePlanSlots(planId, patch);
      res.json({ ok: true, plan });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update plan',
      });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const category = (
        typeof body.category === 'string' ? body.category : 'Energy'
      ) as HealthGoal;
      const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';
      const botanicals = typeof body.botanicals === 'string' ? body.botanicals.trim() : '';
      const size_ml = typeof body.size_ml === 'number' ? body.size_ml : 60;
      const price_pkr = typeof body.price_pkr === 'number' ? body.price_pkr : 500;
      const is_active = body.is_active !== false;
      const image_url =
        typeof body.image_url === 'string' && body.image_url.trim()
          ? body.image_url.trim()
          : '/src/assets/images/ritual_craft_shots_1795507258606.jpg';

      if (name.length < 2 || tagline.length < 4 || botanicals.length < 4) {
        res.status(400).json({ error: 'Product name, tagline, and botanicals are required.' });
        return;
      }
      if (!HEALTH_GOALS.has(category)) {
        res.status(400).json({ error: 'Invalid product category.' });
        return;
      }
      if (!Number.isInteger(price_pkr) || price_pkr < 0 || !Number.isInteger(size_ml) || size_ml < 10) {
        res.status(400).json({ error: 'Valid price_pkr and size_ml are required.' });
        return;
      }
      if (!image_url.startsWith('/src/assets/images/') && !isValidHttpUrl(image_url)) {
        res.status(400).json({ error: 'Invalid product image URL.' });
        return;
      }

      const product = await createProduct({
        name,
        category,
        tagline,
        botanicals,
        size_ml,
        price_pkr,
        is_active,
        image_url,
      });
      res.status(201).json({ ok: true, product });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to create product',
      });
    }
  });

  app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      if (typeof body.name === 'string' && body.name.trim().length >= 2) patch.name = body.name.trim();
      if (typeof body.category === 'string' && HEALTH_GOALS.has(body.category as HealthGoal)) {
        patch.category = body.category;
      }
      if (typeof body.tagline === 'string' && body.tagline.trim().length >= 3) patch.tagline = body.tagline.trim();
      if (typeof body.botanicals === 'string' && body.botanicals.trim().length >= 3) {
        patch.botanicals = body.botanicals.trim();
      }
      if (typeof body.size_ml === 'number' && Number.isInteger(body.size_ml) && body.size_ml >= 10) {
        patch.size_ml = body.size_ml;
      }
      if (typeof body.price_pkr === 'number' && Number.isInteger(body.price_pkr) && body.price_pkr >= 0) {
        patch.price_pkr = body.price_pkr;
      }
      if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

      const product = await updateProduct(req.params.id, patch);
      res.json({ ok: true, product });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update product',
      });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      await deleteProduct(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to delete product',
      });
    }
  });

  app.patch('/api/admin/members/:id', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: {
        full_name?: string;
        phone?: string;
        health_goal?: HealthGoal;
        status?: 'active' | 'suspended';
      } = {};
      if (typeof body.full_name === 'string' && body.full_name.trim().length >= 2) {
        patch.full_name = body.full_name.trim();
      }
      if (typeof body.phone === 'string' && isValidPhone(body.phone)) {
        patch.phone = body.phone.trim();
      }
      if (typeof body.health_goal === 'string' && HEALTH_GOALS.has(body.health_goal as HealthGoal)) {
        patch.health_goal = body.health_goal as HealthGoal;
      }
      if (body.status === 'active' || body.status === 'suspended') {
        patch.status = body.status;
      }
      const member = await updateMemberAdmin(req.params.id, patch);
      res.json({ ok: true, member });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update member',
      });
    }
  });

  app.delete('/api/admin/members/:id', requireAdmin, async (req, res) => {
    try {
      await deleteMemberAdmin(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to delete member',
      });
    }
  });

  app.patch('/api/admin/subscriptions/:id', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: {
        status?: SubscriptionRecord['status'];
        payment_status?: SubscriptionRecord['payment_status'];
        next_dispatch_date?: string | null;
      } = {};

      if (typeof body.status === 'string' && SUB_STATUSES.has(body.status as SubscriptionRecord['status'])) {
        patch.status = body.status as SubscriptionRecord['status'];
      }
      if (
        typeof body.payment_status === 'string' &&
        PAY_STATUSES.has(body.payment_status as SubscriptionRecord['payment_status'])
      ) {
        patch.payment_status = body.payment_status as SubscriptionRecord['payment_status'];
      }
      if (typeof body.next_dispatch_date === 'string') {
        patch.next_dispatch_date = body.next_dispatch_date;
      }

      const subscription = await updateSubscriptionAdmin(req.params.id, patch);
      res.json({ ok: true, subscription });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update subscription',
      });
    }
  });

  app.post('/api/admin/events', requireAdmin, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const type = (typeof body.type === 'string' ? body.type : 'Community Meetup') as WellnessEvent['type'];
      const event_date = typeof body.event_date === 'string' ? body.event_date.trim() : '';
      const location = typeof body.location === 'string' ? body.location.trim() : '';
      const spots_available = typeof body.spots_available === 'number' ? body.spots_available : 15;
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const image_url =
        typeof body.image_url === 'string' && body.image_url.trim()
          ? body.image_url.trim()
          : '/src/assets/images/event_community_table_1795507259675.jpg';

      if (title.length < 3 || location.length < 3 || description.length < 10) {
        res.status(400).json({ error: 'Title, location, and description are required.' });
        return;
      }
      if (!EVENT_TYPES.has(type)) {
        res.status(400).json({ error: 'Invalid event type.' });
        return;
      }
      const parsedDate = Date.parse(event_date);
      if (Number.isNaN(parsedDate)) {
        res.status(400).json({ error: 'Valid event_date is required.' });
        return;
      }
      if (!Number.isInteger(spots_available) || spots_available < 0) {
        res.status(400).json({ error: 'spots_available must be a non-negative integer.' });
        return;
      }
      if (!image_url.startsWith('/src/assets/images/') && !isValidHttpUrl(image_url)) {
        res.status(400).json({ error: 'Invalid event image URL.' });
        return;
      }

      const event = await createEvent({
        title,
        type,
        event_date: new Date(parsedDate).toISOString(),
        location,
        spots_available,
        description,
        image_url,
      });
      res.status(201).json({ ok: true, event });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to create event',
      });
    }
  });

  app.patch('/api/admin/events/:id', requireAdmin, async (req, res) => {
    try {
      const eventId = req.params.id;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: Partial<Omit<WellnessEvent, 'id'>> = {};

      if (typeof body.title === 'string' && body.title.trim().length >= 3) patch.title = body.title.trim();
      if (typeof body.type === 'string' && EVENT_TYPES.has(body.type as WellnessEvent['type'])) {
        patch.type = body.type as WellnessEvent['type'];
      }
      if (typeof body.event_date === 'string' && !Number.isNaN(Date.parse(body.event_date))) {
        patch.event_date = new Date(Date.parse(body.event_date)).toISOString();
      }
      if (typeof body.location === 'string' && body.location.trim().length >= 3) {
        patch.location = body.location.trim();
      }
      if (typeof body.spots_available === 'number' && Number.isInteger(body.spots_available) && body.spots_available >= 0) {
        patch.spots_available = body.spots_available;
      }
      if (typeof body.description === 'string' && body.description.trim().length >= 10) {
        patch.description = body.description.trim();
      }
      if (
        typeof body.image_url === 'string' &&
        (body.image_url.trim().startsWith('/src/assets/images/') || isValidHttpUrl(body.image_url.trim()))
      ) {
        patch.image_url = body.image_url.trim();
      }

      const event = await updateEvent(eventId, patch);
      res.json({ ok: true, event });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to update event',
      });
    }
  });

  app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
    try {
      await deleteEvent(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to delete event',
      });
    }
  });

  app.get('/api/admin/dispatch-csv', requireAdmin, async (_req, res) => {
    try {
      const overview = await getAdminOverview();
      const sanitizeCsvCell = (val: unknown): string => {
        const raw = String(val ?? '').replace(/\r?\n/g, ' ');
        const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
      };

      const headers = [
        'Subscription ID',
        'Member Name',
        'Phone / WhatsApp',
        'Email',
        'Plan',
        'Shots Per Delivery',
        'City',
        'Delivery Address',
        'Payment Status',
        'Dispatch Status',
        'Next Dispatch Date',
      ];

      const paidOrReserved = overview.subscriptions.filter(
        (s) => s.payment_status === 'paid' || s.status === 'active' || s.status === 'reserved'
      );

      const rows = paidOrReserved.map((s) =>
        [
          s.id,
          s.lead_name || '',
          s.lead_phone || '',
          s.lead_email || '',
          s.plan_name || s.plan_slug || '',
          s.shots_per_delivery ?? '',
          s.city,
          s.delivery_address,
          s.payment_status,
          s.status,
          s.next_dispatch_date || '',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      );

      const csv = [headers.map(sanitizeCsvCell).join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="vana-ritual-dispatch-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to generate dispatch CSV',
      });
    }
  });

  // --------------------------------------------------------------------------
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC DIST
  // --------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Vana Ritual server listening on http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
