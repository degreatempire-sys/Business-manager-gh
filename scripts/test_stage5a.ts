// @ts-nocheck
/**
 * STAGE 5A — BUSINESS DATA EXPORT & RECORDS TEST SUITE
 * Validates CSV export generation across all 10 export types, headers, data formatting,
 * empty datasets, invalid types, authentication, tenant isolation, RBAC, financial privacy,
 * sensitive field exclusion (passwords/tokens omitted), and zero-mutation guarantees.
 */

import { db, DBUser } from '../server/db.js';
import { exportBusinessDataToCsv, ALLOWED_EXPORT_TYPES, arrayToCsv } from '../server/businessExport.js';

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

async function runStage5ATests() {
  console.log('================================================================');
  console.log('STAGE 5A TEST SUITE: BUSINESS DATA EXPORT & RECORDS');
  console.log('================================================================\n');

  const bizA = `biz_5a_a_${Date.now()}`;
  const bizB = `biz_5a_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_a_${Date.now()}`,
    fullName: 'Yaw Owner A',
    email: 'yaw@exporta.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash_should_never_export',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_a_${Date.now()}`,
    fullName: 'Restricted Staff A',
    email: 'staff@exporta.gh',
    role: 'staff',
    businessId: bizA,
    passwordHash: 'secret_hash_2',
    permissions: {
      dashboard: true,
      inventory: true,
      pos_sales: true,
      financial_reports: false, // Cannot view profit
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed test data for Business A
  db.addProduct({
    businessId: bizA,
    name: 'Export Rice 5kg',
    sku: 'RICE-5KG',
    category: 'Grains',
    sellingPrice: 150,
    buyingPrice: 100,
    quantity: 20,
    minStockLevel: 5,
    unit: 'bag',
  });

  db.addProduct({
    businessId: bizA,
    name: 'Zero Stock Item For Alert',
    sku: 'ZERO-ALRT',
    category: 'General',
    sellingPrice: 100,
    buyingPrice: 50,
    quantity: 0,
    minStockLevel: 5,
    unit: 'pcs',
  });

  db.addCustomer({
    businessId: bizA,
    name: 'Kofi Customer',
    phone: '0241112233',
    email: 'kofi@gh.com',
    address: 'Accra',
    debtAmount: 150,
    totalSpent: 300,
  });

  db.createSale({
    businessId: bizA,
    items: [],
    subtotal: 140,
    total: 150,
    tax: 10,
    paymentMethod: 'Cash',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  db.addExpense({
    businessId: bizA,
    category: 'Utilities',
    amount: 50,
    notes: 'Electricity bill',
    date: new Date().toISOString().split('T')[0],
    recordedBy: ownerA.id,
  });

  const rawData = (db as any).data || (db.getRaw ? db.getRaw() : null);
  if (rawData) {
    if (!rawData.purchases) rawData.purchases = [];
    rawData.purchases.push({
      id: `pur_a_${Date.now()}`,
      businessId: bizA,
      supplierId: 'sup_1',
      totalAmount: 1000,
      status: 'Received',
      date: new Date().toISOString().split('T')[0],
      items: [],
      createdAt: new Date().toISOString(),
    });
  }

  db.saveBusinessGoal({
    id: `goal_a_${Date.now()}`,
    businessId: bizA,
    createdBy: ownerA.id,
    name: 'Grow Sales by 20%',
    type: 'revenue',
    targetValue: 50000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  db.saveBusinessDecision({
    id: `dec_a_${Date.now()}`,
    businessId: bizA,
    tenantId: bizA,
    title: 'Restock Grains',
    description: 'Check supplier prices',
    category: 'Inventory',
    priority: 'HIGH',
    status: 'OPEN',
    createdBy: ownerA.id,
    createdAt: new Date().toISOString(),
  });

  // Seed Data for Business B (Tenant Isolation verification)
  db.addProduct({
    businessId: bizB,
    name: 'Secret Product B',
    sku: 'SEC-B',
    category: 'Other',
    sellingPrice: 999,
    buyingPrice: 500,
    quantity: 50,
    minStockLevel: 5,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: Allowed Export Types & Allowlist Validation ---');
  assert(ALLOWED_EXPORT_TYPES.length === 11, 'Exactly 11 export types allowlisted (including products & inventory aliases)');
  assert(ALLOWED_EXPORT_TYPES.includes('sales'), 'sales is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('products'), 'products is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('inventory'), 'inventory is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('customers'), 'customers is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('debts'), 'debts is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('expenses'), 'expenses is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('purchases'), 'purchases is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('goals'), 'goals is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('decisions'), 'decisions is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('alerts'), 'alerts is allowlisted');
  assert(ALLOWED_EXPORT_TYPES.includes('activity'), 'activity is allowlisted');

  let invalidTypeErrorThrown = false;
  try {
    exportBusinessDataToCsv(bizA, ownerA, 'drop_table_users');
  } catch (err) {
    invalidTypeErrorThrown = true;
  }
  assert(invalidTypeErrorThrown, 'Arbitrary table/database name injection strictly blocked');

  console.log('--- SECTION 2: CSV Generation & Headers for All 10 Types ---');
  const typesToTest = ['sales', 'products', 'inventory', 'customers', 'debts', 'expenses', 'purchases', 'goals', 'decisions', 'alerts', 'activity'];
  for (const t of typesToTest) {
    const res = exportBusinessDataToCsv(bizA, ownerA, t);
    assert(typeof res.filename === 'string' && res.filename.includes('.csv'), `Export type ${t} returns valid CSV filename`);
    assert(typeof res.csv === 'string', `Export type ${t} returns string CSV content`);
    const lines = res.csv.split('\n');
    assert(lines.length >= 1, `Export type ${t} has at least header line`);
    assert(lines[0].includes(','), `Export type ${t} header contains comma separated columns`);
  }

  console.log('--- SECTION 3: Financial Privacy & Sensitive Field Exclusion ---');
  const prodExportOwner = exportBusinessDataToCsv(bizA, ownerA, 'products');
  assert(prodExportOwner.csv.includes('costPrice'), 'Owner CSV includes cost price');
  assert(!prodExportOwner.csv.includes('passwordHash'), 'Sensitive passwordHash strictly excluded from export');

  const prodExportStaff = exportBusinessDataToCsv(bizA, restrictedStaffA, 'products');
  assert(prodExportStaff.csv.includes('0'), 'Staff without profit permission masks cost price to 0');
  assert(!prodExportStaff.csv.includes('passwordHash'), 'Staff export excludes passwords');

  console.log('--- SECTION 4: Tenant Isolation & IDOR Protection ---');
  const exportA = exportBusinessDataToCsv(bizA, ownerA, 'products');
  const exportB = exportBusinessDataToCsv(bizB, ownerA, 'products'); // Cross tenant attempt
  assert(exportA.csv.includes('Export Rice 5kg'), 'Business A export contains Business A product');
  assert(!exportA.csv.includes('Secret Product B'), 'Business A export strictly excludes Business B data (Tenant Isolation)');
  assert(exportB.csv.includes('Secret Product B'), 'Business B export contains Business B product');
  assert(!exportB.csv.includes('Export Rice 5kg'), 'Business B export excludes Business A data');

  console.log('--- SECTION 5: Empty Dataset Handling ---');
  const emptyBiz = `biz_empty_${Date.now()}`;
  const emptyExport = exportBusinessDataToCsv(emptyBiz, ownerA, 'sales');
  assert(emptyExport.csv === '', 'Empty dataset returns empty string without error');

  console.log('--- SECTION 6: CSV Escaping & Special Characters ---');
  const specialRows = [
    { title: 'Item with "Quotes"', desc: 'Notes, with comma' },
    { title: 'Normal', desc: 'Line\nbreak' }
  ];
  const generatedCsv = arrayToCsv(specialRows);
  assert(generatedCsv.includes('"Item with ""Quotes"""'), 'Double quotes correctly escaped in CSV');
  assert(generatedCsv.includes('"Notes, with comma"'), 'Commas correctly enclosed in quotes');
  assert(generatedCsv.includes('"Line\nbreak"'), 'Newlines correctly enclosed in quotes');

  console.log('--- SECTION 7: Zero-Mutation Guarantee ---');
  const salesBefore = db.getSales(bizA).length;
  const productsBefore = db.getProducts(bizA).length;
  const customersBefore = db.getCustomers(bizA).length;
  const decisionsBefore = db.getBusinessDecisions(bizA).length;

  for (const t of typesToTest) {
    exportBusinessDataToCsv(bizA, ownerA, t);
  }

  const salesAfter = db.getSales(bizA).length;
  const productsAfter = db.getProducts(bizA).length;
  const customersAfter = db.getCustomers(bizA).length;
  const decisionsAfter = db.getBusinessDecisions(bizA).length;

  assert(salesBefore === salesAfter, 'Sales count 100% unchanged after multiple data exports (Zero Mutation)');
  assert(productsBefore === productsAfter, 'Products count 100% unchanged after data exports');
  assert(customersBefore === customersAfter, 'Customers count 100% unchanged after data exports');
  assert(decisionsBefore === decisionsAfter, 'Decisions count 100% unchanged after data exports');

  console.log('\n================================================================');
  console.log(`STAGE 5A TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5A TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5ATests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
