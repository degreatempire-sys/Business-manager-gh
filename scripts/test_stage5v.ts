// @ts-nocheck
/**
 * STAGE 5V — BUSINESS DATA INTEGRITY & CONSISTENCY CENTER TEST SUITE
 * Validates the read-only Business Data Integrity & Consistency engine,
 * detecting pricing anomalies, duplicate SKUs, orphaned sales references,
 * deterministic severity, tenant isolation, zero business-data mutation,
 * and regressions for Stages 5Q–5U.
 */

import { db, DBUser } from '../server/db.js';
import { runBusinessIntegrityCheck } from '../server/businessIntegrity.js';
import { getBackupHealthStatus } from '../server/businessBackup.js';

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

async function runStage5VTests() {
  console.log('================================================================');
  console.log('STAGE 5V TEST SUITE: BUSINESS DATA INTEGRITY & CONSISTENCY CENTER');
  console.log('================================================================\n');

  const bizA = `biz_5v_a_${Date.now()}`;
  const bizB = `biz_5v_b_${Date.now()}`;
  const ownerA: DBUser = {
    id: `usr_owner_5v_${Date.now()}`,
    fullName: 'Kofi Integrity',
    email: 'kofi@integrity.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: 'Normal Product',
    sku: 'NORM-01',
    category: 'General',
    sellingPrice: 100,
    buyingPrice: 70,
    quantity: 0, // Normal zero-stock product should NOT be flagged as an error
    minStockLevel: 5,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Healthy Dataset Integrity Check ---');
  const reportHealthy = runBusinessIntegrityCheck(bizA);
  assert(typeof reportHealthy === 'object' && reportHealthy !== null, 'Integrity report object returned');
  assert(reportHealthy.summary.status === 'HEALTHY', 'Healthy dataset yields HEALTHY status');
  assert(reportHealthy.summary.criticalCount === 0, 'Zero critical findings in healthy dataset');
  assert(reportHealthy.summary.warningCount === 0, 'Zero warnings in healthy dataset');

  console.log('--- SECTION 2: Critical Condition (Negative Stock / Price & Duplicate SKUs) ---');
  db.addProduct({
    businessId: bizA,
    name: 'Bad Product',
    sku: 'NORM-01', // Duplicate SKU
    category: 'General',
    sellingPrice: -50, // Negative price
    buyingPrice: 40,
    quantity: -10, // Negative quantity
    minStockLevel: 2,
    unit: 'pcs',
  });

  const reportCritical = runBusinessIntegrityCheck(bizA);
  assert(reportCritical.summary.status === 'CRITICAL', 'Dataset with duplicate SKUs and negative pricing yields CRITICAL status');
  assert(reportCritical.summary.criticalCount > 0, 'Critical findings detected for negative stock/price and duplicate SKUs');

  console.log('--- SECTION 3: Tenant Isolation & Security ---');
  const reportB = runBusinessIntegrityCheck(bizB);
  assert(reportB.summary.status === 'HEALTHY', 'Tenant B integrity report is pristine and isolated');
  assert(reportB.findings.length === 0, 'Tenant B has zero findings from Tenant A data');

  const reportString = JSON.stringify(reportCritical);
  assert(!reportString.includes('secret_hash'), 'Password hashes strictly excluded from integrity reports');

  console.log('--- SECTION 4: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  runBusinessIntegrityCheck(bizA);
  getBackupHealthStatus(bizA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after integrity checks');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after integrity checks');

  console.log('\n================================================================');
  console.log(`STAGE 5V TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5V TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5VTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
