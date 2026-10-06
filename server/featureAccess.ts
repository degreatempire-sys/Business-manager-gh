import { Response, NextFunction } from 'express';
import { db } from './db.js';

export type SubscriptionPlan = 'free' | 'starter' | 'business';

export type FeatureKey =
  // FREE tier (GH₵0/mo)
  | 'pos'
  | 'products'
  | 'dashboard'
  | 'whatsapp_receipts'
  | 'expenses'
  | 'notifications'
  | 'settings'
  // STARTER tier (GH₵49/mo)
  | 'customers'
  | 'debtors'
  | 'suppliers'
  | 'purchases'
  | 'financial_reports'
  | 'debt_reminders'
  | 'loyalty'
  | 'governance'
  // BUSINESS tier (GH₵99/mo)
  | 'invoices'
  | 'quotations'
  | 'priority_support'
  | 'audit_logs'
  | 'locations'
  | 'integrations';

export const PLAN_RANKS: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  business: 2,
};

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlan, string> = {
  free: 'Free Plan',
  starter: 'Starter Plan',
  business: 'Business Plan',
};

export const PLAN_PRICES_GHS: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 49,
  business: 99,
};

export interface PlanEntitlements {
  maxStaff: number;
  maxLocations: number;
  maxProducts: number;
  maxCustomers: number;
  maxMonthlyTransactions: number;
  financialReporting: boolean;
  forecasting: boolean;
  workflowAutomation: boolean;
  communications: boolean;
  loyalty: boolean;
  integrations: boolean;
  multiLocation: boolean;
  governance: boolean;
  prioritySupport: boolean;
}

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, PlanEntitlements> = {
  free: {
    maxStaff: 2,
    maxLocations: 1,
    maxProducts: 50,
    maxCustomers: 100,
    maxMonthlyTransactions: 200,
    financialReporting: false,
    forecasting: false,
    workflowAutomation: false,
    communications: false,
    loyalty: false,
    integrations: false,
    multiLocation: false,
    governance: false,
    prioritySupport: false,
  },
  starter: {
    maxStaff: 5,
    maxLocations: 1,
    maxProducts: 1000,
    maxCustomers: 2000,
    maxMonthlyTransactions: 5000,
    financialReporting: true,
    forecasting: false,
    workflowAutomation: false,
    communications: true,
    loyalty: true,
    integrations: false,
    multiLocation: false,
    governance: true,
    prioritySupport: false,
  },
  business: {
    maxStaff: 50,
    maxLocations: 20,
    maxProducts: 50000,
    maxCustomers: 100000,
    maxMonthlyTransactions: 500000,
    financialReporting: true,
    forecasting: true,
    workflowAutomation: true,
    communications: true,
    loyalty: true,
    integrations: true,
    multiLocation: true,
    governance: true,
    prioritySupport: true,
  },
};

export const FEATURE_REQUIRED_PLAN: Record<FeatureKey, SubscriptionPlan> = {
  // Free Features
  pos: 'free',
  products: 'free',
  dashboard: 'free',
  whatsapp_receipts: 'free',
  expenses: 'free',
  notifications: 'free',
  settings: 'free',

  // Starter Features
  customers: 'starter',
  debtors: 'starter',
  suppliers: 'starter',
  purchases: 'starter',
  financial_reports: 'starter',
  debt_reminders: 'starter',
  loyalty: 'starter',
  governance: 'starter',

  // Business Features
  invoices: 'business',
  quotations: 'business',
  priority_support: 'business',
  audit_logs: 'business',
  locations: 'business',
  integrations: 'business',
};

export function normalizePlan(rawPlan?: string | null): SubscriptionPlan {
  if (!rawPlan) return 'free';
  const clean = rawPlan.toLowerCase().trim();
  if (clean === 'business') return 'business';
  if (clean === 'starter') return 'starter';
  return 'free';
}

export function getEffectivePlan(
  subscription?: {
    plan?: string;
    status?: string;
    expiresAt?: string;
    nextBillingDate?: string;
    trialEnd?: string;
    gracePeriodEnd?: string;
  } | null,
  business?: { plan?: string } | null
): SubscriptionPlan {
  const planCandidate = normalizePlan(subscription?.plan || business?.plan);
  if (planCandidate === 'free') return 'free';

  const rawStatus = (subscription?.status || 'active').toUpperCase().trim();

  // Active or explicitly permitted statuses
  const now = Date.now();

  // 1. Check if trialing
  if (rawStatus === 'TRIALING') {
    if (subscription?.trialEnd) {
      const trialEndTime = new Date(subscription.trialEnd).getTime();
      if (!isNaN(trialEndTime) && trialEndTime < now) {
        return 'free'; // Trial expired
      }
    }
    return planCandidate; // Valid trial
  }

  // 2. Check if grace period
  if (rawStatus === 'GRACE_PERIOD') {
    if (subscription?.gracePeriodEnd) {
      const graceEndTime = new Date(subscription.gracePeriodEnd).getTime();
      if (!isNaN(graceEndTime) && graceEndTime < now) {
        return 'free'; // Grace period ended
      }
    }
    return planCandidate; // Retain during grace period
  }

  // 3. Normal active check
  if (rawStatus !== 'ACTIVE') {
    return 'free';
  }

  const expiry = subscription?.expiresAt || subscription?.nextBillingDate;
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (!isNaN(expiryTime) && expiryTime < now && rawStatus !== 'ACTIVE') {
      return 'free';
    }
  }

  return planCandidate;
}

export function canAccessFeature(
  subscription?: any,
  feature?: FeatureKey | null,
  isMasterAdmin: boolean = false,
  business?: any
): boolean {
  if (isMasterAdmin) return true;
  if (!feature) return true;

  const requiredPlan = FEATURE_REQUIRED_PLAN[feature] || 'free';
  if (requiredPlan === 'free') return true;

  const effectivePlan = getEffectivePlan(subscription, business);
  return PLAN_RANKS[effectivePlan] >= PLAN_RANKS[requiredPlan];
}

/**
 * Express middleware to enforce subscription plan restrictions on protected endpoints.
 * Master Admin is always unrestricted.
 */
export function requireFeature(feature: FeatureKey) {
  return (req: any, res: Response, next: NextFunction) => {
    // 1. Check Master Admin - always allowed
    const isMasterAdmin =
      Boolean(req.user) &&
      (req.user.role === 'admin' ||
        req.user.role === 'master_admin' ||
        req.user.id === 'usr_admin_master' ||
        req.user.email?.toLowerCase() === 'admin@businessmanagergh.com');

    if (isMasterAdmin) {
      return next();
    }

    const requiredPlan = FEATURE_REQUIRED_PLAN[feature] || 'free';
    if (requiredPlan === 'free') {
      return next();
    }

    // 2. Business must be identified
    if (!req.businessId) {
      return res.status(403).json({
        error: 'Business account required to access this feature.',
        code: 'BUSINESS_REQUIRED',
      });
    }

    // 3. Load business subscription from database
    const sub = db.getSubscription(req.businessId);
    const raw = db.getRaw();
    const biz = raw.businesses.find((b) => b.id === req.businessId);

    const effectivePlan = getEffectivePlan(sub, biz);

    if (PLAN_RANKS[effectivePlan] < PLAN_RANKS[requiredPlan]) {
      const requiredPlanName = PLAN_DISPLAY_NAMES[requiredPlan];
      const currentPlanName = PLAN_DISPLAY_NAMES[effectivePlan];
      const price = PLAN_PRICES_GHS[requiredPlan];

      return res.status(403).json({
        error: `This feature requires the ${requiredPlanName} (GH₵${price}/month). Your business is currently on the ${currentPlanName}.`,
        code: 'FEATURE_LOCKED',
        feature,
        requiredPlan,
        currentPlan: effectivePlan,
        upgradeRequired: true,
      });
    }

    next();
  };
}

export function calculateBusinessUsage(businessId: string) {
  const raw = db.getRaw();
  const sub = db.getSubscription(businessId);
  const biz = raw.businesses.find((b) => b.id === businessId);
  const effectivePlan = getEffectivePlan(sub, biz);
  const entitlements = PLAN_ENTITLEMENTS[effectivePlan] || PLAN_ENTITLEMENTS.free;

  const staffCount = raw.users.filter(
    (u) => u.businessId === businessId && u.role === 'staff' && (u.status || 'Active') === 'Active'
  ).length;

  const locationCount = (raw.locations || []).filter(
    (l) => l.businessId === businessId && l.status === 'ACTIVE'
  ).length || 1;

  const productCount = (raw.products || []).filter((p) => p.businessId === businessId).length;

  const customerCount = (raw.customers || []).filter((c) => c.businessId === businessId).length;

  // Monthly transaction count using Accra month
  const nowAccraMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactionCount = (raw.sales || []).filter(
    (s) => s.businessId === businessId && ((s as any).date || s.createdAt || '').slice(0, 7) === nowAccraMonth
  ).length;

  return {
    businessId,
    plan: sub?.plan || biz?.plan || 'free',
    effectivePlan,
    status: sub?.status || 'active',
    staffCount,
    maxStaff: entitlements.maxStaff,
    locationCount,
    maxLocations: entitlements.maxLocations,
    productCount,
    maxProducts: entitlements.maxProducts,
    customerCount,
    maxCustomers: entitlements.maxCustomers,
    monthlyTransactionCount,
    maxMonthlyTransactions: entitlements.maxMonthlyTransactions,
    limitsReached: {
      staff: staffCount >= entitlements.maxStaff,
      locations: locationCount >= entitlements.maxLocations,
      products: productCount >= entitlements.maxProducts,
      customers: customerCount >= entitlements.maxCustomers,
      transactions: monthlyTransactionCount >= entitlements.maxMonthlyTransactions,
    },
  };
}

export function checkResourceLimit(
  businessId: string,
  resource: 'staff' | 'locations' | 'products' | 'customers' | 'transactions',
  isMasterAdmin: boolean = false
): { allowed: boolean; error?: string; current: number; max: number } {
  if (isMasterAdmin) return { allowed: true, current: 0, max: Infinity };

  const usage = calculateBusinessUsage(businessId);
  switch (resource) {
    case 'staff':
      if (usage.staffCount >= usage.maxStaff) {
        return {
          allowed: false,
          error: `Staff limit reached (${usage.staffCount}/${usage.maxStaff}). Please upgrade your subscription plan to add more staff members.`,
          current: usage.staffCount,
          max: usage.maxStaff,
        };
      }
      return { allowed: true, current: usage.staffCount, max: usage.maxStaff };

    case 'locations':
      if (usage.locationCount >= usage.maxLocations) {
        return {
          allowed: false,
          error: `Branch location limit reached (${usage.locationCount}/${usage.maxLocations}). Please upgrade to the Business plan to add more locations.`,
          current: usage.locationCount,
          max: usage.maxLocations,
        };
      }
      return { allowed: true, current: usage.locationCount, max: usage.maxLocations };

    case 'products':
      if (usage.productCount >= usage.maxProducts) {
        return {
          allowed: false,
          error: `Product catalog limit reached (${usage.productCount}/${usage.maxProducts}). Please upgrade your plan to add more items.`,
          current: usage.productCount,
          max: usage.maxProducts,
        };
      }
      return { allowed: true, current: usage.productCount, max: usage.maxProducts };

    case 'customers':
      if (usage.customerCount >= usage.maxCustomers) {
        return {
          allowed: false,
          error: `Customer limit reached (${usage.customerCount}/${usage.maxCustomers}). Please upgrade your plan.`,
          current: usage.customerCount,
          max: usage.maxCustomers,
        };
      }
      return { allowed: true, current: usage.customerCount, max: usage.maxCustomers };

    case 'transactions':
      if (usage.monthlyTransactionCount >= usage.maxMonthlyTransactions) {
        return {
          allowed: false,
          error: `Monthly transaction limit reached (${usage.monthlyTransactionCount}/${usage.maxMonthlyTransactions}). Please upgrade your plan to process more sales this month.`,
          current: usage.monthlyTransactionCount,
          max: usage.maxMonthlyTransactions,
        };
      }
      return { allowed: true, current: usage.monthlyTransactionCount, max: usage.maxMonthlyTransactions };
  }
}

/**
 * Authoritative check for financial report and profit visibility.
 * Admin, Master Admin, and Business Owner always have access.
 * Staff users must have explicit permissions.financial_reports === true.
 */
export function canUserViewProfit(user: any): boolean {
  if (!user) return false;
  if (
    user.role === 'admin' ||
    user.role === 'master_admin' ||
    user.id === 'usr_admin_master' ||
    user.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
    user.role === 'business_owner'
  ) {
    return true;
  }
  if (user.role === 'staff' && user.permissions?.financial_reports === true) {
    return true;
  }
  return false;
}

