import { db } from '../server/db.js';
import { getAccraToday } from '../server/date.js';

async function runTests() {
  console.log('--- STARTING STAGE 4B COMPREHENSIVE POS & SALES TEST SUITE ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // Helper: Create business & owner
  const bizOwnerEmail = `pos_owner_${timestamp}@test.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: bizOwnerEmail,
      password: 'password123',
      fullName: 'Kwame Mensah',
      phone: '0244111222',
      businessName: `Accra Mart ${timestamp}`,
      businessType: 'Provision Shop',
    }),
  });

  const ownerData = await registerRes.json();
  const ownerToken = ownerData.token;
  const ownerBizId = ownerData.business.id;

  // Create products for testing
  const prodRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Ideal Milk 160g',
      sku: 'MILK-001',
      category: 'Provisions',
      buyingPrice: 10,
      sellingPrice: 15,
      quantity: 50,
      minStockLevel: 5,
    }),
  });
  const prod1 = await prodRes.json();

  const prodOutOfStockRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Geisha Soap',
      sku: 'SOAP-002',
      category: 'Cosmetics',
      buyingPrice: 5,
      sellingPrice: 8,
      quantity: 0,
      minStockLevel: 5,
    }),
  });
  const prodOutOfStock = await prodOutOfStockRes.json();

  // 1. Owner creates cash sale
  const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 2 }],
      paymentMethod: 'Cash',
      amountPaid: 30,
    }),
  });
  const sale1 = await sale1Res.json();
  assert(
    sale1Res.status === 201 && sale1.total === 30 && sale1.paymentMethod === 'Cash' && sale1.receiptNumber.startsWith('BM-'),
    'Test 1: Owner creates cash sale',
    `Status: ${sale1Res.status}, receipt: ${sale1.receiptNumber}`
  );

  // 2. Owner creates mobile money sale
  const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      paymentMethod: 'Mobile Money',
      amountPaid: 15,
    }),
  });
  const sale2 = await sale2Res.json();
  assert(
    sale2Res.status === 201 && sale2.total === 15 && sale2.paymentMethod === 'Mobile Money',
    'Test 2: Owner creates mobile money sale',
    `Status: ${sale2Res.status}, method: ${sale2.paymentMethod}`
  );

  // 3. Staff with pos_sales permission creates sale
  const staffOkRes = await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      fullName: 'Abena Cashier',
      email: `cashier_ok_${timestamp}@test.com`,
      phone: '0244333444',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        view_products: true,
      },
    }),
  });
  const staffOk = await staffOkRes.json();

  const loginStaffOkRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `cashier_ok_${timestamp}@test.com`,
      password: 'password123',
    }),
  });
  const staffOkLogin = await loginStaffOkRes.json();
  const staffOkToken = staffOkLogin.token;

  const staffSaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffOkToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      paymentMethod: 'Cash',
      amountPaid: 15,
    }),
  });
  const staffSale = await staffSaleRes.json();
  assert(
    staffSaleRes.status === 201 && staffSale.receiptNumber?.startsWith('BM-'),
    'Test 3: Staff with pos_sales permission creates sale',
    `Status: ${staffSaleRes.status}`
  );

  // 4. Staff without pos_sales permission is denied
  const staffNoRes = await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      fullName: 'Kojo Restricted',
      email: `cashier_no_${timestamp}@test.com`,
      phone: '0244555666',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: false,
        view_products: true,
      },
    }),
  });
  const staffNo = await staffNoRes.json();

  const loginStaffNoRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `cashier_no_${timestamp}@test.com`,
      password: 'password123',
    }),
  });
  const staffNoLogin = await loginStaffNoRes.json();
  const staffNoToken = staffNoLogin.token;

  const staffNoSaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffNoToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      paymentMethod: 'Cash',
    }),
  });
  const staffNoSale = await staffNoSaleRes.json();
  assert(
    staffNoSaleRes.status === 403 && staffNoSale.code === 'STAFF_PERMISSION_DENIED',
    'Test 4: Staff without pos_sales permission is denied',
    `Status: ${staffNoSaleRes.status}, code: ${staffNoSale.code}`
  );

  // 5. Empty cart
  const emptySaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [],
      paymentMethod: 'Cash',
    }),
  });
  const emptySale = await emptySaleRes.json();
  assert(
    emptySaleRes.status === 400 && emptySale.error?.includes('at least one product'),
    'Test 5: Empty cart rejected',
    `Status: ${emptySaleRes.status}, error: ${emptySale.error}`
  );

  // 6. Invalid quantity
  const invalidQtyRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: -5 }],
      paymentMethod: 'Cash',
    }),
  });
  const invalidQty = await invalidQtyRes.json();
  assert(
    invalidQtyRes.status === 400 && invalidQty.error?.includes('Invalid quantity'),
    'Test 6: Invalid quantity rejected',
    `Status: ${invalidQtyRes.status}, error: ${invalidQty.error}`
  );

  // 7. Out-of-stock product
  const outOfStockRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prodOutOfStock.id, quantity: 1 }],
      paymentMethod: 'Cash',
    }),
  });
  const outOfStockData = await outOfStockRes.json();
  assert(
    outOfStockRes.status === 400 && outOfStockData.error?.includes('OUT OF STOCK'),
    'Test 7: Out-of-stock product prevented',
    `Status: ${outOfStockRes.status}, error: ${outOfStockData.error}`
  );

  // 8. Selling quantity greater than stock
  const overStockRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 9999 }],
      paymentMethod: 'Cash',
    }),
  });
  const overStockData = await overStockRes.json();
  assert(
    overStockRes.status === 400 && overStockData.error?.includes('Cannot sell 9999 units'),
    'Test 8: Selling quantity greater than stock prevented',
    `Status: ${overStockRes.status}, error: ${overStockData.error}`
  );

  // 9. Inventory decreases correctly
  const prodCheckRes = await fetch(`${BASE_URL}/api/products/${prod1.id}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const prodData = await prodCheckRes.json();
  const updatedProd = prodData.product || prodData;
  // initial: 50. Sale 1: 2, Sale 2: 1, Staff sale: 1. Total deducted = 4. Expected remaining = 46.
  assert(
    updatedProd?.quantity === 46,
    'Test 9: Inventory decreases correctly',
    `Expected 46, got ${updatedProd?.quantity}`
  );

  // 10. Stock movement recorded correctly
  const movementsRes = await fetch(`${BASE_URL}/api/stock-movements`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const movements = await movementsRes.json();
  const saleMovements = Array.isArray(movements)
    ? movements.filter((m: any) => m.productId === prod1.id && m.movementType === 'sale')
    : [];
  assert(
    saleMovements.length >= 3 && saleMovements[0].quantity < 0 && saleMovements[0].notes.includes('Sold in receipt #'),
    'Test 10: Stock movement recorded correctly',
    `Found ${saleMovements.length} sale movements, latest qty: ${saleMovements[0]?.quantity}`
  );

  // 11. Profit remains correct
  // Let's create a sale with discount: 2 units of prod1 (selling 15, buying 10) -> subtotal 30, discount 5 -> total 25.
  // Profit = (15 - 10) * 2 - 5 = 10 - 5 = 5.
  const discSaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 2 }],
      discount: 5,
      paymentMethod: 'Cash',
    }),
  });
  const discSale = await discSaleRes.json();
  assert(
    discSale.subtotal === 30 && discSale.discount === 5 && discSale.total === 25 && discSale.profit === 5,
    'Test 11: Profit remains correct (authoritative)',
    `Subtotal: ${discSale.subtotal}, discount: ${discSale.discount}, total: ${discSale.total}, profit: ${discSale.profit}`
  );

  // 12. Customer/walk-in handling
  const walkinSaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      customerName: 'Ama Serwaa',
      customerPhone: '0244999888',
      paymentMethod: 'Cash',
    }),
  });
  const walkinSale = await walkinSaleRes.json();
  assert(
    walkinSale.customerName === 'Ama Serwaa' && walkinSale.customerPhone === '0244999888' && !walkinSale.customerId,
    'Test 12: Customer/walk-in handling',
    `Name: ${walkinSale.customerName}, phone: ${walkinSale.customerPhone}`
  );

  // 13. Credit sale rules if supported
  // Upgrade owner to Starter so customers/debtors are enabled
  const upRes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ plan: 'STARTER' }),
  });

  // Add customer with credit limit 50
  const custRes = await fetch(`${BASE_URL}/api/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Debtor Customer Yaw',
      phone: '0200112233',
      creditLimit: 50,
    }),
  });
  const cust = await custRes.json();

  // Attempt credit sale without customer -> fails
  const noCustCreditRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      paymentMethod: 'Credit/Debt',
    }),
  });
  const noCustCredit = await noCustCreditRes.json();

  // Attempt credit sale exceeding credit limit: 4 units = GH₵ 60 (limit is 50) -> fails
  const overCreditRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      customerId: cust.id,
      items: [{ productId: prod1.id, quantity: 4 }],
      paymentMethod: 'Credit/Debt',
    }),
  });
  const overCredit = await overCreditRes.json();

  // Valid credit sale: 2 units = GH₵ 30 -> succeeds
  const validCreditRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      customerId: cust.id,
      items: [{ productId: prod1.id, quantity: 2 }],
      paymentMethod: 'Credit/Debt',
      dueDate: '2026-10-01',
    }),
  });
  const validCredit = await validCreditRes.json();

  // Check customer debt in DB
  const custsRes = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const custsList = await custsRes.json();
  const updatedCust = Array.isArray(custsList) ? custsList.find((c: any) => c.id === cust.id) : null;

  assert(
    noCustCreditRes.status === 400 &&
      overCreditRes.status === 400 &&
      validCreditRes.status === 201 &&
      validCredit.balance === 30 &&
      updatedCust?.currentDebt === 30,
    'Test 13: Credit sale rules and debtor limits respected',
    `noCust: ${noCustCreditRes.status}, overCredit: ${overCreditRes.status}, validCredit: ${validCreditRes.status}, debt: ${updatedCust?.currentDebt}`
  );

  // 14. Receipt generation
  assert(
    Boolean(validCredit.receiptNumber) && validCredit.receiptNumber.startsWith('BM-') && validCredit.items.length === 1,
    'Test 14: Receipt generation with reference number',
    `Receipt #: ${validCredit.receiptNumber}`
  );

  // 15. Africa/Accra sale date
  const expectedAccraDay = getAccraToday().replace(/-/g, '');
  assert(
    validCredit.receiptNumber.includes(`BM-${expectedAccraDay}-`),
    'Test 15: Africa/Accra business sale date encoded in receipt',
    `Expected BM-${expectedAccraDay}-..., Got: ${validCredit.receiptNumber}`
  );

  // 16. Tenant isolation
  // Create Tenant B
  const bizOwnerBEmail = `pos_owner_b_${timestamp}@test.com`;
  const registerBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: bizOwnerBEmail,
      password: 'password123',
      fullName: 'Kojo Tenant B',
      phone: '0244888999',
      businessName: `Kumasi Shop ${timestamp}`,
      businessType: 'Boutique',
    }),
  });
  const ownerBData = await registerBRes.json();
  const ownerBToken = ownerBData.token;

  // Tenant B tries to sell Tenant A's product
  const tenantBStealRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerBToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: prod1.id, quantity: 1 }],
      paymentMethod: 'Cash',
    }),
  });
  const tenantBSteal = await tenantBStealRes.json();

  // Tenant B fetches sales
  const salesBRes = await fetch(`${BASE_URL}/api/sales`, {
    headers: { Authorization: `Bearer ${ownerBToken}` },
  });
  const salesB = await salesBRes.json();

  assert(
    tenantBStealRes.status === 400 && tenantBSteal.error?.includes('not found in your business inventory') && salesB.length === 0,
    'Test 16: Strict tenant isolation in POS catalog and sales',
    `Steal attempt status: ${tenantBStealRes.status}, error: ${tenantBSteal.error}`
  );

  // 17. Free plan access
  // Create new user on Free plan
  const freeEmail = `free_owner_${timestamp}@test.com`;
  const freeRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: freeEmail,
      password: 'password123',
      fullName: 'Free Shopkeeper',
      phone: '0555111222',
      businessName: `Free Shop ${timestamp}`,
      businessType: 'Provision Shop',
    }),
  });
  const freeData = await freeRegRes.json();
  const freeToken = freeData.token;

  // Add a product on Free plan
  const freeProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      name: 'Pure Water Sachet',
      sku: 'WATER-001',
      category: 'Drinks',
      buyingPrice: 0.3,
      sellingPrice: 0.5,
      quantity: 100,
      minStockLevel: 20,
    }),
  });
  const freeProd = await freeProdRes.json();

  const freeSaleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: freeProd.id, quantity: 4 }],
      paymentMethod: 'Cash',
    }),
  });
  const freeSale = await freeSaleRes.json();
  assert(
    freeSaleRes.status === 201 && freeSale.total === 2,
    'Test 17: Free plan POS sales access without gate restrictions',
    `Status: ${freeSaleRes.status}, total: ${freeSale.total}`
  );

  // 18. Mobile layout verified
  // Check that SalesView.tsx contains mobile-specific dock, touch targets (min-h-[44px], min-h-[48px]), and mobile view toggle
  const fs = await import('fs');
  const salesViewCode = fs.readFileSync('./src/components/SalesView.tsx', 'utf8');
  const hasMobileDock = salesViewCode.includes('Floating Bottom Cart Dock') && salesViewCode.includes('lg:hidden');
  const hasTouchTargets = salesViewCode.includes('min-h-[44px]') && salesViewCode.includes('min-h-[48px]');
  const hasMobileToggle = salesViewCode.includes('mobileView') && salesViewCode.includes('setMobileView');
  assert(
    hasMobileDock && hasTouchTargets && hasMobileToggle,
    'Test 18: Mobile layout (dock, touch targets >= 44px, mobile state transitions)',
    `dock: ${hasMobileDock}, touchTargets: ${hasTouchTargets}, mobileToggle: ${hasMobileToggle}`
  );

  // 19. Desktop layout verified
  const hasDesktopGrid = salesViewCode.includes('lg:col-span-7') && salesViewCode.includes('lg:col-span-5');
  assert(
    hasDesktopGrid,
    'Test 19: Desktop dual-column side-by-side layout (7 cols product / 5 cols cart)',
    `hasDesktopGrid: ${hasDesktopGrid}`
  );

  // 20. Existing sales history still works
  const historyRes = await fetch(`${BASE_URL}/api/sales`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const history = await historyRes.json();
  assert(
    Array.isArray(history) && history.length >= 5 && history[0].receiptNumber && history[0].createdAt,
    'Test 20: Existing sales history ledger works cleanly',
    `Count: ${history.length}, latest: ${history[0]?.receiptNumber}`
  );

  console.log(`\n========================================`);
  console.log(`FINAL RESULT: ${passed}/20 TESTS PASSED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
