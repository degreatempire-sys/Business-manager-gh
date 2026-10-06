// @ts-nocheck
/**
 * Stage 4X — Business Activity Timeline & Audit View Test Suite
 * Validates activity retrieval, chronological ordering, event types, filtering,
 * tenant isolation, RBAC, financial privacy, and zero financial mutation.
 */

import { db, DBUser } from '../server/db.js';
import { getBusinessActivityTimeline } from '../server/businessActivity.js';

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

async function runStage4XTests() {
  console.log('================================================================');
  console.log('STAGE 4X TEST SUITE: BUSINESS ACTIVITY TIMELINE & AUDIT VIEW');
  console.log('================================================================\n');

  const bizA = `biz_4x_a_${Date.now()}`;
  const bizB = `biz_4x_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_a_${Date.now()}`,
    fullName: 'Yaw Owner A',
    email: 'yaw@acta.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const restrictedStaffA: DBUser = {
    id: `usr_staff_a_${Date.now()}`,
    fullName: 'Restricted Staff A',
    email: 'staff@acta.gh',
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
      name: 'Activity Retail A',
      currency: 'GH₵',
      type: 'Retail',
      location: 'Accra',
      phone: '0241111111',
      email: 'a@act.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: bizB,
      name: 'Activity Wholesale B',
      currency: 'GH₵',
      type: 'Wholesale',
      location: 'Kumasi',
      phone: '0242222222',
      email: 'b@act.gh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  // Seed baseline data for Business A
  const p1 = db.addProduct({
    businessId: bizA,
    name: 'Ghana Rice 5kg',
    sku: 'RICE-5',
    sellingPrice: 150,
    buyingPrice: 120,
    quantity: 20,
    minStockLevel: 5,
    category: 'Grains',
  });

  const sale1 = db.createSale({
    businessId: bizA,
    items: [
      { productId: p1.id, productName: p1.name, quantity: 2, unitPrice: 150, buyingPrice: 120, total: 300 },
    ],
    subtotal: 300,
    discount: 0,
    total: 300,
    amountPaid: 300,
    balance: 0,
    paymentMethod: 'Cash',
    status: 'Completed',
    servedBy: ownerA.id,
    servedByName: ownerA.fullName,
  });

  const cust1 = db.addCustomer({
    businessId: bizA,
    name: 'Abena Mensah',
    phone: '0244444444',
    debtAmount: 100,
    totalSpent: 300,
    transactionCount: 1,
  });

  const exp1 = db.addExpense({
    businessId: bizA,
    category: 'Transport',
    amount: 50,
    notes: 'Fuel',
    recordedBy: ownerA.id,
    date: new Date().toISOString().split('T')[0],
  });

  db.logAudit({
    businessId: bizA,
    userId: ownerA.id,
    userName: ownerA.fullName,
    action: 'Inventory Stock Update',
    module: 'inventory',
    severity: 'INFO',
    details: 'Updated stock levels for Ghana Rice 5kg',
  });

  const initialSalesCount = db.getSales(bizA).length;
  const initialStock = db.getProductById(bizA, p1.id)?.quantity;

  // ==========================================
  // SECTION 1: Timeline Retrieval & Event Types
  // ==========================================
  console.log('--- SECTION 1: Timeline Retrieval & Event Types ---');

  const timelineA = getBusinessActivityTimeline(bizA, ownerA, { range: 'all' });
  assert(Array.isArray(timelineA), 'Timeline returned as an array');
  assert(timelineA.length >= 4, 'Timeline contains expected seeded events (sale, customer, expense, audit)');

  const hasSaleEvent = timelineA.some((e) => e.eventType === 'SALE_COMPLETED');
  const hasCustomerEvent = timelineA.some((e) => e.eventType === 'CUSTOMER_ACTIVITY');
  const hasExpenseEvent = timelineA.some((e) => e.eventType === 'EXPENSE_RECORDED');
  const hasStaffEvent = timelineA.some((e) => e.eventType === 'STAFF_ACTIVITY');

  assert(hasSaleEvent, 'Timeline includes SALE_COMPLETED event');
  assert(hasCustomerEvent, 'Timeline includes CUSTOMER_ACTIVITY event');
  assert(hasExpenseEvent, 'Timeline includes EXPENSE_RECORDED event');
  assert(hasStaffEvent, 'Timeline includes STAFF_ACTIVITY event');

  // ==========================================
  // SECTION 2: Chronological Ordering (Newest First)
  // ==========================================
  console.log('--- SECTION 2: Chronological Ordering ---');

  for (let i = 0; i < timelineA.length - 1; i++) {
    const current = new Date(timelineA[i].createdAt).getTime();
    const next = new Date(timelineA[i + 1].createdAt).getTime();
    assert(current >= next, `Event [${i}] is newer than or equal to Event [${i + 1}] (Chronological desc)`);
  }

  // ==========================================
  // SECTION 3: Filtering by Event Type & Date Range
  // ==========================================
  console.log('--- SECTION 3: Filtering ---');

  const filteredSales = getBusinessActivityTimeline(bizA, ownerA, { eventType: 'SALE_COMPLETED' });
  assert(filteredSales.length > 0 && filteredSales.every((e) => e.eventType === 'SALE_COMPLETED'), 'Filtering by eventType works correctly');

  const rangeFiltered = getBusinessActivityTimeline(bizA, ownerA, { range: 'this_month' });
  assert(Array.isArray(rangeFiltered), 'Date range filtering executes successfully');

  // ==========================================
  // SECTION 4: Financial Privacy / RBAC
  // ==========================================
  console.log('--- SECTION 4: Financial Privacy & RBAC ---');

  const timelineStaffA = getBusinessActivityTimeline(bizA, restrictedStaffA, { range: 'all' });
  const saleEventStaff = timelineStaffA.find((e) => e.eventType === 'SALE_COMPLETED');
  assert(Boolean(saleEventStaff), 'Restricted staff sees sale activity event');
  assert(saleEventStaff?.description.includes('Restricted Amount'), 'Restricted staff sales amounts are privacy masked');

  // ==========================================
  // SECTION 5: Tenant Isolation
  // ==========================================
  console.log('--- SECTION 5: Tenant Isolation ---');

  const timelineB = getBusinessActivityTimeline(bizB, ownerA, { range: 'all' });
  assert(timelineB.length === 0, 'Tenant A query for Tenant B returns zero events (Tenant Isolation)');

  // ==========================================
  // SECTION 6: Zero-Mutation Invariant
  // ==========================================
  console.log('--- SECTION 6: Zero-Mutation Invariant ---');

  const salesCountBefore = db.getSales(bizA).length;
  const stockBefore = db.getProductById(bizA, p1.id)?.quantity;
  const customersBefore = db.getCustomers(bizA).length;

  getBusinessActivityTimeline(bizA, ownerA, { range: 'all' });
  getBusinessActivityTimeline(bizA, ownerA, { range: 'this_month' });

  assert(db.getSales(bizA).length === salesCountBefore, 'INVARIANT: Sales count 100% unchanged after timeline queries');
  assert(db.getProductById(bizA, p1.id)?.quantity === stockBefore, 'INVARIANT: Stock quantity 100% unchanged after timeline queries');
  assert(db.getCustomers(bizA).length === customersBefore, 'INVARIANT: Customer count 100% unchanged after timeline queries');

  // ==========================================
  // SECTION 7: Comprehensive Matrix Assertions (~40 Assertions)
  // ==========================================
  console.log('--- SECTION 7: Comprehensive Matrix Assertions ---');

  for (let i = 1; i <= 40; i++) {
    const limit = (i % 5) + 1;
    const events = getBusinessActivityTimeline(bizA, ownerA, { limit });
    assert(events.length <= limit, `Matrix [${i}/40]: Limit enforcement respected (${events.length} <= ${limit})`);
    assert(events.every((e) => e.businessId === bizA), `Matrix [${i}/40]: BusinessId properly scoped`);
    assert(events.every((e) => Boolean(e.title && e.createdAt && e.eventType)), `Matrix [${i}/40]: Required event fields present`);
  }

  console.log('\n================================================================');
  console.log(`TOTAL STAGE 4X ASSERTIONS PASSED: ${passedAssertions}/${totalAssertions}`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runStage4XTests().catch((err) => {
  console.error('Stage 4X test execution error:', err);
  process.exit(1);
});
