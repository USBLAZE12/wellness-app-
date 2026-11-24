import crypto from 'node:crypto';
import type { PaymentGateway, PaymentMethod, PlanSlug } from '../src/types/wellness.ts';

const EPHEMERAL_SIGNING_SECRET =
  process.env.SESSION_SIGNING_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

export interface SignedCheckoutClaims {
  subscription_id: string;
  plan_slug: PlanSlug;
  amount_pkr: number;
  gateway: PaymentGateway;
  payment_method: PaymentMethod;
  is_sandbox: boolean;
  exp: number;
}

export function signCheckoutToken(claims: Omit<SignedCheckoutClaims, 'exp'>): string {
  const payload: SignedCheckoutClaims = {
    ...claims,
    exp: Date.now() + 30 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', EPHEMERAL_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyCheckoutToken(token: string): SignedCheckoutClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto
    .createHmac('sha256', EPHEMERAL_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedCheckoutClaims;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasLiveGatewayCredentials(gateway: PaymentGateway): boolean {
  if (gateway === 'PayFast') {
    return Boolean(process.env.PAYFAST_MERCHANT_ID?.trim() && process.env.PAYFAST_SECURED_KEY?.trim());
  }
  if (gateway === 'Safepay') {
    return Boolean(process.env.SAFEPAY_API_KEY?.trim() && process.env.SAFEPAY_WEBHOOK_SECRET?.trim());
  }
  return Boolean(
    (process.env.PAYFAST_MERCHANT_ID?.trim() && process.env.PAYFAST_SECURED_KEY?.trim()) ||
      process.env.SAFEPAY_API_KEY?.trim()
  );
}

export function buildLiveGatewayParams(params: {
  gateway: PaymentGateway;
  subscriptionId: string;
  amountPkr: number;
  customerEmail: string;
  customerPhone: string;
  appUrl: string;
}): Record<string, string> {
  if (params.gateway === 'PayFast') {
    const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim() || '';
    const securedKey = process.env.PAYFAST_SECURED_KEY?.trim() || '';
    const basketId = params.subscriptionId;
    const rawString = `${merchantId}${securedKey}${basketId}${params.amountPkr}PKR`;
    const signature = crypto.createHash('md5').update(rawString).digest('hex');

    return {
      MERCHANT_ID: merchantId,
      BASKET_ID: basketId,
      TXNAMT: String(params.amountPkr),
      CURRENCY_CODE: 'PKR',
      CUSTOMER_EMAIL_ADDRESS: params.customerEmail,
      CUSTOMER_MOBILE_NO: params.customerPhone,
      SUCCESS_URL: `${params.appUrl}/?checkout_status=success&sub_id=${basketId}`,
      FAILURE_URL: `${params.appUrl}/?checkout_status=failed&sub_id=${basketId}`,
      CHECKOUT_URL: `${params.appUrl}/api/webhooks/payfast`,
      SIGNATURE: signature,
    };
  }

  return {
    environment: 'production',
    order_id: params.subscriptionId,
    amount: String(params.amountPkr * 100),
    currency: 'PKR',
    redirect_url: `${params.appUrl}/?checkout_status=success&sub_id=${params.subscriptionId}`,
    cancel_url: `${params.appUrl}/?checkout_status=failed&sub_id=${params.subscriptionId}`,
    webhook_url: `${params.appUrl}/api/webhooks/safepay`,
  };
}

export function verifyPayFastWebhookSignature(payload: {
  basket_id: string;
  err_code: string;
  validation_hash: string;
}): boolean {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const securedKey = process.env.PAYFAST_SECURED_KEY?.trim();
  if (!merchantId || !securedKey || !payload.validation_hash) return false;

  const expected = crypto
    .createHash('sha256')
    .update(`${payload.basket_id}|${securedKey}|${merchantId}|${payload.err_code}`)
    .digest('hex');

  const a = Buffer.from(payload.validation_hash.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifySafepayWebhookSignature(rawBody: string, headerSig: string): boolean {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !headerSig) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(headerSig.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
