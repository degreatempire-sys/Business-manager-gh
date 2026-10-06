// @ts-nocheck
/**
 * STAGE 5I — BACKUP RECOVERY ACTION GUIDE TEST SUITE
 * Validates deterministic recovery action guide mapping for READY, ATTENTION,
 * NOT_READY, and NO_BACKUP_DATA states, summaries, prioritized action items,
 * tenant isolation, read-only behavior, and zero business-data mutation.
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

async function runStage5ITests() {
  console.log('================================================================');
  console.log('STAGE 5I TEST SUITE: BACKUP RECOVERY ACTION GUIDE');
  console.log('================================================================\n');

  const bizNoData = `biz_5i_nd_${Date.now()}`;
  const bizReady = `biz_5i_r_${Date.now()}`;
  const bizAttention = `biz_5i_att_${Date.now()}`;
  const bizB = `biz_5i_b_${Date.now()}`;

  const owner: DBUser = {
    id: `usr_owner_5i_${Date.now()}`,
    fullName: 'Kofi Guide Owner',
    email: 'kofi@guide.gh',
    role: 'business_owner',
    businessId: bizReady,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ownerB: DBUser = {
    id: `usr_owner_5i_b_${Date.now()}`,
    fullName: 'Tenant B Owner',
    email: 'b@guide.gh',
    role: 'business_owner',
    businessId: bizB,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('--- SECTION 1: NO_BACKUP_DATA / NOT_READY Action Guide ---');
  const reportNoData = getBackupHealthStatus(bizNoData);
  assert(typeof reportNoData.recoveryActionGuide === 'object', 'recoveryActionGuide report object present');
  assert(typeof reportNoData.recoveryActionGuide.summary === 'string', 'Action guide summary is a string');
  assert(reportNoData.recoveryActionGuide.summary.includes('No backup data'), 'Summary correctly states no backup data available');
  assert(Array.isArray(reportNoData.recoveryActionGuide.actions), 'Actions array is present');
  assert(reportNoData.recoveryActionGuide.actions.length > 0, 'At least one action is suggested');
  assert(
    reportNoData.recoveryActionGuide.actions.some((a) => a.text.toLowerCase().includes('backup')),
    'Action suggests creating a business backup'
  );
  assert(reportNoData.recoveryActionGuide.actions[0].completed === false, 'Action is marked incomplete');
  assert(reportNoData.recoveryActionGuide.actions[0].priority === 'high', 'Action priority is high');

  console.log('--- SECTION 2: READY Action Guide ---');
  recordBackupAudit({
    businessId: bizReady,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 40,
    backupVersion: '1.0.0',
  });

  recordBackupAudit({
    businessId: bizReady,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 40,
    backupVersion: '1.0.0',
  });

  const reportReady = getBackupHealthStatus(bizReady);
  assert(reportReady.recoveryReadiness.status === 'READY', 'Readiness is READY');
  assert(reportReady.recoveryActionGuide.summary.includes('readiness is good'), 'Summary states readiness is good');
  assert(reportReady.recoveryActionGuide.actions.length > 0, 'Actions array present for READY');
  assert(reportReady.recoveryActionGuide.actions[0].completed === true, 'READY action is marked completed');

  console.log('--- SECTION 3: ATTENTION Action Guide ---');
  recordBackupAudit({
    businessId: bizAttention,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: owner.id,
    performedByName: owner.fullName,
    recordCount: 10,
    backupVersion: '1.0.0',
  });
  // No verification recorded -> triggers attention on verification check

  const reportAtt = getBackupHealthStatus(bizAttention);
  assert(reportAtt.recoveryReadiness.status === 'ATTENTION', 'Readiness is ATTENTION');
  assert(reportAtt.recoveryActionGuide.summary.includes('requirements need attention'), 'Summary states requirements need attention');
  assert(reportAtt.recoveryActionGuide.actions.length > 0, 'Actions array present for ATTENTION');
  assert(
    reportAtt.recoveryActionGuide.actions.some((a) => a.text.toLowerCase().includes('verify')),
    'Action suggests verifying backup'
  );

  console.log('--- SECTION 4: Tenant Isolation & Deterministic Mapping ---');
  recordBackupAudit({
    businessId: bizB,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerB.id,
    performedByName: ownerB.fullName,
    recordCount: 18,
    backupVersion: '1.0.0',
  });
  recordBackupAudit({
    businessId: bizB,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: ownerB.id,
    performedByName: ownerB.fullName,
    recordCount: 18,
    backupVersion: '1.0.0',
  });

  const reportB = getBackupHealthStatus(bizB);
  assert(reportB.recoveryActionGuide.summary.includes('readiness is good'), 'Tenant B has independent READY action guide');
  const reportNoDataCheck = getBackupHealthStatus(bizNoData);
  assert(reportNoDataCheck.recoveryActionGuide.summary.includes('No backup data'), 'Tenant isolation: No data guide preserved');

  console.log('--- SECTION 5: Zero Business Data Mutation Guarantee ---');
  db.addProduct({
    businessId: bizReady,
    name: 'Guide Guard Item',
    sku: 'GDE-01',
    category: 'General',
    sellingPrice: 200,
    buyingPrice: 130,
    quantity: 5,
    minStockLevel: 1,
    unit: 'pcs',
  });

  const prodsBefore = db.getProducts(bizReady).length;
  const salesBefore = db.getSales(bizReady).length;

  getBackupHealthStatus(bizReady);
  getBackupHealthStatus(bizNoData);

  const prodsAfter = db.getProducts(bizReady).length;
  const salesAfter = db.getSales(bizReady).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after action guide generation');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after action guide generation');

  console.log('\n================================================================');
  console.log(`STAGE 5I TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5I TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5ITests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
