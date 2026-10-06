/**
 * STAGE 5C — BUSINESS BACKUP & RECOVERY READINESS ENGINE
 * Structured backup creation, cryptographic checksum generation, and integrity verification
 * reusing authoritative Stage 5A business export data with zero business mutation.
 */

import crypto from 'crypto';
import { db, DBUser } from './db.js';
import { getBusinessExportData } from './businessExport.js';

export const BACKUP_FORMAT_VERSION = 'BMGH_BACKUP_V1' as const;
export const BACKUP_VERSION = '1.0.0' as const;

export const BACKUP_SECTIONS = [
  'sales',
  'products',
  'customers',
  'debts',
  'expenses',
  'purchases',
  'goals',
  'decisions',
  'alerts',
  'activity',
] as const;

export type BackupSection = (typeof BACKUP_SECTIONS)[number];

export interface BackupMetadata {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  backupVersion: typeof BACKUP_VERSION;
  createdAt: string;
  businessId: string;
  totalRecords: number;
  recordCounts: Record<BackupSection, number>;
  includedSections: BackupSection[];
}

export type BusinessBackupPayload = Record<BackupSection, Record<string, any>[]>;

export interface BusinessBackupPackage {
  metadata: BackupMetadata;
  payload: BusinessBackupPayload;
  checksum: string;
}

export interface BackupVerificationResult {
  valid: boolean;
  errors: string[];
  summary?: {
    formatVersion: string;
    backupVersion: string;
    createdAt: string;
    businessId: string;
    totalRecords: number;
    recordCounts: Record<string, number>;
  };
}

/**
 * Deterministic cryptographic checksum of backup payload
 */
export function computePayloadChecksum(payload: any): string {
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Create a structured, authoritative backup package for the tenant
 */
export function createBusinessBackup(businessId: string, user: DBUser): BusinessBackupPackage {
  if (!businessId) {
    throw new Error('Business identifier is required to generate backup.');
  }

  const payload: Partial<BusinessBackupPayload> = {};
  const recordCounts: Partial<Record<BackupSection, number>> = {};
  let totalRecords = 0;

  for (const section of BACKUP_SECTIONS) {
    const records = getBusinessExportData(businessId, user, section);
    payload[section] = records;
    recordCounts[section] = records.length;
    totalRecords += records.length;
  }

  const fullPayload = payload as BusinessBackupPayload;
  const fullRecordCounts = recordCounts as Record<BackupSection, number>;

  const metadata: BackupMetadata = {
    formatVersion: BACKUP_FORMAT_VERSION,
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    businessId,
    totalRecords,
    recordCounts: fullRecordCounts,
    includedSections: [...BACKUP_SECTIONS],
  };

  const checksum = computePayloadChecksum(fullPayload);

  return {
    metadata,
    payload: fullPayload,
    checksum,
  };
}

/**
 * Verify integrity, structure, metadata and checksum of a backup package
 */
export function verifyBusinessBackup(
  backup: any,
  expectedBusinessId?: string
): BackupVerificationResult {
  const errors: string[] = [];

  if (!backup || typeof backup !== 'object') {
    return {
      valid: false,
      errors: ['Invalid backup package: package must be a valid JSON object.'],
    };
  }

  const { metadata, payload, checksum } = backup;

  // 1. Verify Metadata Structure
  if (!metadata || typeof metadata !== 'object') {
    errors.push('Missing backup metadata.');
  } else {
    if (metadata.formatVersion !== BACKUP_FORMAT_VERSION) {
      errors.push(
        `Unsupported backup format: "${metadata.formatVersion}". Expected "${BACKUP_FORMAT_VERSION}".`
      );
    }

    if (metadata.backupVersion !== BACKUP_VERSION) {
      errors.push(
        `Unsupported backup version: "${metadata.backupVersion}". Expected "${BACKUP_VERSION}".`
      );
    }

    if (!metadata.createdAt || typeof metadata.createdAt !== 'string') {
      errors.push('Missing or invalid metadata.createdAt timestamp.');
    }

    if (!metadata.businessId || typeof metadata.businessId !== 'string') {
      errors.push('Missing metadata.businessId identifier.');
    } else if (expectedBusinessId && metadata.businessId !== expectedBusinessId) {
      errors.push(
        `Tenant mismatch: Backup belongs to business "${metadata.businessId}" but verification was requested for "${expectedBusinessId}".`
      );
    }

    if (typeof metadata.totalRecords !== 'number' || metadata.totalRecords < 0) {
      errors.push('Invalid metadata.totalRecords value.');
    }

    if (!metadata.recordCounts || typeof metadata.recordCounts !== 'object') {
      errors.push('Missing metadata.recordCounts section breakdown.');
    }

    if (!Array.isArray(metadata.includedSections)) {
      errors.push('Missing metadata.includedSections array.');
    }
  }

  // 2. Verify Payload Sections
  if (!payload || typeof payload !== 'object') {
    errors.push('Missing backup payload.');
  } else {
    let calculatedTotal = 0;

    for (const section of BACKUP_SECTIONS) {
      const records = payload[section];
      if (!Array.isArray(records)) {
        errors.push(`Missing or non-array payload section: "${section}".`);
        continue;
      }

      calculatedTotal += records.length;

      if (metadata && metadata.recordCounts) {
        const expectedCount = metadata.recordCounts[section];
        if (expectedCount !== undefined && expectedCount !== records.length) {
          errors.push(
            `Section count mismatch for "${section}": metadata indicates ${expectedCount} records, but payload contains ${records.length}.`
          );
        }
      }

      // Check for sensitive field leakage in any records
      for (let i = 0; i < Math.min(records.length, 50); i++) {
        const r = records[i];
        if (r && typeof r === 'object') {
          if ('passwordHash' in r || 'password' in r || 'secret' in r || 'accessToken' in r) {
            errors.push(`Sensitive security fields detected in section "${section}" record ${i}.`);
            break;
          }
        }
      }
    }

    if (metadata && typeof metadata.totalRecords === 'number') {
      if (metadata.totalRecords !== calculatedTotal) {
        errors.push(
          `Total records mismatch: metadata indicates ${metadata.totalRecords}, but actual sum is ${calculatedTotal}.`
        );
      }
    }
  }

  // 3. Verify Checksum & Integrity
  if (!checksum || typeof checksum !== 'string') {
    errors.push('Missing backup integrity checksum.');
  } else if (payload && typeof payload === 'object') {
    const computed = computePayloadChecksum(payload);
    if (computed !== checksum) {
      errors.push(
        'Integrity verification failed: Cryptographic checksum mismatch. The backup payload has been tampered with or corrupted.'
      );
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    summary: valid && metadata
      ? {
          formatVersion: metadata.formatVersion,
          backupVersion: metadata.backupVersion,
          createdAt: metadata.createdAt,
          businessId: metadata.businessId,
          totalRecords: metadata.totalRecords,
          recordCounts: metadata.recordCounts,
        }
      : undefined,
  };
}

export type BackupAuditAction =
  | 'BACKUP_CREATED'
  | 'BACKUP_VERIFY_SUCCESS'
  | 'BACKUP_VERIFY_FAILED'
  | 'RECOVERY_PACKAGE_PREPARED'
  | 'RECOVERY_PACKAGE_VALIDATED'
  | 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED';

export type BackupAuditStatus = 'SUCCESS' | 'FAILED' | 'ATTENTION';

export interface BackupAuditRecord {
  id: string;
  businessId: string;
  action: BackupAuditAction;
  status: BackupAuditStatus;
  performedBy: string;
  performedByName: string;
  createdAt: string;
  recordCount?: number;
  backupVersion?: string;
  failureReason?: string;
}

/**
 * Record a minimal audit log entry for backup operations (zero sensitive contents stored)
 */
export function recordBackupAudit(data: {
  businessId: string;
  action: BackupAuditAction;
  status: BackupAuditStatus;
  performedBy: string;
  performedByName: string;
  recordCount?: number;
  backupVersion?: string;
  failureReason?: string;
}): BackupAuditRecord {
  const raw = (db as any).getRaw ? (db as any).getRaw() : (db as any).data;
  if (!raw.backup_audit_logs) {
    raw.backup_audit_logs = [];
  }

  const record: BackupAuditRecord = {
    id: `baud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    businessId: data.businessId,
    action: data.action,
    status: data.status,
    performedBy: data.performedBy,
    performedByName: data.performedByName,
    createdAt: new Date().toISOString(),
    recordCount: data.recordCount,
    backupVersion: data.backupVersion,
    failureReason: data.failureReason,
  };

  raw.backup_audit_logs.unshift(record);
  if ((db as any).saveData) {
    (db as any).saveData();
  }
  return record;
}

/**
 * Retrieve backup audit records for a specific tenant, sorted newest first, with optional retention filter
 */
export function getBackupHistory(businessId: string, filter?: string): BackupAuditRecord[] {
  const raw = (db as any).getRaw ? (db as any).getRaw() : (db as any).data;
  const list: BackupAuditRecord[] = raw.backup_audit_logs || [];
  let filtered = list.filter((r) => r.businessId === businessId);

  if (filter && filter !== 'all') {
    const now = Date.now();
    const f = filter.toLowerCase().trim();
    if (f === '30' || f === 'older_30' || f === 'older than 30 days') {
      const ms30 = 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((r) => now - new Date(r.createdAt).getTime() > ms30);
    } else if (f === '90' || f === 'older_90' || f === 'older than 90 days') {
      const ms90 = 90 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((r) => now - new Date(r.createdAt).getTime() > ms90);
    } else if (f === '180' || f === 'older_180' || f === 'older than 180 days') {
      const ms180 = 180 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((r) => now - new Date(r.createdAt).getTime() > ms180);
    }
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Compute backup retention summary for cleanup readiness visibility (zero automatic deletion)
 */
export function getBackupRetentionSummary(businessId: string) {
  const records = getBackupHistory(businessId);
  const totalRecords = records.length;
  if (totalRecords === 0) {
    return {
      totalRecords: 0,
      newestBackupDate: null,
      oldestBackupDate: null,
      olderThan30Days: 0,
      olderThan90Days: 0,
      olderThan180Days: 0,
    };
  }

  const newestBackupDate = records[0].createdAt;
  const oldestBackupDate = records[records.length - 1].createdAt;
  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const ms180 = 180 * 24 * 60 * 60 * 1000;

  let olderThan30Days = 0;
  let olderThan90Days = 0;
  let olderThan180Days = 0;

  for (const r of records) {
    const age = now - new Date(r.createdAt).getTime();
    if (age > ms30) olderThan30Days++;
    if (age > ms90) olderThan90Days++;
    if (age > ms180) olderThan180Days++;
  }

  return {
    totalRecords,
    newestBackupDate,
    oldestBackupDate,
    olderThan30Days,
    olderThan90Days,
    olderThan180Days,
  };
}

export type BackupHealthStatus = 'HEALTHY' | 'ATTENTION' | 'NO_BACKUP_DATA';
export type DiagnosticCheckStatus = 'PASS' | 'ATTENTION' | 'NOT_AVAILABLE';

export interface DiagnosticCheckItem {
  name: string;
  status: DiagnosticCheckStatus;
  explanation: string;
}

export type RecoveryReadinessStatus = 'READY' | 'ATTENTION' | 'NOT_READY';

export interface RecoveryReadinessCheckItem {
  name: string;
  status: DiagnosticCheckStatus;
  explanation: string;
}

export interface RecoveryReadinessReport {
  status: RecoveryReadinessStatus;
  checks: RecoveryReadinessCheckItem[];
}

export interface RecoveryActionItem {
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface RecoveryActionGuideReport {
  summary: string;
  actions: RecoveryActionItem[];
}

export interface RecoverySummaryReport {
  readinessStatus: RecoveryReadinessStatus;
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
}

export interface BackupHealthReport {
  status: BackupHealthStatus;
  latestBackupAt: string | null;
  latestSuccessfulVerificationAt: string | null;
  latestFailedVerificationAt: string | null;
  daysSinceLatestBackup: number | null;
  reason: string;
  diagnosticChecks: DiagnosticCheckItem[];
  recoveryReadiness: RecoveryReadinessReport;
  recoveryActionGuide: RecoveryActionGuideReport;
  recoverySummary: RecoverySummaryReport;
}

/**
 * Evaluate factual backup health status based strictly on existing backup history
 */
export function getBackupHealthStatus(businessId: string): BackupHealthReport {
  const history = getBackupHistory(businessId);

  const backupCreatedEvents = history.filter((r) => r.action === 'BACKUP_CREATED' && r.status === 'SUCCESS');
  const verifySuccessEvents = history.filter((r) => r.action === 'BACKUP_VERIFY_SUCCESS' && r.status === 'SUCCESS');
  const verifyFailedEvents = history.filter((r) => r.action === 'BACKUP_VERIFY_FAILED' || r.status === 'FAILED');

  if (backupCreatedEvents.length === 0) {
    const diagnosticChecks: DiagnosticCheckItem[] = [
      {
        name: 'Recent backup exists',
        status: 'NOT_AVAILABLE',
        explanation: 'No backup events have been recorded for this business.',
      },
      {
        name: 'Successful verification exists',
        status: 'NOT_AVAILABLE',
        explanation: 'No successful backup verifications recorded.',
      },
      {
        name: 'Recent verification failure exists',
        status: verifyFailedEvents.length > 0 ? 'ATTENTION' : 'NOT_AVAILABLE',
        explanation: verifyFailedEvents.length > 0 ? 'Backup verification failures found in history.' : 'No verification attempts recorded.',
      },
      {
        name: 'Backup age is within the configured threshold',
        status: 'NOT_AVAILABLE',
        explanation: 'No backup data available to evaluate 30-day threshold.',
      },
    ];

    const recoveryReadiness: RecoveryReadinessReport = {
      status: 'NOT_READY',
      checks: [
        { name: 'Backup data exists', status: 'NOT_AVAILABLE', explanation: 'No backup data records found.' },
        { name: 'Recent backup exists', status: 'NOT_AVAILABLE', explanation: 'No backup available to evaluate recency.' },
        { name: 'Backup verification has succeeded', status: 'NOT_AVAILABLE', explanation: 'No successful backup verification recorded.' },
        { name: 'Backup integrity can be verified', status: 'NOT_AVAILABLE', explanation: 'No backup data available for integrity check.' },
        { name: 'Backup history is available', status: history.length > 0 ? 'PASS' : 'NOT_AVAILABLE', explanation: history.length > 0 ? `Backup audit trail contains ${history.length} event(s).` : 'No backup history available.' },
      ],
    };

    const recoveryActionGuide: RecoveryActionGuideReport = {
      summary: 'No backup data is currently available.',
      actions: [
        {
          text: 'Create a business backup.',
          completed: false,
          priority: 'high',
        },
      ],
    };

    const successVerifyEvent = history.find((r) => r.action === 'BACKUP_VERIFY_SUCCESS' && r.status === 'SUCCESS');
    const lastSuccessfulVerification = successVerifyEvent
      ? {
          status: successVerifyEvent.status,
          createdAt: successVerifyEvent.createdAt,
          recordCount: successVerifyEvent.recordCount,
          backupVersion: successVerifyEvent.backupVersion,
        }
      : null;

    const recoverySummary: RecoverySummaryReport = {
      readinessStatus: 'NOT_READY',
      backupDataAvailable: false,
      recentBackupStatus: 'Attention',
      verificationStatus: successVerifyEvent ? 'Passed' : 'Not Available',
      integrityStatus: 'Verifiable',
      historyAvailable: history.length > 0,
      outstandingRequirements: ['No backup data records found.'],
      lastSuccessfulVerification,
    };

    return {
      status: 'NO_BACKUP_DATA',
      latestBackupAt: null,
      latestSuccessfulVerificationAt: null,
      latestFailedVerificationAt: verifyFailedEvents.length > 0 ? verifyFailedEvents[0].createdAt : null,
      daysSinceLatestBackup: null,
      reason: 'No successful backup events found in history.',
      diagnosticChecks,
      recoveryReadiness,
      recoveryActionGuide,
      recoverySummary,
    };
  }

  const latestBackup = backupCreatedEvents[0];
  const latestBackupAt = latestBackup.createdAt;
  const latestSuccessfulVerificationAt = verifySuccessEvents.length > 0 ? verifySuccessEvents[0].createdAt : null;
  const latestFailedVerificationAt = verifyFailedEvents.length > 0 ? verifyFailedEvents[0].createdAt : null;

  const now = Date.now();
  const latestBackupTime = new Date(latestBackupAt).getTime();
  const diffMs = now - latestBackupTime;
  const daysSinceLatestBackup = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const latestFailTime = latestFailedVerificationAt ? new Date(latestFailedVerificationAt).getTime() : 0;
  const hasUnresolvedFailure = latestFailTime > latestBackupTime;

  const diagnosticChecks: DiagnosticCheckItem[] = [
    {
      name: 'Recent backup exists',
      status: daysSinceLatestBackup <= 30 ? 'PASS' : 'ATTENTION',
      explanation:
        daysSinceLatestBackup <= 30
          ? `Recent backup found ${daysSinceLatestBackup} day(s) ago.`
          : `Latest backup is ${daysSinceLatestBackup} days old (exceeds 30-day threshold).`,
    },
    {
      name: 'Successful verification exists',
      status: verifySuccessEvents.length > 0 ? 'PASS' : 'NOT_AVAILABLE',
      explanation:
        verifySuccessEvents.length > 0
          ? `Latest successful verification on ${new Date(verifySuccessEvents[0].createdAt).toLocaleDateString()}.`
          : 'No successful backup verification recorded yet.',
    },
    {
      name: 'Recent verification failure exists',
      status: hasUnresolvedFailure ? 'ATTENTION' : 'PASS',
      explanation: hasUnresolvedFailure
        ? 'Latest verification failed and occurred after the most recent backup.'
        : 'No unresolved verification failures detected.',
    },
    {
      name: 'Backup age is within the configured threshold',
      status: daysSinceLatestBackup <= 30 ? 'PASS' : 'ATTENTION',
      explanation:
        daysSinceLatestBackup <= 30
          ? `Backup age (${daysSinceLatestBackup}d) is within the 30-day policy threshold.`
          : `Backup age (${daysSinceLatestBackup}d) exceeds the 30-day policy threshold.`,
    },
  ];

  const hasBackup = backupCreatedEvents.length > 0;
  const recentBackup = hasBackup && daysSinceLatestBackup <= 30;
  const hasSuccessfulVerify = verifySuccessEvents.length > 0;
  const hasFailedVerify = verifyFailedEvents.length > 0 && hasUnresolvedFailure;
  const hasHistory = history.length > 0;

  const readinessChecks: RecoveryReadinessCheckItem[] = [
    {
      name: 'Backup data exists',
      status: hasBackup ? 'PASS' : 'NOT_AVAILABLE',
      explanation: hasBackup ? `Found ${backupCreatedEvents.length} backup record(s).` : 'No backup data records found.',
    },
    {
      name: 'Recent backup exists',
      status: recentBackup ? 'PASS' : (hasBackup ? 'ATTENTION' : 'NOT_AVAILABLE'),
      explanation: recentBackup
        ? `Latest backup is ${daysSinceLatestBackup} day(s) old (within 30 days).`
        : (hasBackup ? `Latest backup is ${daysSinceLatestBackup} days old (exceeds 30 days).` : 'No backup available to evaluate recency.'),
    },
    {
      name: 'Backup verification has succeeded',
      status: hasSuccessfulVerify ? 'PASS' : 'NOT_AVAILABLE',
      explanation: hasSuccessfulVerify
        ? `Latest successful verification on ${new Date(verifySuccessEvents[0].createdAt).toLocaleDateString()}.`
        : 'No successful backup verification recorded in history.',
    },
    {
      name: 'Backup integrity can be verified',
      status: hasFailedVerify ? 'ATTENTION' : (hasSuccessfulVerify || hasBackup ? 'PASS' : 'NOT_AVAILABLE'),
      explanation: hasFailedVerify
        ? 'Latest backup verification failed indicating potential integrity issues.'
        : 'Integrity checking engine operational with no unresolved failures.',
    },
    {
      name: 'Backup history is available',
      status: hasHistory ? 'PASS' : 'NOT_AVAILABLE',
      explanation: hasHistory ? `Backup audit trail contains ${history.length} event(s).` : 'No backup history available.',
    },
  ];

  let readinessStatus: RecoveryReadinessStatus = 'READY';
  if (!hasBackup) {
    readinessStatus = 'NOT_READY';
  } else if (readinessChecks.some((c) => c.status === 'ATTENTION') || !hasSuccessfulVerify) {
    readinessStatus = 'ATTENTION';
  } else {
    readinessStatus = 'READY';
  }

  const recoveryReadiness: RecoveryReadinessReport = {
    status: readinessStatus,
    checks: readinessChecks,
  };

  let guideSummary = '';
  const actions: RecoveryActionItem[] = [];

  if (readinessStatus === 'READY') {
    guideSummary = 'Backup recovery readiness is good.';
    actions.push({
      text: 'Continue creating and verifying backups regularly.',
      completed: true,
      priority: 'low',
    });
  } else {
    guideSummary = 'Some recovery-readiness requirements need attention.';
    for (const check of readinessChecks) {
      if (check.status === 'ATTENTION' || check.status === 'NOT_AVAILABLE') {
        if (check.name === 'Recent backup exists') {
          actions.push({
            text: 'Create a recent backup.',
            completed: false,
            priority: 'high',
          });
        } else if (check.name === 'Backup verification has succeeded') {
          actions.push({
            text: 'Verify the latest backup.',
            completed: false,
            priority: 'medium',
          });
        } else if (check.name === 'Backup history is available') {
          actions.push({
            text: 'Review backup history.',
            completed: false,
            priority: 'medium',
          });
        } else if (check.name === 'Backup integrity can be verified') {
          actions.push({
            text: 'Confirm backup integrity can be verified.',
            completed: false,
            priority: 'high',
          });
        } else if (check.name === 'Backup data exists') {
          actions.push({
            text: 'Create a business backup.',
            completed: false,
            priority: 'high',
          });
        }
      } else if (check.status === 'PASS') {
        actions.push({
          text: `Completed: ${check.name}`,
          completed: true,
          priority: 'low',
        });
      }
    }
  }

  const recoveryActionGuide: RecoveryActionGuideReport = {
    summary: guideSummary,
    actions,
  };

  const successVerifyEvent = history.find((r) => r.action === 'BACKUP_VERIFY_SUCCESS' && r.status === 'SUCCESS');
  const lastSuccessfulVerification = successVerifyEvent
    ? {
        status: successVerifyEvent.status,
        createdAt: successVerifyEvent.createdAt,
        recordCount: successVerifyEvent.recordCount,
        backupVersion: successVerifyEvent.backupVersion,
      }
    : null;

  const recoverySummary: RecoverySummaryReport = {
    readinessStatus,
    backupDataAvailable: hasBackup,
    recentBackupStatus: recentBackup ? 'Ready' : 'Attention',
    verificationStatus: hasSuccessfulVerify ? 'Passed' : 'Not Available',
    integrityStatus: hasFailedVerify ? 'Attention' : 'Verifiable',
    historyAvailable: hasHistory,
    outstandingRequirements: readinessChecks
      .filter((c) => c.status === 'ATTENTION' || c.status === 'NOT_AVAILABLE')
      .map((c) => `${c.name}: ${c.explanation}`),
    lastSuccessfulVerification,
  };

  if (daysSinceLatestBackup <= 30 && !hasUnresolvedFailure) {
    return {
      status: 'HEALTHY',
      latestBackupAt,
      latestSuccessfulVerificationAt,
      latestFailedVerificationAt,
      daysSinceLatestBackup,
      reason: `A successful backup was created ${daysSinceLatestBackup} day(s) ago (within the 30-day threshold) with no unresolved verification failures.`,
      diagnosticChecks,
      recoveryReadiness,
      recoveryActionGuide,
      recoverySummary,
    };
  }

  let reason = '';
  if (daysSinceLatestBackup > 30) {
    reason = `The most recent successful backup is ${daysSinceLatestBackup} days old (exceeding the 30-day threshold).`;
  } else if (hasUnresolvedFailure) {
    reason = 'The latest backup verification failed indicating an unresolved integrity problem.';
  } else {
    reason = 'Backup status requires attention based on history rules.';
  }

  return {
    status: 'ATTENTION',
    latestBackupAt,
    latestSuccessfulVerificationAt,
    latestFailedVerificationAt,
    daysSinceLatestBackup,
    reason,
    diagnosticChecks,
    recoveryReadiness,
    recoveryActionGuide,
    recoverySummary,
  };
}

export interface RecoveryPackage {
  manifest: {
    formatVersion: string;
    packageVersion: string;
    createdAt: string;
    businessId: string;
  };
  backupMetadata: any;
  integrity: {
    checksum: string;
    algorithm: string;
  };
  verification: {
    latestStatus: string | null;
    latestVerificationAt: string | null;
  };
  recoveryReadiness: any;
  recoverySummary: any;
  backupHistory: any[];
  businessData: any;
}

/**
 * Prepare structured read-only recovery package representation
 */
export function prepareRecoveryPackage(businessId: string, user?: DBUser): RecoveryPackage {
  const dummyUser: DBUser = user || {
    id: 'usr_sys',
    fullName: 'System Preparer',
    email: 'sys@bmgh.gh',
    phone: '',
    role: 'business_owner',
    businessId,
    passwordHash: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const backup = createBusinessBackup(businessId, dummyUser);
  const healthReport = getBackupHealthStatus(businessId);
  const history = getBackupHistory(businessId);

  return {
    manifest: {
      formatVersion: 'BMGH_RECOVERY_PACKAGE_V1',
      packageVersion: backup.metadata.backupVersion,
      createdAt: new Date().toISOString(),
      businessId,
    },
    backupMetadata: {
      formatVersion: backup.metadata.formatVersion,
      backupVersion: backup.metadata.backupVersion,
      createdAt: backup.metadata.createdAt,
      totalRecords: backup.metadata.totalRecords,
      recordCounts: backup.metadata.recordCounts,
    },
    integrity: {
      checksum: backup.checksum,
      algorithm: 'sha256',
    },
    verification: {
      latestStatus: healthReport.recoverySummary.lastSuccessfulVerification?.status || 'NOT_VERIFIED',
      latestVerificationAt: healthReport.recoverySummary.lastSuccessfulVerification?.createdAt || null,
    },
    recoveryReadiness: healthReport.recoveryReadiness,
    recoverySummary: healthReport.recoverySummary,
    backupHistory: history.map((h) => ({
      id: h.id,
      action: h.action,
      status: h.status,
      performedByName: h.performedByName,
      createdAt: h.createdAt,
      recordCount: h.recordCount,
      backupVersion: h.backupVersion,
    })),
    businessData: backup.payload,
  };
}

export type ValidationStatus = 'VALID' | 'ATTENTION' | 'INVALID';

export interface ValidationCheckItem {
  name: string;
  status: 'PASS' | 'ATTENTION' | 'INVALID';
  explanation: string;
}

export interface RecoveryValidationReport {
  status: ValidationStatus;
  checks: ValidationCheckItem[];
  failedChecks: string[];
  explanation: string;
}

/**
 * Validate a prepared recovery package deterministically and server-authoritatively
 */
export function validateRecoveryPackage(packageData: any, expectedBusinessId: string): RecoveryValidationReport {
  const checks: ValidationCheckItem[] = [];
  const failedChecks: string[] = [];

  if (!packageData || typeof packageData !== 'object') {
    return {
      status: 'INVALID',
      checks: [{ name: 'Package structure', status: 'INVALID', explanation: 'Package data is null or not a valid object.' }],
      failedChecks: ['Package structure'],
      explanation: 'Package data is malformed or not a valid JSON object.',
    };
  }

  // 1. Package structure
  checks.push({
    name: 'Package structure',
    status: 'PASS',
    explanation: 'Package structure is a valid object.',
  });

  // 2. Manifest exists & valid
  const manifest = packageData.manifest;
  if (!manifest || typeof manifest !== 'object') {
    checks.push({ name: 'Manifest', status: 'INVALID', explanation: 'Required manifest is missing or malformed.' });
    failedChecks.push('Manifest');
  } else {
    checks.push({ name: 'Manifest', status: 'PASS', explanation: `Manifest format version: ${manifest.formatVersion || 'unknown'}.` });
  }

  // 3. Tenant / business identity matches expected tenant
  const pkgBusinessId = manifest?.businessId;
  if (!pkgBusinessId || pkgBusinessId !== expectedBusinessId) {
    checks.push({
      name: 'Tenant identity',
      status: 'INVALID',
      explanation: `Tenant identity mismatch. Expected "${expectedBusinessId}", found "${pkgBusinessId || 'none'}".`,
    });
    failedChecks.push('Tenant identity');
  } else {
    checks.push({ name: 'Tenant identity', status: 'PASS', explanation: `Tenant identity verified for "${expectedBusinessId}".` });
  }

  // 4. Backup metadata exists
  if (!packageData.backupMetadata || typeof packageData.backupMetadata !== 'object') {
    checks.push({ name: 'Backup metadata', status: 'INVALID', explanation: 'Backup metadata is missing.' });
    failedChecks.push('Backup metadata');
  } else {
    checks.push({ name: 'Backup metadata', status: 'PASS', explanation: `Backup metadata present with ${packageData.backupMetadata.totalRecords || 0} total records.` });
  }

  // 5. Integrity / checksum information exists
  const integrity = packageData.integrity;
  if (!integrity || typeof integrity.checksum !== 'string' || integrity.checksum.length !== 64) {
    checks.push({ name: 'Integrity information', status: 'INVALID', explanation: 'Valid SHA-256 integrity checksum is missing.' });
    failedChecks.push('Integrity information');
  } else {
    checks.push({ name: 'Integrity information', status: 'PASS', explanation: `SHA-256 integrity checksum present (${integrity.checksum.substring(0, 8)}...).` });
  }

  // 6. Verification information exists
  if (!packageData.verification || typeof packageData.verification !== 'object') {
    checks.push({ name: 'Verification information', status: 'ATTENTION', explanation: 'Verification metadata is missing or incomplete.' });
    failedChecks.push('Verification information');
  } else {
    checks.push({ name: 'Verification information', status: 'PASS', explanation: `Verification status: ${packageData.verification.latestStatus || 'unknown'}.` });
  }

  // 7. Recovery readiness exists
  if (!packageData.recoveryReadiness || typeof packageData.recoveryReadiness !== 'object') {
    checks.push({ name: 'Recovery readiness', status: 'INVALID', explanation: 'Recovery readiness report is missing.' });
    failedChecks.push('Recovery readiness');
  } else {
    checks.push({ name: 'Recovery readiness', status: 'PASS', explanation: `Recovery readiness status: ${packageData.recoveryReadiness.status || 'unknown'}.` });
  }

  // 8. Recovery summary exists
  if (!packageData.recoverySummary || typeof packageData.recoverySummary !== 'object') {
    checks.push({ name: 'Recovery summary', status: 'INVALID', explanation: 'Recovery summary report is missing.' });
    failedChecks.push('Recovery summary');
  } else {
    checks.push({ name: 'Recovery summary', status: 'PASS', explanation: `Recovery summary status: ${packageData.recoverySummary.readinessStatus || 'unknown'}.` });
  }

  // 9. Backup history metadata exists
  if (!Array.isArray(packageData.backupHistory)) {
    checks.push({ name: 'Backup history', status: 'INVALID', explanation: 'Backup history array is missing.' });
    failedChecks.push('Backup history');
  } else {
    checks.push({ name: 'Backup history', status: 'PASS', explanation: `Backup history contains ${packageData.backupHistory.length} event(s).` });
  }

  // 10. Business-data sections exist
  const bd = packageData.businessData;
  if (!bd || typeof bd !== 'object' || !Array.isArray(bd.products)) {
    checks.push({ name: 'Business-data sections', status: 'INVALID', explanation: 'Business data sections (e.g. products) are missing.' });
    failedChecks.push('Business-data sections');
  } else {
    checks.push({ name: 'Business-data sections', status: 'PASS', explanation: 'Core business-data sections present.' });
  }

  // 11. Sensitive-field exclusion check
  const pkgString = JSON.stringify(packageData);
  const hasSensitive = /password|secret|token|credential|passwordHash/i.test(pkgString);
  if (hasSensitive) {
    checks.push({ name: 'Sensitive-field exclusion', status: 'INVALID', explanation: 'Package contains sensitive fields (passwords, tokens, or secrets).' });
    failedChecks.push('Sensitive-field exclusion');
  } else {
    checks.push({ name: 'Sensitive-field exclusion', status: 'PASS', explanation: 'No sensitive fields or credentials detected in package.' });
  }

  let status: ValidationStatus = 'VALID';
  if (failedChecks.length > 0) {
    const hasCritical = failedChecks.some((c) => c !== 'Verification information');
    status = hasCritical ? 'INVALID' : 'ATTENTION';
  }

  const explanation = status === 'VALID'
    ? 'Recovery package validation passed successfully with no structural or tenant integrity issues.'
    : status === 'ATTENTION'
    ? `Recovery package requires attention (${failedChecks.join(', ')}).`
    : `Recovery package validation failed due to critical validation errors (${failedChecks.join(', ')}).`;

  return {
    status,
    checks,
    failedChecks,
    explanation,
  };
}

export type ReverifyStatus = 'VERIFIED' | 'ATTENTION' | 'FAILED';

export interface RecoveryReverificationReport {
  status: ReverifyStatus;
  checksumMatch: boolean;
  validationPassed: boolean;
  explanation: string;
}

/**
 * Reverify a prepared recovery package integrity using existing checksum and validation logic
 */
export function reverifyRecoveryPackageIntegrity(
  packageData: any,
  expectedBusinessId: string
): RecoveryReverificationReport {
  const validation = validateRecoveryPackage(packageData, expectedBusinessId);

  if (validation.status === 'INVALID' && validation.failedChecks.some((c) => ['Tenant identity', 'Package structure', 'Manifest'].includes(c))) {
    return {
      status: 'FAILED',
      checksumMatch: false,
      validationPassed: false,
      explanation: `Integrity re-verification failed due to critical structural or tenant error: ${validation.explanation}`,
    };
  }

  const storedChecksum = packageData?.integrity?.checksum;
  if (!storedChecksum || typeof storedChecksum !== 'string' || storedChecksum.length !== 64) {
    return {
      status: 'ATTENTION',
      checksumMatch: false,
      validationPassed: validation.status === 'VALID',
      explanation: 'Integrity could not be fully verified because required integrity/checksum information is unavailable or malformed.',
    };
  }

  const validationPassed = validation.status === 'VALID';
  const businessData = packageData?.businessData;
  if (!businessData || typeof businessData !== 'object') {
    return {
      status: 'FAILED',
      checksumMatch: false,
      validationPassed: false,
      explanation: 'Integrity re-verification failed because businessData section is missing for checksum recalculation.',
    };
  }

  let recalculatedChecksum = '';
  try {
    recalculatedChecksum = computePayloadChecksum(businessData);
  } catch (err: any) {
    return {
      status: 'FAILED',
      checksumMatch: false,
      validationPassed: false,
      explanation: `Checksum recalculation error: ${err.message || 'unknown error'}`,
    };
  }

  const checksumMatch = recalculatedChecksum === storedChecksum;

  if (!checksumMatch) {
    return {
      status: 'FAILED',
      checksumMatch: false,
      validationPassed,
      explanation: 'Recovery package integrity verification failed: recalculated checksum does not match stored checksum (package may have been altered).',
    };
  }

  return {
    status: 'VERIFIED',
    checksumMatch: true,
    validationPassed,
    explanation: 'Recovery package integrity verified successfully. Checksum and structure match original records.',
  };
}
