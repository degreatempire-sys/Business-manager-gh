// @ts-nocheck
import type {
  User,
  Business,
  BusinessSettings,
  Product,
  Customer,
  Sale,
  CustomerPayment,
  Expense,
  Supplier,
  Purchase,
  Invoice,
  Notification,
  Subscription,
  AuditLog,
  DashboardStats,
  FinancialReport,
  AdminSummary,
  AdminDashboardData,
  AdminBusinessItem,
  AdminSubscriptionItem,
  SubscriptionPayment,
  AdminActivityItem,
  Debtor,
  DebtPaymentReceipt,
  CustomerStatement,
  BusinessType,
  InvoiceStatus,
  StockMovement,
  StaffPermissions,
  InventoryIntelligence,
  CustomerIntelligence,
  ManagementIntelligence,
  StaffPerformanceItem,
  GrowthDecisionSupportPayload,
  BusinessGrowthSignal,
  ManagementActionRecommendation,
  BusinessForecastPayload,
  ProductDemandPlanningItem,
  BusinessTask,
  TaskPriority,
  AutomationRules,
  OperationsCenterSummary,
  CommunicationRecord,
  CommunicationTemplate,
  CommunicationOpportunity,
  CommunicationSummary,
  CustomerCommunicationPreferences,
  CustomerLoyaltyProfile,
  LoyaltyAnalytics,
  LoyaltyOpportunity,
  LoyaltyRewardRedemption,
  OperationalPolicies,
  ConfigurationHistoryRecord,
  SecurityEvent,
  DataIntegrityReport,
  SystemHealthReport,
  GovernanceSummaryPayload,
  Integration,
  SyncRun,
  WebhookEvent,
  ImportRun,
  ExportRun,
  ExternalPaymentRecord,
  ReconciliationReport,
  IntegrationDiagnosticsReport,
  SubscriptionUsageSummary,
  BillingInvoice,
  SimulationRunResult,
  StoredSimulation,
  BusinessPlanningTargets,
  SimulationScenarioType,
  ExecutiveCommandCenterPayload,
  BusinessGoal,
} from '../types/index.js';

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('bmgh_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('bmgh_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('bmgh_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (endpoint === '/sales' && options.method === 'POST') {
    console.log('[POS-403-TRACE] REQUEST URL:', `${API_BASE}${endpoint}`);
    console.log('[POS-403-TRACE] METHOD:', options.method || 'GET');
    console.log('[POS-403-TRACE] REQUEST PAYLOAD:', options.body);
  }

  console.log('[POS-RUNTIME] REQUEST:', options.method || 'GET', `${API_BASE}${endpoint}`);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  console.log('[POS-RUNTIME] RESPONSE:', response.status, response.headers.get('content-type'), `${API_BASE}${endpoint}`);

  if (response.status === 403) {
    const clone403 = response.clone();
    try {
      const body403 = await clone403.text();
      console.error('[POS-RUNTIME-403] URL:', `${API_BASE}${endpoint}`);
      console.error('[POS-RUNTIME-403] METHOD:', options.method || 'GET');
      console.error('[POS-RUNTIME-403] STATUS:', response.status);
      console.error('[POS-RUNTIME-403] RESPONSE BODY:', body403);
    } catch (e) {
      console.error('[POS-RUNTIME-403] FAILED TO READ 403 BODY:', e);
    }
  }

  if (endpoint === '/sales' && options.method === 'POST') {
    console.log('[POS-403-TRACE] RESPONSE STATUS:', response.status);
    console.log('[POS-403-TRACE] RESPONSE CONTENT-TYPE:', response.headers.get('content-type'));
    const clone = response.clone();
    try {
      const bodyText = await clone.text();
      console.log('[POS-403-TRACE] RESPONSE BODY:', bodyText);
    } catch (e) {
      console.log('[POS-403-TRACE] RESPONSE BODY READ ERROR:', e);
    }
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  let data: any = null;

  if (contentType.includes('json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  // Fallback: If not parsed via application/json, read body as text and attempt JSON parsing
  if (data === null) {
    try {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          // Genuinely non-JSON text or HTML
          data = {
            error: !response.ok
              ? (text.length < 200 && !text.includes('<html') ? text.trim() : `Server error (${response.status}): ${response.statusText || 'Unexpected non-JSON response'}`)
              : text,
          };
        }
      }
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data.error === 'string' && data.error.trim()) ||
      (data && typeof data.message === 'string' && data.message.trim()) ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    businessName: string;
    businessType: BusinessType;
  }) =>
    request<{ user: User; business: Business; token: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: User; business?: Business; token: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{
      user: User;
      business?: Business;
      settings?: BusinessSettings;
      subscription?: Subscription;
    }>('/auth/me'),

  resetPassword: (payload: { email: string; newPassword?: string }) =>
    request<{ message: string; recoveryInitiated?: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUserProfile: (payload: {
    fullName?: string;
    phone?: string;
    oldPassword?: string;
    newPassword?: string;
  }) =>
    request<{ user: User; message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Business Onboarding & Settings
  updateOnboarding: (payload: Partial<Business>) =>
    request<{ business: Business; message: string }>('/business/onboarding', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getSettings: () =>
    request<{ settings: BusinessSettings; business: Business }>('/business/settings'),

  updateBusinessSettings: (payload: Partial<Business>) =>
    request<{ business: Business; message: string }>('/business/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateSettings: (payload: { settings?: Partial<BusinessSettings>; business?: Partial<Business> }) =>
    request<{ settings: BusinessSettings; business: Business; message: string }>('/business/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Dashboard
  getDashboard: () => request<DashboardStats>('/dashboard'),

  // Products
  getProducts: (params?: { search?: string; category?: string; stockStatus?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
    const queryString = query.toString();
    return request<Product[]>(`/products${queryString ? `?${queryString}` : ''}`);
  },
  getProduct: (id: string) => request<{ product: Product; movements: StockMovement[] }>(`/products/${id}`),
  addProduct: (product: Partial<Product>) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  updateProduct: (id: string, product: Partial<Product> & { movementReason?: string }) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  adjustProductStock: (
    id: string,
    payload: {
      adjustmentType?: string;
      quantityChange?: number;
      newTotalQuantity?: number;
      reason?: string;
      idempotencyKey?: string;
    }
  ) =>
    request<{ product: Product; message: string; movement?: StockMovement }>(`/products/${id}/adjust-stock`, {
      method: 'POST',
      headers: payload.idempotencyKey ? { 'x-idempotency-key': payload.idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    }),
  getProductMovements: (id: string) => request<StockMovement[]>(`/products/${id}/movements`),
  getStockMovements: () => request<StockMovement[]>('/stock-movements'),
  getInventoryIntelligence: (params?: { range?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const queryString = query.toString();
    return request<InventoryIntelligence>(`/inventory/intelligence${queryString ? `?${queryString}` : ''}`);
  },
  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Sales
  getSales: () => request<Sale[]>('/sales'),
  getSaleById: (id: string) => request<Sale>(`/sales/${id}`),
  createSale: (sale: Partial<Sale>) =>
    request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),

  // POS Customers
  getPosCustomers: () => request<Customer[]>('/pos/customers'),

  // Customers
  getCustomers: (params?: string | { search?: string; segment?: string; sortBy?: string; range?: string }) => {
    if (typeof params === 'string') {
      return request<Customer[]>(params ? `/customers?search=${encodeURIComponent(params)}` : '/customers');
    }
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.segment) query.set('segment', params.segment);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.range) query.set('range', params.range);
    const qs = query.toString();
    return request<Customer[]>(qs ? `/customers?${qs}` : '/customers');
  },
  getCustomerById: (id: string) => request<Customer>(`/customers/${id}`),
  getCustomerIntelligence: (params?: { range?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<CustomerIntelligence>(qs ? `/customers/intelligence?${qs}` : '/customers/intelligence');
  },
  addCustomer: (customer: Partial<Customer>) =>
    request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),
  updateCustomer: (id: string, customer: Partial<Customer>) =>
    request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),
  addCustomerNote: (id: string, note: string) =>
    request<{ success: boolean; customer: Customer; notes: string }>(`/customers/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  deleteCustomer: (id: string) =>
    request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),
  getCustomerStatement: (id: string) =>
    request<CustomerStatement>(`/customers/${id}/statement`),

  // Debtors & Payments
  getDebtors: () => request<Debtor[]>('/debtors'),
  getDebtorById: (id: string) => request<any>(`/debtors/${id}`),
  recordCustomerPayment: (payment: Partial<CustomerPayment>) =>
    request<{
      payment: CustomerPayment;
      receipt: DebtPaymentReceipt;
      customer: Customer;
      originalDebt: number;
      paymentAmount: number;
      remainingBalance: number;
    }>('/debtors/payment', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
  recordDebtPayment: (payment: Partial<CustomerPayment>) =>
    request<{
      payment: CustomerPayment;
      receipt: DebtPaymentReceipt;
      customer: Customer;
      originalDebt: number;
      paymentAmount: number;
      remainingBalance: number;
    }>('/debtors/payment', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  // Expenses
  getExpenses: (params?: { category?: string; paymentMethod?: string; startDate?: string; endDate?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Expense[]>(`/expenses${qs ? `?${qs}` : ''}`);
  },
  getExpenseById: (id: string) => request<Expense>(`/expenses/${id}`),
  addExpense: (expense: Partial<Expense>) =>
    request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  updateExpense: (id: string, expense: Partial<Expense>) =>
    request<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    }),
  getExpensesSummary: () => request<any>('/expenses/summary'),
  deleteExpense: (id: string) =>
    request<{ message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Suppliers
  getSuppliers: (search?: string) =>
    request<Supplier[]>(search ? `/suppliers?search=${encodeURIComponent(search)}` : '/suppliers'),
  getSupplierById: (id: string) => request<{ supplier: Supplier; purchases: Purchase[]; totalPurchases?: number; productsSuppliedCount: number }>(`/suppliers/${id}`),
  addSupplier: (supplier: Partial<Supplier>) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),
  updateSupplier: (id: string, supplier: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    }),
  deleteSupplier: (id: string) =>
    request<{ message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Purchases
  getPurchases: (params?: { supplierId?: string; startDate?: string; endDate?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.supplierId) query.set('supplierId', params.supplierId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Purchase[]>(`/purchases${qs ? `?${qs}` : ''}`);
  },
  getPurchaseById: (id: string) => request<Purchase>(`/purchases/${id}`),
  createPurchase: (purchase: Partial<Purchase>) =>
    request<Purchase>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchase),
    }),
  recordPurchase: (purchase: Partial<Purchase>) =>
    request<Purchase>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchase),
    }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/invoices'),
  createInvoice: (invoice: Partial<Invoice>) =>
    request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    }),
  updateInvoice: (id: string, invoice: Partial<Invoice>) =>
    request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    }),
  updateInvoiceStatus: (id: string, status: InvoiceStatus) =>
    request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteInvoice: (id: string) =>
    request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),

  // Reports
  getReports: (
    range = 'this_month',
    startDate = '',
    endDate = '',
    filters?: { paymentMethod?: string; category?: string; cashier?: string }
  ) => {
    const query = new URLSearchParams();
    if (range) query.append('range', range);
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    if (filters?.paymentMethod) query.append('paymentMethod', filters.paymentMethod);
    if (filters?.category) query.append('category', filters.category);
    if (filters?.cashier) query.append('cashier', filters.cashier);
    return request<FinancialReport>(`/reports?${query.toString()}`);
  },

  // Notifications
  getNotifications: () => request<Notification[]>('/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT',
    }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),

  // Subscriptions & Paystack
  getCurrentSubscription: () =>
    request<{ subscription: Subscription; isPaystackConfigured: boolean }>('/subscriptions/current'),
  getSubscriptionPayments: () =>
    request<SubscriptionPayment[]>('/subscriptions/payments'),
  initializeSubscriptionPayment: (payload: { plan: string; callbackUrl?: string }) =>
    request<{
      success: boolean;
      authorizationUrl: string;
      reference: string;
      accessCode: string;
      plan: string;
      amount: number;
      currency: string;
      message: string;
    }>('/subscriptions/initialize-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifySubscriptionPayment: (reference: string) =>
    request<{
      success: boolean;
      message: string;
      payment: SubscriptionPayment;
      subscription: Subscription;
      alreadyFulfilled?: boolean;
    }>(`/subscriptions/verify-payment/${encodeURIComponent(reference)}`),
  upgradeSubscription: (plan: string) =>
    request<{ subscription: Subscription; message: string }>('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  // Stage 4R: SaaS Billing & Subscription Operations
  getSubscriptionUsage: () =>
    request<SubscriptionUsageSummary>('/subscriptions/usage'),
  startSubscriptionTrial: (payload: { plan: 'starter' | 'business'; durationDays?: number }) =>
    request<{ success: boolean; message: string; subscription: Subscription }>('/subscriptions/trial', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelSubscription: (payload: { reason?: string; immediate?: boolean }) =>
    request<{ success: boolean; message: string; subscription: Subscription }>('/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBillingInvoices: () =>
    request<BillingInvoice[]>('/billing/invoices'),
  getBillingReconciliation: () =>
    request<any>('/billing/reconciliation'),
  repairBillingInvoice: (paymentReference: string) =>
    request<{ success: boolean; message: string; invoice?: BillingInvoice }>('/billing/repair-invoice', {
      method: 'POST',
      body: JSON.stringify({ paymentReference }),
    }),

  // Staff & Team Management
  getStaff: () => request<{ staff: User[] }>('/staff'),
  createStaff: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    permissions?: StaffPermissions;
  }) =>
    request<{ staff: User; message: string }>('/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStaff: (
    id: string,
    payload: {
      fullName?: string;
      phone?: string;
      status?: 'active' | 'inactive';
      password?: string;
      permissions?: StaffPermissions;
    }
  ) =>
    request<{ staff: User; message: string }>(`/staff/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStaff: (id: string) =>
    request<{ message: string }>(`/staff/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  getStaffIntelligence: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    staffId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.staffId) query.set('staffId', params.staffId);
    const qs = query.toString();
    return request<ManagementIntelligence>(`/staff/intelligence${qs ? `?${qs}` : ''}`);
  },
  getStaffMemberPerformance: (
    id: string,
    params?: {
      range?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{
      staffMember: StaffPerformanceItem;
      dateRange: any;
      hourlyDistribution: any;
      peakOperatingHours: any;
    }>(`/staff/${encodeURIComponent(id)}/performance${qs ? `?${qs}` : ''}`);
  },

  // Stage 4J: Business Growth, Sales Intelligence & Decision Support
  getGrowthIntelligence: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<GrowthDecisionSupportPayload>(`/growth/intelligence${qs ? `?${qs}` : ''}`);
  },
  getGrowthSignals: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{
      healthSummary: any;
      signals: BusinessGrowthSignal[];
    }>(`/growth/signals${qs ? `?${qs}` : ''}`);
  },
  getGrowthRecommendations: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{
      recommendations: ManagementActionRecommendation[];
    }>(`/growth/recommendations${qs ? `?${qs}` : ''}`);
  },

  // Stage 4K: Business Forecasting & Planning
  getBusinessForecast: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    scenarioSalesPct?: number;
    scenarioExpenseDelta?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.scenarioSalesPct !== undefined) query.set('scenarioSalesPct', String(params.scenarioSalesPct));
    if (params?.scenarioExpenseDelta !== undefined) query.set('scenarioExpenseDelta', String(params.scenarioExpenseDelta));
    const qs = query.toString();
    return request<BusinessForecastPayload>(`/business/forecast${qs ? `?${qs}` : ''}`);
  },

  getProductPlanning: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{ products: ProductDemandPlanningItem[] }>(`/products/planning${qs ? `?${qs}` : ''}`);
  },

  // Stage 4T: Strategic Scenario Simulation & Business Planning
  runScenarioSimulation: (params: {
    scenarioType: SimulationScenarioType;
    scenarioName?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
    assumptions?: Record<string, any>;
  }) => request<SimulationRunResult>('/business/simulations/run', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getSavedSimulations: () => request<{ simulations: StoredSimulation[] }>('/business/simulations'),

  saveSimulation: (data: Partial<StoredSimulation>) => request<StoredSimulation>('/business/simulations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getSimulationById: (id: string) => request<StoredSimulation>(`/business/simulations/${id}`),

  deleteSimulation: (id: string) => request<{ success: boolean }>(`/business/simulations/${id}`, {
    method: 'DELETE',
  }),

  getPlanningTargets: (period?: string) => {
    const qs = period ? `?period=${encodeURIComponent(period)}` : '';
    return request<{ targets: BusinessPlanningTargets | null }>(`/business/planning/targets${qs}`);
  },

  savePlanningTargets: (data: Partial<BusinessPlanningTargets>) => request<{ targets: BusinessPlanningTargets }>('/business/planning/targets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Stage 4V: Business Health Dashboard
  getBusinessHealth: (params?: { range?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ health: BusinessHealthReport }>(`/business/health${qs}`);
  },

  // Stage 4W: Business Alerts & Early-Warning System
  getBusinessAlerts: () => request<{ alerts: BusinessAlert[] }>('/business/alerts'),
  updateAlertStatus: (id: string, status: 'ACTIVE' | 'DISMISSED' | 'RESOLVED') =>
    request<{ alert: BusinessAlert }>(`/business/alerts/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Stage 4X: Business Activity Timeline & Audit View
  getBusinessActivity: (params?: { range?: string; startDate?: string; endDate?: string; eventType?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.eventType) query.set('eventType', params.eventType);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ activities: BusinessActivityEvent[] }>(`/business/activity${qs}`);
  },

  // Stage 4U: Business Goals & Targets Tracker
  getBusinessGoals: () => request<{ goals: BusinessGoal[] }>('/business/goals'),
  saveBusinessGoal: (data: Partial<BusinessGoal>) => request<{ goal: BusinessGoal }>('/business/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteBusinessGoal: (id: string) => request<{ success: boolean }>(`/business/goals/${id}`, {
    method: 'DELETE',
  }),

  // Stage 4S: Executive Command Center
  getExecutiveCommandCenter: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.locationId) query.set('locationId', params.locationId);
    const qs = query.toString();
    return request<ExecutiveCommandCenterPayload>(`/executive-command-center${qs ? `?${qs}` : ''}`);
  },

  getExecutivePreferences: () => request<{ preferences: any }>('/executive/preferences'),

  saveExecutivePreferences: (preferences: any) => request<{ preferences: any }>('/executive/preferences', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  }),

  // Admin (Platform Owner / Master Admin)
  getAdminDashboard: () => request<AdminDashboardData>('/admin/dashboard'),
  getAdminBusinesses: () => request<AdminBusinessItem[]>('/admin/businesses'),
  getAdminSubscriptions: () => request<AdminSubscriptionItem[]>('/admin/subscriptions'),
  getAdminSubscription: (id: string) => request<AdminSubscriptionItem>(`/admin/subscriptions/${id}`),
  updateAdminSubscriptionPlan: (id: string, plan: string) =>
    request<{ subscription: Subscription; message: string }>(`/admin/subscriptions/${id}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    }),
  updateAdminSubscriptionStatus: (id: string, status: string) =>
    request<{ subscription: Subscription; message: string }>(`/admin/subscriptions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getAdminPayments: () => request<SubscriptionPayment[]>('/admin/payments'),
  getAdminActivity: () => request<AdminActivityItem[]>('/admin/activity'),
  getAdminSummary: () => request<AdminSummary>('/admin/overview'),
  getAdminUsers: () => request<User[]>('/admin/users'),
  getAdminAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),
  getAdminOverview: () => request<any>('/admin/overview'),

  // Stage 4L: Tasks & Workflows
  getTasks: (params?: {
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    search?: string;
    overdue?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.source) query.set('source', params.source);
    if (params?.assignedTo) query.set('assignedTo', params.assignedTo);
    if (params?.search) query.set('search', params.search);
    if (params?.overdue !== undefined) query.set('overdue', String(params.overdue));
    const qs = query.toString();
    return request<BusinessTask[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignedToId?: string;
    dueDate?: string;
    actionUrl?: string;
    actionLabel?: string;
  }) => request<BusinessTask>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getTaskById: (id: string) => request<BusinessTask>(`/tasks/${id}`),
  updateTask: (id: string, updates: Partial<BusinessTask> & { snoozeHours?: number }) =>
    request<BusinessTask>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  completeTask: (id: string) => request<BusinessTask>(`/tasks/${id}/complete`, { method: 'POST' }),
  snoozeTask: (id: string, hours?: number) =>
    request<BusinessTask>(`/tasks/${id}/snooze`, { method: 'POST', body: JSON.stringify({ hours }) }),
  dismissTask: (id: string) => request<BusinessTask>(`/tasks/${id}/dismiss`, { method: 'POST' }),
  deleteTask: (id: string) => request<{ success: boolean; message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
  evaluateWorkflows: () =>
    request<{
      success: boolean;
      generatedCount: number;
      existingActiveCount: number;
      tasks: BusinessTask[];
      summary: OperationsCenterSummary;
    }>('/workflows/evaluate', { method: 'POST' }),
  getWorkflowsSummary: () => request<OperationsCenterSummary>('/workflows/summary'),
  getAutomationRules: () => request<AutomationRules>('/workflows/rules'),
  updateAutomationRules: (rules: Partial<AutomationRules>) =>
    request<AutomationRules>('/workflows/rules', { method: 'PUT', body: JSON.stringify(rules) }),

  // Stage 4M: Business Communications & Engagement
  getCommunications: (params?: {
    status?: string;
    customerId?: string;
    type?: string;
    channel?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.type) query.set('type', params.type);
    if (params?.channel) query.set('channel', params.channel);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<CommunicationRecord[]>(`/communications${qs ? `?${qs}` : ''}`);
  },
  getCommunicationSummary: () => request<CommunicationSummary>('/communications/summary'),
  getCommunicationOpportunities: () => request<CommunicationOpportunity[]>('/communications/opportunities'),
  getCommunicationTemplates: () => request<CommunicationTemplate[]>('/communications/templates'),
  createCommunicationTemplate: (data: {
    name: string;
    type: string;
    channel?: string;
    subject?: string;
    content: string;
    variables?: string[];
  }) => request<CommunicationTemplate>('/communications/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateCommunicationTemplate: (id: string, data: Partial<CommunicationTemplate>) =>
    request<CommunicationTemplate>(`/communications/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCommunicationTemplate: (id: string) =>
    request<{ success: boolean; message: string }>(`/communications/templates/${id}`, { method: 'DELETE' }),
  getCommunicationById: (id: string) => request<CommunicationRecord>(`/communications/${id}`),
  createCommunication: (data: {
    customerId: string;
    type?: string;
    channel?: string;
    templateId?: string;
    message?: string;
    status?: string;
    relatedTaskId?: string;
    metadata?: Record<string, any>;
    dedupKey?: string;
  }) => request<CommunicationRecord>('/communications', { method: 'POST', body: JSON.stringify(data) }),
  updateCommunication: (id: string, updates: Partial<CommunicationRecord>) =>
    request<CommunicationRecord>(`/communications/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  approveCommunication: (id: string) =>
    request<CommunicationRecord>(`/communications/${id}/approve`, { method: 'POST' }),
  cancelCommunication: (id: string) =>
    request<CommunicationRecord>(`/communications/${id}/cancel`, { method: 'POST' }),
  openCommunication: (id: string) =>
    request<{ success: boolean; communication: CommunicationRecord; whatsappUrl?: string }>(
      `/communications/${id}/open`,
      { method: 'POST' }
    ),
  getCustomerCommunications: (customerId: string) =>
    request<CommunicationRecord[]>(`/customers/${customerId}/communications`),
  updateCustomerPreferences: (customerId: string, preferences: Partial<CustomerCommunicationPreferences>) =>
    request<Customer>(`/customers/${customerId}/preferences`, { method: 'PUT', body: JSON.stringify(preferences) }),

  // Stage 4N: Loyalty & Customer Retention
  getLoyaltyProfile: (customerId: string) =>
    request<CustomerLoyaltyProfile>(`/loyalty/customers/${customerId}`),
  getLoyaltyAnalytics: () =>
    request<LoyaltyAnalytics>('/loyalty/analytics'),
  getLoyaltyOpportunities: () =>
    request<LoyaltyOpportunity[]>('/loyalty/opportunities'),
  adjustCustomerLoyaltyPoints: (data: { customerId: string; points: number; reason: string }) =>
    request<{ success: boolean; entry: any }>('/loyalty/adjust', { method: 'POST', body: JSON.stringify(data) }),
  redeemLoyaltyReward: (data: { customerId: string; rewardId: string; notes?: string }) =>
    request<{ success: boolean; redemption: LoyaltyRewardRedemption; message: string }>('/loyalty/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveLoyaltyReward: (redemptionId: string) =>
    request<{ success: boolean; redemption: LoyaltyRewardRedemption; message: string }>(
      `/loyalty/redemptions/${redemptionId}/approve`,
      { method: 'POST' }
    ),

  // Stage 4O: Business Administration, Governance, Audit & Operational Control
  getGovernanceSummary: () =>
    request<GovernanceSummaryPayload>('/governance/summary'),
  getOperationalPolicies: () =>
    request<{ policies: OperationalPolicies }>('/governance/policies'),
  updateOperationalPolicies: (policies: Partial<OperationalPolicies>) =>
    request<{ success: boolean; policies: OperationalPolicies; message: string }>('/governance/policies', {
      method: 'PUT',
      body: JSON.stringify({ policies }),
    }),
  getGovernanceStaff: () =>
    request<{ staff: User[]; total: number }>('/governance/staff'),
  updateStaffStatus: (staffId: string, status: 'active' | 'inactive' | 'suspended') =>
    request<{ success: boolean; staff: User; message: string }>(`/governance/staff/${staffId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  updateStaffPermissions: (staffId: string, permissions: Partial<StaffPermissions>) =>
    request<{ success: boolean; staff: User; message: string }>(`/governance/staff/${staffId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  getGovernanceAuditLogs: (filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    module?: string;
    severity?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.userId) query.set('userId', filters.userId);
    if (filters?.action) query.set('action', filters.action);
    if (filters?.module) query.set('module', filters.module);
    if (filters?.severity) query.set('severity', filters.severity);
    if (filters?.search) query.set('search', filters.search);
    if (filters?.page) query.set('page', String(filters.page));
    if (filters?.limit) query.set('limit', String(filters.limit));
    const qs = query.toString();
    return request<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }>(
      `/governance/audit-logs${qs ? `?${qs}` : ''}`
    );
  },
  getGovernanceSecurityEvents: (filters?: { severity?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (filters?.severity) query.set('severity', filters.severity);
    if (filters?.type) query.set('type', filters.type);
    const qs = query.toString();
    return request<{ events: SecurityEvent[]; total: number }>(`/governance/security-events${qs ? `?${qs}` : ''}`);
  },
  runDataIntegrityDiagnostic: () =>
    request<DataIntegrityReport>('/governance/integrity/diagnostic'),
  executeDataRepair: (repairType: string, options?: any) =>
    request<{ success: boolean; message: string; repairType: string; timestamp: string; details?: any }>(
      '/governance/integrity/repair',
      { method: 'POST', body: JSON.stringify({ repairType, options }) }
    ),
  getSystemHealth: () =>
    request<SystemHealthReport>('/governance/system-health'),
  getConfigurationHistory: () =>
    request<{ history: ConfigurationHistoryRecord[]; total: number }>('/governance/config-history'),

  // Stage 4Q: Integrations & External Ecosystem
  getIntegrationCatalog: () =>
    request<any[]>('/integrations/catalog'),
  getIntegrations: () =>
    request<Integration[]>('/integrations'),
  getIntegrationById: (id: string) =>
    request<Integration>(`/integrations/${id}`),
  connectIntegration: (data: {
    provider: string;
    category?: string;
    displayName?: string;
    description?: string;
    locationScope?: string;
    locationId?: string;
    configuration?: Record<string, any>;
    secrets?: Record<string, string>;
  }) =>
    request<Integration>('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIntegration: (
    id: string,
    data: {
      displayName?: string;
      description?: string;
      configuration?: Record<string, any>;
      secrets?: Record<string, string>;
      locationScope?: string;
      locationId?: string;
    }
  ) =>
    request<Integration>(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  disconnectIntegration: (id: string) =>
    request<Integration>(`/integrations/${id}/disconnect`, { method: 'POST' }),
  testIntegrationConnection: (id: string) =>
    request<{ success: boolean; healthy: boolean; status: string; latencyMs: number; details?: any }>(
      `/integrations/${id}/test`,
      { method: 'POST' }
    ),
  syncIntegration: (id: string, options: { direction: string; entityType: string; locationId?: string }) =>
    request<SyncRun>(`/integrations/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),
  getIntegrationSyncs: (id: string) =>
    request<SyncRun[]>(`/integrations/${id}/syncs`),
  getIntegrationEvents: (id: string) =>
    request<any[]>(`/integrations/${id}/events`),
  getIntegrationWebhooks: (id: string) =>
    request<WebhookEvent[]>(`/integrations/${id}/webhooks`),
  getIntegrationDiagnostics: () =>
    request<IntegrationDiagnosticsReport>('/integrations/diagnostics'),
  previewImport: (data: { entityType: string; rows: any[]; locationId?: string }) =>
    request<ImportRun>('/integrations/import/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  executeImport: (data: { importRunId: string; validatedRows: any[] }) =>
    request<ImportRun>('/integrations/import/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getImportHistory: () =>
    request<ImportRun[]>('/integrations/import/history'),
  exportAccounting: (data: { entityType: string; format?: string; startDate?: string; endDate?: string; locationId?: string }) =>
    request<{ success: boolean; data: any[]; exportRun: ExportRun }>('/integrations/export/accounting', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getExportHistory: () =>
    request<ExportRun[]>('/integrations/export/history'),
  initiateExternalPayment: (data: {
    integrationId?: string;
    provider?: string;
    amount: number;
    currency?: string;
    saleId?: string;
    customerId?: string;
    customerPhone?: string;
    locationId?: string;
    idempotencyKey?: string;
  }) =>
    request<ExternalPaymentRecord>('/integrations/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyExternalPayment: (data: {
    merchantReference: string;
    externalTransactionReference?: string;
    integrationId?: string;
    provider?: string;
    amount?: number;
    currency?: string;
    status?: string;
  }) =>
    request<{ success: boolean; duplicate?: boolean; payment: ExternalPaymentRecord }>('/integrations/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reconcilePayments: (provider?: string, startDate?: string, endDate?: string, locationId?: string) => {
    const query = new URLSearchParams();
    if (provider) query.set('provider', provider);
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    if (locationId) query.set('locationId', locationId);
    const qs = query.toString();
    return request<ReconciliationReport>(`/integrations/payments/reconcile${qs ? `?${qs}` : ''}`);
  },
  getBusinessDailyBrief: () => request<any>('/business/daily-brief'),
  getBusinessDecisions: () => request<{ decisions: BusinessDecision[] }>('/business/decisions'),
  createBusinessDecision: (data: { title: string; description: string; category?: string; priority?: string; dueDate?: string }) =>
    request<BusinessDecision>('/business/decisions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDecisionStatus: (id: string, status: string) =>
    request<BusinessDecision>(`/business/decisions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  exportBusinessData: async (type: string): Promise<string> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Accept': 'text/csv, application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/business/export/${type}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Export failed with status ${res.status}`);
    }
    return await res.text();
  },
  importProducts: (csv: string, confirm?: boolean) =>
    request<{
      success: boolean;
      valid?: boolean;
      errors?: Array<{ row: number; field?: string; message: string }>;
      preview?: any[];
      totalRows?: number;
      importedCount?: number;
      message?: string;
    }>('/business/import/products', {
      method: 'POST',
      body: JSON.stringify({ csv, confirm }),
    }),
  importCustomers: (csv: string, confirm?: boolean) =>
    request<{
      success: boolean;
      valid?: boolean;
      errors?: Array<{ row: number; field?: string; message: string }>;
      preview?: any[];
      totalRows?: number;
      importedCount?: number;
      message?: string;
    }>('/business/import/customers', {
      method: 'POST',
      body: JSON.stringify({ csv, confirm }),
    }),
  createBusinessBackup: () =>
    request<{
      success: boolean;
      filename: string;
      backup: any;
      summary: {
        formatVersion: string;
        backupVersion: string;
        createdAt: string;
        totalRecords: number;
        recordCounts: Record<string, number>;
        checksum: string;
      };
    }>('/business/backup', {
      method: 'POST',
    }),
  verifyBusinessBackup: (backup: any) =>
    request<{
      valid: boolean;
      errors?: string[];
      summary?: {
        formatVersion: string;
        backupVersion: string;
        createdAt: string;
        businessId: string;
        totalRecords: number;
        recordCounts: Record<string, number>;
      };
    }>('/business/backup/verify', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    }),
  getBackupHistory: (filter?: string) =>
    request<{
      success: boolean;
      history: Array<{
        id: string;
        businessId: string;
        action: 'BACKUP_CREATED' | 'BACKUP_VERIFY_SUCCESS' | 'BACKUP_VERIFY_FAILED';
        status: 'SUCCESS' | 'FAILED';
        performedBy: string;
        performedByName: string;
        createdAt: string;
        recordCount?: number;
        backupVersion?: string;
        failureReason?: string;
      }>;
    }>(`/business/backup/history${filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : ''}`, {
      method: 'GET',
    }),
  getBackupRetentionSummary: () =>
    request<{
      success: boolean;
      retention: {
        totalRecords: number;
        newestBackupDate: string | null;
        oldestBackupDate: string | null;
        olderThan30Days: number;
        olderThan90Days: number;
        olderThan180Days: number;
      };
    }>('/business/backup/retention', {
      method: 'GET',
    }),
  getBackupHealthStatus: () =>
    request<{
      success: boolean;
      health: {
        status: 'HEALTHY' | 'ATTENTION' | 'NO_BACKUP_DATA';
        latestBackupAt: string | null;
        latestSuccessfulVerificationAt: string | null;
        latestFailedVerificationAt: string | null;
        daysSinceLatestBackup: number | null;
        reason: string;
        diagnosticChecks: Array<{
          name: string;
          status: 'PASS' | 'ATTENTION' | 'NOT_AVAILABLE';
          explanation: string;
        }>;
        recoveryReadiness: {
          status: 'READY' | 'ATTENTION' | 'NOT_READY';
          checks: Array<{
            name: string;
            status: 'PASS' | 'ATTENTION' | 'NOT_AVAILABLE';
            explanation: string;
          }>;
        };
        recoveryActionGuide: {
          summary: string;
          actions: Array<{
            text: string;
            completed: boolean;
            priority: 'high' | 'medium' | 'low';
          }>;
        };
        recoverySummary: {
          readinessStatus: 'READY' | 'ATTENTION' | 'NOT_READY';
          backupDataAvailable: boolean;
          recentBackupStatus: 'Ready' | 'Attention';
          verificationStatus: 'Passed' | 'Not Available';
          integrityStatus: 'Verifiable' | 'Attention';
          historyAvailable: boolean;
          outstandingRequirements: string[];
          lastSuccessfulVerification: {
            status: string;
            createdAt: string;
            recordCount?: number;
            backupVersion?: string;
          } | null;
        };
      };
    }>('/business/backup/health', {
      method: 'GET',
    }),
  prepareRecoveryPackage: () =>
    request<{
      success: boolean;
      recoveryPackage: any;
    }>('/business/backup/recovery-package', {
      method: 'POST',
    }),
  validateRecoveryPackage: (packageData: any) =>
    request<{
      success: boolean;
      validation: {
        status: 'VALID' | 'ATTENTION' | 'INVALID';
        checks: Array<{
          name: string;
          status: 'PASS' | 'ATTENTION' | 'INVALID';
          explanation: string;
        }>;
        failedChecks: string[];
        explanation: string;
      };
    }>('/business/backup/recovery-package/validate', {
      method: 'POST',
      body: JSON.stringify({ packageData }),
    }),
  reverifyRecoveryPackage: (packageData: any) =>
    request<{
      success: boolean;
      reverification: {
        status: 'VERIFIED' | 'ATTENTION' | 'FAILED';
        checksumMatch: boolean;
        validationPassed: boolean;
        explanation: string;
      };
    }>('/business/backup/recovery-package/reverify', {
      method: 'POST',
      body: JSON.stringify({ packageData }),
    }),
  getBusinessIntegrity: () =>
    request<{
      success: boolean;
      report: {
        summary: {
          status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
          totalChecks: number;
          passedChecks: number;
          warningCount: number;
          criticalCount: number;
        };
        checks: Array<{
          name: string;
          status: 'PASS' | 'WARNING' | 'CRITICAL';
          description: string;
        }>;
        findings: Array<{
          checkName: string;
          severity: 'INFO' | 'WARNING' | 'CRITICAL';
          recordType: string;
          recordId?: string;
          description: string;
          suggestedAction: string;
        }>;
        checkedAt: string;
      };
    }>('/business/integrity', {
      method: 'GET',
    }),
  searchRecords: (q: string) =>
    request<{
      success: boolean;
      query: string;
      results: {
        products: any[];
        customers: any[];
        sales: any[];
        debts: any[];
        suppliers: any[];
        purchases: any[];
        expenses: any[];
        invoices: any[];
      };
      totalCount: number;
    }>(`/business/search?q=${encodeURIComponent(q)}`, {
      method: 'GET',
    }),
};
