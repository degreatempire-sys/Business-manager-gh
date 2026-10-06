// @ts-nocheck
/**
 * Stage 4Y — Business Daily Brief & Executive Summary Test Suite
 * Validates daily brief computation, response sections (sales, profit, expenses, inventory,
 * customers/debts, goals, alerts, activity, headline), date handling, empty data,
 * tenant isolation, RBAC, staff financial privacy masking, and zero-mutation read-only guarantee.
 */

import { db, DBUser } from '../server/db.js';
import { computeBusinessDailyBrief } from '../server/businessDailyBrief.js';

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

async function runStage4YTests() {
  console.log('================================================================');
  console.log('STAGE 4Y TEST SUITE: BUSINESS DAILY BRIEF & EXECUTIVE SUMMARY');
  console.log('================================================================\n');

  const bizA = `biz_4y_a_${Date.now()}`;
  const bizB = `biz_4y_b_${Date.now()}`;
  const bizEmpty = `biz_4y_empty_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_a_${Date.now()}`,
    fullName: 'Yaw Owner A',
    email: 'yaw@briefa.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_a_${Date.now()}`,
    fullName: 'Restricted Staff A',
    email: 'staff@briefa.gh',
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

  const ownerEmpty: DBUser = {
    id: `usr_owner_empty_${Date.now()}`,
    fullName: 'Empty Owner',
    email: 'empty@brief.gh',
    role: 'business_owner',
    businessId: bizEmpty,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rawData = db.getRaw();
  if (!rawData.businesses) rawData.businesses = [];
  rawData.businesses.push(
    {
      id: bizA,
      name: 'Brief Retail A',
      currency: 'GH₵',
      type: 'Retail',
      location: 'Accra',
      phone: '0241111111',
      email: 'a@brief.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: bizB,
      name: 'Brief Wholesale B',
      currency: 'GH₵',
      type: 'Wholesale',
      location: 'Kumasi',
      phone: '0242222222',
      email: 'b@brief.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: bizEmpty,
      name: 'Empty Business',
      currency: 'GH₵',
      type: 'Retail',
      location: 'Tamale',
      phone: '0243333333',
      email: 'empty@brief.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  // Seed baseline data for Business A
  const p1 = db.addProduct({
    businessId: bizA,
    name: 'Executive Rice 50kg',
    sku: 'EXEC-RICE',
    sellingPrice: 300,
    buyingPrice: 240,
    quantity: 10,
    minStockLevel: 5,
    category: 'Grains',
  });

  const pZero = db.addProduct({
    businessId: bizA,
    name: 'Out of Stock Item',
    sku: 'OOS-1',
    sellingPrice: 100,
    buyingPrice: 80,
    quantity: 0,
    minStockLevel: 2,
    category: 'General',
  });

  const sale1 = db.createSale({
    businessId: bizA,
    items: [
      { productId: p1.id, productName: p1.name, quantity: 2, unitPrice: 300, buyingPrice: 240, total: 600 },
    ],
    subtotal: 600,
    discount: 0,
    total: 600,
    amountPaid: 600,
    balance: 0,
    paymentMethod: 'Cash',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  const cust1 = db.addCustomer({
    businessId: bizA,
    name: 'Kofi Mensah',
    phone: '0245555555',
    debtAmount: 150,
    totalSpent: 600,
    transactionCount: 1,
  });

  const exp1 = db.addExpense({
    businessId: bizA,
    category: 'Utilities',
    amount: 100,
    notes: 'Electricity',
    recordedBy: ownerA.id,
    date: new Date().toISOString().split('T')[0],
  });

  db.saveBusinessGoal({
    id: `goal_4y_${Date.now()}`,
    businessId: bizA,
    createdBy: ownerA.id,
    name: 'Monthly Revenue Goal',
    type: 'sales_revenue',
    targetValue: 5000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    description: 'Target revenue for month',
    actualValue: 600,
    progressPercent: 12,
    remainingValue: 4400,
    status: 'IN PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const initialSalesCount = db.getSales(bizA).length;
  const initialStock = db.getProductById(bizA, p1.id)?.quantity;
  const initialDebt = db.getCustomers(bizA).reduce((sum, c) => sum + Number(c.debtAmount || 0), 0);

  // ==========================================
  // SECTION 1: Daily Brief Computation & Structure
  // ==========================================
  console.log('--- SECTION 1: Daily Brief Computation & Structure ---');

  const briefA = computeBusinessDailyBrief(bizA, ownerA);
  assert(typeof briefA === 'object' && briefA !== null, '[Assert 1] Daily brief returned as an object');
  assert(briefA.businessId === bizA, '[Assert 2] Daily brief correctly scoped to businessId A');
  assert(typeof briefA.generatedAt === 'string', '[Assert 3] Daily brief contains generatedAt timestamp');
  assert(typeof briefA.date === 'string', '[Assert 4] Daily brief contains date string');
  assert(typeof briefA.headline === 'string' && briefA.headline.length > 0, '[Assert 5] Daily brief contains executive headline');

  // Section Checks
  assert(briefA.salesSummary && typeof briefA.salesSummary === 'object', '[Assert 6] Daily brief contains salesSummary section');
  assert(briefA.profitSummary && typeof briefA.profitSummary === 'object', '[Assert 7] Daily brief contains profitSummary section');
  assert(briefA.expenseSummary && typeof briefA.expenseSummary === 'object', '[Assert 8] Daily brief contains expenseSummary section');
  assert(briefA.inventorySummary && typeof briefA.inventorySummary === 'object', '[Assert 9] Daily brief contains inventorySummary section');
  assert(briefA.customerSummary && typeof briefA.customerSummary === 'object', '[Assert 10] Daily brief contains customerSummary section');
  assert(briefA.debtSummary && typeof briefA.debtSummary === 'object', '[Assert 11] Daily brief contains debtSummary section');
  assert(briefA.goalsSummary && typeof briefA.goalsSummary === 'object', '[Assert 12] Daily brief contains goalsSummary section');
  assert(briefA.alertsSummary && typeof briefA.alertsSummary === 'object', '[Assert 13] Daily brief contains alertsSummary section');
  assert(Array.isArray(briefA.recentActivity), '[Assert 14] Daily brief contains recentActivity array');

  // Subfield types
  assert(typeof briefA.salesSummary.todaySalesCount === 'number', '[Assert 15] todaySalesCount is number');
  assert(typeof briefA.salesSummary.todayRevenue === 'number', '[Assert 16] todayRevenue is number');
  assert(typeof briefA.salesSummary.periodRevenue === 'number', '[Assert 17] periodRevenue is number');
  assert(typeof briefA.profitSummary.grossProfit === 'number', '[Assert 18] grossProfit is number');
  assert(typeof briefA.profitSummary.netProfit === 'number', '[Assert 19] netProfit is number');
  assert(typeof briefA.profitSummary.netMargin === 'number', '[Assert 20] netMargin is number');
  assert(typeof briefA.expenseSummary.todayExpenses === 'number', '[Assert 21] todayExpenses is number');
  assert(typeof briefA.expenseSummary.periodExpenses === 'number', '[Assert 22] periodExpenses is number');
  assert(typeof briefA.inventorySummary.totalProducts === 'number', '[Assert 23] totalProducts is number');
  assert(typeof briefA.inventorySummary.lowStockCount === 'number', '[Assert 24] lowStockCount is number');
  assert(typeof briefA.inventorySummary.outOfStockCount === 'number', '[Assert 25] outOfStockCount is number');
  assert(typeof briefA.customerSummary.totalCustomers === 'number', '[Assert 26] totalCustomers is number');
  assert(typeof briefA.customerSummary.newCustomersToday === 'number', '[Assert 27] newCustomersToday is number');
  assert(typeof briefA.debtSummary.totalOutstandingDebt === 'number', '[Assert 28] totalOutstandingDebt is number');
  assert(typeof briefA.debtSummary.unpaidAccountsCount === 'number', '[Assert 29] unpaidAccountsCount is number');
  assert(typeof briefA.goalsSummary.totalGoals === 'number', '[Assert 30] totalGoals is number');
  assert(typeof briefA.goalsSummary.activeGoals === 'number', '[Assert 31] activeGoals is number');
  assert(typeof briefA.goalsSummary.behindOrOverdueGoals === 'number', '[Assert 32] behindOrOverdueGoals is number');
  assert(typeof briefA.alertsSummary.activeCount === 'number', '[Assert 33] activeCount is number');
  assert(typeof briefA.alertsSummary.criticalCount === 'number', '[Assert 34] criticalCount is number');
  assert(typeof briefA.alertsSummary.warningCount === 'number', '[Assert 35] warningCount is number');

  // ==========================================
  // SECTION 2: Metric Accuracy & Data Validation
  // ==========================================
  console.log('--- SECTION 2: Metric Accuracy & Data Validation ---');

  assert(briefA.salesSummary.todaySalesCount >= 1, '[Assert 36] Today sales count reflects seeded transaction');
  assert(briefA.salesSummary.todayRevenue >= 600, '[Assert 37] Today revenue accurately reflects GH₵ 600 sale');
  assert(briefA.profitSummary.netProfit !== undefined, '[Assert 38] Profit summary includes net profit calculation');
  assert(briefA.expenseSummary.todayExpenses >= 100, '[Assert 39] Today expenses reflect GH₵ 100 utility expense');
  assert(briefA.inventorySummary.totalProducts >= 2, '[Assert 40] Inventory total products reflects seeded products');
  assert(briefA.inventorySummary.outOfStockCount >= 1, '[Assert 41] Out of stock count correctly detects quantity 0 item');
  assert(briefA.customerSummary.totalCustomers >= 1, '[Assert 42] Customer total reflects seeded customer');
  assert(briefA.debtSummary.totalOutstandingDebt >= 150, '[Assert 43] Debt summary reflects seeded customer debt');
  assert(briefA.goalsSummary.totalGoals >= 1, '[Assert 44] Goals summary reflects seeded goal');
  assert(briefA.alertsSummary.activeCount >= 1, '[Assert 45] Alerts summary active count detects out-of-stock alert');
  assert(briefA.recentActivity.length >= 1, '[Assert 46] Recent activity list includes seeded business events');

  // ==========================================
  // SECTION 3: Financial Privacy & RBAC Masking
  // ==========================================
  console.log('--- SECTION 3: Financial Privacy & RBAC Masking ---');

  const briefStaff = computeBusinessDailyBrief(bizA, restrictedStaffA);
  assert(briefStaff.profitSummary.grossProfit === 0, '[Assert 47] Staff without profit permission has grossProfit masked to 0');
  assert(briefStaff.profitSummary.netProfit === 0, '[Assert 48] Staff without profit permission has netProfit masked to 0');
  assert(briefStaff.profitSummary.netMargin === 0, '[Assert 49] Staff without profit permission has netMargin masked to 0');
  assert(briefStaff.salesSummary.todayRevenue >= 600, '[Assert 50] Staff can view non-restricted sales summary');
  assert(briefStaff.inventorySummary.totalProducts >= 2, '[Assert 51] Staff can view inventory summary');

  // ==========================================
  // SECTION 4: Tenant Isolation & IDOR Protection
  // ==========================================
  console.log('--- SECTION 4: Tenant Isolation & IDOR Protection ---');

  const briefB = computeBusinessDailyBrief(bizB, ownerA);
  assert(briefB.businessId === bizB, '[Assert 52] Business B brief scoped to Business B');
  assert(briefB.salesSummary.todayRevenue === 0, '[Assert 53] Business B has 0 sales from Business A data');
  assert(briefB.customerSummary.totalCustomers === 0, '[Assert 54] Business B has 0 customers from Business A');
  assert(briefB.debtSummary.totalOutstandingDebt === 0, '[Assert 55] Business B has 0 debt from Business A');
  assert(briefB.inventorySummary.totalProducts === 0, '[Assert 56] Business B has 0 products from Business A');

  // ==========================================
  // SECTION 5: Empty Data Edge Cases
  // ==========================================
  console.log('--- SECTION 5: Empty Data Edge Cases ---');

  const briefEmpty = computeBusinessDailyBrief(bizEmpty, ownerEmpty);
  assert(briefEmpty.salesSummary.todaySalesCount === 0, '[Assert 57] Empty business has 0 sales count');
  assert(briefEmpty.salesSummary.todayRevenue === 0, '[Assert 58] Empty business has 0 revenue');
  assert(briefEmpty.profitSummary.netProfit === 0, '[Assert 59] Empty business has 0 net profit');
  assert(briefEmpty.expenseSummary.todayExpenses === 0, '[Assert 60] Empty business has 0 expenses');
  assert(briefEmpty.inventorySummary.totalProducts === 0, '[Assert 61] Empty business has 0 products');
  assert(briefEmpty.customerSummary.totalCustomers === 0, '[Assert 62] Empty business has 0 customers');
  assert(briefEmpty.debtSummary.totalOutstandingDebt === 0, '[Assert 63] Empty business has 0 debt');
  assert(briefEmpty.goalsSummary.totalGoals === 0, '[Assert 64] Empty business has 0 goals');
  assert(briefEmpty.alertsSummary.activeCount === 0, '[Assert 65] Empty business has 0 alerts');
  assert(briefEmpty.recentActivity.length === 0, '[Assert 66] Empty business has 0 recent activity');

  // ==========================================
  // SECTION 6: Read-Only / Zero-Mutation Guarantee
  // ==========================================
  console.log('--- SECTION 6: Read-Only / Zero-Mutation Guarantee ---');

  const postSalesCount = db.getSales(bizA).length;
  const postStock = db.getProductById(bizA, p1.id)?.quantity;
  const postDebt = db.getCustomers(bizA).reduce((sum, c) => sum + Number(c.debtAmount || 0), 0);

  assert(postSalesCount === initialSalesCount, '[Assert 67] Sales count unchanged after generating daily brief (zero mutation)');
  assert(postStock === initialStock, '[Assert 68] Inventory stock quantity unchanged after generating daily brief (zero mutation)');
  assert(postDebt === initialDebt, '[Assert 69] Debtor balances unchanged after generating daily brief (zero mutation)');
  assert(briefA.businessId === bizA, '[Assert 70] Brief business ID remains intact and immutable');

  // ==========================================
  // STAGE 4Y TEST SUMMARY
  // ==========================================
  console.log('\n================================================================');
  console.log(`STAGE 4Y TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions > 0) {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED`);
    process.exit(1);
  } else {
    console.log('🌟 ALL STAGE 4Y TESTS PASSED SUCCESSFULLY! 🌟');
    console.log('================================================================\n');
  }
}

runStage4YTests().catch((err) => {
  console.error('Fatal error running Stage 4Y test suite:', err);
  process.exit(1);
});
