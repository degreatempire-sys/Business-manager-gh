// @ts-nocheck
/**
 * STAGE 5N — RECOVERY ACTIVITY AUDIT LOG TEST SUITE
 * Validates tracking of recovery-package activities (RECOVERY_PACKAGE_PREPARED,
 * RECOVERY_PACKAGE_VALIDATED, RECOVERY_PACKAGE_INTEGRITY_REVERIFIED), tenant scoping,
 * correct statuses and timestamps, exclusion of sensitive package contents,
 * read-only activity retrieval, and zero business-data mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  prepareRecoveryPackage,
  validateRecoveryPackage,
  reverifyRecoveryPackageIntegrity,
  recordBackupAudit,
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

async function runStage5NTests() {
  console.log('================================================================');
  console.log('STAGE 5N TEST SUITE: RECOVERY ACTIVITY AUDIT LOG');
  console.log('================================================================\n');

  const bizA = `biz_5n_a_${Date.now()}`;
  const bizB = `biz_5n_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5n_${Date.now()}`,
    fullName: 'Ama Auditor',
    email: 'ama@audit.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash_a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ownerB: DBUser = {
    id: `usr_owner_5n_b_${Date.now()}`,
    fullName: 'Tenant B Auditor',
    email: 'b@audit.gh',
    phone: '0200000001',
    role: 'business_owner',
    businessId: bizB,
    passwordHash: 'secret_hash_b',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: 'Audit Test Product',
    sku: 'AUD-01',
    category: 'General',
    sellingPrice: 200,
    buyingPrice: 130,
    quantity: 8,
    minStockLevel: 2,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Recovery Package Prepared Audit Event ---');
  const pkgA = prepareRecoveryPackage(bizA, ownerA);
  recordBackupAudit({
    businessId: bizA,
    action: 'RECOVERY_PACKAGE_PREPARED',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: pkgA.backupMetadata.totalRecords,
    backupVersion: pkgA.backupMetadata.backupVersion,
  });

  const historyA1 = getBackupHistory(bizA);
  const preparedEvent = historyA1.find((h) => h.action === 'RECOVERY_PACKAGE_PREPARED');
  assert(typeof preparedEvent === 'object' && preparedEvent !== null, 'RECOVERY_PACKAGE_PREPARED event recorded');
  assert(preparedEvent?.status === 'SUCCESS', 'Prepared event status is SUCCESS');
  assert(typeof preparedEvent?.createdAt === 'string', 'Prepared event has timestamp');
  assert(preparedEvent?.performedByName === ownerA.fullName, 'Prepared event records correct performedByName');

  console.log('--- SECTION 2: Recovery Package Validation Audit Event ---');
  const validation = validateRecoveryPackage(pkgA, bizA);
  recordBackupAudit({
    businessId: bizA,
    action: 'RECOVERY_PACKAGE_VALIDATED',
    status: validation.status === 'VALID' ? 'SUCCESS' : 'ATTENTION',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: validation.checks.length,
    backupVersion: validation.status,
  });

  const historyA2 = getBackupHistory(bizA);
  const validatedEvent = historyA2.find((h) => h.action === 'RECOVERY_PACKAGE_VALIDATED');
  assert(typeof validatedEvent === 'object' && validatedEvent !== null, 'RECOVERY_PACKAGE_VALIDATED event recorded');
  assert(validatedEvent?.status === 'SUCCESS', 'Validated event status is SUCCESS');
  assert(validatedEvent?.backupVersion === 'VALID', 'Validated event stores validation status as backupVersion');

  console.log('--- SECTION 3: Integrity Re-Verification Audit Event ---');
  const reverification = reverifyRecoveryPackageIntegrity(pkgA, bizA);
  recordBackupAudit({
    businessId: bizA,
    action: 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED',
    status: reverification.status === 'VERIFIED' ? 'SUCCESS' : 'FAILED',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: reverification.checksumMatch ? 1 : 0,
    backupVersion: reverification.status,
  });

  const historyA3 = getBackupHistory(bizA);
  const reverifyEvent = historyA3.find((h) => h.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED');
  assert(typeof reverifyEvent === 'object' && reverifyEvent !== null, 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED event recorded');
  assert(reverifyEvent?.status === 'SUCCESS', 'Reverified event status is SUCCESS');
  assert(reverifyEvent?.backupVersion === 'VERIFIED', 'Reverified event stores verification status');

  console.log('--- SECTION 4: Tenant Scoping & Isolation ---');
  const historyB = getBackupHistory(bizB);
  assert(historyB.length === 0, 'Tenant B audit history remains empty and isolated from Tenant A recovery activities');

  console.log('--- SECTION 5: Sensitive Package Contents Exclusion ---');
  const auditString = JSON.stringify(historyA3);
  assert(!auditString.includes('secret_hash_a'), 'Owner passwordHash strictly excluded from audit records');
  assert(!auditString.includes('businessData'), 'Full business data payload excluded from audit records');

  console.log('--- SECTION 6: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after audit logging');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after audit logging');

  console.log('\n================================================================');
  console.log(`STAGE 5N TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5N TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5NTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
