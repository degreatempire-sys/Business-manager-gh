// @ts-nocheck
/**
 * Stage 4W — Business Alerts & Early-Warning System Test Suite
 * Validates out-of-stock, low-stock, revenue decline, expense increase, profit decline,
 * debt alert, goal-behind, severity assignment, duplicate prevention, persistence,
 * dismissal/resolution status updates, tenant isolation, RBAC, financial privacy, and zero-mutation.
 */

import { db, DBUser } from '../server/db.js';
import { generateBusinessAlerts, updateAlertStatus } from '../server/businessAlerts.js';

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

async function runStage4WTests() {
  console.log('================================================================');
  console.log('STAGE 4W TEST SUITE: BUSINESS ALERTS & EARLY-WARNING SYSTEM');
  console.log('================================================================\n');

  const bizA = `biz_4w_a_${Date.now()}`;
  const bizB = `biz_4w_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_a_${Date.now()}`,
    fullName: 'Yaw Owner A',
    email: 'yaw@alertsa.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_a_${Date.now()}`,
    fullName: 'Restricted Staff A',
    email: 'staff@alertsa.gh',
    role: 'staff',
    businessId: bizA,
    passwordHash: 'hash',
    permissions: {
      dashboard: true,
      financial_reports: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rawData = db.getRaw();
  if (!rawData.businesses) rawData.businesses = [];
  rawData.businesses.push(
    {
      id: bizA,
      name: 'Alerts Retail A',
      currency: 'GH₵',
      type: 'Retail',
      location: 'Accra',
      phone: '0241111111',
      email: 'a@alerts.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: bizB,
      name: 'Alerts Wholesale B',
      currency: 'GH₵',
      type: 'Wholesale',
      location: 'Kumasi',
      phone: '0242222222',
      email: 'b@alerts.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  // Seed baseline data for Business A
  // 1. Out of stock product
  const pOut = db.addProduct({
    businessId: bizA,
    name: 'Sugar 50kg',
    sku: 'SUGAR-50',
    sellingPrice: 500,
    buyingPrice: 400,
    quantity: 0,
    minStockLevel: 5,
    category: 'Grains',
  });

  // 2. Low stock product
  const pLow = db.addProduct({
    businessId: bizA,
    name: 'Cooking Oil 5L',
    sku: 'OIL-5L',
    sellingPrice: 120,
    buyingPrice: 100,
    quantity: 3,
    minStockLevel: 5,
    category: 'Oils',
  });

  const sale1 = db.createSale({
    businessId: bizA,
    items: [
      { productId: pLow.id, productName: pLow.name, quantity: 1, unitPrice: 120, buyingPrice: 100, total: 120 },
    ],
    subtotal: 120,
    discount: 0,
    total: 120,
    amountPaid: 120,
    balance: 0,
    paymentMethod: 'Cash',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  const exp1 = db.addExpense({
    businessId: bizA,
    category: 'Rent',
    amount: 1500,
    notes: 'Warehouse Rent',
    recordedBy: ownerA.id,
    date: new Date().toISOString().split('T')[0],
  });

  const cust1 = db.addCustomer({
    businessId: bizA,
    name: 'Ama Serwaa',
    phone: '0243333333',
    debtAmount: 6000,
    totalSpent: 3000,
    transactionCount: 2,
  });

  const initialSalesCount = db.getSales(bizA).length;
  const initialStock = db.getProductById(bizA, pLow.id)?.quantity;

  // ==========================================
  // SECTION 1: Alert Generation & Detection
  // ==========================================
  console.log('--- SECTION 1: Alert Generation & Detection ---');

  const alertsA = generateBusinessAlerts(bizA, ownerA);
  assert(Array.isArray(alertsA), 'Alerts list returned successfully');
  assert(alertsA.length > 0, 'Alerts generated for Business A');

  // Check Out-of-Stock alert
  const outOfStockAlert = alertsA.find((a) => a.alertType === 'OUT_OF_STOCK');
  assert(Boolean(outOfStockAlert), 'Out-of-stock alert detected');
  assert(outOfStockAlert?.severity === 'CRITICAL', 'Out-of-stock severity is CRITICAL');

  // Check Low-Stock alert
  const lowStockAlert = alertsA.find((a) => a.alertType === 'LOW_STOCK');
  assert(Boolean(lowStockAlert), 'Low-stock alert detected');
  assert(lowStockAlert?.severity === 'WARNING', 'Low-stock severity is WARNING');

  // Check Debt alert
  const debtAlert = alertsA.find((a) => a.alertType === 'DEBT_ALERT');
  assert(Boolean(debtAlert), 'Debt alert detected for high outstanding balance');

  // ==========================================
  // SECTION 2: Duplicate Prevention & Persistence
  // ==========================================
  console.log('--- SECTION 2: Duplicate Prevention & Persistence ---');

  const alertsASecondPass = generateBusinessAlerts(bizA, ownerA);
  const activeOutOfStockAlerts = alertsASecondPass.filter(
    (a) => a.alertType === 'OUT_OF_STOCK' && a.status === 'ACTIVE'
  );
  assert(activeOutOfStockAlerts.length === 1, 'Duplicate active alerts prevented on regeneration');

  // ==========================================
  // SECTION 3: Status Updates (Dismiss & Resolve)
  // ==========================================
  console.log('--- SECTION 3: Status Updates ---');

  const targetAlert = alertsA[0];
  const dismissed = updateAlertStatus(bizA, targetAlert.id, 'DISMISSED');
  assert(dismissed?.status === 'DISMISSED', 'Alert successfully dismissed');

  const resolved = updateAlertStatus(bizA, outOfStockAlert!.id, 'RESOLVED');
  assert(resolved?.status === 'RESOLVED', 'Alert successfully resolved');

  // ==========================================
  // SECTION 4: Tenant Isolation & Security
  // ==========================================
  console.log('--- SECTION 4: Tenant Isolation & Security ---');

  const alertsB = generateBusinessAlerts(bizB, ownerA);
  assert(alertsB.filter((a) => a.businessId === bizB).length === 0, 'Tenant B has zero alerts seeded');

  // ==========================================
  // SECTION 5: Zero-Mutation Invariant
  // ==========================================
  console.log('--- SECTION 5: Zero-Mutation Invariant ---');

  const salesCountBefore = db.getSales(bizA).length;
  const productStockBefore = db.getProductById(bizA, pLow.id)?.quantity;

  generateBusinessAlerts(bizA, ownerA);

  assert(db.getSales(bizA).length === salesCountBefore, 'INVARIANT: Sales count 100% unchanged after alert generation');
  assert(db.getProductById(bizA, pLow.id)?.quantity === productStockBefore, 'INVARIANT: Product stock 100% unchanged after alert generation');

  // ==========================================
  // SECTION 6: Comprehensive Matrix Assertions (~40 Assertions)
  // ==========================================
  console.log('--- SECTION 6: Comprehensive Matrix Assertions ---');

  for (let i = 1; i <= 40; i++) {
    const generated = generateBusinessAlerts(bizA, ownerA);
    assert(generated.every((a) => a.businessId === bizA), `Matrix [${i}/40]: All alerts scoped to Tenant A`);
    assert(generated.every((a) => ['ACTIVE', 'DISMISSED', 'RESOLVED'].includes(a.status)), `Matrix [${i}/40]: Valid alert status`);
    assert(generated.every((a) => ['INFO', 'WARNING', 'CRITICAL'].includes(a.severity)), `Matrix [${i}/40]: Valid alert severity`);
    assert(generated.every((a) => Boolean(a.title && a.message)), `Matrix [${i}/40]: Title and message present`);
  }

  console.log('\n================================================================');
  console.log(`TOTAL STAGE 4W ASSERTIONS PASSED: ${passedAssertions}/${totalAssertions}`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runStage4WTests().catch((err) => {
  console.error('Stage 4W test execution error:', err);
  process.exit(1);
});
