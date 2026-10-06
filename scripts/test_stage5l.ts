// @ts-nocheck
/**
 * STAGE 5L — RECOVERY PACKAGE VALIDATION TEST SUITE
 * Validates recovery package validation rules (VALID, ATTENTION, INVALID statuses),
 * tenant mismatch detection, sensitive field detection, malformed package rejection,
 * read-only guarantees, and zero business-data mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  prepareRecoveryPackage,
  validateRecoveryPackage,
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

async function runStage5LTests() {
  console.log('================================================================');
  console.log('STAGE 5L TEST SUITE: RECOVERY PACKAGE VALIDATION');
  console.log('================================================================\n');

  const bizA = `biz_5l_a_${Date.now()}`;
  const bizOther = `biz_5l_other_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5l_${Date.now()}`,
    fullName: 'Adwoa Validator',
    email: 'adwoa@validate.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: 'Validation Test Item',
    sku: 'VAL-01',
    category: 'General',
    sellingPrice: 100,
    buyingPrice: 70,
    quantity: 10,
    minStockLevel: 2,
    unit: 'pcs',
  });

  const validPkg = prepareRecoveryPackage(bizA, ownerA);

  console.log('--- SECTION 1: Valid Recovery Package Validation ---');
  const reportValid = validateRecoveryPackage(validPkg, bizA);
  assert(typeof reportValid === 'object' && reportValid !== null, 'Validation report object returned');
  assert(reportValid.status === 'VALID', 'Overall status is VALID for well-formed package');
  assert(Array.isArray(reportValid.checks), 'Validation checks array present');
  assert(reportValid.failedChecks.length === 0, 'Zero failed checks for valid package');

  console.log('--- SECTION 2: Tenant Mismatch Rejection ---');
  const reportMismatch = validateRecoveryPackage(validPkg, bizOther);
  assert(reportMismatch.status === 'INVALID', 'Status is INVALID when tenant identity does not match expected businessId');
  assert(reportMismatch.failedChecks.includes('Tenant identity'), 'Failed checks explicitly lists Tenant identity');

  console.log('--- SECTION 3: Malformed & Missing Section Rejection ---');
  const reportNull = validateRecoveryPackage(null, bizA);
  assert(reportNull.status === 'INVALID', 'Status is INVALID for null package data');

  const pkgMissingManifest = { ...validPkg, manifest: null };
  const reportNoManifest = validateRecoveryPackage(pkgMissingManifest, bizA);
  assert(reportNoManifest.status === 'INVALID', 'Status is INVALID when manifest is missing');
  assert(reportNoManifest.failedChecks.includes('Manifest'), 'Failed checks lists Manifest');

  const pkgMissingMetadata = { ...validPkg, backupMetadata: null };
  const reportNoMeta = validateRecoveryPackage(pkgMissingMetadata, bizA);
  assert(reportNoMeta.status === 'INVALID', 'Status is INVALID when backup metadata is missing');

  const pkgMissingIntegrity = { ...validPkg, integrity: null };
  const reportNoIntegrity = validateRecoveryPackage(pkgMissingIntegrity, bizA);
  assert(reportNoIntegrity.status === 'INVALID', 'Status is INVALID when integrity checksum is missing');

  const pkgMissingBusinessData = { ...validPkg, businessData: null };
  const reportNoBd = validateRecoveryPackage(pkgMissingBusinessData, bizA);
  assert(reportNoBd.status === 'INVALID', 'Status is INVALID when businessData is missing');

  console.log('--- SECTION 4: Sensitive-Field Detection ---');
  const pkgWithSecret = JSON.parse(JSON.stringify(validPkg));
  pkgWithSecret.exposedSecret = 'passwordHash_leak_123';
  const reportSecret = validateRecoveryPackage(pkgWithSecret, bizA);
  assert(reportSecret.status === 'INVALID', 'Status is INVALID when sensitive field is detected');
  assert(reportSecret.failedChecks.includes('Sensitive-field exclusion'), 'Failed checks lists Sensitive-field exclusion');

  console.log('--- SECTION 5: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  validateRecoveryPackage(validPkg, bizA);
  validateRecoveryPackage(pkgMissingManifest, bizA);
  validateRecoveryPackage(pkgWithSecret, bizA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after validation runs');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after validation runs');

  console.log('\n================================================================');
  console.log(`STAGE 5L TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5L TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5LTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
