export type BusinessType =
  | 'Provision Shop'
  | 'Boutique'
  | 'Cosmetics'
  | 'Electronics'
  | 'Restaurant'
  | 'Phone Shop'
  | 'Spare Parts'
  | 'Salon'
  | 'Wholesale'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'Mobile Money'
  | 'Bank Transfer'
  | 'Card'
  | 'Credit/Debt'
  | 'Credit';

export type DebtStatus = 'Paid' | 'Partially Paid' | 'Outstanding' | 'Overdue';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue';

export type UserRole = 'admin' | 'master_admin' | 'business_owner' | 'staff';

export type SubscriptionPlan = 'Free' | 'Starter' | 'Business' | 'FREE' | 'STARTER' | 'BUSINESS';

export interface StaffPermissions {
  dashboard: boolean;
  pos_sales: boolean;
  view_products: boolean;
  manage_products: boolean;
  customers: boolean;
  debtors: boolean;
  expenses: boolean;
  suppliers: boolean;
  purchases: boolean;
  invoices: boolean;
  financial_reports: boolean;
  notifications: boolean;
  business_settings: boolean;
  loyalty_view?: boolean;
  loyalty_manage?: boolean;
  loyalty_adjust?: boolean;
  loyalty_redeem?: boolean;
  manage_staff?: boolean;
  view_audit?: boolean;
  view_security?: boolean;
  location_view?: boolean;
  location_manage?: boolean;
  location_switch?: boolean;
  location_inventory?: boolean;
  location_reports?: boolean;
  location_transfer?: boolean;
}

export const STAFF_PERMISSION_KEYS: (keyof StaffPermissions)[] = [
  'dashboard',
  'pos_sales',
  'view_products',
  'manage_products',
  'customers',
  'debtors',
  'expenses',
  'suppliers',
  'purchases',
  'invoices',
  'financial_reports',
  'notifications',
  'business_settings',
  'loyalty_view',
  'loyalty_manage',
  'loyalty_adjust',
  'loyalty_redeem',
  'manage_staff',
  'view_audit',
  'view_security',
  'location_view',
  'location_manage',
  'location_switch',
  'location_inventory',
  'location_reports',
  'location_transfer',
];

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  dashboard: true,
  pos_sales: true,
  view_products: true,
  manage_products: false,
  customers: true,
  debtors: false,
  expenses: false,
  suppliers: false,
  purchases: false,
  invoices: false,
  financial_reports: false,
  notifications: true,
  business_settings: false,
  loyalty_view: false,
  loyalty_manage: false,
  loyalty_adjust: false,
  loyalty_redeem: false,
  manage_staff: false,
  view_audit: false,
  view_security: false,
  location_view: false,
  location_manage: false,
  location_switch: false,
  location_inventory: false,
  location_reports: false,
  location_transfer: false,
};

export type LocationType = 'SHOP' | 'BRANCH' | 'OUTLET' | 'WAREHOUSE' | 'OFFICE' | 'OTHER';
export type LocationStatus = 'ACTIVE' | 'INACTIVE';

export interface Location {
  id: string;
  businessId: string;
  name: string;
  code: string;
  type: LocationType;
  address?: string;
  city?: string;
  region?: string;
  country?: string; // default 'Ghana'
  phone?: string;
  status: LocationStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockTransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StockTransfer {
  id: string;
  businessId: string;
  transferNumber: string;
  sourceLocationId: string;
  sourceLocationName?: string;
  destinationLocationId: string;
  destinationLocationName?: string;
  productId: string;
  productName?: string;
  quantity: number;
  status: StockTransferStatus;
  notes?: string;
  requestedBy: string;
  requestedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  dispatchedBy?: string;
  dispatchedByName?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  businessId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: StaffPermissions;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  assignedScope?: string;
  assignedLocationIds?: string[];
  allLocations?: boolean;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  location: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string; // e.g. 'GH₵'
  receiptNote?: string;
  plan?: SubscriptionPlan;
  createdAt: string;
  updatedAt?: string;
  city?: string;
  region?: string;
  country?: string;
  description?: string;
  address?: string;
  taxNumber?: string;
}

export interface BusinessSettings {
  id: string;
  businessId: string;
  receiptHeader?: string;
  receiptFooter?: string;
  printSize: '80mm' | '58mm' | 'A4';
  taxRatePercent: number;
  lowStockThreshold: number;
  enableStockAlerts: boolean;
  enableWhatsappReminders: boolean;
  enableWhatsappReceipts?: boolean;
  defaultPaymentMethod: PaymentMethod;
  policies?: OperationalPolicies;
  walkInCustomerName?: string;
  allowNegativeStock?: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  stockStatus?: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK';
  shortfall?: number;
  supplierId?: string;
  supplierName?: string;
  description?: string;
  imageUrl?: string;
  isDeleted?: boolean;
  locationStock?: Record<string, number>;
  createdAt: string;
  updatedAt?: string;
}

export type StockMovementType =
  | 'initial'
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'damage'
  | 'loss';

export interface StockMovement {
  id: string;
  businessId: string;
  productId: string;
  productName?: string;
  movementType: StockMovementType;
  quantity: number; // positive or negative delta
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string;
  idempotencyKey?: string;
  notes?: string;
  createdBy?: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
}

export interface CustomerCommunicationPreferences {
  whatsappAllowed: boolean;
  marketingAllowed: boolean;
  operationalAllowed: boolean;
  debtRemindersAllowed: boolean;
  preferredChannel: 'whatsapp' | 'sms' | 'phone' | 'email';
  optedOut: boolean;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  notes?: string;
  totalPurchases: number;
  amountPaid: number;
  currentDebt: number;
  debtBalance?: number;
  availableCredit?: number;
  salesCount?: number;
  transactionCount?: number;
  averageTransactionValue?: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  lastTransactionDate?: string;
  daysSinceLastPurchase?: number;
  segment?: string;
  segments?: string[];
  communicationPreferences?: CustomerCommunicationPreferences;
  loyalty?: CustomerLoyaltyProfile;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerSegment =
  | 'New'
  | 'Active'
  | 'Frequent'
  | 'High Value'
  | 'Inactive'
  | 'Debtor'
  | 'Credit Risk';

export interface CustomerIntelligenceSummary {
  totalCustomers: number;
  activeCustomersCount: number;
  newCustomersCount: number;
  frequentCustomersCount: number;
  inactiveCustomersCount: number;
  debtorsCount: number;
  totalCustomerDebt: number;
  averageCustomerDebt: number;
  totalCreditLimitExposure: number;
  creditUtilizationPercent: number;
  customersNearCreditLimit: number;
  customersExceedingCreditLimit: number;
  oldestOutstandingDebtDate?: string;
}

export interface CustomerIntelligenceItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalPurchases: number;
  periodPurchases?: number;
  transactionCount: number;
  periodTxCount?: number;
  unitsPurchased: number;
  averageTransactionValue: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  daysSinceLastPurchase?: number;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  segment: string;
  segments: string[];
}

export interface CustomerIntelligence {
  dateRange: {
    fromDate: string;
    toDate: string;
    label: string;
    range: string;
  };
  summary: CustomerIntelligenceSummary;
  topCustomers: CustomerIntelligenceItem[];
  frequentCustomers: CustomerIntelligenceItem[];
  inactiveCustomers: CustomerIntelligenceItem[];
  debtorCustomers: CustomerIntelligenceItem[];
  segmentsSummary: {
    newCount: number;
    activeCount: number;
    frequentCount: number;
    highValueCount: number;
    inactiveCount: number;
    debtorCount: number;
    creditRiskCount: number;
  };
}

export interface Debtor {
  customer: Customer;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalCreditSales: number;
  totalPaid: number;
  amountOwed: number; // outstanding debt
  creditLimit: number;
  availableCredit: number;
  lastCreditSaleDate?: string;
  lastCreditSaleReceipt?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  dueDate?: string;
  daysOverdue?: number;
  status: DebtStatus;
  salesCount: number;
}

export interface DebtPaymentReceipt {
  paymentNumber: string;
  date: string;
  businessName: string;
  businessPhone?: string;
  businessLocation?: string;
  customerName: string;
  customerPhone?: string;
  originalDebt: number;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  remainingBalance: number;
  reference?: string;
  notes?: string;
  cashier: string;
}

export interface CustomerStatement {
  customer: Customer;
  sales: Sale[];
  payments: CustomerPayment[];
  totalPurchases?: number;
  totalPaid?: number;
  currentDebt?: number;
  lastPurchaseDate?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  total: number;
  profit: number;
}

export interface Sale {
  id: string;
  businessId: string;
  receiptNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number; // >0 means debt
  dueDate?: string;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid';
  notes?: string;
  status: 'Completed' | 'Refunded' | 'Cancelled';
  createdBy: string;
  staffId?: string;
  cashierName?: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  paymentNumber?: string;
  businessId: string;
  customerId: string;
  customerName: string;
  saleId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  date: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Transport'
  | 'Salaries'
  | 'Internet'
  | 'Supplies'
  | 'Maintenance'
  | 'Marketing'
  | 'Other';

export interface Expense {
  id: string;
  businessId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string;
  reference?: string;
  createdBy: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: 'Active' | 'Inactive';
  totalPurchases?: number;
  purchaseCount?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  buyingPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  businessId: string;
  supplierId?: string;
  supplierName: string;
  invoiceNumber?: string;
  items: PurchaseItem[];
  totalAmount: number;
  purchaseDate?: string;
  date?: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Credit';
  paymentMethod?: PaymentMethod;
  idempotencyKey?: string;
  createdBy?: string;
  notes?: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  businessId: string;
  type: 'low_stock' | 'out_of_stock' | 'debt_overdue' | 'invoice_overdue' | 'sale_completed' | 'payment_received' | 'sale' | 'payment' | 'proactive_alert' | 'task_reminder' | 'workflow_alert' | 'security';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export type AppNotification = Notification;

export type SubscriptionPlanType = 'free' | 'starter' | 'business';
export type SubscriptionStatus =
  | 'active'
  | 'pending'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED';

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

export interface Subscription {
  id: string;
  businessId: string;
  plan: 'free' | 'starter' | 'business' | 'FREE' | 'STARTER' | 'BUSINESS' | string;
  status: SubscriptionStatus | string;
  amount: number;
  currency: string;
  interval: string;
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
  paymentReference?: string;
  paymentProvider?: string;
  startedAt?: string;
  expiresAt?: string;
  priceGh?: number;
  // Stage 4R lifecycle & billing extensions
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  gracePeriodStart?: string;
  gracePeriodEnd?: string;
  cancelledAt?: string;
  cancellationEffectiveAt?: string;
  cancellationReason?: string;
  renewalStatus?: 'RENEW_AUTO' | 'RENEW_MANUAL' | 'DO_NOT_RENEW';
  provider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  downgradeRequestedPlan?: string;
  downgradeEffectiveAt?: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  subscriptionId: string;
  plan: string;
  billingInterval: 'monthly' | 'annual';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
  currency: string; // 'GHS'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'VOID' | 'REFUNDED';
  paymentReference?: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
  pdfUrl?: string;
  receiptNumber?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionUsageSummary {
  businessId: string;
  plan: string;
  effectivePlan: string;
  status: string;
  staffCount: number;
  maxStaff: number;
  locationCount: number;
  maxLocations: number;
  productCount: number;
  maxProducts: number;
  customerCount: number;
  maxCustomers: number;
  monthlyTransactionCount: number;
  maxMonthlyTransactions: number;
  limitsReached: {
    staff: boolean;
    locations: boolean;
    products: boolean;
    customers: boolean;
    transactions: boolean;
  };
}

export interface AuditLog {
  id: string;
  businessId?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt?: string;
  timestamp?: string;
  ipAddress?: string;
  module?: string;
  severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface DashboardStockAlert {
  productId: string;
  productName: string;
  quantity: number;
  minStockLevel: number;
  status: 'low_stock' | 'out_of_stock';
  category?: string;
  buyingPrice?: number;
  sellingPrice?: number;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  todayExpenses: number;
  moneyOwedToYou: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue?: number;
  stockAlerts?: DashboardStockAlert[];
  recentSales: Sale[];
  bestSellingProducts: {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  salesOverTime: {
    date: string;
    sales: number;
    expenses: number;
    profit?: number;
  }[];
  yesterdaySales?: number;
  past7DaysSales?: number;
  past7DaysExpenses?: number;
  past7DaysProfit?: number;
  todaySalesCount?: number;
}

export interface FinancialReport {
  range: string;
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  costOfGoods: number;
  totalCost?: number;
  grossProfit: number;
  grossMargin?: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  averageTransactionValue?: number;
  cashSales?: number;
  momoSales?: number;
  bankTransferSales?: number;
  cardSales?: number;
  creditSales?: number;
  totalDiscount?: number;
  amountCollected?: number;
  outstandingSalesBalance?: number;
  expensesByCategory: { category: string; amount: number; count?: number }[];
  expenseByCategory?: Record<string, number>;
  expensesByPaymentMethod?: { method: string; amount: number; count?: number }[];
  expenseCount?: number;
  highestExpenseCategory?: string | null;
  salesByPaymentMethod: { method: string; amount: number; count?: number }[];
  salesByPaymentMethodRecord?: Record<string, number>;
  inventoryValuation: {
    totalQuantity: number;
    totalCostValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
  inventory?: {
    totalQuantity: number;
    costValue: number;
    retailValue: number;
    expectedProfit: number;
  };
  totalDebtOwed: number;
  totalCustomerDebt?: number;
  debtorsCount?: number;
  topDebtors?: {
    id: string;
    name: string;
    phone?: string;
    currentDebt: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    profit?: number;
    totalProfit?: number;
  }[];
  productPerformance?: any[];
  purchasesTotal?: number;
  purchaseCount?: number;
  purchasesBySupplier?: {
    supplierId: string;
    supplierName: string;
    totalAmount: number;
    count: number;
  }[];
}

export interface SubscriptionPayment {
  id: string;
  reference: string;
  businessId: string;
  userId?: string;
  subscriptionId?: string;
  businessName?: string;
  ownerName?: string;
  ownerEmail?: string;
  customerEmail?: string;
  plan: SubscriptionPlan | string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'abandoned' | 'Successful' | 'Pending' | 'Failed' | string;
  provider?: 'paystack' | 'manual_admin' | 'none' | string;
  paymentMethod?: string;
  paystackTransactionId?: string | number;
  paymentDate?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface AdminBusinessItem {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  type: BusinessType | string;
  location: string;
  phone: string;
  email: string;
  currency: string;
  plan: 'FREE' | 'STARTER' | 'BUSINESS' | string;
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'pending' | string;
  status: 'Active' | 'Suspended';
  createdAt: string;
  updatedAt?: string;
  totalSalesCount?: number;
  totalSalesRevenue?: number;
  totalProductsCount?: number;
  totalCustomersCount?: number;
}

export interface AdminSubscriptionItem {
  id: string;
  businessId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  plan: 'free' | 'starter' | 'business' | 'FREE' | 'STARTER' | 'BUSINESS' | string;
  amount: number;
  currency: string;
  interval: string;
  status: SubscriptionStatus | string;
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  paymentReference?: string;
  paymentProvider?: string;
  createdAt: string;
  updatedAt?: string;
  // Backward compatibility:
  planPrice?: number;
  startedAt?: string;
  expiresAt?: string;
  paymentStatus?: string;
}

export interface AdminDashboardData {
  totalBusinesses: number;
  activeBusinesses: number;
  freePlanCount: number;
  starterPlanCount: number;
  businessPlanCount: number;
  totalPlatformRevenue: number;
  newBusinessesThisMonth: number;
  activeSubscriptions: number;
  recentBusinesses: AdminBusinessItem[];
}

export interface AdminActivityItem {
  id: string;
  businessId?: string;
  businessName?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
  timestamp?: string;
}

export interface AdminSummary {
  totalBusinesses: number;
  totalUsers: number;
  totalSales: number;
  platformRevenue: number;
  planBreakdown: {
    Free: number;
    Starter: number;
    Business: number;
  };
}

export interface InventoryOverview {
  totalProducts: number;
  totalStockUnits: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryCostValue?: number;
  potentialRetailValue: number;
  potentialGrossMargin?: number;
  potentialGrossMarginPercentage?: number;
}

export interface InventoryItemAlert {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  shortfall: number;
  sellingPrice: number;
  buyingPrice?: number;
  stockStatus: 'OUT OF STOCK' | 'LOW STOCK' | 'IN STOCK';
  supplierId?: string;
  supplierName?: string;
  lastRestockedAt?: string;
  lastRestockQuantity?: number;
}

export interface FastMovingProduct {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  quantitySold: number;
  revenue: number;
  transactionCount: number;
}

export interface SlowMovingProduct {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  quantitySold: number;
  revenue: number;
}

export interface NeverSoldProduct {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  sellingPrice: number;
  tiedUpCapital?: number;
  createdAt: string;
}

export interface CategoryInventoryBreakdown {
  category: string;
  productCount: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesUnits: number;
  revenue: number;
  inventoryCost?: number;
}

export interface SupplierInventoryBreakdown {
  supplierId: string;
  supplierName: string;
  productCount: number;
  totalStockUnits: number;
  totalPurchasesCount: number;
  totalPurchasedUnits: number;
  lastRestockDate?: string;
}

export interface InventoryIntelligence {
  dateRange: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  overview: InventoryOverview;
  lowStockProducts: InventoryItemAlert[];
  outOfStockProducts: InventoryItemAlert[];
  fastMovingProducts: FastMovingProduct[];
  slowMovingProducts: {
    items: SlowMovingProduct[];
    hasSufficientHistory: boolean;
    message?: string;
  };
  neverSoldProducts: NeverSoldProduct[];
  categoryBreakdown: CategoryInventoryBreakdown[];
  supplierAnalytics: SupplierInventoryBreakdown[];
  recentMovements: StockMovement[];
}

// Stage 4I: Staff Performance & Management Intelligence Types
export interface StaffProductPerformance {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface StaffPerformanceItem {
  id: string;
  staffId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  rank: number;
  totalSalesValue: number;
  transactionCount: number;
  unitsSold: number;
  averageTransactionValue: number;
  profitGenerated?: number;
  cashCollected: number;
  creditSalesAmount: number;
  creditSalesCount: number;
  discountsGiven: number;
  firstSaleDate?: string;
  lastSaleDate?: string;
  paymentMethodBreakdown: Record<string, { count: number; amount: number }>;
  topProducts: StaffProductPerformance[];
}

export interface StaffPerformanceSummary {
  totalStaffCount: number;
  activeStaffCount: number;
  totalSalesValue: number;
  totalTransactions: number;
  totalUnitsSold: number;
  averageSalesPerStaff: number;
  totalDiscountsGiven: number;
  totalCashCollected: number;
  totalCreditOriginated: number;
  totalProfit?: number;
  topPerformer?: {
    id: string;
    name: string;
    salesValue: number;
    transactionCount: number;
  };
  highestVolumeStaff?: {
    id: string;
    name: string;
    transactionCount: number;
    salesValue: number;
  };
}

export interface HourlyDistributionItem {
  hour: number;
  label: string;
  hourLabel?: string;
  salesCount: number;
  totalRevenue: number;
  averageTransactionValue: number;
}

export interface DayOfWeekDistributionItem {
  dayIndex: number;
  dayName: string;
  salesCount: number;
  totalRevenue: number;
  averageTransactionValue: number;
}

export interface ManagementRecommendation {
  id: string;
  category: 'staffing' | 'inventory' | 'credit' | 'payments' | 'performance';
  type: 'insight' | 'warning' | 'tip' | 'praise';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionLink?: string;
}

export interface ManagementIntelligence {
  dateRange: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  staffSummary: StaffPerformanceSummary;
  staffPerformance: StaffPerformanceItem[];
  hourlyDistribution: HourlyDistributionItem[];
  peakOperatingHours: {
    peakHour: number;
    peakHourLabel: string;
    salesCount: number;
    totalRevenue: number;
    busiestTimeOfDay: string;
  };
  dayOfWeekDistribution: DayOfWeekDistributionItem[];
  busiestDay: {
    dayName: string;
    salesCount: number;
    totalRevenue: number;
  };
  slowestDay: {
    dayName: string;
    salesCount: number;
    totalRevenue: number;
  };
  paymentMethodMix: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  debtVelocity: {
    debtOriginated: number;
    debtCollected: number;
    netDebtChange: number;
    collectionEfficiencyPercent: number;
  };
  recommendations: ManagementRecommendation[];
}

// ---------------------------------------------------------------------------
// STAGE 4J: BUSINESS GROWTH, SALES INTELLIGENCE & DECISION SUPPORT
// ---------------------------------------------------------------------------

export interface GrowthSalesIntelligence {
  totalRevenue: number;
  transactionCount: number;
  unitsSold: number;
  averageTransactionValue: number;
  hasComparison: boolean;
  comparisonLabel: string;
  previousRevenue?: number;
  previousTransactions?: number;
  previousUnits?: number;
  previousAverageTransactionValue?: number;
  revenueGrowthPct: number | null;
  revenueGrowthDelta: number;
  transactionGrowthPct: number | null;
  unitsGrowthPct: number | null;
  atvGrowthDelta: number;
}

export type ProductPerformanceTrend = 'Growing' | 'Stable' | 'Declining' | 'Insufficient Data';

export interface ProductPerformanceIntelligenceItem {
  productId: string;
  productName: string;
  sku?: string;
  category: string;
  unitsSold: number;
  revenueGenerated: number;
  averageSellingPrice: number;
  salesFrequency: number;
  firstSaleDate?: string;
  mostRecentSaleDate?: string;
  stockCurrentlyAvailable: number;
  minStockLevel: number;
  velocity: number; // units sold per day in current range
  stockCoverageDays: number | null; // estimated days of stock remaining
  trend: ProductPerformanceTrend;
  previousUnitsSold?: number;
  previousRevenue?: number;
  unitsDelta?: number;
  revenueDelta?: number;
  unitsGrowthPct?: number | null;
  revenueGrowthPct?: number | null;
  // Protected Financial Metrics (omitted or undefined for unauthorized staff)
  buyingPrice?: number;
  cogs?: number;
  grossProfit?: number;
  grossMargin?: number;
}

export interface CategoryIntelligenceItem {
  category: string;
  productCount: number;
  revenue: number;
  unitsSold: number;
  transactionCount: number;
  stockExposure: number; // units in stock
  trend: ProductPerformanceTrend;
  revenueGrowthPct?: number | null;
  previousRevenue?: number;
  // Protected
  grossProfit?: number;
  grossMargin?: number;
}

export interface InactiveValuableCustomerItem {
  customerId: string;
  name: string;
  phone?: string;
  clv: number;
  totalOrders: number;
  lastPurchaseDate?: string;
  daysSinceLastPurchase: number;
  currentDebt: number;
}

export interface CustomerValueIntelligence {
  totalCustomers: number;
  activeCustomersCount: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  returningCustomerRatePct: number;
  inactiveValuableCustomers: InactiveValuableCustomerItem[];
  topCustomersByRevenue: {
    customerId: string;
    name: string;
    phone?: string;
    totalSpend: number;
    orderCount: number;
    lastPurchaseDate?: string;
  }[];
}

export interface GrowthPaymentIntelligenceItem {
  method: string;
  count: number;
  amount: number;
  percentage: number;
  previousAmount?: number;
  growthPct?: number | null;
}

export interface ProfitabilityIntelligence {
  isRestricted: boolean; // True if user cannot view profit
  revenue: number;
  cogs?: number;
  grossProfit?: number;
  grossMargin?: number;
  operatingExpenses?: number;
  netProfit?: number;
  netMargin?: number;
  previousNetProfit?: number;
  profitGrowthPct?: number | null;
}

export interface ExpenseIntelligence {
  totalExpenses: number;
  expenseCount: number;
  previousTotalExpenses?: number;
  expenseGrowthPct?: number | null;
  highestExpenseCategory?: {
    category: string;
    amount: number;
  };
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    amount: number;
    percentage: number;
  }[];
}

export type GrowthSignalSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface BusinessGrowthSignal {
  id: string;
  signalType:
    | 'revenue_growth'
    | 'revenue_decline'
    | 'product_opportunity'
    | 'stock_risk'
    | 'customer_retention_risk'
    | 'credit_risk'
    | 'expense_pressure'
    | 'profit_pressure';
  severity: GrowthSignalSeverity;
  title: string;
  reason: string;
  supportingMetric: string;
  dateRange: string;
  recommendedAction: string;
  actionLink?: string;
}

export interface ManagementActionRecommendation {
  id: string;
  category: 'restock' | 'promotion' | 'customer_retention' | 'expense_control' | 'pricing_margin' | 'credit_collection';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionLink?: string;
  urgency?: 'immediate' | 'soon' | 'optional';
}

export interface BusinessHealthIndicator {
  name: string;
  status: 'Strong' | 'Healthy' | 'Normal' | 'Caution' | 'Needs Attention' | 'Critical' | 'Loss Making' | 'Restricted' | 'Elevated' | 'High' | 'High Risk' | 'Controlled';
  color: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  score: number; // 0 to 100
  metric: string;
  insight: string;
}

export interface BusinessHealthSummary {
  overallHealth: 'Excellent' | 'Good' | 'Attention Needed' | 'Critical';
  score: number; // 0 to 100
  summary: string;
  indicators: {
    salesHealth: BusinessHealthIndicator;
    customerHealth: BusinessHealthIndicator;
    inventoryHealth: BusinessHealthIndicator;
    cashFlowHealth: BusinessHealthIndicator;
    debtHealth: BusinessHealthIndicator;
    expenseHealth: BusinessHealthIndicator;
    profitabilityHealth: BusinessHealthIndicator;
  };
}

export interface GrowthDecisionSupportPayload {
  dateRange: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
    hasComparison: boolean;
    comparisonRange?: {
      fromDate: string;
      toDate: string;
      label: string;
    } | null;
    comparisonReason?: string;
  };
  salesIntelligence: GrowthSalesIntelligence;
  topRevenueProducts: ProductPerformanceIntelligenceItem[];
  topProfitProducts?: ProductPerformanceIntelligenceItem[];
  topUnitsProducts: ProductPerformanceIntelligenceItem[];
  fastestMovingProducts: ProductPerformanceIntelligenceItem[];
  decliningProducts: ProductPerformanceIntelligenceItem[];
  slowMovingProducts: ProductPerformanceIntelligenceItem[];
  neverSoldProducts: ProductPerformanceIntelligenceItem[];
  lowStockFastMovers: ProductPerformanceIntelligenceItem[];
  allProductsPerformance: ProductPerformanceIntelligenceItem[];
  categoryIntelligence: CategoryIntelligenceItem[];
  strongestCategory?: CategoryIntelligenceItem;
  fastestGrowingCategory?: CategoryIntelligenceItem;
  decliningCategory?: CategoryIntelligenceItem;
  inventoryPressureCategory?: CategoryIntelligenceItem;
  customerIntelligence: CustomerValueIntelligence;
  timeIntelligence: {
    hourlyDistribution: HourlyDistributionItem[];
    peakOperatingHours: {
      peakHour: number;
      peakHourLabel: string;
      salesCount: number;
      totalRevenue: number;
      busiestTimeOfDay: string;
    };
    dayOfWeekDistribution: DayOfWeekDistributionItem[];
    busiestDay: {
      dayName: string;
      salesCount: number;
      totalRevenue: number;
    };
    slowestDay: {
      dayName: string;
      salesCount: number;
      totalRevenue: number;
    };
  };
  paymentIntelligence: GrowthPaymentIntelligenceItem[];
  paymentMethodIntelligence?: GrowthPaymentIntelligenceItem[];
  staffIntelligence?: {
    staffCount: number;
    staffLeaderboard: Array<{
      staffId: string;
      staffName?: string;
      salesCount: number;
      totalRevenue: number;
    }>;
  };
  profitabilityIntelligence: ProfitabilityIntelligence;
  expenseIntelligence: ExpenseIntelligence;
  growthSignals: BusinessGrowthSignal[];
  recommendations: ManagementActionRecommendation[];
  healthSummary: BusinessHealthSummary;
}

// ----------------------------------------------------
// STAGE 4K: BUSINESS FORECASTING, PLANNING & PROACTIVE OPERATIONS
// ----------------------------------------------------

export type ForecastingConfidence = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT DATA';
export type TrendDirection = 'GROWING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT DATA';
export type DemandTrend = 'INCREASING' | 'STABLE' | 'DECLINING' | 'NO_DEMAND' | 'INSUFFICIENT_DATA';
export type RestockAttentionLevel =
  | 'Adequate'
  | 'Monitor'
  | 'Restock Soon'
  | 'Critical'
  | 'No Current Demand'
  | 'Insufficient Data';

export interface ForecastMetadata {
  periodAnalyzed: {
    fromDate: string;
    toDate: string;
    label: string;
    daysCount: number;
  };
  dataPointsUsed: {
    salesCount: number;
    activeDaysCount: number;
    productsCount: number;
    customersCount: number;
    expensesCount: number;
  };
  calculationMethod: string;
  confidenceIndicator: ForecastingConfidence;
  importantLimitations: string[];
  disclaimer: string;
}

export interface SalesForecastOutlook {
  currentPeriodRevenue: number;
  previousPeriodRevenue: number;
  revenueGrowthPct: number | null;
  averageDailyRevenue: number;
  averageTransactionValue: number;
  transactionVelocity: number;
  unitVelocity: number;
  dailyRunRate: number;
  weeklyRunRate: number;
  monthlyRunRate: number;
  runRateLabel: 'ESTIMATE';
  projectedRevenue: number | null;
  projectedTransactions: number | null;
  projectedUnits: number | null;
  projectedAverageTransactionValue: number | null;
  trendDirection: TrendDirection;
  isEstimate: true;
  confidence: ForecastingConfidence;
}

export interface ProductDemandPlanningItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  historicalUnitsSold: number;
  previousUnitsSold?: number;
  unitChangePct?: number | null;
  averageDailyUnitsSold: number;
  salesVelocity: number;
  daysOfStockCoverage: number | null;
  daysOfStockCoverageLabel: string;
  estimatedDepletionDate: string | null;
  restockAttentionLevel: RestockAttentionLevel;
  demandTrend: DemandTrend;
  demandTrendExplanation: string;
  recommendedReorderUnits: number;
  supplierId?: string;
  supplierName?: string;
  buyingPrice?: number;
  estimatedRestockCost?: number;
}

export interface InventoryDemandPlanningOutlook {
  totalProductsAssessed: number;
  criticalCount: number;
  restockSoonCount: number;
  monitorCount: number;
  adequateCount: number;
  noDemandCount: number;
  products: ProductDemandPlanningItem[];
}

export interface CategoryPlanningItem {
  category: string;
  currentRevenue: number;
  previousRevenue: number;
  revenueGrowthPct: number | null;
  currentUnits: number;
  previousUnits: number;
  unitGrowthPct: number | null;
  contributionPct: number;
  trendDirection: TrendDirection;
  operationalAttention: string;
}

export interface CustomerPlanningItem {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  segment: string;
  totalHistoricalSpend: number;
  periodSpend: number;
  daysSinceLastPurchase: number;
  trend: 'ACTIVE' | 'DECLINING_FREQUENCY' | 'AT_RISK_INACTIVE' | 'RETURNING' | 'NEW';
  statusDescription: string;
  outstandingDebt: number;
}

export interface CustomerPlanningOutlook {
  totalCustomers: number;
  inactiveValuableCount: number;
  decliningFrequencyCount: number;
  debtorsNeedingAttentionCount: number;
  customers: CustomerPlanningItem[];
}

export interface ReceivablesPlanningOutlook {
  totalOutstandingReceivables: number;
  overdueReceivables: number;
  debtorCount: number;
  periodRepayments: number;
  periodCreditExtended: number;
  collectionAttentionSummary: string;
  topDebtors: Array<{
    customerId: string;
    customerName: string;
    customerPhone?: string;
    amountOwed: number;
    daysOverdue: number;
    dueDate?: string;
  }>;
}

export interface ExpensePlanningOutlook {
  currentExpenses: number;
  previousExpenses: number;
  expenseGrowthPct: number | null;
  trendingUpCategories: Array<{
    category: string;
    currentAmount: number;
    previousAmount: number;
    growthPct: number;
    message: string;
  }>;
  majorExpenseCategories: Array<{
    category: string;
    amount: number;
    sharePct: number;
  }>;
}

export interface ProfitabilityPlanningOutlook {
  isRestricted: boolean;
  currentRevenue?: number;
  projectedRevenue?: number;
  currentCOGS?: number;
  projectedCOGS?: number;
  currentGrossProfit?: number;
  projectedGrossProfit?: number;
  currentExpenses?: number;
  projectedExpenses?: number;
  currentNetProfit?: number;
  projectedNetProfit?: number;
  currentGrossMargin?: number;
  projectedGrossMargin?: number;
  marginTrend?: 'EXPANDING' | 'STABLE' | 'CONTRACTING' | 'INSUFFICIENT DATA';
  notes?: string;
}

export interface BusinessPlanningScenario {
  scenarioName: string;
  scenarioType: 'current_trend' | 'improved_sales' | 'reduced_sales' | 'expense_change' | 'custom';
  description: string;
  isScenario: true;
  assumptions: string[];
  salesAdjustmentPct: number;
  expenseDeltaGHS: number;
  estimatedRevenue: number;
  estimatedCOGS?: number;
  estimatedGrossProfit?: number;
  estimatedExpenses: number;
  estimatedNetProfit?: number;
  estimatedGrossMargin?: number;
  disclaimer: string;
}

export interface BusinessForecastPayload {
  businessId: string;
  currency: string;
  metadata: ForecastMetadata;
  salesOutlook: SalesForecastOutlook;
  inventoryOutlook: InventoryDemandPlanningOutlook;
  categoryOutlook: CategoryPlanningItem[];
  customerOutlook: CustomerPlanningOutlook;
  receivablesOutlook: ReceivablesPlanningOutlook;
  expenseOutlook: ExpensePlanningOutlook;
  profitabilityOutlook: ProfitabilityPlanningOutlook;
  scenarios: BusinessPlanningScenario[];
  proactiveAlertsCount: number;
}

// ==========================================
// STAGE 4L: CONTROLLED WORKFLOWS & OPERATIONS
// ==========================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'snoozed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskSource =
  | 'Inventory Intelligence'
  | 'Customer Intelligence'
  | 'Debt Management'
  | 'Expense Intelligence'
  | 'Sales Intelligence'
  | 'Forecasting'
  | 'Manual'
  | 'Scheduled Review'
  | 'Customer Engagement'
  | 'Communications'
  | 'Operations';

export interface TaskEvidence {
  metricLabel?: string;
  currentValue?: string | number;
  threshold?: string | number;
  details?: string;
  sourceModule?: string;
}

export interface BusinessTask {
  id: string;
  businessId: string;
  title: string;
  description: string;
  source: TaskSource;
  sourceEntityId?: string;
  evidence?: TaskEvidence;
  actionUrl?: string;
  actionLabel?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId?: string;
  assignedToName?: string;
  dueDate?: string; // YYYY-MM-DD
  snoozedUntil?: string; // ISO date string
  completedAt?: string;
  completedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  dedupKey: string;
  locationId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRules {
  businessId: string;
  stockCoverageDaysThreshold: number; // default: 3
  minStockRestockAlert: boolean; // default: true
  customerInactivityDaysThreshold: number; // default: 30
  debtOverdueDaysThreshold: number; // default: 7
  expenseSurgeThresholdPct: number; // default: 25
  enableDailyReview: boolean; // default: true
  enableWeeklyReview: boolean; // default: true
  autoNotifyStaff: boolean; // default: true
  updatedAt?: string;
}

export interface OperationsCenterSummary {
  businessId: string;
  generatedAt: string;
  totalPending: number;
  dueToday: number;
  overdue: number;
  critical: number;
  assignedToMe: number;
  completedCount: number;
  dismissedCount: number;
  bySource: Record<string, number>;
  byPriority: Record<string, number>;
  recentTasks: BusinessTask[];
  rules: AutomationRules;
}

// ==========================================
// STAGE 4M: BUSINESS COMMUNICATIONS & ENGAGEMENT
// ==========================================

export type CommunicationType =
  | 'DEBT_REMINDER'
  | 'PAYMENT_CONFIRMATION'
  | 'PURCHASE_FOLLOW_UP'
  | 'CUSTOMER_APPRECIATION'
  | 'INACTIVE_CUSTOMER'
  | 'VIP_FOLLOW_UP'
  | 'SERVICE_FOLLOW_UP'
  | 'GENERAL_CUSTOMER_MESSAGE'
  | 'LOYALTY_MILESTONE'
  | 'LOYALTY_REWARD'
  | 'REFERRAL_ACKNOWLEDGEMENT'
  | 'LOYALTY_TIER_UPDATE';

export type CommunicationChannel = 'whatsapp' | 'in_app' | 'internal_task' | 'sms';

export type CommunicationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'READY'
  | 'OPENED'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export interface CommunicationRecord {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  templateId?: string;
  message: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  status: CommunicationStatus;
  createdAt: string;
  updatedAt?: string;
  scheduledAt?: string;
  openedAt?: string;
  sentAt?: string;
  relatedTaskId?: string;
  relatedWorkflowId?: string;
  relatedEntityId?: string;
  dedupKey?: string;
  whatsappUrl?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationTemplate {
  id: string;
  businessId: string; // 'system' or tenant ID
  name: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  subject?: string;
  content: string;
  variables: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunicationOpportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: CommunicationType;
  channel: CommunicationChannel;
  reason: string;
  recommendedMessage: string;
  suggestedTemplateId?: string;
  urgency: 'high' | 'normal' | 'low';
  relatedEntityId?: string;
  metadata?: Record<string, any>;
  dedupKey: string;
  hasActiveTask?: boolean;
  relatedTaskId?: string;
}

export interface CommunicationSummary {
  businessId: string;
  generatedAt: string;
  totalCommunications: number;
  draftsCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  openedCount: number;
  opportunitiesCount: number;
  optedOutCustomersCount?: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
}

// ==========================================
// STAGE 4N: LOYALTY, RETENTION & CUSTOMER GROWTH
// ==========================================

export type LoyaltyTier = 'Standard' | 'Silver' | 'Gold' | 'VIP';

export type LoyaltyLedgerType =
  | 'PURCHASE_EARNED'
  | 'PURCHASE_REVERSED'
  | 'REWARD_REDEEMED'
  | 'MANUAL_ADJUSTMENT'
  | 'REFERRAL_REWARD'
  | 'MILESTONE_REWARD'
  | 'EXPIRATION';

export type CustomerRetentionStatus =
  | 'NEW'
  | 'RETURNING'
  | 'LOYAL'
  | 'HIGHLY_ENGAGED'
  | 'AT_RISK'
  | 'INACTIVE'
  | 'RE_ENGAGEMENT_OPPORTUNITY';

export interface LoyaltyTierConfig {
  tier: LoyaltyTier;
  minSpend: number;
  minOrders: number;
  multiplier: number;
  perksDescription: string;
}

export interface LoyaltyConfig {
  businessId: string;
  enabled: boolean;
  pointsPerCurrencyUnit: number;
  minimumPurchaseForPoints: number;
  minimumPointsToRedeem: number;
  pointValue: number;
  pointValueGhs?: number;
  pointsExpiryDays: number;
  allowReferralRewards: boolean;
  referralRewardPoints: number;
  referralMinPurchase?: number;
  allowMilestoneRewards: boolean;
  requireApprovalForRewards: boolean;
  tiers: LoyaltyTierConfig[];
  updatedAt: string;
  updatedBy?: string;
}

export interface LoyaltyLedgerEntry {
  id: string;
  businessId: string;
  customerId: string;
  type: LoyaltyLedgerType;
  points: number;
  balanceAfter: number;
  referenceId?: string;
  referenceType?: 'sale' | 'referral' | 'milestone' | 'redemption' | 'manual' | 'expiry';
  description: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  dedupKey?: string;
}

export interface LoyaltyMilestoneRecord {
  id: string;
  businessId: string;
  customerId: string;
  milestoneCode: string;
  title: string;
  description: string;
  rewardPoints: number;
  pointsAwarded?: number;
  completedAt: string;
  dedupKey: string;
}

export interface LoyaltyReferral {
  id: string;
  businessId: string;
  referrerCustomerId: string;
  referrerCustomerName?: string;
  referredCustomerId: string;
  referredCustomerName?: string;
  referredCustomerPhone?: string;
  status: 'PENDING' | 'QUALIFIED' | 'COMPLETED' | 'CANCELLED';
  qualifyingSaleId?: string;
  qualifyingSaleTotal?: number;
  rewardPoints: number;
  rewardStatus: 'PENDING' | 'AWARDED' | 'NOT_ELIGIBLE';
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface LoyaltyRewardRedemption {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  pointsRedeemed: number;
  monetaryValueGhs: number;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  code: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CustomerLoyaltyProfile {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  tier: LoyaltyTier;
  tierDescription: string;
  tierQualificationReason?: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  completedPurchasesCount: number;
  totalPurchaseValue: number;
  averageOrderValue: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  daysSinceLastPurchase?: number;
  retentionStatus: CustomerRetentionStatus;
  retentionExplanation: string;
  milestones: LoyaltyMilestoneRecord[];
  referrals: LoyaltyReferral[];
  eligibleRewards: {
    canRedeem: boolean;
    availablePoints: number;
    estimatedValueGhs: number;
    minimumRequiredPoints: number;
  };
}

export interface LoyaltyAnalytics {
  businessId: string;
  generatedAt: string;
  totalMembers: number;
  totalMembersCount?: number;
  activeMembers: number;
  activeMembersCount?: number;
  membersWithPoints: number;
  pointsIssued: number;
  pointsRedeemed: number;
  totalPointsRedeemed?: number;
  pointsOutstanding: number;
  totalPointsCirculating?: number;
  circulatingPointsMonetaryValueGhs?: number;
  byTier: Record<LoyaltyTier, number>;
  byRetentionStatus: Record<CustomerRetentionStatus, number>;
  repeatCustomerRate: number;
  repeatCustomerRatePercent?: number;
  retentionRate: number;
  retentionRatePercent?: number;
  atRiskCount: number;
  inactiveCount: number;
  milestoneCompletionsCount: number;
  referralCount: number;
  referralConversionsCount: number;
  estimatedLiabilityGhs?: number;
}

export type LoyaltyMilestoneCode =
  | 'FIRST_PURCHASE'
  | 'PURCHASE_COUNT_5'
  | 'PURCHASE_COUNT_10'
  | 'PURCHASE_COUNT_20'
  | 'SPEND_GHS_500'
  | 'SPEND_GHS_1000'
  | 'SPEND_GHS_2000'
  | 'SPEND_GHS_5000'
  | 'POINTS_EARNED_100';

export interface LoyaltyOpportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  type:
    | 'AT_RISK_INACTIVITY'
    | 'VIP_INACTIVITY'
    | 'MILESTONE_APPROACHING'
    | 'MILESTONE_ACHIEVED'
    | 'REWARD_ELIGIBLE'
    | 'REFERRAL_QUALIFIED'
    | 'RETURNING_CUSTOMER';
  tier: LoyaltyTier;
  reason: string;
  recommendedAction: string;
  suggestedMessage?: string;
  urgency: 'high' | 'normal' | 'low';
  pointsBalance?: number;
  dedupKey: string;
}

// ==========================================
// STAGE 4O: BUSINESS ADMINISTRATION, GOVERNANCE, AUDIT & OPERATIONAL CONTROL
// ==========================================

export interface OperationalPolicies {
  allowStaffStockAdjustment: boolean;
  allowStaffCreditSales: boolean;
  allowStaffSaleCancellation: boolean;
  allowStaffManualLoyaltyAdjust: boolean;
  requireApprovalForCreditSale: boolean;
  requireApprovalForStockAdjustment: boolean;
  requireApprovalForSaleCancellation: boolean;
  maxStaffCreditLimitGhs: number;
}

export const DEFAULT_OPERATIONAL_POLICIES: OperationalPolicies = {
  allowStaffStockAdjustment: false,
  allowStaffCreditSales: true,
  allowStaffSaleCancellation: false,
  allowStaffManualLoyaltyAdjust: false,
  requireApprovalForCreditSale: false,
  requireApprovalForStockAdjustment: true,
  requireApprovalForSaleCancellation: true,
  maxStaffCreditLimitGhs: 500,
};

export interface ConfigurationHistoryRecord {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  area: 'business_profile' | 'operational_settings' | 'policies' | 'loyalty' | 'staff_permissions' | 'staff_status' | 'data_repair' | 'staff_access' | 'OPERATIONAL_POLICY';
  action: string;
  previousValue?: any;
  newValue?: any;
  summary: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export type SecurityEventSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type SecurityEventType =
  | 'FAILED_LOGIN'
  | 'UNAUTHORIZED_ACCESS'
  | 'PERMISSION_DENIED'
  | 'CROSS_TENANT_ACCESS_ATTEMPT'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'SUSPICIOUS_ADMIN_ACTIVITY'
  | 'SENSITIVE_CONFIG_CHANGED'
  | 'STAFF_STATUS_SUSPENDED'
  | 'POLICY_VIOLATION_ATTEMPT'
  | 'AUTH_FAILURE'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'POLICY_VIOLATION';

export interface SecurityEvent {
  id: string;
  businessId?: string;
  userId?: string;
  userName?: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  description: string;
  ipAddress?: string;
  endpoint?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface DataIntegrityIssue {
  id: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  category: 'inventory' | 'sales' | 'customers' | 'staff' | 'loyalty' | 'tasks' | 'suppliers' | 'pricing';
  title: string;
  description: string;
  affectedCount: number;
  affectedIds?: string[];
  suggestedAction: string;
  autoRepairable: boolean;
}

export interface DataIntegrityReport {
  generatedAt: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  totalChecks: number;
  issuesCount: number;
  score?: number;
  orphanedEntitiesCount?: number;
  balanceDiscrepanciesCount?: number;
  stockMovementMismatchesCount?: number;
  issues: DataIntegrityIssue[];
}

export interface SystemHealthCheck {
  name: string;
  status: 'HEALTHY' | 'ATTENTION' | 'WARNING' | 'CRITICAL' | 'CHECK_UNAVAILABLE';
  latencyMs?: number;
  details: string;
  lastChecked: string;
}

export interface SystemHealthReport {
  overallStatus: 'HEALTHY' | 'ATTENTION' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  businessId?: string;
  storage?: any;
  sessions?: any;
  performance?: any;
  checks: SystemHealthCheck[];
  metrics: {
    uptimeSeconds: number;
    activeSessions: number;
    totalStaff: number;
    pendingTasksCount: number;
    recentSecurityEventsCount: number;
    recentErrorsCount: number;
  };
}

export interface GovernanceSummaryPayload {
  business: Business;
  settings: BusinessSettings;
  policies?: OperationalPolicies;
  activeStaffCount?: number;
  suspendedStaffCount?: number;
  recentSecurityAlertsCount?: number;
  integrityStatus?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  integrityScore?: number;
  staffSummary: {
    totalStaff: number;
    activeStaff: number;
    suspendedStaff: number;
    inactiveStaff: number;
  };
  securitySummary: {
    totalEvents: number;
    criticalEvents: number;
    highEvents: number;
    recentEvents: SecurityEvent[];
  };
  integritySummary: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issuesCount: number;
  };
  healthSummary: {
    overallStatus: 'HEALTHY' | 'ATTENTION' | 'WARNING' | 'CRITICAL';
    checksCount: number;
  };
  recentAuditLogs: AuditLog[];
  recentConfigChanges: ConfigurationHistoryRecord[];
  pendingApprovalsCount: number;
}

// ============================================================================
// STAGE 4Q — BUSINESS ECOSYSTEM, INTEGRATIONS & EXTERNAL SERVICES READINESS
// ============================================================================

export type IntegrationCategory =
  | 'PAYMENTS'
  | 'BANKING'
  | 'ACCOUNTING'
  | 'TAX'
  | 'MESSAGING'
  | 'EMAIL'
  | 'STORAGE'
  | 'ECOMMERCE'
  | 'LOGISTICS'
  | 'CRM'
  | 'ANALYTICS'
  | 'OTHER';

export type IntegrationStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'DISCONNECTED'
  | 'REVOKED'
  | 'PENDING_REAUTH';

export type IntegrationCapability =
  | 'SYNC_IMPORT'
  | 'SYNC_EXPORT'
  | 'PAYMENT_COLLECTION'
  | 'PAYMENT_VERIFICATION'
  | 'WEBHOOK_RECEIVE'
  | 'MESSAGING_SEND'
  | 'ACCOUNTING_EXPORT'
  | 'RECONCILIATION'
  | 'OAUTH_AUTH';

export type IntegrationScope = 'BUSINESS' | 'LOCATION' | 'ALL_LOCATIONS';

export interface Integration {
  id: string;
  businessId: string;
  provider: string; // e.g. 'momo_gh', 'paystack', 'quickbooks', 'arkesel', 'hubtel', 'woocommerce', 'google_drive'
  category: IntegrationCategory;
  status: IntegrationStatus;
  displayName: string;
  description?: string;
  capabilities: IntegrationCapability[];
  locationScope: IntegrationScope;
  locationId?: string; // Optional if tied to a specific branch/location
  configuration: Record<string, any>; // Client-safe parameters (e.g. merchantId, environment, baseUrl)
  hasCredentials?: boolean; // Indicates if server-side encrypted credentials exist without exposing them
  connectedAt?: string;
  lastSuccessfulSyncAt?: string;
  lastAttemptAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSecret {
  integrationId: string;
  businessId: string;
  encryptedSecret: string; // Server-side stored credentials, excluded from client responses
  updatedAt: string;
}

export type SyncDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';

export type SyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CANCELLED';

export type SyncEntityType =
  | 'products'
  | 'customers'
  | 'sales'
  | 'payments'
  | 'expenses'
  | 'suppliers'
  | 'purchases'
  | 'inventory'
  | 'invoices';

export interface SyncRun {
  id: string;
  businessId: string;
  integrationId: string;
  provider: string;
  direction: SyncDirection;
  entityType: SyncEntityType;
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorSummary?: string;
  checkpoint?: string;
  locationId?: string;
  initiatedBy: string;
}

export type WebhookStatus = 'RECEIVED' | 'VERIFIED' | 'PROCESSED' | 'REJECTED' | 'DUPLICATE' | 'ERROR';

export interface WebhookEvent {
  id: string;
  businessId: string;
  integrationId: string;
  provider: string;
  eventType: string;
  externalEventId: string; // For idempotency
  payloadHash: string;
  receivedAt: string;
  processedAt?: string;
  status: WebhookStatus;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  dedupKey: string; // provider:integrationId:externalEventId
}

export interface ExternalMapping {
  id: string;
  businessId: string;
  integrationId: string;
  provider: string;
  entityType: string;
  internalId: string;
  externalId: string;
  externalReference?: string;
  lastSyncedAt: string;
  metadata?: Record<string, any>;
}

export type ImportStatus = 'VALIDATED' | 'PREVIEW' | 'CONFIRMED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

export interface ImportIssue {
  row: number;
  field?: string;
  message: string;
  recordSnippet?: any;
}

export interface ImportRun {
  id: string;
  businessId: string;
  entityType: string;
  status: ImportStatus;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  warningCount: number;
  recordsToCreate: number;
  recordsToUpdate: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  previewRows?: any[];
  locationId?: string;
  createdBy: string;
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
  recordsCreated?: number;
  recordsUpdated?: number;
}

export interface ExportRun {
  id: string;
  businessId: string;
  entityType: string;
  format: 'JSON' | 'CSV';
  recordCount: number;
  dateRange?: { startDate: string; endDate: string };
  locationId?: string;
  exportedBy: string;
  exportedAt: string;
  summaryChecksum?: string;
}

export type PaymentVerificationStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REVERSED';

export interface ExternalPaymentRecord {
  id: string;
  businessId: string;
  integrationId: string;
  provider: string;
  merchantReference: string;
  externalTransactionReference?: string;
  saleId?: string;
  customerId?: string;
  customerPhone?: string;
  currency: string;
  amount: number;
  status: PaymentVerificationStatus;
  initiatedAt: string;
  verifiedAt?: string;
  verificationSource?: 'WEBHOOK' | 'POLLING' | 'MANUAL_VERIFY';
  idempotencyKey: string;
  rawStatus?: string;
  errorMessage?: string;
  locationId?: string;
}

export interface IntegrationEvent {
  id: string;
  businessId: string;
  integrationId?: string;
  provider?: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details: string;
  metadata?: Record<string, any>;
  userId: string;
  timestamp: string;
}

export type ProviderImplementationType = 'READINESS_ADAPTER' | 'TEST_FIXTURE' | 'REAL_AUTHENTICATED_INTEGRATION';

export interface ProviderCatalogItem {
  providerId: string;
  displayName: string;
  category: IntegrationCategory;
  description: string;
  implementationType?: ProviderImplementationType;
  supportedCapabilities: IntegrationCapability[];
  requiredConfigKeys: string[];
  requiredSecretKeys: string[];
  supportsOAuth: boolean;
  supportsWebhooks: boolean;
  countryScope: string;
  documentationUrl?: string;
}

export interface ReconciliationReport {
  generatedAt: string;
  businessId: string;
  provider: string;
  dateRange: { startDate: string; endDate: string };
  locationId?: string;
  internalTotalGhs: number;
  internalCount: number;
  externalTotalGhs: number;
  externalCount: number;
  matchedCount: number;
  matchedTotalGhs: number;
  unmatchedInternalCount: number;
  unmatchedExternalCount: number;
  discrepancyCount: number;
  varianceGhs: number;
  isBalanced: boolean;
  unmatchedInternal: any[];
  unmatchedExternal: any[];
}

export interface IntegrationDiagnosticCheck {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  affectedCount: number;
  suggestedAction?: string;
  autoRepairable: boolean;
}

export interface IntegrationDiagnosticsReport {
  generatedAt: string;
  businessId: string;
  healthy: boolean;
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  checks: IntegrationDiagnosticCheck[];
}

// ----------------------------------------------------
// STAGE 4S: EXECUTIVE COMMAND CENTER & BUSINESS INTELLIGENCE
// ----------------------------------------------------

export type ExecutiveAttentionSeverity = 'critical' | 'high' | 'informational';
export type ExecutiveAttentionCategory =
  | 'inventory'
  | 'debt'
  | 'operations'
  | 'governance'
  | 'integrations'
  | 'billing'
  | 'sales'
  | 'staff';

export interface ExecutiveAttentionItem {
  id: string;
  category: ExecutiveAttentionCategory;
  severity: ExecutiveAttentionSeverity;
  title: string;
  message: string;
  evidence: string;
  targetView: string;
  timestamp: string;
  metricValue?: number | string;
}

export interface ExecutiveKPIItem {
  key: string;
  label: string;
  value: number | string | null;
  formattedValue: string;
  unit?: string;
  restricted?: boolean;
  category: 'financial' | 'sales' | 'inventory' | 'customer' | 'operations' | 'staff';
  hasComparison: boolean;
  previousValue?: number | string | null;
  changePercent?: number | null;
  changeDirection?: 'up' | 'down' | 'flat' | 'insufficient_data';
  explanation: string;
  calculationLogic: string;
  sourceModule: string;
}

export interface ExecutiveOpportunityItem {
  id: string;
  title: string;
  reason: string;
  supportingData: string;
  affectedEntity: string;
  confidence: 'Strong evidence' | 'Moderate evidence' | 'Limited evidence';
  recommendedInvestigation: string;
  category: 'product' | 'customer' | 'inventory' | 'branch' | 'communication';
  targetView: string;
}

export interface ExecutiveRiskItem {
  id: string;
  title: string;
  reason: string;
  supportingData: string;
  affectedEntity: string;
  severity: 'critical' | 'high' | 'moderate';
  recommendedAction: string;
  category: 'financial' | 'inventory' | 'debt' | 'operations' | 'governance' | 'integrations' | 'billing';
  targetView: string;
}

export interface ExecutiveAnomalyItem {
  id: string;
  type: string;
  description: string;
  detectedAt: string;
  neutralNotice: string;
  affectedEntity: string;
  metricDetails: string;
  severity: 'low' | 'moderate' | 'high';
}

export interface ExecutiveHealthMetricItem {
  metricName: string;
  currentValue: string | number;
  benchmark?: string | number;
  status: 'good' | 'warning' | 'alert';
  details: string;
}

export interface ExecutiveHealthDimension {
  dimension: string;
  status: 'OPTIMAL' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
  label: string;
  underlyingMetrics: ExecutiveHealthMetricItem[];
  methodology: string;
}

export interface ExecutiveExecutiveSummary {
  headline: string;
  periodLabel: string;
  financialSummary: string;
  salesSummary: string;
  inventorySummary: string;
  customerSummary: string;
  operationsSummary: string;
  forecastSummary: string;
  risksAndOpportunitiesSummary: string;
  generatedAt: string;
}

export interface ExecutivePreferences {
  visibleSections: string[];
  pinnedKPIs: string[];
  defaultRange: string;
  showAnomalies: boolean;
  showOpportunities: boolean;
  showRisks: boolean;
  updatedAt: string;
}

export interface ExecutiveCommandCenterPayload {
  businessId: string;
  businessName: string;
  locationId?: string;
  locationName?: string;
  dateRange: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
    hasComparison: boolean;
    comparisonRange?: {
      fromDate: string;
      toDate: string;
      label: string;
    } | null;
    comparisonReason?: string;
  };
  canViewFinancials: boolean;
  executiveSummary: ExecutiveExecutiveSummary;
  healthSnapshot: {
    overallStatus: 'OPTIMAL' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
    summary: string;
    dimensions: ExecutiveHealthDimension[];
  };
  kpiScorecards: ExecutiveKPIItem[];
  financialPerformance?: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    grossMarginPercent: number;
    netMarginPercent: number;
    atv: number;
    inventoryValuation: number;
    comparisons?: {
      revenueChangePercent?: number;
      grossProfitChangePercent?: number;
      netProfitChangePercent?: number;
      expensesChangePercent?: number;
    };
  } | { restricted: true };
  salesPerformance: {
    totalTransactions: number;
    totalUnitsSold: number;
    atv: number | null;
    salesTrend: Array<{ date: string; sales: number; transactions: number; profit?: number }>;
    paymentMethodDistribution: Array<{ method: string; count: number; total: number; percent: number }>;
    topProducts: Array<{ id: string; name: string; unitsSold: number; revenue?: number }>;
    topCustomers: Array<{ id: string; name: string; transactionCount: number; totalSpend?: number }>;
  };
  inventoryIntelligence: {
    totalCatalogProducts: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    inventoryValuation?: number;
    fastMovingCount: number;
    slowMovingCount: number;
    criticalRestockAlerts: Array<{ id: string; name: string; quantity: number; minStockLevel: number; status: string }>;
  };
  customerIntelligence: {
    totalCustomers: number;
    activeCount: number;
    newCount: number;
    returningCount: number;
    inactiveCount: number;
    debtorCount: number;
    totalDebtExposure: number;
    retentionOpportunitiesCount: number;
  };
  staffIntelligence?: {
    totalStaff: number;
    activeStaffInPeriod: number;
    staffActivity: Array<{
      staffId: string;
      staffName: string;
      transactionCount: number;
      revenueContribution?: number;
      salesSharePercent?: number;
    }>;
  };
  locationIntelligence?: {
    isMultiLocation: boolean;
    locationsCount: number;
    branches: Array<{
      locationId: string;
      locationName: string;
      locationCode: string;
      salesCount: number;
      revenue?: number;
      activeProductsCount: number;
      lowStockCount: number;
    }>;
  };
  operationsIntelligence: {
    pendingTasksCount: number;
    dueTodayTasksCount: number;
    overdueTasksCount: number;
    criticalTasksCount: number;
    completedTasksCount: number;
  };
  forecastOutlook?: {
    isAvailable: boolean;
    confidence: string;
    salesOutlookSummary: string;
    projectedDemandSummary: string;
    inventoryCoverageSummary: string;
    expenseTrendSummary: string;
    note: string;
  };
  attentionCenter: ExecutiveAttentionItem[];
  opportunities: ExecutiveOpportunityItem[];
  risks: ExecutiveRiskItem[];
  anomalies: ExecutiveAnomalyItem[];
  integrationHealth: {
    totalProviders: number;
    connectedCount: number;
    healthyCount: number;
    statusSummary: string;
  };
  subscriptionStatus: {
    currentPlan: string;
    status: string;
    isTrialing: boolean;
    daysRemainingInTrial?: number;
    usageSummary: {
      staffUsed: number;
      staffLimit: number;
      locationsUsed: number;
      locationsLimit: number;
      productsUsed: number;
      productsLimit: number;
      customersUsed: number;
      customersLimit: number;
    };
  };
  platformMetrics?: {
    isMasterAdminView: true;
    totalBusinesses: number;
    activeSubscriptions: number;
    trials: number;
    pastDue: number;
    mrr: number;
    arr: number;
    planDistribution: Record<string, number>;
  };
  generatedAt: string;
}

// ==========================================
// STAGE 4T: STRATEGIC SCENARIO SIMULATION & BUSINESS PLANNING
// ==========================================

export type SimulationScenarioType =
  | 'price_change'
  | 'sales_volume_change'
  | 'expense_change'
  | 'cost_change'
  | 'discount_scenario'
  | 'target_profit'
  | 'sales_target'
  | 'expense_reduction'
  | 'debt_collection'
  | 'custom_multi_variable';

export interface SimulationFinancialMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  unitsSold?: number;
  averageTransactionValue?: number;
  cashImpactGHS?: number;
}

export interface SimulationComparisonDelta {
  revenueDelta: number;
  revenueDeltaPercent: number;
  cogsDelta: number;
  cogsDeltaPercent: number;
  grossProfitDelta: number;
  grossProfitDeltaPercent: number;
  expensesDelta: number;
  expensesDeltaPercent: number;
  netProfitDelta: number;
  netProfitDeltaPercent: number;
  grossMarginPpDelta: number;
  netMarginPpDelta: number;
  isProfitImprovement: boolean;
  viability: 'highly_favorable' | 'favorable' | 'neutral' | 'unfavorable' | 'high_risk';
}

export interface SimulationExplanation {
  headline: string;
  whatChanged: string;
  assumptions: string[];
  revenueImpact: string;
  costImpact: string;
  expenseImpact: string;
  profitImpact: string;
  marginImpact: string;
  cashFlowImpact: string;
  limitations: string[];
  recommendedAction?: string;
  labels: {
    target?: string;
    actual?: string;
    projected: string;
    simulated: string;
  };
}

export interface SimulationRunResult {
  scenarioType: SimulationScenarioType;
  scenarioName: string;
  dateRange: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  assumptions: Record<string, any>;
  baseline: SimulationFinancialMetrics;
  simulated: SimulationFinancialMetrics;
  comparison: SimulationComparisonDelta;
  explanation: SimulationExplanation;
  metadata: {
    generatedAt: string;
    currency: string;
    businessId: string;
    locationId?: string;
    isFinancialsRestricted: boolean;
  };
  details?: {
    product?: {
      id: string;
      name: string;
      currentPrice: number;
      currentCost: number;
      newPrice?: number;
      newCost?: number;
      discountAmount?: number;
      expectedQuantity: number;
    };
    targetProfitCalculation?: {
      targetProfit: number;
      unitContributionMargin: number;
      requiredGrossProfit: number;
      requiredSalesVolumeUnits: number;
      requiredRevenueGHS: number;
      breakEvenUnits: number;
      breakEvenRevenueGHS: number;
      isAttainable: boolean;
    };
    salesTargetCalculation?: {
      monthlyTarget: number;
      actualSalesAchieved: number;
      remainingSalesRequired: number;
      elapsedDays: number;
      remainingDays: number;
      daysInMonth: number;
      currentDailyRunRate: number;
      requiredDailyRunRate: number;
      progressPercent: number;
      projectedMonthEndSales: number;
      projectedShortfallSurplus: number;
      status: 'on_track' | 'at_risk' | 'exceeded' | 'severely_behind';
    };
    debtCollectionCalculation?: {
      totalOutstandingDebt: number;
      totalDebtorsCount: number;
      simulatedCollectionPercent: number;
      simulatedCashRecoveryGHS: number;
      remainingDebtExposureGHS: number;
      scenarios: Array<{
        name: string;
        percent: number;
        cashRecoveryGHS: number;
        remainingExposureGHS: number;
      }>;
    };
  };
}

export interface StoredSimulation {
  id: string;
  businessId: string;
  createdBy: string;
  creatorName: string;
  scenarioName: string;
  scenarioType: SimulationScenarioType;
  notes?: string;
  assumptions: Record<string, any>;
  baseline: SimulationFinancialMetrics;
  simulatedResult: SimulationFinancialMetrics;
  comparison: SimulationComparisonDelta;
  explanation: SimulationExplanation;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPlanningTargets {
  id: string;
  businessId: string;
  period: string; // e.g. "2026-09" or "this_month"
  monthlySalesTarget: number;
  monthlyProfitTarget: number;
  expenseBudget: number;
  stockBudget?: number;
  growthTargetPercent?: number;
  customerAcquisitionTarget?: number;
  debtCollectionTarget?: number;
  notes?: string;
  actuals?: {
    salesAchieved: number;
    profitAchieved?: number;
    expensesIncurred: number;
    customersAcquired?: number;
    debtCollected?: number;
  };
  progress?: {
    salesPercent: number;
    profitPercent?: number;
    expenseBurnPercent: number;
    salesStatus: 'on_track' | 'behind' | 'exceeded';
    profitStatus?: 'on_track' | 'behind' | 'exceeded';
    expenseStatus: 'within_budget' | 'over_budget';
  };
  updatedBy: string;
  updatedAt: string;
}

// ==========================================
// STAGE 4U: BUSINESS GOALS, TARGETS & ACTION TRACKER
// ==========================================

export type BusinessGoalType =
  | 'sales_revenue'
  | 'net_profit'
  | 'expense_reduction'
  | 'revenue_growth'
  | 'customer_growth'
  | 'debt_collection'
  | 'stock_value';

export type BusinessGoalStatus = 'NOT STARTED' | 'IN PROGRESS' | 'ACHIEVED' | 'OVERDUE';

export interface BusinessGoal {
  id: string;
  businessId: string;
  createdBy: string;
  name: string;
  type: BusinessGoalType;
  targetValue: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description?: string;
  actualValue: number;
  progressPercent: number;
  remainingValue: number;
  status: BusinessGoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthIndicatorResult {
  currentValue: number;
  previousValue: number;
  changePercent: number;
  status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  details: Record<string, any>;
  recommendation?: string;
}

export interface BusinessHealthReport {
  businessId: string;
  range: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  revenueHealth: HealthIndicatorResult;
  profitHealth: HealthIndicatorResult & { grossProfit: number; netProfit: number; netMargin: number };
  expenseHealth: HealthIndicatorResult;
  inventoryHealth: HealthIndicatorResult & { totalProducts: number; lowStockCount: number; outOfStockCount: number };
  customerHealth: HealthIndicatorResult & { totalCustomers: number; newCustomersCount: number };
  debtHealth: HealthIndicatorResult & { totalOutstandingDebt: number; totalCollected: number; unpaidCount: number };
  actionRecommendations: string[];
}

// ==========================================
// STAGE 4W: BUSINESS ALERTS & EARLY-WARNING SYSTEM
// ==========================================

export type BusinessAlertType =
  | 'OUT_OF_STOCK'
  | 'LOW_STOCK'
  | 'REVENUE_DECLINE'
  | 'EXPENSE_INCREASE'
  | 'PROFIT_DECLINE'
  | 'DEBT_ALERT'
  | 'GOAL_BEHIND'
  | 'CUSTOMER_ACTIVITY_ALERT';

export type BusinessAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type BusinessAlertStatus = 'ACTIVE' | 'DISMISSED' | 'RESOLVED';

export interface BusinessAlert {
  id: string;
  businessId: string;
  tenantId: string;
  alertType: BusinessAlertType;
  severity: BusinessAlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  status: BusinessAlertStatus;
}

// ==========================================
// STAGE 4X: BUSINESS ACTIVITY TIMELINE & AUDIT VIEW
// ==========================================

export interface BusinessActivityEvent {
  id: string;
  tenantId: string;
  businessId: string;
  eventType:
    | 'SALE_COMPLETED'
    | 'CUSTOMER_ACTIVITY'
    | 'DEBT_RECORDED'
    | 'DEBT_PAYMENT'
    | 'EXPENSE_RECORDED'
    | 'PURCHASE_RECORDED'
    | 'INVENTORY_CHANGE'
    | 'GOAL_ACTIVITY'
    | 'ALERT_ACTIVITY'
    | 'STAFF_ACTIVITY';
  title: string;
  description: string;
  actor?: string;
  referenceId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ==========================================
// STAGE 4Z: BUSINESS REVIEW & DECISION LOG
// ==========================================

export type BusinessDecisionPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type BusinessDecisionStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface BusinessDecision {
  id: string;
  tenantId: string;
  businessId: string;
  title: string;
  description: string;
  category: string;
  priority: BusinessDecisionPriority;
  status: BusinessDecisionStatus;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}




