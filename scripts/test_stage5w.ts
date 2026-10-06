// @ts-nocheck
/**
 * STAGE 5W — BUSINESS DATA QUALITY & CLEANUP GUIDANCE TEST SUITE
 * Validates the read-only data quality and cleanup guidance layer, ensuring findings
 * include deterministic guidance status, "why it matters", and recommended action,
 * without duplicating integrity engines, mutating records, or violating tenant isolation.
 */

import { db, DBUser } from '../server/db.js';
import { runBusinessIntegrityCheck } from '../server/businessIntegrity.js';

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

async function runStage5WTests() {
  console.log('================================================================');
  console.log('STAGE 5W TEST SUITE: DATA QUALITY & CLEANUP GUIDANCE');
  console.log('================================================================\n');

  const bizA = `biz_5w_a_${Date.now()}`;
  const bizB = `biz_5w_b_${Date.now()}`;
  const ownerA: DBUser = {
    id: `usr_owner_5w_${Date.now()}`,
    fullName: 'Ama Guidance',
    email: 'ama@guidance.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addProduct({
    businessId: bizA,
    name: '', // Missing name -> Missing product identification finding
    sku: 'DUP-01',
    category: 'General',
    sellingPrice: -10, // Invalid pricing -> Product stock & pricing validity finding
    buyingPrice: 50,
    quantity: 10,
    minStockLevel: 2,
    unit: 'pcs',
  });

  db.addProduct({
    businessId: bizA,
    name: 'Duplicate SKU Item',
    sku: 'DUP-01', // Duplicate SKU finding
    category: 'General',
    sellingPrice: 120,
    buyingPrice: 80,
    quantity: 5,
    minStockLevel: 1,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Guidance Generation for Integrity Findings ---');
  const report = runBusinessIntegrityCheck(bizA);
  assert(typeof report === 'object' && report !== null, '[1] Integrity report object returned');
  assert(report.findings.length >= 3, '[2] Multiple findings detected correctly');

  for (const f of report.findings) {
    assert(typeof f.guidanceStatus === 'string' && ['REVIEW', 'ACTION_RECOMMENDED', 'INFORMATIONAL'].includes(f.guidanceStatus), `[3] Finding "${f.checkName}" has valid guidanceStatus "${f.guidanceStatus}"`);
    assert(typeof f.whyItMatters === 'string' && f.whyItMatters.length > 0, `[4] Finding "${f.checkName}" includes "why it matters" explanation`);
    assert(typeof f.recommendedAction === 'string' && f.recommendedAction.length > 0, `[5] Finding "${f.checkName}" includes recommended action`);
  }

  const pricingFinding = report.findings.find((f) => f.checkName === 'Product Stock & Pricing Validity');
  assert(pricingFinding !== undefined, '[6] Pricing validity finding present');
  assert(pricingFinding?.guidanceStatus === 'ACTION_RECOMMENDED', '[7] Pricing validity guidance status is ACTION_RECOMMENDED');

  const namingFinding = report.findings.find((f) => f.checkName === 'Product Identification Completeness');
  assert(namingFinding !== undefined, '[8] Product identification completeness finding present');
  assert(namingFinding?.guidanceStatus === 'REVIEW', '[9] Product identification guidance status is REVIEW');

  const skuFinding = report.findings.find((f) => f.checkName === 'Product SKU Uniqueness');
  assert(skuFinding !== undefined, '[10] SKU uniqueness finding present');
  assert(skuFinding?.guidanceStatus === 'ACTION_RECOMMENDED', '[11] SKU uniqueness guidance status is ACTION_RECOMMENDED');

  console.log('--- SECTION 2: Tenant Isolation & Security ---');
  const reportB = runBusinessIntegrityCheck(bizB);
  assert(reportB.findings.length === 0, '[12] Tenant B has zero findings and zero cross-tenant contamination');

  const reportString = JSON.stringify(report);
  assert(!reportString.includes('secret_hash'), '[13] Password hashes strictly excluded from guidance output');

  console.log('--- SECTION 3: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;

  runBusinessIntegrityCheck(bizA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;

  assert(prodsBefore === prodsAfter, '[14] Products count completely unchanged after guidance generation');
  assert(salesBefore === salesAfter, '[15] Sales count completely unchanged after guidance generation');

  console.log('\n================================================================');
  console.log(`STAGE 5W TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5W TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5WTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
