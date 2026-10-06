// @ts-nocheck
/**
 * STAGE 5K — BACKUP RECOVERY PACKAGE PREPARATION TEST SUITE
 * Validates recovery package structure, manifest, backup metadata, integrity checksums,
 * verification status, recovery readiness, recovery summary, backup history metadata,
 * business data sections, sensitive-field exclusion, read-only behavior, tenant scoping,
 * and zero business data mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  recordBackupAudit,
  prepareRecoveryPackage,
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

async function runStage5KTests() {
  console.log('================================================================');
  console.log('STAGE 5K TEST SUITE: BACKUP RECOVERY PACKAGE PREPARATION');
  console.log('================================================================\n');

  const bizA = `biz_5k_a_${Date.now()}`;
  const bizB = `biz_5k_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5k_${Date.now()}`,
    fullName: 'Yaw Package Owner',
    email: 'yaw@package.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash_a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ownerB: DBUser = {
    id: `usr_owner_5k_b_${Date.now()}`,
    fullName: 'Tenant B Owner',
    email: 'b@package.gh',
    phone: '0200000001',
    role: 'business_owner',
    businessId: bizB,
    passwordHash: 'secret_hash_b',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed sample products and sales for Tenant A
  db.addProduct({
    businessId: bizA,
    name: 'Recovery Test Product',
    sku: 'REC-01',
    category: 'General',
    sellingPrice: 150,
    buyingPrice: 100,
    quantity: 20,
    minStockLevel: 5,
    unit: 'pcs',
  });

  recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: 1,
    backupVersion: '1.0.0',
  });

  recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: 1,
    backupVersion: '1.0.0',
  });

  console.log('--- SECTION 1: Recovery Package Structure & Manifest ---');
  const pkgA = prepareRecoveryPackage(bizA, ownerA);
  assert(typeof pkgA === 'object' && pkgA !== null, 'prepareRecoveryPackage returns recovery package object');
  assert(typeof pkgA.manifest === 'object', 'Manifest object present');
  assert(pkgA.manifest.formatVersion === 'BMGH_RECOVERY_PACKAGE_V1', 'Format version is correct');
  assert(pkgA.manifest.packageVersion === '1.0.0', 'Package version is 1.0.0');
  assert(typeof pkgA.manifest.createdAt === 'string', 'Manifest timestamp present');
  assert(pkgA.manifest.businessId === bizA, 'Manifest businessId matches Tenant A');

  console.log('--- SECTION 2: Integrity & Checksum ---');
  assert(typeof pkgA.integrity === 'object', 'Integrity object present');
  assert(typeof pkgA.integrity.checksum === 'string' && pkgA.integrity.checksum.length === 64, 'SHA-256 checksum present (64 chars)');
  assert(pkgA.integrity.algorithm === 'sha256', 'Algorithm is sha256');

  console.log('--- SECTION 3: Verification, Readiness & Summary ---');
  assert(typeof pkgA.verification === 'object', 'Verification object present');
  assert(typeof pkgA.recoveryReadiness === 'object', 'Recovery readiness object present');
  assert(typeof pkgA.recoverySummary === 'object', 'Recovery summary object present');
  assert(pkgA.recoverySummary.readinessStatus === 'READY', 'Recovery summary shows READY status');

  console.log('--- SECTION 4: Backup History Metadata & Business Data ---');
  assert(Array.isArray(pkgA.backupHistory), 'Backup history array present');
  assert(pkgA.backupHistory.length >= 2, 'History contains audit events');
  assert(typeof pkgA.businessData === 'object', 'Business data payload present');
  assert(Array.isArray(pkgA.businessData.products), 'Business data includes products section');
  assert(pkgA.businessData.products.length === 1, 'Contains seeded product');

  console.log('--- SECTION 5: Sensitive Field Exclusion ---');
  const pkgStr = JSON.stringify(pkgA);
  assert(!pkgStr.includes('secret_hash_a'), 'Owner passwordHash strictly excluded from recovery package');
  assert(!pkgStr.includes('passwordHash'), 'No passwordHash key present in package');

  console.log('--- SECTION 6: Tenant Isolation ---');
  const pkgB = prepareRecoveryPackage(bizB, ownerB);
  assert(pkgB.manifest.businessId === bizB, 'Package B scoped strictly to Tenant B');
  assert(pkgB.businessData.products.length === 0, 'Package B excludes Tenant A products');

  console.log('--- SECTION 7: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  prepareRecoveryPackage(bizA, ownerA);
  prepareRecoveryPackage(bizB, ownerB);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after package preparation');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after package preparation');

  console.log('\n================================================================');
  console.log(`STAGE 5K TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5K TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5KTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
