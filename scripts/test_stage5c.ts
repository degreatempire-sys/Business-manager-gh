// @ts-nocheck
/**
 * STAGE 5C — BUSINESS BACKUP & RECOVERY READINESS TEST SUITE
 * Validates structured backup package creation, all 10 record sections, metadata,
 * SHA-256 cryptographic checksum calculation, integrity verification, tampered backup rejection,
 * version enforcement, tenant isolation, sensitive-field exclusion, and zero business mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_VERSION,
  BACKUP_SECTIONS,
  createBusinessBackup,
  verifyBusinessBackup,
  computePayloadChecksum,
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

async function runStage5CTests() {
  console.log('================================================================');
  console.log('STAGE 5C TEST SUITE: BUSINESS BACKUP & RECOVERY READINESS');
  console.log('================================================================\n');

  const bizA = `biz_5c_a_${Date.now()}`;
  const bizB = `biz_5c_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5c_${Date.now()}`,
    fullName: 'Kweku Owner A',
    email: 'kweku@backup.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_owner_password_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_5c_${Date.now()}`,
    fullName: 'Staff Member',
    email: 'staff@backup.gh',
    role: 'staff',
    businessId: bizA,
    passwordHash: 'staff_hash',
    permissions: {
      dashboard: true,
      financial_reports: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed baseline data for Business A across multiple categories
  db.addProduct({
    businessId: bizA,
    name: 'Backup Rice Bag',
    sku: 'BCK-RICE-01',
    category: 'Grains',
    sellingPrice: 150,
    buyingPrice: 110,
    quantity: 25,
    minStockLevel: 5,
    unit: 'bag',
  });

  db.addCustomer({
    businessId: bizA,
    name: 'Backup Customer Esi',
    phone: '0241119988',
    email: 'esi@backup.gh',
    address: 'East Legon',
    creditLimit: 800,
    debtAmount: 200,
  });

  db.createSale({
    businessId: bizA,
    items: [],
    subtotal: 300,
    total: 300,
    tax: 0,
    paymentMethod: 'Mobile Money',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  db.addExpense({
    businessId: bizA,
    category: 'Rent',
    amount: 1200,
    notes: 'Shop monthly rent',
    date: new Date().toISOString().split('T')[0],
    recordedBy: ownerA.id,
  });

  db.saveBusinessGoal({
    id: `goal_5c_${Date.now()}`,
    businessId: bizA,
    createdBy: ownerA.id,
    name: 'Q4 Revenue Target',
    type: 'revenue',
    targetValue: 80000,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  db.saveBusinessDecision({
    id: `dec_5c_${Date.now()}`,
    businessId: bizA,
    tenantId: bizA,
    title: 'Install solar backup power',
    description: 'Ensure continuity during outages',
    category: 'Operations',
    priority: 'HIGH',
    status: 'OPEN',
    createdBy: ownerA.id,
    createdAt: new Date().toISOString(),
  });

  // Seed baseline for Business B (Tenant Isolation)
  db.addProduct({
    businessId: bizB,
    name: 'Tenant B Sole Product',
    sku: 'BIZ-B-SOLO',
    category: 'Exclusive',
    sellingPrice: 500,
    buyingPrice: 350,
    quantity: 10,
    minStockLevel: 2,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Backup Package Creation & Structure ---');
  const backup = createBusinessBackup(bizA, ownerA);
  assert(typeof backup === 'object' && backup !== null, 'createBusinessBackup returns structured object');
  assert(typeof backup.metadata === 'object', 'Backup includes metadata block');
  assert(typeof backup.payload === 'object', 'Backup includes payload block');
  assert(typeof backup.checksum === 'string' && backup.checksum.length === 64, 'Backup includes 64-char SHA-256 checksum');

  console.log('--- SECTION 2: Record Sections Verification (All 10 Sections) ---');
  assert(BACKUP_SECTIONS.length === 10, 'Backup supports exactly 10 canonical record sections');
  for (const sec of BACKUP_SECTIONS) {
    assert(Array.isArray(backup.payload[sec]), `Payload contains section array: "${sec}"`);
    assert(
      backup.metadata.recordCounts[sec] === backup.payload[sec].length,
      `Metadata record count accurately matches array length for "${sec}"`
    );
  }

  console.log('--- SECTION 3: Metadata Standards & Versioning ---');
  assert(backup.metadata.formatVersion === BACKUP_FORMAT_VERSION, 'Metadata formatVersion is BMGH_BACKUP_V1');
  assert(backup.metadata.backupVersion === BACKUP_VERSION, 'Metadata backupVersion is 1.0.0');
  assert(backup.metadata.businessId === bizA, 'Metadata businessId matches owner tenant');
  assert(typeof backup.metadata.createdAt === 'string', 'Metadata createdAt timestamp is present');
  assert(backup.metadata.totalRecords > 0, 'Total records count is greater than 0');
  assert(
    backup.metadata.totalRecords ===
      Object.values(backup.metadata.recordCounts).reduce((a, b) => a + b, 0),
    'Total records matches sum of all individual section counts'
  );

  console.log('--- SECTION 4: Cryptographic Checksum & Payload Integrity ---');
  const expectedChecksum = computePayloadChecksum(backup.payload);
  assert(backup.checksum === expectedChecksum, 'Payload checksum matches freshly computed SHA-256 hash');

  console.log('--- SECTION 5: Valid Backup Verification ---');
  const validResult = verifyBusinessBackup(backup, bizA);
  assert(validResult.valid === true, 'Verification succeeds for unaltered, authentic backup');
  assert(validResult.errors.length === 0, 'Verification returns zero errors');
  assert(validResult.summary !== undefined, 'Verification summary details populated');
  assert(validResult.summary?.totalRecords === backup.metadata.totalRecords, 'Verified summary reflects record total');
  assert(validResult.summary?.businessId === bizA, 'Verified summary reflects tenant');

  console.log('--- SECTION 6: Tampered Payload & Checksum Mismatch Detection ---');
  // Tamper by altering a product price in the payload
  const tamperedBackup = JSON.parse(JSON.stringify(backup));
  if (tamperedBackup.payload.products.length > 0) {
    tamperedBackup.payload.products[0].price = 999999;
  }
  const tamperedResult = verifyBusinessBackup(tamperedBackup, bizA);
  assert(tamperedResult.valid === false, 'Tampered payload is strictly rejected');
  assert(
    tamperedResult.errors.some((e) => e.includes('Cryptographic checksum mismatch')),
    'Integrity verification correctly detects checksum mismatch'
  );

  // Tamper by forging the checksum
  const forgedChecksumBackup = JSON.parse(JSON.stringify(backup));
  forgedChecksumBackup.checksum = '0000000000000000000000000000000000000000000000000000000000000000';
  const forgedResult = verifyBusinessBackup(forgedChecksumBackup, bizA);
  assert(forgedResult.valid === false, 'Forged checksum is rejected');

  console.log('--- SECTION 7: Unsupported Versions & Structural Errors ---');
  // Unsupported format version
  const badFormatBackup = JSON.parse(JSON.stringify(backup));
  badFormatBackup.metadata.formatVersion = 'LEGACY_V0';
  badFormatBackup.checksum = computePayloadChecksum(badFormatBackup.payload);
  const badFormatResult = verifyBusinessBackup(badFormatBackup, bizA);
  assert(badFormatResult.valid === false, 'Unsupported formatVersion rejected');
  assert(badFormatResult.errors.some((e) => e.includes('Unsupported backup format')), 'Error details unsupported format');

  // Unsupported backup version
  const badVersionBackup = JSON.parse(JSON.stringify(backup));
  badVersionBackup.metadata.backupVersion = '9.9.9';
  badVersionBackup.checksum = computePayloadChecksum(badVersionBackup.payload);
  const badVersionResult = verifyBusinessBackup(badVersionBackup, bizA);
  assert(badVersionResult.valid === false, 'Unsupported backupVersion rejected');
  assert(badVersionResult.errors.some((e) => e.includes('Unsupported backup version')), 'Error details unsupported version');

  // Corrupted section: section missing
  const missingSectionBackup = JSON.parse(JSON.stringify(backup));
  delete missingSectionBackup.payload.sales;
  missingSectionBackup.checksum = computePayloadChecksum(missingSectionBackup.payload);
  const missingSectionResult = verifyBusinessBackup(missingSectionBackup, bizA);
  assert(missingSectionResult.valid === false, 'Missing section rejected');

  // Record count mismatch in metadata
  const countMismatchBackup = JSON.parse(JSON.stringify(backup));
  countMismatchBackup.metadata.recordCounts.products = 999;
  const countMismatchResult = verifyBusinessBackup(countMismatchBackup, bizA);
  assert(countMismatchResult.valid === false, 'Record count mismatch rejected');

  console.log('--- SECTION 8: Tenant Isolation & IDOR Protection ---');
  // Verification for business A with a backup from business B
  const backupB = createBusinessBackup(bizB, ownerA);
  const crossTenantResult = verifyBusinessBackup(backupB, bizA);
  assert(crossTenantResult.valid === false, 'Cross-tenant backup verification rejected with tenant mismatch');
  assert(
    crossTenantResult.errors.some((e) => e.includes('Tenant mismatch')),
    'Tenant mismatch explicitly identified'
  );

  // Business A backup must not contain Business B products
  const bizAProductNames = backup.payload.products.map((p) => p.name);
  assert(
    !bizAProductNames.includes('Tenant B Sole Product'),
    'Business A backup strictly excludes Business B data (Tenant Isolation)'
  );

  console.log('--- SECTION 9: Sensitive-Field Exclusion & Financial Privacy ---');
  const serializedBackup = JSON.stringify(backup);
  assert(!serializedBackup.includes('secret_owner_password_hash'), 'Owner passwordHash strictly excluded from backup');
  assert(!serializedBackup.includes('passwordHash'), 'No passwordHash key present in backup package');
  assert(!serializedBackup.includes('accessToken'), 'No auth tokens present in backup package');

  // Restricted staff backup masks cost prices
  const staffBackup = createBusinessBackup(bizA, restrictedStaffA);
  assert(
    staffBackup.payload.products.every((p) => p.costPrice === 0),
    'Staff without profit permission has cost prices masked to 0 in backup'
  );

  console.log('--- SECTION 10: Zero Business-Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;
  const custsBefore = db.getCustomers(bizA).length;
  const expBefore = db.getExpenses(bizA).length;

  // Run creation and verification multiple times
  createBusinessBackup(bizA, ownerA);
  verifyBusinessBackup(backup, bizA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;
  const custsAfter = db.getCustomers(bizA).length;
  const expAfter = db.getExpenses(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after backup operations');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after backup operations');
  assert(custsBefore === custsAfter, 'Customers count completely unchanged after backup operations');
  assert(expBefore === expAfter, 'Expenses count completely unchanged after backup operations');

  console.log('\n================================================================');
  console.log(`STAGE 5C TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5C TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5CTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
