// @ts-nocheck
/**
 * STAGE 5D — BACKUP HISTORY & AUDIT TRAIL TEST SUITE
 * Validates recording and retrieval of backup audit logs, actions (BACKUP_CREATED,
 * BACKUP_VERIFY_SUCCESS, BACKUP_VERIFY_FAILED), statuses, failure reasons, newest-first ordering,
 * tenant isolation, sensitive-field exclusion, read-only guarantee, and zero business mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  createBusinessBackup,
  verifyBusinessBackup,
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

async function runStage5DTests() {
  console.log('================================================================');
  console.log('STAGE 5D TEST SUITE: BACKUP HISTORY & AUDIT TRAIL');
  console.log('================================================================\n');

  const bizA = `biz_5d_a_${Date.now()}`;
  const bizB = `biz_5d_b_${Date.now()}`;
  const bizEmpty = `biz_5d_empty_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5d_${Date.now()}`,
    fullName: 'Kofi Mensah Owner',
    email: 'kofi@audit.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_owner_password_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const staffA: DBUser = {
    id: `usr_staff_5d_${Date.now()}`,
    fullName: 'Abena Staff',
    email: 'abena@audit.gh',
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

  const ownerB: DBUser = {
    id: `usr_owner_5d_b_${Date.now()}`,
    fullName: 'Tenant B Owner',
    email: 'b@audit.gh',
    role: 'business_owner',
    businessId: bizB,
    passwordHash: 'b_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed baseline data for Business A
  db.addProduct({
    businessId: bizA,
    name: 'Audit Test Product',
    sku: 'AUDIT-PROD-1',
    category: 'General',
    sellingPrice: 50,
    buyingPrice: 30,
    quantity: 10,
    minStockLevel: 2,
    unit: 'pcs',
  });

  db.addCustomer({
    businessId: bizA,
    name: 'Audit Customer',
    phone: '0245000111',
    email: 'cust@audit.gh',
    address: 'Accra',
    creditLimit: 500,
  });

  console.log('--- SECTION 1: Direct Backup Audit Record Creation ---');
  const audit1 = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: 25,
    backupVersion: '1.0.0',
  });

  assert(typeof audit1 === 'object' && audit1 !== null, 'recordBackupAudit returns audit object');
  assert(audit1.id.startsWith('baud_'), 'Audit record ID formatted with prefix baud_');
  assert(audit1.businessId === bizA, 'Audit record businessId matches tenant');
  assert(audit1.action === 'BACKUP_CREATED', 'Action recorded as BACKUP_CREATED');
  assert(audit1.status === 'SUCCESS', 'Status recorded as SUCCESS');
  assert(audit1.performedBy === ownerA.id, 'performedBy user ID preserved');
  assert(audit1.performedByName === ownerA.fullName, 'performedByName preserved');
  assert(audit1.recordCount === 25, 'recordCount preserved');
  assert(audit1.backupVersion === '1.0.0', 'backupVersion preserved');
  assert(typeof audit1.createdAt === 'string', 'createdAt timestamp recorded');

  console.log('--- SECTION 2: Verification Success & Failure Audit Recording ---');
  const auditSuccess = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: staffA.id,
    performedByName: staffA.fullName,
    recordCount: 25,
    backupVersion: '1.0.0',
  });

  assert(auditSuccess.action === 'BACKUP_VERIFY_SUCCESS', 'Verification success action recorded');
  assert(auditSuccess.status === 'SUCCESS', 'Verification success status recorded');

  const auditFailed = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_FAILED',
    status: 'FAILED',
    performedBy: staffA.id,
    performedByName: staffA.fullName,
    failureReason: 'Cryptographic checksum mismatch. Tampering detected.',
  });

  assert(auditFailed.action === 'BACKUP_VERIFY_FAILED', 'Verification failed action recorded');
  assert(auditFailed.status === 'FAILED', 'Verification failed status recorded');
  assert(
    auditFailed.failureReason?.includes('checksum mismatch'),
    'Failure reason accurately captured in audit log'
  );

  console.log('--- SECTION 3: Integration with Backup Engine Operations ---');
  // 1. Create a real backup package
  const backupPkg = createBusinessBackup(bizA, ownerA);
  assert(typeof backupPkg.checksum === 'string', 'Live backup package created');

  const autoLoggedCreate = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: backupPkg.metadata.totalRecords,
    backupVersion: backupPkg.metadata.backupVersion,
  });
  assert(autoLoggedCreate.recordCount === backupPkg.metadata.totalRecords, 'Logged record count matches backup metadata');

  // 2. Verify the valid package
  const verifyRes = verifyBusinessBackup(backupPkg, bizA);
  assert(verifyRes.valid === true, 'Backup verification returned valid: true');
  const autoLoggedVerifySuccess = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_SUCCESS',
    status: 'SUCCESS',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    recordCount: verifyRes.summary?.totalRecords,
    backupVersion: verifyRes.summary?.backupVersion,
  });
  assert(autoLoggedVerifySuccess.action === 'BACKUP_VERIFY_SUCCESS', 'Valid verification correctly logged');

  // 3. Verify a tampered package
  const tampered = JSON.parse(JSON.stringify(backupPkg));
  tampered.checksum = 'bad_checksum';
  const verifyFailRes = verifyBusinessBackup(tampered, bizA);
  assert(verifyFailRes.valid === false, 'Tampered package failed verification');
  const autoLoggedVerifyFail = recordBackupAudit({
    businessId: bizA,
    action: 'BACKUP_VERIFY_FAILED',
    status: 'FAILED',
    performedBy: ownerA.id,
    performedByName: ownerA.fullName,
    failureReason: verifyFailRes.errors.join('; '),
  });
  assert(autoLoggedVerifyFail.status === 'FAILED', 'Failed verification correctly logged with status FAILED');
  assert(autoLoggedVerifyFail.failureReason?.length > 0, 'Failure reasons documented');

  console.log('--- SECTION 4: Newest-First Ordering & Retrieval ---');
  const historyA = getBackupHistory(bizA);
  assert(Array.isArray(historyA), 'getBackupHistory returns array');
  assert(historyA.length >= 6, 'All logged events present in history');

  let isSortedDescending = true;
  for (let i = 0; i < historyA.length - 1; i++) {
    const timeCurrent = new Date(historyA[i].createdAt).getTime();
    const timeNext = new Date(historyA[i + 1].createdAt).getTime();
    if (timeCurrent < timeNext) {
      isSortedDescending = false;
      break;
    }
  }
  assert(isSortedDescending, 'Backup history strictly ordered newest-first (descending timestamp)');

  // Empty business history
  const emptyHistory = getBackupHistory(bizEmpty);
  assert(Array.isArray(emptyHistory), 'Empty tenant returns array');
  assert(emptyHistory.length === 0, 'New tenant with no backup activity returns empty history');

  console.log('--- SECTION 5: Tenant Isolation & IDOR Protection ---');
  // Seed record for Business B
  recordBackupAudit({
    businessId: bizB,
    action: 'BACKUP_CREATED',
    status: 'SUCCESS',
    performedBy: ownerB.id,
    performedByName: ownerB.fullName,
    recordCount: 5,
    backupVersion: '1.0.0',
  });

  const historyB = getBackupHistory(bizB);
  assert(historyB.length === 1, 'Business B has exactly 1 audit record');
  assert(historyB[0].performedBy === ownerB.id, 'Business B record belongs to Tenant B');

  // Business A query must have ZERO Business B records
  assert(
    !historyA.some((r) => r.businessId === bizB),
    'Tenant Isolation: Business A cannot view Business B audit history'
  );
  assert(
    !historyB.some((r) => r.businessId === bizA),
    'Tenant Isolation: Business B cannot view Business A audit history'
  );

  console.log('--- SECTION 6: Sensitive-Field Exclusion (Zero Secrets Stored) ---');
  const serializedHistory = JSON.stringify(historyA);
  assert(!serializedHistory.includes('passwordHash'), 'Audit trail strictly excludes passwordHash');
  assert(!serializedHistory.includes('secret_owner_password_hash'), 'Owner password hash never stored in audit');
  assert(!serializedHistory.includes('accessToken'), 'Audit trail strictly excludes access tokens');
  assert(!serializedHistory.includes('"payload":'), 'Audit trail never stores full payload contents');
  assert(!serializedHistory.includes('"sales":'), 'Audit trail never embeds raw sales rows');
  assert(!serializedHistory.includes('"customers":'), 'Audit trail never embeds raw customer rows');

  // Verify audit records only contain permitted lightweight fields
  for (const record of historyA) {
    const keys = Object.keys(record);
    const permittedKeys = [
      'id',
      'businessId',
      'action',
      'status',
      'performedBy',
      'performedByName',
      'createdAt',
      'recordCount',
      'backupVersion',
      'failureReason',
    ];
    const invalidKeys = keys.filter((k) => !permittedKeys.includes(k));
    assert(invalidKeys.length === 0, `Record ${record.id} contains only permitted metadata keys`);
  }

  console.log('--- SECTION 7: Action & Status Values Validation ---');
  const validActions = ['BACKUP_CREATED', 'BACKUP_VERIFY_SUCCESS', 'BACKUP_VERIFY_FAILED'];
  const validStatuses = ['SUCCESS', 'FAILED'];
  for (const record of historyA) {
    assert(validActions.includes(record.action), `Record action "${record.action}" is one of 3 permitted action values`);
    assert(validStatuses.includes(record.status), `Record status "${record.status}" is one of 2 permitted status values`);
  }

  console.log('--- SECTION 8: Read-Only History Guarantee & Zero Business Mutation ---');
  const prodsBefore = db.getProducts(bizA).length;
  const salesBefore = db.getSales(bizA).length;
  const custsBefore = db.getCustomers(bizA).length;
  const expBefore = db.getExpenses(bizA).length;

  // Retrieve history multiple times
  getBackupHistory(bizA);
  getBackupHistory(bizA);

  const prodsAfter = db.getProducts(bizA).length;
  const salesAfter = db.getSales(bizA).length;
  const custsAfter = db.getCustomers(bizA).length;
  const expAfter = db.getExpenses(bizA).length;

  assert(prodsBefore === prodsAfter, 'Products count completely unchanged after audit queries');
  assert(salesBefore === salesAfter, 'Sales count completely unchanged after audit queries');
  assert(custsBefore === custsAfter, 'Customers count completely unchanged after audit queries');
  assert(expBefore === expAfter, 'Expenses count completely unchanged after audit queries');

  console.log('\n================================================================');
  console.log(`STAGE 5D TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5D TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5DTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
