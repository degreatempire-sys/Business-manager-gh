/**
 * STAGE 4C AUTOMATED VERIFICATION SUITE
 */

import { getAccraToday, getAccraYesterday, isTodayInAccra, isYesterdayInAccra } from '../src/utils/date.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function pass(name: string) {
  results.push({ name, passed: true });
  console.log(`✅ [PASS] ${name}`);
}

function fail(name: string, error: any) {
  results.push({ name, passed: false, error: String(error) });
  console.error(`❌ [FAIL] ${name}:`, error);
}

async function runTests() {
  console.log('--- STARTING STAGE 4C SALES HISTORY & TRANSACTION MANAGEMENT TEST SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // 1. Register Business A & Owner
  const ownerAEmail = `owner4c_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4C A',
      phone: '0244111222',
      businessName: `Accra Mart A ${timestamp}`,
      businessType: 'Provision Shop',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  // 2. Register Business B & Owner (for Tenant Isolation checks)
  const ownerBEmail = `owner4c_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4C B',
      phone: '0244999888',
      businessName: `Kumasi Enterprise B ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerBData = await regBRes.json();
  const ownerBToken = ownerBData.token;
  const bizBId = ownerBData.business.id;

  // 3. Create Staff in Biz A without pos_sales
  const staffNoPosEmail = `staff_nopos_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff No POS',
      email: staffNoPosEmail,
      phone: '0244333111',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: false,
        financial_reports: false,
      },
    }),
  });
  const loginNoPosRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffNoPosEmail, password: 'password123' }),
  });
  const staffNoPosToken = (await loginNoPosRes.json()).token;

  // 4. Create Staff in Biz A with pos_sales ONLY (NO financial_reports)
  const staffPosOnlyEmail = `staff_posonly_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff POS Only',
      email: staffPosOnlyEmail,
      phone: '0244333222',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        financial_reports: false,
      },
    }),
  });
  const loginPosOnlyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffPosOnlyEmail, password: 'password123' }),
  });
  const staffPosOnlyToken = (await loginPosOnlyRes.json()).token;

  // 5. Create Staff in Biz A with pos_sales AND financial_reports
  const staffFinEmail = `staff_fin_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff Fin',
      email: staffFinEmail,
      phone: '0244333333',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        financial_reports: true,
      },
    }),
  });
  const loginFinRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffFinEmail, password: 'password123' }),
  });
  const staffFinToken = (await loginFinRes.json()).token;

  // 6. Create product in Biz A
  const prodARes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: 'Ghana Sugar 1kg',
      sku: 'SUGAR-GH-01',
      category: 'Groceries',
      sellingPrice: 35.0,
      buyingPrice: 25.0,
      quantity: 100,
      minStockLevel: 10,
    }),
  });
  const productA = await prodARes.json();

  // 7. Create product in Biz B
  const prodBRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerBToken}`,
    },
    body: JSON.stringify({
      name: 'Milo Tin 400g',
      sku: 'MILO-400',
      category: 'Groceries',
      sellingPrice: 60.0,
      buyingPrice: 45.0,
      quantity: 50,
      minStockLevel: 5,
    }),
  });
  const productB = await prodBRes.json();

  // 8. Create Sales in Biz A
  const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      customerName: 'Kofi Mensah',
      customerPhone: '0244123456',
      items: [{ productId: productA.id, quantity: 2 }],
      subtotal: 70.0,
      discount: 5.0,
      total: 65.0,
      amountPaid: 65.0,
      paymentMethod: 'Cash',
    }),
  });
  const sale1 = await sale1Res.json();

  const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      customerName: 'Akosua Serwaa',
      customerPhone: '0209876543',
      items: [{ productId: productA.id, quantity: 1 }],
      subtotal: 35.0,
      discount: 0,
      total: 35.0,
      amountPaid: 35.0,
      paymentMethod: 'Mobile Money',
    }),
  });
  const sale2 = await sale2Res.json();

  // 9. Create Sale in Biz B
  const saleBRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerBToken}`,
    },
    body: JSON.stringify({
      customerName: 'Kwame Nkrumah',
      customerPhone: '0551122334',
      items: [{ productId: productB.id, quantity: 1 }],
      subtotal: 60.0,
      discount: 0,
      total: 60.0,
      amountPaid: 60.0,
      paymentMethod: 'Cash',
    }),
  });
  const saleB = await saleBRes.json();

  // --- TEST 1: Unauthenticated request to GET /api/sales is rejected with 401 ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`);
    if (res.status === 401) {
      pass('Test 1: Unauthenticated request to GET /api/sales is rejected with 401');
    } else {
      fail('Test 1', `Expected 401 but got ${res.status}`);
    }
  } catch (err) {
    fail('Test 1', err);
  }

  // --- TEST 2: Staff without pos_sales permission is rejected with 403 ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${staffNoPosToken}` },
    });
    if (res.status === 403) {
      pass('Test 2: Staff without pos_sales permission is rejected with 403');
    } else {
      fail('Test 2', `Expected 403 but got ${res.status}`);
    }
  } catch (err) {
    fail('Test 2', err);
  }

  // --- TEST 3: Staff with pos_sales permission can access GET /api/sales ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${staffPosOnlyToken}` },
    });
    if (res.status === 200) {
      pass('Test 3: Staff with pos_sales permission successfully accesses GET /api/sales');
    } else {
      fail('Test 3', `Expected 200 but got ${res.status}`);
    }
  } catch (err) {
    fail('Test 3', err);
  }

  // --- TEST 4: Tenant isolation between Business A and Business B ---
  try {
    const resA = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const salesA = await resA.json();

    const resB = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const salesB = await resB.json();

    const bizAIds = salesA.map((s: any) => s.businessId);
    const bizBIds = salesB.map((s: any) => s.businessId);

    const isIsolatedA = bizAIds.every((id: string) => id === bizAId);
    const isIsolatedB = bizBIds.every((id: string) => id === bizBId);
    const crossCheck = !salesA.some((s: any) => s.id === saleB.id) && !salesB.some((s: any) => s.id === sale1.id);

    if (isIsolatedA && isIsolatedB && crossCheck) {
      pass('Test 4: Strict tenant isolation enforced in sales history queries');
    } else {
      fail('Test 4', 'Cross-tenant leak detected in sales');
    }
  } catch (err) {
    fail('Test 4', err);
  }

  // --- TEST 5: Business owner receives authoritative profit and buying cost ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const sales = await res.json();
    const fetchedSale1 = sales.find((s: any) => s.id === sale1.id);

    if (fetchedSale1 && typeof fetchedSale1.profit === 'number' && fetchedSale1.profit === 15.0) {
      pass('Test 5: Business owner receives authoritative profit calculations');
    } else {
      fail('Test 5', `Expected profit 15.0 but got ${fetchedSale1?.profit}`);
    }
  } catch (err) {
    fail('Test 5', err);
  }

  // --- TEST 6: Staff without financial_reports has profit and buyingPrice stripped ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${staffPosOnlyToken}` },
    });
    const sales = await res.json();
    const fetchedSale1 = sales.find((s: any) => s.id === sale1.id);

    const hasNoSaleProfit = fetchedSale1?.profit === undefined;
    const hasNoItemBuyingPrice = fetchedSale1?.items.every(
      (i: any) => i.buyingPrice === undefined && i.profit === undefined
    );

    if (hasNoSaleProfit && hasNoItemBuyingPrice) {
      pass('Test 6: Staff without financial_reports has profit and buying price stripped on server');
    } else {
      fail('Test 6', 'Sensitive profit or buying cost leaked to unauthorized staff');
    }
  } catch (err) {
    fail('Test 6', err);
  }

  // --- TEST 7: Staff with financial_reports receives profit ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${staffFinToken}` },
    });
    const sales = await res.json();
    const fetchedSale1 = sales.find((s: any) => s.id === sale1.id);

    if (fetchedSale1 && typeof fetchedSale1.profit === 'number') {
      pass('Test 7: Staff with financial_reports permission receives authorized profit');
    } else {
      fail('Test 7', 'Authorized staff did not receive profit data');
    }
  } catch (err) {
    fail('Test 7', err);
  }

  // --- TEST 8: GET /api/sales/:id single transaction retrieval ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales/${sale1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const fetched = await res.json();

    if (res.status === 200 && fetched.id === sale1.id && fetched.receiptNumber === sale1.receiptNumber) {
      pass('Test 8: GET /api/sales/:id retrieves exact transaction details');
    } else {
      fail('Test 8', `Failed to retrieve sale by id: status ${res.status}`);
    }
  } catch (err) {
    fail('Test 8', err);
  }

  // --- TEST 9: Cross-tenant GET /api/sales/:id is blocked (404) ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales/${saleB.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    if (res.status === 404) {
      pass('Test 9: Cross-tenant access to GET /api/sales/:id is rejected with 404');
    } else {
      fail('Test 9', `Expected 404 for cross-tenant sale request but got ${res.status}`);
    }
  } catch (err) {
    fail('Test 9', err);
  }

  // --- TEST 10: GET /api/sales/:id sanitizes profit for staff without permission ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales/${sale1.id}`, {
      headers: { Authorization: `Bearer ${staffPosOnlyToken}` },
    });
    const fetched = await res.json();

    if (res.status === 200 && fetched.profit === undefined && fetched.items[0]?.buyingPrice === undefined) {
      pass('Test 10: GET /api/sales/:id sanitizes profit for unauthorized staff');
    } else {
      fail('Test 10', 'Profit leaked in GET /api/sales/:id');
    }
  } catch (err) {
    fail('Test 10', err);
  }

  // --- TEST 11: Query search filtering by receipt number, customer, and phone ---
  try {
    const resReceipt = await fetch(`${BASE_URL}/api/sales?search=${encodeURIComponent(sale1.receiptNumber)}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const resultsReceipt = await resReceipt.json();

    const resCustomer = await fetch(`${BASE_URL}/api/sales?search=Kofi`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const resultsCustomer = await resCustomer.json();

    const resPhone = await fetch(`${BASE_URL}/api/sales?search=0244123456`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const resultsPhone = await resPhone.json();

    if (
      resultsReceipt.length === 1 &&
      resultsCustomer.length === 1 &&
      resultsPhone.length === 1 &&
      resultsReceipt[0].id === sale1.id
    ) {
      pass('Test 11: Query search correctly filters by receipt number, customer name, and phone');
    } else {
      fail('Test 11', 'Search filtering did not return expected matches');
    }
  } catch (err) {
    fail('Test 11', err);
  }

  // --- TEST 12: Query payment method filtering ---
  try {
    const resCash = await fetch(`${BASE_URL}/api/sales?paymentMethod=Cash`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const cashSales = await resCash.json();

    const resMomo = await fetch(`${BASE_URL}/api/sales?paymentMethod=Mobile%20Money`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const momoSales = await resMomo.json();

    if (
      cashSales.every((s: any) => s.paymentMethod === 'Cash') &&
      momoSales.every((s: any) => s.paymentMethod === 'Mobile Money')
    ) {
      pass('Test 12: Query payment method filter correctly isolates Cash and Mobile Money');
    } else {
      fail('Test 12', 'Payment method filtering failed');
    }
  } catch (err) {
    fail('Test 12', err);
  }

  // --- TEST 13: Query date filtering using Africa/Accra business calendar ---
  try {
    const todayStr = getAccraToday();
    const resDate = await fetch(`${BASE_URL}/api/sales?startDate=${todayStr}&endDate=${todayStr}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const dateSales = await resDate.json();

    if (dateSales.length >= 2 && dateSales.some((s: any) => s.id === sale1.id)) {
      pass('Test 13: Query date filtering correctly filters transactions in Accra business time');
    } else {
      fail('Test 13', 'Date filtering failed for today Accra sales');
    }
  } catch (err) {
    fail('Test 13', err);
  }

  // --- TEST 14: Accra date utilities verification ---
  try {
    const today = getAccraToday();
    const yesterday = getAccraYesterday();
    const isToday = isTodayInAccra(new Date());
    const isYest = isYesterdayInAccra(yesterday);

    if (today && yesterday && isToday && isYest && today !== yesterday) {
      pass('Test 14: Africa/Accra date utilities (getAccraToday, getAccraYesterday, isTodayInAccra) verified');
    } else {
      fail('Test 14', 'Accra date logic error');
    }
  } catch (err) {
    fail('Test 14', err);
  }

  // --- TEST 15: Non-destructive reading - queries do not alter inventory or stock movements ---
  try {
    const prodResBefore = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodsBefore = await prodResBefore.json();
    const prodBefore = prodsBefore.find((p: any) => p.id === productA.id);
    const stockBefore = prodBefore.quantity;

    // Perform multiple reads
    await fetch(`${BASE_URL}/api/sales`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
    await fetch(`${BASE_URL}/api/sales/${sale1.id}`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
    await fetch(`${BASE_URL}/api/sales?search=Ghana`, { headers: { Authorization: `Bearer ${ownerAToken}` } });

    const prodResAfter = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodsAfter = await prodResAfter.json();
    const prodAfter = prodsAfter.find((p: any) => p.id === productA.id);
    const stockAfter = prodAfter.quantity;

    if (stockBefore === stockAfter) {
      pass('Test 15: Sales history queries are strictly non-destructive (no stock or movement alteration)');
    } else {
      fail('Test 15', 'History queries mutated inventory state!');
    }
  } catch (err) {
    fail('Test 15', err);
  }

  // --- TEST 16: Payment breakdown and revenue mathematical consistency ---
  try {
    const resA = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const allSalesA = await resA.json();

    const calculatedTotal = allSalesA.reduce((sum: number, s: any) => sum + s.total, 0);
    const calculatedCash = allSalesA
      .filter((s: any) => s.paymentMethod === 'Cash')
      .reduce((sum: number, s: any) => sum + s.total, 0);
    const calculatedMomo = allSalesA
      .filter((s: any) => s.paymentMethod === 'Mobile Money')
      .reduce((sum: number, s: any) => sum + s.total, 0);

    if (calculatedTotal === 100.0 && calculatedCash === 65.0 && calculatedMomo === 35.0) {
      pass('Test 16: Sales totals, cash totals, and Mobile Money totals match exact ledger amounts');
    } else {
      fail('Test 16', `Math discrepancy: total ${calculatedTotal}, cash ${calculatedCash}, momo ${calculatedMomo}`);
    }
  } catch (err) {
    fail('Test 16', err);
  }

  // --- TEST 17: Safe receipt reprinting data integrity ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales/${sale1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const sale = await res.json();

    const hasRequiredFields =
      sale.receiptNumber &&
      sale.customerName &&
      sale.createdAt &&
      Array.isArray(sale.items) &&
      sale.items.length > 0 &&
      typeof sale.total === 'number' &&
      typeof sale.amountPaid === 'number' &&
      sale.paymentMethod;

    if (hasRequiredFields) {
      pass('Test 17: Sale transaction contains complete data payload for thermal receipt reprinting');
    } else {
      fail('Test 17', 'Missing fields required for receipt reprinting');
    }
  } catch (err) {
    fail('Test 17', err);
  }

  // --- TEST 18: Debt balance and credit status tracking in sales ledger ---
  try {
    // Upgrade owner to Starter so customers/debtors are enabled
    await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ plan: 'STARTER' }),
    });

    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Kweku Debt Customer',
        phone: '0240001122',
        creditLimit: 500,
      }),
    });
    const customer = await custRes.json();

    const debtSalePayload = {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [{ productId: productA.id, quantity: 1 }],
      subtotal: 35.0,
      discount: 0,
      total: 35.0,
      amountPaid: 15.0,
      dueDate: '2026-09-30',
      paymentMethod: 'Credit/Debt',
    };

    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify(debtSalePayload),
    });
    const debtSale = await res.json();
    if (debtSale.balance !== 20.0) {
      console.error('Debt sale response:', res.status, debtSale);
    }

    if (debtSale.balance === 20.0 && debtSale.dueDate === '2026-09-30') {
      pass('Test 18: Debt sale recorded with accurate balance and due date in ledger');
    } else {
      fail('Test 18', `Unexpected debt balance: ${debtSale.balance}`);
    }
  } catch (err) {
    fail('Test 18', err);
  }

  // --- TEST 19: Server-side credit/debt filter in GET /api/sales ---
  try {
    const res = await fetch(`${BASE_URL}/api/sales?paymentMethod=Credit/Debt`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const creditSales = await res.json();

    if (creditSales.length >= 1 && creditSales.some((s: any) => s.balance > 0)) {
      pass('Test 19: GET /api/sales?paymentMethod=Credit/Debt filters unpaid debt sales');
    } else {
      fail('Test 19', 'Credit sales filter failed');
    }
  } catch (err) {
    fail('Test 19', err);
  }

  // --- TEST 20: Confirm zero duplicate sales APIs or secondary architectures ---
  try {
    const serverCode = await import('fs').then((fs) => fs.readFileSync('./server.ts', 'utf8'));
    const salesPostMatches = (serverCode.match(/app\.post\('\/api\/sales'/g) || []).length;
    const salesGetMatches = (serverCode.match(/app\.get\('\/api\/sales'/g) || []).length;
    const salesIdGetMatches = (serverCode.match(/app\.get\('\/api\/sales\/:id'/g) || []).length;

    if (salesPostMatches === 1 && salesGetMatches === 1 && salesIdGetMatches === 1) {
      pass('Test 20: Verified single authoritative sales API surface (0 duplicate sales systems)');
    } else {
      fail(
        'Test 20',
        `Duplicate sales endpoints found: post=${salesPostMatches}, get=${salesGetMatches}, getId=${salesIdGetMatches}`
      );
    }
  } catch (err) {
    fail('Test 20', err);
  }

  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`FINAL RESULT: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('========================================');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
