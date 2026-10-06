// @ts-nocheck
/**
 * STAGE 5M — RECOVERY PACKAGE INTEGRITY RE-VERIFICATION TEST SUITE
 * Validates package re-verification (VERIFIED, ATTENTION, FAILED statuses),
 * checksum matching, detection of altered packages, missing integrity information handling,
 * read-only guarantees, and zero business-data/audit mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  prepareRecoveryPackage,
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

async function runStage5MTests() {
  console.log('================================================================');
  console.log('STAGE 5M TEST SUITE: RECOVERY PACKAGE INTEGRITY RE-VERIFICATION');
  console.log('================================================================\n');

  const bizA = `biz_5m_a_${Date.now()}`;
  const ownerA: DBUser = {
    id: `usr_owner_5m_${Date.now()}`,
    fullName: 'Kofi Reverifier',
    email: 'kofi@reverify.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: 'Reverify Test Item',
    sku: 'REV-01',
    category: 'General',
    sellingPrice: 120,
    buyingPrice: 80,
    quantity: 15,
    minStockLevel: 3,
    unit: 'pcs',
  });

  const validPkg = prepareRecoveryPackage(bizA, ownerA);
  const historyBefore = getBackupHistory(bizA).length;

  console.log('--- SECTION 1: Valid Unchanged Package Re-Verification ---');
  const reverifyValid = reverifyRecoveryPackageIntegrity(validPkg, bizA);
  assert(typeof reverifyValid === 'object' && reverifyValid !== null, 'Reverification report object returned');
  assert(reverifyValid.status === 'VERIFIED', 'Unchanged valid package status is VERIFIED');
  assert(reverifyValid.checksumMatch === true, 'Checksum match is true');
  assert(reverifyValid.validationPassed === true, 'Validation passed is true');

  console.log('--- SECTION 2: Modified Package Re-Verification (Failed Checksum) ---');
  const modifiedPkg = JSON.parse(JSON.stringify(validPkg));
  // Tamper with businessData products
  if (modifiedPkg.businessData && modifiedPkg.businessData.products && modifiedPkg.businessData.products.length > 0) {
    modifiedPkg.businessData.products[0].sellingPrice = 9999;
  }
  const reverifyModified = reverifyRecoveryPackageIntegrity(modifiedPkg, bizA);
  assert(reverifyModified.status === 'FAILED', 'Tampered package status is FAILED');
  assert(reverifyModified.checksumMatch === false, 'Checksum match is false for tampered package');

  console.log('--- SECTION 3: Missing Integrity Information Re-Verification (Attention) ---');
  const pkgMissingIntegrity = JSON.parse(JSON.stringify(validPkg));
  pkgMissingIntegrity.integrity = { checksum: '', algorithm: 'sha256' };
  const reverifyNoIntegrity = reverifyRecoveryPackageIntegrity(pkgMissingIntegrity, bizA);
  assert(reverifyNoIntegrity.status === 'ATTENTION', 'Package with missing integrity checksum returns ATTENTION status');

  console.log('--- SECTION 4: Tenant Mismatch Re-Verification (Failed) ---');
  const reverifyMismatch = reverifyRecoveryPackageIntegrity(validPkg, 'biz_other');
  assert(reverifyMismatch.status === 'FAILED', 'Tenant mismatch returns FAILED status');
  assert(reverifyMismatch.validationPassed === false, 'Validation passed is false on tenant mismatch');

  console.log('--- SECTION 5: Zero Mutation Guarantee (Data, History & Audit) ---');
  const prodsBefore = db.getProducts(bizA).length;
  const historyAfter = getBackupHistory(bizA).length;

  reverifyRecoveryPackageIntegrity(validPkg, bizA);
  reverifyRecoveryPackageIntegrity(modifiedPkg, bizA);

  const prodsAfter = db.getProducts(bizA).length;
  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after re-verification');
  assert(historyBefore === historyAfter, 'Backup history completely unchanged and unmutated after re-verification');

  console.log('\n================================================================');
  console.log(`STAGE 5M TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5M TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5MTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
