import crypto from 'crypto';

export interface PlanConfig {
  planId: 'starter' | 'business';
  name: string;
  priceGhs: number;
  amountInPesewas: number;
  currency: string;
  interval: string;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    planId: 'starter',
    name: 'Starter Plan',
    priceGhs: 49,
    amountInPesewas: 4900, // GH₵49.00 in pesewas
    currency: 'GHS',
    interval: 'monthly',
  },
  business: {
    planId: 'business',
    name: 'Business Plan',
    priceGhs: 99,
    amountInPesewas: 9900, // GH₵99.00 in pesewas
    currency: 'GHS',
    interval: 'monthly',
  },
};

export function getPlanConfig(plan: string): PlanConfig | null {
  const normalized = plan.toLowerCase().trim();
  return PLAN_CONFIGS[normalized] || null;
}

/**
 * Returns the Paystack secret key from environment or throws a safe configuration error.
 * Key must NEVER be logged, exposed to client, or stored in database.
 */
export function getPaystackSecretKey(): string {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    throw new Error(
      'PAYSTACK_CONFIGURATION_ERROR: PAYSTACK_SECRET_KEY is not configured in server environment variables. Please set PAYSTACK_SECRET_KEY in server environment settings.'
    );
  }
  return secretKey.trim();
}

/**
 * Checks if Paystack is configured without throwing
 */
export function isPaystackConfigured(): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(key && key.trim().length > 0);
}

export interface InitializePaystackParams {
  email: string;
  amountInPesewas: number;
  currency: string;
  reference: string;
  callbackUrl?: string;
  metadata: {
    businessId: string;
    userId: string;
    subscriptionId?: string;
    plan: string;
    internalPaymentId: string;
    [key: string]: any;
  };
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // 'success', 'failed', 'abandoned'
    reference: string;
    amount: number; // in pesewas
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string; // 'GHS'
    ip_address: string;
    metadata: any;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      risk_action: string;
    };
    [key: string]: any;
  };
}

/**
 * Initializes a transaction with Paystack API (Test Mode).
 * Amount must be in pesewas (100 pesewas = 1 GHS).
 */
export async function initializePaystackTransaction(
  params: InitializePaystackParams
): Promise<PaystackInitResponse> {
  const secretKey = getPaystackSecretKey();

  const payload = {
    email: params.email,
    amount: params.amountInPesewas,
    currency: params.currency || 'GHS',
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  };

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as PaystackInitResponse;

  console.log(
    `[Paystack Init] HTTP Status: ${response.status}, Success: ${Boolean(data?.status)}, Reference: ${params.reference}`
  );

  if (!response.ok || !data.status) {
    const errorMsg = data.message || `Paystack initialization failed with status ${response.status}`;
    console.error(`[Paystack Init Error] HTTP ${response.status}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Verifies a transaction with Paystack API by reference.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const secretKey = getPaystackSecretKey();

  if (!reference || !reference.trim()) {
    throw new Error('Transaction reference is required for Paystack verification.');
  }

  const encodedRef = encodeURIComponent(reference.trim());
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodedRef}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
    },
  });

  const data = (await response.json()) as PaystackVerifyResponse;

  console.log(
    `[Paystack Verify] Reference: ${reference}, HTTP Status: ${response.status}, Gateway Status: ${data?.data?.status || 'unknown'}`
  );

  if (!response.ok || !data.status) {
    const errorMsg = data.message || `Paystack verification failed with status ${response.status}`;
    console.error(`[Paystack Verify Error] HTTP ${response.status}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Generates a clean, unique Paystack transaction reference for Ghana merchants (BMGH-SUB- format).
 */
export function generatePaystackReference(businessId: string): string {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const cleanBiz = (businessId || 'BIZ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  return `BMGH-SUB-${cleanBiz}-${timestamp}-${randomHex}`;
}
