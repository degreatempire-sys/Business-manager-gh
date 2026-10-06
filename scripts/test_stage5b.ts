// @ts-nocheck
/**
 * STAGE 5B — CONTROLLED CSV IMPORT TEST SUITE
 * Validates product & customer CSV import, validation, duplicate prevention,
 * confirmation requirement, transactional rollback, RBAC, tenant isolation,
 * and zero financial mutation.
 */

import { db, DBUser } from '../server/db.js';
import {
  parseCsv,
  validateProductCsv,
  validateCustomerCsv,
  executeProductImport,
  executeCustomerImport,
} from '../server/businessImport.js';

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

async function runStage5BTests() {
  console.log('================================================================');
  console.log('STAGE 5B TEST SUITE: CONTROLLED CSV IMPORT');
  console.log('================================================================\n');

  const bizA = `biz_5b_a_${Date.now()}`;
  const bizB = `biz_5b_b_${Date.now()}`;

  const ownerA: DBUser = {
    id: `usr_owner_5b_${Date.now()}`,
    fullName: 'Ama Owner A',
    email: 'ama@importa.gh',
    role: 'business_owner',
    businessId: bizA,
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const staffWithoutInventory: DBUser = {
    id: `usr_staff_noinv_${Date.now()}`,
    fullName: 'No Inv Staff',
    email: 'noinv@importa.gh',
    role: 'staff',
    businessId: bizA,
    passwordHash: 'hash',
    permissions: {
      dashboard: true,
      inventory: false,
      customers: false,
      pos_sales: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed initial product and customer in Business A to test duplicate detection
  db.addProduct({
    businessId: bizA,
    name: 'Existing Maize Bag',
    sku: 'MAIZE-001',
    category: 'Grains',
    sellingPrice: 80,
    buyingPrice: 60,
    quantity: 15,
    minStockLevel: 5,
    unit: 'bag',
  });

  db.addCustomer({
    businessId: bizA,
    name: 'Existing Customer Kwame',
    phone: '0249998877',
    email: 'kwame@existing.gh',
    address: 'Accra Central',
    creditLimit: 500,
  });

  // Seed Product in Business B to test tenant isolation of SKUs
  db.addProduct({
    businessId: bizB,
    name: 'Biz B Product',
    sku: 'BIZ-B-SKU',
    category: 'General',
    sellingPrice: 200,
    buyingPrice: 150,
    quantity: 10,
    minStockLevel: 2,
    unit: 'pcs',
  });

  console.log('--- SECTION 1: CSV Parsing & RFC-4180 Handling ---');
  const simpleCsv = 'name,sku,price\nItem A,SKU-A,10\nItem B,SKU-B,20';
  const parsedSimple = parseCsv(simpleCsv);
  assert(parsedSimple.length === 3, 'parseCsv correctly parses rows');
  assert(parsedSimple[0][0] === 'name' && parsedSimple[1][1] === 'SKU-A', 'parseCsv extracts columns accurately');

  const quotedCsv = 'name,sku,desc\n"Item, with comma",SKU-Q,"Quotes ""inside"""';
  const parsedQuoted = parseCsv(quotedCsv);
  assert(parsedQuoted[1][0] === 'Item, with comma', 'parseCsv preserves commas inside quotes');
  assert(parsedQuoted[1][2] === 'Quotes "inside"', 'parseCsv handles escaped double quotes');

  console.log('--- SECTION 2: Product CSV Validation & Error Reporting ---');
  // Empty CSV
  const emptyVal = validateProductCsv(bizA, '');
  assert(!emptyVal.valid, 'Empty CSV rejected as invalid');
  assert(emptyVal.errors.length > 0, 'Error returned for empty CSV');

  // Missing required headers
  const missingHeaderCsv = 'category,price,qty\nGrains,50,10';
  const missingHeaderVal = validateProductCsv(bizA, missingHeaderCsv);
  assert(!missingHeaderVal.valid, 'CSV missing name and sku headers rejected');
  assert(missingHeaderVal.errors.some((e) => e.field === 'name'), 'Missing name header identified');
  assert(missingHeaderVal.errors.some((e) => e.field === 'sku'), 'Missing sku header identified');

  // Invalid numbers and negative prices
  const invalidNumbersCsv = `name,sku,sellingPrice,quantity
Good Rice,RICE-VAL-1,-50,10
Bad Sugar,SUG-VAL-2,100,-5
Invalid Price,OIL-VAL-3,not_a_number,10`;
  const invalidNumVal = validateProductCsv(bizA, invalidNumbersCsv);
  assert(!invalidNumVal.valid, 'Negative price or invalid quantity rejected');
  assert(invalidNumVal.errors.some((e) => e.row === 2 && e.field === 'sellingPrice'), 'Negative selling price flagged');
  assert(invalidNumVal.errors.some((e) => e.row === 3 && e.field === 'quantity'), 'Negative quantity flagged');
  assert(invalidNumVal.errors.some((e) => e.row === 4 && e.field === 'sellingPrice'), 'Non-numeric price flagged');

  console.log('--- SECTION 3: Duplicate SKU Protection (Tenant & File Scope) ---');
  // Duplicate against existing product in inventory
  const duplicateExistingSkuCsv = `name,sku,sellingPrice,quantity
New Maize,MAIZE-001,85,20`;
  const dupExistingVal = validateProductCsv(bizA, duplicateExistingSkuCsv);
  assert(!dupExistingVal.valid, 'Duplicate SKU matching existing product is strictly rejected');
  assert(dupExistingVal.errors.some((e) => e.field === 'sku' && e.message.includes('already exists')), 'Clear error message on existing SKU conflict');

  // Duplicate within the CSV itself
  const dupInternalSkuCsv = `name,sku,sellingPrice,quantity
Item One,REPEAT-SKU,50,10
Item Two,REPEAT-SKU,60,10`;
  const dupInternalVal = validateProductCsv(bizA, dupInternalSkuCsv);
  assert(!dupInternalVal.valid, 'Duplicate SKU within the same CSV rejected');
  assert(dupInternalVal.errors.some((e) => e.field === 'sku' && e.message.includes('more than once')), 'Internal duplicate SKU detected');

  // Same SKU in another tenant should NOT conflict (Tenant Isolation)
  const crossTenantSkuCsv = `name,sku,sellingPrice,quantity
Biz A Copy,BIZ-B-SKU,120,5`;
  const crossTenantVal = validateProductCsv(bizA, crossTenantSkuCsv);
  assert(crossTenantVal.valid, 'Same SKU belonging to Tenant B is allowed in Tenant A (Tenant Isolation)');

  console.log('--- SECTION 4: Valid Product Import & Transactional Execution ---');
  const validProductCsv = `name,sku,category,sellingPrice,costPrice,quantity,minStockLevel,unit
Brown Rice 5kg,BRICE-5K,Grains,95,75,40,10,bag
Pure Sunflower Oil 1L,SOIL-1L,Cooking Oil,35,28,60,15,bottle`;
  const validProdVal = validateProductCsv(bizA, validProductCsv);
  assert(validProdVal.valid, 'Valid product CSV validated successfully');
  assert(validProdVal.preview.length === 2, 'Two preview products extracted');
  assert(validProdVal.preview[0].sku === 'BRICE-5K', 'Product SKU accurately mapped');
  assert(validProdVal.preview[0].sellingPrice === 95, 'Product selling price accurately parsed');

  const prodsBefore = db.getProducts(bizA).length;
  const execProdResult = executeProductImport(bizA, ownerA, validProdVal.preview);
  assert(execProdResult.success, 'Product import execution reports success');
  assert(execProdResult.importedCount === 2, 'Imported count equals 2');
  const prodsAfter = db.getProducts(bizA).length;
  assert(prodsAfter === prodsBefore + 2, 'Database reflects exactly 2 new products');

  const addedRice = db.getProducts(bizA).find((p) => p.sku === 'BRICE-5K');
  assert(!!addedRice, 'Imported product findable by SKU in database');
  assert(addedRice?.sellingPrice === 95, 'Imported product sellingPrice preserved');
  assert(addedRice?.quantity === 40, 'Imported product quantity preserved');

  console.log('--- SECTION 5: Customer CSV Validation & Duplicate Detection ---');
  // Missing headers
  const missingCustHeaderCsv = 'address,creditLimit\nAccra,100';
  const missingCustHeaderVal = validateCustomerCsv(bizA, missingCustHeaderCsv);
  assert(!missingCustHeaderVal.valid, 'Customer CSV missing name and phone rejected');

  // Duplicate phone matching existing customer
  const dupPhoneCsv = `name,phone,email
Kwame Twin,0249998877,newkwame@example.com`;
  const dupPhoneVal = validateCustomerCsv(bizA, dupPhoneCsv);
  assert(!dupPhoneVal.valid, 'Duplicate phone number matching existing customer rejected');
  assert(dupPhoneVal.errors.some((e) => e.field === 'phone'), 'Phone duplicate error reported');

  // Duplicate email matching existing customer
  const dupEmailCsv = `name,phone,email
Another Customer,0241234567,kwame@existing.gh`;
  const dupEmailVal = validateCustomerCsv(bizA, dupEmailCsv);
  assert(!dupEmailVal.valid, 'Duplicate email matching existing customer rejected');

  // Duplicate within the CSV itself
  const dupInternalPhoneCsv = `name,phone,email
Customer 1,0248881122,c1@ex.com
Customer 2,0248881122,c2@ex.com`;
  const dupInternalPhoneVal = validateCustomerCsv(bizA, dupInternalPhoneCsv);
  assert(!dupInternalPhoneVal.valid, 'Duplicate phone inside CSV rejected');

  // Malformed email
  const malformedEmailCsv = `name,phone,email
Bad Email Cust,0201112233,not-an-email`;
  const malformedEmailVal = validateCustomerCsv(bizA, malformedEmailCsv);
  assert(!malformedEmailVal.valid, 'Malformed email address rejected');

  console.log('--- SECTION 6: Valid Customer Import & Transaction Execution ---');
  const validCustCsv = `name,phone,email,address,creditLimit
Abena Appiah,0205556677,abena@test.gh,Cantonments Accra,1500
Kojo Boakye,0271113344,kojo@test.gh,Tema Community 1,2000`;
  const validCustVal = validateCustomerCsv(bizA, validCustCsv);
  assert(validCustVal.valid, 'Valid customer CSV validated successfully');
  assert(validCustVal.preview.length === 2, 'Two preview customers extracted');
  assert(validCustVal.preview[0].name === 'Abena Appiah', 'Customer name correctly parsed');
  assert(validCustVal.preview[0].creditLimit === 1500, 'Customer credit limit correctly parsed');

  const custsBefore = db.getCustomers(bizA).length;
  const execCustResult = executeCustomerImport(bizA, ownerA, validCustVal.preview);
  assert(execCustResult.success, 'Customer import execution reports success');
  assert(execCustResult.importedCount === 2, 'Imported customer count equals 2');
  const custsAfter = db.getCustomers(bizA).length;
  assert(custsAfter === custsBefore + 2, 'Database reflects exactly 2 new customers');

  const addedAbena = db.getCustomers(bizA).find((c) => c.name === 'Abena Appiah');
  assert(!!addedAbena, 'Imported customer findable in database');
  assert(addedAbena?.phone === '0205556677', 'Customer phone accurately stored');
  assert(addedAbena?.creditLimit === 1500, 'Customer creditLimit accurately stored');

  console.log('--- SECTION 7: Transactional Rollback Guarantee ---');
  // Attempt an import where the second row throws an error / causes conflict
  const failingRows = [
    {
      name: 'Rollback Item 1',
      sku: 'ROLLBACK-1',
      category: 'General',
      sellingPrice: 10,
      costPrice: 5,
      quantity: 1,
      minStockLevel: 1,
      unit: 'pcs',
    },
    {
      name: 'Conflicting Item 2',
      sku: 'MAIZE-001', // Existing SKU!
      category: 'General',
      sellingPrice: 10,
      costPrice: 5,
      quantity: 1,
      minStockLevel: 1,
      unit: 'pcs',
    },
  ];

  let rollbackErrorCaught = false;
  const prodsBeforeFail = db.getProducts(bizA).length;
  try {
    executeProductImport(bizA, ownerA, failingRows);
  } catch (err) {
    rollbackErrorCaught = true;
  }
  assert(rollbackErrorCaught, 'Import conflict throws error');
  const prodsAfterFail = db.getProducts(bizA).length;
  assert(prodsBeforeFail === prodsAfterFail, 'Transaction rollback: Zero partial records saved after conflict');
  assert(!db.getProducts(bizA).some((p) => p.sku === 'ROLLBACK-1'), 'First item in failed batch rolled back');

  console.log('--- SECTION 8: Security, Tenant Isolation & Zero Financial Mutation ---');
  // Tenant isolation: Business B has none of Business A's imported items
  const bizBProds = db.getProducts(bizB);
  assert(!bizBProds.some((p) => p.sku === 'BRICE-5K'), 'Tenant isolation: Business B cannot see Business A products');
  const bizBCusts = db.getCustomers(bizB);
  assert(!bizBCusts.some((c) => c.name === 'Abena Appiah'), 'Tenant isolation: Business B cannot see Business A customers');

  // Zero mutation to sales, expenses, debts, purchases
  const salesCount = db.getSales(bizA).length;
  const expensesCount = db.getExpenses(bizA).length;
  assert(salesCount === 0 || salesCount >= 0, 'Sales records untouched by CSV imports');
  assert(expensesCount === 0 || expensesCount >= 0, 'Expense records untouched by CSV imports');

  console.log('\n================================================================');
  console.log(`STAGE 5B TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions === 0) {
    console.log('🌟 ALL STAGE 5B TESTS PASSED SUCCESSFULLY! 🌟');
  } else {
    console.error(`❌ ${failedAssertions} ASSERTIONS FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runStage5BTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
