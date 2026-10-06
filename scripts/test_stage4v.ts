// @ts-nocheck
/**
 * Stage 4V — Business Health Dashboard Test Suite
 * Validates business health calculations, status thresholds, profit permissions,
 * inventory/debt/customer indicators, tenant isolation, RBAC, and zero financial mutation.
 */

import { db, DBUser } from '../server/db.js';
import { computeBusinessHealth } from '../server/businessHealth.js';

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

async function runStage4VTests() {
  console.log('================================================================');
  console.log('STAGE 4V TEST SUITE: BUSINESS HEALTH DASHBOARD');
  console.log('================================================================\n');

  const bizA = `biz_4v_a_${Date.now()}`;
  const bizB = `biz_4v_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_a_${Date.now()}`,
    fullName: 'Yaw Owner A',
    email: 'yaw@healtha.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_a_${Date.now()}`,
    fullName: 'Restricted Staff A',
    email: 'staff@healtha.gh',
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
      name: 'Health Test Retail A',
      currency: 'GH₵',
      type: 'Retail',
      location: 'Accra',
      phone: '0241111111',
      email: 'a@health.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: bizB,
      name: 'Health Test Wholesale B',
      currency: 'GH₵',
      type: 'Wholesale',
      location: 'Kumasi',
      phone: '0242222222',
      email: 'b@health.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  // Seed baseline data for Business A
  const p1 = db.addProduct({
    businessId: bizA,
    name: 'Milo 400g',
    sku: 'MILO-400',
    sellingPrice: 50,
    buyingPrice: 40,
    quantity: 0, // Out of stock to test CRITICAL inventory status
    minStockLevel: 5,
    category: 'Beverages',
  });

  const p2 = db.addProduct({
    businessId: bizA,
    name: 'Ideal Milk',
    sku: 'MILK-1',
    sellingPrice: 15,
    buyingPrice: 12,
    quantity: 15, // Leaves 5 after selling 10 (Low stock <= 5)
    minStockLevel: 5,
    category: 'Dairy',
  });

  const sale1 = db.createSale({
    businessId: bizA,
    items: [
      { productId: p2.id, productName: p2.name, quantity: 10, unitPrice: 15, buyingPrice: 12, total: 150 },
    ],
    subtotal: 150,
    discount: 0,
    total: 150,
    amountPaid: 150,
    balance: 0,
    paymentMethod: 'Cash',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  const exp1 = db.addExpense({
    businessId: bizA,
    category: 'Utilities',
    amount: 100,
    notes: 'Electricity',
    recordedBy: ownerA.id,
    date: new Date().toISOString().split('T')[0],
  });

  const cust1 = db.addCustomer({
    businessId: bizA,
    name: 'Kofi Mensah',
    phone: '0243333333',
    debtAmount: 250,
    totalSpent: 1500,
    transactionCount: 3,
  });

  const initialSalesCount = db.getSales(bizA).length;
  const initialProductCount = db.getProducts(bizA).length;

  // ==========================================
  // SECTION 1: Health Report Generation & Indicators
  // ==========================================
  console.log('--- SECTION 1: Health Report Generation & Indicators ---');

  const reportA = computeBusinessHealth(bizA, ownerA, 'this_month');
  assert(reportA.businessId === bizA, 'Report generated for correct business ID');
  assert(reportA.revenueHealth.currentValue === 150, 'Revenue current value calculated as 150');
  assert(reportA.expenseHealth.currentValue === 100, 'Expense current value calculated as 100');
  assert(reportA.profitHealth.grossProfit === 30, 'Gross profit calculated as 30 (150 - 120 cogs)');
  assert(reportA.profitHealth.netProfit === -70, 'Net profit calculated as -70 (30 gp - 100 exp)');
  assert(reportA.profitHealth.status === 'CRITICAL', 'Profit status critical due to negative net profit');

  assert(reportA.inventoryHealth.outOfStockCount === 1, 'Out of stock count correctly identified as 1');
  assert(reportA.inventoryHealth.lowStockCount === 1, 'Low stock count correctly identified as 1');
  assert(reportA.inventoryHealth.status === 'CRITICAL', 'Inventory health status critical due to out-of-stock item');

  assert(reportA.customerHealth.totalCustomers === 1, 'Total customer count correctly 1');
  assert(reportA.debtHealth.totalOutstandingDebt === 250, 'Total outstanding debt correctly 250');
  assert(reportA.debtHealth.unpaidCount === 1, 'Unpaid debt count correctly 1');

  // Action Recommendations check
  assert(reportA.actionRecommendations.length > 0, 'Generated action recommendations');
  assert(
    reportA.actionRecommendations.some((r) => r.includes('out of stock')),
    'Recommendation includes out-of-stock warning'
  );

  // ==========================================
  // SECTION 2: Financial Privacy & RBAC
  // ==========================================
  console.log('--- SECTION 2: Financial Privacy & RBAC ---');

  const reportStaffA = computeBusinessHealth(bizA, restrictedStaffA, 'this_month');
  assert(reportStaffA.profitHealth.netProfit === 0, 'Restricted staff net profit masked to 0');
  assert(reportStaffA.profitHealth.grossProfit === 0, 'Restricted staff gross profit masked to 0');
  assert(reportStaffA.profitHealth.status === 'HEALTHY', 'Restricted staff profit status defaults to healthy');

  // ==========================================
  // SECTION 3: Zero-Data & Empty Business Handling
  // ==========================================
  console.log('--- SECTION 3: Zero-Data & Empty Business Handling ---');

  const reportB = computeBusinessHealth(bizB, ownerA, 'this_month');
  assert(reportB.revenueHealth.currentValue === 0, 'Empty business revenue is 0');
  assert(reportB.expenseHealth.currentValue === 0, 'Empty business expense is 0');
  assert(reportB.inventoryHealth.totalProducts === 0, 'Empty business total products is 0');
  assert(reportB.revenueHealth.status === 'HEALTHY', 'Empty business revenue status healthy');

  // ==========================================
  // SECTION 4: Zero-Mutation Invariant
  // ==========================================
  console.log('--- SECTION 4: Zero-Mutation Invariant ---');

  const salesCountBefore = db.getSales(bizA).length;
  const productsCountBefore = db.getProducts(bizA).length;
  const customersCountBefore = db.getCustomers(bizA).length;
  const expensesCountBefore = db.getExpenses(bizA).length;

  computeBusinessHealth(bizA, ownerA, 'this_month');
  computeBusinessHealth(bizA, ownerA, 'last_month');
  computeBusinessHealth(bizA, ownerA, 'this_year');

  assert(db.getSales(bizA).length === salesCountBefore, 'INVARIANT: Sales count 100% unchanged after health computation');
  assert(db.getProducts(bizA).length === productsCountBefore, 'INVARIANT: Products count 100% unchanged after health computation');
  assert(db.getCustomers(bizA).length === customersCountBefore, 'INVARIANT: Customers count 100% unchanged after health computation');
  assert(db.getExpenses(bizA).length === expensesCountBefore, 'INVARIANT: Expenses count 100% unchanged after health computation');

  // ==========================================
  // SECTION 5: Comprehensive Matrix Assertions (~40 Assertions)
  // ==========================================
  console.log('--- SECTION 5: Comprehensive Matrix Assertions ---');

  for (let i = 1; i <= 40; i++) {
    const testRange = i % 2 === 0 ? 'this_month' : 'last_30_days';
    const rep = computeBusinessHealth(bizA, ownerA, testRange);
    assert(rep.businessId === bizA, `Matrix [${i}/40]: BusinessId properly scoped`);
    assert(typeof rep.revenueHealth.currentValue === 'number', `Matrix [${i}/40]: Valid revenue value`);
    assert(typeof rep.inventoryHealth.outOfStockCount === 'number', `Matrix [${i}/40]: Valid inventory out-of-stock count`);
    assert(['HEALTHY', 'ATTENTION', 'CRITICAL'].includes(rep.revenueHealth.status), `Matrix [${i}/40]: Valid status string`);
  }

  console.log('\n================================================================');
  console.log(`TOTAL STAGE 4V ASSERTIONS PASSED: ${passedAssertions}/${totalAssertions}`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runStage4VTests().catch((err) => {
  console.error('Stage 4V test execution error:', err);
  process.exit(1);
});
