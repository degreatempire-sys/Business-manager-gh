import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { getAccraToday, getAccraDateString, resolveAccraDateRange, resolveAccraDateRangeWithComparison } from './server/date.js';
import { computeBusinessGrowthIntelligence } from './server/growthIntelligence.js';
import { computeBusinessForecast, computeProductDemandPlanning } from './server/businessForecasting.js';
import {
  evaluateBusinessWorkflows,
  getOperationsCenterSummary,
  sanitizeTaskForFinancialPrivacy,
} from './server/businessWorkflows.js';
import {
  normalizeGhanaPhone,
  generateWhatsAppUrl,
  renderCommunicationTemplate,
  sanitizeCommunicationForStaff,
  generateCommunicationOpportunities,
  getCommunicationSummary,
} from './server/communications.js';
import {
  getPlanConfig,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  generatePaystackReference,
  isPaystackConfigured,
} from './server/paystack.js';
import {
  calculateCustomerTier,
  evaluateCustomerRetention,
  computeCustomerLoyaltyProfile,
  getCustomerLoyaltyProfile,
  processSaleLoyaltyPoints,
  reverseSaleLoyaltyPoints,
  redeemLoyaltyReward,
  redeemLoyaltyPoints,
  adjustCustomerPoints,
  adjustLoyaltyPoints,
  createLoyaltyReferral,
  registerCustomerReferral,
  calculateLoyaltyAnalytics,
  getLoyaltyAnalytics,
  getRetentionOpportunities,
  getLoyaltyOpportunities,
  approveLoyaltyReward,
} from './server/loyalty.js';
import {
  evaluateOperationalPolicy,
  checkStaffCreditLimit,
  recordSecurityEvent,
  recordConfigurationHistory,
  runDataIntegrityDiagnostic,
  executeDataRepair,
  getSystemHealth,
  queryAuditLogs,
  getGovernanceSummary,
} from './server/governance.js';
import { runBusinessIntegrityCheck } from './server/businessIntegrity.js';
import { searchBusinessRecords } from './server/businessSearch.js';
import {
  validateUserLocationAccess,
  computeLocationSummary,
  compareLocations,
  runLocationDiagnostics,
} from './server/locations.js';
import { providerRegistry } from './server/integrationProviders.js';
import {
  connectIntegration,
  disconnectIntegration,
  testIntegrationConnection,
  processInboundWebhook,
  initiateExternalPayment,
  confirmExternalPayment,
  runIntegrationSync,
  validateAndPreviewImport,
  executeImport,
  generateAccountingExport,
  reconcileProviderPayments,
  runIntegrationDiagnostics,
  generateOAuthState,
  validateOAuthState,
} from './server/integrations.js';
import type {
  Location,
  LocationStatus,
  LocationType,
  StockTransfer,
  StockTransferStatus,
  BusinessType,
  PaymentMethod,
  InvoiceStatus,
  Product,
  StockMovement,
  Customer,
  Sale,
  CustomerPayment,
  Supplier,
  Expense,
  Purchase,
  SubscriptionPayment,
  StaffPermissions,
  User,
  StaffPerformanceSummary,
  HourlyDistributionItem,
  DayOfWeekDistributionItem,
  ManagementRecommendation,
  BusinessTask,
  TaskPriority,
  TaskStatus,
  AutomationRules,
  CommunicationRecord,
  CommunicationTemplate,
  CommunicationOpportunity,
  CommunicationSummary,
  CommunicationType,
  CommunicationChannel,
  CommunicationStatus,
  CustomerCommunicationPreferences,
  LoyaltyConfig,
  LoyaltyTier,
  LoyaltyLedgerEntry,
  LoyaltyMilestoneRecord,
  LoyaltyReferral,
  LoyaltyRewardRedemption,
  CustomerLoyaltyProfile,
  LoyaltyAnalytics,
  LoyaltyOpportunity,
  OperationalPolicies,
  ConfigurationHistoryRecord,
  SecurityEvent,
  DataIntegrityReport,
  SystemHealthReport,
  GovernanceSummaryPayload,
  BusinessGoal,
  BusinessPlanningTargets,
  StoredSimulation,
  BusinessDecision,
} from './src/types/index.js';
import { requireFeature, checkResourceLimit, calculateBusinessUsage } from './server/featureAccess.js';
import {
  calculateSaaSRevenueMetrics,
  runBillingReconciliationDiagnostics,
  generateBillingInvoiceNumber,
  repairMissingBillingInvoice,
} from './server/billingOperations.js';
import {
  executeScenarioSimulation,
  computeBaselineFinancials,
  computePlanningTargetsProgress,
} from './server/scenarioSimulation.js';
import { calculateGoalActualAndStatus } from './server/businessGoals.js';
import { computeBusinessHealth } from './server/businessHealth.js';
import { generateBusinessAlerts, getBusinessAlerts, updateAlertStatus } from './server/businessAlerts.js';
import { getBusinessActivityTimeline } from './server/businessActivity.js';
import { computeBusinessDailyBrief } from './server/businessDailyBrief.js';
import {
  computeExecutiveCommandCenter,
  generateExecutiveExportCsv,
} from './server/executiveIntelligence.js';
import { exportBusinessDataToCsv, ALLOWED_EXPORT_TYPES } from './server/businessExport.js';
import {
  validateProductCsv,
  validateCustomerCsv,
  executeProductImport,
  executeCustomerImport,
} from './server/businessImport.js';
import {
  createBusinessBackup,
  verifyBusinessBackup,
  recordBackupAudit,
  getBackupHistory,
  getBackupRetentionSummary,
  getBackupHealthStatus,
  prepareRecoveryPackage,
  validateRecoveryPackage,
  reverifyRecoveryPackageIntegrity,
} from './server/businessBackup.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Explicitly ensure all /api responses default to application/json
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: any;
  businessId?: string;
  token?: string;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = db.getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  req.user = session.user;
  req.businessId = session.business?.id || session.user.businessId;
  req.token = token;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (
    !req.user ||
    (req.user.role !== 'admin' &&
      req.user.role !== 'master_admin' &&
      req.user.id !== 'usr_admin_master' &&
      req.user.email?.toLowerCase() !== 'admin@businessmanagergh.com')
  ) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

function requireBusinessOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'business_owner') {
    return res.status(403).json({ error: 'Access denied. Only business owners can perform this action.' });
  }
  next();
}

function requireNotStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role === 'staff') {
    return res.status(403).json({ error: 'Access denied. Staff members cannot access this resource.' });
  }
  next();
}

export function requirePermission(permissionKey: keyof StaffPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // 1. admin and master_admin: always allowed
    if (
      req.user.role === 'admin' ||
      req.user.role === 'master_admin' ||
      req.user.id === 'usr_admin_master' ||
      req.user.email?.toLowerCase() === 'admin@businessmanagergh.com'
    ) {
      return next();
    }

    // 2. business_owner: always allowed
    if (req.user.role === 'business_owner') {
      return next();
    }

    // 3. staff: check req.user.permissions
    if (req.user.role === 'staff') {
      const userPermissions = req.user.permissions;
      if (userPermissions && userPermissions[permissionKey] === true) {
        return next();
      }

      return res.status(403).json({
        error: 'STAFF_PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
        code: 'STAFF_PERMISSION_DENIED',
        permission: permissionKey,
        requiredPermission: permissionKey,
      });
    }

    // 4. Missing permissions or any other role: never grant access
    return res.status(403).json({
      error: 'STAFF_PERMISSION_DENIED',
      message: 'You do not have permission to perform this action.',
      code: 'STAFF_PERMISSION_DENIED',
      permission: permissionKey,
      requiredPermission: permissionKey,
    });
  };
}

export function requireStaffAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.id === 'usr_admin_master' ||
    req.user.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
    req.user.role === 'business_owner'
  ) {
    return next();
  }
  if (req.user.role === 'staff' && req.user.permissions?.manage_staff === true) {
    return next();
  }
  return res.status(403).json({
    error: 'STAFF_PERMISSION_DENIED',
    message: 'Staff management permission (manage_staff) required.',
    code: 'STAFF_PERMISSION_DENIED',
    requiredPermission: 'manage_staff',
  });
}

export function requireAuditAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.id === 'usr_admin_master' ||
    req.user.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
    req.user.role === 'business_owner'
  ) {
    return next();
  }
  if (req.user.role === 'staff' && req.user.permissions?.view_audit === true) {
    return next();
  }
  return res.status(403).json({
    error: 'STAFF_PERMISSION_DENIED',
    message: 'Audit trail view permission (view_audit) required.',
    code: 'STAFF_PERMISSION_DENIED',
    requiredPermission: 'view_audit',
  });
}

export function requireSecurityAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.id === 'usr_admin_master' ||
    req.user.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
    req.user.role === 'business_owner'
  ) {
    return next();
  }
  if (req.user.role === 'staff' && req.user.permissions?.view_security === true) {
    return next();
  }
  return res.status(403).json({
    error: 'STAFF_PERMISSION_DENIED',
    message: 'Security log view permission (view_security) required.',
    code: 'STAFF_PERMISSION_DENIED',
    requiredPermission: 'view_security',
  });
}

export function requireGovernanceAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.id === 'usr_admin_master' ||
    req.user.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
    req.user.role === 'business_owner'
  ) {
    return next();
  }
  if (
    req.user.role === 'staff' &&
    (req.user.permissions?.manage_staff === true ||
      req.user.permissions?.business_settings === true ||
      req.user.permissions?.view_audit === true)
  ) {
    return next();
  }
  return res.status(403).json({
    error: 'STAFF_PERMISSION_DENIED',
    message: 'Administration and governance permissions required.',
    code: 'STAFF_PERMISSION_DENIED',
  });
}

// ----------------------------------------------------
// 1. AUTHENTICATION & BUSINESS ONBOARDING ROUTES
// ----------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const { fullName, email, phone, password, businessName, businessType } = req.body;

    if (!fullName || !email || !password || !businessName || !businessType) {
      return res.status(400).json({ error: 'All registration fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const userId = db.generateId('usr');
    const businessId = db.generateId('biz');

    // Create Business
    const business = db.createBusiness({
      id: businessId,
      ownerId: userId,
      name: businessName.trim(),
      type: businessType as BusinessType,
      location: 'Ghana',
      phone: phone || '',
      email: email.toLowerCase().trim(),
      currency: 'GH₵',
      receiptNote: 'Thank you for shopping with us!',
      createdAt: new Date().toISOString(),
    });

    // Create User
    const passwordHash = db.hashPassword(password);
    const user = db.createUser({
      id: userId,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      phone: phone || '',
      role: 'business_owner',
      businessId: business.id,
      createdAt: new Date().toISOString(),
      passwordHash,
    });

    // Create session
    const token = db.createSession(user.id);

    // Audit Log
    db.logAudit({
      businessId: business.id,
      userId: user.id,
      userName: user.fullName,
      action: 'Login',
      details: `User registered and created business "${business.name}" (${business.type}).`,
      ipAddress: req.ip,
    });

    // Welcome Notification
    db.createNotification({
      businessId: business.id,
      type: 'sale',
      title: 'Welcome to Business Manager GH!',
      message: `Your business account for ${business.name} is ready. Start by adding your products or recording a sale.`,
      link: '/products',
    });

    res.status(201).json({
      user,
      business,
      token,
      message: 'Account created successfully.',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim() || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = db.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      if (user.businessId) {
        recordSecurityEvent({
          businessId: user.businessId,
          userId: user.id,
          userName: user.fullName,
          type: 'AUTH_FAILURE',
          severity: 'WARNING',
          description: `Failed login attempt for ${user.email} (invalid password).`,
          ipAddress: req.ip,
          endpoint: '/api/auth/login',
        });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      if (user.businessId) {
        recordSecurityEvent({
          businessId: user.businessId,
          userId: user.id,
          userName: user.fullName,
          type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: 'WARNING',
          description: `Login attempt on suspended account ${user.email} from ${req.ip || 'unknown'}.`,
          ipAddress: req.ip,
          endpoint: '/api/auth/login',
        });
      }
      return res.status(403).json({ error: 'This account has been suspended. Please contact your business owner.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your business owner.' });
    }

    const token = db.createSession(user.id);
    const session = db.getSession(token);

    if (!session) {
      return res.status(500).json({ error: 'Failed to initialize session.' });
    }

    db.logAudit({
      businessId: session.business?.id,
      userId: user.id,
      userName: user.fullName,
      action: 'Login',
      details: `User logged in from ${req.ip || 'web client'}.`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      user: session.user,
      business: session.business,
      token,
      message: 'Login successful.',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.token) {
    db.deleteSession(req.token);
  }
  if (req.user) {
    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Logout',
      details: 'User logged out.',
      ipAddress: req.ip,
    });
  }
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const session = db.getSession(req.token!);
  if (!session) {
    return res.status(401).json({ error: 'Session invalid' });
  }
  const settings = req.businessId ? db.getBusinessSettings(req.businessId) : undefined;
  const subscription = req.businessId ? db.getSubscription(req.businessId) : undefined;

  res.json({
    user: session.user,
    business: session.business,
    settings,
    subscription,
  });
});

// PUT /api/auth/profile
app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const { fullName, phone, oldPassword, newPassword } = req.body;
  const updates: { fullName?: string; phone?: string; passwordHash?: string } = {};

  // 1. Full Name validation & update
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name cannot be empty.' });
    }
    updates.fullName = fullName.trim();
  }

  // 2. Phone validation & update
  if (phone !== undefined) {
    if (typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone must be a valid text string.' });
    }
    updates.phone = phone.trim();
  }

  // 3. Password change validation & update
  const wantsPasswordChange = Boolean(
    (newPassword !== undefined && String(newPassword).trim().length > 0) ||
    (oldPassword !== undefined && String(oldPassword).trim().length > 0)
  );

  if (wantsPasswordChange) {
    if (!oldPassword || typeof oldPassword !== 'string' || !oldPassword.trim()) {
      return res.status(400).json({ error: 'Current password is required to change password.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
      return res.status(400).json({ error: 'New password is required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const isMatch = db.verifyPassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    updates.passwordHash = db.hashPassword(newPassword);
  }

  // Strict whitelist guard: Never allow changing email, userId, role, businessId, or subscription
  const updatedUser = db.updateUser(user.id, updates);
  if (!updatedUser) {
    return res.status(500).json({ error: 'Failed to update user profile.' });
  }

  // Audit log
  db.logAudit({
    businessId: req.businessId,
    userId: user.id,
    userName: updatedUser.fullName,
    action: 'Profile Update',
    details: updates.passwordHash
      ? 'Updated user profile and changed password.'
      : 'Updated user profile details.',
    ipAddress: req.ip,
  });

  // Ensure passwordHash is never exposed in response
  const { passwordHash: _, ...safeUser } = updatedUser as any;

  res.json({
    user: safeUser,
    message: updates.passwordHash
      ? 'Account details and password updated successfully!'
      : 'Profile updated successfully!',
  });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req, res) => {
  // Reject direct unauthenticated password override attempts
  if (req.body.newPassword) {
    return res.status(403).json({
      error: 'Direct unauthenticated password resets are disabled for account security. If you know your current password, change it in Settings. Otherwise, contact support to verify your account identity.',
    });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Please provide a valid account email address.' });
  }

  const user = db.findUserByEmail(email);
  if (user) {
    db.logAudit({
      businessId: user.businessId,
      userId: user.id,
      userName: user.fullName,
      action: 'Password Recovery Request',
      details: `Password recovery requested for ${email.trim()} from ${req.ip || 'web client'}. Direct unauthenticated reset rejected.`,
      ipAddress: req.ip,
    });
  }

  res.json({
    message: 'If an account exists with this email, your recovery request has been received. Because automated email/SMS dispatch is disabled for security, please contact your business administrator or platform support (support@businessmanagergh.com) with your registered business details to verify your identity and receive assistance.',
    recoveryInitiated: true,
  });
});

// PUT /api/business/onboarding
app.put('/api/business/onboarding', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res) => {
  if (!req.businessId) {
    return res.status(400).json({ error: 'No business attached to this account.' });
  }

  const { name, type, location, phone, email, logo, receiptNote } = req.body;
  const updated = db.updateBusiness(req.businessId, {
    name,
    type,
    location,
    phone,
    email,
    logo,
    receiptNote,
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Settings Update',
    details: 'Completed business onboarding profile update.',
    ipAddress: req.ip,
  });

  res.json({ business: updated, message: 'Business profile updated successfully.' });
});

// GET /api/business/settings
app.get('/api/business/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const settings = db.getBusinessSettings(req.businessId);
  const business = db.getBusiness(req.businessId);
  res.json({ settings, business });
});

// PUT /api/business/settings
app.put('/api/business/settings', requireAuth, requirePermission('business_settings'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { settings: updatedSettings, business: updatedBusiness } = req.body;

  let business = undefined;
  const bizData =
    updatedBusiness ||
    (req.body.name !== undefined ||
    req.body.phone !== undefined ||
    req.body.location !== undefined ||
    req.body.email !== undefined ||
    req.body.logo !== undefined ||
    req.body.receiptNote !== undefined ||
    req.body.type !== undefined
      ? req.body
      : undefined);

  if (bizData) {
    const { id: _ignoreId, ownerId: _ignoreOwnerId, createdAt: _ignoreCreatedAt, ...safeBizData } = bizData;
    business = db.updateBusiness(req.businessId, safeBizData);
  }
  let settings = undefined;
  const settingsData =
    updatedSettings ||
    (req.body.enableWhatsappReceipts !== undefined ||
    req.body.enableWhatsappReminders !== undefined ||
    req.body.receiptHeader !== undefined ||
    req.body.receiptFooter !== undefined ||
    req.body.printSize !== undefined ||
    req.body.lowStockThreshold !== undefined ||
    req.body.enableStockAlerts !== undefined
      ? {
          enableWhatsappReceipts: req.body.enableWhatsappReceipts,
          enableWhatsappReminders: req.body.enableWhatsappReminders,
          receiptHeader: req.body.receiptHeader,
          receiptFooter: req.body.receiptFooter,
          printSize: req.body.printSize,
          lowStockThreshold: req.body.lowStockThreshold,
          enableStockAlerts: req.body.enableStockAlerts,
        }
      : undefined);

  if (settingsData) {
    const { id: _ignoreSetId, businessId: _ignoreBizId, ...safeSettings } = settingsData;
    settings = db.updateBusinessSettings(req.businessId, safeSettings);
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Settings Update',
    details: 'Updated business settings & receipt preferences.',
    ipAddress: req.ip,
  });

  res.json({ settings, business, message: 'Settings saved successfully.' });
});

// ----------------------------------------------------
// STAFF & CASHIER MANAGEMENT ROUTES (ENHANCED FOR STAGE 4O)
// ----------------------------------------------------

// GET /api/staff & /api/governance/staff
const handleGetStaff = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) {
    return res.status(400).json({ error: 'Business context required.' });
  }

  const allUsers = db.getUsersByBusiness(req.businessId);
  const staff = allUsers.filter((u) => u.role === 'staff' || u.role === 'admin');
  res.json({ staff, total: staff.length });
};
app.get('/api/staff', requireAuth, requireStaffAdmin, handleGetStaff);
app.get('/api/governance/staff', requireAuth, requireStaffAdmin, handleGetStaff);
app.get('/api/admin/governance/staff', requireAuth, requireStaffAdmin, handleGetStaff);

// POST /api/staff & /api/governance/staff
const handleCreateStaff = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) {
    return res.status(400).json({ error: 'Business context required.' });
  }

  const { fullName, email, phone, password, permissions, role, assignedScope, assignedLocationIds, allLocations } = req.body;
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Initial password is required and must be at least 6 characters.' });
  }

  const existing = db.findUserByEmail(email.trim());
  if (existing) {
    return res.status(409).json({ error: 'A user with this email address already exists.' });
  }

  // Stage 4R: Check staff plan limit
  const isMasterAdmin =
    req.user?.role === 'master_admin' || req.user?.id === 'usr_admin_master';
  const staffLimitCheck = checkResourceLimit(req.businessId, 'staff', isMasterAdmin);
  if (!staffLimitCheck.allowed) {
    return res.status(403).json({
      error: staffLimitCheck.error,
      code: 'PLAN_LIMIT_REACHED',
      resource: 'staff',
      current: staffLimitCheck.current,
      max: staffLimitCheck.max,
    });
  }

  try {
    const staffUser = db.createStaffUser({
      businessId: req.businessId,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: typeof phone === 'string' ? phone.trim() : '',
      password: password,
      permissions: permissions && typeof permissions === 'object' ? permissions : undefined,
      assignedLocationIds: Array.isArray(assignedLocationIds) ? assignedLocationIds : undefined,
      allLocations: allLocations !== undefined ? Boolean(allLocations) : undefined,
    });

    if (role && role !== 'master_admin') {
      staffUser.role = role;
    }
    if (assignedScope) {
      staffUser.assignedScope = String(assignedScope).trim();
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Staff Member Created',
      details: `Created staff member ${staffUser.fullName} (${staffUser.email}).`,
      module: 'staff',
      severity: 'INFO',
      ipAddress: req.ip,
      entityId: staffUser.id,
    });

    recordConfigurationHistory({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      area: 'staff_access',
      action: 'STAFF_CREATED',
      summary: `Created staff member ${staffUser.fullName} (${staffUser.email}).`,
      metadata: { staffId: staffUser.id, role: staffUser.role },
    });

    res.status(201).json({ staff: staffUser, message: 'Staff member created successfully.' });
  } catch (err: any) {
    console.error('Error creating staff:', err);
    res.status(400).json({ error: err.message || 'Failed to create staff member.' });
  }
};
app.post('/api/staff', requireAuth, requireStaffAdmin, handleCreateStaff);
app.post('/api/governance/staff', requireAuth, requireStaffAdmin, handleCreateStaff);
app.post('/api/admin/governance/staff', requireAuth, requireStaffAdmin, handleCreateStaff);

// PUT /api/staff/:id & /api/governance/staff/:id
const handleUpdateStaff = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) {
    return res.status(400).json({ error: 'Business context required.' });
  }

  const { id } = req.params;
  const { fullName, phone, status, password, permissions, role, assignedScope, assignedLocationIds, allLocations } = req.body;

  if (status !== undefined && status !== 'active' && status !== 'inactive' && status !== 'suspended') {
    return res.status(400).json({ error: 'Status must be "active", "inactive", or "suspended".' });
  }

  if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const existingUser = db.findUserById(id);
  if (!existingUser || existingUser.businessId !== req.businessId) {
    return res.status(404).json({ error: 'Staff member not found or does not belong to your business.' });
  }

  const previousStatus = existingUser.status;

  const updatedStaff = db.updateStaffUser(id, req.businessId, {
    fullName: typeof fullName === 'string' ? fullName.trim() : undefined,
    phone: typeof phone === 'string' ? phone.trim() : undefined,
    status,
    role,
    assignedScope,
    assignedLocationIds: Array.isArray(assignedLocationIds) ? assignedLocationIds : undefined,
    allLocations: allLocations !== undefined ? Boolean(allLocations) : undefined,
    password: typeof password === 'string' ? password : undefined,
    permissions: permissions && typeof permissions === 'object' ? permissions : undefined,
  });

  if (!updatedStaff) {
    return res.status(404).json({ error: 'Staff member not found or does not belong to your business.' });
  }

  // If status changed to suspended, record security event
  if (status === 'suspended' && previousStatus !== 'suspended') {
    recordSecurityEvent({
      businessId: req.businessId,
      userId: id,
      userName: updatedStaff.fullName,
      type: 'STAFF_STATUS_SUSPENDED',
      severity: 'WARNING',
      description: `Staff account ${updatedStaff.fullName} (${updatedStaff.email}) was suspended by ${req.user.fullName}.`,
      ipAddress: req.ip,
      endpoint: `/api/staff/${id}`,
    });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Staff Member Updated',
    details: `Updated staff member ${updatedStaff.fullName} (${updatedStaff.email}). Status: ${updatedStaff.status}.`,
    module: 'staff',
    severity: 'INFO',
    ipAddress: req.ip,
    entityId: updatedStaff.id,
  });

  recordConfigurationHistory({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    area: 'staff_access',
    action: 'STAFF_UPDATED',
    summary: `Updated staff member ${updatedStaff.fullName} (${updatedStaff.email}). Status: ${updatedStaff.status}.`,
    metadata: { staffId: updatedStaff.id, status: updatedStaff.status },
  });

  res.json({ staff: updatedStaff, message: 'Staff member updated successfully.' });
};
app.put('/api/staff/:id', requireAuth, requireStaffAdmin, handleUpdateStaff);
app.put('/api/governance/staff/:id', requireAuth, requireStaffAdmin, handleUpdateStaff);
app.put('/api/admin/governance/staff/:id', requireAuth, requireStaffAdmin, handleUpdateStaff);

// PUT /api/governance/staff/:id/status
app.put('/api/governance/staff/:id/status', requireAuth, requireStaffAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const { id } = req.params;
  const { status } = req.body;
  if (!status || (status !== 'active' && status !== 'inactive' && status !== 'suspended')) {
    return res.status(400).json({ error: 'Status must be "active", "inactive", or "suspended".' });
  }

  const updatedStaff = db.updateStaffUser(id, req.businessId, { status });
  if (!updatedStaff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  if (status === 'suspended') {
    recordSecurityEvent({
      businessId: req.businessId,
      userId: id,
      userName: updatedStaff.fullName,
      type: 'STAFF_STATUS_SUSPENDED',
      severity: 'WARNING',
      description: `Staff account ${updatedStaff.fullName} was suspended by ${req.user.fullName}.`,
      ipAddress: req.ip,
      endpoint: `/api/governance/staff/${id}/status`,
    });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Staff Status Changed',
    details: `Changed status of ${updatedStaff.fullName} to ${status}.`,
    module: 'staff',
    severity: status === 'suspended' ? 'WARNING' : 'INFO',
    entityId: id,
  });

  recordConfigurationHistory({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    area: 'staff_access',
    action: 'STAFF_STATUS_CHANGED',
    summary: `Set ${updatedStaff.fullName} status to ${status}.`,
    metadata: { staffId: id, status },
  });

  res.json({ success: true, staff: updatedStaff, message: `Staff status updated to ${status}.` });
});

// PUT /api/governance/staff/:id/permissions
app.put('/api/governance/staff/:id/permissions', requireAuth, requireStaffAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const { id } = req.params;
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'Permissions object is required.' });
  }

  const updatedStaff = db.updateStaffUser(id, req.businessId, { permissions });
  if (!updatedStaff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Staff Permissions Updated',
    details: `Updated permissions for ${updatedStaff.fullName}.`,
    module: 'staff',
    severity: 'INFO',
    entityId: id,
  });

  recordConfigurationHistory({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    area: 'staff_access',
    action: 'STAFF_PERMISSIONS_UPDATED',
    summary: `Updated permissions for ${updatedStaff.fullName}.`,
    metadata: { staffId: id, permissions },
  });

  res.json({ success: true, staff: updatedStaff, message: 'Permissions updated successfully.' });
});

// DELETE /api/staff/:id & /api/governance/staff/:id
const handleDeleteStaff = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) {
    return res.status(400).json({ error: 'Business context required.' });
  }

  const { id } = req.params;
  const target = db.findUserById(id);
  if (!target || target.businessId !== req.businessId || target.role !== 'staff') {
    return res.status(404).json({ error: 'Staff member not found or does not belong to your business.' });
  }

  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  }

  const success = db.deleteStaffUser(id, req.businessId);
  if (!success) {
    return res.status(404).json({ error: 'Staff member not found or does not belong to your business.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Staff Member Revoked',
    details: `Revoked access and deleted staff member ${target.fullName} (${target.email}).`,
    module: 'staff',
    severity: 'WARNING',
    ipAddress: req.ip,
    entityId: target.id,
  });

  recordConfigurationHistory({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    area: 'staff_access',
    action: 'STAFF_REVOKED',
    summary: `Revoked access and deleted staff member ${target.fullName}.`,
    metadata: { staffId: target.id },
  });

  res.json({ message: 'Staff member access revoked and removed successfully.' });
};
app.delete('/api/staff/:id', requireAuth, requireStaffAdmin, handleDeleteStaff);
app.delete('/api/governance/staff/:id', requireAuth, requireStaffAdmin, handleDeleteStaff);
app.delete('/api/admin/governance/staff/:id', requireAuth, requireStaffAdmin, handleDeleteStaff);

// ----------------------------------------------------
// STAGE 4O — BUSINESS ADMINISTRATION & GOVERNANCE API
// ----------------------------------------------------

// GET /api/governance/summary & /api/admin/governance/summary
const handleGovernanceSummary = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const canViewFinancials =
    req.user.role === 'business_owner' ||
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.permissions?.financial_reports === true;

  try {
    const summary = getGovernanceSummary(req.businessId, req.user, canViewFinancials);
    res.json(summary);
  } catch (err: any) {
    console.error('Governance summary error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate governance summary.' });
  }
};
app.get('/api/governance/summary', requireAuth, requireGovernanceAdmin, requireFeature('governance'), handleGovernanceSummary);
app.get('/api/admin/governance/summary', requireAuth, requireGovernanceAdmin, requireFeature('governance'), handleGovernanceSummary);

// GET /api/governance/policies & /api/admin/governance/policies
const handleGetPolicies = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const settings = db.getBusinessSettings(req.businessId);
  const defaultPolicies: OperationalPolicies = {
    allowStaffStockAdjustment: false,
    allowStaffCreditSales: true,
    allowStaffSaleCancellation: false,
    allowStaffManualLoyaltyAdjust: false,
    requireApprovalForCreditSale: false,
    requireApprovalForStockAdjustment: true,
    requireApprovalForSaleCancellation: true,
    maxStaffCreditLimitGhs: 500,
  };

  const policies: OperationalPolicies = {
    ...defaultPolicies,
    ...(settings?.policies || {}),
  };

  res.json({ policies });
};
app.get('/api/governance/policies', requireAuth, requireGovernanceAdmin, requireFeature('governance'), handleGetPolicies);
app.get('/api/admin/governance/policies', requireAuth, requireGovernanceAdmin, requireFeature('governance'), handleGetPolicies);

// PUT /api/governance/policies & /api/admin/governance/policies
const handleUpdatePolicies = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const { policies: newPolicies } = req.body;
  if (!newPolicies || typeof newPolicies !== 'object') {
    return res.status(400).json({ error: 'Policies object is required.' });
  }

  const currentSettings = db.getBusinessSettings(req.businessId);
  const previousPolicies: Partial<OperationalPolicies> = currentSettings?.policies || {};

  const mergedPolicies: OperationalPolicies = {
    allowStaffStockAdjustment:
      typeof newPolicies.allowStaffStockAdjustment === 'boolean'
        ? newPolicies.allowStaffStockAdjustment
        : previousPolicies.allowStaffStockAdjustment ?? false,
    allowStaffCreditSales:
      typeof newPolicies.allowStaffCreditSales === 'boolean'
        ? newPolicies.allowStaffCreditSales
        : previousPolicies.allowStaffCreditSales ?? true,
    allowStaffSaleCancellation:
      typeof newPolicies.allowStaffSaleCancellation === 'boolean'
        ? newPolicies.allowStaffSaleCancellation
        : previousPolicies.allowStaffSaleCancellation ?? false,
    allowStaffManualLoyaltyAdjust:
      typeof newPolicies.allowStaffManualLoyaltyAdjust === 'boolean'
        ? newPolicies.allowStaffManualLoyaltyAdjust
        : previousPolicies.allowStaffManualLoyaltyAdjust ?? false,
    requireApprovalForCreditSale:
      typeof newPolicies.requireApprovalForCreditSale === 'boolean'
        ? newPolicies.requireApprovalForCreditSale
        : previousPolicies.requireApprovalForCreditSale ?? false,
    requireApprovalForStockAdjustment:
      typeof newPolicies.requireApprovalForStockAdjustment === 'boolean'
        ? newPolicies.requireApprovalForStockAdjustment
        : previousPolicies.requireApprovalForStockAdjustment ?? true,
    requireApprovalForSaleCancellation:
      typeof newPolicies.requireApprovalForSaleCancellation === 'boolean'
        ? newPolicies.requireApprovalForSaleCancellation
        : previousPolicies.requireApprovalForSaleCancellation ?? true,
    maxStaffCreditLimitGhs:
      typeof newPolicies.maxStaffCreditLimitGhs === 'number' && !isNaN(newPolicies.maxStaffCreditLimitGhs)
        ? Math.max(0, newPolicies.maxStaffCreditLimitGhs)
        : previousPolicies.maxStaffCreditLimitGhs ?? 500,
  };

  const updated = db.updateBusinessSettings(req.businessId, { policies: mergedPolicies });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'POLICIES_UPDATED',
    details: `Updated operational policies. Max staff credit: GH₵${mergedPolicies.maxStaffCreditLimitGhs}.`,
    module: 'configuration',
    severity: 'INFO',
  });

  recordConfigurationHistory({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    area: 'OPERATIONAL_POLICY',
    action: 'OPERATIONAL_POLICY_UPDATED',
    previousValue: previousPolicies,
    newValue: mergedPolicies,
    summary: `Updated operational policies. Max credit: GH₵${mergedPolicies.maxStaffCreditLimitGhs}.`,
  });

  res.json({ success: true, policies: mergedPolicies, settings: updated, message: 'Operational policies updated successfully.' });
};
app.put('/api/governance/policies', requireAuth, requireBusinessOwner, requireFeature('governance'), handleUpdatePolicies);
app.put('/api/admin/governance/policies', requireAuth, requireBusinessOwner, requireFeature('governance'), handleUpdatePolicies);

// GET /api/governance/audit-logs & /api/admin/governance/audit-logs
const handleGetAuditLogs = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const canViewFinancials =
    req.user.role === 'business_owner' ||
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.permissions?.financial_reports === true;

  const filters = {
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
    action: typeof req.query.action === 'string' ? req.query.action : undefined,
    module: typeof req.query.module === 'string' ? req.query.module : undefined,
    severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 25,
  };

  const result = queryAuditLogs(req.businessId, filters, canViewFinancials);
  res.json(result);
};
app.get('/api/governance/audit-logs', requireAuth, requireAuditAdmin, requireFeature('governance'), handleGetAuditLogs);
app.get('/api/admin/governance/audit-logs', requireAuth, requireAuditAdmin, requireFeature('governance'), handleGetAuditLogs);

// GET /api/governance/audit-logs/export
app.get('/api/governance/audit-logs/export', requireAuth, requireAuditAdmin, requireFeature('governance'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const canViewFinancials =
    req.user.role === 'business_owner' ||
    req.user.role === 'admin' ||
    req.user.role === 'master_admin' ||
    req.user.permissions?.financial_reports === true;

  const filters = {
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    module: typeof req.query.module === 'string' ? req.query.module : undefined,
    severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    page: 1,
    limit: 1000,
  };

  const { logs } = queryAuditLogs(req.businessId, filters, canViewFinancials);
  const format = String(req.query.format || 'csv').toLowerCase();

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${getAccraToday()}.json"`);
    return res.send(JSON.stringify(logs, null, 2));
  }

  // Generate clean CSV
  const headers = ['ID', 'Timestamp', 'User', 'Module', 'Action', 'Severity', 'Details', 'IP Address'];
  const rows = logs.map((l) => [
    l.id,
    l.timestamp || l.createdAt,
    `"${(l.userName || '').replace(/"/g, '""')}"`,
    l.module || 'operations',
    `"${(l.action || '').replace(/"/g, '""')}"`,
    l.severity || 'INFO',
    `"${(l.details || '').replace(/"/g, '""')}"`,
    l.ipAddress || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${getAccraToday()}.csv"`);
  return res.send(csv);
});

// GET /api/governance/security-events & /api/admin/governance/security-events
const handleGetSecurityEvents = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  let events = db.getSecurityEvents(req.businessId);

  const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
  if (severity && severity !== 'all') {
    events = events.filter((e) => e.severity === severity);
  }

  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  if (type && type !== 'all') {
    events = events.filter((e) => e.type === type);
  }

  res.json({ events, total: events.length });
};
app.get('/api/governance/security-events', requireAuth, requireSecurityAdmin, requireFeature('governance'), handleGetSecurityEvents);
app.get('/api/admin/governance/security-events', requireAuth, requireSecurityAdmin, requireFeature('governance'), handleGetSecurityEvents);

// GET /api/governance/integrity/diagnostic
app.get('/api/governance/integrity/diagnostic', requireAuth, requireGovernanceAdmin, requireFeature('governance'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  try {
    const report = runDataIntegrityDiagnostic(req.businessId);
    res.json(report);
  } catch (err: any) {
    console.error('Data integrity diagnostic error:', err);
    res.status(500).json({ error: 'Diagnostic scan failed.' });
  }
});

// POST /api/governance/integrity/repair
app.post('/api/governance/integrity/repair', requireAuth, requireBusinessOwner, requireFeature('governance'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const { repairType, options } = req.body;
  if (!repairType || typeof repairType !== 'string') {
    return res.status(400).json({ error: 'repairType is required.' });
  }

  try {
    const result = executeDataRepair(
      req.businessId,
      repairType,
      options,
      req.user.id,
      req.user.fullName
    );
    res.json(result);
  } catch (err: any) {
    console.error('Data repair error:', err);
    res.status(400).json({ error: err.message || 'Data repair failed.' });
  }
});

// GET /api/governance/system-health
app.get('/api/governance/system-health', requireAuth, requireGovernanceAdmin, requireFeature('governance'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  try {
    const health = getSystemHealth(req.businessId);
    res.json(health);
  } catch (err: any) {
    console.error('System health check error:', err);
    res.status(500).json({ error: 'Failed to retrieve system health.' });
  }
});

// GET /api/governance/config-history
app.get('/api/governance/config-history', requireAuth, requireGovernanceAdmin, requireFeature('governance'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const history = db.getConfigHistory(req.businessId);
  res.json({ history, total: history.length });
});


// ----------------------------------------------------
// 1B. STAFF PERFORMANCE & MANAGEMENT INTELLIGENCE (STAGE 4I)
// ----------------------------------------------------

function getAccraHour(dateInput: string | Date): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 0;
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(d);
  const parsed = parseInt(hourStr, 10);
  return isNaN(parsed) ? d.getUTCHours() : parsed >= 24 ? 0 : parsed;
}

function getAccraDayOfWeek(dateInput: string | Date): { index: number; name: string } {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return { index: 0, name: 'Monday' };
  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Accra',
    weekday: 'long',
  }).format(d);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const idx = days.indexOf(dayStr);
  return { index: idx >= 0 ? idx : 0, name: dayStr };
}

function computeManagementIntelligence(
  businessId: string,
  range?: string,
  startDate?: string,
  endDate?: string,
  canViewFinancials: boolean = false,
  filterStaffId?: string
) {
  const dateRange = resolveAccraDateRange(range, startDate, endDate);
  const { fromDate, toDate, label, normalizedRange } = dateRange;

  const allSales = db.getSales(businessId);
  const allPayments = db.getCustomerPayments(businessId);
  const allProducts = db.getProducts(businessId);
  const allStaffUsers = db.getUsersByBusiness(businessId);

  // Filter completed sales within Accra date range
  const periodSales = allSales.filter((s) => {
    if (s.status === 'Cancelled') return false;
    const sDate = getAccraDateString(s.createdAt);
    if (fromDate && sDate < fromDate) return false;
    if (toDate && sDate > toDate) return false;
    return true;
  });

  // Filter customer payments within Accra date range
  const periodPayments = allPayments.filter((p) => {
    const pDate = getAccraDateString(p.date || p.paymentDate || (p as any).createdAt);
    if (fromDate && pDate < fromDate) return false;
    if (toDate && pDate > toDate) return false;
    return true;
  });

  const staffUsers = allStaffUsers.filter((u) => u.role === 'staff');
  const ownerUsers = allStaffUsers.filter((u) => u.role === 'business_owner');

  const matchSaleToUser = (s: Sale, u: User): boolean => {
    if (s.staffId && s.staffId === u.id) return true;
    if (s.createdBy === u.id || s.createdBy === u.fullName || s.createdBy === u.email) return true;
    if ((s as any).cashier === u.fullName || (s as any).cashierId === u.id) return true;
    return false;
  };

  const staffList = [...staffUsers];
  if (staffList.length === 0 && ownerUsers.length > 0) {
    staffList.push(...ownerUsers);
  } else {
    for (const owner of ownerUsers) {
      if (periodSales.some((s) => matchSaleToUser(s, owner))) {
        staffList.push(owner);
      }
    }
  }

  const accountedSales = new Set<string>();
  const rawStaffPerformance: any[] = [];

  for (const u of staffList) {
    const userSales = periodSales.filter((s) => {
      const match = matchSaleToUser(s, u);
      if (match) accountedSales.add(s.id);
      return match;
    });

    const totalSalesValue = userSales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = userSales.length;
    const unitsSold = userSales.reduce(
      (uSum, s) => uSum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0),
      0
    );
    const averageTransactionValue = transactionCount > 0 ? totalSalesValue / transactionCount : 0;
    const cashCollected = userSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const creditSalesAmount = userSales.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
    const creditSalesCount = userSales.filter((s) => (s.balance || 0) > 0 || s.paymentMethod === 'Credit/Debt').length;
    const discountsGiven = userSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
    const rawProfit = userSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    const sortedUserSales = [...userSales].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstSaleDate = sortedUserSales[0]?.createdAt;
    const lastSaleDate = sortedUserSales[sortedUserSales.length - 1]?.createdAt;

    const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {
      Cash: { count: 0, amount: 0 },
      'Mobile Money': { count: 0, amount: 0 },
      'Bank Transfer': { count: 0, amount: 0 },
      Card: { count: 0, amount: 0 },
      'Credit/Debt': { count: 0, amount: 0 },
    };

    for (const s of userSales) {
      const method = s.paymentMethod || 'Cash';
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentMethodBreakdown[method].count += 1;
      paymentMethodBreakdown[method].amount += s.total;
    }

    const productStatsMap = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();
    for (const s of userSales) {
      for (const item of s.items) {
        const existing = productStatsMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += Number(item.quantity) || 0;
        existing.revenue += Number(item.total) || 0;
        productStatsMap.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    rawStaffPerformance.push({
      id: u.id,
      staffId: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: (u as any).status || 'active',
      totalSalesValue,
      transactionCount,
      unitsSold,
      averageTransactionValue,
      profitGenerated: canViewFinancials ? rawProfit : undefined,
      cashCollected,
      creditSalesAmount,
      creditSalesCount,
      discountsGiven,
      firstSaleDate,
      lastSaleDate,
      paymentMethodBreakdown,
      topProducts,
    });
  }

  // Include any unassigned sales from direct POS
  const unassignedSales = periodSales.filter((s) => !accountedSales.has(s.id));
  if (unassignedSales.length > 0) {
    const unassignedTotal = unassignedSales.reduce((sum, s) => sum + s.total, 0);
    const unassignedUnits = unassignedSales.reduce(
      (uSum, s) => uSum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0),
      0
    );
    const unassignedCash = unassignedSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const unassignedCredit = unassignedSales.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
    const unassignedProfit = unassignedSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const unassignedDiscounts = unassignedSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);

    rawStaffPerformance.push({
      id: 'unassigned',
      staffId: 'unassigned',
      fullName: unassignedSales[0]?.createdBy || 'Store POS',
      email: '',
      phone: '',
      role: 'staff',
      status: 'active',
      totalSalesValue: unassignedTotal,
      transactionCount: unassignedSales.length,
      unitsSold: unassignedUnits,
      averageTransactionValue: unassignedSales.length > 0 ? unassignedTotal / unassignedSales.length : 0,
      profitGenerated: canViewFinancials ? unassignedProfit : undefined,
      cashCollected: unassignedCash,
      creditSalesAmount: unassignedCredit,
      creditSalesCount: unassignedSales.filter((s) => (s.balance || 0) > 0).length,
      discountsGiven: unassignedDiscounts,
      paymentMethodBreakdown: {},
      topProducts: [],
    });
  }

  rawStaffPerformance.sort((a, b) => b.totalSalesValue - a.totalSalesValue || b.transactionCount - a.transactionCount);
  const staffPerformance = rawStaffPerformance.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const totalStaffCount = staffList.length > 0 ? staffList.length : (staffUsers.length > 0 ? staffUsers.length : staffPerformance.length);
  const activeStaffCount = staffPerformance.filter((s) => s.transactionCount > 0).length;
  const totalSalesValue = periodSales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = periodSales.length;
  const totalUnitsSold = periodSales.reduce(
    (uSum, s) => uSum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0),
    0
  );
  const averageSalesPerStaff = activeStaffCount > 0 ? totalSalesValue / activeStaffCount : (totalStaffCount > 0 ? totalSalesValue / totalStaffCount : 0);
  const totalDiscountsGiven = periodSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
  const totalCashCollected = periodSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
  const totalCreditOriginated = periodSales.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
  const totalProfit = canViewFinancials
    ? periodSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0)
    : undefined;

  const topPerformer = staffPerformance[0] && staffPerformance[0].totalSalesValue > 0
    ? {
        id: staffPerformance[0].id,
        name: staffPerformance[0].fullName,
        salesValue: staffPerformance[0].totalSalesValue,
        transactionCount: staffPerformance[0].transactionCount,
      }
    : undefined;

  const byVolume = [...staffPerformance].sort((a, b) => b.transactionCount - a.transactionCount);
  const highestVolumeStaff = byVolume[0] && byVolume[0].transactionCount > 0
    ? {
        id: byVolume[0].id,
        name: byVolume[0].fullName,
        transactionCount: byVolume[0].transactionCount,
        salesValue: byVolume[0].totalSalesValue,
      }
    : undefined;

  const staffSummary: StaffPerformanceSummary = {
    totalStaffCount,
    activeStaffCount,
    totalSalesValue,
    totalTransactions,
    totalUnitsSold,
    averageSalesPerStaff,
    totalDiscountsGiven,
    totalCashCollected,
    totalCreditOriginated,
    totalProfit,
    topPerformer,
    highestVolumeStaff,
  };

  // Hourly Distribution (Africa/Accra timezone)
  const hourlyBuckets: { count: number; revenue: number }[] = Array.from({ length: 24 }, () => ({
    count: 0,
    revenue: 0,
  }));

  for (const s of periodSales) {
    const hour = getAccraHour(s.createdAt);
    if (hour >= 0 && hour < 24) {
      hourlyBuckets[hour].count += 1;
      hourlyBuckets[hour].revenue += s.total;
    }
  }

  const hourlyDistribution: HourlyDistributionItem[] = hourlyBuckets.map((b, h) => {
    const formattedHour = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    return {
      hour: h,
      label: formattedHour,
      salesCount: b.count,
      totalRevenue: b.revenue,
      averageTransactionValue: b.count > 0 ? b.revenue / b.count : 0,
    };
  });

  let peakHourIdx = 0;
  let maxCount = -1;
  let maxRevenue = -1;
  for (let i = 0; i < 24; i++) {
    if (hourlyBuckets[i].count > maxCount || (hourlyBuckets[i].count === maxCount && hourlyBuckets[i].revenue > maxRevenue)) {
      maxCount = hourlyBuckets[i].count;
      maxRevenue = hourlyBuckets[i].revenue;
      peakHourIdx = i;
    }
  }

  const peakStartLabel = peakHourIdx === 0 ? '12 AM' : peakHourIdx < 12 ? `${peakHourIdx} AM` : peakHourIdx === 12 ? '12 PM' : `${peakHourIdx - 12} PM`;
  const nextHour = (peakHourIdx + 1) % 24;
  const peakEndLabel = nextHour === 0 ? '12 AM' : nextHour < 12 ? `${nextHour} AM` : nextHour === 12 ? '12 PM' : `${nextHour - 12} PM`;
  const peakHourLabel = `${peakStartLabel} - ${peakEndLabel}`;

  let busiestTimeOfDay = 'Morning (6 AM - 12 PM)';
  if (peakHourIdx >= 12 && peakHourIdx < 17) {
    busiestTimeOfDay = 'Midday & Lunch Rush (12 PM - 5 PM)';
  } else if (peakHourIdx >= 17 && peakHourIdx < 22) {
    busiestTimeOfDay = 'Evening Rush (5 PM - 10 PM)';
  } else if (peakHourIdx >= 22 || peakHourIdx < 6) {
    busiestTimeOfDay = 'Night / Off-Peak';
  }

  const peakOperatingHours = {
    peakHour: peakHourIdx,
    peakHourLabel,
    salesCount: hourlyBuckets[peakHourIdx].count,
    totalRevenue: hourlyBuckets[peakHourIdx].revenue,
    busiestTimeOfDay,
  };

  // Day of Week Distribution
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayBuckets: { count: number; revenue: number }[] = Array.from({ length: 7 }, () => ({
    count: 0,
    revenue: 0,
  }));

  for (const s of periodSales) {
    const { index } = getAccraDayOfWeek(s.createdAt);
    if (index >= 0 && index < 7) {
      dayBuckets[index].count += 1;
      dayBuckets[index].revenue += s.total;
    }
  }

  const dayOfWeekDistribution: DayOfWeekDistributionItem[] = dayBuckets.map((b, idx) => ({
    dayIndex: idx,
    dayName: dayNames[idx],
    salesCount: b.count,
    totalRevenue: b.revenue,
    averageTransactionValue: b.count > 0 ? b.revenue / b.count : 0,
  }));

  const sortedDays = [...dayOfWeekDistribution].sort((a, b) => b.totalRevenue - a.totalRevenue || b.salesCount - a.salesCount);
  const busiestDay = {
    dayName: sortedDays[0]?.dayName || 'Monday',
    salesCount: sortedDays[0]?.salesCount || 0,
    totalRevenue: sortedDays[0]?.totalRevenue || 0,
  };
  const slowestDay = {
    dayName: sortedDays[sortedDays.length - 1]?.dayName || 'Sunday',
    salesCount: sortedDays[sortedDays.length - 1]?.salesCount || 0,
    totalRevenue: sortedDays[sortedDays.length - 1]?.totalRevenue || 0,
  };

  const methodMap = new Map<string, { count: number; amount: number }>();
  for (const s of periodSales) {
    const m = s.paymentMethod || 'Cash';
    const entry = methodMap.get(m) || { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += s.total;
    methodMap.set(m, entry);
  }

  const paymentMethodMix = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
    percentage: totalSalesValue > 0 ? Number(((data.amount / totalSalesValue) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.amount - a.amount);

  const debtOriginated = totalCreditOriginated;
  const debtCollected = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const netDebtChange = debtOriginated - debtCollected;
  const collectionEfficiencyPercent = debtOriginated > 0
    ? Number(((debtCollected / debtOriginated) * 100).toFixed(1))
    : (debtCollected > 0 ? 100 : 100);

  const debtVelocity = {
    debtOriginated,
    debtCollected,
    netDebtChange,
    collectionEfficiencyPercent,
  };

  const recommendations: ManagementRecommendation[] = [];

  if (periodSales.length > 0 && peakOperatingHours.salesCount > 0) {
    recommendations.push({
      id: 'rec_peak_rush',
      category: 'staffing',
      type: 'insight',
      impact: 'high',
      title: `Peak Rush Window: ${peakHourLabel}`,
      description: `Shop sales peak during ${peakHourLabel} (${peakOperatingHours.busiestTimeOfDay}) with ${peakOperatingHours.salesCount} orders totaling GH₵${peakOperatingHours.totalRevenue.toFixed(2)}. Schedule your most experienced cashiers on duty during this peak.`,
      actionLabel: 'View Schedule',
    });
  }

  if (topPerformer) {
    recommendations.push({
      id: 'rec_top_performer',
      category: 'performance',
      type: 'praise',
      impact: 'medium',
      title: `Top Performer: ${topPerformer.name}`,
      description: `${topPerformer.name} generated GH₵${topPerformer.salesValue.toFixed(2)} (${topPerformer.transactionCount} transactions) leading shop revenue this period.`,
    });
  }

  if (debtOriginated > debtCollected && debtOriginated > 0) {
    recommendations.push({
      id: 'rec_credit_velocity',
      category: 'credit',
      type: 'warning',
      impact: 'high',
      title: 'Credit Extension Exceeds Recoveries',
      description: `Customers took on GH₵${debtOriginated.toFixed(2)} in credit while only GH₵${debtCollected.toFixed(2)} was collected (net expansion: GH₵${netDebtChange.toFixed(2)}). Consider tightening credit limits.`,
      actionLabel: 'Review Debtors',
      actionLink: '/debtors',
    });
  } else if (debtCollected > 0) {
    recommendations.push({
      id: 'rec_credit_healthy',
      category: 'credit',
      type: 'insight',
      impact: 'low',
      title: 'Strong Debt Recovery',
      description: `Collected GH₵${debtCollected.toFixed(2)} in customer repayments this period, maintaining positive cash flow and healthy working capital.`,
      actionLabel: 'View Payments',
      actionLink: '/customers',
    });
  }

  const momoEntry = paymentMethodMix.find((p) => p.method === 'Mobile Money');
  if (momoEntry && momoEntry.percentage >= 20) {
    recommendations.push({
      id: 'rec_momo_float',
      category: 'payments',
      type: 'tip',
      impact: 'medium',
      title: 'Mobile Money Volume Alert',
      description: `Mobile Money constitutes ${momoEntry.percentage}% of transaction value (GH₵${momoEntry.amount.toFixed(2)}). Ensure merchant float and transaction notification lines are active before rush hours.`,
    });
  }

  const lowStockFastMovers = allProducts.filter((p) => p.quantity <= (p.minStockLevel || 5) && p.quantity > 0);
  if (lowStockFastMovers.length > 0) {
    const target = lowStockFastMovers[0];
    recommendations.push({
      id: 'rec_inventory_reorder',
      category: 'inventory',
      type: 'warning',
      impact: 'high',
      title: `Low Stock Alert: ${target.name}`,
      description: `"${target.name}" has only ${target.quantity} units remaining (alert threshold: ${target.minStockLevel || 5}). Reorder from supplier to avoid lost sales during peak traffic.`,
      actionLabel: 'Reorder Stock',
      actionLink: '/products',
    });
  }

  return {
    dateRange: {
      range: normalizedRange,
      startDate: fromDate,
      endDate: toDate,
      label,
    },
    staffSummary,
    staffPerformance: filterStaffId
      ? staffPerformance.filter((s) => s.id === filterStaffId || s.staffId === filterStaffId)
      : staffPerformance,
    hourlyDistribution,
    peakOperatingHours,
    dayOfWeekDistribution,
    busiestDay,
    slowestDay,
    paymentMethodMix,
    debtVelocity,
    recommendations,
  };
}

// GET /api/staff/intelligence (also aliased to /api/management/intelligence and /api/staff/performance)
const handleStaffIntelligence = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.dashboard || req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view staff performance intelligence.' });
  }

  const { range, startDate, endDate, staffId } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    staffId?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);

  const intelligence = computeManagementIntelligence(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials,
    staffId
  );

  return res.json(intelligence);
};

app.get('/api/staff/intelligence', requireAuth, handleStaffIntelligence);
app.get('/api/management/intelligence', requireAuth, handleStaffIntelligence);
app.get('/api/staff/performance', requireAuth, handleStaffIntelligence);

// GET /api/staff/:id/performance
app.get('/api/staff/:id/performance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const { id } = req.params;
  const targetUser = db.findUserById(id);
  if (!targetUser || targetUser.businessId !== req.businessId) {
    return res.status(404).json({ error: 'Staff member not found or does not belong to your business.' });
  }

  const isSelf = req.user.id === id;
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasStaffViewPerm = req.user.permissions?.manage_staff || req.user.permissions?.financial_reports;

  if (!isSelf && !isOwnerOrAdmin && !hasStaffViewPerm) {
    return res.status(403).json({ error: "You are not authorized to view this staff member's performance." });
  }

  const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
  const canViewFinancials = canUserViewProfit(req.user);

  const intelligence = computeManagementIntelligence(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials,
    id
  );

  const memberItem = intelligence.staffPerformance.find((s) => s.id === id || s.staffId === id);
  if (!memberItem) {
    return res.json({
      staffMember: {
        id: targetUser.id,
        staffId: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone || '',
        role: targetUser.role,
        status: (targetUser as any).status || 'active',
        rank: 0,
        totalSalesValue: 0,
        transactionCount: 0,
        unitsSold: 0,
        averageTransactionValue: 0,
        profitGenerated: canViewFinancials ? 0 : undefined,
        cashCollected: 0,
        creditSalesAmount: 0,
        creditSalesCount: 0,
        discountsGiven: 0,
        paymentMethodBreakdown: {},
        topProducts: [],
      },
      dateRange: intelligence.dateRange,
      hourlyDistribution: intelligence.hourlyDistribution,
      peakOperatingHours: intelligence.peakOperatingHours,
    });
  }

  return res.json({
    staffMember: memberItem,
    dateRange: intelligence.dateRange,
    hourlyDistribution: intelligence.hourlyDistribution,
    peakOperatingHours: intelligence.peakOperatingHours,
  });
});

// ----------------------------------------------------
// STAGE 4J: BUSINESS GROWTH & DECISION SUPPORT ENDPOINTS
// ----------------------------------------------------
const handleGrowthIntelligence = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view business growth intelligence.' });
  }

  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);

  const payload = computeBusinessGrowthIntelligence(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials
  );

  return res.json(payload);
};

app.get('/api/growth/intelligence', requireAuth, handleGrowthIntelligence);
app.get('/api/business/intelligence', requireAuth, handleGrowthIntelligence);
app.get('/api/growth/decision-support', requireAuth, handleGrowthIntelligence);

app.get('/api/growth/signals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view growth signals.' });
  }

  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);

  const payload = computeBusinessGrowthIntelligence(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials
  );

  return res.json({
    healthSummary: payload.healthSummary,
    signals: payload.growthSignals,
  });
});

app.get('/api/growth/recommendations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view management recommendations.' });
  }

  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);

  const payload = computeBusinessGrowthIntelligence(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials
  );

  return res.json({
    recommendations: payload.recommendations,
  });
});

// ----------------------------------------------------
// 1B. STAGE 4K: BUSINESS FORECASTING & PLANNING ROUTES
// ----------------------------------------------------
const handleBusinessForecast = (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view business forecast.' });
  }

  const { range, startDate, endDate, scenarioSalesPct, scenarioExpenseDelta } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    scenarioSalesPct?: string;
    scenarioExpenseDelta?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);

  const payload = computeBusinessForecast(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials,
    scenarioSalesPct !== undefined ? Number(scenarioSalesPct) : undefined,
    scenarioExpenseDelta !== undefined ? Number(scenarioExpenseDelta) : undefined
  );

  return res.json(payload);
};

app.get('/api/business/forecast', requireAuth, handleBusinessForecast);
app.get('/api/growth/forecast', requireAuth, handleBusinessForecast);
app.get('/api/planning/forecast', requireAuth, handleBusinessForecast);

// ==========================================
// STAGE 4T: STRATEGIC SCENARIO SIMULATION & BUSINESS PLANNING
// ==========================================

// Run Simulation (Server-Authoritative, strictly read-only on live data)
app.post('/api/business/simulations/run', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to run scenario simulations.' });
  }

  const { scenarioType, scenarioName, range, startDate, endDate, locationId, assumptions } = req.body;
  if (!scenarioType) {
    return res.status(400).json({ error: 'scenarioType is required.' });
  }

  try {
    const result = executeScenarioSimulation({
      businessId: req.businessId,
      user: req.user,
      scenarioType,
      scenarioName,
      range,
      startDate,
      endDate,
      locationId,
      assumptions: assumptions || {},
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Simulation error' });
  }
});

// List Saved Simulations (Tenant Isolated)
app.get('/api/business/simulations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view simulations.' });
  }

  const simulations = db.getSimulations(req.businessId);
  return res.json({ simulations });
});

// Save or Run Simulation
app.post('/api/business/simulations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to manage simulations.' });
  }

  const { action, scenarioType, scenarioName, range, startDate, endDate, locationId, assumptions, notes } = req.body;

  // If action is run or missing baseline, run simulation directly
  if (action === 'run' || !req.body.baseline) {
    if (!scenarioType) {
      return res.status(400).json({ error: 'scenarioType is required.' });
    }
    const result = executeScenarioSimulation({
      businessId: req.businessId,
      user: req.user,
      scenarioType,
      scenarioName,
      range,
      startDate,
      endDate,
      locationId,
      assumptions: assumptions || {},
    });
    return res.json(result);
  }

  // Save simulation record
  const now = new Date().toISOString();
  const simId = req.body.id || `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const stored = {
    id: simId,
    businessId: req.businessId,
    createdBy: req.user.id,
    creatorName: req.user.name || req.user.fullName || req.user.username || 'Authorized User',
    scenarioName: scenarioName || 'Saved Simulation',
    scenarioType: scenarioType || 'custom_multi_variable',
    notes: notes || req.body.notes || '',
    assumptions: assumptions || req.body.assumptions || {},
    baseline: req.body.baseline,
    simulatedResult: req.body.simulatedResult || req.body.simulated,
    comparison: req.body.comparison,
    explanation: req.body.explanation,
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };

  db.saveSimulation(stored);
  return res.status(201).json(stored);
});

// Get Saved Simulation by ID (with IDOR prevention)
app.get('/api/business/simulations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const sim = db.getSimulationById(req.businessId, req.params.id);
  if (!sim) {
    return res.status(404).json({ error: 'Simulation not found.' });
  }
  return res.json(sim);
});

// Delete Saved Simulation by ID
app.delete('/api/business/simulations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  if (!isOwnerOrAdmin && !req.user.permissions?.financial_reports) {
    return res.status(403).json({ error: 'You are not authorized to delete simulations.' });
  }

  const deleted = db.deleteSimulation(req.businessId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Simulation not found.' });
  }
  return res.json({ success: true });
});

// Get Business Planning Targets with Live Progress
app.get('/api/business/planning/targets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const targets = db.getPlanningTargets(req.businessId, req.query.period as string);
  if (!targets) {
    return res.json({ targets: null });
  }

  const evaluated = computePlanningTargetsProgress(req.businessId, req.user, targets);
  return res.json({ targets: evaluated });
});

// STAGE 4V: Business Health Dashboard
app.get('/api/business/health', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view business health.' });
  }

  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  try {
    const report = computeBusinessHealth(req.businessId, req.user, range, startDate, endDate);
    return res.json({ health: report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compute business health.' });
  }
});

// STAGE 4W: Business Alerts & Early-Warning System
app.get('/api/business/alerts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view business alerts.' });
  }

  try {
    const alerts = generateBusinessAlerts(req.businessId, req.user);
    return res.json({ alerts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate business alerts.' });
  }
});

app.post('/api/business/alerts/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to update alert status.' });
  }

  const { status } = req.body;
  if (!['ACTIVE', 'DISMISSED', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid alert status.' });
  }

  try {
    const updated = updateAlertStatus(req.businessId, req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Alert not found.' });
    }
    return res.json({ alert: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update alert status.' });
  }
});

// STAGE 4X: Business Activity Timeline & Audit View
app.get('/api/business/activity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view business activity timeline.' });
  }

  const { range, startDate, endDate, eventType, limit } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    limit?: string;
  };

  try {
    const activities = getBusinessActivityTimeline(req.businessId, req.user, {
      range,
      startDate,
      endDate,
      eventType,
      limit: limit ? Number(limit) : undefined,
    });
    return res.json({ activities });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve business activity timeline.' });
  }
});

// STAGE 4Y: Business Daily Brief & Executive Summary
app.get('/api/business/daily-brief', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.inventory ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view the daily brief.' });
  }

  try {
    const brief = computeBusinessDailyBrief(req.businessId, req.user);
    return res.json(brief);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate daily brief.' });
  }
});

// STAGE 4Z: Business Review & Decision Log
app.get('/api/business/decisions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.inventory ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view decision records.' });
  }

  try {
    const decisions = db.getBusinessDecisions(req.businessId);
    return res.json({ decisions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve decisions.' });
  }
});

app.post('/api/business/decisions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.inventory;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to create business decisions.' });
  }

  const { title, description, category, priority, dueDate } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Decision title is required.' });
  }
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Decision description is required.' });
  }
  const validPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : 'MEDIUM';

  try {
    const newDecision: BusinessDecision = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: req.businessId,
      businessId: req.businessId,
      title: title.trim(),
      description: description.trim(),
      category: category ? String(category).trim() : 'General',
      priority: validPriority,
      status: 'OPEN',
      dueDate: dueDate ? String(dueDate) : undefined,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };

    const saved = db.saveBusinessDecision(newDecision);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create decision record.' });
  }
});

app.patch('/api/business/decisions/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.inventory;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to update decision status.' });
  }

  const { id } = req.params;
  const { status } = req.body;
  if (!['OPEN', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid decision status. Must be OPEN, COMPLETED, or CANCELLED.' });
  }

  try {
    const decision = db.getBusinessDecisionById(req.businessId, id);
    if (!decision) {
      return res.status(404).json({ error: 'Decision record not found.' });
    }

    decision.status = status;
    if (status === 'COMPLETED') {
      decision.completedAt = new Date().toISOString();
    } else {
      decision.completedAt = undefined;
    }

    const updated = db.saveBusinessDecision(decision);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update decision status.' });
  }
});

// STAGE 5A: Business Data Export & Records
app.get('/api/business/export/:type', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports ||
    req.user.permissions?.inventory ||
    req.user.permissions?.pos_sales;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to export business data.' });
  }

  const exportType = req.params.type;
  if (!exportType || !ALLOWED_EXPORT_TYPES.includes(exportType.toLowerCase().trim() as any)) {
    return res.status(400).json({ error: `Invalid export type. Allowed types: ${ALLOWED_EXPORT_TYPES.join(', ')}` });
  }

  try {
    const { filename, csv } = exportBusinessDataToCsv(req.businessId, req.user, exportType);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to export business data.' });
  }
});

// STAGE 5B: Controlled CSV Import for Products
app.post('/api/business/import/products', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.inventory;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to import products.' });
  }

  const { csv, confirm } = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ success: false, error: 'CSV content is required.' });
  }

  const validation = validateProductCsv(req.businessId, csv);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      errors: validation.errors,
      preview: validation.preview,
      totalRows: validation.totalRows,
      message: 'Product CSV validation failed. Please correct the errors.',
    });
  }

  if (!confirm) {
    return res.json({
      success: true,
      valid: true,
      preview: validation.preview,
      totalRows: validation.totalRows,
      errors: [],
      message: 'Product CSV validated successfully. Confirmation required to import.',
    });
  }

  try {
    const result = executeProductImport(req.businessId, req.user, validation.preview);
    return res.status(201).json({
      success: true,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} products.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Product import failed.' });
  }
});

// STAGE 5B: Controlled CSV Import for Customers
app.post('/api/business/import/customers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.customers;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to import customers.' });
  }

  const { csv, confirm } = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ success: false, error: 'CSV content is required.' });
  }

  const validation = validateCustomerCsv(req.businessId, csv);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      errors: validation.errors,
      preview: validation.preview,
      totalRows: validation.totalRows,
      message: 'Customer CSV validation failed. Please correct the errors.',
    });
  }

  if (!confirm) {
    return res.json({
      success: true,
      valid: true,
      preview: validation.preview,
      totalRows: validation.totalRows,
      errors: [],
      message: 'Customer CSV validated successfully. Confirmation required to import.',
    });
  }

  try {
    const result = executeCustomerImport(req.businessId, req.user, validation.preview);
    return res.status(201).json({
      success: true,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} customers.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Customer import failed.' });
  }
});

// STAGE 5C: Create Structured Business Backup
app.post('/api/business/backup', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to create business backups.' });
  }

  try {
    const backup = createBusinessBackup(req.businessId, req.user);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `bmgh_backup_${req.businessId}_${dateStr}.json`;

    // Stage 5D: Record Backup Creation Audit Event
    recordBackupAudit({
      businessId: req.businessId,
      action: 'BACKUP_CREATED',
      status: 'SUCCESS',
      performedBy: req.user.id,
      performedByName: req.user.fullName || req.user.email || 'Authorized User',
      recordCount: backup.metadata.totalRecords,
      backupVersion: backup.metadata.backupVersion,
    });

    return res.status(201).json({
      success: true,
      filename,
      backup,
      summary: {
        formatVersion: backup.metadata.formatVersion,
        backupVersion: backup.metadata.backupVersion,
        createdAt: backup.metadata.createdAt,
        totalRecords: backup.metadata.totalRecords,
        recordCounts: backup.metadata.recordCounts,
        checksum: backup.checksum,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create business backup.' });
  }
});

// STAGE 5C & 5D: Verify Business Backup Integrity & Record Audit
app.post('/api/business/backup/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to verify business backups.' });
  }

  const { backup } = req.body;
  if (!backup) {
    recordBackupAudit({
      businessId: req.businessId,
      action: 'BACKUP_VERIFY_FAILED',
      status: 'FAILED',
      performedBy: req.user.id,
      performedByName: req.user.fullName || req.user.email || 'Authorized User',
      failureReason: 'Missing backup payload',
    });
    return res.status(400).json({
      valid: false,
      errors: ['Backup payload is required for verification.'],
    });
  }

  const isMasterAdmin = req.user.role === 'master_admin';
  const result = verifyBusinessBackup(backup, isMasterAdmin ? undefined : req.businessId);

  // Stage 5D: Record Backup Verification Audit Event
  if (result.valid) {
    recordBackupAudit({
      businessId: req.businessId,
      action: 'BACKUP_VERIFY_SUCCESS',
      status: 'SUCCESS',
      performedBy: req.user.id,
      performedByName: req.user.fullName || req.user.email || 'Authorized User',
      recordCount: result.summary?.totalRecords,
      backupVersion: result.summary?.backupVersion,
    });
    return res.json(result);
  } else {
    recordBackupAudit({
      businessId: req.businessId,
      action: 'BACKUP_VERIFY_FAILED',
      status: 'FAILED',
      performedBy: req.user.id,
      performedByName: req.user.fullName || req.user.email || 'Authorized User',
      failureReason: result.errors?.join('; ') || 'Integrity check failed',
    });
    return res.status(400).json(result);
  }
});

// STAGE 5D & 5E: Read-Only Backup History & Audit Trail with Filter
app.get('/api/business/backup/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view backup history.' });
  }

  const filter = req.query.filter as string | undefined;
  const history = getBackupHistory(req.businessId, filter);
  return res.json({ success: true, history });
});

// STAGE 5E: Read-Only Backup Retention Summary
app.get('/api/business/backup/retention', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view backup retention summary.' });
  }

  const retention = getBackupRetentionSummary(req.businessId);
  return res.json({ success: true, retention });
});

// STAGE 5V: Read-Only Business Data Integrity & Consistency Center
app.get('/api/business/integrity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view data integrity reports.' });
  }

  const report = runBusinessIntegrityCheck(req.businessId);
  return res.json({ success: true, report });
});

// STAGE 5X: Global Business Search & Quick Find
app.get('/api/business/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.dashboard || req.user.permissions?.inventory || req.user.permissions?.pos || req.user.permissions?.customers;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to perform global search.' });
  }

  const q = (req.query.q as string) || '';
  const searchResult = searchBusinessRecords(req.businessId, q, req.user.permissions);
  return res.json(searchResult);
});

// STAGE 5F: Read-Only Backup Health Status
app.get('/api/business/backup/health', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view backup health status.' });
  }

  const health = getBackupHealthStatus(req.businessId);
  return res.json({ success: true, health });
});

// STAGE 5K: Read-Only Recovery Package Preparation
app.post('/api/business/backup/recovery-package', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to prepare recovery packages.' });
  }

  const recoveryPackage = prepareRecoveryPackage(req.businessId, req.user);
  recordBackupAudit({
    businessId: req.businessId,
    action: 'RECOVERY_PACKAGE_PREPARED',
    status: 'SUCCESS',
    performedBy: req.user.id,
    performedByName: req.user.fullName || req.user.email || 'Authorized User',
    recordCount: recoveryPackage.backupMetadata.totalRecords,
    backupVersion: recoveryPackage.backupMetadata.backupVersion,
  });
  return res.json({ success: true, recoveryPackage });
});

// STAGE 5L: Read-Only Recovery Package Validation
app.post('/api/business/backup/recovery-package/validate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to validate recovery packages.' });
  }

  const { packageData } = req.body;
  if (!packageData) {
    return res.status(400).json({ error: 'Recovery package data is required in request body.' });
  }

  const validation = validateRecoveryPackage(packageData, req.businessId);
  recordBackupAudit({
    businessId: req.businessId,
    action: 'RECOVERY_PACKAGE_VALIDATED',
    status: validation.status === 'VALID' ? 'SUCCESS' : validation.status === 'ATTENTION' ? 'ATTENTION' : 'FAILED',
    performedBy: req.user.id,
    performedByName: req.user.fullName || req.user.email || 'Authorized User',
    recordCount: validation.checks.length,
    backupVersion: validation.status,
  });
  return res.json({ success: true, validation });
});

// STAGE 5M: Read-Only Recovery Package Integrity Re-Verification
app.post('/api/business/backup/recovery-package/reverify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess = isOwnerOrAdmin || req.user.permissions?.financial_reports || req.user.permissions?.dashboard;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to reverify recovery packages.' });
  }

  const { packageData } = req.body;
  if (!packageData) {
    return res.status(400).json({ error: 'Recovery package data is required in request body.' });
  }

  const reverification = reverifyRecoveryPackageIntegrity(packageData, req.businessId);
  recordBackupAudit({
    businessId: req.businessId,
    action: 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED',
    status: reverification.status === 'VERIFIED' ? 'SUCCESS' : reverification.status === 'ATTENTION' ? 'ATTENTION' : 'FAILED',
    performedBy: req.user.id,
    performedByName: req.user.fullName || req.user.email || 'Authorized User',
    recordCount: reverification.checksumMatch ? 1 : 0,
    backupVersion: reverification.status,
  });
  return res.json({ success: true, reverification });
});

// Set / Update Business Planning Targets
app.post('/api/business/planning/targets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  if (!isOwnerOrAdmin && !req.user.permissions?.financial_reports) {
    return res.status(403).json({ error: 'You are not authorized to set planning targets.' });
  }

  const {
    period,
    monthlySalesTarget,
    monthlyProfitTarget,
    expenseBudget,
    stockBudget,
    growthTargetPercent,
    customerAcquisitionTarget,
    debtCollectionTarget,
    notes,
  } = req.body;

  const currentPeriod = period || new Date().toISOString().substring(0, 7);

  const targets = {
    id: `tgt_${req.businessId}_${currentPeriod}`,
    businessId: req.businessId,
    period: currentPeriod,
    monthlySalesTarget: Math.max(0, Number(monthlySalesTarget || 0)),
    monthlyProfitTarget: Math.max(0, Number(monthlyProfitTarget || 0)),
    expenseBudget: Math.max(0, Number(expenseBudget || 0)),
    stockBudget: stockBudget !== undefined ? Math.max(0, Number(stockBudget)) : undefined,
    growthTargetPercent: growthTargetPercent !== undefined ? Number(growthTargetPercent) : undefined,
    customerAcquisitionTarget: customerAcquisitionTarget !== undefined ? Number(customerAcquisitionTarget) : undefined,
    debtCollectionTarget: debtCollectionTarget !== undefined ? Number(debtCollectionTarget) : undefined,
    notes: notes || '',
    updatedBy: req.user.name || req.user.fullName || req.user.username || 'Authorized User',
    updatedAt: new Date().toISOString(),
  };

  db.savePlanningTargets(targets);
  const evaluated = computePlanningTargetsProgress(req.businessId, req.user, targets);
  return res.status(201).json({ targets: evaluated });
});

// Executive Command Center Routes (Stage 4S)
app.get('/api/executive-command-center', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'Unauthorized to view executive command center.' });
  }

  const { range, startDate, endDate, locationId } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
  };

  const payload = computeExecutiveCommandCenter({
    businessId: req.businessId,
    user: req.user,
    range,
    startDate,
    endDate,
    locationId,
  });

  return res.json(payload);
});

app.get('/api/executive/export-csv', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'Unauthorized to export executive data.' });
  }

  const { range, startDate, endDate, locationId } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
  };

  const payload = computeExecutiveCommandCenter({
    businessId: req.businessId,
    user: req.user,
    range,
    startDate,
    endDate,
    locationId,
  });

  const csv = generateExecutiveExportCsv(payload);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Executive_Report_${req.businessId}_${new Date().toISOString().split('T')[0]}.csv"`
  );
  return res.send(csv);
});

app.get('/api/executive/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const prefs = db.getExecutivePreferences(req.user.id, req.businessId);
  return res.json({ preferences: prefs });
});

app.post('/api/executive/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
  const prefs = db.saveExecutivePreferences(req.user.id, req.businessId, req.body.preferences || req.body);
  return res.json({ preferences: prefs });
});

// ==========================================
// STAGE 4U: BUSINESS GOALS, TARGETS & ACTION TRACKER
// ==========================================

app.get('/api/business/goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const rawGoals = db.getBusinessGoals(req.businessId);
  const evaluated = rawGoals.map((g) => calculateGoalActualAndStatus(g, req.businessId, req.user));
  return res.json({ goals: evaluated });
});

app.post('/api/business/goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  if (!isOwnerOrAdmin && !req.user.permissions?.financial_reports) {
    return res.status(403).json({ error: 'You are not authorized to manage business goals.' });
  }

  const { id, name, type, targetValue, startDate, endDate, description } = req.body;
  if (!name || !type || targetValue === undefined || !startDate || !endDate) {
    return res.status(400).json({ error: 'Name, type, targetValue, startDate, and endDate are required.' });
  }

  const numTarget = Number(targetValue);
  if (isNaN(numTarget) || numTarget < 0) {
    return res.status(400).json({ error: 'Target value must be a valid non-negative number.' });
  }

  if (endDate < startDate) {
    return res.status(400).json({ error: 'End date cannot precede start date.' });
  }

  const goalId = id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newGoal: BusinessGoal = {
    id: goalId,
    businessId: req.businessId,
    createdBy: req.user.id,
    name: String(name).trim(),
    type,
    targetValue: numTarget,
    startDate,
    endDate,
    description: description ? String(description).trim() : '',
    actualValue: 0,
    progressPercent: 0,
    remainingValue: numTarget,
    status: 'NOT STARTED',
    createdAt: now,
    updatedAt: now,
  };

  const saved = db.saveBusinessGoal(newGoal);
  const evaluated = calculateGoalActualAndStatus(saved, req.businessId, req.user);
  return res.status(201).json({ goal: evaluated });
});

app.delete('/api/business/goals/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  if (!isOwnerOrAdmin && !req.user.permissions?.financial_reports) {
    return res.status(403).json({ error: 'You are not authorized to delete business goals.' });
  }

  const deleted = db.deleteBusinessGoal(req.businessId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Goal not found.' });
  }
  return res.json({ success: true });
});

app.get('/api/products/planning', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwnerOrAdmin = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasAccess =
    isOwnerOrAdmin ||
    req.user.permissions?.inventory ||
    req.user.permissions?.dashboard ||
    req.user.permissions?.pos_sales ||
    req.user.permissions?.financial_reports;
  if (!hasAccess) {
    return res.status(403).json({ error: 'You are not authorized to view product planning.' });
  }

  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  const canViewFinancials = canUserViewProfit(req.user);
  const products = computeProductDemandPlanning(
    req.businessId,
    range,
    startDate,
    endDate,
    canViewFinancials
  );

  const criticalCount = products.filter((p) => p.restockAttentionLevel === 'Critical').length;
  const restockSoonCount = products.filter((p) => p.restockAttentionLevel === 'Restock Soon').length;
  const monitorCount = products.filter((p) => p.restockAttentionLevel === 'Monitor').length;
  const adequateCount = products.filter((p) => p.restockAttentionLevel === 'Adequate').length;
  const noDemandCount = products.filter((p) => p.restockAttentionLevel === 'No Current Demand').length;

  let filtered = products;
  if (req.query.status) {
    filtered = products.filter((p) => p.restockAttentionLevel === req.query.status);
  }

  return res.json({
    products: filtered,
    summary: {
      totalProductsAssessed: products.length,
      criticalCount,
      restockSoonCount,
      monitorCount,
      adequateCount,
      noDemandCount,
    },
  });
});

// ============================================================================
// STAGE 4L: CONTROLLED BUSINESS AUTOMATION, WORKFLOWS & OPERATIONS CENTER
// ============================================================================

app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const { status, priority, source, assignedTo, search, overdue } = req.query as Record<string, string>;
  let tasks = db.getTasks(req.businessId);

  // Status filter
  if (status) {
    if (status === 'active') {
      tasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'snoozed');
    } else {
      tasks = tasks.filter((t) => t.status === status);
    }
  }

  // Priority filter
  if (priority) {
    tasks = tasks.filter((t) => t.priority === priority);
  }

  // Source filter
  if (source) {
    tasks = tasks.filter((t) => t.source === source);
  }

  // AssignedTo filter
  if (assignedTo) {
    if (assignedTo === 'me') {
      tasks = tasks.filter((t) => t.assignedToId === req.user.id);
    } else {
      tasks = tasks.filter((t) => t.assignedToId === assignedTo);
    }
  }

  // Overdue filter
  if (overdue === 'true') {
    const todayAccra = getAccraToday();
    tasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < todayAccra && (t.status === 'pending' || t.status === 'in_progress')
    );
  }

  // Search filter
  if (search && search.trim()) {
    const s = search.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        (t.sourceEntityId && t.sourceEntityId.toLowerCase().includes(s))
    );
  }

  // Sanitize for financial privacy
  const sanitized = tasks
    .map((t) => sanitizeTaskForFinancialPrivacy(t, req.user))
    .filter((t): t is BusinessTask => t !== null);

  return res.json(sanitized);
});

app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const { title, description, priority, assignedToId, dueDate, actionUrl, actionLabel } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const validPriorities: TaskPriority[] = ['low', 'normal', 'high', 'critical'];
  const finalPriority: TaskPriority = validPriorities.includes(priority) ? priority : 'normal';

  let assignedToName: string | undefined;
  if (assignedToId) {
    const rawUsers = db.getRaw().users || [];
    const staff = rawUsers.find((u) => u.id === assignedToId && u.businessId === req.businessId);
    if (!staff) {
      return res.status(400).json({ error: 'Assigned staff member not found in this business.' });
    }
    assignedToName = staff.fullName;
  }

  const dedupKey = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const task = db.createTask({
    businessId: req.businessId,
    title: title.trim(),
    description: (description || '').trim(),
    source: 'Manual',
    status: 'pending',
    priority: finalPriority,
    assignedToId,
    assignedToName,
    dueDate: dueDate || getAccraToday(),
    actionUrl,
    actionLabel,
    dedupKey,
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'CREATE_TASK',
    details: `Created manual task: ${task.title} (ID: ${task.id})`,
  });

  return res.status(201).json(task);
});

app.get('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const task = db.getTaskById(req.params.id, req.businessId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const sanitized = sanitizeTaskForFinancialPrivacy(task, req.user);
  if (!sanitized) {
    return res.status(403).json({ error: 'You are not authorized to view this task.' });
  }

  return res.json(sanitized);
});

app.put('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const existing = db.getTaskById(req.params.id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const updates: Partial<BusinessTask> = {};
  const { status, priority, title, description, dueDate, assignedToId, snoozeHours, actionUrl, actionLabel } = req.body;

  if (title !== undefined) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title cannot be empty.' });
    }
    updates.title = title.trim();
  }

  if (description !== undefined) {
    updates.description = String(description).trim();
  }

  if (priority !== undefined) {
    const validPriorities: TaskPriority[] = ['low', 'normal', 'high', 'critical'];
    if (validPriorities.includes(priority)) {
      updates.priority = priority;
    }
  }

  if (dueDate !== undefined) {
    updates.dueDate = dueDate;
  }

  if (actionUrl !== undefined) updates.actionUrl = actionUrl;
  if (actionLabel !== undefined) updates.actionLabel = actionLabel;

  if (assignedToId !== undefined) {
    if (assignedToId === null || assignedToId === '') {
      updates.assignedToId = undefined;
      updates.assignedToName = undefined;
    } else {
      const rawUsers = db.getRaw().users || [];
      const staff = rawUsers.find((u) => u.id === assignedToId && u.businessId === req.businessId);
      if (!staff) {
        return res.status(400).json({ error: 'Assigned staff member not found in this business.' });
      }
      updates.assignedToId = staff.id;
      updates.assignedToName = staff.fullName;
    }
  }

  if (status !== undefined) {
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'dismissed', 'snoozed'];
    if (validStatuses.includes(status)) {
      updates.status = status;
      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
        updates.completedBy = req.user.fullName || req.user.id;
      } else if (status === 'dismissed') {
        updates.dismissedAt = new Date().toISOString();
        updates.dismissedBy = req.user.fullName || req.user.id;
      } else if (status === 'snoozed') {
        const hours = typeof snoozeHours === 'number' && snoozeHours > 0 ? snoozeHours : 24;
        updates.snoozedUntil = new Date(Date.now() + hours * 3600000).toISOString();
      }
    }
  }

  const updated = db.updateTask(req.params.id, req.businessId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Task could not be updated.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'UPDATE_TASK',
    details: `Updated task "${updated.title}" (status: ${updated.status}, ID: ${updated.id})`,
  });

  return res.json(updated);
});

app.post('/api/tasks/:id/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const existing = db.getTaskById(req.params.id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const updated = db.updateTask(req.params.id, req.businessId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    completedBy: req.user.fullName || req.user.id,
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'COMPLETE_TASK',
    details: `Completed task: ${existing.title} (ID: ${req.params.id})`,
  });

  return res.json(updated);
});

app.post('/api/tasks/:id/snooze', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const existing = db.getTaskById(req.params.id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const hours = typeof req.body.hours === 'number' && req.body.hours > 0 ? req.body.hours : 24;
  const snoozedUntil = new Date(Date.now() + hours * 3600000).toISOString();

  const updated = db.updateTask(req.params.id, req.businessId, {
    status: 'snoozed',
    snoozedUntil,
  });

  return res.json(updated);
});

app.post('/api/tasks/:id/dismiss', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const existing = db.getTaskById(req.params.id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const updated = db.updateTask(req.params.id, req.businessId, {
    status: 'dismissed',
    dismissedAt: new Date().toISOString(),
    dismissedBy: req.user.fullName || req.user.id,
  });

  return res.json(updated);
});

app.delete('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const existing = db.getTaskById(req.params.id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const deleted = db.deleteTask(req.params.id, req.businessId);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'DELETE_TASK',
    details: `Deleted task: ${existing.title} (ID: ${req.params.id})`,
  });

  return res.json({ success: true, message: 'Task deleted successfully.' });
});

app.post('/api/workflows/evaluate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const result = evaluateBusinessWorkflows(req.businessId, { triggeredBy: req.user.id });
  return res.json({ success: true, ...result });
});

app.get('/api/workflows/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const summary = getOperationsCenterSummary(req.businessId, req.user);
  return res.json(summary);
});

app.get('/api/workflows/rules', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const rules = db.getAutomationRules(req.businessId);
  return res.json(rules);
});

app.put('/api/workflows/rules', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

  const isOwner = req.user.role === 'business_owner' || req.user.role === 'master_admin';
  const hasSettingsPerm = req.user.permissions?.business_settings;
  if (!isOwner && !hasSettingsPerm) {
    return res.status(403).json({ error: 'You are not authorized to update automation rules.' });
  }

  const {
    stockCoverageDaysThreshold,
    minStockRestockAlert,
    customerInactivityDaysThreshold,
    debtOverdueDaysThreshold,
    expenseSurgeThresholdPct,
    enableDailyReview,
    enableWeeklyReview,
    autoNotifyStaff,
  } = req.body;

  const updates: Partial<AutomationRules> = {};

  if (typeof stockCoverageDaysThreshold === 'number') {
    updates.stockCoverageDaysThreshold = Math.max(1, Math.min(60, stockCoverageDaysThreshold));
  }
  if (typeof customerInactivityDaysThreshold === 'number') {
    updates.customerInactivityDaysThreshold = Math.max(7, Math.min(180, customerInactivityDaysThreshold));
  }
  if (typeof debtOverdueDaysThreshold === 'number') {
    updates.debtOverdueDaysThreshold = Math.max(1, Math.min(90, debtOverdueDaysThreshold));
  }
  if (typeof expenseSurgeThresholdPct === 'number') {
    updates.expenseSurgeThresholdPct = Math.max(5, Math.min(200, expenseSurgeThresholdPct));
  }
  if (typeof minStockRestockAlert === 'boolean') updates.minStockRestockAlert = minStockRestockAlert;
  if (typeof enableDailyReview === 'boolean') updates.enableDailyReview = enableDailyReview;
  if (typeof enableWeeklyReview === 'boolean') updates.enableWeeklyReview = enableWeeklyReview;
  if (typeof autoNotifyStaff === 'boolean') updates.autoNotifyStaff = autoNotifyStaff;

  const updatedRules = db.updateAutomationRules(req.businessId, updates);

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'UPDATE_AUTOMATION_RULES',
    details: 'Updated operational automation rules',
  });

  return res.json(updatedRules);
});

// ============================================================================
// STAGE 4M: BUSINESS COMMUNICATIONS & CUSTOMER ENGAGEMENT
// ============================================================================

app.get(
  '/api/communications',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const { status, customerId, type, channel, search } = req.query as Record<string, string>;
    const comms = db.getCommunications(req.businessId, {
      status,
      customerId,
      type,
      channel,
      search,
    });

    const canViewFinancial = canUserViewProfit(req.user);
    const sanitized = comms.map((c) => sanitizeCommunicationForStaff(c, canViewFinancial));
    return res.json(sanitized);
  }
);

app.get(
  '/api/communications/summary',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const canViewFinancial = canUserViewProfit(req.user);
    const summary = getCommunicationSummary(req.businessId, canViewFinancial);
    return res.json(summary);
  }
);

app.get(
  '/api/communications/opportunities',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const canViewFinancial = canUserViewProfit(req.user);
    const opportunities = generateCommunicationOpportunities(req.businessId, canViewFinancial);
    return res.json(opportunities);
  }
);

app.get(
  ['/api/communications/templates', '/api/communication-templates'],
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const templates = db.getCommunicationTemplates(req.businessId);
    return res.json(templates);
  }
);

app.post(
  ['/api/communications/templates', '/api/communication-templates'],
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const { name, type, channel, subject, content, variables } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Template content is required.' });
    }

    const validTypes: CommunicationType[] = [
      'DEBT_REMINDER',
      'PAYMENT_CONFIRMATION',
      'PURCHASE_FOLLOW_UP',
      'CUSTOMER_APPRECIATION',
      'INACTIVE_CUSTOMER',
      'VIP_FOLLOW_UP',
      'SERVICE_FOLLOW_UP',
      'GENERAL_CUSTOMER_MESSAGE',
    ];
    const finalType: CommunicationType = validTypes.includes(type) ? type : 'GENERAL_CUSTOMER_MESSAGE';
    const finalChannel: CommunicationChannel = channel || 'whatsapp';

    const tmpl = db.createCommunicationTemplate({
      businessId: req.businessId,
      name: name.trim(),
      type: finalType,
      channel: finalChannel,
      subject: subject ? String(subject).trim() : undefined,
      content: content.trim(),
      variables: Array.isArray(variables) ? variables : [],
      isSystem: false,
    });

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'CREATE_COMMUNICATION_TEMPLATE',
      details: `Created custom template: ${tmpl.name} (${tmpl.type})`,
    });

    return res.status(201).json(tmpl);
  }
);

app.put(
  ['/api/communications/templates/:id', '/api/communication-templates/:id'],
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationTemplateById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: 'System templates are protected and cannot be edited.' });
    }

    const { name, type, channel, subject, content, variables } = req.body;
    const updates: Partial<CommunicationTemplate> = {};
    if (name && typeof name === 'string') updates.name = name.trim();
    if (type) updates.type = type;
    if (channel) updates.channel = channel;
    if (subject !== undefined) updates.subject = subject;
    if (content && typeof content === 'string') updates.content = content.trim();
    if (Array.isArray(variables)) updates.variables = variables;

    const updated = db.updateCommunicationTemplate(req.params.id, req.businessId, updates);

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'UPDATE_COMMUNICATION_TEMPLATE',
      details: `Updated template: ${existing.name}`,
    });

    return res.json(updated);
  }
);

app.delete(
  ['/api/communications/templates/:id', '/api/communication-templates/:id'],
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationTemplateById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: 'System templates are protected and cannot be deleted.' });
    }

    db.deleteCommunicationTemplate(req.params.id, req.businessId);

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'DELETE_COMMUNICATION_TEMPLATE',
      details: `Deleted template: ${existing.name}`,
    });

    return res.json({ success: true, message: 'Template deleted successfully.' });
  }
);

app.get(
  '/api/communications/:id',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const comm = db.getCommunicationById(req.params.id, req.businessId);
    if (!comm) {
      return res.status(404).json({ error: 'Communication record not found.' });
    }

    const canViewFinancial = canUserViewProfit(req.user);
    return res.json(sanitizeCommunicationForStaff(comm, canViewFinancial));
  }
);

app.post(
  '/api/communications',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const {
      customerId,
      type,
      channel = 'whatsapp',
      templateId,
      message,
      status = 'DRAFT',
      relatedTaskId,
      relatedWorkflowId,
      relatedEntityId,
      dedupKey,
      metadata,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required for communication.' });
    }

    const customer = db.getCustomerById(customerId, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (dedupKey) {
      const existingComms = db.getCommunications(req.businessId);
      const duplicate = existingComms.find(
        (c) => c.dedupKey === dedupKey && c.status !== 'CANCELLED' && c.status !== 'SKIPPED'
      );
      if (duplicate) {
        return res.status(409).json({
          error: 'A communication with this deduplication key already exists.',
          existingCommunicationId: duplicate.id,
        });
      }
    }

    // Verify preferences
    const prefs = customer.communicationPreferences;
    if (prefs?.optedOut) {
      return res.status(400).json({ error: 'Customer has opted out of communications.' });
    }
    if (channel === 'whatsapp' && prefs && !prefs.whatsappAllowed) {
      return res.status(400).json({ error: 'Customer has disabled WhatsApp communication.' });
    }

    const business = db.getBusiness(req.businessId);
    const businessName = business?.name || 'Business';

    let finalMessage = message;
    if (!finalMessage && templateId) {
      const template = db.getCommunicationTemplateById(templateId, req.businessId);
      if (template) {
        finalMessage = renderCommunicationTemplate(template.content, {
          customerName: customer.name,
          businessName,
          amountDue: customer.currentDebt ? customer.currentDebt.toFixed(2) : '0.00',
          ...metadata,
        });
      }
    }

    if (!finalMessage || !finalMessage.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const normalizedPhone = customer.phone ? normalizeGhanaPhone(customer.phone) || customer.phone : undefined;

    const whatsappUrl =
      channel === 'whatsapp' && customer.phone
        ? generateWhatsAppUrl(customer.phone, finalMessage)
        : undefined;

    const comm = db.createCommunication({
      businessId: req.businessId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: normalizedPhone,
      type: type || 'GENERAL_CUSTOMER_MESSAGE',
      channel,
      templateId,
      message: finalMessage.trim(),
      createdBy: req.user.id,
      createdByName: req.user.fullName,
      status,
      relatedTaskId,
      relatedWorkflowId,
      relatedEntityId,
      dedupKey,
      whatsappUrl,
      metadata,
    });

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'CREATE_COMMUNICATION',
      details: `Prepared ${comm.type} communication for ${customer.name} (${comm.status})`,
    });

    return res.status(201).json(comm);
  }
);

app.put(
  '/api/communications/:id',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Communication record not found.' });
    }

    const { message, status, scheduledAt, metadata } = req.body;
    const updates: Partial<CommunicationRecord> = {};
    if (message !== undefined && typeof message === 'string') {
      updates.message = message.trim();
      if (existing.channel === 'whatsapp' && existing.customerPhone) {
        updates.whatsappUrl = generateWhatsAppUrl(existing.customerPhone, updates.message);
      }
    }
    if (status) updates.status = status;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;
    if (metadata !== undefined) updates.metadata = metadata;

    const updated = db.updateCommunication(req.params.id, req.businessId, updates);

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'UPDATE_COMMUNICATION',
      details: `Updated communication record: ${req.params.id}`,
    });

    return res.json(updated);
  }
);

app.post(
  '/api/communications/:id/approve',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Communication record not found.' });
    }

    const updated = db.updateCommunication(req.params.id, req.businessId, {
      status: 'APPROVED',
      approvedBy: req.user.id,
      approvedByName: req.user.fullName,
    });

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'APPROVE_COMMUNICATION',
      details: `Approved communication for ${existing.customerName || 'customer'}`,
    });

    return res.json(updated);
  }
);

app.post(
  '/api/communications/:id/cancel',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Communication record not found.' });
    }

    const updated = db.updateCommunication(req.params.id, req.businessId, {
      status: 'CANCELLED',
    });

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'CANCEL_COMMUNICATION',
      details: `Cancelled communication for ${existing.customerName || 'customer'}`,
    });

    return res.json(updated);
  }
);

app.post(
  '/api/communications/:id/open',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const existing = db.getCommunicationById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Communication record not found.' });
    }

    const now = new Date().toISOString();
    const freshWhatsAppUrl =
      existing.channel === 'whatsapp' && existing.customerPhone
        ? generateWhatsAppUrl(existing.customerPhone, existing.message)
        : existing.whatsappUrl;

    const updated = db.updateCommunication(req.params.id, req.businessId, {
      status: 'OPENED',
      openedAt: now,
      whatsappUrl: freshWhatsAppUrl,
    });

    // Stage 4M Behavioral Correction:
    // Opening WhatsApp only proves that the WhatsApp action/link was opened.
    // It does NOT mean the message was sent, received, or that the follow-up task is completed.
    // The linked task remains active/pending until explicitly completed by staff via the authoritative task endpoint.

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'WHATSAPP_COMMUNICATION_OPENED',
      details: `Opened WhatsApp communication link for ${existing.customerName || 'customer'} (${existing.type})`,
    });

    return res.json({
      success: true,
      communication: updated,
      whatsappUrl: freshWhatsAppUrl,
    });
  }
);

app.get(
  '/api/customers/:id/communications',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const customer = db.getCustomerById(req.params.id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const comms = db.getCommunications(req.businessId, { customerId: customer.id });
    const canViewFinancial = canUserViewProfit(req.user);
    const sanitized = comms.map((c) => sanitizeCommunicationForStaff(c, canViewFinancial));
    return res.json(sanitized);
  }
);

app.put(
  ['/api/customers/:id/preferences', '/api/customers/:id/communication-preferences'],
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });

    const customer = db.getCustomerById(req.params.id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const {
      whatsappAllowed,
      marketingAllowed,
      operationalAllowed,
      debtRemindersAllowed,
      preferredChannel,
      optedOut,
    } = req.body;

    const updates: Partial<CustomerCommunicationPreferences> = {};
    if (typeof whatsappAllowed === 'boolean') updates.whatsappAllowed = whatsappAllowed;
    if (typeof marketingAllowed === 'boolean') updates.marketingAllowed = marketingAllowed;
    if (typeof operationalAllowed === 'boolean') updates.operationalAllowed = operationalAllowed;
    if (typeof debtRemindersAllowed === 'boolean') updates.debtRemindersAllowed = debtRemindersAllowed;
    if (['whatsapp', 'sms', 'phone', 'email'].includes(preferredChannel)) {
      updates.preferredChannel = preferredChannel;
    }
    if (typeof optedOut === 'boolean') updates.optedOut = optedOut;

    const updatedCustomer = db.updateCustomerCommunicationPreferences(
      req.params.id,
      req.businessId,
      updates
    );

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'UPDATE_CUSTOMER_PREFERENCES',
      details: `Updated communication preferences for ${customer.name}`,
    });

    return res.json(updatedCustomer);
  }
);

// ============================================================================
// STAGE 4N: BUSINESS LOYALTY, RETENTION & CUSTOMER GROWTH
// ============================================================================

function canManageLoyalty(user: any): boolean {
  if (!user) return false;
  if (user.role === 'business_owner' || user.role === 'admin' || user.role === 'master_admin' || user.id === 'usr_admin_master') return true;
  return user.permissions?.loyalty_manage === true || user.permissions?.business_settings === true;
}

function canViewLoyalty(user: any): boolean {
  if (!user) return false;
  if (user.role === 'business_owner' || user.role === 'admin' || user.role === 'master_admin' || user.id === 'usr_admin_master') return true;
  return user.permissions?.loyalty_view === true || user.permissions?.customers === true;
}

function canAdjustLoyalty(user: any): boolean {
  if (!user) return false;
  if (user.role === 'business_owner' || user.role === 'admin' || user.role === 'master_admin' || user.id === 'usr_admin_master') return true;
  return user.permissions?.loyalty_adjust === true;
}

function canRedeemLoyalty(user: any): boolean {
  if (!user) return false;
  if (user.role === 'business_owner' || user.role === 'admin' || user.role === 'master_admin' || user.id === 'usr_admin_master') return true;
  return user.permissions?.loyalty_redeem === true || user.permissions?.pos_sales === true || user.permissions?.customers === true;
}

// GET /api/loyalty/config - Retrieve tenant loyalty program settings
app.get(
  '/api/loyalty/config',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view loyalty program.' });
    }

    const config = db.getLoyaltyConfig(req.businessId);
    return res.json(config);
  }
);

// PUT /api/loyalty/config - Update tenant loyalty program configuration
app.put(
  '/api/loyalty/config',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canManageLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Owner or authorized manager permission required to update loyalty configuration.' });
    }

    const {
      enabled,
      pointsPerCurrencyUnit,
      minimumPurchaseForPoints,
      minimumPointsToRedeem,
      pointValue,
      pointsExpiryDays,
      allowReferralRewards,
      referralRewardPoints,
      allowMilestoneRewards,
      requireApprovalForRewards,
      tiers,
    } = req.body;

    const updates: Partial<LoyaltyConfig> = {};

    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (pointsPerCurrencyUnit !== undefined) {
      const v = Number(pointsPerCurrencyUnit);
      if (isNaN(v) || v <= 0) return res.status(400).json({ error: 'pointsPerCurrencyUnit must be a positive number.' });
      updates.pointsPerCurrencyUnit = v;
    }
    if (minimumPurchaseForPoints !== undefined) {
      const v = Number(minimumPurchaseForPoints);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'minimumPurchaseForPoints must be a non-negative number.' });
      updates.minimumPurchaseForPoints = v;
    }
    if (minimumPointsToRedeem !== undefined) {
      const v = Number(minimumPointsToRedeem);
      if (isNaN(v) || v < 1) return res.status(400).json({ error: 'minimumPointsToRedeem must be at least 1 point.' });
      updates.minimumPointsToRedeem = Math.floor(v);
    }
    const pointValInput = pointValue !== undefined ? pointValue : req.body.pointValueGhs;
    if (pointValInput !== undefined) {
      const v = Number(pointValInput);
      if (isNaN(v) || v <= 0) return res.status(400).json({ error: 'pointValue must be a positive number.' });
      updates.pointValue = v;
      (updates as any).pointValueGhs = v;
    }
    if (pointsExpiryDays !== undefined) {
      const v = Number(pointsExpiryDays);
      if (isNaN(v) || v < 1) return res.status(400).json({ error: 'pointsExpiryDays must be at least 1 day.' });
      updates.pointsExpiryDays = Math.floor(v);
    }
    if (typeof allowReferralRewards === 'boolean') updates.allowReferralRewards = allowReferralRewards;
    if (referralRewardPoints !== undefined) {
      const v = Number(referralRewardPoints);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'referralRewardPoints must be non-negative.' });
      updates.referralRewardPoints = Math.floor(v);
    }
    if (typeof allowMilestoneRewards === 'boolean') updates.allowMilestoneRewards = allowMilestoneRewards;
    if (typeof requireApprovalForRewards === 'boolean') updates.requireApprovalForRewards = requireApprovalForRewards;
    if (Array.isArray(tiers)) updates.tiers = tiers;

    const updated = db.updateLoyaltyConfig(req.businessId, updates);

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'LOYALTY_CONFIG_UPDATED',
      details: `Updated loyalty program settings (Enabled: ${updated.enabled}, Rate: ${updated.pointsPerCurrencyUnit}).`,
    });

    return res.json(updated);
  }
);

// GET /api/loyalty/customers - List customers with loyalty & retention summaries
app.get(
  '/api/loyalty/customers',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view customer loyalty profiles.' });
    }

    const { search, tier, retentionStatus } = req.query;
    const customers = db.getCustomers(req.businessId);
    const canViewFinancials = canUserViewProfit(req.user);

    let profiles: CustomerLoyaltyProfile[] = [];
    for (const c of customers) {
      const profile = getCustomerLoyaltyProfile(req.businessId, c.id);
      if (!profile) continue;

      if (tier && profile.tier !== tier) continue;
      if (retentionStatus && profile.retentionStatus !== retentionStatus) continue;
      if (search) {
        const q = String(search).toLowerCase();
        const matchName = profile.customerName?.toLowerCase().includes(q);
        const matchPhone = profile.customerPhone?.includes(q);
        const matchTier = profile.tier.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTier) continue;
      }

      if (!canViewFinancials) {
        profile.totalPurchaseValue = 0;
        profile.averageOrderValue = 0;
      }

      profiles.push(profile);
    }

    // Sort by points balance descending
    profiles.sort((a, b) => b.pointsBalance - a.pointsBalance);

    return res.json(profiles);
  }
);

// GET /api/loyalty/customers/:id - Retrieve full loyalty profile for single customer
app.get(
  '/api/loyalty/customers/:id',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view customer loyalty profile.' });
    }

    const profile = getCustomerLoyaltyProfile(req.businessId, req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const canViewFinancials = canUserViewProfit(req.user);
    if (!canViewFinancials) {
      profile.totalPurchaseValue = 0;
      profile.averageOrderValue = 0;
    }

    return res.json(profile);
  }
);

// GET /api/loyalty/customers/:id/ledger - Points transaction ledger history
app.get(
  '/api/loyalty/customers/:id/ledger',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view loyalty ledger.' });
    }

    const customer = db.getCustomerById(req.params.id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const ledger = db.getLoyaltyLedger(req.businessId, req.params.id);
    return res.json(ledger);
  }
);

// GET /api/loyalty/customers/:id/milestones - Milestones achieved by customer
app.get(
  '/api/loyalty/customers/:id/milestones',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view milestones.' });
    }

    const customer = db.getCustomerById(req.params.id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const milestones = db.getLoyaltyMilestones(req.businessId, req.params.id);
    return res.json(milestones);
  }
);

// GET /api/loyalty/customers/:id/referrals - Referrals associated with customer
app.get(
  '/api/loyalty/customers/:id/referrals',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view referrals.' });
    }

    const customer = db.getCustomerById(req.params.id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const referrals = db.getLoyaltyReferrals(req.businessId, { referrerCustomerId: req.params.id });
    return res.json(referrals);
  }
);

// POST /api/loyalty/redeem - Redeem customer points for an authorized reward voucher
app.post(
  '/api/loyalty/redeem',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canRedeemLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to redeem loyalty points.' });
    }

    const { customerId, points, notes } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });
    if (!points || isNaN(Number(points))) return res.status(400).json({ error: 'Valid points amount is required.' });

    const result = redeemLoyaltyReward(
      req.businessId,
      customerId,
      Number(points),
      { id: req.user.id, name: req.user.fullName || req.user.email },
      notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ success: true, redemption: result.redemption });
  }
);

// POST /api/loyalty/adjust - Manually adjust customer loyalty points (audited)
app.post(
  '/api/loyalty/adjust',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canAdjustLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Owner or authorized manager permission required for manual points adjustment.' });
    }

    const policyCheck = evaluateOperationalPolicy(req.businessId, req.user!, 'allowStaffManualLoyaltyAdjust');
    if (!policyCheck.allowed) {
      recordSecurityEvent({
        businessId: req.businessId,
        userId: req.user?.id,
        userName: req.user?.fullName,
        type: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Staff attempted manual loyalty points adjustment without policy permission.`,
        endpoint: '/api/loyalty/adjust',
      });
      return res.status(403).json({
        error: policyCheck.code || 'POLICY_RESTRICTION',
        message: policyCheck.message || 'Staff manual loyalty adjustments are disabled by business operational policy.',
        code: policyCheck.code || 'POLICY_RESTRICTION',
      });
    }

    const { customerId, points, reason } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });
    if (points === undefined || isNaN(Number(points)) || Number(points) === 0) {
      return res.status(400).json({ error: 'points must be a non-zero integer.' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'reason is required for manual adjustment.' });
    }

    const result = adjustCustomerPoints(
      req.businessId,
      customerId,
      Number(points),
      String(reason).trim(),
      { id: req.user.id, name: req.user.fullName || req.user.email }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, entry: result.entry });
  }
);

// POST /api/loyalty/referrals - Register a new customer referral
app.post(
  '/api/loyalty/referrals',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to create referrals.' });
    }

    const { referrerCustomerId, referredCustomerId, notes } = req.body;
    if (!referrerCustomerId || !referredCustomerId) {
      return res.status(400).json({ error: 'referrerCustomerId and referredCustomerId are both required.' });
    }

    const result = createLoyaltyReferral(
      req.businessId,
      referrerCustomerId,
      referredCustomerId,
      { id: req.user.id, name: req.user.fullName || req.user.email },
      notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ success: true, referral: result.referral });
  }
);

// GET /api/loyalty/analytics - Comprehensive loyalty, retention and growth metrics
app.get(
  '/api/loyalty/analytics',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view loyalty analytics.' });
    }

    const analytics = calculateLoyaltyAnalytics(req.businessId);
    return res.json(analytics);
  }
);

// GET /api/loyalty/opportunities - Retention and growth opportunities
app.get(
  '/api/loyalty/opportunities',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view retention opportunities.' });
    }

    const opps = getRetentionOpportunities(req.businessId);
    return res.json(opps);
  }
);

// GET /api/loyalty/redemptions - List reward redemptions for business
app.get(
  '/api/loyalty/redemptions',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canViewLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Permission denied to view redemptions.' });
    }

    const customerId = req.query.customerId as string | undefined;
    const redemptions = db.getRedemptions(req.businessId, customerId);
    return res.json(redemptions);
  }
);

// POST /api/loyalty/redemptions/:id/approve - Approve pending reward redemption
app.post(
  '/api/loyalty/redemptions/:id/approve',
  requireAuth,
  requireFeature('loyalty'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business context required.' });
    if (!canManageLoyalty(req.user)) {
      return res.status(403).json({ error: 'STAFF_PERMISSION_DENIED', message: 'Owner or authorized manager permission required to approve rewards.' });
    }

    const result = approveLoyaltyReward(
      req.businessId,
      req.params.id,
      { id: req.user.id, name: req.user.fullName || req.user.email }
    );

    if (!result.success) {
      if (result.error === 'Redemption request not found.') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, redemption: result.redemption });
  }
);

// ----------------------------------------------------
// 2. DASHBOARD METRICS & CHARTS (Zero-safe & isolated)
// ----------------------------------------------------
app.get('/api/dashboard', requireAuth, requirePermission('dashboard'), (req: AuthenticatedRequest, res) => {
  const businessId = req.businessId;
  if (!businessId) {
    return res.json({
      todaySales: 0,
      todayProfit: 0,
      todayExpenses: 0,
      moneyOwedToYou: 0,
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inventoryValue: 0,
      stockAlerts: [],
      recentSales: [],
      bestSellingProducts: [],
      salesOverTime: [],
      yesterdaySales: 0,
      past7DaysSales: 0,
      past7DaysExpenses: 0,
      past7DaysProfit: 0,
    });
  }

  const products = db.getProducts(businessId);
  const sales = db.getSales(businessId);
  const expenses = db.getExpenses(businessId);
  const customers = db.getCustomers(businessId);

  const todayStr = getAccraToday();

  // Today's Sales & Profit (Ghana business date)
  const todaySalesArr = sales.filter(
    (s) => getAccraDateString(s.createdAt) === todayStr && s.status === 'Completed'
  );
  const todaySales = todaySalesArr.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = todaySalesArr.reduce((sum, s) => sum + s.profit, 0);

  // Today's Expenses (Ghana business date)
  const todayExpensesArr = expenses.filter((e) => getAccraDateString(e.date) === todayStr);
  const todayExpenses = todayExpensesArr.reduce((sum, e) => sum + e.amount, 0);

  // Money Owed To You (Sum of customer currentDebt or credit sales balances)
  const moneyOwedToYou = customers.reduce((sum, c) => {
    const custSalesDebt = sales
      .filter((s) => s.customerId === c.id)
      .reduce((sSum, s) => sSum + (Number(s.balance) || 0), 0);
    return sum + Math.max(0, Math.max(Number(c.currentDebt) || 0, custSalesDebt));
  }, 0);

  // Stock counts and inventory valuation (At buying cost)
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minStockLevel).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;
  const inventoryValue = products.reduce((sum, p) => {
    const qty = Math.max(0, Number(p.quantity) || 0);
    const bp = Math.max(0, Number(p.buyingPrice) || 0);
    return sum + qty * bp;
  }, 0);

  // Stock alerts (Out of stock and Low stock items)
  const stockAlerts = products
    .filter((p) => p.quantity <= p.minStockLevel)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: p.quantity,
      minStockLevel: p.minStockLevel,
      status: p.quantity <= 0 ? ('out_of_stock' as const) : ('low_stock' as const),
      category: p.category || 'General',
      buyingPrice: p.buyingPrice,
      sellingPrice: p.sellingPrice,
    }))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10);

  // Best-selling products aggregation
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const s of sales) {
    if (s.status !== 'Completed') continue;
    for (const item of s.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    }
  }

  const bestSellingProducts = Object.entries(productSalesMap)
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      totalQuantity: data.quantity,
      totalRevenue: data.revenue,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  // Sales & Expenses over last 7 days (Ghana business dates)
  const salesOverTime: { date: string; sales: number; expenses: number; profit: number }[] = [];
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(Date.UTC(tYear, tMonth - 1, tDay - i, 12, 0, 0));
    const dayStr = getAccraDateString(dayDate);
    const daySales = sales
      .filter((s) => getAccraDateString(s.createdAt) === dayStr && s.status === 'Completed')
      .reduce((sum, s) => sum + s.total, 0);
    const dayProf = sales
      .filter((s) => getAccraDateString(s.createdAt) === dayStr && s.status === 'Completed')
      .reduce((sum, s) => sum + s.profit, 0);
    const dayExp = expenses
      .filter((e) => getAccraDateString(e.date) === dayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Accra',
      day: 'numeric',
      month: 'short',
    }).format(dayDate);

    salesOverTime.push({
      date: formattedDate,
      sales: daySales,
      expenses: dayExp,
      profit: Math.max(0, dayProf - dayExp),
    });
  }

  // Yesterday's calculation (Ghana business date)
  const yesterdayDate = new Date(Date.UTC(tYear, tMonth - 1, tDay - 1, 12, 0, 0));
  const yesterdayStr = getAccraDateString(yesterdayDate);
  const yesterdaySales = sales
    .filter((s) => getAccraDateString(s.createdAt) === yesterdayStr && s.status === 'Completed')
    .reduce((sum, s) => sum + s.total, 0);

  const past7DaysSales = salesOverTime.reduce((sum, d) => sum + d.sales, 0);
  const past7DaysExpenses = salesOverTime.reduce((sum, d) => sum + d.expenses, 0);
  const past7DaysProfit = salesOverTime.reduce((sum, d) => sum + (d.profit || 0), 0);

  const canViewFinancials = canUserViewProfit(req.user);

  const safeStockAlerts = stockAlerts.map((alert) => {
    if (canViewFinancials) return alert;
    const { buyingPrice, ...safeAlert } = alert;
    return safeAlert;
  });

  const safeRecentSales = sales.slice(0, 8).map((s) => sanitizeSaleForStaff(s, canViewFinancials));

  const safeSalesOverTime = salesOverTime.map((item) => {
    if (canViewFinancials) return item;
    const { profit, ...safeItem } = item;
    return safeItem;
  });

  res.json({
    todaySales,
    todayProfit: canViewFinancials ? todayProfit : undefined,
    todayExpenses,
    moneyOwedToYou,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    inventoryValue: canViewFinancials ? inventoryValue : undefined,
    stockAlerts: safeStockAlerts,
    recentSales: safeRecentSales,
    bestSellingProducts,
    salesOverTime: safeSalesOverTime,
    yesterdaySales,
    past7DaysSales,
    past7DaysExpenses,
    past7DaysProfit: canViewFinancials ? past7DaysProfit : undefined,
    todaySalesCount: todaySalesArr.length,
  });
});

// ----------------------------------------------------
// 3. PRODUCTS & INVENTORY ROUTES
// ----------------------------------------------------

// Helper: decorate product with server-authoritative stockStatus and shortfall
function decorateProductWithStockStatus(p: Product): Product {
  const minStock = p.minStockLevel !== undefined ? p.minStockLevel : 5;
  const status: 'OUT OF STOCK' | 'LOW STOCK' | 'IN STOCK' =
    p.quantity <= 0
      ? 'OUT OF STOCK'
      : p.quantity <= minStock
      ? 'LOW STOCK'
      : 'IN STOCK';
  const shortfall = Math.max(minStock - p.quantity, 0);
  return {
    ...p,
    stockStatus: status,
    shortfall,
  };
}

// GET /api/products
app.get('/api/products', requireAuth, requirePermission('view_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const { search, category, stockStatus } = req.query;
  let products = db.getProducts(req.businessId);

  if (category && typeof category === 'string' && category !== 'All') {
    products = products.filter(
      (p) => p.category?.toLowerCase() === category.toLowerCase()
    );
  }

  if (stockStatus && typeof stockStatus === 'string') {
    const s = stockStatus.toLowerCase().trim();
    if (s === 'out' || s === 'out_of_stock') {
      products = products.filter((p) => p.quantity <= 0);
    } else if (s === 'low' || s === 'low_stock') {
      products = products.filter((p) => p.quantity > 0 && p.quantity <= (p.minStockLevel ?? 5));
    } else if (s === 'normal' || s === 'in' || s === 'in_stock') {
      products = products.filter((p) => p.quantity > (p.minStockLevel ?? 5));
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // Decorate with server-derived status & shortfall
  let decorated = products.map(decorateProductWithStockStatus);

  const canViewFinancials = canUserViewProfit(req.user);
  if (!canViewFinancials) {
    decorated = decorated.map((p) => {
      const { buyingPrice, ...safeProduct } = p;
      return safeProduct as any;
    });
  }

  res.json(decorated);
});

// GET /api/products/:id
app.get('/api/products/:id', requireAuth, requirePermission('view_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const product = db.getProductById(req.params.id, req.businessId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const movements = db.getStockMovements(req.businessId, product.id);

  // Supplier restock history from purchases
  const allPurchases = db.getPurchases(req.businessId);
  const relatedPurchases = allPurchases.filter((p) =>
    p.items.some((i) => i.productId === product.id)
  );
  let lastRestockedAt: string | undefined;
  let lastRestockQuantity: number | undefined;
  if (relatedPurchases.length > 0) {
    const sorted = [...relatedPurchases].sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    const lastP = sorted[0];
    lastRestockedAt = lastP.date || lastP.createdAt;
    const lastItem = lastP.items.find((i) => i.productId === product.id);
    lastRestockQuantity = lastItem?.quantity;
  }

  const decorated = decorateProductWithStockStatus(product);

  const canViewFinancials = canUserViewProfit(req.user);
  let safeProduct: any = decorated;
  if (!canViewFinancials) {
    const { buyingPrice, ...rest } = decorated;
    safeProduct = rest;
  }

  res.json({
    product: safeProduct,
    movements,
    supplierRestock: {
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      lastRestockedAt,
      lastRestockQuantity,
      totalPurchasesCount: relatedPurchases.length,
    },
  });
});

// POST /api/products
app.post('/api/products', requireAuth, requirePermission('manage_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

  // Stage 4R: Check product catalog quota limit
  const isMasterAdmin =
    req.user?.role === 'master_admin' || req.user?.id === 'usr_admin_master';
  const productLimitCheck = checkResourceLimit(req.businessId, 'products', isMasterAdmin);
  if (!productLimitCheck.allowed) {
    return res.status(403).json({
      error: productLimitCheck.error,
      code: 'PLAN_LIMIT_REACHED',
      resource: 'products',
      current: productLimitCheck.current,
      max: productLimitCheck.max,
    });
  }

  const {
    name,
    sku,
    category,
    buyingPrice,
    sellingPrice,
    quantity,
    minStockLevel,
    supplierId,
    supplierName,
    description,
    imageUrl,
  } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required.' });
  }

  const buy = Number(buyingPrice);
  const sell = Number(sellingPrice);
  const qty = Number(quantity);
  const minStock = minStockLevel !== undefined ? Number(minStockLevel) : 5;

  if (isNaN(buy) || buy < 0) {
    return res.status(400).json({ error: 'Buying price must be a valid positive number or 0.' });
  }

  if (isNaN(sell) || sell < 0) {
    return res.status(400).json({ error: 'Selling price must be a valid positive number or 0.' });
  }

  if (isNaN(qty) || qty < 0) {
    return res.status(400).json({ error: 'Current stock quantity cannot be negative.' });
  }

  if (isNaN(minStock) || minStock < 0) {
    return res.status(400).json({ error: 'Minimum stock alert level cannot be negative.' });
  }

  // SKU generation or duplicate validation within business
  let generatedSku = sku && typeof sku === 'string' && sku.trim()
    ? sku.trim().toUpperCase()
    : `SKU-${Date.now().toString().slice(-6)}`;

  const existingProducts = db.getProducts(req.businessId);
  if (existingProducts.some((p) => p.sku && p.sku.toUpperCase() === generatedSku)) {
    if (sku && typeof sku === 'string' && sku.trim()) {
      return res.status(400).json({ error: `Product with SKU "${generatedSku}" already exists in your inventory.` });
    }
    // If auto-generated happened to clash, regenerate
    generatedSku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  }

  // Supplier ownership validation
  let supName = supplierName;
  if (supplierId) {
    const suppliers = db.getSuppliers(req.businessId);
    const found = suppliers.find((s) => s.id === supplierId);
    if (!found) {
      return res.status(400).json({ error: 'Selected supplier does not exist in your business.' });
    }
    supName = found.name;
  }

  const product = db.addProduct(
    {
      businessId: req.businessId,
      name: name.trim(),
      sku: generatedSku,
      category: category && typeof category === 'string' && category.trim() ? category.trim() : 'General',
      buyingPrice: buy,
      sellingPrice: sell,
      quantity: Math.round(qty),
      minStockLevel: Math.round(minStock),
      supplierId: supplierId || undefined,
      supplierName: supName || undefined,
      description: description ? String(description).trim() : '',
      imageUrl: imageUrl ? String(imageUrl).trim() : '',
    },
    req.user?.fullName
  );

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Product Creation',
    details: `Added product "${product.name}" (SKU: ${product.sku}, Stock: ${product.quantity}, Sell: GH₵${product.sellingPrice.toFixed(2)}).`,
    ipAddress: req.ip,
  });

  const decorated = decorateProductWithStockStatus(product);
  const canViewFinancials = canUserViewProfit(req.user);
  let safeProduct: any = decorated;
  if (!canViewFinancials) {
    const { buyingPrice: _, ...rest } = decorated;
    safeProduct = rest;
  }

  res.status(201).json(safeProduct);
});

// PUT /api/products/:id
app.put('/api/products/:id', requireAuth, requirePermission('manage_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const {
    name,
    sku,
    category,
    buyingPrice,
    sellingPrice,
    quantity,
    minStockLevel,
    supplierId,
    supplierName,
    description,
    imageUrl,
    movementReason,
  } = req.body;

  const existing = db.getProductById(id, req.businessId);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found or has been deleted.' });
  }

  const updates: Partial<Product> = {};

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Product name cannot be empty.' });
    }
    updates.name = name.trim();
  }

  if (sku !== undefined) {
    const trimmedSku = String(sku).trim().toUpperCase();
    if (trimmedSku) {
      const existingProducts = db.getProducts(req.businessId);
      const clash = existingProducts.find((p) => p.id !== id && p.sku && p.sku.toUpperCase() === trimmedSku);
      if (clash) {
        return res.status(400).json({ error: `Product with SKU "${trimmedSku}" already exists in your inventory.` });
      }
      updates.sku = trimmedSku;
    }
  }

  if (category !== undefined) {
    updates.category = String(category).trim() || 'General';
  }

  if (buyingPrice !== undefined) {
    const buy = Number(buyingPrice);
    if (isNaN(buy) || buy < 0) {
      return res.status(400).json({ error: 'Buying price must be a valid number >= 0.' });
    }
    updates.buyingPrice = buy;
  }

  if (sellingPrice !== undefined) {
    const sell = Number(sellingPrice);
    if (isNaN(sell) || sell < 0) {
      return res.status(400).json({ error: 'Selling price must be a valid number >= 0.' });
    }
    updates.sellingPrice = sell;
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
    }
    updates.quantity = Math.round(qty);
  }

  if (minStockLevel !== undefined) {
    const minStock = Number(minStockLevel);
    if (isNaN(minStock) || minStock < 0) {
      return res.status(400).json({ error: 'Minimum stock alert level cannot be negative.' });
    }
    updates.minStockLevel = Math.round(minStock);
  }

  if (supplierId !== undefined) {
    updates.supplierId = supplierId || undefined;
    if (supplierId) {
      const suppliers = db.getSuppliers(req.businessId);
      const found = suppliers.find((s) => s.id === supplierId);
      if (!found) {
        return res.status(400).json({ error: 'Selected supplier does not exist in your business.' });
      }
      updates.supplierName = found.name;
    } else {
      updates.supplierName = undefined;
    }
  } else if (supplierName !== undefined) {
    updates.supplierName = supplierName;
  }

  if (description !== undefined) {
    updates.description = String(description).trim();
  }

  if (imageUrl !== undefined) {
    updates.imageUrl = String(imageUrl).trim();
  }

  const updated = db.updateProduct(
    id,
    req.businessId,
    updates,
    movementReason,
    req.user?.fullName
  );

  if (!updated) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Product Update',
    details: `Updated product "${updated.name}" (SKU: ${updated.sku}, Stock: ${updated.quantity}).`,
    ipAddress: req.ip,
  });

  const decorated = decorateProductWithStockStatus(updated);
  const canViewFinancials = canUserViewProfit(req.user);
  let safeProduct: any = decorated;
  if (!canViewFinancials) {
    const { buyingPrice: _, ...rest } = decorated;
    safeProduct = rest;
  }

  res.json(safeProduct);
});

// POST /api/products/:id/adjust-stock
app.post('/api/products/:id/adjust-stock', requireAuth, requirePermission('manage_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

  const policyCheck = evaluateOperationalPolicy(req.businessId, req.user!, 'allowStaffStockAdjustment');
  if (!policyCheck.allowed) {
    recordSecurityEvent({
      businessId: req.businessId,
      userId: req.user?.id,
      userName: req.user?.fullName,
      type: 'POLICY_VIOLATION',
      severity: 'WARNING',
      description: `Staff attempted manual stock adjustment on product ${req.params.id} without policy permission.`,
      endpoint: `/api/products/${req.params.id}/adjust-stock`,
    });
    return res.status(403).json({
      error: policyCheck.code || 'POLICY_RESTRICTION',
      message: policyCheck.message || 'Staff stock adjustment is disabled by business operational policy.',
      code: policyCheck.code || 'POLICY_RESTRICTION',
    });
  }

  const { id } = req.params;
  const { adjustmentType, quantityChange, newTotalQuantity, reason } = req.body;

  // Enforce required reason
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      error: 'Adjustment reason is required (e.g. Physical count correction, Damaged stock, Missing stock, Expired stock, Opening balance correction).',
    });
  }

  const product = db.getProductById(id, req.businessId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Idempotency / Duplicate submission protection
  const idempotencyKey = ((req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey)?.trim();
  if (idempotencyKey) {
    const existingMovement = (db.getStockMovements(req.businessId) || []).find(
      (m: any) => m.idempotencyKey === idempotencyKey
    );
    if (existingMovement) {
      const decorated = decorateProductWithStockStatus(product);
      let safeProduct: any = decorated;
      if (!canUserViewProfit(req.user)) {
        const { buyingPrice: _, ...rest } = decorated;
        safeProduct = rest;
      }
      return res.status(200).json({
        product: safeProduct,
        message: 'Stock adjustment previously processed (idempotent response).',
        movement: existingMovement,
      });
    }
  }

  if (newTotalQuantity === undefined && quantityChange === undefined) {
    return res.status(400).json({ error: 'Must provide either newTotalQuantity or quantityChange.' });
  }

  let finalQuantity = product.quantity;
  if (newTotalQuantity !== undefined) {
    const n = Number(newTotalQuantity);
    if (isNaN(n) || n < 0) {
      return res.status(400).json({ error: 'Calculated stock quantity cannot be negative.' });
    }
    finalQuantity = Math.round(n);
  } else if (quantityChange !== undefined) {
    const deltaInput = Number(quantityChange);
    if (isNaN(deltaInput)) {
      return res.status(400).json({ error: 'Invalid quantity change value.' });
    }
    finalQuantity = Math.round(product.quantity + deltaInput);
  }

  if (finalQuantity < 0) {
    return res.status(400).json({ error: 'Calculated stock quantity cannot be negative.' });
  }

  const delta = finalQuantity - product.quantity;
  if (delta === 0) {
    const decorated = decorateProductWithStockStatus(product);
    let safeProduct: any = decorated;
    if (!canUserViewProfit(req.user)) {
      const { buyingPrice: _, ...rest } = decorated;
      safeProduct = rest;
    }
    return res.json({ product: safeProduct, message: 'Stock quantity unchanged.' });
  }

  const updated = db.updateProduct(
    id,
    req.businessId,
    { quantity: finalQuantity },
    `${reason.trim()} (${adjustmentType || 'manual'}): ${delta > 0 ? `+${delta}` : delta} (Previous: ${product.quantity}, New: ${finalQuantity})`,
    req.user?.fullName,
    idempotencyKey
  );

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Stock Adjustment',
    details: `Adjusted stock for "${product.name}" from ${product.quantity} to ${finalQuantity} units (${reason.trim()}). Delta: ${delta > 0 ? `+${delta}` : delta}.`,
    ipAddress: req.ip,
  });

  const decorated = decorateProductWithStockStatus(updated!);
  const canViewFinancials = canUserViewProfit(req.user);
  let safeProduct: any = decorated;
  if (!canViewFinancials) {
    const { buyingPrice: _, ...rest } = decorated;
    safeProduct = rest;
  }

  res.json({ product: safeProduct, message: 'Stock adjusted successfully.' });
});

// GET /api/inventory/intelligence
app.get('/api/inventory/intelligence', requireAuth, requirePermission('view_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { range, startDate, endDate } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
  };

  const businessId = req.businessId;
  const canViewFinancials = canUserViewProfit(req.user);

  // Authoritative data collections
  const products = db.getProducts(businessId);
  const sales = db.getSales(businessId);
  const purchases = db.getPurchases(businessId);
  const movements = db.getStockMovements(businessId);
  const suppliers = db.getSuppliers(businessId);

  // Resolve Accra business date range
  const dateRange = resolveAccraDateRange(range, startDate, endDate);
  const { fromDate, toDate, label, normalizedRange } = dateRange;

  // 1. Overview & Valuation
  const totalProducts = products.length;
  let totalStockUnits = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryCost = 0;
  let totalRetailValue = 0;

  const lowStockList: any[] = [];
  const outOfStockList: any[] = [];

  // Helper map for last restock date & qty from purchases
  const productRestockMap = new Map<string, { lastDate: string; lastQty: number; count: number }>();
  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  for (const purch of sortedPurchases) {
    const pDate = purch.date || purch.createdAt;
    for (const item of purch.items) {
      if (!productRestockMap.has(item.productId)) {
        productRestockMap.set(item.productId, {
          lastDate: pDate,
          lastQty: item.quantity,
          count: 1,
        });
      } else {
        productRestockMap.get(item.productId)!.count += 1;
      }
    }
  }

  for (const p of products) {
    const qty = p.quantity || 0;
    const minStock = p.minStockLevel !== undefined ? p.minStockLevel : 5;
    totalStockUnits += qty;

    const retailVal = qty * (p.sellingPrice || 0);
    const costVal = qty * (p.buyingPrice || 0);
    totalRetailValue += retailVal;
    totalInventoryCost += costVal;

    const status: 'OUT OF STOCK' | 'LOW STOCK' | 'IN STOCK' =
      qty <= 0
        ? 'OUT OF STOCK'
        : qty <= minStock
        ? 'LOW STOCK'
        : 'IN STOCK';
    const shortfall = Math.max(minStock - qty, 0);

    const restockInfo = productRestockMap.get(p.id);

    const alertItem: any = {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || 'General',
      quantity: qty,
      minStockLevel: minStock,
      shortfall,
      sellingPrice: p.sellingPrice,
      stockStatus: status,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      lastRestockedAt: restockInfo?.lastDate,
      lastRestockQuantity: restockInfo?.lastQty,
    };
    if (canViewFinancials) {
      alertItem.buyingPrice = p.buyingPrice;
    }

    if (status === 'OUT OF STOCK') {
      outOfStockCount++;
      outOfStockList.push(alertItem);
    } else if (status === 'LOW STOCK') {
      lowStockCount++;
      lowStockList.push(alertItem);
    } else {
      inStockCount++;
    }
  }

  // Sort alerts by shortfall descending
  lowStockList.sort((a, b) => b.shortfall - a.shortfall);
  outOfStockList.sort((a, b) => b.shortfall - a.shortfall);

  const potentialGrossMargin = canViewFinancials ? totalRetailValue - totalInventoryCost : undefined;
  const potentialGrossMarginPercentage =
    canViewFinancials && totalRetailValue > 0
      ? (potentialGrossMargin! / totalRetailValue) * 100
      : undefined;

  const overview = {
    totalProducts,
    totalStockUnits,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    potentialRetailValue: Number(totalRetailValue.toFixed(2)),
    ...(canViewFinancials
      ? {
          inventoryCostValue: Number(totalInventoryCost.toFixed(2)),
          potentialGrossMargin: Number((potentialGrossMargin || 0).toFixed(2)),
          potentialGrossMarginPercentage: Number((potentialGrossMarginPercentage || 0).toFixed(2)),
        }
      : {}),
  };

  // 2. Filter completed sales within Accra date range
  const filteredCompletedSales = sales.filter((s) => {
    if (s.status !== 'Completed') return false;
    const saleDateStr = getAccraDateString(s.createdAt || (s as any).date);
    return saleDateStr >= fromDate && saleDateStr <= toDate;
  });

  // Aggregate product performance in period
  const productSalesMap = new Map<string, { qty: number; revenue: number; txCount: number; name: string }>();
  for (const sale of filteredCompletedSales) {
    for (const item of sale.items) {
      const existing = productSalesMap.get(item.productId) || {
        qty: 0,
        revenue: 0,
        txCount: 0,
        name: item.productName || 'Product',
      };
      const itemQty = Number(item.quantity) || 0;
      const itemRev = Number(item.total !== undefined ? item.total : ((item as any).totalPrice || 0));
      existing.qty += itemQty;
      existing.revenue += itemRev;
      existing.txCount += 1;
      existing.name = item.productName || existing.name;
      productSalesMap.set(item.productId, existing);
    }
  }

  // 3. Fast-Moving Products
  const fastMovingProducts: any[] = [];
  productSalesMap.forEach((val, pId) => {
    const prod = products.find((p) => p.id === pId);
    fastMovingProducts.push({
      productId: pId,
      productName: prod ? prod.name : val.name,
      sku: prod ? prod.sku : '',
      category: prod?.category || 'General',
      currentStock: prod ? prod.quantity : 0,
      quantitySold: val.qty,
      revenue: Number(val.revenue.toFixed(2)),
      transactionCount: val.txCount,
    });
  });
  fastMovingProducts.sort((a, b) => b.quantitySold - a.quantitySold);

  // 4. Slow-Moving Products
  const hasSufficientHistory = sales.filter((s) => s.status === 'Completed').length >= 2;
  const slowMovingItems: any[] = [];

  if (hasSufficientHistory) {
    for (const prod of products) {
      if (prod.quantity > 0) {
        const perf = productSalesMap.get(prod.id);
        const qtySold = perf ? perf.qty : 0;
        const rev = perf ? perf.revenue : 0;
        if (qtySold <= 2) {
          slowMovingItems.push({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category || 'General',
            currentStock: prod.quantity,
            quantitySold: qtySold,
            revenue: Number(rev.toFixed(2)),
          });
        }
      }
    }
    slowMovingItems.sort((a, b) => a.quantitySold - b.quantitySold || b.currentStock - a.currentStock);
  }

  // 5. Never-Sold Products (All-Time Dead Stock)
  const allSoldProductIds = new Set<string>();
  for (const s of sales) {
    if (s.status === 'Completed') {
      for (const i of s.items) {
        allSoldProductIds.add(i.productId);
      }
    }
  }

  const neverSoldProducts: any[] = [];
  for (const prod of products) {
    if (!allSoldProductIds.has(prod.id)) {
      const item: any = {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        category: prod.category || 'General',
        currentStock: prod.quantity,
        sellingPrice: prod.sellingPrice,
        createdAt: prod.createdAt,
      };
      if (canViewFinancials) {
        item.tiedUpCapital = Number(((prod.quantity || 0) * (prod.buyingPrice || 0)).toFixed(2));
      }
      neverSoldProducts.push(item);
    }
  }
  neverSoldProducts.sort((a, b) => (b.tiedUpCapital || b.currentStock) - (a.tiedUpCapital || a.currentStock));

  // 6. Category Breakdown
  const catMap = new Map<string, {
    count: number;
    units: number;
    lowCount: number;
    outCount: number;
    salesUnits: number;
    revenue: number;
    cost: number;
  }>();

  for (const p of products) {
    const cat = p.category || 'General';
    const entry = catMap.get(cat) || {
      count: 0,
      units: 0,
      lowCount: 0,
      outCount: 0,
      salesUnits: 0,
      revenue: 0,
      cost: 0,
    };
    entry.count += 1;
    entry.units += p.quantity || 0;
    const minStock = p.minStockLevel !== undefined ? p.minStockLevel : 5;
    if (p.quantity <= 0) entry.outCount += 1;
    else if (p.quantity <= minStock) entry.lowCount += 1;
    entry.cost += (p.quantity || 0) * (p.buyingPrice || 0);
    catMap.set(cat, entry);
  }

  for (const sale of filteredCompletedSales) {
    for (const item of sale.items) {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'General';
      const entry = catMap.get(cat);
      if (entry) {
        entry.salesUnits += Number(item.quantity) || 0;
        entry.revenue += Number(item.total !== undefined ? item.total : ((item as any).totalPrice || 0));
      }
    }
  }

  const categoryBreakdown: any[] = [];
  catMap.forEach((val, cat) => {
    const item: any = {
      category: cat,
      productCount: val.count,
      totalStockUnits: val.units,
      lowStockCount: val.lowCount,
      outOfStockCount: val.outCount,
      salesUnits: val.salesUnits,
      revenue: Number(val.revenue.toFixed(2)),
    };
    if (canViewFinancials) {
      item.inventoryCost = Number(val.cost.toFixed(2));
    }
    categoryBreakdown.push(item);
  });
  categoryBreakdown.sort((a, b) => b.totalStockUnits - a.totalStockUnits);

  // 7. Supplier Analytics
  const supplierBreakdown: any[] = [];
  for (const sup of suppliers) {
    const supProducts = products.filter((p) => p.supplierId === sup.id);
    const supPurchases = purchases.filter((p) => p.supplierId === sup.id);
    const totalPurchasedUnits = supPurchases.reduce(
      (sum, purch) => sum + purch.items.reduce((iSum, i) => iSum + i.quantity, 0),
      0
    );
    const lastPurch = [...supPurchases].sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    )[0];

    supplierBreakdown.push({
      supplierId: sup.id,
      supplierName: sup.name,
      productCount: supProducts.length,
      totalStockUnits: supProducts.reduce((sum, p) => sum + (p.quantity || 0), 0),
      totalPurchasesCount: supPurchases.length,
      totalPurchasedUnits,
      lastRestockDate: lastPurch ? (lastPurch.date || lastPurch.createdAt) : undefined,
    });
  }
  supplierBreakdown.sort((a, b) => b.totalStockUnits - a.totalStockUnits);

  // 8. Recent Stock Movements (latest 15)
  const recentMovements = movements.slice(0, 15);

  res.json({
    dateRange: {
      range: normalizedRange,
      startDate: fromDate,
      endDate: toDate,
      label,
    },
    overview,
    lowStockProducts: lowStockList,
    outOfStockProducts: outOfStockList,
    fastMovingProducts: fastMovingProducts.slice(0, 10),
    slowMovingProducts: {
      items: slowMovingItems.slice(0, 10),
      hasSufficientHistory,
      message: hasSufficientHistory
        ? undefined
        : 'Insufficient completed sales history for slow-moving velocity analysis.',
    },
    neverSoldProducts: neverSoldProducts.slice(0, 10),
    categoryBreakdown,
    supplierAnalytics: supplierBreakdown,
    recentMovements,
  });
});


// GET /api/products/:id/movements
app.get('/api/products/:id/movements', requireAuth, requirePermission('view_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const movements = db.getStockMovements(req.businessId, req.params.id);
  res.json(movements);
});

// GET /api/stock-movements
app.get('/api/stock-movements', requireAuth, requirePermission('view_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const movements = db.getStockMovements(req.businessId);
  res.json(movements);
});

// DELETE /api/products/:id
app.delete('/api/products/:id', requireAuth, requirePermission('manage_products'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const product = db.getProductById(id, req.businessId);
  const deleted = db.deleteProduct(id, req.businessId);

  if (!deleted) {
    return res.status(404).json({ error: 'Product not found or already deleted.' });
  }

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Product Deletion',
    details: `Deleted product "${product?.name || id}" (SKU: ${product?.sku || 'N/A'}).`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Product deleted successfully.' });
});

// Helper for profit and buying price visibility
function canUserViewProfit(user: any): boolean {
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

function sanitizeSaleForStaff(sale: any, canView: boolean) {
  if (canView || !sale) return sale;
  const { profit, ...safeSale } = sale;
  const safeItems = (safeSale.items || []).map((item: any) => {
    const { buyingPrice, profit: itemProfit, ...safeItem } = item;
    return safeItem;
  });
  return { ...safeSale, items: safeItems };
}

// ----------------------------------------------------
// 4. SALES & RECEIPT GENERATION ROUTES
// ----------------------------------------------------

// GET /api/sales
app.get('/api/sales', requireAuth, requirePermission('pos_sales'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  let sales = db.getSales(req.businessId);

  const { search, paymentMethod, customerId, startDate, endDate, staffId, locationId } = req.query;

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    sales = sales.filter(
      (s) =>
        s.receiptNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        (s.createdBy && s.createdBy.toLowerCase().includes(q))
    );
  }

  if (locationId && typeof locationId === 'string' && locationId !== 'All') {
    const defLoc = db.getDefaultLocation(req.businessId);
    sales = sales.filter((s) => (s.locationId || defLoc.id) === locationId);
  }

  if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'All') {
    sales = sales.filter((s) => s.paymentMethod === paymentMethod);
  }

  if (customerId && typeof customerId === 'string' && customerId !== 'All') {
    sales = sales.filter((s) => s.customerId === customerId);
  }

  if (staffId && typeof staffId === 'string' && staffId !== 'All') {
    sales = sales.filter((s) => s.createdBy === staffId);
  }

  if (startDate && typeof startDate === 'string') {
    sales = sales.filter((s) => getAccraDateString(s.createdAt) >= startDate);
  }

  if (endDate && typeof endDate === 'string') {
    sales = sales.filter((s) => getAccraDateString(s.createdAt) <= endDate);
  }

  const canView = canUserViewProfit(req.user);
  const sanitized = sales.map((s) => sanitizeSaleForStaff(s, canView));
  res.json(sanitized);
});

// GET /api/sales/:id
app.get('/api/sales/:id', requireAuth, (req: AuthenticatedRequest, res, next) => {
    // Allow users with pos_sales OR debtors OR customers permission, plus business_owner / admin
    if (
      req.user?.role === 'admin' ||
      req.user?.role === 'master_admin' ||
      req.user?.role === 'business_owner' ||
      req.user?.id === 'usr_admin_master' ||
      req.user?.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
      req.user?.permissions?.pos_sales === true ||
      req.user?.permissions?.debtors === true ||
      req.user?.permissions?.customers === true
    ) {
      return next();
    }
    return res.status(403).json({
      error: 'STAFF_PERMISSION_DENIED',
      message: 'You do not have permission to perform this action.',
      code: 'STAFF_PERMISSION_DENIED',
      permission: 'pos_sales',
      requiredPermission: 'pos_sales',
    });
  },
  (req: AuthenticatedRequest, res) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const sale = db.getSales(req.businessId).find((s) => s.id === req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale transaction not found.' });
    }

    const canView = canUserViewProfit(req.user);
    res.json(sanitizeSaleForStaff(sale, canView));
  }
);

// POST /api/sales/:id/cancel
app.post(
  '/api/sales/:id/cancel',
  requireAuth,
  (req: AuthenticatedRequest, res, next) => {
    if (
      req.user?.role === 'admin' ||
      req.user?.role === 'master_admin' ||
      req.user?.role === 'business_owner' ||
      req.user?.id === 'usr_admin_master' ||
      req.user?.email?.toLowerCase() === 'admin@businessmanagergh.com' ||
      req.user?.permissions?.pos_sales === true
    ) {
      return next();
    }
    return res.status(403).json({
      error: 'STAFF_PERMISSION_DENIED',
      message: 'You do not have permission to cancel sales.',
      code: 'STAFF_PERMISSION_DENIED',
    });
  },
  (req: AuthenticatedRequest, res) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

    const policyCheck = evaluateOperationalPolicy(req.businessId, req.user!, 'allowStaffSaleCancellation');
    if (!policyCheck.allowed) {
      recordSecurityEvent({
        businessId: req.businessId,
        userId: req.user?.id,
        userName: req.user?.fullName,
        type: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Staff attempted to cancel sale ${req.params.id} but staff sale cancellation is disabled by business operational policy.`,
        endpoint: `/api/sales/${req.params.id}/cancel`,
      });
      return res.status(403).json({
        error: policyCheck.code || 'POLICY_RESTRICTION',
        message: policyCheck.message || 'Staff sale cancellation is disabled by business operational policy.',
        code: policyCheck.code || 'POLICY_RESTRICTION',
      });
    }

    const sale = db.getSales(req.businessId).find((s) => s.id === req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale transaction not found.' });
    }
    if (sale.status === 'Cancelled') {
      return res.status(400).json({ error: 'Sale is already cancelled.' });
    }

    const { reason } = req.body || {};
    const cancelReason = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Customer return / cancellation';

    sale.status = 'Cancelled';

    // Restock products if present
    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (item.productId) {
          const product = db.getProducts(req.businessId).find((p) => p.id === item.productId);
          if (product) {
            product.quantity = (product.quantity || 0) + (item.quantity || 0);
          }
        }
      }
    }

    // Reverse loyalty points
    const { pointsReversed } = reverseSaleLoyaltyPoints(
      sale,
      req.user.id,
      req.user.fullName || req.user.email
    );

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      action: 'Sale Cancelled',
      details: `Sale ${sale.receiptNumber || sale.id} cancelled. Reason: ${cancelReason}. Reversed ${pointsReversed} loyalty points.`,
      ipAddress: req.ip,
    });

    const canView = canUserViewProfit(req.user);
    return res.json({
      success: true,
      message: 'Sale cancelled successfully.',
      sale: sanitizeSaleForStaff(sale, canView),
      pointsReversed,
    });
  }
);

// POST /api/sales
app.post('/api/sales', requireAuth, requirePermission('pos_sales'), (req: AuthenticatedRequest, res) => {
  console.log('[POS-403-TRACE] SERVER RECEIVED /api/sales');
  console.log('[POS-403-TRACE] businessId:', req.businessId);
  console.log('[POS-403-TRACE] authenticated user:', req.user?.id, req.user?.email, req.user?.role);
  console.log('[POS-403-TRACE] paymentMethod:', req.body?.paymentMethod);
  console.log('[POS-403-TRACE] amountPaid:', req.body?.amountPaid);
  console.log('[POS-403-TRACE] total:', req.body?.total);

  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const {
    customerId,
    customerName,
    customerPhone,
    items,
    discount,
    amountPaid,
    paymentMethod,
    notes,
    dueDate,
    locationId: bodyLocationId,
  } = req.body;

  const rawLocId = (bodyLocationId || req.headers['x-location-id'] || '').toString().trim();
  const defaultLoc = db.getDefaultLocation(req.businessId);
  const targetLocId = rawLocId || defaultLoc.id;

  const locationAccess = validateUserLocationAccess(req.user, targetLocId, req.businessId);
  if (!locationAccess.allowed) {
    console.log('[POS-403-SOURCE] tenant validation (location access denied)');
    return res.status(403).json({ error: locationAccess.reason || 'Unauthorized location access' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'A sale must have at least one product item in the cart.' });
  }

  // 1. Authoritative Product & Stock Validation against Business Inventory
  let totalCalculatedProfit = 0;
  const processedItems = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item || !item.productId) {
      return res.status(400).json({ error: `Item #${idx + 1} does not specify a valid product.` });
    }

    const prod = db.getProductById(String(item.productId), req.businessId);
    if (!prod) {
      return res.status(400).json({
        error: `Product "${item.productName || item.productId}" not found in your business inventory.`,
      });
    }

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error: `Invalid quantity for "${prod.name}". Quantity must be at least 1.`,
      });
    }

    // Check available stock
    if (prod.quantity <= 0) {
      return res.status(400).json({
        error: `"${prod.name}" is OUT OF STOCK (0 units available).`,
      });
    }

    if (qty > prod.quantity) {
      return res.status(400).json({
        error: `Cannot sell ${qty} units of "${prod.name}". Only ${prod.quantity} units available in stock.`,
      });
    }

    // Authoritative pricing from DB - do not trust frontend prices/costs
    const authoritativeBuyingPrice = prod.buyingPrice;
    const authoritativeSellingPrice = prod.sellingPrice;
    const itemTotal = authoritativeSellingPrice * qty;
    const itemProfit = (authoritativeSellingPrice - authoritativeBuyingPrice) * qty;
    totalCalculatedProfit += itemProfit;

    processedItems.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || '',
      buyingPrice: authoritativeBuyingPrice,
      sellingPrice: authoritativeSellingPrice,
      quantity: qty,
      total: itemTotal,
      profit: itemProfit,
    });
  }

  // 2. Authoritative Subtotal & Discount Calculation
  const finalSubtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

  const rawDiscount = discount !== undefined ? Number(discount) : 0;
  const finalDiscount = isNaN(rawDiscount) ? 0 : rawDiscount;

  if (finalDiscount < 0) {
    return res.status(400).json({ error: 'Discount cannot be negative.' });
  }

  if (finalDiscount > finalSubtotal) {
    return res.status(400).json({ error: 'Discount cannot be greater than the subtotal.' });
  }

  const finalTotal = Math.max(0, finalSubtotal - finalDiscount);
  const netSaleProfit = Math.max(0, totalCalculatedProfit - finalDiscount);

  // 3. Payment Method Validation
  const validPaymentMethods: PaymentMethod[] = ['Cash', 'Mobile Money', 'Bank Transfer', 'Card', 'Credit/Debt'];
  const finalPaymentMethod: PaymentMethod = validPaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : 'Cash';

  const finalAmountPaid =
    amountPaid !== undefined && amountPaid !== ''
      ? Math.max(0, Number(amountPaid) || 0)
      : (finalPaymentMethod === 'Credit/Debt' ? 0 : finalTotal);
  const balance = Math.max(0, finalTotal - finalAmountPaid);

  // 4. Credit / Debt Sale Validations (Skip if fully paid in cash/non-credit or amountPaid >= finalTotal)
  const isFullyPaid = finalAmountPaid >= finalTotal || balance <= 0.001;
  if ((balance > 0 || finalPaymentMethod === 'Credit/Debt') && !isFullyPaid) {
    const creditPolicyCheck = evaluateOperationalPolicy(req.businessId, req.user!, 'allowStaffCreditSales');
    if (!creditPolicyCheck.allowed) {
      console.log('[POS-403-SOURCE] staff credit policy');
      recordSecurityEvent({
        businessId: req.businessId,
        userId: req.user?.id,
        userName: req.user?.fullName,
        type: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Staff attempted credit sale of GH₵${balance.toFixed(2)} but staff credit sales are disabled by business operational policy.`,
        endpoint: '/api/sales',
      });
      return res.status(403).json({
        error: creditPolicyCheck.code || 'POLICY_RESTRICTION',
        message: creditPolicyCheck.message || 'Staff credit sales are disabled by business operational policy.',
        code: creditPolicyCheck.code || 'POLICY_RESTRICTION',
      });
    }

    const creditLimitCheck = checkStaffCreditLimit(req.businessId, req.user!, balance);
    if (!creditLimitCheck.allowed) {
      console.log('[POS-403-SOURCE] credit policy');
      recordSecurityEvent({
        businessId: req.businessId,
        userId: req.user?.id,
        userName: req.user?.fullName,
        type: 'POLICY_VIOLATION',
        severity: 'WARNING',
        description: `Staff credit sale amount (GH₵${balance.toFixed(2)}) exceeds maximum allowed staff credit limit of GH₵${creditLimitCheck.limitGhs}.`,
        endpoint: '/api/sales',
      });
      return res.status(403).json({
        error: creditLimitCheck.code,
        message: creditLimitCheck.message,
        code: creditLimitCheck.code,
        limitGhs: creditLimitCheck.limitGhs,
      });
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'A registered customer is required for credit/debt sales. Please select or add a customer.',
      });
    }

    const customer = db.getCustomerById(customerId, req.businessId);
    if (!customer) {
      return res.status(400).json({ error: 'Selected customer not found in your business directory.' });
    }

    if (customer.creditLimit && customer.creditLimit > 0) {
      const existingDebt = customer.currentDebt || 0;
      const availableCredit = Math.max(0, customer.creditLimit - existingDebt);
      if (balance > availableCredit && !req.body.overrideCreditLimit) {
        return res.status(400).json({
          error: `Credit limit exceeded. Customer credit limit is GH₵${customer.creditLimit.toFixed(2)}, current debt is GH₵${existingDebt.toFixed(2)}, available credit is GH₵${availableCredit.toFixed(2)}.`,
          availableCredit,
          creditLimit: customer.creditLimit,
          existingDebt,
        });
      }
    }
  }

  // 5. Customer identity
  let finalCustomerName = (customerName && String(customerName).trim()) || 'Walk-in Customer';
  let finalCustomerPhone = (customerPhone && String(customerPhone).trim()) || '';

  if (customerId) {
    const cust = db.getCustomerById(customerId, req.businessId);
    if (cust) {
      finalCustomerName = cust.name;
      finalCustomerPhone = cust.phone;
    }
  }

  // 6. Record Authoritative Sale in DB
  const sale = db.createSale({
    businessId: req.businessId,
    locationId: targetLocId,
    customerId: customerId || undefined,
    customerName: finalCustomerName,
    customerPhone: finalCustomerPhone,
    items: processedItems,
    subtotal: finalSubtotal,
    discount: finalDiscount,
    total: finalTotal,
    amountPaid: finalAmountPaid,
    balance,
    dueDate: (finalPaymentMethod === 'Credit/Debt' || balance > 0) && dueDate ? dueDate : undefined,
    profit: netSaleProfit,
    paymentMethod: finalPaymentMethod,
    notes: notes ? String(notes).trim() : undefined,
    status: 'Completed',
    createdBy: req.user.fullName || req.user.email,
    staffId: req.user.id,
    cashierName: req.user.fullName || req.user.email,
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Sale Creation',
    details: `Recorded sale ${sale.receiptNumber} totaling GH₵${sale.total.toFixed(2)} (${sale.paymentMethod}) for ${sale.customerName}.`,
    ipAddress: req.ip,
  });

  // Check if debt sale
  if (balance > 0) {
    db.createNotification({
      businessId: req.businessId,
      type: 'debt_overdue',
      title: 'New Debt Sale Recorded',
      message: `Customer ${sale.customerName} owes GH₵${balance.toFixed(2)} on receipt ${sale.receiptNumber}.`,
      link: '/debtors',
    });
  }

  // Stage 4N: Process loyalty points, milestones, and referrals
  try {
    processSaleLoyaltyPoints(sale, req.user.id, req.user.fullName || req.user.email);
  } catch (loyaltyErr) {
    console.error('[Loyalty] Error processing points for sale:', loyaltyErr);
  }

  const canView = canUserViewProfit(req.user);
  res.status(201).json(sanitizeSaleForStaff(sale, canView));
});

// ----------------------------------------------------
// 5. CUSTOMERS, INTELLIGENCE & DEBTORS ROUTES
// ----------------------------------------------------

// Helper to compute authoritative customer metrics and operational segmentation
function computeCustomerMetrics(
  c: Customer,
  allSales: Sale[],
  allPayments: CustomerPayment[],
  todayAccra: string,
  fromDate?: string,
  toDate?: string
) {
  const custSales = allSales.filter((s) => s.customerId === c.id && s.status !== 'Cancelled');
  const custPayments = allPayments.filter((p) => p.customerId === c.id);

  // Sort sales and payments descending by date
  const sortedSales = [...custSales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const sortedPayments = [...custPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalPurchases = sortedSales.reduce((sum, s) => sum + s.total, 0);
  const currentDebt = sortedSales.reduce((sum, s) => sum + (s.balance || 0), 0);
  const amountPaid = Math.max(0, totalPurchases - currentDebt);
  const creditLimit = Number(c.creditLimit) || 0;
  const availableCredit = Math.max(0, creditLimit - currentDebt);
  const transactionCount = sortedSales.length;
  const averageTransactionValue = transactionCount > 0 ? totalPurchases / transactionCount : 0;

  const lastSale = sortedSales[0];
  const lastPurchaseDate = lastSale ? lastSale.createdAt : undefined;
  const firstSale = sortedSales[sortedSales.length - 1];
  const firstPurchaseDate = firstSale ? firstSale.createdAt : undefined;

  let daysSinceLastPurchase = 0;
  if (lastPurchaseDate) {
    const lastDateStr = getAccraDateString(lastPurchaseDate);
    const d1 = new Date(lastDateStr + 'T00:00:00Z').getTime();
    const d2 = new Date(todayAccra + 'T00:00:00Z').getTime();
    daysSinceLastPurchase = Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
  } else if (c.createdAt) {
    const createdDateStr = getAccraDateString(c.createdAt);
    const d1 = new Date(createdDateStr + 'T00:00:00Z').getTime();
    const d2 = new Date(todayAccra + 'T00:00:00Z').getTime();
    daysSinceLastPurchase = Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  let periodSales = sortedSales;
  if (fromDate && toDate) {
    periodSales = sortedSales.filter((s) => {
      const d = getAccraDateString(s.createdAt);
      return d >= fromDate && d <= toDate;
    });
  }
  const periodPurchases = periodSales.reduce((sum, s) => sum + s.total, 0);
  const periodTxCount = periodSales.length;
  const unitsPurchased = periodSales.reduce(
    (uSum, s) => uSum + s.items.reduce((iSum, item) => iSum + (Number(item.quantity) || 0), 0),
    0
  );
  const allTimeUnitsPurchased = sortedSales.reduce(
    (uSum, s) => uSum + s.items.reduce((iSum, item) => iSum + (Number(item.quantity) || 0), 0),
    0
  );

  // Operational Segments
  const isCreditRisk = creditLimit > 0 && (currentDebt >= 0.8 * creditLimit || currentDebt > creditLimit);
  const isDebtor = currentDebt > 0;
  const isHighValue = totalPurchases >= 500;
  const isFrequent = transactionCount >= 3;
  const isActive = transactionCount > 0 && daysSinceLastPurchase <= 30;
  const isInactive = daysSinceLastPurchase > 30;

  let isNew = false;
  if (fromDate && toDate) {
    if (firstPurchaseDate) {
      const fpDate = getAccraDateString(firstPurchaseDate);
      isNew = fpDate >= fromDate && fpDate <= toDate;
    } else if (c.createdAt) {
      const cDate = getAccraDateString(c.createdAt);
      isNew = cDate >= fromDate && cDate <= toDate;
    }
  } else {
    if (c.createdAt) {
      const cDate = getAccraDateString(c.createdAt);
      const d1 = new Date(cDate + 'T00:00:00Z').getTime();
      const d2 = new Date(todayAccra + 'T00:00:00Z').getTime();
      const ageDays = Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
      isNew = ageDays <= 30;
    }
  }

  const segments: string[] = [];
  if (isNew) segments.push('New');
  if (isActive) segments.push('Active');
  if (isFrequent) segments.push('Frequent');
  if (isHighValue) segments.push('High Value');
  if (isInactive) segments.push('Inactive');
  if (isDebtor) segments.push('Debtor');
  if (isCreditRisk) segments.push('Credit Risk');

  const primarySegment = isCreditRisk
    ? 'Credit Risk'
    : isDebtor
    ? 'Debtor'
    : isHighValue
    ? 'High Value'
    : isFrequent
    ? 'Frequent'
    : isNew
    ? 'New'
    : isInactive
    ? 'Inactive'
    : 'Active';

  return {
    totalPurchases,
    amountPaid,
    currentDebt,
    creditLimit,
    availableCredit,
    salesCount: transactionCount,
    transactionCount,
    averageTransactionValue,
    firstPurchaseDate,
    lastPurchaseDate,
    lastTransactionDate: lastPurchaseDate,
    daysSinceLastPurchase,
    periodPurchases,
    periodTxCount,
    unitsPurchased,
    allTimeUnitsPurchased,
    segment: primarySegment,
    segments,
    sortedSales,
    sortedPayments,
  };
}

// GET /api/pos/customers
app.get('/api/pos/customers', requireAuth, requirePermission('pos_sales'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const rawCustomers = db.getCustomers(req.businessId);
  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);
  const todayAccra = getAccraToday();

  const enriched = rawCustomers.map((c) => {
    const metrics = computeCustomerMetrics(c, sales, payments, todayAccra);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      creditLimit: metrics.creditLimit,
      currentDebt: metrics.currentDebt,
      availableCredit: metrics.availableCredit,
    };
  });

  res.json(enriched);
});

// GET /api/customers
app.get('/api/customers', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const rawCustomers = db.getCustomers(req.businessId);
  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);
  const todayAccra = getAccraToday();

  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const segmentFilter = typeof req.query.segment === 'string' ? req.query.segment.trim().toLowerCase() : 'all';
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'name_asc';

  let enriched = rawCustomers.map((c) => {
    const metrics = computeCustomerMetrics(c, sales, payments, todayAccra);
    return {
      ...c,
      creditLimit: metrics.creditLimit,
      totalPurchases: metrics.totalPurchases,
      amountPaid: metrics.amountPaid,
      currentDebt: metrics.currentDebt,
      debtBalance: metrics.currentDebt,
      availableCredit: metrics.availableCredit,
      salesCount: metrics.transactionCount,
      transactionCount: metrics.transactionCount,
      averageTransactionValue: metrics.averageTransactionValue,
      firstPurchaseDate: metrics.firstPurchaseDate,
      lastPurchaseDate: metrics.lastPurchaseDate,
      lastTransactionDate: metrics.lastTransactionDate,
      daysSinceLastPurchase: metrics.daysSinceLastPurchase,
      segment: metrics.segment,
      segments: metrics.segments,
    };
  });

  // Search filter
  if (search) {
    enriched = enriched.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search)) ||
        (c.notes && c.notes.toLowerCase().includes(search)) ||
        c.id.toLowerCase().includes(search)
    );
  }

  // Segment filter
  if (segmentFilter && segmentFilter !== 'all') {
    enriched = enriched.filter((c) => {
      if (segmentFilter === 'active') return c.segments?.includes('Active');
      if (segmentFilter === 'new') return c.segments?.includes('New');
      if (segmentFilter === 'frequent') return c.segments?.includes('Frequent');
      if (segmentFilter === 'high_value' || segmentFilter === 'high-value') return c.segments?.includes('High Value');
      if (segmentFilter === 'inactive') return c.segments?.includes('Inactive');
      if (segmentFilter === 'debtor' || segmentFilter === 'debtors') return c.segments?.includes('Debtor');
      if (segmentFilter === 'credit_risk' || segmentFilter === 'credit-risk') return c.segments?.includes('Credit Risk');
      return true;
    });
  }

  // Sorting
  enriched.sort((a, b) => {
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    if (sortBy === 'debt_desc') return b.currentDebt - a.currentDebt;
    if (sortBy === 'purchases_desc') return b.totalPurchases - a.totalPurchases;
    if (sortBy === 'transactions_desc') return (b.transactionCount || 0) - (a.transactionCount || 0);
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'inactive_desc') return (b.daysSinceLastPurchase || 0) - (a.daysSinceLastPurchase || 0);
    return a.name.localeCompare(b.name);
  });

  res.json(enriched);
});

// GET /api/customers/intelligence
app.get('/api/customers/intelligence', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

  const range = typeof req.query.range === 'string' ? req.query.range : 'this_month';
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

  const resolvedRange = resolveAccraDateRange(range, startDate, endDate);
  const { fromDate, toDate, label, normalizedRange } = resolvedRange;

  const rawCustomers = db.getCustomers(req.businessId);
  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);
  const todayAccra = getAccraToday();

  let totalCustomerDebt = 0;
  let totalCustomerRevenue = 0;
  let totalCreditLimitExposure = 0;
  let debtorsCount = 0;
  let customersNearCreditLimit = 0;
  let customersExceedingCreditLimit = 0;
  let activeCustomersCount = 0;
  let newCustomersCount = 0;
  let frequentCustomersCount = 0;
  let inactiveCustomersCount = 0;

  let oldestOutstandingDebtDate: string | undefined = undefined;

  // Find earliest outstanding debt sale
  const unpaidSales = sales
    .filter((s) => (s.balance || 0) > 0 && s.status !== 'Cancelled')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (unpaidSales.length > 0) {
    oldestOutstandingDebtDate = unpaidSales[0].createdAt;
  }

  const customerItems: any[] = [];

  for (const c of rawCustomers) {
    const metrics = computeCustomerMetrics(c, sales, payments, todayAccra, fromDate, toDate);

    totalCustomerRevenue += metrics.totalPurchases;
    totalCustomerDebt += metrics.currentDebt;
    totalCreditLimitExposure += metrics.creditLimit;

    if (metrics.currentDebt > 0) debtorsCount++;
    if (metrics.creditLimit > 0 && metrics.currentDebt >= 0.8 * metrics.creditLimit && metrics.currentDebt <= metrics.creditLimit) {
      customersNearCreditLimit++;
    }
    if (metrics.creditLimit > 0 && metrics.currentDebt > metrics.creditLimit) {
      customersExceedingCreditLimit++;
    }

    if (metrics.segments.includes('Active')) activeCustomersCount++;
    if (metrics.segments.includes('New')) newCustomersCount++;
    if (metrics.segments.includes('Frequent')) frequentCustomersCount++;
    if (metrics.segments.includes('Inactive')) inactiveCustomersCount++;

    customerItems.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      totalPurchases: metrics.totalPurchases,
      periodPurchases: metrics.periodPurchases,
      transactionCount: metrics.transactionCount,
      periodTxCount: metrics.periodTxCount,
      unitsPurchased: metrics.unitsPurchased,
      allTimeUnitsPurchased: metrics.allTimeUnitsPurchased,
      averageTransactionValue: metrics.averageTransactionValue,
      firstPurchaseDate: metrics.firstPurchaseDate,
      lastPurchaseDate: metrics.lastPurchaseDate,
      daysSinceLastPurchase: metrics.daysSinceLastPurchase,
      currentDebt: metrics.currentDebt,
      creditLimit: metrics.creditLimit,
      availableCredit: metrics.availableCredit,
      segment: metrics.segment,
      segments: metrics.segments,
    });
  }

  const averageCustomerDebt = debtorsCount > 0 ? totalCustomerDebt / debtorsCount : 0;
  const averageCLV = rawCustomers.length > 0 ? totalCustomerRevenue / rawCustomers.length : 0;
  const creditUtilizationPercent =
    totalCreditLimitExposure > 0 ? (totalCustomerDebt / totalCreditLimitExposure) * 100 : 0;

  // Top Customers: ranked by period purchases, fall back to totalPurchases
  const topCustomers = [...customerItems]
    .sort((a, b) => (b.periodPurchases || b.totalPurchases) - (a.periodPurchases || a.totalPurchases))
    .slice(0, 10);

  // Frequent Customers: ranked by transactionCount
  const frequentCustomers = [...customerItems]
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 10);

  // Inactive Customers: daysSinceLastPurchase > 30, sorted descending
  const inactiveCustomers = [...customerItems]
    .filter((c) => c.daysSinceLastPurchase > 30)
    .sort((a, b) => b.daysSinceLastPurchase - a.daysSinceLastPurchase)
    .slice(0, 15);

  // Debtor Customers: currentDebt > 0, sorted descending
  const debtorCustomers = [...customerItems]
    .filter((c) => c.currentDebt > 0)
    .sort((a, b) => b.currentDebt - a.currentDebt);

  res.json({
    dateRange: {
      fromDate,
      toDate,
      label,
      range: normalizedRange,
    },
    summary: {
      totalCustomers: rawCustomers.length,
      totalCustomerRevenue,
      averageCLV,
      activeCustomersCount,
      newCustomersCount,
      frequentCustomersCount,
      inactiveCustomersCount,
      debtorsCount,
      totalCustomerDebt,
      averageCustomerDebt,
      totalCreditLimitExposure,
      creditUtilizationPercent,
      customersNearCreditLimit,
      customersExceedingCreditLimit,
      oldestOutstandingDebtDate,
    },
    topCustomers,
    frequentCustomers,
    inactiveCustomers,
    debtorCustomers,
    segmentsSummary: {
      total: rawCustomers.length,
      active: activeCustomersCount,
      new: newCustomersCount,
      frequent: frequentCustomersCount,
      highValue: customerItems.filter((c) => c.segments.includes('High Value')).length,
      inactive: inactiveCustomersCount,
      debtor: debtorsCount,
      creditRisk: customerItems.filter((c) => c.segments.includes('Credit Risk')).length,
      newCount: newCustomersCount,
      activeCount: activeCustomersCount,
      frequentCount: frequentCustomersCount,
      highValueCount: customerItems.filter((c) => c.segments.includes('High Value')).length,
      inactiveCount: inactiveCustomersCount,
      debtorCount: debtorsCount,
      creditRiskCount: customerItems.filter((c) => c.segments.includes('Credit Risk')).length,
    },
    // Ergonomic aliases for consumers
    overview: {
      totalCustomers: rawCustomers.length,
      totalCustomerRevenue,
      averageCLV,
      activeCustomersCount,
      newCustomersCount,
      frequentCustomersCount,
      inactiveCustomersCount,
      debtorsCount,
      totalCustomerDebt,
      averageCustomerDebt,
      totalCreditLimitExposure,
      creditUtilizationPercent,
      customersNearCreditLimit,
      customersExceedingCreditLimit,
      oldestOutstandingDebtDate,
    },
    segments: {
      total: rawCustomers.length,
      active: activeCustomersCount,
      new: newCustomersCount,
      frequent: frequentCustomersCount,
      highValue: customerItems.filter((c) => c.segments.includes('High Value')).length,
      inactive: inactiveCustomersCount,
      debtor: debtorsCount,
      creditRisk: customerItems.filter((c) => c.segments.includes('Credit Risk')).length,
      newCount: newCustomersCount,
      activeCount: activeCustomersCount,
      frequentCount: frequentCustomersCount,
      highValueCount: customerItems.filter((c) => c.segments.includes('High Value')).length,
      inactiveCount: inactiveCustomersCount,
      debtorCount: debtorsCount,
      creditRiskCount: customerItems.filter((c) => c.segments.includes('Credit Risk')).length,
    },
  });
});

// GET /api/customers/:id
app.get('/api/customers/:id', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const customer = db.getCustomerById(id, req.businessId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);
  const todayAccra = getAccraToday();
  const metrics = computeCustomerMetrics(customer, sales, payments, todayAccra);

  const canView = canUserViewProfit(req.user);
  const sanitizedSales = metrics.sortedSales.map((s) => sanitizeSaleForStaff(s, canView));
  const creditSales = metrics.sortedSales.filter(
    (s) => (s.balance || 0) > 0 || s.paymentMethod === 'Credit' || s.paymentMethod === 'Credit/Debt'
  );
  const sanitizedCreditSales = creditSales.map((s) => sanitizeSaleForStaff(s, canView));

  res.json({
    success: true,
    ...customer,
    creditLimit: metrics.creditLimit,
    totalPurchases: metrics.totalPurchases,
    amountPaid: metrics.amountPaid,
    currentDebt: metrics.currentDebt,
    debtBalance: metrics.currentDebt,
    availableCredit: metrics.availableCredit,
    salesCount: metrics.transactionCount,
    transactionCount: metrics.transactionCount,
    averageTransactionValue: metrics.averageTransactionValue,
    firstPurchaseDate: metrics.firstPurchaseDate,
    lastPurchaseDate: metrics.lastPurchaseDate,
    lastTransactionDate: metrics.lastTransactionDate,
    daysSinceLastPurchase: metrics.daysSinceLastPurchase,
    segment: metrics.segment,
    segments: metrics.segments,
    customer: {
      ...customer,
      creditLimit: metrics.creditLimit,
      totalPurchases: metrics.totalPurchases,
      amountPaid: metrics.amountPaid,
      currentDebt: metrics.currentDebt,
      availableCredit: metrics.availableCredit,
      salesCount: metrics.transactionCount,
      transactionCount: metrics.transactionCount,
      averageTransactionValue: metrics.averageTransactionValue,
      firstPurchaseDate: metrics.firstPurchaseDate,
      lastPurchaseDate: metrics.lastPurchaseDate,
      lastTransactionDate: metrics.lastTransactionDate,
      daysSinceLastPurchase: metrics.daysSinceLastPurchase,
      segment: metrics.segment,
      segments: metrics.segments,
    },
    sales: sanitizedSales,
    creditSales: sanitizedCreditSales,
    payments: metrics.sortedPayments,
  });
});

// POST /api/customers
app.post('/api/customers', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

  // Stage 4R: Check customer directory quota limit
  const isMasterAdmin =
    req.user?.role === 'master_admin' || req.user?.id === 'usr_admin_master';
  const customerLimitCheck = checkResourceLimit(req.businessId, 'customers', isMasterAdmin);
  if (!customerLimitCheck.allowed) {
    return res.status(403).json({
      error: customerLimitCheck.error,
      code: 'PLAN_LIMIT_REACHED',
      resource: 'customers',
      current: customerLimitCheck.current,
      max: customerLimitCheck.max,
    });
  }

  const { name, phone, email, address, notes, creditLimit, credit_limit } = req.body;

  if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
    return res.status(400).json({ error: 'Customer name and phone number are required.' });
  }

  // Duplicate phone check within the same business
  const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, '');
  const existingCustomers = db.getCustomers(req.businessId);
  const duplicate = existingCustomers.find(
    (c) => c.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone
  );
  if (duplicate) {
    return res.status(400).json({
      error: `A customer with phone number "${phone}" already exists in your directory ("${duplicate.name}").`,
    });
  }

  const rawCreditLimit = creditLimit !== undefined ? creditLimit : credit_limit;
  const parsedCreditLimit = rawCreditLimit !== undefined ? Number(rawCreditLimit) : 0;
  if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
    return res.status(400).json({ error: 'Credit limit cannot be negative.' });
  }

  const customer = db.addCustomer({
    businessId: req.businessId,
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim() : '',
    address: address ? String(address).trim() : '',
    creditLimit: parsedCreditLimit,
    notes: notes ? String(notes).trim() : '',
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Customer Creation',
    details: `Added customer "${customer.name}" (Phone: ${customer.phone}, Credit Limit: GH₵${(customer.creditLimit || 0).toFixed(2)}).`,
    ipAddress: req.ip,
  });

  res.status(201).json(customer);
});

// PUT /api/customers/:id
app.put('/api/customers/:id', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const { name, phone, email, address, notes, creditLimit, credit_limit } = req.body;

  const updates: Partial<Customer> = {};
  if (name !== undefined) {
    if (!String(name).trim()) {
      return res.status(400).json({ error: 'Customer name cannot be empty.' });
    }
    updates.name = String(name).trim();
  }

  if (phone !== undefined) {
    if (!String(phone).trim()) {
      return res.status(400).json({ error: 'Phone number cannot be empty.' });
    }
    const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, '');
    const existingCustomers = db.getCustomers(req.businessId);
    const duplicate = existingCustomers.find(
      (c) => c.id !== id && c.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone
    );
    if (duplicate) {
      return res.status(400).json({
        error: `Another customer with phone number "${phone}" already exists ("${duplicate.name}").`,
      });
    }
    updates.phone = String(phone).trim();
  }

  if (email !== undefined) updates.email = String(email).trim();
  if (address !== undefined) updates.address = String(address).trim();
  if (notes !== undefined) updates.notes = String(notes).trim();

  const rawCreditLimit = creditLimit !== undefined ? creditLimit : credit_limit;
  if (rawCreditLimit !== undefined) {
    const parsed = Number(rawCreditLimit);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'Credit limit cannot be negative.' });
    }
    updates.creditLimit = parsed;
  }

  const updated = db.updateCustomer(id, req.businessId, updates);
  if (!updated) return res.status(404).json({ error: 'Customer not found' });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Customer Update',
    details: `Updated customer "${updated.name}" (Phone: ${updated.phone}).`,
    ipAddress: req.ip,
  });

  res.json(updated);
});

// POST /api/customers/:id/notes
app.post('/api/customers/:id/notes', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const { note } = req.body;

  if (!note || !String(note).trim()) {
    return res.status(400).json({ error: 'Note content cannot be empty.' });
  }

  const customer = db.getCustomerById(id, req.businessId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const cleanNote = String(note).trim();
  const timestamp = getAccraToday();
  const author = req.user.fullName || 'Staff';
  const entry = `[${timestamp} - ${author}]: ${cleanNote}`;
  const updatedNotes = customer.notes ? `${customer.notes}\n${entry}` : entry;

  const updated = db.updateCustomer(id, req.businessId, { notes: updatedNotes });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Customer Note Added',
    details: `Added note to customer "${customer.name}".`,
    ipAddress: req.ip,
  });

  res.json({ success: true, customer: updated, notes: updatedNotes });
});

// DELETE /api/customers/:id
app.delete('/api/customers/:id', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const cust = db.getCustomerById(id, req.businessId);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });

  // Outstanding debt check
  const sales = db.getSales(req.businessId).filter((s) => s.customerId === id);
  const currentDebt = sales.reduce((sum, s) => sum + (s.balance || 0), 0);
  if (currentDebt > 0) {
    return res.status(400).json({
      error: `Cannot delete customer "${cust.name}" because they have an active outstanding debt of GH₵${currentDebt.toFixed(2)}. Please settle or clear the debt first.`,
    });
  }

  const deleted = db.deleteCustomer(id, req.businessId);
  if (!deleted) return res.status(404).json({ error: 'Customer not found' });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Customer Deletion',
    details: `Removed customer "${cust.name}" (ID: ${id}).`,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Customer removed successfully.' });
});

// GET /api/customers/:id/statement
app.get('/api/customers/:id/statement', requireAuth, requireFeature('customers'), requirePermission('customers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const customer = db.getCustomerById(id, req.businessId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);
  const todayAccra = getAccraToday();
  const metrics = computeCustomerMetrics(customer, sales, payments, todayAccra);

  // Protect sensitive financial profit fields for staff without financial_reports permission
  const canView = canUserViewProfit(req.user);
  const sanitizedSales = metrics.sortedSales.map((s) => sanitizeSaleForStaff(s, canView));

  res.json({
    customer: {
      ...customer,
      creditLimit: metrics.creditLimit,
      totalPurchases: metrics.totalPurchases,
      amountPaid: metrics.amountPaid,
      currentDebt: metrics.currentDebt,
      availableCredit: metrics.availableCredit,
      salesCount: metrics.transactionCount,
      transactionCount: metrics.transactionCount,
      averageTransactionValue: metrics.averageTransactionValue,
      firstPurchaseDate: metrics.firstPurchaseDate,
      lastPurchaseDate: metrics.lastPurchaseDate,
      daysSinceLastPurchase: metrics.daysSinceLastPurchase,
      segment: metrics.segment,
      segments: metrics.segments,
    },
    sales: sanitizedSales,
    payments: metrics.sortedPayments,
    totalPurchases: metrics.totalPurchases,
    totalPaid: metrics.amountPaid,
    currentDebt: metrics.currentDebt,
    availableCredit: metrics.availableCredit,
    lastPurchaseDate: metrics.lastPurchaseDate,
    firstPurchaseDate: metrics.firstPurchaseDate,
    averageTransactionValue: metrics.averageTransactionValue,
    daysSinceLastPurchase: metrics.daysSinceLastPurchase,
    segment: metrics.segment,
    segments: metrics.segments,
  });
});

// GET /api/debtors
app.get('/api/debtors', requireAuth, requireFeature('debtors'), requirePermission('debtors'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const customers = db.getCustomers(req.businessId);
  const sales = db.getSales(req.businessId);
  const payments = db.getCustomerPayments(req.businessId);

  // Return all customers who have credit sales or current debt > 0
  const debtors = [];
  const todayAccra = getAccraToday();

  for (const c of customers) {
    const custSales = sales.filter((s) => s.customerId === c.id);
    const custPayments = payments.filter((p) => p.customerId === c.id);

    const creditSales = custSales.filter((s) => s.paymentMethod === 'Credit/Debt' || s.paymentMethod === 'Credit' || s.balance > 0);
    const totalPurchases = custSales.reduce((sum, s) => sum + s.total, 0);
    const totalCreditSales = creditSales.reduce((sum, s) => sum + s.total, 0);
    const amountOwed = custSales.reduce((sum, s) => sum + s.balance, 0);
    const totalPaid = Math.max(0, totalPurchases - amountOwed);

    // If customer has credit sales OR has amountOwed > 0, include them in the debtors ledger
    if (creditSales.length > 0 || amountOwed > 0) {
      const latestCreditSale = creditSales[0]; // sales are unshifted so index 0 is latest
      const latestPayment = custPayments[0]; // payments are unshifted so index 0 is latest

      const dueDate = latestCreditSale?.dueDate || undefined;

      let isOverdue = false;
      let daysOverdue = 0;
      if (dueDate && amountOwed > 0) {
        if (todayAccra > dueDate) {
          isOverdue = true;
          const dueTime = new Date(dueDate + 'T00:00:00Z').getTime();
          const todayTime = new Date(todayAccra + 'T00:00:00Z').getTime();
          daysOverdue = Math.max(0, Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24)));
        }
      }

      let status: 'Outstanding' | 'Partially Paid' | 'Overdue' | 'Paid' = 'Outstanding';
      if (amountOwed <= 0) {
        status = 'Paid';
      } else if (isOverdue) {
        status = 'Overdue';
      } else if (totalPaid > 0) {
        status = 'Partially Paid';
      } else {
        status = 'Outstanding';
      }

      const creditLimit = c.creditLimit || 0;
      const availableCredit = Math.max(0, creditLimit - amountOwed);

      debtors.push({
        customer: {
          ...c,
          totalPurchases,
          amountPaid: totalPaid,
          currentDebt: amountOwed,
          availableCredit,
        },
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        totalCreditSales,
        totalPaid,
        amountOwed,
        creditLimit,
        availableCredit,
        lastCreditSaleDate: latestCreditSale?.createdAt,
        lastCreditSaleReceipt: latestCreditSale?.receiptNumber,
        lastPaymentDate: latestPayment?.date || latestPayment?.createdAt,
        lastPaymentAmount: latestPayment?.amount,
        dueDate,
        daysOverdue,
        status,
        salesCount: creditSales.length,
      });
    }
  }

  res.json(debtors);
});

// GET /api/debtors/:id
app.get('/api/debtors/:id', requireAuth, requireFeature('debtors'), requirePermission('debtors'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const customer = db.getCustomerById(id, req.businessId);
  if (!customer) return res.status(404).json({ error: 'Debtor customer not found.' });

  const sales = db.getSales(req.businessId).filter((s) => s.customerId === id);
  const payments = db.getCustomerPayments(req.businessId).filter((p) => p.customerId === id);

  const creditSales = sales.filter((s) => s.paymentMethod === 'Credit/Debt' || s.paymentMethod === 'Credit' || s.balance > 0);
  const totalPurchases = sales.reduce((sum, s) => sum + s.total, 0);
  const totalCreditSales = creditSales.reduce((sum, s) => sum + s.total, 0);
  const amountOwed = sales.reduce((sum, s) => sum + s.balance, 0);
  const totalPaid = Math.max(0, totalPurchases - amountOwed);

  const latestCreditSale = creditSales[0];
  const latestPayment = payments[0];
  const dueDate = latestCreditSale?.dueDate || undefined;

  const todayAccra = getAccraToday();
  let isOverdue = false;
  let daysOverdue = 0;
  if (dueDate && amountOwed > 0) {
    if (todayAccra > dueDate) {
      isOverdue = true;
      const dueTime = new Date(dueDate + 'T00:00:00Z').getTime();
      const todayTime = new Date(todayAccra + 'T00:00:00Z').getTime();
      daysOverdue = Math.max(0, Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24)));
    }
  }

  let status: 'Outstanding' | 'Partially Paid' | 'Overdue' | 'Paid' = 'Outstanding';
  if (amountOwed <= 0) {
    status = 'Paid';
  } else if (isOverdue) {
    status = 'Overdue';
  } else if (totalPaid > 0) {
    status = 'Partially Paid';
  } else {
    status = 'Outstanding';
  }

  const creditLimit = customer.creditLimit || 0;
  const availableCredit = Math.max(0, creditLimit - amountOwed);

  const canView = canUserViewProfit(req.user);
  const sanitizedSales = sales.map((s) => sanitizeSaleForStaff(s, canView));
  const sanitizedCreditSales = creditSales.map((s) => sanitizeSaleForStaff(s, canView));

  const debtorData = {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    totalCreditSales,
    totalPaid,
    amountOwed,
    creditLimit,
    availableCredit,
    lastCreditSaleDate: latestCreditSale?.createdAt,
    lastCreditSaleReceipt: latestCreditSale?.receiptNumber,
    lastPaymentDate: latestPayment?.date || latestPayment?.createdAt,
    lastPaymentAmount: latestPayment?.amount,
    dueDate,
    daysOverdue,
    status,
    salesCount: creditSales.length,
  };

  res.json({
    success: true,
    customer: {
      ...customer,
      totalPurchases,
      amountPaid: totalPaid,
      currentDebt: amountOwed,
      availableCredit,
    },
    debtor: debtorData,
    ...debtorData,
    sales: sanitizedSales,
    creditSales: sanitizedCreditSales,
    payments,
  });
});

// Shared debt payment processing function
function processDebtPayment(
  req: AuthenticatedRequest,
  res: any,
  customerIdParam?: string
) {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const customerId = customerIdParam || req.body.customerId;
  const { saleId, amount, paymentMethod, reference, notes, date } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer is required for recording debt payment.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than GH₵0.00.' });
  }

  const customer = db.getCustomerById(customerId, req.businessId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found in your directory.' });
  }

  // Calculate current exact debt directly from sales balances
  const custSales = db.getSales(req.businessId).filter((s) => s.customerId === customerId);
  const currentDebt = custSales.reduce((sum, s) => sum + s.balance, 0);

  if (currentDebt <= 0) {
    return res.status(400).json({ error: 'This customer has no outstanding debt balance to settle.' });
  }

  if (numAmount > currentDebt) {
    return res.status(400).json({
      error: `Payment amount (GH₵${numAmount.toFixed(2)}) cannot exceed outstanding debt of GH₵${currentDebt.toFixed(2)}.`,
    });
  }

  const paymentDate = getAccraDateString(date);

  const payment = db.recordCustomerPayment({
    businessId: req.businessId,
    customerId,
    customerName: customer.name,
    saleId,
    amount: numAmount,
    paymentMethod: (paymentMethod as PaymentMethod) || 'Cash',
    paymentDate,
    date: paymentDate,
    reference: reference || '',
    notes: notes || '',
    createdBy: req.user.fullName || req.user.email,
  });

  const remainingBalance = Math.max(0, currentDebt - numAmount);
  const business = db.getBusiness(req.businessId);

  const receipt = {
    paymentNumber: payment.paymentNumber || payment.id,
    date: payment.createdAt,
    businessName: business?.name || 'Business Manager GH',
    businessPhone: business?.phone || '',
    businessLocation: business?.location || '',
    customerName: customer.name,
    customerPhone: customer.phone || '',
    originalDebt: currentDebt,
    paymentAmount: numAmount,
    paymentMethod: payment.paymentMethod,
    remainingBalance,
    reference: payment.reference,
    notes: payment.notes,
    cashier: req.user.fullName || 'Cashier',
  };

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Customer Payment',
    details: `Recorded debt repayment of GH₵${numAmount.toFixed(2)} (${payment.paymentMethod}) for customer "${customer.name}". Balance: GH₵${remainingBalance.toFixed(2)}. Receipt #${receipt.paymentNumber}`,
    ipAddress: req.ip,
  });

  return res.status(200).json({
    success: true,
    payment,
    receipt,
    customer: {
      ...customer,
      currentDebt: remainingBalance,
      amountPaid: (customer.amountPaid || 0) + numAmount,
      availableCredit: Math.max(0, (customer.creditLimit || 0) - remainingBalance),
    },
    originalDebt: currentDebt,
    paymentAmount: numAmount,
    amountPaid: numAmount,
    remainingBalance,
    remainingDebt: remainingBalance,
  });
}

// POST /api/debtors/payment
app.post('/api/debtors/payment', requireAuth, requireFeature('debtors'), requirePermission('debtors'), (req: AuthenticatedRequest, res) => {
  return processDebtPayment(req, res);
});

// POST /api/customers/:id/payment (Direct debt payment for customer)
app.post(
  '/api/customers/:id/payment',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res) => {
    return processDebtPayment(req, res, req.params.id);
  }
);

// POST /api/customers/:id/payments (Plural alias)
app.post(
  '/api/customers/:id/payments',
  requireAuth,
  requireFeature('customers'),
  requirePermission('customers'),
  (req: AuthenticatedRequest, res) => {
    return processDebtPayment(req, res, req.params.id);
  }
);

// POST /api/debtors/:id/pay (Direct debt payment alias for debtor)
app.post(
  '/api/debtors/:id/pay',
  requireAuth,
  requireFeature('debtors'),
  requirePermission('debtors'),
  (req: AuthenticatedRequest, res) => {
    return processDebtPayment(req, res, req.params.id);
  }
);

// ----------------------------------------------------
// 6. EXPENSES ROUTES
// ----------------------------------------------------

// GET /api/expenses
app.get('/api/expenses', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  let expenses = db.getExpenses(req.businessId);

  const { category, paymentMethod, startDate, endDate, search } = req.query as {
    category?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };

  if (category && category !== 'All') {
    expenses = expenses.filter((e) => e.category === category);
  }

  if (paymentMethod && paymentMethod !== 'All') {
    expenses = expenses.filter((e) => e.paymentMethod === paymentMethod);
  }

  if (startDate) {
    const startStr = getAccraDateString(startDate);
    expenses = expenses.filter((e) => getAccraDateString(e.date) >= startStr);
  }

  if (endDate) {
    const endStr = getAccraDateString(endDate);
    expenses = expenses.filter((e) => getAccraDateString(e.date) <= endStr);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    expenses = expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.reference && e.reference.toLowerCase().includes(q))
    );
  }

  res.json(expenses);
});

// GET /api/expenses/summary
app.get('/api/expenses/summary', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const expenses = db.getExpenses(req.businessId);
  const todayStr = getAccraToday();

  const todayTotal = expenses
    .filter((e) => getAccraDateString(e.date) === todayStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const categoryMap: Record<string, number> = {};
  for (const exp of expenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + (Number(exp.amount) || 0);
  }

  res.json({
    todayTotal,
    totalAmount,
    count: expenses.length,
    byCategory: categoryMap,
  });
});

// GET /api/expenses/:id
app.get('/api/expenses/:id', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const expense = db.getExpenseById(id, req.businessId);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  res.json(expense);
});

// POST /api/expenses
app.post('/api/expenses', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { title, category, amount, date, paymentMethod, description, reference, locationId } = req.body;

  const resolvedTitle = title && typeof title === 'string' && title.trim()
    ? title.trim()
    : description && typeof description === 'string' && description.trim()
    ? description.trim()
    : '';

  if (!resolvedTitle) {
    return res.status(400).json({ error: 'Expense title is required.' });
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'Expense category is required.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Expense amount must be a positive number greater than zero.' });
  }

  const expenseDate = getAccraDateString(date || getAccraToday());

  let finalLocationId = locationId ? String(locationId).trim() : undefined;
  let finalLocationName: string | undefined;

  if (finalLocationId) {
    const loc = db.getLocationById(finalLocationId, req.businessId);
    if (loc) {
      finalLocationName = loc.name;
    } else {
      finalLocationId = undefined;
    }
  }

  if (!finalLocationId) {
    const defLoc = db.getDefaultLocation(req.businessId);
    if (defLoc) {
      finalLocationId = defLoc.id;
      finalLocationName = defLoc.name;
    }
  }

  const expense = db.addExpense({
    businessId: req.businessId,
    title: resolvedTitle,
    category: category.trim() as any,
    amount: numAmount,
    date: expenseDate,
    paymentMethod: (paymentMethod as PaymentMethod) || 'Cash',
    description: description ? String(description).trim() : '',
    reference: reference ? String(reference).trim() : undefined,
    createdBy: req.user.fullName || req.user.email,
    locationId: finalLocationId,
    locationName: finalLocationName,
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Expense Creation',
    details: `Added expense "${expense.title}" [${expense.category}] of GH₵${expense.amount.toFixed(2)}.`,
    ipAddress: req.ip,
  });

  res.status(201).json(expense);
});

// PUT /api/expenses/:id
app.put('/api/expenses/:id', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const existing = db.getExpenseById(id, req.businessId);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const updates: Partial<any> = {};
  if (req.body.title !== undefined) {
    if (!req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ error: 'Expense title cannot be empty.' });
    }
    updates.title = String(req.body.title).trim();
  }
  if (req.body.category !== undefined) {
    updates.category = req.body.category;
  }
  if (req.body.amount !== undefined) {
    const num = Number(req.body.amount);
    if (isNaN(num) || num <= 0) {
      return res.status(400).json({ error: 'Expense amount must be a positive number greater than zero.' });
    }
    updates.amount = num;
  }
  if (req.body.date !== undefined) {
    updates.date = getAccraDateString(req.body.date);
  }
  if (req.body.paymentMethod !== undefined) {
    updates.paymentMethod = req.body.paymentMethod;
  }
  if (req.body.description !== undefined) {
    updates.description = String(req.body.description).trim();
  }
  if (req.body.reference !== undefined) {
    updates.reference = String(req.body.reference).trim();
  }

  const updated = db.updateExpense(id, req.businessId, updates);

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Expense Update',
    details: `Updated expense "${existing.title}".`,
    ipAddress: req.ip,
  });

  res.json(updated);
});

// DELETE /api/expenses/:id
app.delete('/api/expenses/:id', requireAuth, requireFeature('expenses'), requirePermission('expenses'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const existing = db.getExpenseById(id, req.businessId);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const deleted = db.deleteExpense(id, req.businessId);
  if (!deleted) return res.status(404).json({ error: 'Expense not found' });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Expense Deletion',
    details: `Deleted expense "${existing.title}" of GH₵${existing.amount.toFixed(2)}.`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Expense deleted.' });
});

// ----------------------------------------------------
// 7. SUPPLIERS & PURCHASES ROUTES
// ----------------------------------------------------

function sanitizePurchaseForStaff(purchase: any, canView: boolean) {
  if (canView || !purchase) return purchase;
  const safeItems = (purchase.items || []).map((item: any) => {
    const { buyingPrice, total, ...safeItem } = item;
    return safeItem;
  });
  const { totalAmount, ...safePurchase } = purchase;
  return { ...safePurchase, items: safeItems };
}

// GET /api/suppliers
app.get('/api/suppliers', requireAuth, requireFeature('suppliers'), requirePermission('suppliers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  let suppliers = db.getSuppliers(req.businessId);
  const purchases = db.getPurchases(req.businessId);

  const { search } = req.query as { search?: string };
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    suppliers = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }

  const canViewFinancials = canUserViewProfit(req.user);
  const enriched = suppliers.map((sup) => {
    const supPurchases = purchases.filter((p) => p.supplierId === sup.id);
    const totalPurchases = supPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    return {
      ...sup,
      totalPurchases: canViewFinancials ? totalPurchases : undefined,
      purchaseCount: supPurchases.length,
    };
  });

  res.json(enriched);
});

// GET /api/suppliers/:id
app.get('/api/suppliers/:id', requireAuth, requireFeature('suppliers'), requirePermission('suppliers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const supplier = db.getSupplierById(id, req.businessId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const allPurchases = db.getPurchases(req.businessId).filter((p) => p.supplierId === supplier.id);
  const canViewFinancials = canUserViewProfit(req.user);
  const sanitizedPurchases = allPurchases.map((p) => sanitizePurchaseForStaff(p, canViewFinancials));
  const totalPurchases = allPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const suppliedProductIds = new Set<string>();
  allPurchases.forEach((p) => {
    (p.items || []).forEach((it) => {
      if (it.productId) suppliedProductIds.add(it.productId);
    });
  });

  res.json({
    supplier: {
      ...supplier,
      totalPurchases: canViewFinancials ? totalPurchases : undefined,
      purchaseCount: allPurchases.length,
    },
    purchases: sanitizedPurchases,
    totalPurchases: canViewFinancials ? totalPurchases : undefined,
    productsSuppliedCount: suppliedProductIds.size,
  });
});

// POST /api/suppliers
app.post('/api/suppliers', requireAuth, requireFeature('suppliers'), requirePermission('suppliers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { name, phone, email, address, notes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required.' });
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Supplier phone number is required.' });
  }

  const supplier = db.addSupplier({
    businessId: req.businessId,
    name: name.trim(),
    phone: phone.trim(),
    email: email ? String(email).trim() : undefined,
    address: address ? String(address).trim() : undefined,
    notes: notes ? String(notes).trim() : undefined,
    status: 'Active',
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Supplier Creation',
    details: `Created supplier "${supplier.name}" (${supplier.phone}).`,
    ipAddress: req.ip,
  });

  res.status(201).json(supplier);
});

// PUT /api/suppliers/:id
app.put('/api/suppliers/:id', requireAuth, requireFeature('suppliers'), requirePermission('suppliers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const existing = db.getSupplierById(id, req.businessId);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });

  const updates: Partial<Supplier> = {};
  if (req.body.name !== undefined) {
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ error: 'Supplier name cannot be empty.' });
    }
    updates.name = String(req.body.name).trim();
  }
  if (req.body.phone !== undefined) {
    if (!req.body.phone || !String(req.body.phone).trim()) {
      return res.status(400).json({ error: 'Supplier phone cannot be empty.' });
    }
    updates.phone = String(req.body.phone).trim();
  }
  if (req.body.email !== undefined) updates.email = String(req.body.email).trim() || undefined;
  if (req.body.address !== undefined) updates.address = String(req.body.address).trim() || undefined;
  if (req.body.notes !== undefined) updates.notes = String(req.body.notes).trim() || undefined;
  if (req.body.status !== undefined) updates.status = req.body.status;

  const updated = db.updateSupplier(id, req.businessId, updates);

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Supplier Update',
    details: `Updated supplier "${existing.name}".`,
    ipAddress: req.ip,
  });

  res.json(updated);
});

// DELETE /api/suppliers/:id
app.delete('/api/suppliers/:id', requireAuth, requireFeature('suppliers'), requirePermission('suppliers'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const existing = db.getSupplierById(id, req.businessId);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });

  const deleted = db.deleteSupplier(id, req.businessId);
  if (!deleted) return res.status(404).json({ error: 'Supplier not found' });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Supplier Deletion',
    details: `Deleted supplier "${existing.name}".`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Supplier deleted.' });
});

// GET /api/purchases
app.get('/api/purchases', requireAuth, requireFeature('purchases'), requirePermission('purchases'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  let purchases = db.getPurchases(req.businessId);

  const { supplierId, startDate, endDate, search } = req.query as {
    supplierId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };

  if (supplierId) {
    purchases = purchases.filter((p) => p.supplierId === supplierId);
  }

  if (startDate) {
    const startStr = getAccraDateString(startDate);
    purchases = purchases.filter((p) => getAccraDateString(p.purchaseDate || p.date || p.createdAt) >= startStr);
  }

  if (endDate) {
    const endStr = getAccraDateString(endDate);
    purchases = purchases.filter((p) => getAccraDateString(p.purchaseDate || p.date || p.createdAt) <= endStr);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    purchases = purchases.filter(
      (p) =>
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.items || []).some((it) => it.productName && it.productName.toLowerCase().includes(q))
    );
  }

  const canViewFinancials = canUserViewProfit(req.user);
  const sanitized = purchases.map((p) => sanitizePurchaseForStaff(p, canViewFinancials));
  res.json(sanitized);
});

// GET /api/purchases/:id
app.get('/api/purchases/:id', requireAuth, requireFeature('purchases'), requirePermission('purchases'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const purchase = db.getPurchaseById(id, req.businessId);
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  const canViewFinancials = canUserViewProfit(req.user);
  res.json(sanitizePurchaseForStaff(purchase, canViewFinancials));
});

// POST /api/purchases
app.post('/api/purchases', requireAuth, requireFeature('purchases'), requirePermission('purchases'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const {
    supplierId,
    supplierName,
    items,
    totalAmount,
    date,
    notes,
    invoiceNumber,
    idempotencyKey,
    paymentMethod,
    paymentStatus,
  } = req.body;

  // 1. Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one product item is required for purchase.' });
  }

  // 2. Validate supplier if provided
  let authoritativeSupplierName = supplierName || 'Direct Stock-In';
  if (supplierId) {
    const supplier = db.getSupplierById(supplierId, req.businessId);
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found in your business.' });
    }
    authoritativeSupplierName = supplier.name;
  }

  // 3. Check for duplicate submission / idempotency
  if (idempotencyKey) {
    const existing = db.getPurchases(req.businessId).find((p) => p.idempotencyKey === idempotencyKey);
    if (existing) {
      const canView = canUserViewProfit(req.user);
      return res.status(200).json(sanitizePurchaseForStaff(existing, canView));
    }
  }

  // 4. Validate each item and calculate authoritative item costs
  const processedItems: any[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it || !it.productId) {
      return res.status(400).json({ error: `Item ${idx + 1} is missing a valid product ID.` });
    }

    const prod = db.getProductById(String(it.productId), req.businessId);
    if (!prod) {
      return res.status(400).json({
        error: `Product not found in your business inventory (ID: ${it.productId}). Cross-business stock manipulation is forbidden.`,
      });
    }

    const qty = Number(it.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error: `Invalid quantity for product "${prod.name}". Quantity must be a positive number greater than zero.`,
      });
    }

    let unitCost: number;
    if (it.buyingPrice !== undefined && it.buyingPrice !== null) {
      const bp = Number(it.buyingPrice);
      if (isNaN(bp) || bp < 0) {
        return res.status(400).json({ error: `Invalid buying price for product "${prod.name}". Buying price cannot be negative.` });
      }
      unitCost = bp;
    } else {
      unitCost = prod.buyingPrice;
    }

    processedItems.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || '',
      quantity: qty,
      buyingPrice: unitCost,
      total: qty * unitCost,
    });
  }

  // 5. Server-authoritative total
  const authoritativeTotal = processedItems.reduce((sum, it) => sum + it.total, 0);

  // 6. Africa/Accra purchase date
  const purchaseDate = getAccraDateString(date || getAccraToday());

  // 7. Record purchase (automatically increments product quantity and creates stock movements)
  const purchase = db.recordPurchase({
    businessId: req.businessId,
    supplierId: supplierId || undefined,
    supplierName: authoritativeSupplierName,
    invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
    items: processedItems,
    totalAmount: authoritativeTotal,
    purchaseDate,
    date: purchaseDate,
    paymentStatus: paymentStatus || 'Paid',
    paymentMethod: paymentMethod || 'Cash',
    idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined,
    createdBy: req.user.fullName || req.user.email,
    notes: notes ? String(notes).trim() : undefined,
  });

  // 8. Audit logging
  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Stock-In Purchase',
    details: `Recorded stock-in purchase from "${purchase.supplierName}" totaling GH₵${authoritativeTotal.toFixed(2)} (${processedItems.length} product(s)).`,
    ipAddress: req.ip,
  });

  const canViewFinancials = canUserViewProfit(req.user);
  res.status(201).json(sanitizePurchaseForStaff(purchase, canViewFinancials));
});

// ----------------------------------------------------
// 8. INVOICES ROUTES
// ----------------------------------------------------

// GET /api/invoices
app.get('/api/invoices', requireAuth, requireFeature('invoices'), requirePermission('invoices'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const invoices = db.getInvoices(req.businessId);
  res.json(invoices);
});

// POST /api/invoices
app.post('/api/invoices', requireAuth, requireFeature('invoices'), requirePermission('invoices'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const {
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    items,
    subtotal,
    discount,
    total,
    amountPaid,
    issueDate,
    dueDate,
    status,
    notes,
  } = req.body;

  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const rawItems = Array.isArray(items) ? items : [];
  const processedItems = rawItems
    .filter((i: any) => i && i.description && String(i.description).trim() && Number(i.unitPrice) > 0)
    .map((i: any) => {
      const q = Math.max(1, Number(i.quantity) || 1);
      const p = Math.max(0, Number(i.unitPrice) || 0);
      return {
        description: String(i.description).trim(),
        quantity: q,
        unitPrice: p,
        total: q * p,
      };
    });

  if (processedItems.length === 0) {
    return res.status(400).json({ error: 'At least one line item with description and unit price is required.' });
  }

  const calcSubtotal = subtotal !== undefined && subtotal !== null && !isNaN(Number(subtotal))
    ? Number(subtotal)
    : processedItems.reduce((s: number, i: any) => s + i.total, 0);
  const calcDiscount = Math.max(0, Number(discount) || 0);
  const calcTotal = Math.max(0, calcSubtotal - calcDiscount);
  const calcAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const balance = Math.max(0, calcTotal - calcAmountPaid);

  let finalStatus: InvoiceStatus = (status as InvoiceStatus) || 'Draft';
  if (calcAmountPaid >= calcTotal && calcTotal > 0) {
    finalStatus = 'Paid';
  } else if (calcAmountPaid > 0) {
    finalStatus = 'Partially Paid';
  } else if (status) {
    finalStatus = status as InvoiceStatus;
  }

  const invoice = db.createInvoice({
    businessId: req.businessId,
    customerId: customerId || '',
    customerName: customerName.trim(),
    customerPhone: customerPhone ? String(customerPhone).trim() : '',
    customerEmail: customerEmail ? String(customerEmail).trim() : '',
    customerAddress: customerAddress ? String(customerAddress).trim() : '',
    items: processedItems,
    subtotal: calcSubtotal,
    discount: calcDiscount,
    total: calcTotal,
    amountPaid: calcAmountPaid,
    balance,
    issueDate: getAccraDateString(issueDate),
    dueDate: dueDate ? getAccraDateString(dueDate) : getAccraDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    status: finalStatus,
    notes: notes || '',
  });

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'Invoice Creation',
    details: `Created invoice ${invoice.invoiceNumber} for ${invoice.customerName} (GH₵${invoice.total.toFixed(2)}).`,
    ipAddress: req.ip,
  });

  res.status(201).json(invoice);
});

// PUT /api/invoices/:id
app.put('/api/invoices/:id', requireAuth, requireFeature('invoices'), requirePermission('invoices'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  
  const updates = { ...req.body };
  if (updates.items && Array.isArray(updates.items)) {
    updates.items = updates.items
      .filter((i: any) => i && i.description && String(i.description).trim() && Number(i.unitPrice) > 0)
      .map((i: any) => {
        const q = Math.max(1, Number(i.quantity) || 1);
        const p = Math.max(0, Number(i.unitPrice) || 0);
        return {
          description: String(i.description).trim(),
          quantity: q,
          unitPrice: p,
          total: q * p,
        };
      });
    const sub = updates.items.reduce((s: number, it: any) => s + it.total, 0);
    const disc = Math.max(0, Number(updates.discount) || 0);
    const tot = Math.max(0, sub - disc);
    const paid = Math.max(0, Number(updates.amountPaid) || 0);
    updates.subtotal = sub;
    updates.discount = disc;
    updates.total = tot;
    updates.amountPaid = paid;
    updates.balance = Math.max(0, tot - paid);
    if (paid >= tot && tot > 0) updates.status = 'Paid';
    else if (paid > 0) updates.status = 'Partially Paid';
  }

  const updated = db.updateInvoice(id, req.businessId, updates);
  if (!updated) return res.status(404).json({ error: 'Invoice not found' });
  res.json(updated);
});

// DELETE /api/invoices/:id
app.delete('/api/invoices/:id', requireAuth, requireFeature('invoices'), requirePermission('invoices'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const deleted = db.deleteInvoice(id, req.businessId);
  if (!deleted) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice deleted.' });
});

// ----------------------------------------------------
// 9. COMPREHENSIVE REPORTS
// ----------------------------------------------------
app.get('/api/reports', requireAuth, requireFeature('financial_reports'), requirePermission('financial_reports'), (req: AuthenticatedRequest, res) => {
  const businessId = req.businessId;
  if (!businessId) {
    return res.status(400).json({ error: 'Business ID required' });
  }

  const { range, startDate, endDate, paymentMethod, category, cashier } = req.query as {
    range?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    category?: string;
    cashier?: string;
  };

  const allSales = db.getSales(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allProducts = db.getProducts(businessId);
  const allPurchases = db.getPurchases(businessId);
  const allCustomers = db.getCustomers(businessId);

  const normalizedRange = (range || 'this_month').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const todayStr = getAccraToday();
  const [tY, tM, tD] = todayStr.split('-').map(Number);

  // Date calculation in Ghana (Africa/Accra) time
  const todayDateUtc = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
  const dayOfWeek = todayDateUtc.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  
  // Monday of this week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday, 12, 0, 0));
  const thisWeekMondayStr = getAccraDateString(thisWeekMonday);
  const thisWeekSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday + 6, 12, 0, 0));
  const thisWeekSundayStr = getAccraDateString(thisWeekSunday);

  // Last week Monday and Sunday
  const lastWeekMonday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 7, 12, 0, 0));
  const lastWeekMondayStr = getAccraDateString(lastWeekMonday);
  const lastWeekSunday = new Date(Date.UTC(tY, tM - 1, tD + diffToMonday - 1, 12, 0, 0));
  const lastWeekSundayStr = getAccraDateString(lastWeekSunday);

  // Yesterday
  const yesterdayDate = new Date(Date.UTC(tY, tM - 1, tD - 1, 12, 0, 0));
  const yesterdayStr = getAccraDateString(yesterdayDate);

  // This month ('YYYY-MM')
  const thisMonthStr = `${tY}-${String(tM).padStart(2, '0')}`;

  // Last month ('YYYY-MM')
  const lastMonthDate = new Date(Date.UTC(tY, tM - 2, 1, 12, 0, 0));
  const lastMonthYear = lastMonthDate.getUTCFullYear();
  const lastMonthNum = lastMonthDate.getUTCMonth() + 1;
  const lastMonthStr = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;
  const lastDayOfLastMonth = new Date(Date.UTC(tY, tM - 1, 0, 12, 0, 0)).getUTCDate();
  const lastMonthEndStr = `${lastMonthStr}-${String(lastDayOfLastMonth).padStart(2, '0')}`;

  let fromDate = `${thisMonthStr}-01`;
  let toDate = todayStr;

  if (normalizedRange === 'today') {
    fromDate = todayStr;
    toDate = todayStr;
  } else if (normalizedRange === 'yesterday') {
    fromDate = yesterdayStr;
    toDate = yesterdayStr;
  } else if (normalizedRange === 'this_week') {
    fromDate = thisWeekMondayStr;
    toDate = thisWeekSundayStr;
  } else if (normalizedRange === 'last_week') {
    fromDate = lastWeekMondayStr;
    toDate = lastWeekSundayStr;
  } else if (normalizedRange === 'this_month') {
    fromDate = `${thisMonthStr}-01`;
    toDate = todayStr;
  } else if (normalizedRange === 'last_month') {
    fromDate = `${lastMonthStr}-01`;
    toDate = lastMonthEndStr;
  } else if (normalizedRange === 'custom') {
    fromDate = startDate ? getAccraDateString(startDate) : '';
    toDate = endDate ? getAccraDateString(endDate) : '';
  } else if (normalizedRange === 'all_time') {
    fromDate = '';
    toDate = todayStr;
  }

  const isDateInRange = (rawDate: string | Date | null | undefined): boolean => {
    if (!rawDate) return false;
    const dStr = getAccraDateString(rawDate);

    if (normalizedRange === 'today') {
      return dStr === todayStr;
    } else if (normalizedRange === 'yesterday') {
      return dStr === yesterdayStr;
    } else if (normalizedRange === 'this_week') {
      return dStr >= thisWeekMondayStr && dStr <= thisWeekSundayStr;
    } else if (normalizedRange === 'last_week') {
      return dStr >= lastWeekMondayStr && dStr <= lastWeekSundayStr;
    } else if (normalizedRange === 'this_month') {
      return dStr.startsWith(thisMonthStr);
    } else if (normalizedRange === 'last_month') {
      return dStr.startsWith(lastMonthStr);
    } else if (normalizedRange === 'custom') {
      if (startDate && endDate) {
        const sStr = getAccraDateString(startDate);
        const eStr = getAccraDateString(endDate);
        return dStr >= sStr && dStr <= eStr;
      } else if (startDate) {
        const sStr = getAccraDateString(startDate);
        return dStr >= sStr;
      } else if (endDate) {
        const eStr = getAccraDateString(endDate);
        return dStr <= eStr;
      }
      return true;
    }
    // all_time / default
    return true;
  };

  // Filter sales in range
  let filteredSales = (allSales || []).filter((s) => {
    return isDateInRange(s.createdAt) && s.status === 'Completed';
  });

  if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'All') {
    const pmLower = paymentMethod.toLowerCase();
    filteredSales = filteredSales.filter((s) => s.paymentMethod?.toLowerCase() === pmLower);
  }

  if (cashier && typeof cashier === 'string' && cashier !== 'All') {
    filteredSales = filteredSales.filter(
      (s) => s.createdBy === cashier || (s as any).cashier === cashier
    );
  }

  // Filter expenses in range (Purchases are never added to expenses)
  let filteredExpenses = (allExpenses || []).filter((e) => {
    return isDateInRange(e.date || e.createdAt);
  });

  if (category && typeof category === 'string' && category !== 'All') {
    const catLower = category.toLowerCase();
    filteredExpenses = filteredExpenses.filter((e) => e.category?.toLowerCase() === catLower);
  }

  // Filter purchases in range
  const filteredPurchases = (allPurchases || []).filter((p) => {
    return isDateInRange(p.purchaseDate || p.date || p.createdAt);
  });

  // Authoritative Sales & Cost Totals
  const totalRevenue = filteredSales.reduce((s, item) => s + (Number(item.total) || 0), 0);
  const costOfGoods = filteredSales.reduce((s, item) => {
    return (
      s +
      (item.items || []).reduce(
        (sum, i) => sum + (Number(i.buyingPrice) || 0) * (Number(i.quantity) || 0),
        0
      )
    );
  }, 0);

  const grossProfit = totalRevenue - costOfGoods;
  const grossMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  const salesCount = filteredSales.length;
  const averageTransactionValue = salesCount > 0 ? Number((totalRevenue / salesCount).toFixed(2)) : 0;
  const totalDiscount = filteredSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
  const amountCollected = filteredSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
  const outstandingSalesBalance = filteredSales.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  // Sales by payment method breakdown
  const salesByPaymentMethodRecord: Record<string, number> = {};
  const salesByMethodCountRecord: Record<string, number> = {};
  filteredSales.forEach((s) => {
    const method = s.paymentMethod || 'Cash';
    salesByPaymentMethodRecord[method] = (salesByPaymentMethodRecord[method] || 0) + (Number(s.total) || 0);
    salesByMethodCountRecord[method] = (salesByMethodCountRecord[method] || 0) + 1;
  });
  const salesByPaymentMethod = Object.entries(salesByPaymentMethodRecord).map(([method, amount]) => ({
    method,
    amount,
    count: salesByMethodCountRecord[method] || 0,
  }));

  const cashSales = salesByPaymentMethodRecord['Cash'] || 0;
  const momoSales = salesByPaymentMethodRecord['Mobile Money'] || 0;
  const bankTransferSales = salesByPaymentMethodRecord['Bank Transfer'] || 0;
  const cardSales = salesByPaymentMethodRecord['Card'] || 0;
  const creditSales = (salesByPaymentMethodRecord['Credit/Debt'] || 0) + (salesByPaymentMethodRecord['Credit'] || 0);

  // Expense breakdown by category
  const expenseByCategoryRecord: Record<string, number> = {};
  const expenseCategoryCountRecord: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    const cat = e.category || 'Other';
    expenseByCategoryRecord[cat] = (expenseByCategoryRecord[cat] || 0) + (Number(e.amount) || 0);
    expenseCategoryCountRecord[cat] = (expenseCategoryCountRecord[cat] || 0) + 1;
  });
  const expensesByCategory = Object.entries(expenseByCategoryRecord).map(([category, amount]) => ({
    category,
    amount,
    count: expenseCategoryCountRecord[category] || 0,
  }));

  // Expense breakdown by payment method
  const expenseByMethodRecord: Record<string, number> = {};
  const expenseByMethodCountRecord: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    const method = e.paymentMethod || 'Cash';
    expenseByMethodRecord[method] = (expenseByMethodRecord[method] || 0) + (Number(e.amount) || 0);
    expenseByMethodCountRecord[method] = (expenseByMethodCountRecord[method] || 0) + 1;
  });
  const expensesByPaymentMethod = Object.entries(expenseByMethodRecord).map(([method, amount]) => ({
    method,
    amount,
    count: expenseByMethodCountRecord[method] || 0,
  }));

  let highestExpenseCategory: string | null = null;
  let maxExpenseAmount = 0;
  for (const [cat, amt] of Object.entries(expenseByCategoryRecord)) {
    if (amt > maxExpenseAmount) {
      maxExpenseAmount = amt;
      highestExpenseCategory = cat;
    }
  }

  // Purchases breakdown (Stock-in purchases)
  const purchasesTotal = filteredPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
  const purchaseCount = filteredPurchases.length;
  const purchasesBySupplierMap: Record<
    string,
    { supplierId: string; supplierName: string; totalAmount: number; count: number }
  > = {};
  for (const p of filteredPurchases) {
    const sId = p.supplierId || 'unspecified';
    const sName = p.supplierName || 'Unknown Supplier';
    if (!purchasesBySupplierMap[sId]) {
      purchasesBySupplierMap[sId] = { supplierId: sId, supplierName: sName, totalAmount: 0, count: 0 };
    }
    purchasesBySupplierMap[sId].totalAmount += Number(p.totalAmount) || 0;
    purchasesBySupplierMap[sId].count += 1;
  }
  const purchasesBySupplier = Object.values(purchasesBySupplierMap).sort((a, b) => b.totalAmount - a.totalAmount);

  // Inventory valuation (Current stock at buying & selling price)
  const totalInventoryQuantity = (allProducts || []).reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const totalInventoryCostValue = (allProducts || []).reduce(
    (s, p) => s + (Number(p.buyingPrice) || 0) * (Number(p.quantity) || 0),
    0
  );
  const totalInventoryRetailValue = (allProducts || []).reduce(
    (s, p) => s + (Number(p.sellingPrice) || 0) * (Number(p.quantity) || 0),
    0
  );
  const expectedInventoryProfit = Math.max(0, totalInventoryRetailValue - totalInventoryCostValue);

  // Customer debt total & debtors breakdown
  const customerDebts = (allCustomers || []).map((c) => {
    const custSalesDebt = (allSales || [])
      .filter((s) => s.customerId === c.id)
      .reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
    const effectiveDebt = Math.max(0, Math.max(Number(c.currentDebt) || 0, custSalesDebt));
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      currentDebt: effectiveDebt,
    };
  });

  const totalCustomerDebt = customerDebts.reduce((s, c) => s + c.currentDebt, 0);
  const debtorsCount = customerDebts.filter((c) => c.currentDebt > 0).length;
  const topDebtors = customerDebts
    .filter((c) => c.currentDebt > 0)
    .sort((a, b) => b.currentDebt - a.currentDebt)
    .slice(0, 10);

  // Top products performance
  const productPerformanceMap: Record<
    string,
    { productName: string; category: string; totalQuantity: number; totalRevenue: number; profit: number }
  > = {};
  for (const s of filteredSales) {
    for (const item of s.items || []) {
      const pid = item.productId || item.productName || 'unknown';
      if (!productPerformanceMap[pid]) {
        productPerformanceMap[pid] = {
          productName: item.productName || 'Unnamed Product',
          category: 'General',
          totalQuantity: 0,
          totalRevenue: 0,
          profit: 0,
        };
      }
      productPerformanceMap[pid].totalQuantity += Number(item.quantity) || 0;
      productPerformanceMap[pid].totalRevenue += Number(item.total) || 0;
      productPerformanceMap[pid].profit += Number(item.profit) || 0;
    }
  }

  const topProducts = Object.entries(productPerformanceMap)
    .map(([productId, d]) => ({
      productId,
      productName: d.productName,
      totalQuantity: d.totalQuantity,
      totalRevenue: d.totalRevenue,
      profit: d.profit,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const productPerformance = topProducts.map((p) => ({
    productId: p.productId,
    name: p.productName,
    category: 'General',
    qtySold: p.totalQuantity,
    revenue: p.totalRevenue,
    profit: p.profit,
  }));

  res.json({
    range: range || 'this_month',
    fromDate,
    toDate,
    totalRevenue,
    costOfGoods,
    totalCost: costOfGoods,
    grossProfit,
    grossMargin,
    totalExpenses,
    netProfit,
    salesCount,
    averageTransactionValue,
    cashSales,
    momoSales,
    bankTransferSales,
    cardSales,
    creditSales,
    totalDiscount,
    amountCollected,
    outstandingSalesBalance,
    expensesByCategory,
    expenseByCategory: expenseByCategoryRecord,
    expensesByPaymentMethod,
    expenseCount: filteredExpenses.length,
    highestExpenseCategory,
    salesByPaymentMethod,
    salesByPaymentMethodRecord,
    inventoryValuation: {
      totalQuantity: totalInventoryQuantity,
      totalCostValue: totalInventoryCostValue,
      totalRetailValue: totalInventoryRetailValue,
      potentialProfit: expectedInventoryProfit,
    },
    inventory: {
      totalQuantity: totalInventoryQuantity,
      costValue: totalInventoryCostValue,
      retailValue: totalInventoryRetailValue,
      expectedProfit: expectedInventoryProfit,
    },
    totalDebtOwed: totalCustomerDebt,
    totalCustomerDebt,
    debtorsCount,
    topDebtors,
    topProducts,
    productPerformance,
    purchasesTotal,
    purchaseCount,
    purchasesBySupplier,
  });
});

// ----------------------------------------------------
// 10. NOTIFICATIONS, AUDIT LOGS, & SUBSCRIPTIONS
// ----------------------------------------------------

// GET /api/notifications
app.get('/api/notifications', requireAuth, requirePermission('notifications'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.json([]);
  const notifs = db.getNotifications(req.businessId);
  res.json(notifs);
});

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', requireAuth, requirePermission('notifications'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { id } = req.params;
  const ok = db.markNotificationRead(id, req.businessId);
  res.json({ success: ok });
});

// PUT /api/notifications/read-all
app.put('/api/notifications/read-all', requireAuth, requirePermission('notifications'), (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  db.markAllNotificationsRead(req.businessId);
  res.json({ success: true });
});

// GET /api/audit-logs
app.get('/api/audit-logs', requireAuth, requireNotStaff, requireFeature('audit_logs'), (req: AuthenticatedRequest, res) => {
  try {
    const logs = db.getAuditLogs(req.businessId);
    res.json(logs || []);
  } catch (err: any) {
    console.error('Failed to get audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// GET /api/subscriptions/current
app.get('/api/subscriptions/current', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const raw = db.getRaw();
    const sub = raw.subscriptions.find((s) => s.businessId === req.businessId);
    const biz = raw.businesses.find((b) => b.id === req.businessId);

    const planLower = (sub?.plan || biz?.plan || 'free').toString().toLowerCase();
    const prices: Record<string, number> = { free: 0, starter: 49, business: 99 };
    const amount = typeof sub?.amount === 'number' ? sub.amount : (prices[planLower] || 0);

    res.json({
      subscription: sub || {
        id: `sub_${req.businessId}`,
        businessId: req.businessId,
        plan: planLower,
        status: 'active',
        amount,
        currency: 'GHS',
        interval: 'monthly',
        startDate: biz?.createdAt || new Date().toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentProvider: 'none',
      },
      isPaystackConfigured: isPaystackConfigured(),
    });
  } catch (err: any) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscription.' });
  }
});

// GET /api/subscriptions/payments (Merchant payment history)
app.get('/api/subscriptions/payments', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const payments = db.getSubscriptionPayments(req.businessId);
    const sorted = [...payments].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    res.json(sorted);
  } catch (err: any) {
    console.error('Merchant payments error:', err);
    res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});

// POST /api/subscriptions/initialize-payment
app.post('/api/subscriptions/initialize-payment', requireAuth, requireNotStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) {
      console.warn('[Payment Init] Rejected: Missing business context');
      return res.status(400).json({ error: 'Authenticated business context required.' });
    }

    const { plan, callbackUrl } = req.body;
    console.log(`[Payment Init] Request received - Business ID: ${req.businessId}, User ID: ${req.user?.id}, Requested Plan: ${plan}`);

    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'Please select a subscription plan.' });
    }

    const planLower = plan.toLowerCase().trim();
    if (planLower === 'free') {
      return res.status(400).json({
        error: 'Online payment is not required for the Free plan. Please select Starter (GH₵49) or Business (GH₵99).',
      });
    }

    const planConfig = getPlanConfig(planLower);
    if (!planConfig) {
      console.warn(`[Payment Init] Invalid plan requested: ${plan}`);
      return res.status(400).json({
        error: `Invalid plan "${plan}". Allowed paid plans are: Starter (GH₵49/mo) and Business (GH₵99/mo).`,
      });
    }

    const raw = db.getRaw();
    const business = raw.businesses.find((b) => b.id === req.businessId);
    if (!business) {
      console.warn(`[Payment Init] Business not found: ${req.businessId}`);
      return res.status(404).json({ error: 'Business account not found.' });
    }

    const currentSub = raw.subscriptions.find((s) => s.businessId === req.businessId);
    const customerEmail = (req.user?.email || business.email || '').toLowerCase().trim();

    if (!customerEmail) {
      return res.status(400).json({
        error: 'A valid email address is required to process Paystack payment. Please update your profile email in Settings.',
      });
    }

    // 1. Generate unique transaction reference for Ghana merchant (BMGH-SUB-...)
    const reference = generatePaystackReference(req.businessId);
    const paymentId = db.generateId('pay');
    const nowIso = new Date().toISOString();

    // 2. Determine Callback URL
    const hostOrigin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : '');
    const finalCallbackUrl =
      callbackUrl ||
      `${hostOrigin}/#/?payment_ref=${encodeURIComponent(reference)}&plan=${encodeURIComponent(planConfig.planId)}`;

    console.log(
      `[Payment Init] Prepared: Reference: ${reference}, Plan: ${planConfig.planId}, Amount: GH₵${planConfig.priceGhs} (${planConfig.amountInPesewas} pesewas), Email: ${customerEmail}`
    );

    // 3. Initialize Paystack Transaction (Server-side with secret key)
    try {
      const paystackRes = await initializePaystackTransaction({
        email: customerEmail,
        amountInPesewas: planConfig.amountInPesewas,
        currency: planConfig.currency,
        reference,
        callbackUrl: finalCallbackUrl,
        metadata: {
          businessId: req.businessId,
          userId: req.user.id,
          subscriptionId: currentSub?.id,
          plan: planConfig.planId,
          internalPaymentId: paymentId,
        },
      });

      // 4. Create and Persist Pending Payment Record once Paystack checkout is generated
      const paymentRecord: SubscriptionPayment = {
        id: paymentId,
        reference,
        businessId: req.businessId,
        userId: req.user.id,
        subscriptionId: currentSub?.id || db.generateId('sub'),
        businessName: business.name,
        ownerName: req.user.fullName || business.name,
        ownerEmail: customerEmail,
        customerEmail,
        plan: planConfig.planId,
        amount: planConfig.priceGhs,
        currency: planConfig.currency,
        status: 'pending',
        provider: 'paystack',
        createdAt: nowIso,
        updatedAt: nowIso,
        metadata: {
          businessId: req.businessId,
          userId: req.user.id,
          subscriptionId: currentSub?.id,
          plan: planConfig.planId,
          internalPaymentId: paymentId,
          paystackAccessCode: paystackRes.data.access_code,
        },
      };

      db.createSubscriptionPayment(paymentRecord);
      console.log(`[Payment Init] Successfully initialized Paystack transaction for ${reference}`);

      res.json({
        success: true,
        authorizationUrl: paystackRes.data.authorization_url,
        reference: paystackRes.data.reference,
        accessCode: paystackRes.data.access_code,
        plan: planConfig.planId,
        amount: planConfig.priceGhs,
        currency: planConfig.currency,
        message: 'Paystack checkout initialized successfully.',
      });
    } catch (paystackErr: any) {
      console.error('[Payment Init Error] Paystack initialization failed:', paystackErr.message || paystackErr);

      if (paystackErr.message?.includes('PAYSTACK_CONFIGURATION_ERROR') || paystackErr.message?.includes('PAYSTACK_SECRET_KEY')) {
        return res.status(500).json({
          error:
            'Paystack is not configured on the server. Please ensure the PAYSTACK_SECRET_KEY environment variable is set in the server configuration.',
        });
      }

      return res.status(502).json({
        error: paystackErr.message || 'Unable to connect to Paystack payment gateway. Please try again.',
      });
    }
  } catch (err: any) {
    console.error('[Payment Init Error] Unexpected exception:', err);
    res.status(500).json({ error: 'Failed to initialize subscription payment.' });
  }
});

// GET /api/subscriptions/verify-payment/:reference
app.get('/api/subscriptions/verify-payment/:reference', requireAuth, requireNotStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reference } = req.params;
    if (!reference || !reference.trim()) {
      return res.status(400).json({ error: 'Payment reference is required.' });
    }

    const cleanRef = reference.trim();
    const payment = db.findSubscriptionPaymentByReference(cleanRef);

    if (!payment) {
      return res.status(404).json({ error: `Payment transaction with reference "${cleanRef}" was not found.` });
    }

    // Tenant Isolation Security Check
    const isMasterAdmin =
      req.user?.role === 'admin' ||
      req.user?.role === 'master_admin' ||
      req.user?.id === 'usr_admin_master';

    if (payment.businessId !== req.businessId && !isMasterAdmin) {
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to verify this transaction.' });
    }

    // Idempotency: If already fulfilled, return success safely
    if (payment.status === 'success' || payment.status === 'Successful') {
      const raw = db.getRaw();
      const currentSub = raw.subscriptions.find((s) => s.businessId === payment.businessId);
      return res.json({
        success: true,
        alreadyFulfilled: true,
        message: 'Subscription payment has already been verified and activated.',
        payment,
        subscription: currentSub,
      });
    }

    // Call Paystack API to verify transaction status
    let verifyRes;
    try {
      verifyRes = await verifyPaystackTransaction(cleanRef);
    } catch (verifyErr: any) {
      console.error('Paystack verification call error:', verifyErr.message || verifyErr);
      if (verifyErr.message?.includes('PAYSTACK_CONFIGURATION_ERROR') || verifyErr.message?.includes('PAYSTACK_SECRET_KEY')) {
        return res.status(500).json({
          error:
            'Paystack is not configured on the server. Please ensure the PAYSTACK_SECRET_KEY environment variable is set in the server configuration.',
        });
      }
      return res.status(502).json({
        error: verifyErr.message || 'Failed to verify transaction with Paystack gateway.',
      });
    }

    const data = verifyRes.data;

    // Security & Integrity Checks
    if (data.status !== 'success') {
      db.updateSubscriptionPayment(cleanRef, {
        status: data.status === 'failed' ? 'failed' : 'abandoned',
      });
      return res.status(400).json({
        error: `Paystack payment was not successful (Gateway Status: ${data.status || 'unknown'}).`,
        gatewayResponse: data.gateway_response,
      });
    }

    if (data.currency !== 'GHS') {
      db.updateSubscriptionPayment(cleanRef, { status: 'failed' });
      return res.status(400).json({
        error: `Invalid transaction currency: expected GHS, received ${data.currency}.`,
      });
    }

    const planConfig = getPlanConfig(payment.plan);
    if (!planConfig) {
      return res.status(400).json({ error: `Unknown plan "${payment.plan}" for payment verification.` });
    }

    // Verify exact amount in pesewas (4900 for Starter, 9900 for Business)
    if (data.amount !== planConfig.amountInPesewas) {
      db.updateSubscriptionPayment(cleanRef, { status: 'failed' });
      return res.status(400).json({
        error: `Payment amount mismatch: expected GH₵${planConfig.priceGhs} (${planConfig.amountInPesewas} pesewas), but received ${data.amount} pesewas.`,
      });
    }

    // Fulfill payment and activate subscription idempotently
    const fulfillment = db.fulfillSubscriptionPayment(cleanRef, data);

    res.json({
      success: true,
      message: `Payment verified! ${planConfig.name} is now active for your business.`,
      payment: fulfillment.payment,
      subscription: fulfillment.subscription,
      alreadyFulfilled: fulfillment.alreadyFulfilled,
    });
  } catch (err: any) {
    console.error('Verify payment endpoint error:', err);
    res.status(500).json({ error: 'Failed to complete payment verification.' });
  }
});

// POST /api/subscriptions/upgrade (Free plan switch or manual toggle)
app.post('/api/subscriptions/upgrade', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res) => {
  if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
  const { plan } = req.body;
  if (!['FREE', 'STARTER', 'BUSINESS'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  const sub = db.updateSubscription(req.businessId, plan as any);

  db.logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.fullName,
    action: 'SUBSCRIPTION_UPGRADED',
    details: `Updated subscription plan to ${plan}.`,
    ipAddress: req.ip,
  });

  res.json({ subscription: sub, message: `Successfully activated ${plan} plan!` });
});

// GET /api/subscription & GET /api/subscriptions/usage (Stage 4R Subscription Usage Summary)
app.get(['/api/subscription', '/api/subscriptions/usage'], requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const usage = calculateBusinessUsage(req.businessId);
    res.json(usage);
  } catch (err: any) {
    console.error('Subscription usage error:', err);
    res.status(500).json({ error: 'Failed to calculate subscription usage.' });
  }
});

// POST /api/subscriptions/trial (Stage 4R Start Free Trial)
app.post('/api/subscriptions/trial', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const { plan, durationDays } = req.body;

    const planLower = (plan || 'starter').toLowerCase().trim();
    if (planLower !== 'starter' && planLower !== 'business') {
      return res.status(400).json({ error: 'Trial plan must be "starter" or "business".' });
    }

    const currentSub = db.getSubscription(req.businessId);
    if (currentSub?.trialStart) {
      return res.status(400).json({ error: 'Free trial has already been used for this business account.' });
    }

    const days = Math.min(30, Math.max(7, Number(durationDays) || 14));
    const sub = db.startBusinessTrial(req.businessId, planLower, days, {
      id: req.user.id,
      fullName: req.user.fullName || 'Merchant',
    });

    res.json({
      success: true,
      message: `${days}-day ${planLower.toUpperCase()} trial activated successfully!`,
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Subscription trial error:', err);
    res.status(500).json({ error: 'Failed to activate trial.' });
  }
});

// POST /api/subscriptions/cancel (Stage 4R Cancel Subscription)
app.post('/api/subscriptions/cancel', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const { reason, immediate } = req.body;

    const sub = db.cancelSubscription(
      req.businessId,
      typeof reason === 'string' ? reason : '',
      { id: req.user.id, fullName: req.user.fullName || 'Merchant' },
      Boolean(immediate)
    );

    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.json({
      success: true,
      message: immediate
        ? 'Subscription has been cancelled immediately.'
        : 'Subscription cancellation scheduled for period end.',
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Subscription cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
});

// GET /api/billing/invoices & GET /api/subscriptions/invoices (Stage 4R Billing Invoices)
app.get(['/api/billing/invoices', '/api/subscriptions/invoices'], requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const invoices = db.getBillingInvoices(req.businessId);
    res.json(invoices);
  } catch (err: any) {
    console.error('Billing invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve billing invoices.' });
  }
});

// GET /api/billing/reconciliation (Stage 4R Read-only Billing Diagnostics)
app.get('/api/billing/reconciliation', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const report = runBillingReconciliationDiagnostics(req.businessId);
    res.json(report);
  } catch (err: any) {
    console.error('Billing reconciliation error:', err);
    res.status(500).json({ error: 'Failed to run billing reconciliation.' });
  }
});

// POST /api/billing/repair-invoice (Stage 4R Explicit authorized repair)
app.post('/api/billing/repair-invoice', requireAuth, requireNotStaff, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required.' });
    const { paymentReference } = req.body;
    if (!paymentReference || typeof paymentReference !== 'string') {
      return res.status(400).json({ error: 'Payment reference is required.' });
    }

    const result = repairMissingBillingInvoice(req.businessId, paymentReference.trim(), {
      id: req.user.id,
      fullName: req.user.fullName || 'Merchant',
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to repair billing invoice.' });
    }

    res.json({
      success: true,
      message: 'Billing invoice generated successfully.',
      invoice: result.invoice,
    });
  } catch (err: any) {
    console.error('Repair billing invoice error:', err);
    res.status(500).json({ error: 'Failed to execute billing repair.' });
  }
});

// ----------------------------------------------------
// 11. ADMIN PORTAL ROUTES (PLATFORM OWNER / MASTER ADMIN)
// ----------------------------------------------------

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const businesses = raw.businesses || [];
    const subscriptions = raw.subscriptions || [];
    const users = raw.users || [];
    const payments = raw.subscription_payments || [];

    const currentMonthStr = getAccraToday().slice(0, 7); // e.g. "2026-09"

    const userMap = new Map(users.map((u) => [u.id, u]));
    const subMap = new Map(subscriptions.map((s) => [s.businessId, s]));

    let freePlanCount = 0;
    let starterPlanCount = 0;
    let businessPlanCount = 0;

    businesses.forEach((b: any) => {
      const sub = subMap.get(b.id);
      const plan = ((sub?.plan || b.plan || 'FREE') as string).toUpperCase();
      if (plan === 'STARTER') {
        starterPlanCount++;
      } else if (plan === 'BUSINESS') {
        businessPlanCount++;
      } else {
        freePlanCount++;
      }
    });

    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter((b: any) => (b.status || 'Active') !== 'Suspended').length;

    // Real platform revenue from subscription payments (verified transactions)
    const totalPlatformRevenue = payments
      .filter((p) => p.status === 'success' || p.status === 'Successful')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const newBusinessesThisMonth = businesses.filter((b) => {
      const bDateStr = getAccraDateString(b.createdAt);
      return bDateStr.startsWith(currentMonthStr);
    }).length;

    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length || businesses.length;

    // Recent businesses overview
    const recentBusinesses = [...businesses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map((b: any) => {
        const owner = userMap.get(b.ownerId);
        const sub = subMap.get(b.id);
        const plan = ((sub?.plan || b.plan || 'FREE') as string).toUpperCase();
        return {
          id: b.id,
          name: b.name,
          ownerId: b.ownerId,
          ownerName: owner?.fullName || 'Business Owner',
          ownerEmail: owner?.email || b.email || 'N/A',
          ownerPhone: owner?.phone || b.phone || 'N/A',
          type: b.type || 'Other',
          location: b.location || 'Ghana',
          phone: b.phone || owner?.phone || 'N/A',
          email: b.email || owner?.email || 'N/A',
          currency: b.currency || 'GH₵',
          plan,
          subscriptionStatus: sub?.status || 'active',
          status: b.status || 'Active',
          createdAt: b.createdAt,
        };
      });

    res.json({
      totalBusinesses,
      activeBusinesses,
      freePlanCount,
      starterPlanCount,
      businessPlanCount,
      totalPlatformRevenue,
      newBusinessesThisMonth,
      activeSubscriptions,
      recentBusinesses,
    });
  } catch (err: any) {
    console.error('Admin dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin dashboard metrics.' });
  }
});

// GET /api/admin/businesses
app.get('/api/admin/businesses', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const businesses = raw.businesses || [];
    const users = raw.users || [];
    const subscriptions = raw.subscriptions || [];
    const sales = raw.sales || [];
    const products = raw.products || [];
    const customers = raw.customers || [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const subMap = new Map(subscriptions.map((s) => [s.businessId, s]));

    const salesByBiz = new Map<string, { count: number; revenue: number }>();
    sales.forEach((s) => {
      if (s.status === 'Completed') {
        const current = salesByBiz.get(s.businessId) || { count: 0, revenue: 0 };
        salesByBiz.set(s.businessId, {
          count: current.count + 1,
          revenue: current.revenue + (Number(s.total) || 0),
        });
      }
    });

    const productsByBiz = new Map<string, number>();
    products.forEach((p) => {
      if (!p.isDeleted) {
        productsByBiz.set(p.businessId, (productsByBiz.get(p.businessId) || 0) + 1);
      }
    });

    const customersByBiz = new Map<string, number>();
    customers.forEach((c) => {
      if (!c.isDeleted) {
        customersByBiz.set(c.businessId, (customersByBiz.get(c.businessId) || 0) + 1);
      }
    });

    const detailedBusinesses = businesses.map((b: any) => {
      const owner = userMap.get(b.ownerId);
      const sub = subMap.get(b.id);
      const plan = ((sub?.plan || b.plan || 'FREE') as string).toUpperCase();
      const salesData = salesByBiz.get(b.id) || { count: 0, revenue: 0 };
      const productCount = productsByBiz.get(b.id) || 0;
      const customerCount = customersByBiz.get(b.id) || 0;

      return {
        id: b.id,
        name: b.name,
        type: b.type || 'Other',
        location: b.location || 'Ghana',
        phone: b.phone || owner?.phone || 'N/A',
        email: b.email || owner?.email || 'N/A',
        currency: b.currency || 'GH₵',
        ownerId: b.ownerId,
        ownerName: owner?.fullName || 'Business Owner',
        ownerEmail: owner?.email || b.email || 'N/A',
        ownerPhone: owner?.phone || b.phone || 'N/A',
        plan,
        subscriptionStatus: sub?.status || 'active',
        status: b.status || 'Active',
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        totalSalesCount: salesData.count,
        totalSalesRevenue: salesData.revenue,
        totalProductsCount: productCount,
        totalCustomersCount: customerCount,
      };
    });

    res.json(detailedBusinesses);
  } catch (err: any) {
    console.error('Admin businesses error:', err);
    res.status(500).json({ error: 'Failed to retrieve businesses list.' });
  }
});

// GET /api/admin/subscriptions
app.get('/api/admin/subscriptions', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const businesses = raw.businesses || [];
    const users = raw.users || [];
    const subscriptions = raw.subscriptions || [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const planPrices: Record<string, number> = {
      free: 0,
      starter: 49,
      business: 99,
    };

    const subList = businesses.map((b: any) => {
      const owner = userMap.get(b.ownerId);
      const sub = subscriptions.find((s) => s.businessId === b.id);
      const rawPlan = (sub?.plan || b.plan || 'free').toString().toLowerCase();
      const plan = rawPlan === 'starter' || rawPlan === 'business' ? rawPlan : 'free';
      const amount = typeof sub?.amount === 'number' ? sub.amount : (planPrices[plan] || 0);
      const currency = sub?.currency || 'GHS';
      const interval = sub?.interval || 'monthly';
      const status = (sub?.status || 'active').toString().toLowerCase();
      const startDate = sub?.startDate || sub?.startedAt || b.createdAt;
      const nextBillingDate =
        sub?.nextBillingDate ||
        sub?.expiresAt ||
        new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const paymentReference = sub?.paymentReference || 'none';
      const paymentProvider = sub?.paymentProvider || 'none';

      let paymentStatus = 'Free Tier';
      if (plan === 'starter' || plan === 'business') {
        paymentStatus = status === 'active' ? 'Active' : status.toUpperCase();
      }

      return {
        id: sub?.id || `sub_${b.id}`,
        businessId: b.id,
        businessName: b.name,
        ownerName: owner?.fullName || 'Business Owner',
        ownerEmail: owner?.email || b.email || 'N/A',
        ownerPhone: owner?.phone || b.phone || 'N/A',
        plan,
        amount,
        currency,
        interval,
        status,
        startDate,
        nextBillingDate,
        endDate: sub?.endDate,
        paymentReference,
        paymentProvider,
        createdAt: sub?.createdAt || startDate,
        updatedAt: sub?.updatedAt || startDate,
        // Backward compatibility fields
        planPrice: amount,
        startedAt: startDate,
        expiresAt: nextBillingDate,
        paymentStatus,
      };
    });

    res.json(subList);
  } catch (err: any) {
    console.error('Admin subscriptions error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
  }
});

// GET /api/admin/subscriptions/:id
app.get('/api/admin/subscriptions/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const businesses = raw.businesses || [];
    const users = raw.users || [];
    const subscriptions = raw.subscriptions || [];

    const sub = subscriptions.find((s) => s.id === req.params.id || s.businessId === req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    const biz = businesses.find((b) => b.id === sub.businessId);
    const owner = biz ? users.find((u) => u.id === biz.ownerId) : undefined;

    const rawPlan = (sub.plan || biz?.plan || 'free').toString().toLowerCase();
    const plan = rawPlan === 'starter' || rawPlan === 'business' ? rawPlan : 'free';
    const planPrices: Record<string, number> = { free: 0, starter: 49, business: 99 };
    const amount = typeof sub.amount === 'number' ? sub.amount : (planPrices[plan] || 0);

    const detailed = {
      id: sub.id,
      businessId: sub.businessId,
      businessName: biz?.name || 'Unknown Business',
      ownerName: owner?.fullName || 'Business Owner',
      ownerEmail: owner?.email || biz?.email || 'N/A',
      ownerPhone: owner?.phone || biz?.phone || 'N/A',
      plan,
      amount,
      currency: sub.currency || 'GHS',
      interval: sub.interval || 'monthly',
      status: (sub.status || 'active').toString().toLowerCase(),
      startDate: sub.startDate || sub.startedAt || biz?.createdAt || sub.createdAt,
      nextBillingDate: sub.nextBillingDate || sub.expiresAt,
      endDate: sub.endDate,
      paymentReference: sub.paymentReference || 'none',
      paymentProvider: sub.paymentProvider || 'none',
      createdAt: sub.createdAt || sub.startDate,
      updatedAt: sub.updatedAt,
      planPrice: amount,
      startedAt: sub.startDate || sub.startedAt,
      expiresAt: sub.nextBillingDate || sub.expiresAt,
    };

    res.json(detailed);
  } catch (err: any) {
    console.error('Admin subscription detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscription details.' });
  }
});

// PUT /api/admin/subscriptions/:id/plan
app.put('/api/admin/subscriptions/:id/plan', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body;
    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'Valid plan (free, starter, business) is required.' });
    }

    const planLower = plan.toLowerCase().trim();
    if (!['free', 'starter', 'business'].includes(planLower)) {
      return res.status(400).json({ error: 'Invalid plan. Allowed plans: free, starter, business.' });
    }

    const updated = db.updateSubscriptionPlan(req.params.id, planLower, req.user);
    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.json({
      subscription: updated,
      message: `Subscription plan successfully updated to ${planLower.toUpperCase()} (Manual Admin Plan Change).`,
    });
  } catch (err: any) {
    console.error('Admin update subscription plan error:', err);
    res.status(500).json({ error: 'Failed to update subscription plan.' });
  }
});

// PUT /api/admin/subscriptions/:id/status
app.put('/api/admin/subscriptions/:id/status', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const statusLower = status.toLowerCase().trim();
    const validStatuses = ['active', 'pending', 'past_due', 'cancelled', 'expired'];
    if (!validStatuses.includes(statusLower)) {
      return res.status(400).json({ error: `Invalid status. Allowed statuses: ${validStatuses.join(', ')}.` });
    }

    const updated = db.updateSubscriptionStatus(req.params.id, statusLower, req.user);
    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    res.json({
      subscription: updated,
      message: `Subscription status successfully updated to ${statusLower.toUpperCase()}.`,
    });
  } catch (err: any) {
    console.error('Admin update subscription status error:', err);
    res.status(500).json({ error: 'Failed to update subscription status.' });
  }
});

// GET /api/admin/payments
app.get('/api/admin/payments', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const payments = raw.subscription_payments || [];
    const businesses = raw.businesses || [];
    const users = raw.users || [];

    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = [...payments]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((p: any) => {
        const biz = bizMap.get(p.businessId);
        const owner = biz ? userMap.get(biz.ownerId) : undefined;
        const statusRaw = (p.status || '').toString().toLowerCase();
        const isSuccess =
          statusRaw === 'success' ||
          statusRaw === 'successful' ||
          statusRaw === 'paid' ||
          statusRaw === 'verified';
        const isFailed = statusRaw === 'failed';
        const isPending = statusRaw === 'pending';

        let displayStatus = 'Pending';
        if (isSuccess) displayStatus = 'Successful';
        else if (isFailed) displayStatus = 'Failed';
        else if (statusRaw === 'abandoned') displayStatus = 'Abandoned';
        else if (p.status) displayStatus = p.status.charAt(0).toUpperCase() + p.status.slice(1);

        return {
          id: p.id || p.reference,
          reference: p.reference || p.id,
          businessId: p.businessId,
          userId: p.userId || biz?.ownerId,
          subscriptionId: p.subscriptionId,
          businessName: p.businessName || biz?.name || 'N/A',
          ownerName: p.ownerName || owner?.fullName || 'N/A',
          ownerEmail: p.ownerEmail || owner?.email || 'N/A',
          customerEmail: p.customerEmail || p.ownerEmail || owner?.email || 'N/A',
          plan: (p.plan || 'starter').toLowerCase(),
          amount: Number(p.amount) || 0,
          currency: p.currency || 'GHS',
          provider: p.provider || 'paystack',
          status: displayStatus,
          paymentDate: p.paidAt || p.paymentDate || p.createdAt,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
          updatedAt: p.updatedAt,
          paystackTransactionId: p.paystackTransactionId,
          paymentMethod: p.paymentMethod || (isSuccess ? 'Paystack / MoMo' : 'Checkout Draft'),
        };
      });

    res.json(enriched);
  } catch (err: any) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Failed to retrieve platform payments.' });
  }
});

// GET /api/admin/billing/revenue (Stage 4R SaaS Platform Revenue Metrics)
app.get('/api/admin/billing/revenue', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = calculateSaaSRevenueMetrics();
    res.json(metrics);
  } catch (err: any) {
    console.error('Admin billing revenue error:', err);
    res.status(500).json({ error: 'Failed to calculate platform revenue metrics.' });
  }
});

// GET /api/admin/billing/reconciliation (Stage 4R Platform-wide Billing Reconciliation)
app.get('/api/admin/billing/reconciliation', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = runBillingReconciliationDiagnostics();
    res.json(report);
  } catch (err: any) {
    console.error('Admin billing reconciliation error:', err);
    res.status(500).json({ error: 'Failed to run platform billing reconciliation.' });
  }
});

// GET /api/admin/activity
app.get('/api/admin/activity', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = db.getRaw();
    const logs = raw.audit_logs || [];
    const businesses = raw.businesses || [];
    const bizMap = new Map(businesses.map((b) => [b.id, b.name]));

    const enrichedLogs = logs.map((log) => ({
      id: log.id,
      businessId: log.businessId,
      businessName: log.businessId ? (bizMap.get(log.businessId) || 'Platform / Master Admin') : 'Platform / Master Admin',
      userId: log.userId,
      userName: log.userName || 'System',
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress || '127.0.0.1',
      createdAt: log.createdAt || log.timestamp,
      timestamp: log.timestamp || log.createdAt,
    }));

    res.json(enrichedLogs);
  } catch (err: any) {
    console.error('Admin activity error:', err);
    res.status(500).json({ error: 'Failed to retrieve platform activity.' });
  }
});

// Backward compatibility admin endpoints
app.get('/api/admin/overview', requireAuth, requireAdmin, (req, res) => {
  const stats = db.getAdminStats();
  res.json(stats);
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const raw = db.getRaw();
  const users = raw.users.map(({ passwordHash: _, ...u }) => u);
  res.json(users);
});

app.get('/api/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
  try {
    const raw = db.getRaw();
    res.json(raw.audit_logs || []);
  } catch (err: any) {
    console.error('Failed to get admin audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve admin audit logs.' });
  }
});

// ====================================================
// STAGE 4P — MULTI-LOCATION & BRANCH EXPANSION ROUTES
// ====================================================

// GET /api/locations
app.get(
  '/api/locations',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_view'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const locations = db.getLocations(req.businessId);
    const defLoc = db.getDefaultLocation(req.businessId);

    const enriched = locations.map((loc) => {
      const access = validateUserLocationAccess(req.user!, loc.id, req.businessId!);
      return {
        ...loc,
        canAccess: access.allowed,
      };
    });

    res.json({
      locations: enriched,
      defaultLocationId: defLoc.id,
      activeLocationId: (req.headers['x-location-id'] as string) || defLoc.id,
    });
  }
);

// GET /api/locations/summary
app.get(
  '/api/locations/summary',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_view'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { locationId, startDate, endDate } = req.query;
    const targetLocId = locationId && typeof locationId === 'string' && locationId !== 'all' ? locationId : undefined;

    if (targetLocId) {
      const access = validateUserLocationAccess(req.user!, targetLocId, req.businessId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason || 'Location access denied' });
      }
    }

    const summary = computeLocationSummary(
      req.businessId,
      targetLocId,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );
    res.json(summary);
  }
);

// GET /api/locations/compare
app.get(
  '/api/locations/compare',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_reports'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { locationIdA, locationIdB, startDate, endDate } = req.query;

    if (!locationIdA || !locationIdB || typeof locationIdA !== 'string' || typeof locationIdB !== 'string') {
      return res.status(400).json({ error: 'Both locationIdA and locationIdB query parameters are required' });
    }

    const comparison = compareLocations(
      req.businessId,
      locationIdA,
      locationIdB,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );
    res.json(comparison);
  }
);

// GET /api/locations/diagnostics
app.get(
  '/api/locations/diagnostics',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_manage'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const report = runLocationDiagnostics(req.businessId);
    res.json(report);
  }
);

// GET /api/locations/:id
app.get(
  '/api/locations/:id',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_view'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const loc = db.getLocationById(req.params.id, req.businessId);
    if (!loc) return res.status(404).json({ error: 'Location not found' });

    const access = validateUserLocationAccess(req.user!, loc.id, req.businessId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason || 'Location access denied' });
    }

    res.json(loc);
  }
);

// POST /api/locations
app.post(
  '/api/locations',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_manage'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { name, code, type, address, city, region, phone, isDefault } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Location code is required' });
    }

    // Stage 4R: Check locations plan limit
    const isMasterAdmin =
      req.user?.role === 'master_admin' || req.user?.id === 'usr_admin_master';
    const locLimitCheck = checkResourceLimit(req.businessId, 'locations', isMasterAdmin);
    if (!locLimitCheck.allowed) {
      return res.status(403).json({
        error: locLimitCheck.error,
        code: 'PLAN_LIMIT_REACHED',
        resource: 'locations',
        current: locLimitCheck.current,
        max: locLimitCheck.max,
      });
    }

    try {
      const newLoc = db.createLocation({
        businessId: req.businessId,
        name: name.trim(),
        code: code.trim(),
        type: type || 'BRANCH',
        address: typeof address === 'string' ? address.trim() : undefined,
        city: typeof city === 'string' ? city.trim() : undefined,
        region: typeof region === 'string' ? region.trim() : undefined,
        phone: typeof phone === 'string' ? phone.trim() : undefined,
        status: 'ACTIVE',
        isDefault: Boolean(isDefault),
      });

      db.logAudit({
        businessId: req.businessId,
        userId: req.user.id,
        userName: req.user.fullName,
        action: 'Location Created',
        details: `Created new branch location "${newLoc.name}" (${newLoc.code}).`,
        ipAddress: req.ip,
        entityId: newLoc.id,
      });

      res.status(201).json(newLoc);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create location' });
    }
  }
);

// PUT /api/locations/:id
app.put(
  '/api/locations/:id',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_manage'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { name, code, type, address, city, region, phone, isDefault } = req.body;

    try {
      const updated = db.updateLocation(req.params.id, req.businessId, {
        name,
        code,
        type,
        address,
        city,
        region,
        phone,
        isDefault,
      });
      if (!updated) return res.status(404).json({ error: 'Location not found' });

      db.logAudit({
        businessId: req.businessId,
        userId: req.user.id,
        userName: req.user.fullName,
        action: 'Location Updated',
        details: `Updated branch location "${updated.name}" (${updated.code}).`,
        ipAddress: req.ip,
        entityId: updated.id,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update location' });
    }
  }
);

// POST /api/locations/:id/status
app.post(
  '/api/locations/:id/status',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_manage'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Status must be "ACTIVE" or "INACTIVE"' });
    }

    const result = db.setLocationStatus(req.params.id, req.businessId, status);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Location Status Changed',
      details: `Changed location "${result.location?.name}" status to ${status}.`,
      ipAddress: req.ip,
      entityId: req.params.id,
    });

    res.json(result.location);
  }
);

// POST /api/locations/:id/default
app.post(
  '/api/locations/:id/default',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_manage'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

    const result = db.setDefaultLocation(req.params.id, req.businessId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Default Location Set',
      details: `Set "${result.location?.name}" as the primary default location.`,
      ipAddress: req.ip,
      entityId: req.params.id,
    });

    res.json(result.location);
  }
);

// POST /api/locations/stock/adjust
app.post(
  '/api/locations/stock/adjust',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_inventory'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { productId, locationId, newQuantity, reason } = req.body;

    if (!productId || !locationId || newQuantity === undefined) {
      return res.status(400).json({ error: 'productId, locationId, and newQuantity are required' });
    }

    const access = validateUserLocationAccess(req.user!, locationId, req.businessId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason || 'Unauthorized location access' });
    }

    const updatedProd = db.adjustLocationStock(
      productId,
      locationId,
      req.businessId,
      Number(newQuantity),
      reason,
      req.user.fullName
    );

    if (!updatedProd) {
      return res.status(404).json({ error: 'Product not found in this business' });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Location Stock Adjusted',
      details: `Adjusted stock for "${updatedProd.name}" at location ${access.location?.name} to ${newQuantity} units.`,
      ipAddress: req.ip,
      entityId: productId,
    });

    res.json({
      product: updatedProd,
      locationStock: db.getLocationStock(productId, locationId, req.businessId),
    });
  }
);

// GET /api/transfers
app.get(
  '/api/transfers',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_transfer'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { locationId, status } = req.query;

    const transfers = db.getStockTransfers(req.businessId, {
      locationId: typeof locationId === 'string' && locationId !== 'all' ? locationId : undefined,
      status: typeof status === 'string' && status !== 'all' ? (status as StockTransferStatus) : undefined,
    });

    res.json(transfers);
  }
);

// GET /api/transfers/:id
app.get(
  '/api/transfers/:id',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_transfer'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const transfer = db.getStockTransferById(req.params.id, req.businessId);
    if (!transfer) return res.status(404).json({ error: 'Stock transfer not found' });
    res.json(transfer);
  }
);

// POST /api/transfers
app.post(
  '/api/transfers',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_transfer'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const {
      sourceLocationId,
      destinationLocationId,
      productId,
      quantity,
      notes,
      idempotencyKey,
    } = req.body;

    if (!sourceLocationId || !destinationLocationId || !productId || quantity === undefined) {
      return res.status(400).json({
        error: 'sourceLocationId, destinationLocationId, productId, and quantity are required',
      });
    }

    const access = validateUserLocationAccess(req.user!, sourceLocationId, req.businessId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason || 'Unauthorized source location access' });
    }

    const result = db.createStockTransfer({
      businessId: req.businessId,
      sourceLocationId,
      destinationLocationId,
      productId,
      quantity: Number(quantity),
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      requestedBy: req.user.id,
      requestedByName: req.user.fullName,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey.trim() : undefined,
    });

    if (!result.success || !result.transfer) {
      return res.status(400).json({ error: result.error || 'Failed to create stock transfer' });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'Stock Transfer Requested',
      details: `Requested transfer #${result.transfer.transferNumber} of ${quantity} units from ${result.transfer.sourceLocationName} to ${result.transfer.destinationLocationName}.`,
      ipAddress: req.ip,
      entityId: result.transfer.id,
    });

    res.status(201).json(result.transfer);
  }
);

// PUT /api/transfers/:id/status
app.put(
  '/api/transfers/:id/status',
  requireAuth,
  requireFeature('locations'),
  requirePermission('location_transfer'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { status, reason } = req.body;

    const validStatuses: StockTransferStatus[] = ['APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = db.updateStockTransferStatus(
      req.params.id,
      req.businessId,
      status,
      { id: req.user.id, name: req.user.fullName },
      reason
    );

    if (!result.success || !result.transfer) {
      return res.status(400).json({ error: result.error || 'Failed to update stock transfer status' });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: `Stock Transfer ${status}`,
      details: `Updated transfer #${result.transfer.transferNumber} to status ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      ipAddress: req.ip,
      entityId: result.transfer.id,
    });

    res.json(result.transfer);
  }
);

// ============================================================================
// STAGE 4Q — BUSINESS ECOSYSTEM, INTEGRATIONS & EXTERNAL SERVICES ROUTES
// ============================================================================

// 1. GET /api/integrations/catalog - Public / authenticated catalog of supported providers
app.get(
  '/api/integrations/catalog',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    const catalog = providerRegistry.getCatalog();
    res.json(catalog);
  }
);

// 2. GET /api/integrations - List business integrations (secrets stripped)
app.get(
  '/api/integrations',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    let list = db.getIntegrations(req.businessId);

    // If staff user is restricted to specific locations, filter out location-scoped integrations they cannot access
    if (req.user?.role === 'staff' && !req.user?.allLocations && req.user?.assignedLocationIds) {
      list = list.filter((i) => {
        if (i.locationScope === 'LOCATION' && i.locationId) {
          return req.user.assignedLocationIds?.includes(i.locationId);
        }
        return true;
      });
    }

    res.json(list);
  }
);

// 3. GET /api/integrations/diagnostics - Integration diagnostic check suite
app.get(
  '/api/integrations/diagnostics',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const diagnostics = runIntegrationDiagnostics(req.businessId);
    res.json(diagnostics);
  }
);

// 4. GET /api/integrations/:id - Get specific integration details
app.get(
  '/api/integrations/:id',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const integration = db.getIntegrationById(req.params.id, req.businessId);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Location access check
    if (integration.locationScope === 'LOCATION' && integration.locationId && req.user?.role === 'staff') {
      const locRes = validateUserLocationAccess(req.user as any, integration.locationId, req.businessId);
      if (!locRes.allowed) {
        return res.status(403).json({ error: locRes.reason || 'Staff unassigned to this location' });
      }
    }

    res.json(integration);
  }
);

// 5. POST /api/integrations - Connect / Configure new integration
app.post(
  '/api/integrations',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

    // RBAC: Only business owner, admin, or staff with settings permission can manage integrations
    if (req.user.role === 'staff' && !req.user.permissions?.settings) {
      return res.status(403).json({ error: 'Staff lacks permission to manage external integrations' });
    }

    const { provider, category, displayName, description, locationScope, locationId, configuration, secrets } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'Provider identifier is required' });
    }

    const result = connectIntegration(
      req.businessId,
      { id: req.user.id, name: req.user.fullName, role: req.user.role },
      {
        provider,
        category,
        displayName,
        description,
        locationScope,
        locationId,
        configuration: configuration || {},
        secrets,
      }
    );

    if (!result.success || !result.integration) {
      return res.status(400).json({ error: result.error || 'Failed to connect integration' });
    }

    res.status(201).json(result.integration);
  }
);

// 6. PUT /api/integrations/:id - Update integration configuration
app.put(
  '/api/integrations/:id',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });

    if (req.user.role === 'staff' && !req.user.permissions?.settings) {
      return res.status(403).json({ error: 'Staff lacks permission to update integrations' });
    }

    const { displayName, description, configuration, secrets, locationScope, locationId } = req.body;
    const existing = db.getIntegrationById(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const updated = db.updateIntegration(
      req.params.id,
      req.businessId,
      {
        displayName: displayName || existing.displayName,
        description: description !== undefined ? description : existing.description,
        configuration,
        locationScope: locationScope || existing.locationScope,
        locationId: locationScope === 'LOCATION' ? locationId : undefined,
        updatedBy: req.user.id,
      },
      secrets
    );

    if (!updated) {
      return res.status(400).json({ error: 'Failed to update integration' });
    }

    db.logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'INTEGRATION_CONFIGURATION_UPDATED',
      details: `Updated configuration for integration '${updated.displayName}'.`,
      module: 'configuration',
      severity: 'INFO',
      metadata: { integrationId: req.params.id },
    });

    res.json(updated);
  }
);

// 7. POST /api/integrations/:id/disconnect - Disconnect integration
app.post(
  '/api/integrations/:id/disconnect',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    if (req.user.role === 'staff' && !req.user.permissions?.settings) {
      return res.status(403).json({ error: 'Unauthorized to disconnect integrations' });
    }

    const result = disconnectIntegration(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      req.params.id
    );

    if (!result.success || !result.integration) {
      return res.status(400).json({ error: result.error || 'Failed to disconnect integration' });
    }

    res.json(result.integration);
  }
);

// 8. POST /api/integrations/:id/test - Test connection & live health check
app.post(
  '/api/integrations/:id/test',
  requireAuth,
  requireFeature('integrations'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const result = await testIntegrationConnection(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      req.params.id
    );

    res.json(result);
  }
);

// 9. POST /api/integrations/:id/sync - Trigger synchronization run
app.post(
  '/api/integrations/:id/sync',
  requireAuth,
  requireFeature('integrations'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { direction, entityType, locationId } = req.body;

    if (!direction || !entityType) {
      return res.status(400).json({ error: 'Both direction and entityType are required for sync' });
    }

    const result = await runIntegrationSync(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      {
        integrationId: req.params.id,
        direction,
        entityType,
        locationId,
      }
    );

    if (!result.success && !result.syncRun) {
      return res.status(400).json({ error: result.error || 'Sync execution failed' });
    }

    res.json(result.syncRun);
  }
);

// 10. GET /api/integrations/:id/syncs - Get sync history
app.get(
  '/api/integrations/:id/syncs',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const syncs = db.getSyncRuns(req.businessId, req.params.id);
    res.json(syncs);
  }
);

// 11. GET /api/integrations/:id/events - Get integration events audit log
app.get(
  '/api/integrations/:id/events',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const events = db.getIntegrationEvents(req.businessId, req.params.id);
    res.json(events);
  }
);

// 12. POST /api/integrations/oauth/authorize - Prepare OAuth authorization state
app.post(
  '/api/integrations/oauth/authorize',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { provider, redirectUri } = req.body;
    if (!provider) return res.status(400).json({ error: 'Provider is required' });

    const providerDef = providerRegistry.get(provider);
    if (!providerDef || !providerDef.supportsOAuth) {
      return res.status(400).json({ error: `Provider '${provider}' does not support OAuth authentication` });
    }

    const state = generateOAuthState(req.businessId, provider);
    const authUrl = `https://auth.provider.external/oauth/authorize?response_type=code&client_id=bmgh_${provider}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri || 'https://app.businessmanagergh.com/oauth/callback')}`;

    res.json({
      provider,
      state,
      authorizationUrl: authUrl,
      expiresInSeconds: 900,
    });
  }
);

// 13. POST /api/integrations/oauth/callback - Handle & validate OAuth callback state
app.post(
  '/api/integrations/oauth/callback',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { state, code, provider } = req.body;

    const validation = validateOAuthState(state, req.businessId, provider);
    if (!validation.valid) {
      db.recordSecurityEvent({
        businessId: req.businessId,
        eventType: 'suspicious_activity',
        severity: 'HIGH',
        summary: `OAuth state validation rejected: ${validation.reason}.`,
        metadata: { provider, stateSnippet: state?.slice(0, 16) },
      });

      return res.status(400).json({
        error: `OAuth validation failed: ${validation.reason}`,
        code: 'INVALID_OAUTH_STATE',
      });
    }

    res.json({
      success: true,
      message: 'OAuth state validated successfully against authenticated tenant.',
      provider,
    });
  }
);

// 14. POST /api/integrations/:id/webhook & POST /api/integrations/webhooks/:provider
app.post(
  ['/api/integrations/:id/webhook', '/api/integrations/webhooks/:provider'],
  async (req: Request, res: Response) => {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = (req.headers['x-webhook-signature'] ||
      req.headers['x-paystack-signature'] ||
      req.headers['x-hubtel-signature'] ||
      '') as string;

    // Check if integrationId parameter is passed or provider parameter
    let integrationId: string | undefined;
    let providerName: string = '';

    if (req.params.id) {
      integrationId = req.params.id;
      // Look up integration to find businessId and provider
      const allBiz = db.getRaw().businesses;
      let foundBizId = '';
      for (const b of allBiz) {
        const integ = db.getIntegrationById(integrationId, b.id);
        if (integ) {
          foundBizId = b.id;
          providerName = integ.provider;
          break;
        }
      }
      if (!foundBizId) {
        return res.status(404).json({ error: 'Integration target not found for webhook' });
      }

      const result = await processInboundWebhook(foundBizId, {
        provider: providerName,
        integrationId,
        payload: req.body,
        rawBody,
        signature,
        headers: req.headers,
        externalEventId: req.body?.id || req.body?.event_id,
        eventType: req.body?.event || req.body?.type,
      });

      if (!result.success && result.status === 'REJECTED') {
        return res.status(401).json({ error: result.error });
      }

      return res.json(result);
    } else {
      providerName = req.params.provider;
      // Identify business from tenant header or merchant reference in payload
      const tenantHeader = (req.headers['x-business-id'] || req.headers['x-tenant-id']) as string;
      const rawBiz = db.getRaw().businesses;
      const targetBiz = tenantHeader ? rawBiz.find((b) => b.id === tenantHeader) : rawBiz[0];

      if (!targetBiz) {
        return res.status(400).json({ error: 'Tenant context required for provider webhook' });
      }

      const result = await processInboundWebhook(targetBiz.id, {
        provider: providerName,
        payload: req.body,
        rawBody,
        signature,
        headers: req.headers,
        externalEventId: req.body?.id || req.body?.event_id,
        eventType: req.body?.event || req.body?.type,
      });

      if (!result.success && result.status === 'REJECTED') {
        return res.status(401).json({ error: result.error });
      }

      return res.json(result);
    }
  }
);

// 15. GET /api/integrations/:id/webhooks - List webhook event logs
app.get(
  '/api/integrations/:id/webhooks',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const events = db.getWebhookEvents(req.businessId, req.params.id);
    res.json(events);
  }
);

// 16. POST /api/integrations/import/preview - Validate and preview data import
app.post(
  '/api/integrations/import/preview',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { entityType, rows, locationId } = req.body;

    const result = validateAndPreviewImport(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      { entityType, rows, locationId }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.importRun);
  }
);

// 17. POST /api/integrations/import/execute - Confirm and execute validated import
app.post(
  '/api/integrations/import/execute',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { importRunId, validatedRows } = req.body;

    if (!importRunId || !validatedRows) {
      return res.status(400).json({ error: 'importRunId and validatedRows are required' });
    }

    const result = executeImport(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      importRunId,
      validatedRows
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.importRun);
  }
);

// 18. GET /api/integrations/import/history - Get import history
app.get(
  '/api/integrations/import/history',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const runs = db.getImportRuns(req.businessId);
    res.json(runs);
  }
);

// 19. POST /api/integrations/export/accounting - Generate structured financial export
app.post(
  '/api/integrations/export/accounting',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { entityType, format, startDate, endDate, locationId } = req.body;

    if (!entityType) {
      return res.status(400).json({ error: 'entityType is required for export' });
    }

    const result = generateAccountingExport(
      req.businessId,
      {
        id: req.user.id,
        name: req.user.fullName,
        role: req.user.role,
        permissions: req.user.permissions,
      },
      {
        entityType,
        format: format || 'JSON',
        startDate,
        endDate,
        locationId,
      }
    );

    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }

    res.json(result);
  }
);

// 20. GET /api/integrations/export/history - Get export history
app.get(
  '/api/integrations/export/history',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const runs = db.getExportRuns(req.businessId);
    res.json(runs);
  }
);

// 21. POST /api/integrations/payments/initiate - Initiate external payment record
app.post(
  '/api/integrations/payments/initiate',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { integrationId, provider, amount, currency, saleId, customerId, customerPhone, locationId, idempotencyKey } = req.body;

    const result = initiateExternalPayment(
      req.businessId,
      { id: req.user.id, name: req.user.fullName },
      {
        integrationId,
        provider,
        amount: Number(amount),
        currency,
        saleId,
        customerId,
        customerPhone,
        locationId,
        idempotencyKey,
      }
    );

    if (!result.success || !result.payment) {
      return res.status(400).json({ error: result.error || 'Failed to initiate payment' });
    }

    res.status(201).json(result.payment);
  }
);

// 22. POST /api/integrations/payments/verify - Idempotent payment verification
app.post(
  '/api/integrations/payments/verify',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const { merchantReference, status, externalTransactionReference, provider, integrationId, amount, currency } = req.body;

    if (!merchantReference) {
      return res.status(400).json({ error: 'merchantReference is required for payment verification' });
    }

    const result = confirmExternalPayment(req.businessId, {
      merchantReference,
      externalTransactionReference,
      integrationId: integrationId || 'int_direct',
      provider: provider || 'payment_provider',
      amount: Number(amount) || 0,
      currency: currency || 'GHS',
      status: status || 'SUCCESS',
      verificationSource: 'MANUAL_VERIFY',
    });

    res.json(result);
  }
);

// 23. GET /api/integrations/payments/reconcile - Financial payment reconciliation report
app.get(
  '/api/integrations/payments/reconcile',
  requireAuth,
  requireFeature('integrations'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.businessId) return res.status(400).json({ error: 'Business ID required' });
    const provider = (req.query.provider as string) || 'momo_gh';
    const startDate = (req.query.startDate as string) || '2000-01-01';
    const endDate = (req.query.endDate as string) || '2099-12-31';
    const locationId = req.query.locationId as string | undefined;

    const report = reconcileProviderPayments(req.businessId, provider, { startDate, endDate }, locationId);
    res.json(report);
  }
);

// Explicit JSON 404 handler for any unmatched /api requests to prevent HTML fallback
app.all(['/api', '/api/*'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Express error handling middleware for API routes ensuring JSON output
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
    console.error('API Error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred.',
    });
  }
  next(err);
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
   } else {
  const distPath = path.join(process.cwd(), 'dist');

  app.get('/manifest.json', (req, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(distPath, 'manifest.json'));
  });

  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
