import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getAccraToday } from './date.js';
import {
  STAFF_PERMISSION_KEYS,
  DEFAULT_STAFF_PERMISSIONS,
} from '../src/types/index.js';
import type {
  User,
  StaffPermissions,
  Business,
  BusinessSettings,
  Product,
  Category,
  Customer,
  Sale,
  CustomerPayment,
  Expense,
  Supplier,
  Purchase,
  Invoice,
  Notification,
  Subscription,
  SubscriptionPayment,
  AuditLog,
  StockMovement,
  BusinessTask,
  AutomationRules,
  CommunicationRecord,
  CommunicationTemplate,
  CustomerCommunicationPreferences,
  LoyaltyConfig,
  LoyaltyLedgerEntry,
  LoyaltyMilestoneRecord,
  LoyaltyReferral,
  LoyaltyRewardRedemption,
  LoyaltyTier,
  ConfigurationHistoryRecord,
  SecurityEvent,
  Location,
  LocationStatus,
  LocationType,
  StockTransfer,
  StockTransferStatus,
  Integration,
  IntegrationSecret,
  SyncRun,
  WebhookEvent,
  ExternalMapping,
  ImportRun,
  ExportRun,
  ExternalPaymentRecord,
  IntegrationEvent,
  BillingInvoice,
  StoredSimulation,
  BusinessPlanningTargets,
  BusinessGoal,
  BusinessAlert,
  BusinessDecision,
} from '../src/types/index.js';

export interface DBUser extends User {
  passwordHash: string;
}

export function sanitizeStaffPermissions(
  raw?: Partial<StaffPermissions> | Record<string, any> | null,
  baseDefaults: StaffPermissions = DEFAULT_STAFF_PERMISSIONS
): StaffPermissions {
  if (!raw || typeof raw !== 'object') {
    return { ...baseDefaults };
  }

  const result: StaffPermissions = { ...baseDefaults };
  for (const key of STAFF_PERMISSION_KEYS) {
    if (key in raw && typeof raw[key] === 'boolean') {
      result[key] = raw[key];
    }
  }
  return result;
}

export interface DatabaseSchema {
  users: DBUser[];
  businesses: Business[];
  business_settings: BusinessSettings[];
  products: Product[];
  categories: Category[];
  customers: Customer[];
  sales: Sale[];
  customer_payments: CustomerPayment[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: Purchase[];
  invoices: Invoice[];
  notifications: Notification[];
  subscriptions: Subscription[];
  audit_logs: AuditLog[];
  stock_movements: StockMovement[];
  tasks?: BusinessTask[];
  automation_rules?: AutomationRules[];
  subscription_payments?: SubscriptionPayment[];
  communications?: CommunicationRecord[];
  communication_templates?: CommunicationTemplate[];
  loyalty_configs?: LoyaltyConfig[];
  loyalty_ledger?: LoyaltyLedgerEntry[];
  loyalty_milestones?: LoyaltyMilestoneRecord[];
  loyalty_referrals?: LoyaltyReferral[];
  loyalty_rewards?: LoyaltyRewardRedemption[];
  config_history?: ConfigurationHistoryRecord[];
  security_events?: SecurityEvent[];
  locations?: Location[];
  stock_transfers?: StockTransfer[];
  integrations?: Integration[];
  integration_secrets?: IntegrationSecret[];
  integration_events?: IntegrationEvent[];
  sync_runs?: SyncRun[];
  webhook_events?: WebhookEvent[];
  external_mappings?: ExternalMapping[];
  import_runs?: ImportRun[];
  export_runs?: ExportRun[];
  external_payments?: ExternalPaymentRecord[];
  billing_invoices?: BillingInvoice[];
  simulations?: StoredSimulation[];
  business_planning_targets?: BusinessPlanningTargets[];
  business_goals?: BusinessGoal[];
  business_alerts?: BusinessAlert[];
  business_decisions?: BusinessDecision[];
  executive_preferences?: Array<{
    userId: string;
    businessId: string;
    preferences: {
      visibleSections?: string[];
      pinnedKPIs?: string[];
      defaultRange?: string;
      showAnomalies?: boolean;
      showOpportunities?: boolean;
      showRisks?: boolean;
    };
    updatedAt: string;
  }>;
  sessions: { token: string; userId: string; createdAt: string; expiresAt: string }[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');

// Secret Encryption Helpers for Integrations (AES-256-GCM Authenticated Encryption with Versioned Envelopes)
const ENCRYPTION_SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.INTEGRATION_KEY || 'bmgh_integration_master_vault_key_2026')
  .digest();

export function encryptSecret(plainText: string, customKey?: Buffer): string {
  try {
    const key = customKey || ENCRYPTION_SECRET_KEY;
    // 12-byte IV standard for AES-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `v2:gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    return '';
  }
}

export function decryptSecret(cipherText: string, customKey?: Buffer): string {
  try {
    if (!cipherText) return '';
    const key = customKey || ENCRYPTION_SECRET_KEY;

    // Check for versioned v2:gcm envelope
    if (cipherText.startsWith('v2:gcm:')) {
      const parts = cipherText.split(':');
      if (parts.length !== 5) return ''; // 'v2', 'gcm', iv, authTag, encrypted
      const iv = Buffer.from(parts[2], 'hex');
      const authTag = Buffer.from(parts[3], 'hex');
      const encrypted = parts[4];

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // Backwards-compatibility fallback for legacy v1:cbc or legacy iv:encrypted format
    let ivHex = '';
    let encHex = '';
    if (cipherText.startsWith('v1:cbc:')) {
      const parts = cipherText.split(':');
      if (parts.length !== 4) return '';
      ivHex = parts[2];
      encHex = parts[3];
    } else if (cipherText.includes(':')) {
      const parts = cipherText.split(':');
      if (parts.length !== 2) return '';
      ivHex = parts[0];
      encHex = parts[1];
    } else {
      return '';
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '';
  }
}

const defaultData: DatabaseSchema = {
  users: [],
  businesses: [],
  business_settings: [],
  products: [],
  categories: [],
  customers: [],
  sales: [],
  customer_payments: [],
  expenses: [],
  suppliers: [],
  purchases: [],
  invoices: [],
  notifications: [],
  subscriptions: [],
  audit_logs: [],
  stock_movements: [],
  tasks: [],
  automation_rules: [],
  subscription_payments: [],
  communications: [],
  communication_templates: [],
  loyalty_configs: [],
  loyalty_ledger: [],
  loyalty_milestones: [],
  loyalty_referrals: [],
  loyalty_rewards: [],
  config_history: [],
  security_events: [],
  locations: [],
  stock_transfers: [],
  integrations: [],
  integration_secrets: [],
  integration_events: [],
  sync_runs: [],
  webhook_events: [],
  external_mappings: [],
  import_runs: [],
  export_runs: [],
  external_payments: [],
  billing_invoices: [],
  simulations: [],
  business_planning_targets: [],
  business_goals: [],
  executive_preferences: [],
  sessions: [],
};

class DBManager {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
    this.initSuperAdmin();
    this.initSubscriptions();
    this.initDefaultCommunicationTemplates();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      let parsed: any = null;
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim()) {
          parsed = JSON.parse(raw);
        }
      } else if (fs.existsSync(DB_BACKUP_FILE)) {
        const backupRaw = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
        if (backupRaw && backupRaw.trim()) {
          parsed = JSON.parse(backupRaw);
        }
      }

      if (parsed) {
        const loadedData = { ...defaultData, ...parsed };
        if (Array.isArray(loadedData.users)) {
          loadedData.users = loadedData.users.map((u: DBUser) => {
            if (u.role === 'staff' && u.permissions) {
              return {
                ...u,
                permissions: sanitizeStaffPermissions(u.permissions, DEFAULT_STAFF_PERMISSIONS),
              };
            }
            return u;
          });
        }
        return loadedData;
      }
    } catch (err) {
      console.error('Error loading db.json, attempting backup load:', err);
      try {
        if (fs.existsSync(DB_BACKUP_FILE)) {
          const backupRaw = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
          const parsed = JSON.parse(backupRaw);
          const loadedData = { ...defaultData, ...parsed };
          if (Array.isArray(loadedData.users)) {
            loadedData.users = loadedData.users.map((u: DBUser) => {
              if (u.role === 'staff' && u.permissions) {
                return {
                  ...u,
                  permissions: sanitizeStaffPermissions(u.permissions, DEFAULT_STAFF_PERMISSIONS),
                };
              }
              return u;
            });
          }
          return loadedData;
        }
      } catch (backupErr) {
        console.error('Backup load failed:', backupErr);
      }
    }

    if (!fs.existsSync(DB_FILE)) {
      this.saveData(defaultData);
    }
    return { ...defaultData };
  }

  private saveData(dataToSave: DatabaseSchema = this.data) {
    if (!dataToSave) return;
    try {
      const serialized = JSON.stringify(dataToSave, null, 2);
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, serialized, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      // Maintain secondary backup
      try {
        fs.writeFileSync(DB_BACKUP_FILE, serialized, 'utf-8');
      } catch (bErr) {
        // backup failure non-fatal
      }
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  private initSuperAdmin() {
    const adminEmail = 'admin@businessmanagergh.com';
    const exists = this.data.users.find(
      (u) => u.email.toLowerCase() === adminEmail || u.id === 'usr_admin_master'
    );
    if (!exists) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('Admin@GH2026', salt);
      const adminUser: DBUser = {
        id: 'usr_admin_master',
        email: adminEmail,
        fullName: 'System Administrator',
        phone: '+233240000000',
        role: 'master_admin',
        createdAt: new Date().toISOString(),
        passwordHash: hash,
      };
      this.data.users.push(adminUser);
      this.saveData();
    } else {
      let modified = false;
      if (exists.id !== 'usr_admin_master') {
        exists.id = 'usr_admin_master';
        modified = true;
      }
      if (exists.role !== 'master_admin' && exists.role !== 'admin') {
        exists.role = 'master_admin';
        modified = true;
      }
      if (modified) {
        this.saveData();
      }
    }
  }

  private initSubscriptions() {
    if (!this.data.subscriptions) {
      this.data.subscriptions = [];
    }

    const planPrices: Record<string, number> = {
      free: 0,
      FREE: 0,
      starter: 49,
      STARTER: 49,
      business: 99,
      BUSINESS: 99,
    };

    let modified = false;

    // Ensure every business has exactly one standardized subscription record
    for (const biz of this.data.businesses) {
      let sub = this.data.subscriptions.find((s) => s.businessId === biz.id);
      if (!sub) {
        const rawPlan = (biz.plan || 'free').toString().toLowerCase();
        const plan = rawPlan === 'starter' || rawPlan === 'business' ? rawPlan : 'free';
        const startDate = biz.createdAt || new Date().toISOString();
        const nextBilling = new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        sub = {
          id: this.generateId('sub'),
          businessId: biz.id,
          plan,
          status: 'active',
          amount: planPrices[plan] || 0,
          currency: 'GHS',
          interval: 'monthly',
          startDate,
          nextBillingDate: nextBilling,
          createdAt: startDate,
          updatedAt: startDate,
          paymentReference: 'none',
          paymentProvider: 'none',
          startedAt: startDate,
          expiresAt: nextBilling,
          priceGh: planPrices[plan] || 0,
        };
        this.data.subscriptions.push(sub);
        modified = true;
      } else {
        let subModified = false;
        const normalizedPlan = (sub.plan || biz.plan || 'free').toString().toLowerCase();
        const validPlan = normalizedPlan === 'starter' || normalizedPlan === 'business' ? normalizedPlan : 'free';
        
        if (!sub.currency) {
          sub.currency = 'GHS';
          subModified = true;
        }
        if (!sub.interval) {
          sub.interval = 'monthly';
          subModified = true;
        }
        if (typeof sub.amount !== 'number') {
          sub.amount = planPrices[validPlan] ?? (sub.priceGh || 0);
          subModified = true;
        }
        if (!sub.startDate) {
          sub.startDate = sub.startedAt || biz.createdAt || new Date().toISOString();
          subModified = true;
        }
        if (!sub.nextBillingDate) {
          sub.nextBillingDate = sub.expiresAt || new Date(new Date(sub.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          subModified = true;
        }
        if (!sub.createdAt) {
          sub.createdAt = sub.startDate;
          subModified = true;
        }
        if (!sub.paymentReference) {
          sub.paymentReference = 'none';
          subModified = true;
        }
        if (!sub.paymentProvider) {
          sub.paymentProvider = 'none';
          subModified = true;
        }
        if (subModified) {
          modified = true;
        }
      }
    }

    if (modified) {
      this.saveData();
    }
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }

  public generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  public hashPassword(plain: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(plain, salt);
  }

  public verifyPassword(plain: string, hash: string): boolean {
    return bcrypt.compareSync(plain, hash);
  }

  // Session Token methods
  public createSession(userId: string): string {
    const token = `bmgh_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    this.data.sessions.push({
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    });
    this.saveData();
    return token;
  }

  public getSession(token: string): { user: User; business?: Business } | null {
    if (!token) return null;
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.saveData();
      return null;
    }
    const user = this.data.users.find((u) => u.id === session.userId);
    if (!user) return null;
    if (user.status === 'inactive') return null;

    let business: Business | undefined = undefined;
    if (user.businessId) {
      business = this.data.businesses.find((b) => b.id === user.businessId);
    }
    if (!business) {
      business = this.data.businesses.find((b) => b.ownerId === user.id);
      if (business && !user.businessId) {
        user.businessId = business.id;
        this.saveData();
      }
    }

    const safeUser = this.sanitizeUser(user);
    return { user: safeUser, business };
  }

  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.saveData();
  }

  public sanitizeUser(user: DBUser): User {
    const { passwordHash: _, ...safeUser } = user;
    if (safeUser.role === 'staff') {
      safeUser.permissions = safeUser.permissions
        ? sanitizeStaffPermissions(safeUser.permissions, DEFAULT_STAFF_PERMISSIONS)
        : { ...DEFAULT_STAFF_PERMISSIONS };
    }
    return safeUser;
  }

  // User & Business Operations
  public findUserById(id: string): DBUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): DBUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  public createUser(user: DBUser): User {
    this.data.users.push(user);
    this.saveData();
    return this.sanitizeUser(user);
  }

  public updateUser(id: string, updates: Partial<DBUser>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.saveData();
    return this.sanitizeUser(this.data.users[idx]);
  }

  public getUsersByBusiness(businessId: string): User[] {
    return this.data.users
      .filter((u) => u.businessId === businessId)
      .map((u) => this.sanitizeUser(u));
  }

  public getStaffUsers(businessId: string): User[] {
    return this.data.users
      .filter((u) => u.businessId === businessId && u.role !== 'admin' && u.role !== 'master_admin')
      .map((u) => this.sanitizeUser(u));
  }

  public createStaffUser(data: {
    businessId: string;
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    permissions?: Partial<StaffPermissions> | Record<string, any>;
    assignedLocationIds?: string[];
    allLocations?: boolean;
  }): User {
    const existing = this.findUserByEmail(data.email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }
    const now = new Date().toISOString();
    const permissions = data.permissions
      ? sanitizeStaffPermissions(data.permissions, DEFAULT_STAFF_PERMISSIONS)
      : { ...DEFAULT_STAFF_PERMISSIONS };

    const newUser: DBUser = {
      id: this.generateId('usr'),
      businessId: data.businessId,
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: (data.phone || '').trim(),
      role: 'staff',
      status: 'active',
      permissions,
      assignedLocationIds: data.assignedLocationIds || [],
      allLocations: data.allLocations ?? (data.assignedLocationIds && data.assignedLocationIds.length > 0 ? false : true),
      createdAt: now,
      updatedAt: now,
      passwordHash: this.hashPassword(data.password),
    };

    this.data.users.push(newUser);
    this.saveData();

    return this.sanitizeUser(newUser);
  }

  public updateStaffUser(
    id: string,
    businessId: string,
    updates: {
      fullName?: string;
      phone?: string;
      status?: 'active' | 'inactive' | 'suspended';
      role?: any;
      assignedScope?: string;
      password?: string;
      permissions?: Partial<StaffPermissions> | Record<string, any>;
      assignedLocationIds?: string[];
      allLocations?: boolean;
    }
  ): User | null {
    const user = this.data.users.find(
      (u) => u.id === id && u.businessId === businessId && (u.role === 'staff' || u.role === 'admin' || u.role === 'business_owner')
    );
    if (!user) return null;

    if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.status !== undefined) {
      user.status = updates.status;
      if (updates.status === 'inactive' || updates.status === 'suspended') {
        this.data.sessions = this.data.sessions.filter((s) => s.userId !== id);
      }
    }
    if (updates.role !== undefined && updates.role !== 'master_admin') {
      user.role = updates.role;
    }
    if (updates.assignedScope !== undefined) {
      user.assignedScope = updates.assignedScope.trim();
    }
    if (updates.assignedLocationIds !== undefined) {
      user.assignedLocationIds = Array.isArray(updates.assignedLocationIds) ? updates.assignedLocationIds : [];
    }
    if (updates.allLocations !== undefined) {
      user.allLocations = Boolean(updates.allLocations);
    }
    if (updates.password !== undefined && updates.password.trim()) {
      user.passwordHash = this.hashPassword(updates.password);
    }
    if (updates.permissions !== undefined) {
      const base = user.permissions
        ? { ...user.permissions }
        : { ...DEFAULT_STAFF_PERMISSIONS };
      user.permissions = sanitizeStaffPermissions(updates.permissions, base);
    }
    user.updatedAt = new Date().toISOString();

    this.saveData();
    return this.sanitizeUser(user);
  }

  public deleteStaffUser(id: string, businessId: string): boolean {
    const idx = this.data.users.findIndex(
      (u) => u.id === id && u.businessId === businessId && u.role === 'staff'
    );
    if (idx === -1) return false;

    this.data.users.splice(idx, 1);
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== id);
    this.saveData();
    return true;
  }

  public createBusiness(business: Business): Business {
    this.data.businesses.push(business);
    // Also create default settings
    const settings: BusinessSettings = {
      id: this.generateId('set'),
      businessId: business.id,
      receiptHeader: `${business.name}\n${business.location}\nTel: ${business.phone}`,
      receiptFooter: 'Thank you for your business! Please visit again.',
      printSize: '80mm',
      taxRatePercent: 0,
      lowStockThreshold: 5,
      enableStockAlerts: true,
      enableWhatsappReminders: true,
      enableWhatsappReceipts: true,
      defaultPaymentMethod: 'Cash',
    };
    this.data.business_settings.push(settings);

    // Create default Free Subscription
    const nowIso = new Date().toISOString();
    const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const sub: Subscription = {
      id: this.generateId('sub'),
      businessId: business.id,
      plan: 'FREE',
      status: 'active',
      startedAt: nowIso,
      expiresAt: nextYearIso,
      priceGh: 0,
      amount: 0,
      currency: 'GHS',
      interval: 'monthly',
      startDate: nowIso,
      nextBillingDate: nextYearIso,
      paymentReference: '',
      paymentProvider: 'none',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.data.subscriptions.push(sub);

    this.saveData();
    return business;
  }

  public updateBusiness(id: string, updates: Partial<Business>): Business | null {
    const idx = this.data.businesses.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const existing = this.data.businesses[idx];
    this.data.businesses[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      ownerId: existing.ownerId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.businesses[idx];
  }

  public getBusiness(id: string): Business | undefined {
    return this.data.businesses.find((b) => b.id === id);
  }

  public getBusinessById(id: string): Business | undefined {
    return this.getBusiness(id);
  }

  public getBusinessSettings(businessId: string): BusinessSettings {
    let settings = this.data.business_settings.find((s) => s.businessId === businessId);
    if (!settings) {
      settings = {
        id: this.generateId('set'),
        businessId,
        printSize: '80mm',
        taxRatePercent: 0,
        lowStockThreshold: 5,
        enableStockAlerts: true,
        enableWhatsappReminders: true,
        enableWhatsappReceipts: true,
        defaultPaymentMethod: 'Cash',
      };
      this.data.business_settings.push(settings);
      this.saveData();
    } else if (settings.enableWhatsappReceipts === undefined) {
      settings.enableWhatsappReceipts = true;
    }
    return settings;
  }

  public updateBusinessSettings(businessId: string, updates: Partial<BusinessSettings>): BusinessSettings {
    const idx = this.data.business_settings.findIndex((s) => s.businessId === businessId);
    if (idx === -1) {
      const created = {
        id: this.generateId('set'),
        businessId,
        printSize: '80mm' as const,
        taxRatePercent: 0,
        lowStockThreshold: 5,
        enableStockAlerts: true,
        enableWhatsappReminders: true,
        enableWhatsappReceipts: true,
        defaultPaymentMethod: 'Cash' as const,
        ...updates,
      };
      this.data.business_settings.push(created);
      this.saveData();
      return created;
    }
    const existing = this.data.business_settings[idx];
    this.data.business_settings[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
    };
    this.saveData();
    return this.data.business_settings[idx];
  }

  // Audit Logs
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt' | 'timestamp'>): AuditLog {
    const now = new Date().toISOString();
    let module = log.module;
    let severity = log.severity || 'INFO';
    if (!module) {
      const act = (log.action || '').toLowerCase();
      if (act.includes('login') || act.includes('logout') || act.includes('auth')) {
        module = 'authentication';
      } else if (act.includes('sale') || act.includes('pos')) {
        module = 'sales';
      } else if (act.includes('product') || act.includes('stock') || act.includes('inventory')) {
        module = 'inventory';
      } else if (act.includes('customer') || act.includes('debt')) {
        module = 'customers';
      } else if (act.includes('expense')) {
        module = 'expenses';
      } else if (act.includes('supplier')) {
        module = 'suppliers';
      } else if (act.includes('purchase')) {
        module = 'purchases';
      } else if (act.includes('staff') || act.includes('role') || act.includes('permission')) {
        module = 'staff';
      } else if (act.includes('loyalty') || act.includes('reward')) {
        module = 'loyalty';
      } else if (act.includes('communication') || act.includes('message')) {
        module = 'communications';
      } else if (act.includes('setting') || act.includes('config') || act.includes('policy')) {
        module = 'configuration';
      } else if (act.includes('security') || act.includes('denied') || act.includes('violation')) {
        module = 'security';
        severity = severity === 'INFO' ? 'WARNING' : severity;
      } else {
        module = 'operations';
      }
    }

    const fullLog: AuditLog = {
      id: this.generateId('aud'),
      ...log,
      module,
      severity,
      createdAt: now,
      timestamp: now,
    };
    this.data.audit_logs.unshift(fullLog);
    if (this.data.audit_logs.length > 2000) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 2000);
    }
    this.saveData();
    return fullLog;
  }

  public getAuditLogs(businessId?: string): AuditLog[] {
    if (businessId) {
      return this.data.audit_logs.filter((l) => l.businessId === businessId);
    }
    return this.data.audit_logs;
  }

  // Configuration History
  public logConfigHistory(record: Omit<ConfigurationHistoryRecord, 'id' | 'timestamp'>): ConfigurationHistoryRecord {
    if (!this.data.config_history) {
      this.data.config_history = [];
    }
    const entry: ConfigurationHistoryRecord = {
      id: this.generateId('cfg'),
      ...record,
      timestamp: new Date().toISOString(),
    };
    this.data.config_history.unshift(entry);
    if (this.data.config_history.length > 1000) {
      this.data.config_history = this.data.config_history.slice(0, 1000);
    }
    this.saveData();
    return entry;
  }

  public getConfigHistory(businessId: string): ConfigurationHistoryRecord[] {
    if (!this.data.config_history) return [];
    return this.data.config_history.filter((c) => c.businessId === businessId);
  }

  // Security Events
  public logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    if (!this.data.security_events) {
      this.data.security_events = [];
    }
    const entry: SecurityEvent = {
      id: this.generateId('sec'),
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.data.security_events.unshift(entry);
    if (this.data.security_events.length > 1000) {
      this.data.security_events = this.data.security_events.slice(0, 1000);
    }
    this.saveData();
    return entry;
  }

  public recordSecurityEvent(event: any): SecurityEvent {
    return this.logSecurityEvent({
      businessId: event.businessId,
      userId: event.userId,
      userName: event.userName,
      type: event.type || event.eventType || 'suspicious_activity',
      severity: event.severity || 'HIGH',
      description: event.description || event.summary || 'Security event recorded',
      ipAddress: event.ipAddress,
      endpoint: event.endpoint,
      details: event.details || event.metadata,
    });
  }

  public getSecurityEvents(businessId?: string): SecurityEvent[] {
    if (!this.data.security_events) return [];
    if (businessId) {
      return this.data.security_events.filter((s) => s.businessId === businessId);
    }
    return this.data.security_events;
  }

  // Notifications
  public createNotification(n: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }

    // Deduplicate unread stock notifications for the same business, type, and message
    if (n.type === 'low_stock' || n.type === 'out_of_stock') {
      const existing = this.data.notifications.find(
        (item) =>
          item.businessId === n.businessId &&
          item.type === n.type &&
          item.message === n.message &&
          item.read === false
      );
      if (existing) {
        return existing;
      }
    } else if (n.type === 'proactive_alert') {
      // Deduplicate unread proactive alert notifications by title or message
      const existing = this.data.notifications.find(
        (item) =>
          item.businessId === n.businessId &&
          item.type === 'proactive_alert' &&
          (item.title === n.title || item.message === n.message) &&
          item.read === false
      );
      if (existing) {
        return existing;
      }
    } else if (n.type === 'task_reminder' || n.type === 'workflow_alert') {
      // Deduplicate unread task and workflow notifications for same message
      const existing = this.data.notifications.find(
        (item) =>
          item.businessId === n.businessId &&
          item.type === n.type &&
          (item.message === n.message || item.title === n.title) &&
          item.read === false
      );
      if (existing) {
        return existing;
      }
    }

    const notif: Notification = {
      id: this.generateId('notif'),
      ...n,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.saveData();
    return notif;
  }

  public getNotifications(businessId: string): Notification[] {
    return this.data.notifications.filter((n) => n.businessId === businessId);
  }

  public markNotificationRead(id: string, businessId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.businessId === businessId);
    if (notif) {
      notif.read = true;
      this.saveData();
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(businessId: string): boolean {
    this.data.notifications.forEach((n) => {
      if (n.businessId === businessId) n.read = true;
    });
    this.saveData();
    return true;
  }

  // Tasks (Stage 4L)
  public getTasks(businessId: string): BusinessTask[] {
    if (!this.data.tasks) this.data.tasks = [];
    return this.data.tasks.filter((t) => t.businessId === businessId);
  }

  public getTaskById(id: string, businessId: string): BusinessTask | null {
    if (!this.data.tasks) this.data.tasks = [];
    const task = this.data.tasks.find((t) => t.id === id && t.businessId === businessId);
    return task || null;
  }

  public createTask(taskData: Omit<BusinessTask, 'id' | 'createdAt' | 'updatedAt'>): BusinessTask {
    if (!this.data.tasks) this.data.tasks = [];
    const now = new Date().toISOString();
    const task: BusinessTask = {
      id: this.generateId('task'),
      ...taskData,
      createdAt: now,
      updatedAt: now,
    };
    this.data.tasks.unshift(task);
    this.saveData();
    return task;
  }

  public updateTask(
    id: string,
    businessId: string,
    updates: Partial<BusinessTask>
  ): BusinessTask | null {
    if (!this.data.tasks) this.data.tasks = [];
    const idx = this.data.tasks.findIndex((t) => t.id === id && t.businessId === businessId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const existing = this.data.tasks[idx];
    const updated: BusinessTask = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    this.data.tasks[idx] = updated;
    this.saveData();
    return updated;
  }

  public deleteTask(id: string, businessId: string): boolean {
    if (!this.data.tasks) this.data.tasks = [];
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => !(t.id === id && t.businessId === businessId));
    if (this.data.tasks.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Automation Rules (Stage 4L)
  public getAutomationRules(businessId: string): AutomationRules {
    if (!this.data.automation_rules) this.data.automation_rules = [];
    const found = this.data.automation_rules.find((r) => r.businessId === businessId);
    if (found) return found;

    const defaultRules: AutomationRules = {
      businessId,
      stockCoverageDaysThreshold: 3,
      minStockRestockAlert: true,
      customerInactivityDaysThreshold: 30,
      debtOverdueDaysThreshold: 7,
      expenseSurgeThresholdPct: 25,
      enableDailyReview: true,
      enableWeeklyReview: true,
      autoNotifyStaff: true,
      updatedAt: new Date().toISOString(),
    };
    this.data.automation_rules.push(defaultRules);
    this.saveData();
    return defaultRules;
  }

  public updateAutomationRules(
    businessId: string,
    updates: Partial<AutomationRules>
  ): AutomationRules {
    if (!this.data.automation_rules) this.data.automation_rules = [];
    const existing = this.getAutomationRules(businessId);
    const updated: AutomationRules = {
      ...existing,
      ...updates,
      businessId,
      updatedAt: new Date().toISOString(),
    };
    const idx = this.data.automation_rules.findIndex((r) => r.businessId === businessId);
    if (idx >= 0) {
      this.data.automation_rules[idx] = updated;
    } else {
      this.data.automation_rules.push(updated);
    }
    this.saveData();
    return updated;
  }

  // ==========================================
  // STAGE 4M: COMMUNICATIONS & ENGAGEMENT
  // ==========================================

  public initDefaultCommunicationTemplates() {
    if (!this.data.communication_templates) {
      this.data.communication_templates = [];
    }

    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: 'tmpl_sys_debt_reminder',
        businessId: 'system',
        name: 'Polite Debt Reminder (Accra Standard)',
        type: 'DEBT_REMINDER',
        channel: 'whatsapp',
        subject: 'Payment Reminder',
        content:
          'Hello {{customerName}}, this is a friendly reminder from {{businessName}} regarding your outstanding balance of GH₵ {{amountDue}}. Please contact us or settle at your earliest convenience. Thank you.',
        variables: ['customerName', 'businessName', 'amountDue'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_purchase_follow_up',
        businessId: 'system',
        name: 'Post-Purchase Thank You',
        type: 'PURCHASE_FOLLOW_UP',
        channel: 'whatsapp',
        subject: 'Thank you for your purchase',
        content:
          "Hello {{customerName}}, thank you for shopping with {{businessName}}! We hope you love your purchase. If you have any questions or need assistance, we're always here to help. Medaase!",
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_customer_appreciation',
        businessId: 'system',
        name: 'Loyal Customer Appreciation',
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        subject: 'Customer Appreciation',
        content:
          'Dear {{customerName}}, {{businessName}} values your continued loyalty and trust. Thank you for being such a wonderful customer. We look forward to serving you again soon!',
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_inactive_customer',
        businessId: 'system',
        name: 'Friendly Check-in / Re-engagement',
        type: 'INACTIVE_CUSTOMER',
        channel: 'whatsapp',
        subject: 'We miss you!',
        content:
          "Hello {{customerName}}, we noticed it has been a little while since your last visit to {{businessName}}. We'd love to welcome you back! Check in with us to see what's new in store.",
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_vip_follow_up',
        businessId: 'system',
        name: 'VIP Executive Check-in',
        type: 'VIP_FOLLOW_UP',
        channel: 'whatsapp',
        subject: 'VIP Customer Check-in',
        content:
          'Hello {{customerName}}, as one of our most valued customers at {{businessName}}, we wanted to personally reach out and see if there is anything we can prepare for you this week. Warm regards!',
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_payment_confirmation',
        businessId: 'system',
        name: 'Payment Receipt Confirmation',
        type: 'PAYMENT_CONFIRMATION',
        channel: 'whatsapp',
        subject: 'Payment Received',
        content:
          'Hello {{customerName}}, {{businessName}} confirms receipt of your payment{{receiptNumber ? " for receipt #" + receiptNumber : ""}}. Thank you for keeping your account in good standing!',
        variables: ['customerName', 'businessName', 'receiptNumber'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_general_message',
        businessId: 'system',
        name: 'General Customer Outreach',
        type: 'GENERAL_CUSTOMER_MESSAGE',
        channel: 'whatsapp',
        subject: 'Notice from Business',
        content: 'Hello {{customerName}}, this is a message from {{businessName}}. {{customMessage}}',
        variables: ['customerName', 'businessName', 'customMessage'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_loyalty_milestone',
        businessId: 'system',
        name: 'Loyalty Milestone Celebration',
        type: 'LOYALTY_MILESTONE',
        channel: 'whatsapp',
        subject: 'Milestone Unlocked',
        content:
          'Congratulations {{customerName}}! You have unlocked a new milestone with {{businessName}}. Thank you for your continued loyalty! Medaase!',
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_loyalty_reward',
        businessId: 'system',
        name: 'Loyalty Reward Notification',
        type: 'LOYALTY_REWARD',
        channel: 'whatsapp',
        subject: 'Loyalty Reward Available',
        content:
          'Hello {{customerName}}, you have accumulated loyalty reward points at {{businessName}}! Contact us or visit our store to redeem your reward.',
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'tmpl_sys_referral_acknowledgement',
        businessId: 'system',
        name: 'Customer Referral Appreciation',
        type: 'REFERRAL_ACKNOWLEDGEMENT',
        channel: 'whatsapp',
        subject: 'Referral Thank You',
        content:
          'Hello {{customerName}}, thank you for referring your friend to {{businessName}}! Your referral reward points have been credited to your loyalty account.',
        variables: ['customerName', 'businessName'],
        isSystem: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    for (const t of defaultTemplates) {
      const exists = this.data.communication_templates.some((existing) => existing.id === t.id);
      if (!exists) {
        this.data.communication_templates.push(t);
      }
    }
  }

  public getCommunications(
    businessId: string,
    filters?: {
      status?: string;
      customerId?: string;
      type?: string;
      channel?: string;
      search?: string;
    }
  ): CommunicationRecord[] {
    if (!this.data.communications) this.data.communications = [];
    return this.data.communications
      .filter((c) => {
        if (c.businessId !== businessId) return false;
        if (filters?.status && c.status !== filters.status) return false;
        if (filters?.customerId && c.customerId !== filters.customerId) return false;
        if (filters?.type && c.type !== filters.type) return false;
        if (filters?.channel && c.channel !== filters.channel) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const matchName = c.customerName?.toLowerCase().includes(q);
          const matchPhone = c.customerPhone?.includes(q);
          const matchMsg = c.message?.toLowerCase().includes(q);
          if (!matchName && !matchPhone && !matchMsg) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCommunicationById(id: string, businessId: string): CommunicationRecord | undefined {
    if (!this.data.communications) this.data.communications = [];
    return this.data.communications.find((c) => c.id === id && c.businessId === businessId);
  }

  public createCommunication(
    comm: Omit<CommunicationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): CommunicationRecord {
    if (!this.data.communications) this.data.communications = [];
    const now = new Date().toISOString();
    const newComm: CommunicationRecord = {
      id: this.generateId('comm'),
      ...comm,
      createdAt: now,
      updatedAt: now,
    };
    this.data.communications.unshift(newComm);
    this.saveData();
    return newComm;
  }

  public updateCommunication(
    id: string,
    businessId: string,
    updates: Partial<CommunicationRecord>
  ): CommunicationRecord | undefined {
    if (!this.data.communications) this.data.communications = [];
    const idx = this.data.communications.findIndex(
      (c) => c.id === id && c.businessId === businessId
    );
    if (idx === -1) return undefined;
    const existing = this.data.communications[idx];
    const updated: CommunicationRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
      customerId: existing.customerId,
      updatedAt: new Date().toISOString(),
    };
    this.data.communications[idx] = updated;
    this.saveData();
    return updated;
  }

  public deleteCommunication(id: string, businessId: string): boolean {
    if (!this.data.communications) this.data.communications = [];
    const initialLen = this.data.communications.length;
    this.data.communications = this.data.communications.filter(
      (c) => !(c.id === id && c.businessId === businessId)
    );
    if (this.data.communications.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public getCommunicationTemplates(businessId: string): CommunicationTemplate[] {
    if (!this.data.communication_templates) this.data.communication_templates = [];
    return this.data.communication_templates.filter(
      (t) => t.businessId === 'system' || t.businessId === businessId
    );
  }

  public getCommunicationTemplateById(
    id: string,
    businessId: string
  ): CommunicationTemplate | undefined {
    if (!this.data.communication_templates) this.data.communication_templates = [];
    return this.data.communication_templates.find(
      (t) => t.id === id && (t.businessId === 'system' || t.businessId === businessId)
    );
  }

  public createCommunicationTemplate(
    template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): CommunicationTemplate {
    if (!this.data.communication_templates) this.data.communication_templates = [];
    const now = new Date().toISOString();
    const newTmpl: CommunicationTemplate = {
      id: this.generateId('tmpl'),
      ...template,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    this.data.communication_templates.push(newTmpl);
    this.saveData();
    return newTmpl;
  }

  public updateCommunicationTemplate(
    id: string,
    businessId: string,
    updates: Partial<CommunicationTemplate>
  ): CommunicationTemplate | undefined {
    if (!this.data.communication_templates) this.data.communication_templates = [];
    const idx = this.data.communication_templates.findIndex(
      (t) => t.id === id && t.businessId === businessId && !t.isSystem
    );
    if (idx === -1) return undefined;
    const existing = this.data.communication_templates[idx];
    const updated: CommunicationTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
      isSystem: false,
      updatedAt: new Date().toISOString(),
    };
    this.data.communication_templates[idx] = updated;
    this.saveData();
    return updated;
  }

  public deleteCommunicationTemplate(id: string, businessId: string): boolean {
    if (!this.data.communication_templates) this.data.communication_templates = [];
    const initialLen = this.data.communication_templates.length;
    this.data.communication_templates = this.data.communication_templates.filter(
      (t) => !(t.id === id && t.businessId === businessId && !t.isSystem)
    );
    if (this.data.communication_templates.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public updateCustomerCommunicationPreferences(
    customerId: string,
    businessId: string,
    preferences: Partial<CustomerCommunicationPreferences>
  ): Customer | undefined {
    const customer = this.getCustomerById(customerId, businessId);
    if (!customer) return undefined;

    const currentPrefs: CustomerCommunicationPreferences = customer.communicationPreferences || {
      whatsappAllowed: true,
      marketingAllowed: false,
      operationalAllowed: true,
      debtRemindersAllowed: true,
      preferredChannel: 'whatsapp',
      optedOut: false,
    };

    const updatedPrefs: CustomerCommunicationPreferences = {
      ...currentPrefs,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };

    return this.updateCustomer(customerId, businessId, {
      communicationPreferences: updatedPrefs,
    });
  }

  // Generic Isolated Operations
  public getProducts(businessId: string, includeDeleted = false): Product[] {
    return this.data.products.filter(
      (p) => p.businessId === businessId && (includeDeleted || !p.isDeleted)
    );
  }

  public getProductById(id: string, businessId?: string): Product | undefined {
    return this.data.products.find((p) => p.id === id && (!businessId || p.businessId === businessId));
  }

  public addProduct(
    p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy?: string
  ): Product {
    const product: Product = {
      id: this.generateId('prod'),
      ...p,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.products.unshift(product);

    // Record initial stock movement if quantity > 0
    if (product.quantity > 0) {
      this.addStockMovement({
        businessId: product.businessId,
        productId: product.id,
        productName: product.name,
        movementType: 'initial',
        quantity: product.quantity,
        previousQuantity: 0,
        newQuantity: product.quantity,
        notes: 'Initial stock intake on creation',
        createdBy: createdBy || 'User',
      });
    }

    // Trigger low stock or out of stock alert if applicable
    if (product.quantity === 0) {
      this.createNotification({
        businessId: product.businessId,
        type: 'out_of_stock',
        title: 'Out of Stock Alert',
        message: `Product "${product.name}" was created with 0 units in stock.`,
        link: '/products',
      });
    } else if (product.quantity <= product.minStockLevel) {
      this.createNotification({
        businessId: product.businessId,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `Product "${product.name}" is low in stock (${product.quantity} remaining, min: ${product.minStockLevel}).`,
        link: '/products',
      });
    }

    this.saveData();
    return product;
  }

  public createProduct(
    p: any,
    createdBy?: string
  ): Product {
    return this.addProduct(p, createdBy);
  }

  public updateProduct(
    id: string,
    businessId: string,
    updates: Partial<Product>,
    movementReason?: string,
    createdBy?: string,
    idempotencyKey?: string
  ): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id && p.businessId === businessId);
    if (idx === -1) return null;

    const oldProduct = this.data.products[idx];
    const previousQuantity = oldProduct.quantity;
    const newQuantity = updates.quantity !== undefined ? Number(updates.quantity) : previousQuantity;

    this.data.products[idx] = {
      ...oldProduct,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedProduct = this.data.products[idx];

    // Check if stock quantity changed
    if (updates.quantity !== undefined && newQuantity !== previousQuantity) {
      const delta = newQuantity - previousQuantity;
      this.addStockMovement({
        businessId,
        productId: id,
        productName: updatedProduct.name,
        movementType: delta > 0 ? 'adjustment' : 'adjustment',
        quantity: delta,
        previousQuantity,
        newQuantity,
        idempotencyKey,
        notes: movementReason || (delta > 0 ? `Stock increased by +${delta}` : `Stock adjusted by ${delta}`),
        createdBy: createdBy || 'User',
      });

      if (newQuantity === 0) {
        this.createNotification({
          businessId,
          type: 'out_of_stock',
          title: 'Out of Stock Alert',
          message: `Product "${updatedProduct.name}" is now OUT OF STOCK.`,
          link: '/products',
        });
      } else if (newQuantity <= updatedProduct.minStockLevel) {
        this.createNotification({
          businessId,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `Product "${updatedProduct.name}" is LOW STOCK (${newQuantity} remaining, min: ${updatedProduct.minStockLevel}).`,
          link: '/products',
        });
      }
    }

    this.saveData();
    return updatedProduct;
  }

  public deleteProduct(id: string, businessId: string): boolean {
    const product = this.data.products.find((p) => p.id === id && p.businessId === businessId);
    if (!product) return false;

    // Check if product was referenced in sales or purchases
    const hasSales = this.data.sales.some(
      (s) => s.businessId === businessId && s.items.some((i) => i.productId === id)
    );
    const hasPurchases = this.data.purchases.some(
      (p) => p.businessId === businessId && p.items.some((i) => i.productId === id)
    );
    const hasMovements = (this.data.stock_movements || []).some(
      (m) => m.businessId === businessId && m.productId === id
    );

    if (hasSales || hasPurchases || hasMovements) {
      // Safe soft-delete to preserve historical transaction ledger
      product.isDeleted = true;
      product.updatedAt = new Date().toISOString();
      this.saveData();
      return true;
    }

    // Otherwise completely purge
    this.data.products = this.data.products.filter((p) => !(p.id === id && p.businessId === businessId));
    this.saveData();
    return true;
  }

  // Stock Movements
  public getStockMovements(businessId: string, productId?: string): StockMovement[] {
    if (productId) {
      return (this.data.stock_movements || []).filter(
        (m) => m.businessId === businessId && m.productId === productId
      );
    }
    return (this.data.stock_movements || []).filter((m) => m.businessId === businessId);
  }

  public addStockMovement(
    movement: Omit<StockMovement, 'id' | 'createdAt'>
  ): StockMovement {
    if (!this.data.stock_movements) {
      this.data.stock_movements = [];
    }
    const record: StockMovement = {
      id: this.generateId('sm'),
      ...movement,
      createdAt: new Date().toISOString(),
    };
    this.data.stock_movements.unshift(record);
    this.saveData();
    return record;
  }

  // Customers
  public getCustomers(businessId: string, includeDeleted = false): Customer[] {
    return this.data.customers.filter(
      (c) => c.businessId === businessId && (includeDeleted ? true : !c.isDeleted)
    );
  }

  public getCustomerById(id: string, businessId: string, includeDeleted = false): Customer | null {
    const cust = this.data.customers.find(
      (c) => c.id === id && c.businessId === businessId && (includeDeleted ? true : !c.isDeleted)
    );
    return cust || null;
  }

  public addCustomer(
    c: Omit<Customer, 'id' | 'totalPurchases' | 'amountPaid' | 'currentDebt' | 'createdAt'>
  ): Customer {
    const customer: Customer = {
      id: this.generateId('cust'),
      ...c,
      creditLimit: c.creditLimit !== undefined ? Number(c.creditLimit) : 0,
      totalPurchases: 0,
      amountPaid: 0,
      currentDebt: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    this.data.customers.unshift(customer);
    this.saveData();
    return customer;
  }

  public createCustomer(c: any): Customer {
    return this.addCustomer(c);
  }

  public updateCustomer(id: string, businessId: string, updates: Partial<Customer>): Customer | null {
    const idx = this.data.customers.findIndex((c) => c.id === id && c.businessId === businessId);
    if (idx === -1) return null;
    
    if (updates.creditLimit !== undefined) {
      updates.creditLimit = Number(updates.creditLimit) || 0;
    }

    this.data.customers[idx] = {
      ...this.data.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.customers[idx];
  }

  public deleteCustomer(id: string, businessId: string): boolean {
    const cust = this.data.customers.find((c) => c.id === id && c.businessId === businessId);
    if (!cust) return false;

    // Check for historical sales or payments
    const hasSales = this.data.sales.some((s) => s.businessId === businessId && s.customerId === id);
    const hasPayments = this.data.customer_payments.some((p) => p.businessId === businessId && p.customerId === id);
    const hasDebt = (cust.currentDebt || 0) > 0;

    if (hasSales || hasPayments || hasDebt) {
      // Soft-delete to protect historical sales ledger
      cust.isDeleted = true;
      cust.updatedAt = new Date().toISOString();
      this.saveData();
      return true;
    }

    const initialLen = this.data.customers.length;
    this.data.customers = this.data.customers.filter((c) => !(c.id === id && c.businessId === businessId));
    const deleted = this.data.customers.length < initialLen;
    if (deleted) this.saveData();
    return deleted;
  }

  // Sales & Inventory logic
  public getSales(businessId: string): Sale[] {
    return this.data.sales.filter((s) => s.businessId === businessId);
  }

  public createSale(saleData: Omit<Sale, 'id' | 'receiptNumber' | 'createdAt'>): Sale {
    // Generate Receipt Number using Africa/Accra business date
    const count = this.data.sales.filter((s) => s.businessId === saleData.businessId).length + 1;
    const dateStr = getAccraToday().replace(/-/g, '');
    const receiptNumber = `BM-${dateStr}-${String(count).padStart(4, '0')}`;

    // Resolve location (default to business default location if not specified)
    const defLoc = this.getDefaultLocation(saleData.businessId);
    const targetLocId = saleData.locationId || defLoc.id;
    const targetLoc = this.getLocationById(targetLocId, saleData.businessId) || defLoc;

    const sale: Sale = {
      id: this.generateId('sale'),
      receiptNumber,
      paymentStatus:
        saleData.paymentStatus ||
        (saleData.balance <= 0 ? 'Paid' : saleData.amountPaid > 0 ? 'Partial' : 'Unpaid'),
      ...saleData,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      createdAt: new Date().toISOString(),
    };

    this.data.sales.unshift(sale);

    // Update product stock
    for (const item of sale.items) {
      const prod = this.data.products.find(
        (p) => p.id === item.productId && p.businessId === sale.businessId
      );
      if (prod) {
        const prevQty = prod.quantity;
        prod.quantity = Math.max(0, prod.quantity - item.quantity);

        // Update location-scoped stock
        if (!prod.locationStock) {
          prod.locationStock = { [defLoc.id]: prevQty };
        }
        const curLocQty = prod.locationStock[targetLoc.id] ?? prod.quantity;
        prod.locationStock[targetLoc.id] = Math.max(0, curLocQty - item.quantity);

        prod.updatedAt = new Date().toISOString();

        // Record stock movement for the sale
        this.addStockMovement({
          businessId: sale.businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'sale',
          quantity: -item.quantity,
          previousQuantity: prevQty,
          newQuantity: prod.quantity,
          referenceId: sale.id,
          locationId: targetLoc.id,
          locationName: targetLoc.name,
          notes: `Sold in receipt #${sale.receiptNumber} (${targetLoc.name})`,
          createdBy: sale.createdBy || 'User',
        });

        // Check stock triggers
        if (prod.quantity === 0) {
          this.createNotification({
            businessId: sale.businessId,
            type: 'out_of_stock',
            title: 'Out of Stock Alert',
            message: `Product "${prod.name}" is now completely OUT OF STOCK (0 units remaining).`,
            link: '/products',
          });
        } else if (prod.quantity <= prod.minStockLevel) {
          this.createNotification({
            businessId: sale.businessId,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `Product "${prod.name}" has reached low stock level (${prod.quantity} remaining). Minimum threshold is ${prod.minStockLevel}.`,
            link: '/products',
          });
        }
      }
    }

    // Update customer debt and purchase totals
    if (sale.customerId) {
      const cust = this.data.customers.find(
        (c) => c.id === sale.customerId && c.businessId === sale.businessId
      );
      if (cust) {
        cust.totalPurchases += sale.total;
        cust.amountPaid += sale.amountPaid;
        cust.currentDebt += sale.balance;
        cust.updatedAt = new Date().toISOString();
      }
    }

    this.saveData();
    return sale;
  }

  // Customer Payments
  public getCustomerPayments(businessId: string): CustomerPayment[] {
    return this.data.customer_payments.filter((cp) => cp.businessId === businessId);
  }

  public recordCustomerPayment(
    paymentData: Omit<CustomerPayment, 'id' | 'createdAt'>
  ): CustomerPayment {
    const count = this.data.customer_payments.filter((cp) => cp.businessId === paymentData.businessId).length + 1;
    const dateStr = getAccraToday().replace(/-/g, '');
    const paymentNumber = paymentData.paymentNumber || `PAY-${dateStr}-${String(count).padStart(4, '0')}`;

    const payment: CustomerPayment = {
      id: this.generateId('pay'),
      paymentNumber,
      ...paymentData,
      createdAt: new Date().toISOString(),
    };
    this.data.customer_payments.unshift(payment);

    // If a specific sale was indicated, update that sale's balance and amountPaid
    if (payment.saleId) {
      const sale = this.data.sales.find((s) => s.id === payment.saleId && s.businessId === payment.businessId);
      if (sale) {
        sale.amountPaid += payment.amount;
        sale.balance = Math.max(0, sale.total - sale.amountPaid);
        sale.paymentStatus = sale.balance <= 0 ? 'Paid' : sale.amountPaid > 0 ? 'Partial' : 'Unpaid';
      }
    } else {
      // Allocate payment to oldest unpaid credit sales (FIFO)
      let unallocated = payment.amount;
      const unpaidSales = this.data.sales
        .filter((s) => s.customerId === payment.customerId && s.businessId === payment.businessId && s.balance > 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const s of unpaidSales) {
        if (unallocated <= 0) break;
        const deduction = Math.min(s.balance, unallocated);
        s.amountPaid += deduction;
        s.balance = Math.max(0, s.total - s.amountPaid);
        s.paymentStatus = s.balance <= 0 ? 'Paid' : s.amountPaid > 0 ? 'Partial' : 'Unpaid';
        unallocated -= deduction;
      }
    }

    // Deduct from customer debt and update amountPaid
    const cust = this.data.customers.find(
      (c) => c.id === payment.customerId && c.businessId === payment.businessId
    );
    if (cust) {
      // Recompute debt and amount paid accurately based on all sales
      const sales = this.data.sales.filter((s) => s.customerId === cust.id && s.businessId === cust.businessId);
      const totalPurchases = sales.reduce((sum, s) => sum + s.total, 0);
      const currentDebt = sales.reduce((sum, s) => sum + s.balance, 0);
      const totalPaid = Math.max(0, totalPurchases - currentDebt);

      cust.totalPurchases = totalPurchases;
      cust.amountPaid = totalPaid;
      cust.currentDebt = currentDebt;
      cust.updatedAt = new Date().toISOString();
    }

    // Create notification
    this.createNotification({
      businessId: payment.businessId,
      type: 'payment',
      title: 'Customer Payment Received',
      message: `Recorded payment of GH₵${payment.amount.toFixed(2)} from ${payment.customerName} via ${payment.paymentMethod}.`,
      link: '/debtors',
    });

    this.saveData();
    return payment;
  }

  // Expenses
  public getExpenses(businessId: string): Expense[] {
    return this.data.expenses.filter((e) => e.businessId === businessId);
  }

  public getExpenseById(id: string, businessId: string): Expense | undefined {
    return this.data.expenses.find((e) => e.id === id && e.businessId === businessId);
  }

  public addExpense(e: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expense: Expense = {
      id: this.generateId('exp'),
      ...e,
      createdAt: new Date().toISOString(),
    };
    this.data.expenses.unshift(expense);
    this.saveData();
    return expense;
  }

  public createExpense(e: Omit<Expense, 'id' | 'createdAt'>): Expense {
    return this.addExpense(e);
  }

  public updateExpense(id: string, businessId: string, updates: Partial<Expense>): Expense | null {
    const idx = this.data.expenses.findIndex((e) => e.id === id && e.businessId === businessId);
    if (idx === -1) return null;
    this.data.expenses[idx] = {
      ...this.data.expenses[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.expenses[idx];
  }

  public deleteExpense(id: string, businessId: string): boolean {
    const initialLen = this.data.expenses.length;
    this.data.expenses = this.data.expenses.filter((e) => !(e.id === id && e.businessId === businessId));
    const deleted = this.data.expenses.length < initialLen;
    if (deleted) this.saveData();
    return deleted;
  }

  // Suppliers
  public getSuppliers(businessId: string): Supplier[] {
    return this.data.suppliers.filter((s) => s.businessId === businessId);
  }

  public getSupplierById(id: string, businessId: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id && s.businessId === businessId);
  }

  public addSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
    const supplier: Supplier = {
      id: this.generateId('sup'),
      ...s,
      createdAt: new Date().toISOString(),
    };
    this.data.suppliers.unshift(supplier);
    this.saveData();
    return supplier;
  }

  public updateSupplier(id: string, businessId: string, updates: Partial<Supplier>): Supplier | null {
    const idx = this.data.suppliers.findIndex((s) => s.id === id && s.businessId === businessId);
    if (idx === -1) return null;
    this.data.suppliers[idx] = {
      ...this.data.suppliers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.suppliers[idx];
  }

  public deleteSupplier(id: string, businessId: string): boolean {
    const initialLen = this.data.suppliers.length;
    this.data.suppliers = this.data.suppliers.filter((s) => !(s.id === id && s.businessId === businessId));
    const deleted = this.data.suppliers.length < initialLen;
    if (deleted) this.saveData();
    return deleted;
  }

  // Purchases & Stock Increment
  public getPurchases(businessId: string): Purchase[] {
    return this.data.purchases.filter((p) => p.businessId === businessId);
  }

  public getPurchaseById(id: string, businessId: string): Purchase | undefined {
    return this.data.purchases.find((p) => p.id === id && p.businessId === businessId);
  }

  public recordPurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt'>): Purchase {
    // Idempotency check: prevent duplicate stock-in
    if (purchaseData.idempotencyKey) {
      const existing = this.data.purchases.find(
        (p) => p.businessId === purchaseData.businessId && p.idempotencyKey === purchaseData.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    // Resolve location
    const defLoc = this.getDefaultLocation(purchaseData.businessId);
    const targetLocId = purchaseData.locationId || defLoc.id;
    const targetLoc = this.getLocationById(targetLocId, purchaseData.businessId) || defLoc;

    const purchase: Purchase = {
      id: this.generateId('purch'),
      ...purchaseData,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      createdAt: new Date().toISOString(),
    };
    this.data.purchases.unshift(purchase);

    // Increase product inventory & update buying price
    for (const item of purchase.items) {
      const prod = this.data.products.find(
        (p) => p.id === item.productId && p.businessId === purchase.businessId
      );
      if (prod) {
        const prevQty = prod.quantity;
        prod.quantity += item.quantity;
        if (item.buyingPrice > 0) {
          prod.buyingPrice = item.buyingPrice;
        }

        // Update location-scoped stock
        if (!prod.locationStock) {
          prod.locationStock = { [defLoc.id]: prevQty };
        }
        const curLocQty = prod.locationStock[targetLoc.id] ?? 0;
        prod.locationStock[targetLoc.id] = curLocQty + item.quantity;

        prod.updatedAt = new Date().toISOString();

        // Record stock movement for the purchase
        this.addStockMovement({
          businessId: purchase.businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'purchase',
          quantity: item.quantity,
          previousQuantity: prevQty,
          newQuantity: prod.quantity,
          referenceId: purchase.id,
          locationId: targetLoc.id,
          locationName: targetLoc.name,
          notes: `Purchased from ${purchase.supplierName || 'Supplier'}${purchase.invoiceNumber ? ` (Inv: ${purchase.invoiceNumber})` : ''} (${targetLoc.name})`,
          createdBy: purchase.createdBy || 'User',
        });
      }
    }

    this.saveData();
    return purchase;
  }

  // Invoices
  public getInvoices(businessId: string): Invoice[] {
    return this.data.invoices
      .filter((i) => i.businessId === businessId)
      .map((inv) => ({
        ...inv,
        items: (inv.items || []).filter(
          (it) => it && it.description && it.description.trim() && Number(it.unitPrice) > 0
        ),
      }));
  }

  public createInvoice(invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>): Invoice {
    const count = this.data.invoices.filter((i) => i.businessId === invoiceData.businessId).length + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count).padStart(4, '0')}`;

    const invoice: Invoice = {
      id: this.generateId('inv'),
      invoiceNumber,
      ...invoiceData,
      createdAt: new Date().toISOString(),
    };
    this.data.invoices.unshift(invoice);
    this.saveData();
    return invoice;
  }

  public updateInvoice(id: string, businessId: string, updates: Partial<Invoice>): Invoice | null {
    const idx = this.data.invoices.findIndex((i) => i.id === id && i.businessId === businessId);
    if (idx === -1) return null;
    this.data.invoices[idx] = { ...this.data.invoices[idx], ...updates };
    this.saveData();
    return this.data.invoices[idx];
  }

  public deleteInvoice(id: string, businessId: string): boolean {
    const initialLen = this.data.invoices.length;
    this.data.invoices = this.data.invoices.filter((i) => !(i.id === id && i.businessId === businessId));
    const deleted = this.data.invoices.length < initialLen;
    if (deleted) this.saveData();
    return deleted;
  }

  // Subscriptions
  public getSubscriptions(): Subscription[] {
    return this.data.subscriptions;
  }

  public getSubscription(businessId: string): Subscription | undefined {
    return this.data.subscriptions.find((s) => s.businessId === businessId);
  }

  public getSubscriptionById(id: string): Subscription | undefined {
    return this.data.subscriptions.find((s) => s.id === id || s.businessId === id);
  }

  public updateSubscriptionPlan(
    subscriptionId: string,
    rawPlan: string,
    adminUser?: User
  ): Subscription | null {
    let sub = this.data.subscriptions.find(
      (s) => s.id === subscriptionId || s.businessId === subscriptionId
    );
    const now = new Date().toISOString();
    const planLower = rawPlan.toLowerCase().trim();
    const validPlan =
      planLower === 'starter' ? 'starter' : planLower === 'business' ? 'business' : 'free';
    const planPrices: Record<string, number> = {
      free: 0,
      starter: 49,
      business: 99,
    };
    const price = planPrices[validPlan];
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (!sub) {
      // Create subscription if not existing
      sub = {
        id: this.generateId('sub'),
        businessId: subscriptionId,
        plan: validPlan,
        status: 'active',
        amount: price,
        currency: 'GHS',
        interval: 'monthly',
        startDate: now,
        nextBillingDate: nextBilling,
        createdAt: now,
        updatedAt: now,
        startedAt: now,
        expiresAt: nextBilling,
        priceGh: price,
      };
      this.data.subscriptions.push(sub);
    } else {
      sub.plan = validPlan;
      sub.amount = price;
      sub.currency = 'GHS';
      sub.interval = 'monthly';
      sub.status = 'active';
      sub.updatedAt = now;
      sub.paymentProvider = 'manual_admin';
      sub.paymentReference = `ADM-${Date.now().toString().slice(-6)}`;
      sub.nextBillingDate = nextBilling;
      sub.priceGh = price;
      sub.expiresAt = nextBilling;
    }

    // Sync business plan
    const biz = this.data.businesses.find((b) => b.id === sub.businessId);
    if (biz) {
      biz.plan = validPlan.toUpperCase() as any;
      biz.updatedAt = now;
    }

    // Record audit event
    this.logAudit({
      businessId: sub.businessId,
      userId: adminUser?.id || 'usr_admin_system',
      userName: adminUser?.fullName || 'Master Admin',
      action: 'admin_subscription_plan_change',
      details: `Master Admin manually changed subscription plan for "${biz?.name || sub.businessId}" to ${validPlan.toUpperCase()} (Manual Admin Plan Change).`,
    });

    this.saveData();
    return sub;
  }

  public updateSubscriptionStatus(
    subscriptionId: string,
    rawStatus: string,
    adminUser: User
  ): Subscription | null {
    const sub = this.data.subscriptions.find(
      (s) => s.id === subscriptionId || s.businessId === subscriptionId
    );
    if (!sub) return null;

    const statusLower = rawStatus.toLowerCase().trim();
    const validStatuses = ['active', 'pending', 'past_due', 'cancelled', 'expired'];
    const status = validStatuses.includes(statusLower) ? statusLower : 'active';

    const now = new Date().toISOString();
    sub.status = status;
    sub.updatedAt = now;
    if (status === 'cancelled' || status === 'expired') {
      sub.endDate = now;
    }

    const biz = this.data.businesses.find((b) => b.id === sub.businessId);

    // Record audit event
    this.logAudit({
      businessId: sub.businessId,
      userId: adminUser.id,
      userName: adminUser.fullName || 'Master Admin',
      action: 'admin_subscription_status_change',
      details: `Master Admin changed subscription status for "${biz?.name || sub.businessId}" to ${status.toUpperCase()}.`,
    });

    this.saveData();
    return sub;
  }

  public updateSubscription(businessId: string, plan: 'FREE' | 'STARTER' | 'BUSINESS'): Subscription {
    let sub = this.data.subscriptions.find((s) => s.businessId === businessId);
    const planLower = plan.toLowerCase();
    const prices: Record<string, number> = { free: 0, starter: 49, business: 99 };
    const now = new Date().toISOString();
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (!sub) {
      sub = {
        id: this.generateId('sub'),
        businessId,
        plan: planLower,
        status: 'active',
        amount: prices[planLower] || 0,
        currency: 'GHS',
        interval: 'monthly',
        startDate: now,
        nextBillingDate: nextBilling,
        createdAt: now,
        updatedAt: now,
        paymentReference: 'none',
        paymentProvider: 'none',
        startedAt: now,
        expiresAt: nextBilling,
        priceGh: prices[planLower] || 0,
      };
      this.data.subscriptions.push(sub);
    } else {
      sub.plan = planLower;
      sub.amount = prices[planLower] || 0;
      sub.priceGh = prices[planLower] || 0;
      sub.status = 'active';
      sub.updatedAt = now;
      sub.nextBillingDate = nextBilling;
      sub.expiresAt = nextBilling;
    }
    this.saveData();
    return sub;
  }

  public createSubscriptionPayment(payment: SubscriptionPayment): SubscriptionPayment {
    if (!this.data.subscription_payments) {
      this.data.subscription_payments = [];
    }
    this.data.subscription_payments.push(payment);
    this.saveData();
    return payment;
  }

  public findSubscriptionPaymentByReference(reference: string): SubscriptionPayment | null {
    if (!this.data.subscription_payments) return null;
    const cleanRef = reference.trim();
    return this.data.subscription_payments.find(
      (p) => p.reference === cleanRef || p.id === cleanRef
    ) || null;
  }

  public getSubscriptionPayments(businessId?: string): SubscriptionPayment[] {
    const list = this.data.subscription_payments || [];
    if (!businessId) return list;
    return list.filter((p) => p.businessId === businessId);
  }

  public updateSubscriptionPayment(
    referenceOrId: string,
    updates: Partial<SubscriptionPayment>
  ): SubscriptionPayment | null {
    if (!this.data.subscription_payments) return null;
    const payment = this.data.subscription_payments.find(
      (p) => p.reference === referenceOrId || p.id === referenceOrId
    );
    if (!payment) return null;

    Object.assign(payment, updates, { updatedAt: new Date().toISOString() });
    this.saveData();
    return payment;
  }

  /**
   * Idempotent fulfillment of a verified Paystack payment.
   * Activates/renews the subscription and logs audit/notification records.
   */
  public fulfillSubscriptionPayment(
    reference: string,
    paystackData: any
  ): { payment: SubscriptionPayment; subscription: Subscription; alreadyFulfilled: boolean } {
    if (!this.data.subscription_payments) {
      this.data.subscription_payments = [];
    }

    const payment = this.findSubscriptionPaymentByReference(reference);
    if (!payment) {
      throw new Error(`Payment record with reference "${reference}" not found.`);
    }

    // Check if already fulfilled for idempotency
    const isAlreadySuccess =
      payment.status === 'success' ||
      payment.status === 'Successful';

    const sub = this.data.subscriptions.find((s) => s.businessId === payment.businessId);

    if (isAlreadySuccess && sub && sub.paymentReference === payment.reference) {
      return { payment, subscription: sub, alreadyFulfilled: true };
    }

    const nowIso = new Date().toISOString();
    const nextBillingIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const planLower = (payment.plan || 'starter').toLowerCase();
    const planUpper = planLower.toUpperCase();

    // 1. Mark payment as successful
    payment.status = 'success';
    payment.paidAt = paystackData.paid_at || nowIso;
    payment.paystackTransactionId = paystackData.id;
    payment.paymentDate = paystackData.paid_at || nowIso;
    payment.provider = 'paystack';
    payment.updatedAt = nowIso;
    if (paystackData.channel) {
      payment.paymentMethod = paystackData.channel;
    }

    // 2. Activate / Update the Business Subscription
    let activeSub = sub;
    if (!activeSub) {
      activeSub = {
        id: this.generateId('sub'),
        businessId: payment.businessId,
        plan: planLower,
        status: 'active',
        amount: payment.amount,
        priceGh: payment.amount,
        currency: 'GHS',
        interval: 'monthly',
        startDate: nowIso,
        nextBillingDate: nextBillingIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        paymentReference: payment.reference,
        paymentProvider: 'paystack',
        startedAt: nowIso,
        expiresAt: nextBillingIso,
      };
      this.data.subscriptions.push(activeSub);
    } else {
      activeSub.plan = planLower;
      activeSub.amount = payment.amount;
      activeSub.priceGh = payment.amount;
      activeSub.status = 'active';
      activeSub.startDate = nowIso;
      activeSub.startedAt = nowIso;
      activeSub.nextBillingDate = nextBillingIso;
      activeSub.expiresAt = nextBillingIso;
      activeSub.paymentReference = payment.reference;
      activeSub.paymentProvider = 'paystack';
      activeSub.updatedAt = nowIso;
    }

    // 3. Update Business Entity Plan
    const biz = this.data.businesses.find((b) => b.id === payment.businessId);
    if (biz) {
      biz.plan = planUpper as any;
      biz.updatedAt = nowIso;
    }

    // 4. Log Audit Event
    const user = this.data.users.find((u) => u.id === payment.userId) || {
      id: payment.userId || 'system',
      fullName: payment.ownerName || 'Merchant',
    };

    this.logAudit({
      businessId: payment.businessId,
      userId: user.id,
      userName: user.fullName || 'Merchant',
      action: 'paystack_subscription_activated',
      details: `Paystack Test Mode payment of GH₵${payment.amount.toFixed(2)} verified (Ref: ${payment.reference}). ${planUpper} subscription activated for ${biz?.name || payment.businessId}.`,
    });

    // 5. Send In-App Notification to Merchant
    this.createNotification({
      businessId: payment.businessId,
      type: 'payment_received',
      title: `Subscription Activated: ${planUpper} Plan`,
      message: `Your ${planUpper} plan subscription (GH₵${payment.amount.toFixed(2)}/mo) has been successfully activated via Paystack Test Mode. Next renewal is on ${new Date(nextBillingIso).toLocaleDateString('en-GB')}.`,
      link: '/settings',
    });

    // 6. Generate Server-Authoritative Billing Invoice (Stage 4R)
    if (!this.data.billing_invoices) this.data.billing_invoices = [];
    const existingInvoice = this.data.billing_invoices.find((i) => i.paymentReference === payment.reference);
    if (!existingInvoice) {
      const datePart = (getAccraToday() || '2026-09-23').replace(/-/g, '').slice(0, 6);
      const rand = Math.floor(1000 + Math.random() * 9000);
      const cleanBiz = (payment.businessId || 'BIZ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const invoiceNumber = `BMGH-INV-${datePart}-${cleanBiz}-${rand}`;

      this.data.billing_invoices.push({
        id: this.generateId('binv'),
        invoiceNumber,
        businessId: payment.businessId,
        subscriptionId: activeSub.id,
        plan: planLower,
        billingInterval: 'monthly',
        billingPeriodStart: nowIso,
        billingPeriodEnd: nextBillingIso,
        amount: payment.amount,
        currency: payment.currency || 'GHS',
        status: 'PAID',
        paymentReference: payment.reference,
        paymentMethod: payment.provider || 'paystack',
        paidAt: nowIso,
        createdAt: nowIso,
      });
    }

    this.saveData();
    return { payment, subscription: activeSub, alreadyFulfilled: false };
  }

  // Billing Invoices (Stage 4R)
  public getBillingInvoices(businessId?: string): BillingInvoice[] {
    const list = this.data.billing_invoices || [];
    if (!businessId) return list;
    return list.filter((inv) => inv.businessId === businessId);
  }

  public getBillingInvoiceById(id: string): BillingInvoice | null {
    const list = this.data.billing_invoices || [];
    return list.find((inv) => inv.id === id || inv.invoiceNumber === id) || null;
  }

  public createBillingInvoice(invoice: BillingInvoice): BillingInvoice {
    if (!this.data.billing_invoices) {
      this.data.billing_invoices = [];
    }
    this.data.billing_invoices.push(invoice);
    this.saveData();
    return invoice;
  }

  public updateBillingInvoice(
    id: string,
    updates: Partial<BillingInvoice>
  ): BillingInvoice | null {
    if (!this.data.billing_invoices) return null;
    const inv = this.data.billing_invoices.find((i) => i.id === id || i.invoiceNumber === id);
    if (!inv) return null;
    Object.assign(inv, updates);
    this.saveData();
    return inv;
  }

  public startBusinessTrial(
    businessId: string,
    plan: 'starter' | 'business',
    durationDays: number = 14,
    actor: { id: string; fullName: string }
  ): Subscription {
    let sub = this.data.subscriptions.find((s) => s.businessId === businessId);
    const now = new Date();
    const nowIso = now.toISOString();
    const trialEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const prices: Record<string, number> = { starter: 49, business: 99 };
    const amount = prices[plan] || 0;

    if (!sub) {
      sub = {
        id: this.generateId('sub'),
        businessId,
        plan,
        status: 'TRIALING',
        amount,
        priceGh: amount,
        currency: 'GHS',
        interval: 'monthly',
        startDate: nowIso,
        nextBillingDate: trialEnd,
        createdAt: nowIso,
        updatedAt: nowIso,
        startedAt: nowIso,
        expiresAt: trialEnd,
        trialStart: nowIso,
        trialEnd,
        renewalStatus: 'RENEW_AUTO',
      };
      this.data.subscriptions.push(sub);
    } else {
      sub.plan = plan;
      sub.status = 'TRIALING';
      sub.trialStart = nowIso;
      sub.trialEnd = trialEnd;
      sub.nextBillingDate = trialEnd;
      sub.expiresAt = trialEnd;
      sub.updatedAt = nowIso;
    }

    const biz = this.data.businesses.find((b) => b.id === businessId);
    if (biz) {
      biz.plan = plan.toUpperCase() as any;
      biz.updatedAt = nowIso;
    }

    this.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.fullName,
      action: 'SUBSCRIPTION_TRIAL_STARTED',
      details: `${durationDays}-day trial started for ${plan.toUpperCase()} plan (Ends: ${new Date(trialEnd).toLocaleDateString('en-GB')}).`,
    });

    this.createNotification({
      businessId,
      type: 'proactive_alert',
      title: `${plan.toUpperCase()} Free Trial Activated`,
      message: `Your ${durationDays}-day free trial of the ${plan.toUpperCase()} plan is now active until ${new Date(trialEnd).toLocaleDateString('en-GB')}. Enjoy premium features!`,
      link: '/settings',
    });

    this.saveData();
    return sub;
  }

  public cancelSubscription(
    businessId: string,
    reason: string = '',
    actor: { id: string; fullName: string },
    immediate: boolean = false
  ): Subscription | null {
    const sub = this.data.subscriptions.find((s) => s.businessId === businessId);
    if (!sub) return null;

    const nowIso = new Date().toISOString();
    sub.cancelledAt = nowIso;
    sub.cancellationReason = reason || 'Customer requested';
    sub.renewalStatus = 'DO_NOT_RENEW';

    if (immediate) {
      sub.status = 'CANCELLED';
      sub.cancellationEffectiveAt = nowIso;
      sub.endDate = nowIso;
      const biz = this.data.businesses.find((b) => b.id === businessId);
      if (biz) {
        biz.plan = 'FREE';
        biz.updatedAt = nowIso;
      }
    } else {
      // Effective at period end
      sub.cancellationEffectiveAt = sub.nextBillingDate || sub.expiresAt || nowIso;
    }
    sub.updatedAt = nowIso;

    this.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.fullName,
      action: 'SUBSCRIPTION_CANCELLATION_REQUESTED',
      details: `Subscription cancellation requested (${immediate ? 'immediate' : 'at period end: ' + sub.cancellationEffectiveAt}). Reason: ${reason || 'None provided'}`,
    });

    this.createNotification({
      businessId,
      type: 'proactive_alert',
      title: 'Subscription Cancellation Scheduled',
      message: immediate
        ? 'Your subscription has been cancelled immediately.'
        : `Your subscription will remain active until the end of your billing period (${new Date(sub.cancellationEffectiveAt!).toLocaleDateString('en-GB')}).`,
      link: '/settings',
    });

    this.saveData();
    return sub;
  }

  // Admin Data operations
  public getAdminStats() {
    return {
      totalUsers: this.data.users.length,
      totalBusinesses: this.data.businesses.length,
      totalSalesCount: this.data.sales.length,
      totalSalesRevenue: this.data.sales.reduce((sum, s) => sum + s.total, 0),
      totalExpenses: this.data.expenses.reduce((sum, e) => sum + e.amount, 0),
      subscriptions: this.data.subscriptions,
      users: this.data.users.map((u) => this.sanitizeUser(u)),
      businesses: this.data.businesses,
      auditLogs: this.data.audit_logs.slice(0, 100),
    };
  }

  // ==========================================
  // STAGE 4N: LOYALTY & RETENTION
  // ==========================================

  public getLoyaltyConfig(businessId: string): LoyaltyConfig {
    if (!this.data.loyalty_configs) this.data.loyalty_configs = [];
    const found = this.data.loyalty_configs.find((c) => c.businessId === businessId);
    if (found) return found;

    const defaultConfig: LoyaltyConfig = {
      businessId,
      enabled: true,
      pointsPerCurrencyUnit: 0.1, // 1 point per GH₵10 spent (GH₵100 = 10 pts)
      minimumPurchaseForPoints: 10,
      minimumPointsToRedeem: 50,
      pointValue: 0.05, // 1 point = GH₵0.05
      pointValueGhs: 0.05,
      pointsExpiryDays: 365,
      allowReferralRewards: true,
      referralRewardPoints: 20,
      allowMilestoneRewards: true,
      requireApprovalForRewards: false,
      tiers: [
        { tier: 'Standard', minSpend: 0, minOrders: 0, multiplier: 1.0, perksDescription: 'Base member earning rate' },
        { tier: 'Silver', minSpend: 500, minOrders: 5, multiplier: 1.25, perksDescription: '1.25x points multiplier + member deals' },
        { tier: 'Gold', minSpend: 1500, minOrders: 15, multiplier: 1.5, perksDescription: '1.5x points multiplier + priority assistance' },
        { tier: 'VIP', minSpend: 3000, minOrders: 25, multiplier: 2.0, perksDescription: '2.0x points multiplier + VIP perks & concierge' },
      ],
      updatedAt: new Date().toISOString(),
    };

    this.data.loyalty_configs.push(defaultConfig);
    this.saveData();
    return defaultConfig;
  }

  public updateLoyaltyConfig(businessId: string, updates: Partial<LoyaltyConfig>): LoyaltyConfig {
    if (!this.data.loyalty_configs) this.data.loyalty_configs = [];
    const existing = this.getLoyaltyConfig(businessId);
    const pointVal = updates.pointValueGhs !== undefined ? updates.pointValueGhs : (updates.pointValue !== undefined ? updates.pointValue : existing.pointValue);
    const updated: LoyaltyConfig = {
      ...existing,
      ...updates,
      pointValue: pointVal,
      pointValueGhs: pointVal,
      businessId, // strictly tenant-scoped
      updatedAt: new Date().toISOString(),
    };
    const idx = this.data.loyalty_configs.findIndex((c) => c.businessId === businessId);
    if (idx >= 0) {
      this.data.loyalty_configs[idx] = updated;
    } else {
      this.data.loyalty_configs.push(updated);
    }
    this.saveData();
    return updated;
  }

  public getLoyaltyLedger(businessId: string, customerId?: string): LoyaltyLedgerEntry[] {
    if (!this.data.loyalty_ledger) this.data.loyalty_ledger = [];
    return this.data.loyalty_ledger
      .filter((e) => {
        if (e.businessId !== businessId) return false;
        if (customerId && e.customerId !== customerId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findLedgerEntryByDedupKey(dedupKey: string): LoyaltyLedgerEntry | undefined {
    if (!this.data.loyalty_ledger) this.data.loyalty_ledger = [];
    return this.data.loyalty_ledger.find((e) => e.dedupKey === dedupKey);
  }

  public getCustomerPointsBalance(
    businessId: string,
    customerId: string
  ): { balance: number; earned: number; redeemed: number } {
    if (!this.data.loyalty_ledger) this.data.loyalty_ledger = [];
    const entries = this.data.loyalty_ledger.filter(
      (e) => e.businessId === businessId && e.customerId === customerId
    );

    let earned = 0;
    let redeemed = 0;
    let balance = 0;

    for (const e of entries) {
      balance += e.points;
      if (e.points > 0) {
        earned += e.points;
      } else {
        redeemed += Math.abs(e.points);
      }
    }

    return {
      balance: Math.max(0, balance),
      earned,
      redeemed,
    };
  }

  public addLoyaltyLedgerEntry(
    entry: Omit<LoyaltyLedgerEntry, 'id' | 'createdAt' | 'balanceAfter'>
  ): LoyaltyLedgerEntry {
    if (!this.data.loyalty_ledger) this.data.loyalty_ledger = [];
    
    // Check dedupKey if present
    if (entry.dedupKey) {
      const existing = this.data.loyalty_ledger.find((e) => e.dedupKey === entry.dedupKey);
      if (existing) {
        return existing;
      }
    }

    const currentStats = this.getCustomerPointsBalance(entry.businessId, entry.customerId);
    const balanceAfter = Math.max(0, currentStats.balance + entry.points);

    const now = new Date().toISOString();
    const newEntry: LoyaltyLedgerEntry = {
      ...entry,
      id: this.generateId('ledg'),
      balanceAfter,
      createdAt: now,
    };

    this.data.loyalty_ledger.unshift(newEntry);
    this.saveData();
    return newEntry;
  }

  public getLoyaltyMilestones(businessId: string, customerId?: string): LoyaltyMilestoneRecord[] {
    if (!this.data.loyalty_milestones) this.data.loyalty_milestones = [];
    return this.data.loyalty_milestones
      .filter((m) => {
        if (m.businessId !== businessId) return false;
        if (customerId && m.customerId !== customerId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  public recordLoyaltyMilestone(
    record: Omit<LoyaltyMilestoneRecord, 'id' | 'completedAt'>
  ): LoyaltyMilestoneRecord {
    if (!this.data.loyalty_milestones) this.data.loyalty_milestones = [];
    const existing = this.data.loyalty_milestones.find((m) => m.dedupKey === record.dedupKey);
    if (existing) return existing;

    const newRecord: LoyaltyMilestoneRecord = {
      ...record,
      pointsAwarded: record.rewardPoints || (record as any).pointsAwarded || 10,
      id: this.generateId('mlst'),
      completedAt: new Date().toISOString(),
    };
    this.data.loyalty_milestones.unshift(newRecord);
    this.saveData();
    return newRecord;
  }

  public getLoyaltyReferrals(
    businessId: string,
    options?: { referrerCustomerId?: string; referredCustomerId?: string }
  ): LoyaltyReferral[] {
    if (!this.data.loyalty_referrals) this.data.loyalty_referrals = [];
    return this.data.loyalty_referrals
      .filter((r) => {
        if (r.businessId !== businessId) return false;
        if (options?.referrerCustomerId && r.referrerCustomerId !== options.referrerCustomerId) return false;
        if (options?.referredCustomerId && r.referredCustomerId !== options.referredCustomerId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createLoyaltyReferral(
    referral: Omit<LoyaltyReferral, 'id' | 'createdAt'>
  ): LoyaltyReferral {
    if (!this.data.loyalty_referrals) this.data.loyalty_referrals = [];
    const newRef: LoyaltyReferral = {
      ...referral,
      id: this.generateId('ref'),
      createdAt: new Date().toISOString(),
    };
    this.data.loyalty_referrals.unshift(newRef);
    this.saveData();
    return newRef;
  }

  public updateLoyaltyReferral(
    id: string,
    businessId: string,
    updates: Partial<LoyaltyReferral>
  ): LoyaltyReferral | undefined {
    if (!this.data.loyalty_referrals) this.data.loyalty_referrals = [];
    const idx = this.data.loyalty_referrals.findIndex(
      (r) => r.id === id && r.businessId === businessId
    );
    if (idx === -1) return undefined;

    const existing = this.data.loyalty_referrals[idx];
    const updated: LoyaltyReferral = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
    };
    this.data.loyalty_referrals[idx] = updated;
    this.saveData();
    return updated;
  }

  public getRedemptions(businessId: string, customerId?: string): LoyaltyRewardRedemption[] {
    if (!this.data.loyalty_rewards) this.data.loyalty_rewards = [];
    return this.data.loyalty_rewards
      .filter((r) => {
        if (r.businessId !== businessId) return false;
        if (customerId && r.customerId !== customerId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createRedemption(
    redemption: Omit<LoyaltyRewardRedemption, 'id' | 'createdAt'>
  ): LoyaltyRewardRedemption {
    if (!this.data.loyalty_rewards) this.data.loyalty_rewards = [];
    const newRwd: LoyaltyRewardRedemption = {
      ...redemption,
      id: this.generateId('rwd'),
      createdAt: new Date().toISOString(),
    };
    this.data.loyalty_rewards.unshift(newRwd);
    this.saveData();
    return newRwd;
  }

  public updateRedemption(
    id: string,
    businessId: string,
    updates: Partial<LoyaltyRewardRedemption>
  ): LoyaltyRewardRedemption | undefined {
    if (!this.data.loyalty_rewards) this.data.loyalty_rewards = [];
    const idx = this.data.loyalty_rewards.findIndex((r) => r.id === id && r.businessId === businessId);
    if (idx === -1) return undefined;
    const existing = this.data.loyalty_rewards[idx];
    const updated: LoyaltyRewardRedemption = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
    };
    this.data.loyalty_rewards[idx] = updated;
    this.saveData();
    return updated;
  }

  // ==========================================
  // STAGE 4P — MULTI-LOCATION & BRANCH EXPANSION
  // ==========================================

  public getDefaultLocation(businessId: string): Location {
    if (!this.data.locations) this.data.locations = [];
    let def = this.data.locations.find((l) => l.businessId === businessId && l.isDefault);
    if (!def) {
      // Find any existing active location for this business
      const existing = this.data.locations.find((l) => l.businessId === businessId);
      if (existing) {
        existing.isDefault = true;
        existing.status = 'ACTIVE';
        existing.updatedAt = new Date().toISOString();
        def = existing;
        this.saveData();
      } else {
        const biz = this.getBusinessById(businessId);
        const bizName = biz?.name || 'Main';
        const locCity = biz?.city || biz?.location || 'Accra';
        const now = new Date().toISOString();
        def = {
          id: this.generateId('loc'),
          businessId,
          name: `${bizName} - Main Branch`,
          code: 'MAIN',
          type: 'SHOP',
          city: locCity,
          region: biz?.region || 'Greater Accra',
          country: 'Ghana',
          phone: biz?.phone || '',
          status: 'ACTIVE',
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        };
        this.data.locations.push(def);
        this.saveData();
      }
    }
    return def;
  }

  public getLocations(businessId: string): Location[] {
    if (!this.data.locations) this.data.locations = [];
    // Ensure default location exists
    this.getDefaultLocation(businessId);
    return this.data.locations.filter((l) => l.businessId === businessId);
  }

  public getLocationById(id: string, businessId?: string): Location | null {
    if (!this.data.locations) this.data.locations = [];
    return (
      this.data.locations.find(
        (l) => l.id === id && (!businessId || l.businessId === businessId)
      ) || null
    );
  }

  public getLocationByCode(code: string, businessId: string): Location | null {
    if (!this.data.locations) this.data.locations = [];
    const norm = code.trim().toUpperCase();
    return (
      this.data.locations.find(
        (l) => l.businessId === businessId && l.code.toUpperCase() === norm
      ) || null
    );
  }

  public createLocation(
    data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>
  ): Location {
    if (!this.data.locations) this.data.locations = [];
    const code = (data.code || '').trim().toUpperCase();
    if (!code) {
      throw new Error('Location code is required');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Location name is required');
    }

    const existingCode = this.getLocationByCode(code, data.businessId);
    if (existingCode) {
      throw new Error(`Location code '${code}' already exists for this business`);
    }

    if (data.isDefault) {
      // Unset previous default location
      for (const loc of this.data.locations) {
        if (loc.businessId === data.businessId && loc.isDefault) {
          loc.isDefault = false;
          loc.updatedAt = new Date().toISOString();
        }
      }
    }

    const now = new Date().toISOString();
    const newLoc: Location = {
      ...data,
      id: this.generateId('loc'),
      code,
      name: data.name.trim(),
      type: data.type || 'BRANCH',
      status: data.status || 'ACTIVE',
      isDefault: Boolean(data.isDefault),
      country: data.country || 'Ghana',
      createdAt: now,
      updatedAt: now,
    };

    this.data.locations.push(newLoc);
    this.saveData();
    return newLoc;
  }

  public updateLocation(
    id: string,
    businessId: string,
    updates: Partial<Location>
  ): Location | null {
    if (!this.data.locations) this.data.locations = [];
    const loc = this.data.locations.find((l) => l.id === id && l.businessId === businessId);
    if (!loc) return null;

    if (updates.code) {
      const norm = updates.code.trim().toUpperCase();
      const existing = this.getLocationByCode(norm, businessId);
      if (existing && existing.id !== id) {
        throw new Error(`Location code '${norm}' already exists for this business`);
      }
      loc.code = norm;
    }

    if (updates.name !== undefined && updates.name.trim()) {
      loc.name = updates.name.trim();
    }
    if (updates.type !== undefined) loc.type = updates.type;
    if (updates.address !== undefined) loc.address = updates.address;
    if (updates.city !== undefined) loc.city = updates.city;
    if (updates.region !== undefined) loc.region = updates.region;
    if (updates.country !== undefined) loc.country = updates.country;
    if (updates.phone !== undefined) loc.phone = updates.phone;

    if (updates.isDefault !== undefined) {
      if (updates.isDefault) {
        for (const l of this.data.locations) {
          if (l.businessId === businessId) l.isDefault = false;
        }
        loc.isDefault = true;
        loc.status = 'ACTIVE';
      } else if (loc.isDefault) {
        // Cannot un-default without designating another default
        throw new Error('A business must always have one default location. Designate another default first.');
      }
    }

    loc.updatedAt = new Date().toISOString();
    this.saveData();
    return loc;
  }

  public setLocationStatus(
    id: string,
    businessId: string,
    status: LocationStatus
  ): { success: boolean; location?: Location; error?: string } {
    if (!this.data.locations) this.data.locations = [];
    const loc = this.data.locations.find((l) => l.id === id && l.businessId === businessId);
    if (!loc) return { success: false, error: 'Location not found' };

    if (status === 'INACTIVE') {
      if (loc.isDefault) {
        return { success: false, error: 'Cannot deactivate the default location' };
      }
      // Check for active / pending transfers
      if (this.data.stock_transfers) {
        const activeTransfers = this.data.stock_transfers.filter(
          (t) =>
            t.businessId === businessId &&
            (t.sourceLocationId === id || t.destinationLocationId === id) &&
            (t.status === 'REQUESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT')
        );
        if (activeTransfers.length > 0) {
          return {
            success: false,
            error: 'Cannot deactivate location with pending or in-transit stock transfers',
          };
        }
      }
    }

    loc.status = status;
    loc.updatedAt = new Date().toISOString();
    this.saveData();
    return { success: true, location: loc };
  }

  public setDefaultLocation(
    id: string,
    businessId: string
  ): { success: boolean; location?: Location; error?: string } {
    if (!this.data.locations) this.data.locations = [];
    const target = this.data.locations.find((l) => l.id === id && l.businessId === businessId);
    if (!target) return { success: false, error: 'Location not found' };
    if (target.status !== 'ACTIVE') {
      return { success: false, error: 'Cannot set an inactive location as default' };
    }

    for (const l of this.data.locations) {
      if (l.businessId === businessId) l.isDefault = false;
    }
    target.isDefault = true;
    target.updatedAt = new Date().toISOString();
    this.saveData();
    return { success: true, location: target };
  }

  public getLocationStock(
    productId: string,
    locationId: string,
    businessId: string
  ): number {
    const prod = this.data.products.find((p) => p.id === productId && p.businessId === businessId);
    if (!prod) return 0;
    if (prod.locationStock && typeof prod.locationStock[locationId] === 'number') {
      return prod.locationStock[locationId];
    }
    const defLoc = this.getDefaultLocation(businessId);
    if (locationId === defLoc.id) {
      return prod.quantity;
    }
    return 0;
  }

  public adjustLocationStock(
    productId: string,
    locationId: string,
    businessId: string,
    newQuantity: number,
    reason?: string,
    createdBy?: string
  ): Product | null {
    const prod = this.data.products.find((p) => p.id === productId && p.businessId === businessId);
    if (!prod) return null;

    const defLoc = this.getDefaultLocation(businessId);
    if (!prod.locationStock) {
      prod.locationStock = { [defLoc.id]: prod.quantity };
    }

    const prevLocQty = prod.locationStock[locationId] ?? 0;
    const cleanNewQty = Math.max(0, Math.floor(newQuantity));
    const delta = cleanNewQty - prevLocQty;
    prod.locationStock[locationId] = cleanNewQty;

    // Recalculate total quantity across all locations
    const totalQty = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
    prod.quantity = totalQty;
    prod.updatedAt = new Date().toISOString();

    const loc = this.getLocationById(locationId, businessId);
    this.addStockMovement({
      businessId,
      productId: prod.id,
      productName: prod.name,
      movementType: 'adjustment',
      quantity: delta,
      previousQuantity: prevLocQty,
      newQuantity: cleanNewQty,
      locationId,
      locationName: loc?.name || 'Branch',
      notes: reason || `Manual adjustment at ${loc?.name || 'Branch'}`,
      createdBy: createdBy || 'User',
    });

    this.saveData();
    return prod;
  }

  public getStockTransfers(
    businessId: string,
    filters?: { locationId?: string; status?: StockTransferStatus }
  ): StockTransfer[] {
    if (!this.data.stock_transfers) this.data.stock_transfers = [];
    return this.data.stock_transfers
      .filter((t) => {
        if (t.businessId !== businessId) return false;
        if (filters?.locationId) {
          if (
            t.sourceLocationId !== filters.locationId &&
            t.destinationLocationId !== filters.locationId
          ) {
            return false;
          }
        }
        if (filters?.status && t.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getStockTransferById(id: string, businessId: string): StockTransfer | null {
    if (!this.data.stock_transfers) this.data.stock_transfers = [];
    return this.data.stock_transfers.find((t) => t.id === id && t.businessId === businessId) || null;
  }

  public createStockTransfer(data: {
    businessId: string;
    sourceLocationId: string;
    destinationLocationId: string;
    productId: string;
    quantity: number;
    notes?: string;
    requestedBy: string;
    requestedByName?: string;
    idempotencyKey?: string;
  }): { success: boolean; transfer?: StockTransfer; error?: string } {
    if (!this.data.stock_transfers) this.data.stock_transfers = [];

    // Idempotency check
    if (data.idempotencyKey) {
      const existing = this.data.stock_transfers.find(
        (t) => t.businessId === data.businessId && t.idempotencyKey === data.idempotencyKey
      );
      if (existing) {
        return { success: true, transfer: existing };
      }
    }

    if (data.sourceLocationId === data.destinationLocationId) {
      return { success: false, error: 'Source and destination locations cannot be the same' };
    }

    const sourceLoc = this.getLocationById(data.sourceLocationId, data.businessId);
    if (!sourceLoc) return { success: false, error: 'Source location not found' };
    if (sourceLoc.status !== 'ACTIVE') return { success: false, error: 'Source location is inactive' };

    const destLoc = this.getLocationById(data.destinationLocationId, data.businessId);
    if (!destLoc) return { success: false, error: 'Destination location not found' };
    if (destLoc.status !== 'ACTIVE') return { success: false, error: 'Destination location is inactive' };

    const qty = Math.floor(Number(data.quantity));
    if (isNaN(qty) || qty <= 0) {
      return { success: false, error: 'Transfer quantity must be greater than 0' };
    }

    const prod = this.getProductById(data.productId, data.businessId);
    if (!prod || prod.businessId !== data.businessId) {
      return { success: false, error: 'Product not found in this business' };
    }

    const sourceStock = this.getLocationStock(data.productId, data.sourceLocationId, data.businessId);
    if (sourceStock < qty) {
      return {
        success: false,
        error: `Insufficient stock at ${sourceLoc.name}. Available: ${sourceStock}, Requested: ${qty}`,
      };
    }

    const count = this.data.stock_transfers.filter((t) => t.businessId === data.businessId).length + 1;
    const transferNumber = `TRF-${getAccraToday().replace(/-/g, '')}-${String(count).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const transfer: StockTransfer = {
      id: this.generateId('trf'),
      businessId: data.businessId,
      transferNumber,
      sourceLocationId: data.sourceLocationId,
      sourceLocationName: sourceLoc.name,
      destinationLocationId: data.destinationLocationId,
      destinationLocationName: destLoc.name,
      productId: data.productId,
      productName: prod.name,
      quantity: qty,
      status: 'REQUESTED',
      notes: data.notes || '',
      requestedBy: data.requestedBy,
      requestedByName: data.requestedByName || 'Staff',
      idempotencyKey: data.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.data.stock_transfers.unshift(transfer);
    this.saveData();
    return { success: true, transfer };
  }

  public updateStockTransferStatus(
    id: string,
    businessId: string,
    targetStatus: StockTransferStatus,
    actor: { id: string; name: string },
    reason?: string
  ): { success: boolean; transfer?: StockTransfer; error?: string } {
    if (!this.data.stock_transfers) this.data.stock_transfers = [];
    const transfer = this.data.stock_transfers.find(
      (t) => t.id === id && t.businessId === businessId
    );
    if (!transfer) return { success: false, error: 'Transfer not found' };

    if (transfer.status === 'COMPLETED') {
      return { success: false, error: 'Transfer has already been completed and cannot be modified' };
    }
    if (transfer.status === 'CANCELLED' || transfer.status === 'REJECTED') {
      return { success: false, error: `Transfer is already ${transfer.status}` };
    }

    const prod = this.getProductById(transfer.productId, businessId);
    if (!prod || prod.businessId !== businessId) {
      return { success: false, error: 'Product not found' };
    }
    const defLoc = this.getDefaultLocation(businessId);
    if (!prod.locationStock) {
      prod.locationStock = { [defLoc.id]: prod.quantity };
    }

    const now = new Date().toISOString();

    if (targetStatus === 'APPROVED') {
      if (transfer.status !== 'REQUESTED') {
        return { success: false, error: `Cannot approve a transfer with status ${transfer.status}` };
      }
      transfer.status = 'APPROVED';
      transfer.approvedBy = actor.id;
      transfer.approvedByName = actor.name;
      transfer.approvedAt = now;
    } else if (targetStatus === 'IN_TRANSIT') {
      if (transfer.status !== 'REQUESTED' && transfer.status !== 'APPROVED') {
        return { success: false, error: `Cannot dispatch transfer from status ${transfer.status}` };
      }
      // Re-verify stock before deducting
      const sourceQty = prod.locationStock[transfer.sourceLocationId] ?? 0;
      if (sourceQty < transfer.quantity) {
        return {
          success: false,
          error: `Insufficient stock at source location (${sourceQty}) to dispatch ${transfer.quantity}`,
        };
      }
      // Deduct from source location
      prod.locationStock[transfer.sourceLocationId] = Math.max(0, sourceQty - transfer.quantity);
      prod.quantity = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
      prod.updatedAt = now;

      this.addStockMovement({
        businessId,
        productId: prod.id,
        productName: prod.name,
        movementType: 'adjustment',
        quantity: -transfer.quantity,
        previousQuantity: sourceQty,
        newQuantity: prod.locationStock[transfer.sourceLocationId],
        locationId: transfer.sourceLocationId,
        locationName: transfer.sourceLocationName,
        referenceId: transfer.id,
        notes: `Dispatched in transfer #${transfer.transferNumber} to ${transfer.destinationLocationName}`,
        createdBy: actor.name,
      });

      transfer.status = 'IN_TRANSIT';
      transfer.dispatchedAt = now;
      transfer.dispatchedBy = actor.id;
      transfer.dispatchedByName = actor.name;
    } else if (targetStatus === 'COMPLETED') {
      if (transfer.status === 'IN_TRANSIT') {
        // Transfer was already dispatched; now add to destination
        const prevDestQty = prod.locationStock[transfer.destinationLocationId] ?? 0;
        prod.locationStock[transfer.destinationLocationId] = prevDestQty + transfer.quantity;
        prod.quantity = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
        prod.updatedAt = now;

        this.addStockMovement({
          businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'adjustment',
          quantity: transfer.quantity,
          previousQuantity: prevDestQty,
          newQuantity: prod.locationStock[transfer.destinationLocationId],
          locationId: transfer.destinationLocationId,
          locationName: transfer.destinationLocationName,
          referenceId: transfer.id,
          notes: `Received from transfer #${transfer.transferNumber} from ${transfer.sourceLocationName}`,
          createdBy: actor.name,
        });
      } else if (transfer.status === 'REQUESTED' || transfer.status === 'APPROVED') {
        // Direct complete without intermediate in_transit
        const sourceQty = prod.locationStock[transfer.sourceLocationId] ?? 0;
        if (sourceQty < transfer.quantity) {
          return {
            success: false,
            error: `Insufficient stock at source location (${sourceQty}) to complete transfer`,
          };
        }
        prod.locationStock[transfer.sourceLocationId] = Math.max(0, sourceQty - transfer.quantity);
        const prevDestQty = prod.locationStock[transfer.destinationLocationId] ?? 0;
        prod.locationStock[transfer.destinationLocationId] = prevDestQty + transfer.quantity;
        prod.quantity = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
        prod.updatedAt = now;

        this.addStockMovement({
          businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'adjustment',
          quantity: -transfer.quantity,
          previousQuantity: sourceQty,
          newQuantity: prod.locationStock[transfer.sourceLocationId],
          locationId: transfer.sourceLocationId,
          locationName: transfer.sourceLocationName,
          referenceId: transfer.id,
          notes: `Transferred #${transfer.transferNumber} to ${transfer.destinationLocationName}`,
          createdBy: actor.name,
        });

        this.addStockMovement({
          businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'adjustment',
          quantity: transfer.quantity,
          previousQuantity: prevDestQty,
          newQuantity: prod.locationStock[transfer.destinationLocationId],
          locationId: transfer.destinationLocationId,
          locationName: transfer.destinationLocationName,
          referenceId: transfer.id,
          notes: `Received from #${transfer.transferNumber} from ${transfer.sourceLocationName}`,
          createdBy: actor.name,
        });
      } else {
        return { success: false, error: `Cannot complete transfer from status ${transfer.status}` };
      }

      transfer.status = 'COMPLETED';
      transfer.completedAt = now;
      transfer.receivedAt = now;
      transfer.completedBy = actor.id;
      transfer.completedByName = actor.name;
    } else if (targetStatus === 'REJECTED') {
      // If was IN_TRANSIT, restore stock back to source location!
      if (transfer.status === 'IN_TRANSIT') {
        const curSourceQty = prod.locationStock[transfer.sourceLocationId] ?? 0;
        prod.locationStock[transfer.sourceLocationId] = curSourceQty + transfer.quantity;
        prod.quantity = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
        prod.updatedAt = now;

        this.addStockMovement({
          businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'adjustment',
          quantity: transfer.quantity,
          previousQuantity: curSourceQty,
          newQuantity: prod.locationStock[transfer.sourceLocationId],
          locationId: transfer.sourceLocationId,
          locationName: transfer.sourceLocationName,
          referenceId: transfer.id,
          notes: `Restored from rejected transfer #${transfer.transferNumber}`,
          createdBy: actor.name,
        });
      }
      transfer.status = 'REJECTED';
      transfer.rejectedBy = actor.id;
      transfer.rejectedByName = actor.name;
      if (reason) transfer.notes = (transfer.notes ? `${transfer.notes}. ` : '') + `Rejected: ${reason}`;
    } else if (targetStatus === 'CANCELLED') {
      // If was IN_TRANSIT, restore stock back to source location!
      if (transfer.status === 'IN_TRANSIT') {
        const curSourceQty = prod.locationStock[transfer.sourceLocationId] ?? 0;
        prod.locationStock[transfer.sourceLocationId] = curSourceQty + transfer.quantity;
        prod.quantity = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
        prod.updatedAt = now;

        this.addStockMovement({
          businessId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'adjustment',
          quantity: transfer.quantity,
          previousQuantity: curSourceQty,
          newQuantity: prod.locationStock[transfer.sourceLocationId],
          locationId: transfer.sourceLocationId,
          locationName: transfer.sourceLocationName,
          referenceId: transfer.id,
          notes: `Restored from cancelled transfer #${transfer.transferNumber}`,
          createdBy: actor.name,
        });
      }
      transfer.status = 'CANCELLED';
      transfer.cancelledBy = actor.id;
      transfer.cancelledByName = actor.name;
      if (reason) transfer.notes = (transfer.notes ? `${transfer.notes}. ` : '') + `Cancelled: ${reason}`;
    }

    transfer.updatedAt = now;
    this.saveData();
    return { success: true, transfer };
  }

  // ============================================================================
  // STAGE 4Q — BUSINESS ECOSYSTEM, INTEGRATIONS & EXTERNAL SERVICES DB METHODS
  // ============================================================================

  public getIntegrations(businessId: string): Integration[] {
    const list = (this.data.integrations || []).filter((i) => i.businessId === businessId);
    const secrets = this.data.integration_secrets || [];
    return list.map((item) => {
      const copy = { ...item };
      // Sanitize any accidentally stored sensitive keys from configuration
      if (copy.configuration) {
        const cleanConfig = { ...copy.configuration };
        delete cleanConfig.apiKey;
        delete cleanConfig.apiSecret;
        delete cleanConfig.secretKey;
        delete cleanConfig.webhookSecret;
        delete cleanConfig.accessToken;
        delete cleanConfig.refreshToken;
        delete cleanConfig.privateKey;
        delete cleanConfig.password;
        copy.configuration = cleanConfig;
      }
      copy.hasCredentials = secrets.some((s) => s.businessId === businessId && s.integrationId === item.id);
      return copy;
    });
  }

  public getIntegrationById(id: string, businessId: string): Integration | undefined {
    const list = this.getIntegrations(businessId);
    return list.find((i) => i.id === id);
  }

  public createIntegration(integration: Integration, rawSecrets?: Record<string, any>): Integration {
    if (!this.data.integrations) this.data.integrations = [];
    if (!this.data.integration_secrets) this.data.integration_secrets = [];

    // Ensure secrets are never in configuration
    const cleanConfig = { ...(integration.configuration || {}) };
    delete cleanConfig.apiKey;
    delete cleanConfig.apiSecret;
    delete cleanConfig.secretKey;
    delete cleanConfig.webhookSecret;
    delete cleanConfig.accessToken;
    delete cleanConfig.refreshToken;
    delete cleanConfig.privateKey;
    delete cleanConfig.password;

    const record: Integration = {
      ...integration,
      configuration: cleanConfig,
    };

    this.data.integrations.push(record);

    if (rawSecrets && Object.keys(rawSecrets).length > 0) {
      this.saveIntegrationSecret(integration.businessId, integration.id, rawSecrets);
      record.hasCredentials = true;
    } else {
      record.hasCredentials = false;
    }

    this.saveData();
    return { ...record };
  }

  public updateIntegration(
    id: string,
    businessId: string,
    updates: Partial<Integration>,
    rawSecrets?: Record<string, any>
  ): Integration | undefined {
    if (!this.data.integrations) this.data.integrations = [];
    const index = this.data.integrations.findIndex((i) => i.id === id && i.businessId === businessId);
    if (index === -1) return undefined;

    const current = this.data.integrations[index];

    let cleanConfig = current.configuration;
    if (updates.configuration) {
      cleanConfig = { ...current.configuration, ...updates.configuration };
      delete cleanConfig.apiKey;
      delete cleanConfig.apiSecret;
      delete cleanConfig.secretKey;
      delete cleanConfig.webhookSecret;
      delete cleanConfig.accessToken;
      delete cleanConfig.refreshToken;
      delete cleanConfig.privateKey;
      delete cleanConfig.password;
    }

    const updated: Integration = {
      ...current,
      ...updates,
      configuration: cleanConfig,
      updatedAt: new Date().toISOString(),
    };

    this.data.integrations[index] = updated;

    if (rawSecrets && Object.keys(rawSecrets).length > 0) {
      this.saveIntegrationSecret(businessId, id, rawSecrets);
    }

    this.saveData();
    return this.getIntegrationById(id, businessId);
  }

  public deleteIntegration(id: string, businessId: string): boolean {
    if (!this.data.integrations) return false;
    const initialLen = this.data.integrations.length;
    this.data.integrations = this.data.integrations.filter(
      (i) => !(i.id === id && i.businessId === businessId)
    );

    if (this.data.integrations.length !== initialLen) {
      this.deleteIntegrationSecret(businessId, id);
      // Clean associated mappings
      if (this.data.external_mappings) {
        this.data.external_mappings = this.data.external_mappings.filter(
          (m) => !(m.integrationId === id && m.businessId === businessId)
        );
      }
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Secure Server-Side Secrets Handling ---
  public saveIntegrationSecret(businessId: string, integrationId: string, secretData: Record<string, any>): void {
    if (!this.data.integration_secrets) this.data.integration_secrets = [];
    const jsonStr = JSON.stringify(secretData);
    const encryptedSecret = encryptSecret(jsonStr);

    const existingIdx = this.data.integration_secrets.findIndex(
      (s) => s.businessId === businessId && s.integrationId === integrationId
    );

    const record: IntegrationSecret = {
      businessId,
      integrationId,
      encryptedSecret,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.data.integration_secrets[existingIdx] = record;
    } else {
      this.data.integration_secrets.push(record);
    }
    this.saveData();
  }

  public getIntegrationSecret(businessId: string, integrationId: string): Record<string, any> | null {
    if (!this.data.integration_secrets) return null;
    const item = this.data.integration_secrets.find(
      (s) => s.businessId === businessId && s.integrationId === integrationId
    );
    if (!item || !item.encryptedSecret) return null;

    const decrypted = decryptSecret(item.encryptedSecret);
    if (!decrypted) return null;
    try {
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  public deleteIntegrationSecret(businessId: string, integrationId: string): void {
    if (!this.data.integration_secrets) return;
    this.data.integration_secrets = this.data.integration_secrets.filter(
      (s) => !(s.businessId === businessId && s.integrationId === integrationId)
    );
    this.saveData();
  }

  // --- Integration Events Audit Log ---
  public getIntegrationEvents(businessId: string, integrationId?: string): IntegrationEvent[] {
    const list = (this.data.integration_events || []).filter((e) => e.businessId === businessId);
    if (integrationId) {
      return list.filter((e) => e.integrationId === integrationId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public logIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'timestamp'>): IntegrationEvent {
    if (!this.data.integration_events) this.data.integration_events = [];
    // Sanitize any metadata to ensure secrets are never logged
    let cleanMeta = event.metadata ? { ...event.metadata } : undefined;
    if (cleanMeta) {
      delete cleanMeta.apiKey;
      delete cleanMeta.apiSecret;
      delete cleanMeta.secret;
      delete cleanMeta.secretKey;
      delete cleanMeta.accessToken;
      delete cleanMeta.refreshToken;
      delete cleanMeta.token;
      delete cleanMeta.password;
    }

    const record: IntegrationEvent = {
      ...event,
      metadata: cleanMeta,
      id: `intev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.integration_events.push(record);
    this.saveData();
    return record;
  }

  // --- Synchronization Engine Records ---
  public getSyncRuns(businessId: string, integrationId?: string): SyncRun[] {
    const list = (this.data.sync_runs || []).filter((r) => r.businessId === businessId);
    if (integrationId) {
      return list.filter((r) => r.integrationId === integrationId);
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public getSyncRunById(id: string, businessId: string): SyncRun | undefined {
    return (this.data.sync_runs || []).find((r) => r.id === id && r.businessId === businessId);
  }

  public createSyncRun(run: SyncRun): SyncRun {
    if (!this.data.sync_runs) this.data.sync_runs = [];
    this.data.sync_runs.push(run);
    this.saveData();
    return run;
  }

  public updateSyncRun(id: string, businessId: string, updates: Partial<SyncRun>): SyncRun | undefined {
    if (!this.data.sync_runs) return undefined;
    const idx = this.data.sync_runs.findIndex((r) => r.id === id && r.businessId === businessId);
    if (idx === -1) return undefined;
    this.data.sync_runs[idx] = { ...this.data.sync_runs[idx], ...updates };
    this.saveData();
    return this.data.sync_runs[idx];
  }

  // --- Webhook Events Registry ---
  public getWebhookEvents(businessId: string, integrationId?: string): WebhookEvent[] {
    const list = (this.data.webhook_events || []).filter((w) => w.businessId === businessId);
    if (integrationId) {
      return list.filter((w) => w.integrationId === integrationId);
    }
    return list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  public getWebhookEventByDedupKey(dedupKey: string): WebhookEvent | undefined {
    return (this.data.webhook_events || []).find((w) => w.dedupKey === dedupKey);
  }

  public createWebhookEvent(event: WebhookEvent): WebhookEvent {
    if (!this.data.webhook_events) this.data.webhook_events = [];
    this.data.webhook_events.push(event);
    this.saveData();
    return event;
  }

  public updateWebhookEvent(id: string, businessId: string, updates: Partial<WebhookEvent>): WebhookEvent | undefined {
    if (!this.data.webhook_events) return undefined;
    const idx = this.data.webhook_events.findIndex((w) => w.id === id && w.businessId === businessId);
    if (idx === -1) return undefined;
    this.data.webhook_events[idx] = { ...this.data.webhook_events[idx], ...updates };
    this.saveData();
    return this.data.webhook_events[idx];
  }

  // --- External Mappings Registry ---
  public getExternalMappings(businessId: string, integrationId?: string, entityType?: string): ExternalMapping[] {
    let list = (this.data.external_mappings || []).filter((m) => m.businessId === businessId);
    if (integrationId) list = list.filter((m) => m.integrationId === integrationId);
    if (entityType) list = list.filter((m) => m.entityType === entityType);
    return list;
  }

  public getExternalMapping(
    businessId: string,
    provider: string,
    entityType: string,
    externalId: string
  ): ExternalMapping | undefined {
    return (this.data.external_mappings || []).find(
      (m) =>
        m.businessId === businessId &&
        m.provider === provider &&
        m.entityType === entityType &&
        m.externalId === externalId
    );
  }

  public createExternalMapping(mapping: ExternalMapping): ExternalMapping {
    if (!this.data.external_mappings) this.data.external_mappings = [];
    // If existing for same provider, entityType, internalId, update or replace
    const idx = this.data.external_mappings.findIndex(
      (m) =>
        m.businessId === mapping.businessId &&
        m.provider === mapping.provider &&
        m.entityType === mapping.entityType &&
        (m.internalId === mapping.internalId || m.externalId === mapping.externalId)
    );
    if (idx >= 0) {
      this.data.external_mappings[idx] = mapping;
    } else {
      this.data.external_mappings.push(mapping);
    }
    this.saveData();
    return mapping;
  }

  public deleteExternalMapping(id: string, businessId: string): boolean {
    if (!this.data.external_mappings) return false;
    const initialLen = this.data.external_mappings.length;
    this.data.external_mappings = this.data.external_mappings.filter(
      (m) => !(m.id === id && m.businessId === businessId)
    );
    if (this.data.external_mappings.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Import Runs Registry ---
  public getImportRuns(businessId: string): ImportRun[] {
    return (this.data.import_runs || [])
      .filter((r) => r.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getImportRunById(id: string, businessId: string): ImportRun | undefined {
    return (this.data.import_runs || []).find((r) => r.id === id && r.businessId === businessId);
  }

  public createImportRun(run: ImportRun): ImportRun {
    if (!this.data.import_runs) this.data.import_runs = [];
    this.data.import_runs.push(run);
    this.saveData();
    return run;
  }

  public updateImportRun(id: string, businessId: string, updates: Partial<ImportRun>): ImportRun | undefined {
    if (!this.data.import_runs) return undefined;
    const idx = this.data.import_runs.findIndex((r) => r.id === id && r.businessId === businessId);
    if (idx === -1) return undefined;
    this.data.import_runs[idx] = { ...this.data.import_runs[idx], ...updates };
    this.saveData();
    return this.data.import_runs[idx];
  }

  // --- Export Runs Registry ---
  public getExportRuns(businessId: string): ExportRun[] {
    return (this.data.export_runs || [])
      .filter((r) => r.businessId === businessId)
      .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime());
  }

  public createExportRun(run: ExportRun): ExportRun {
    if (!this.data.export_runs) this.data.export_runs = [];
    this.data.export_runs.push(run);
    this.saveData();
    return run;
  }

  // --- External Payments Registry ---
  public getExternalPayments(businessId: string, integrationId?: string): ExternalPaymentRecord[] {
    let list = (this.data.external_payments || []).filter((p) => p.businessId === businessId);
    if (integrationId) list = list.filter((p) => p.integrationId === integrationId);
    return list.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());
  }

  public getExternalPaymentByReference(merchantReference: string, businessId: string): ExternalPaymentRecord | undefined {
    return (this.data.external_payments || []).find(
      (p) => p.merchantReference === merchantReference && p.businessId === businessId
    );
  }

  public getExternalPaymentByIdempotency(idempotencyKey: string, businessId: string): ExternalPaymentRecord | undefined {
    return (this.data.external_payments || []).find(
      (p) => p.idempotencyKey === idempotencyKey && p.businessId === businessId
    );
  }

  public createExternalPayment(payment: ExternalPaymentRecord): ExternalPaymentRecord {
    if (!this.data.external_payments) this.data.external_payments = [];
    this.data.external_payments.push(payment);
    this.saveData();
    return payment;
  }

  public updateExternalPayment(
    id: string,
    businessId: string,
    updates: Partial<ExternalPaymentRecord>
  ): ExternalPaymentRecord | undefined {
    if (!this.data.external_payments) return undefined;
    const idx = this.data.external_payments.findIndex((p) => p.id === id && p.businessId === businessId);
    if (idx === -1) return undefined;
    this.data.external_payments[idx] = { ...this.data.external_payments[idx], ...updates };
    this.saveData();
    return this.data.external_payments[idx];
  }

  // Executive Command Center Preferences (Stage 4S)
  public getExecutivePreferences(userId: string, businessId: string) {
    if (!this.data.executive_preferences) {
      this.data.executive_preferences = [];
    }
    const found = this.data.executive_preferences.find(
      (p) => p.userId === userId && p.businessId === businessId
    );
    if (found) {
      return found.preferences;
    }
    return {
      visibleSections: [
        'summary',
        'health',
        'kpis',
        'attention',
        'financial',
        'sales',
        'inventory',
        'customers',
        'operations',
        'forecast',
        'opportunities',
        'risks',
        'anomalies',
      ],
      pinnedKPIs: ['revenue', 'grossProfit', 'netProfit', 'transactions', 'atv', 'stockouts', 'debt'],
      defaultRange: 'this_month',
      showAnomalies: true,
      showOpportunities: true,
      showRisks: true,
    };
  }

  public saveExecutivePreferences(
    userId: string,
    businessId: string,
    preferences: Record<string, any>
  ) {
    if (!this.data.executive_preferences) {
      this.data.executive_preferences = [];
    }
    const now = new Date().toISOString();
    const idx = this.data.executive_preferences.findIndex(
      (p) => p.userId === userId && p.businessId === businessId
    );
    if (idx >= 0) {
      this.data.executive_preferences[idx].preferences = {
        ...this.data.executive_preferences[idx].preferences,
        ...preferences,
      };
      this.data.executive_preferences[idx].updatedAt = now;
    } else {
      this.data.executive_preferences.push({
        userId,
        businessId,
        preferences: {
          visibleSections: preferences.visibleSections || [
            'summary',
            'health',
            'kpis',
            'attention',
            'financial',
            'sales',
            'inventory',
            'customers',
            'operations',
            'forecast',
            'opportunities',
            'risks',
            'anomalies',
          ],
          pinnedKPIs: preferences.pinnedKPIs || ['revenue', 'grossProfit', 'netProfit', 'transactions', 'atv', 'stockouts', 'debt'],
          defaultRange: preferences.defaultRange || 'this_month',
          showAnomalies: preferences.showAnomalies !== undefined ? preferences.showAnomalies : true,
          showOpportunities: preferences.showOpportunities !== undefined ? preferences.showOpportunities : true,
          showRisks: preferences.showRisks !== undefined ? preferences.showRisks : true,
        },
        updatedAt: now,
      });
    }
    this.saveData();
    return this.getExecutivePreferences(userId, businessId);
  }

  // ==========================================
  // STAGE 4T: STRATEGIC SCENARIO SIMULATIONS
  // ==========================================

  public getSimulations(businessId: string): StoredSimulation[] {
    if (!this.data.simulations) {
      this.data.simulations = [];
    }
    return this.data.simulations.filter((s) => s.businessId === businessId);
  }

  public getSimulationById(businessId: string, id: string): StoredSimulation | undefined {
    if (!this.data.simulations) {
      this.data.simulations = [];
    }
    return this.data.simulations.find((s) => s.id === id && s.businessId === businessId);
  }

  public saveSimulation(simulation: StoredSimulation): StoredSimulation {
    if (!this.data.simulations) {
      this.data.simulations = [];
    }
    const idx = this.data.simulations.findIndex(
      (s) => s.id === simulation.id && s.businessId === simulation.businessId
    );
    if (idx >= 0) {
      this.data.simulations[idx] = {
        ...simulation,
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.data.simulations.push(simulation);
    }
    this.saveData();
    return simulation;
  }

  public deleteSimulation(businessId: string, id: string): boolean {
    if (!this.data.simulations) {
      this.data.simulations = [];
      return false;
    }
    const initialLen = this.data.simulations.length;
    this.data.simulations = this.data.simulations.filter(
      (s) => !(s.id === id && s.businessId === businessId)
    );
    if (this.data.simulations.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public getPlanningTargets(businessId: string, period?: string): BusinessPlanningTargets | undefined {
    if (!this.data.business_planning_targets) {
      this.data.business_planning_targets = [];
    }
    if (period) {
      return this.data.business_planning_targets.find(
        (t) => t.businessId === businessId && t.period === period
      );
    }
    // Return latest target for business
    const targets = this.data.business_planning_targets.filter((t) => t.businessId === businessId);
    return targets[targets.length - 1];
  }

  public savePlanningTargets(targets: BusinessPlanningTargets): BusinessPlanningTargets {
    if (!this.data.business_planning_targets) {
      this.data.business_planning_targets = [];
    }
    const idx = this.data.business_planning_targets.findIndex(
      (t) => t.businessId === targets.businessId && t.period === targets.period
    );
    if (idx >= 0) {
      this.data.business_planning_targets[idx] = {
        ...this.data.business_planning_targets[idx],
        ...targets,
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.data.business_planning_targets.push(targets);
    }
    this.saveData();
    return targets;
  }

  // ==========================================
  // STAGE 4U: BUSINESS GOALS & TARGETS TRACKER
  // ==========================================

  public getBusinessGoals(businessId: string): BusinessGoal[] {
    if (!this.data.business_goals) {
      this.data.business_goals = [];
    }
    return this.data.business_goals.filter((g) => g.businessId === businessId);
  }

  public getBusinessGoalById(businessId: string, id: string): BusinessGoal | undefined {
    if (!this.data.business_goals) {
      this.data.business_goals = [];
    }
    return this.data.business_goals.find((g) => g.id === id && g.businessId === businessId);
  }

  public saveBusinessGoal(goal: BusinessGoal): BusinessGoal {
    if (!this.data.business_goals) {
      this.data.business_goals = [];
    }
    const idx = this.data.business_goals.findIndex(
      (g) => g.id === goal.id && g.businessId === goal.businessId
    );
    if (idx >= 0) {
      this.data.business_goals[idx] = {
        ...goal,
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.data.business_goals.push(goal);
    }
    this.saveData();
    return goal;
  }

  public deleteBusinessGoal(businessId: string, id: string): boolean {
    if (!this.data.business_goals) {
      this.data.business_goals = [];
      return false;
    }
    const initialLen = this.data.business_goals.length;
    this.data.business_goals = this.data.business_goals.filter(
      (g) => !(g.id === id && g.businessId === businessId)
    );
    if (this.data.business_goals.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // ==========================================
  // STAGE 4Z: BUSINESS REVIEW & DECISION LOG
  // ==========================================

  public getBusinessDecisions(businessId: string): BusinessDecision[] {
    if (!this.data.business_decisions) {
      this.data.business_decisions = [];
    }
    return this.data.business_decisions.filter((d) => d.businessId === businessId || d.tenantId === businessId);
  }

  public getBusinessDecisionById(businessId: string, id: string): BusinessDecision | undefined {
    if (!this.data.business_decisions) {
      this.data.business_decisions = [];
    }
    return this.data.business_decisions.find(
      (d) => d.id === id && (d.businessId === businessId || d.tenantId === businessId)
    );
  }

  public saveBusinessDecision(decision: BusinessDecision): BusinessDecision {
    if (!this.data.business_decisions) {
      this.data.business_decisions = [];
    }
    const idx = this.data.business_decisions.findIndex(
      (d) => d.id === decision.id && (d.businessId === decision.businessId || d.tenantId === decision.tenantId)
    );
    if (idx >= 0) {
      this.data.business_decisions[idx] = {
        ...decision,
        businessId: decision.businessId || decision.tenantId,
        tenantId: decision.tenantId || decision.businessId,
      };
    } else {
      this.data.business_decisions.push({
        ...decision,
        businessId: decision.businessId || decision.tenantId,
        tenantId: decision.tenantId || decision.businessId,
      });
    }
    this.saveData();
    return decision;
  }

  public deleteBusinessDecision(businessId: string, id: string): boolean {
    if (!this.data.business_decisions) {
      this.data.business_decisions = [];
      return false;
    }
    const initialLen = this.data.business_decisions.length;
    this.data.business_decisions = this.data.business_decisions.filter(
      (d) => !(d.id === id && (d.businessId === businessId || d.tenantId === businessId))
    );
    if (this.data.business_decisions.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }
}

export const db = new DBManager();
