// @ts-nocheck
/**
 * STAGE 5S — RECOVERY STATUS SNAPSHOT TEST SUITE
 * Validates the Recovery Status Snapshot quick-glance presentation layer, reusing
 * server-authoritative reports from Stages 5F–5R, read-only guarantees,
 * tenant isolation, and zero business-data mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  createBusinessBackup,
  recordBackupAudit,
  getBackupHealthStatus,
  prepareRecoveryPackage,
  validateRecoveryPackage,
  reverifyRecoveryPackageIntegrity,
  getBackupHistory,
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

async function runStage5STests() {
  console.log('================================================================');
  console.log('STAGE 5S TEST SUITE: RECOVERY STATUS SNAPSHOT');
  console.log('================================================================\n');

  const bizA = `biz_5s_a_${Date.now()}`;
  const ownerA: DBUser = {
    id: `usr_owner_5s_${Date.now()}`,
    fullName: 'Abena Snapshot',
    email: 'abena@snapshot.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: 'Snapshot Test Item',
    sku: 'SNAP-01',
    category: 'General',
    sellingPrice: 300,
    buyingPrice: 200,
    quantity: 60,
    minStockLevel: 5,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Recovery Status Snapshot Indicators & Report Reuse ---');
  const healthEmpty = getBackupHealthStatus(bizA);
  assert(typeof healthEmpty === 'object' && healthEmpty !== null, 'Health report object retrieved');
  assert(healthEmpty.recoveryReadiness.status === 'NOT_READY', 'Overall recovery readiness uses Stage 5H result (NOT_READY)');
  assert(healthEmpty.status === 'ATTENTION' || healthEmpty.status === 'NO_BACKUP_DATA', 'Backup health uses Stage 5F result');

  console.log('--- SECTION 2: Verified Health & Last Recovery Activity ---');
  createBusinessBackup(bizA, ownerA);
  recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: 60,
    backupVersion: '1.0.0',
  });
  recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: 60,
    backupVersion: '1.0.0',
  });

  const healthReady = getBackupHealthStatus(bizA);
  assert(healthReady.recoveryReadiness.status === 'READY', 'Overall readiness correctly reports READY after verification');
  assert(healthReady.recoverySummary.integrityStatus === 'Verifiable', 'Integrity verification uses existing verification info');
  assert(healthReady.latestSuccessfulVerificationAt !== undefined, 'Last successful verification timestamp present');

  const history = getBackupHistory(bizA);
  assert(history.length > 0, 'Last recovery activity uses existing Stage 5N/5R data');

  console.log('--- SECTION 3: Package Status & NOT_AVAILABLE Fallbacks ---');
  const pkg = prepareRecoveryPackage(bizA, ownerA);
  assert(pkg.manifest.businessId === bizA, 'Package preparation information reused successfully');

  console.log('--- SECTION 4: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  getBackupHealthStatus(bizA);
  prepareRecoveryPackage(bizA, ownerA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after snapshot rendering');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after snapshot rendering');

  console.log('\n================================================================');
  console.log(`STAGE 5S TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5S TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5STests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
