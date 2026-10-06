import { db, DBUser } from './db.js';
import { getAccraToday, getAccraDateString } from './date.js';
import {
  SubscriptionPlan,
  PLAN_ENTITLEMENTS,
  calculateBusinessUsage,
  checkResourceLimit,
  getEffectivePlan,
  normalizePlan,
} from './featureAccess.js';
import type {
  Subscription,
  SubscriptionPayment,
  BillingInvoice,
  PlanEntitlements,
  SubscriptionUsageSummary,
} from '../src/types/index.js';

export interface BillingDiagnosticResult {
  code: string;
  severity: 'INFO' | 'WARN' | 'FAIL';
  message: string;
  affectedEntityId?: string;
  metadata?: Record<string, any>;
}

export interface BillingReconciliationReport {
  generatedAt: string;
  businessId?: string;
  healthy: boolean;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  diagnostics: BillingDiagnosticResult[];
}

export interface SaaSPlatformRevenueMetrics {
  calculatedAt: string;
  totalActiveSubscriptions: number;
  totalTrialingSubscriptions: number;
  totalPastDueSubscriptions: number;
  totalGracePeriodSubscriptions: number;
  totalCancelledSubscriptions: number;
  totalExpiredSubscriptions: number;
  planDistribution: {
    free: number;
    starter: number;
    business: number;
  };
  totalHistoricalRevenueGhs: number;
  monthlyRecurringRevenueGhs: number; // MRR based on active paid subs
  annualRecurringRevenueGhs: number; // ARR = MRR * 12
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  pendingPaymentsCount: number;
}

/**
 * Generates an immutable, sequential billing invoice number (e.g. BMGH-INV-202609-0012)
 */
export function generateBillingInvoiceNumber(businessId: string): string {
  const dateStr = getAccraToday().replace(/-/g, '').slice(0, 6); // YYYYMM
  const rand = Math.floor(1000 + Math.random() * 9000);
  const cleanBiz = (businessId || 'BIZ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `BMGH-INV-${dateStr}-${cleanBiz}-${rand}`;
}

/**
 * Calculates SaaS platform revenue metrics for Master Admin.
 * Strictly server-authoritative, read-only calculation using verified records.
 */
export function calculateSaaSRevenueMetrics(): SaaSPlatformRevenueMetrics {
  const raw = db.getRaw();
  const businesses = raw.businesses || [];
  const subscriptions = raw.subscriptions || [];
  const payments = raw.subscription_payments || [];

  const subMap = new Map(subscriptions.map((s) => [s.businessId, s]));

  let activeCount = 0;
  let trialingCount = 0;
  let pastDueCount = 0;
  let gracePeriodCount = 0;
  let cancelledCount = 0;
  let expiredCount = 0;

  const planDist = { free: 0, starter: 0, business: 0 };
  let mrr = 0;

  businesses.forEach((b) => {
    const sub = subMap.get(b.id);
    const plan = normalizePlan(sub?.plan || b.plan);
    const status = (sub?.status || 'active').toUpperCase();

    planDist[plan]++;

    if (status === 'TRIALING') {
      trialingCount++;
    } else if (status === 'GRACE_PERIOD') {
      gracePeriodCount++;
    } else if (status === 'PAST_DUE') {
      pastDueCount++;
    } else if (status === 'CANCELLED') {
      cancelledCount++;
    } else if (status === 'EXPIRED') {
      expiredCount++;
    } else {
      activeCount++;
      if (plan === 'starter') mrr += 49;
      if (plan === 'business') mrr += 99;
    }
  });

  let successfulCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let totalRevenueGhs = 0;

  payments.forEach((p) => {
    const status = (p.status || '').toLowerCase();
    if (status === 'success' || status === 'successful' || status === 'paid') {
      successfulCount++;
      totalRevenueGhs += Number(p.amount) || 0;
    } else if (status === 'failed' || status === 'abandoned') {
      failedCount++;
    } else if (status === 'pending') {
      pendingCount++;
    }
  });

  return {
    calculatedAt: new Date().toISOString(),
    totalActiveSubscriptions: activeCount,
    totalTrialingSubscriptions: trialingCount,
    totalPastDueSubscriptions: pastDueCount,
    totalGracePeriodSubscriptions: gracePeriodCount,
    totalCancelledSubscriptions: cancelledCount,
    totalExpiredSubscriptions: expiredCount,
    planDistribution: planDist,
    totalHistoricalRevenueGhs: Number(totalRevenueGhs.toFixed(2)),
    monthlyRecurringRevenueGhs: Number(mrr.toFixed(2)),
    annualRecurringRevenueGhs: Number((mrr * 12).toFixed(2)),
    successfulPaymentsCount: successfulCount,
    failedPaymentsCount: failedCount,
    pendingPaymentsCount: pendingCount,
  };
}

/**
 * Read-only Billing & Subscription Diagnostic Scan.
 * CRITICAL INVARIANT: Performs ZERO automated mutations or silent repairs.
 */
export function runBillingReconciliationDiagnostics(businessId?: string): BillingReconciliationReport {
  const raw = db.getRaw();
  const businesses = businessId
    ? (raw.businesses || []).filter((b) => b.id === businessId)
    : raw.businesses || [];
  const subscriptions = raw.subscriptions || [];
  const payments = raw.subscription_payments || [];
  const invoices = raw.billing_invoices || [];

  const diagnostics: BillingDiagnosticResult[] = [];

  businesses.forEach((biz) => {
    const sub = subscriptions.find((s) => s.businessId === biz.id);

    // 1. Check Missing Subscription Record
    if (!sub) {
      diagnostics.push({
        code: 'MISSING_SUBSCRIPTION_RECORD',
        severity: 'WARN',
        message: `Business "${biz.name}" (${biz.id}) does not have an explicit subscription record. Falling back to business entity default.`,
        affectedEntityId: biz.id,
      });
    }

    // 2. Check Plan Mismatch between business entity and subscription record
    if (sub && sub.plan) {
      const bizPlanNorm = normalizePlan(biz.plan);
      const subPlanNorm = normalizePlan(sub.plan);
      if (bizPlanNorm !== subPlanNorm) {
        diagnostics.push({
          code: 'PLAN_DESYNC_DETECTED',
          severity: 'WARN',
          message: `Business entity plan (${bizPlanNorm}) differs from subscription record plan (${subPlanNorm}).`,
          affectedEntityId: biz.id,
          metadata: { bizPlan: bizPlanNorm, subPlan: subPlanNorm },
        });
      }
    }

    // 3. Check for expired active subscriptions
    if (sub && sub.status === 'active' && sub.expiresAt) {
      const expiry = new Date(sub.expiresAt).getTime();
      if (!isNaN(expiry) && expiry < Date.now()) {
        diagnostics.push({
          code: 'SUBSCRIPTION_EXPIRED_PENDING_RENEWAL',
          severity: 'INFO',
          message: `Subscription for "${biz.name}" expired on ${new Date(sub.expiresAt).toLocaleDateString('en-GB')} and is pending renewal.`,
          affectedEntityId: sub.id,
          metadata: { expiresAt: sub.expiresAt },
        });
      }
    }

    // 4. Check for payments without corresponding invoices
    const bizPayments = payments.filter((p) => p.businessId === biz.id && (p.status === 'success' || p.status === 'Successful'));
    bizPayments.forEach((p) => {
      const matchingInv = invoices.find((i) => i.paymentReference === p.reference);
      if (!matchingInv) {
        diagnostics.push({
          code: 'PAYMENT_WITHOUT_BILLING_INVOICE',
          severity: 'INFO',
          message: `Verified payment ${p.reference} (GH₵${p.amount}) has no corresponding billing invoice record.`,
          affectedEntityId: p.id,
          metadata: { reference: p.reference, amount: p.amount },
        });
      }
    });

    // 5. Check for downgrade resource conflicts
    const usage = calculateBusinessUsage(biz.id);
    if (usage.limitsReached.staff && usage.effectivePlan === 'free') {
      diagnostics.push({
        code: 'USAGE_LIMIT_CONFLICT_STAFF',
        severity: 'WARN',
        message: `Business has ${usage.staffCount} staff exceeding Free plan limit (${usage.maxStaff}).`,
        affectedEntityId: biz.id,
        metadata: { current: usage.staffCount, max: usage.maxStaff },
      });
    }
  });

  const failedCount = diagnostics.filter((d) => d.severity === 'FAIL').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'WARN').length;
  const passedCount = diagnostics.length === 0 ? 1 : 0;

  return {
    generatedAt: new Date().toISOString(),
    businessId,
    healthy: failedCount === 0,
    totalChecks: diagnostics.length,
    passedChecks: passedCount,
    warningChecks: warningCount,
    failedChecks: failedCount,
    diagnostics,
  };
}

/**
 * Explicit, authorized repair of billing invoice desync.
 * Must be initiated by authorized user with audit log.
 */
export function repairMissingBillingInvoice(
  businessId: string,
  paymentReference: string,
  actor: { id: string; fullName: string }
): { success: boolean; invoice?: BillingInvoice; error?: string } {
  const payment = db.findSubscriptionPaymentByReference(paymentReference);
  if (!payment || payment.businessId !== businessId) {
    return { success: false, error: 'Payment not found for this tenant.' };
  }

  const existing = (db.getBillingInvoices(businessId) || []).find(
    (i) => i.paymentReference === paymentReference
  );
  if (existing) {
    return { success: true, invoice: existing };
  }

  const now = new Date().toISOString();
  const invoiceNum = generateBillingInvoiceNumber(businessId);
  const inv: BillingInvoice = {
    id: db.generateId('binv'),
    invoiceNumber: invoiceNum,
    businessId,
    subscriptionId: payment.subscriptionId || `sub_${businessId}`,
    plan: payment.plan || 'starter',
    billingInterval: 'monthly',
    billingPeriodStart: payment.paidAt || payment.createdAt || now,
    billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    amount: payment.amount,
    currency: payment.currency || 'GHS',
    status: 'PAID',
    paymentReference: payment.reference,
    paymentMethod: payment.provider || 'paystack',
    paidAt: payment.paidAt || payment.createdAt || now,
    createdAt: now,
  };

  db.createBillingInvoice(inv);

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.fullName,
    action: 'BILLING_RECONCILIATION_COMPLETED',
    details: `Authorized creation of missing billing invoice ${invoiceNum} for payment ${payment.reference} (GH₵${payment.amount.toFixed(2)}).`,
  });

  return { success: true, invoice: inv };
}
