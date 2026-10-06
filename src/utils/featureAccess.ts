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

export interface FeatureMetadata {
  key: FeatureKey;
  name: string;
  description: string;
  requiredPlan: SubscriptionPlan;
  highlights: string[];
}

export const FEATURE_METADATA: Record<FeatureKey, FeatureMetadata> = {
  pos: {
    key: 'pos',
    name: 'Sales / Point of Sale',
    description: 'Fast checkout and digital receipts',
    requiredPlan: 'free',
    highlights: ['Fast POS checkout', 'Receipt printing & WhatsApp sharing', 'Multi-item carts'],
  },
  products: {
    key: 'products',
    name: 'Products & Stock',
    description: 'Manage shop products and inventory levels',
    requiredPlan: 'free',
    highlights: ['Product catalog', 'Pricing & cost tracking', 'Stock level tracking'],
  },
  dashboard: {
    key: 'dashboard',
    name: 'Business Dashboard',
    description: 'Overview of daily sales, profit, and alerts',
    requiredPlan: 'free',
    highlights: ['Today sales summary', 'Low stock alerts', 'Top selling items'],
  },
  whatsapp_receipts: {
    key: 'whatsapp_receipts',
    name: 'WhatsApp Receipts',
    description: 'Direct receipts sent to customer WhatsApp',
    requiredPlan: 'free',
    highlights: ['One-click WhatsApp sharing', 'Digital receipt layout'],
  },
  expenses: {
    key: 'expenses',
    name: 'Expense Tracking',
    description: 'Track operational expenses and shop overheads',
    requiredPlan: 'free',
    highlights: ['Categorized expenses', 'Daily expense breakdown'],
  },
  notifications: {
    key: 'notifications',
    name: 'System Notifications',
    description: 'Stay updated on stock and transactions',
    requiredPlan: 'free',
    highlights: ['Low stock warnings', 'Payment confirmations'],
  },
  settings: {
    key: 'settings',
    name: 'Settings',
    description: 'Shop profile and subscription management',
    requiredPlan: 'free',
    highlights: ['Business profile', 'Receipt customization', 'Subscription management'],
  },

  // Starter Plan Features
  customers: {
    key: 'customers',
    name: 'Customer Management',
    description: 'Maintain customer directories, contact books, and purchase history',
    requiredPlan: 'starter',
    highlights: [
      'Customer directory with contact numbers',
      'Credit limit tracking & spending history',
      'Linked customer sales and receipts',
    ],
  },
  debtors: {
    key: 'debtors',
    name: 'Debtors & Debt Tracking',
    description: 'Track outstanding customer balances, payment records, and debt recovery',
    requiredPlan: 'starter',
    highlights: [
      'Live ledger of all outstanding customer debts',
      'Payment collection receipts with balance updates',
      'Track aging debts and credit limits',
    ],
  },
  suppliers: {
    key: 'suppliers',
    name: 'Suppliers & Vendors',
    description: 'Manage supplier contacts, restock accounts, and supply logs',
    requiredPlan: 'starter',
    highlights: [
      'Comprehensive supplier contact directory',
      'Order history and vendor balance records',
      'Direct contact integration',
    ],
  },
  purchases: {
    key: 'purchases',
    name: 'Purchases (Stock-In)',
    description: 'Record wholesale restocks, cost tracking, and stock-in history',
    requiredPlan: 'starter',
    highlights: [
      'Automated inventory restock increments',
      'Cost-of-goods-sold and purchase ledgers',
      'Link restocks to registered suppliers',
    ],
  },
  financial_reports: {
    key: 'financial_reports',
    name: 'Financial Reports & P&L',
    description: 'Deep profit & loss analytics, revenue trends, and financial health summaries',
    requiredPlan: 'starter',
    highlights: [
      'Real-time Profit & Loss (P&L) statements',
      'Gross profit and net margin calculations',
      'Custom date filtering and performance trends',
    ],
  },
  debt_reminders: {
    key: 'debt_reminders',
    name: 'Debt Reminders via WhatsApp',
    description: 'One-click polite debt payment reminders sent directly to customer WhatsApp',
    requiredPlan: 'starter',
    highlights: [
      'Custom formatted WhatsApp payment reminders',
      'Include outstanding balance and due dates',
      'Speed up debt recovery without awkward phone calls',
    ],
  },
  loyalty: {
    key: 'loyalty',
    name: 'Customer Loyalty & Retention',
    description: 'Points, tiers, milestone rewards, referrals, and customer retention intelligence',
    requiredPlan: 'starter',
    highlights: [
      'Automated points accrual and customizable tiers',
      'Controlled reward redemption vouchers and milestone tracking',
      'At-risk customer identification and retention opportunities',
    ],
  },

  // Business Plan Features
  invoices: {
    key: 'invoices',
    name: 'Invoices & Billing',
    description: 'Issue formal business invoices, track partial payments, and manage due dates',
    requiredPlan: 'business',
    highlights: [
      'Generate professional PDF/printable invoices',
      'Track unpaid, partial, and paid invoice balances',
      'Corporate terms, due dates, and tax formatting',
    ],
  },
  quotations: {
    key: 'quotations',
    name: 'Quotations & Estimates',
    description: 'Generate professional price quotes and proforma estimates for clients',
    requiredPlan: 'business',
    highlights: [
      'Custom client quotation drafts',
      'Fast quote-to-invoice conversion',
      'Formal price estimates with valid-until dates',
    ],
  },
  priority_support: {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Fast-track dedicated assistance and WhatsApp onboarding support',
    requiredPlan: 'business',
    highlights: [
      'Priority ticket handling',
      'Dedicated WhatsApp support desk',
      'Assisted data imports and training',
    ],
  },
  audit_logs: {
    key: 'audit_logs',
    name: 'Audit Logs & Security Trail',
    description: 'Inspect user actions, security timestamps, and operational changes',
    requiredPlan: 'business',
    highlights: [
      'Detailed log of all staff and admin actions',
      'IP addresses and operation timestamps',
      'Complete accountability across shop records',
    ],
  },
  governance: {
    key: 'governance',
    name: 'Business Administration & Governance',
    description: 'Centralized operational governance, staff access controls, policy enforcement, and audit logs',
    requiredPlan: 'starter',
    highlights: [
      'Comprehensive staff permissions & role governance',
      'Operational policies & threshold controls',
      'Automated data integrity diagnostics & system health checks',
    ],
  },
  locations: {
    key: 'locations',
    name: 'Multi-Location & Branch Expansion',
    description: 'Manage multiple branches, outlets, warehouses, and inter-location stock transfers',
    requiredPlan: 'business',
    highlights: [
      'Multi-branch inventory and location tracking',
      'Controlled stock transfers with approval workflow',
      'Location-scoped sales, expenses, and comparative reporting',
    ],
  },
  integrations: {
    key: 'integrations',
    name: 'Business Ecosystem & External Integrations',
    description: 'Connect Mobile Money gateways, accounting systems, webhook pipelines, and data sync engines',
    requiredPlan: 'business',
    highlights: [
      'Ghana Mobile Money & Paystack gateway connectivity',
      'Encrypted secret vault with server-side credential isolation',
      'Automated background sync, webhook processing, and financial reconciliation',
    ],
  },
};

/**
 * Normalizes any plan string to 'free' | 'starter' | 'business'.
 */
export function normalizePlan(rawPlan?: string | null): SubscriptionPlan {
  if (!rawPlan) return 'free';
  const clean = rawPlan.toLowerCase().trim();
  if (clean === 'business') return 'business';
  if (clean === 'starter') return 'starter';
  return 'free';
}

/**
 * Evaluates the effective active plan of a merchant considering subscription status,
 * expiry dates, and fallback business plan.
 */
export function getEffectivePlan(
  subscription?: {
    plan?: string;
    status?: string;
    expiresAt?: string;
    nextBillingDate?: string;
  } | null,
  business?: { plan?: string } | null
): SubscriptionPlan {
  // If no subscription object, fall back to business.plan if available
  const planCandidate = normalizePlan(subscription?.plan || business?.plan);

  // If free, it's always free
  if (planCandidate === 'free') return 'free';

  // If paid (starter or business), verify active status
  const rawStatus = (subscription?.status || 'active').toLowerCase().trim();

  // Non-active statuses (cancelled, expired, pending, past_due) degrade to free
  if (rawStatus !== 'active') {
    return 'free';
  }

  // Check if explicitly expired
  const expiry = subscription?.expiresAt || subscription?.nextBillingDate;
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (!isNaN(expiryTime) && expiryTime < Date.now() && rawStatus !== 'active') {
      return 'free';
    }
  }

  return planCandidate;
}

/**
 * Checks whether a business or admin can access a specific feature.
 * Master Admin is ALWAYS granted unrestricted access.
 */
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
 * Returns complete evaluation details for UI presentation and gates.
 */
export function getFeatureAccessStatus(
  subscription: any,
  feature: FeatureKey,
  isMasterAdmin: boolean = false,
  business?: any
) {
  const isAllowed = canAccessFeature(subscription, feature, isMasterAdmin, business);
  const effectivePlan = isMasterAdmin ? 'business' : getEffectivePlan(subscription, business);
  const requiredPlan = FEATURE_REQUIRED_PLAN[feature] || 'free';
  const meta = FEATURE_METADATA[feature] || {
    key: feature,
    name: feature,
    description: '',
    requiredPlan,
    highlights: [],
  };

  return {
    allowed: isAllowed,
    isMasterAdmin,
    effectivePlan,
    requiredPlan,
    requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
    currentPlanName: PLAN_DISPLAY_NAMES[effectivePlan],
    requiredPrice: PLAN_PRICES_GHS[requiredPlan],
    featureMeta: meta,
  };
}
