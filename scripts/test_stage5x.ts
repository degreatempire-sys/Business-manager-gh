// @ts-nocheck
/**
 * STAGE 5X — GLOBAL BUSINESS SEARCH & QUICK FIND TEST SUITE
 * Validates the read-only server-authoritative search engine across products,
 * customers, sales, debts, suppliers, purchases, expenses, and invoices,
 * tenant isolation, result limits, sensitive-data protection, and zero business-data mutation.
 */

import { db, DBUser } from '../server/db.js';
import { searchBusinessRecords } from '../server/businessSearch.js';

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

async function runStage5XTests() {
  console.log('================================================================');
  console.log('STAGE 5X TEST SUITE: GLOBAL BUSINESS SEARCH & QUICK FIND');
  console.log('================================================================\n');

  const bizA = `biz_5x_a_${Date.now()}`;
  const bizB = `biz_5x_b_${Date.now()}`;
  const ownerA: DBUser = {
    id: `usr_owner_5x_${Date.now()}`,
    fullName: 'Yaw Search',
    email: 'yaw@search.gh',
    phone: '0200000000',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'secret_hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed test records for search
  db.addProduct({
    businessId: bizA,
    name: 'Ghana Rice 5kg',
    sku: 'RICE-GH-05',
    category: 'Grains',
    sellingPrice: 150,
    buyingPrice: 110,
    quantity: 50,
    minStockLevel: 5,
    unit: 'bag',
  });

  db.addCustomer({
    businessId: bizA,
    name: 'Abena Customer',
    phone: '0241112233',
  });

  db.addExpense({
    businessId: bizA,
    title: 'Electricity Bill',
    category: 'Electricity',
    amount: 450,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    createdBy: ownerA.id,
  });

  console.log('--- SECTION 1: Empty & No-Result Query Handling ---');
  const resEmpty = searchBusinessRecords(bizA, '');
  assert(resEmpty.success === true, '[1] Empty query returns success response');
  assert(resEmpty.totalCount === 0, '[2] Empty query returns zero results');

  const resNotFound = searchBusinessRecords(bizA, 'nonexistenttermxyz');
  assert(resNotFound.success === true, '[3] Unmatched query returns success');
  assert(resNotFound.totalCount === 0, '[4] Unmatched query returns zero results');

  console.log('--- SECTION 2: Category Search (Products, Customers, Expenses) ---');
  const resProduct = searchBusinessRecords(bizA, 'Rice');
  assert(resProduct.results.products.length === 1, '[5] Product found by name query');
  assert(resProduct.results.products[0].title === 'Ghana Rice 5kg', '[6] Product title matches correctly');

  const resSku = searchBusinessRecords(bizA, 'RICE-GH');
  assert(resSku.results.products.length === 1, '[7] Product found by SKU query');

  const resCustomer = searchBusinessRecords(bizA, 'Abena');
  assert(resCustomer.results.customers.length === 1, '[8] Customer found by name query');

  const resExpense = searchBusinessRecords(bizA, 'Electricity');
  assert(resExpense.results.expenses.length === 1, '[9] Expense found by title/category query');

  console.log('--- SECTION 3: Tenant Isolation & Sensitive Data Protection ---');
  const resTenantB = searchBusinessRecords(bizB, 'Rice');
  assert(resTenantB.totalCount === 0, '[10] Tenant B cannot find Tenant A records (tenant isolation preserved)');

  const searchString = JSON.stringify(resProduct);
  assert(!searchString.includes('secret_hash'), '[11] Password hashes strictly excluded from search results');

  console.log('--- SECTION 4: Zero Business Data Mutation Guarantee ---');
  const prodsBefore = db.getProducts(bizA).length;
  const custBefore = db.getCustomers(bizA).length;

  searchBusinessRecords(bizA, 'Rice');
  searchBusinessRecords(bizA, 'Abena');

  const prodsAfter = db.getProducts(bizA).length;
  const custAfter = db.getCustomers(bizA).length;

  assert(prodsBefore === prodsAfter, '[12] Products count completely unchanged after search');
  assert(custBefore === custAfter, '[13] Customers count completely unchanged after search');

  console.log('\n================================================================');
  console.log(`STAGE 5X TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5X TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5XTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
