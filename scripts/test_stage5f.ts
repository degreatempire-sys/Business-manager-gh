// @ts-nocheck
/**
 * STAGE 5F — BACKUP HEALTH STATUS TEST SUITE
 * Validates factual backup health calculations (HEALTHY, ATTENTION, NO_BACKUP_DATA),
 * latest backup dates, latest successful/failed verification timestamps, days since latest backup,
 * tenant isolation, read-only guarantees, and zero business-data mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  recordBackupAudit,
  getBackupHealthStatus,
} from '../server/businessBackup.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [ASSERT ${totalAssertions}] ${description}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ [FAIL ${totalAssertions}] ${description}`);
  }
}

async function runStage5FTests() {
  console.log('================================================================');
  console.log('STAGE 5F TEST SUITE: BACKUP HEALTH STATUS');
  console.log('================================================================\n');

  const bizEmpty = `biz_5f_empty_${Date.now()}`;
  const bizHealthy = `biz_5f_healthy_${Date.now()}`;
  const bizOld = `biz_5f_old_${Date.now()}`;
  const bizFailed = `biz_5f_failed_${Date.now()}`;
  const bizB = `biz_5f_b_${Date.now()}`;

  const owner: DBUser = {
    id: `usr_owner_5f_${Date.now()}`,
    fullName: 'Adwoa Health Owner',
    email: 'adwoa@health.gh',
    role: 'business_owner',
    businessId: bizHealthy,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ownerB: DBUser = {
    id: `usr_owner_5f_b_${Date.now()}`,
    fullName: 'Tenant B Owner',
    email: 'b@health.gh',
    role: 'business_owner',
    businessId: bizB,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('--- SECTION 1: NO_BACKUP_DATA Status ---');
  const healthEmpty = getBackupHealthStatus(bizEmpty);
  assert(typeof healthEmpty === 'object' && healthEmpty !== null, 'getBackupHealthStatus returns report object');
  assert(healthEmpty.status === 'NO_BACKUP_DATA', 'Status is NO_BACKUP_DATA when no backup history exists');
  assert(healthEmpty.latestBackupAt === null, 'latestBackupAt is null for empty business');
  assert(healthEmpty.daysSinceLatestBackup === null, 'daysSinceLatestBackup is null for empty business');
  assert(typeof healthEmpty.reason === 'string' && healthEmpty.reason.length > 0, 'Factual reason provided');

  console.log('--- SECTION 2: HEALTHY Status (Recent Backup & No Failures) ---');
  recordBackupAudit({
    businessId: bizHealthy,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 15,
    backupVersion: '1.0.0',
  });

  recordBackupAudit({
    businessId: bizHealthy,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 15,
    backupVersion: '1.0.0',
  });

  const healthHealthy = getBackupHealthStatus(bizHealthy);
  assert(healthHealthy.status === 'HEALTHY', 'Status is HEALTHY when backup created within 30 days and verified successfully');
  assert(typeof healthHealthy.latestBackupAt === 'string', 'latestBackupAt populated');
  assert(typeof healthHealthy.latestSuccessfulVerificationAt === 'string', 'latestSuccessfulVerificationAt populated');
  assert(healthHealthy.daysSinceLatestBackup === 0, 'daysSinceLatestBackup is 0 for recent backup');
  assert(healthHealthy.reason.includes('within the 30-day threshold'), 'Factual reason notes 30-day threshold');

  console.log('--- SECTION 3: ATTENTION Status (Old Backup > 30 Days) ---');
  const raw = (db as any).getRaw ? (db as any).getRaw() : (db as any).data;
  if (!raw.backup_audit_logs) raw.backup_audit_logs = [];

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const oldBackupRecord = {
    id: `baud_old_${Date.now()}`,
    businessId: bizOld,
    action: 'BACKUP_CREATED' as const,
    status: 'SUCCESS' as const,
    performedBy: owner.id,
    performedByName: owner.fullName,
    createdAt: new Date(now - 35 * dayMs).toISOString(), // 35 days ago
    recordCount: 10,
    backupVersion: '1.0.0',
  };

  raw.backup_audit_logs.push(oldBackupRecord);
  if ((db as any).saveData) (db as any).saveData();

  const healthOld = getBackupHealthStatus(bizOld);
  assert(healthOld.status === 'ATTENTION', 'Status is ATTENTION when latest successful backup is > 30 days old');
  assert(healthOld.daysSinceLatestBackup === 35, 'Correctly calculates 35 days since latest backup');
  assert(healthOld.reason.includes('35 days old'), 'Factual reason mentions exact age of backup');

  console.log('--- SECTION 4: ATTENTION Status (Latest Verification Failed) ---');
  recordBackupAudit({
    businessId: bizFailed,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 12,
    backupVersion: '1.0.0',
  });

  // Record a failed verification after the backup creation
  recordBackupAudit({
    businessId: bizFailed,
    action: 'BACKUP_VERIFY_FAILED',
    status: 'FAILED',
    performedBy: owner.id,
    performedByName: owner.fullName,
    failureReason: 'Cryptographic checksum mismatch.',
  });

  const healthFailed = getBackupHealthStatus(bizFailed);
  assert(healthFailed.status === 'ATTENTION', 'Status is ATTENTION when latest verification failed');
  assert(typeof healthFailed.latestFailedVerificationAt === 'string', 'latestFailedVerificationAt populated');
  assert(healthFailed.reason.includes('verification failed'), 'Factual reason notes verification failure');

  console.log('--- SECTION 5: Tenant Isolation & IDOR Protection ---');
  recordBackupAudit({
    businessId: bizB,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerB.id,
    performedByName: ownerB.fullName,
    recordCount: 8,
    backupVersion: '1.0.0',
  });

  const healthB = getBackupHealthStatus(bizB);
  assert(healthB.status === 'HEALTHY', 'Tenant B has independent HEALTHY status');
  const healthEmptyCheck = getBackupHealthStatus(bizEmpty);
  assert(healthEmptyCheck.status === 'NO_BACKUP_DATA', 'Tenant isolation: Empty business remains NO_BACKUP_DATA');

  console.log('--- SECTION 6: Read-Only Safety & Zero Business Mutation ---');
  // Seed a product & sale in bizHealthy
  db.addProduct({
    businessId: bizHealthy,
    name: 'Health Test Item',
    sku: 'HLTH-01',
    category: 'General',
    sellingPrice: 100,
    buyingPrice: 70,
    quantity: 5,
    minStockLevel: 1,
    unit: 'pcs',
  });

  const prodsBefore = db.getProducts(bizHealthy).length;
  const salesBefore = db.getSales(bizHealthy).length;

  // Run health check multiple times
  getBackupHealthStatus(bizHealthy);
  getBackupHealthStatus(bizHealthy);

  const prodsAfter = db.getProducts(bizHealthy).length;
  const salesAfter = db.getSales(bizHealthy).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after health checks');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after health checks');

  console.log('\n================================================================');
  console.log(`STAGE 5F TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5F TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5FTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
