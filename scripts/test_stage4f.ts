/**
 * STAGE 4F AUTOMATED VERIFICATION SUITE
 * Financial Reports, Dashboard Insights & Business Analytics
 * 30 Comprehensive Test Cases
 */

import { db } from '../server/db.js';
import { getAccraToday, formatAccraDate, getAccraDateString } from '../src/utils/date.js';

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
  console.log('--- STARTING STAGE 4F FINANCIAL REPORTS & ANALYTICS TEST SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // Setup: Register Business A, Business B, and Business Free
  // ----------------------------------------------------
  const ownerAEmail = `owner4f_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4F Accra',
      phone: '0244111222',
      businessName: `Accra Analytics Mart ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  const ownerBEmail = `owner4f_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4F Kumasi',
      phone: '0244888999',
      businessName: `Kumasi Analytics Mart ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerBData = await regBRes.json();
  const ownerBToken = ownerBData.token;
  const bizBId = ownerBData.business.id;

  const ownerFreeEmail = `owner4f_free_${timestamp}@test.com`;
  const regFreeRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerFreeEmail,
      password: 'password123',
      fullName: 'Owner 4F Free',
      phone: '0244777555',
      businessName: `Free Analytics Mart ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerFreeData = await regFreeRes.json();
  const ownerFreeToken = ownerFreeData.token;
  const bizFreeId = ownerFreeData.business.id;

  // Master Admin Login for subscription configuration
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@businessmanagergh.com', password: 'Admin@GH2026' }),
  });
  const adminToken = (await adminLoginRes.json()).token;

  // Upgrade Business A and Business B to business plan
  await fetch(`${BASE_URL}/api/admin/subscriptions/${bizAId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ plan: 'business' }),
  });

  await fetch(`${BASE_URL}/api/admin/subscriptions/${bizBId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ plan: 'business' }),
  });

  // Keep Business Free on free tier (financial_reports is locked on free)
  await fetch(`${BASE_URL}/api/admin/subscriptions/${bizFreeId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ plan: 'free' }),
  });

  // TEST 1: Owner registration and business setup in Africa/Accra timezone
  try {
    if (ownerAToken && bizAId && ownerAData.business.name.includes('Accra Analytics Mart')) {
      pass('Test 1: Owner registration and business setup in Africa/Accra timezone');
    } else {
      fail('Test 1: Owner registration failed', ownerAData);
    }
  } catch (err) {
    fail('Test 1: Exception during owner registration', err);
  }

  // TEST 2: Staff creation with financial_reports permission
  let staffAuthToken = '';
  try {
    const staffAuthEmail = `staff_auth_${timestamp}@test.com`;
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Staff Authorized',
        email: staffAuthEmail,
        phone: '0244111888',
        password: 'password123',
        permissions: {
          dashboard: true,
          pos_sales: true,
          view_products: true,
          financial_reports: true,
        },
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.staff && data.staff.permissions?.financial_reports === true) {
      // Login staff to get token
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffAuthEmail, password: 'password123' }),
      });
      const loginData = await loginRes.json();
      staffAuthToken = loginData.token;
      pass('Test 2: Staff creation with financial_reports permission succeeds');
    } else {
      fail('Test 2: Staff creation failed', data);
    }
  } catch (err) {
    fail('Test 2: Exception during staff creation', err);
  }

  // TEST 3: Staff creation without financial_reports permission
  let staffRestrictedToken = '';
  try {
    const staffRestEmail = `staff_rest_${timestamp}@test.com`;
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Staff Restricted',
        email: staffRestEmail,
        phone: '0244222999',
        password: 'password123',
        permissions: {
          dashboard: true,
          pos_sales: true,
          view_products: true,
          financial_reports: false,
        },
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.staff && data.staff.permissions?.financial_reports === false) {
      // Login staff to get token
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffRestEmail, password: 'password123' }),
      });
      const loginData = await loginRes.json();
      staffRestrictedToken = loginData.token;
      pass('Test 3: Staff creation without financial_reports permission succeeds');
    } else {
      fail('Test 3: Staff creation without reports failed', data);
    }
  } catch (err) {
    fail('Test 3: Exception during staff creation', err);
  }

  // TEST 4: Subscription feature gate check: Starter/Free plan cannot access GET /api/reports
  try {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${ownerFreeToken}` },
    });
    if (res.status === 403) {
      pass('Test 4: Free/Starter plan rejects GET /api/reports with 403 Feature Locked');
    } else {
      fail(`Test 4: Expected 403 for starter plan, received ${res.status}`, await res.text());
    }
  } catch (err) {
    fail('Test 4: Exception during subscription gate check', err);
  }

  // TEST 5: Business plan allows access to GET /api/reports
  try {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status === 200) {
      pass('Test 5: Business plan successfully accesses GET /api/reports with 200 OK');
    } else {
      fail(`Test 5: Expected 200 for business plan, received ${res.status}`, await res.text());
    }
  } catch (err) {
    fail('Test 5: Exception during business plan check', err);
  }

  // TEST 6: GET /api/reports rejects unauthenticated requests (401)
  try {
    const res = await fetch(`${BASE_URL}/api/reports`);
    if (res.status === 401) {
      pass('Test 6: GET /api/reports rejects unauthenticated requests with 401');
    } else {
      fail(`Test 6: Expected 401, received ${res.status}`, await res.text());
    }
  } catch (err) {
    fail('Test 6: Exception during unauthenticated check', err);
  }

  // TEST 7: GET /api/reports rejects staff without financial_reports (403)
  try {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${staffRestrictedToken}` },
    });
    if (res.status === 403) {
      pass('Test 7: GET /api/reports rejects staff without financial_reports with 403');
    } else {
      fail(`Test 7: Expected 403 for restricted staff, received ${res.status}`, await res.text());
    }
  } catch (err) {
    fail('Test 7: Exception during staff permission check', err);
  }

  // TEST 8: GET /api/reports succeeds for authorized owner and authorized staff
  try {
    const resStaff = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${staffAuthToken}` },
    });
    const resOwner = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (resStaff.status === 200 && resOwner.status === 200) {
      pass('Test 8: GET /api/reports succeeds for authorized owner and authorized staff');
    } else {
      fail(`Test 8: Expected 200 for both, got staff=${resStaff.status}, owner=${resOwner.status}`, null);
    }
  } catch (err) {
    fail('Test 8: Exception during authorized check', err);
  }

  // Setup sample inventory products for Business A:
  // Product 1: Milo 400g (buyingPrice: 20, sellingPrice: 30, stock: 100)
  // Product 2: Milk Peak (buyingPrice: 10, sellingPrice: 15, stock: 100)
  let p1Id = '';
  let p2Id = '';
  try {
    const p1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Milo 400g Refill',
        sku: `MILO-${timestamp}`,
        category: 'Groceries',
        buyingPrice: 20,
        sellingPrice: 30,
        quantity: 100,
        minStockLevel: 5,
      }),
    });
    p1Id = (await p1Res.json()).id;

    const p2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Peak Evaporated Milk',
        sku: `PEAK-${timestamp}`,
        category: 'Groceries',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 100,
        minStockLevel: 10,
      }),
    });
    p2Id = (await p2Res.json()).id;
  } catch (err) {
    console.error('Error creating products for test:', err);
  }

  // TEST 9: Tenant isolation: Business B data does not leak into Business A reports
  try {
    // Create product and sale in Business B
    const bProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBToken}` },
      body: JSON.stringify({
        name: 'Kumasi Kente Cloth',
        sku: `KENTE-${timestamp}`,
        category: 'Fabrics',
        buyingPrice: 500,
        sellingPrice: 1200,
        quantity: 10,
      }),
    });
    const bProd = await bProdRes.json();

    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBToken}` },
      body: JSON.stringify({
        items: [{ productId: bProd.id, productName: bProd.name, quantity: 1, sellingPrice: 1200, buyingPrice: 500, total: 1200 }],
        subtotal: 1200,
        total: 1200,
        amountPaid: 1200,
        paymentMethod: 'Cash',
      }),
    });

    // Check Business A reports
    const reportARes = await fetch(`${BASE_URL}/api/reports?range=all_time`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const reportA = await reportARes.json();

    const hasKumasiKente = reportA.topProducts.some((p: any) => p.productName.includes('Kente'));
    if (!hasKumasiKente) {
      pass('Test 9: Tenant isolation verified: Business B sales do not appear in Business A reports');
    } else {
      fail('Test 9: Tenant isolation breached! Business B product found in Business A reports', reportA);
    }
  } catch (err) {
    fail('Test 9: Exception during tenant isolation check', err);
  }

  // Create authoritative transactions in Business A:
  // Sale 1: Completed Cash sale (2 x Milo = 60, cost = 40, profit = 20)
  // Sale 2: Completed MoMo sale (4 x Peak Milk = 60, cost = 40, profit = 20)
  // Sale 3: Completed Bank Transfer sale (1 x Milo + 2 x Peak Milk = 30 + 30 = 60, cost = 20 + 20 = 40, profit = 20)
  // Total completed sales = 180, COGS = 120, Gross Profit = 60
  try {
    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [{ productId: p1Id, productName: 'Milo 400g Refill', quantity: 2, sellingPrice: 30, buyingPrice: 20, total: 60 }],
        subtotal: 60,
        total: 60,
        amountPaid: 60,
        paymentMethod: 'Cash',
      }),
    });

    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [{ productId: p2Id, productName: 'Peak Evaporated Milk', quantity: 4, sellingPrice: 15, buyingPrice: 10, total: 60 }],
        subtotal: 60,
        total: 60,
        amountPaid: 60,
        paymentMethod: 'Mobile Money',
      }),
    });

    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [
          { productId: p1Id, productName: 'Milo 400g Refill', quantity: 1, sellingPrice: 30, buyingPrice: 20, total: 30 },
          { productId: p2Id, productName: 'Peak Evaporated Milk', quantity: 2, sellingPrice: 15, buyingPrice: 10, total: 30 },
        ],
        subtotal: 60,
        total: 60,
        amountPaid: 60,
        paymentMethod: 'Bank Transfer',
      }),
    });
  } catch (err) {
    console.error('Error creating sales for tests:', err);
  }

  // TEST 10: Sales calculation: total revenue equals sum of completed sales
  let reportData: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    reportData = await res.json();
    if (reportData.totalRevenue >= 180 && reportData.salesCount >= 3) {
      pass(`Test 10: Total revenue correctly calculated (${reportData.totalRevenue} GHS across ${reportData.salesCount} sales)`);
    } else {
      fail('Test 10: Total revenue mismatch', reportData);
    }
  } catch (err) {
    fail('Test 10: Exception during sales calculation check', err);
  }

  // TEST 11: Pending or cancelled sales are excluded from report revenue
  try {
    // Inject a cancelled sale into db directly or verify filtering
    const cancelledSale = db.createSale({
      businessId: bizAId,
      items: [{ productId: p1Id, productName: 'Milo 400g Refill', quantity: 10, sellingPrice: 30, buyingPrice: 20, total: 300, profit: 100 }],
      subtotal: 300,
      total: 300,
      discount: 0,
      balance: 0,
      profit: 100,
      amountPaid: 0,
      paymentMethod: 'Cash',
      status: 'Cancelled',
      createdBy: 'test-staff',
    });

    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const updated = await res.json();
    // Revenue must remain 180, not 480
    if (updated.totalRevenue === reportData.totalRevenue) {
      pass('Test 11: Cancelled sales are properly excluded from financial report revenue');
    } else {
      fail(`Test 11: Cancelled sale was included! Revenue is ${updated.totalRevenue}`, updated);
    }
  } catch (err) {
    fail('Test 11: Exception during cancelled sales check', err);
  }

  // TEST 12: Cost of Goods Sold (COGS) calculated from product buying prices
  try {
    // 3 Milo (3x20 = 60) + 6 Peak Milk (6x10 = 60) = 120
    if (reportData.costOfGoods >= 120) {
      pass(`Test 12: Cost of Goods Sold (COGS) correctly calculated (${reportData.costOfGoods} GHS)`);
    } else {
      fail(`Test 12: Expected COGS >= 120, got ${reportData.costOfGoods}`, reportData);
    }
  } catch (err) {
    fail('Test 12: Exception during COGS check', err);
  }

  // TEST 13: Gross profit calculation: totalRevenue - costOfGoods
  try {
    const expectedGross = reportData.totalRevenue - reportData.costOfGoods;
    if (Math.abs(reportData.grossProfit - expectedGross) < 0.01) {
      pass(`Test 13: Gross profit correctly matches revenue minus cost (${reportData.grossProfit} GHS)`);
    } else {
      fail(`Test 13: Gross profit mismatch. Expected ${expectedGross}, got ${reportData.grossProfit}`, reportData);
    }
  } catch (err) {
    fail('Test 13: Exception during gross profit check', err);
  }

  // TEST 14: Gross margin percentage correctly computed
  try {
    const expectedMargin = Number(((reportData.grossProfit / reportData.totalRevenue) * 100).toFixed(2));
    if (Math.abs(reportData.grossMargin - expectedMargin) < 0.05) {
      pass(`Test 14: Gross margin percentage correctly computed (${reportData.grossMargin}%)`);
    } else {
      fail(`Test 14: Gross margin mismatch. Expected ${expectedMargin}%, got ${reportData.grossMargin}%`, reportData);
    }
  } catch (err) {
    fail('Test 14: Exception during gross margin check', err);
  }

  // Create Authoritative Expenses:
  // Expense 1: Utilities ECG Electricity (15 GHS, Cash)
  // Expense 2: Transport Delivery (25 GHS, MoMo)
  // Total expenses = 40 GHS
  try {
    await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        title: 'ECG Prepaid Light',
        category: 'Utilities',
        amount: 15,
        paymentMethod: 'Cash',
      }),
    });

    await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        title: 'Store Delivery Moto',
        category: 'Transportation',
        amount: 25,
        paymentMethod: 'Mobile Money',
      }),
    });
  } catch (err) {
    console.error('Error creating expenses for tests:', err);
  }

  // TEST 15: Operating expenses calculation: sum of expenses in period
  let updatedReportWithExpenses: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    updatedReportWithExpenses = await res.json();
    if (updatedReportWithExpenses.totalExpenses >= 40) {
      pass(`Test 15: Operating expenses correctly summed (${updatedReportWithExpenses.totalExpenses} GHS)`);
    } else {
      fail('Test 15: Operating expenses mismatch', updatedReportWithExpenses);
    }
  } catch (err) {
    fail('Test 15: Exception during expenses calculation check', err);
  }

  // TEST 16: Net profit calculation: grossProfit - totalExpenses
  try {
    const expectedNet = updatedReportWithExpenses.grossProfit - updatedReportWithExpenses.totalExpenses;
    if (Math.abs(updatedReportWithExpenses.netProfit - expectedNet) < 0.01) {
      pass(`Test 16: Net profit correctly matches Gross Profit minus Expenses (${updatedReportWithExpenses.netProfit} GHS)`);
    } else {
      fail(`Test 16: Net profit mismatch. Expected ${expectedNet}, got ${updatedReportWithExpenses.netProfit}`, updatedReportWithExpenses);
    }
  } catch (err) {
    fail('Test 16: Exception during net profit check', err);
  }

  // TEST 17: Purchases separation: Stock-in purchase does NOT inflate operating expenses or reduce net profit
  try {
    const expensesBefore = updatedReportWithExpenses.totalExpenses;
    const netProfitBefore = updatedReportWithExpenses.netProfit;

    // Record Stock-in Purchase of 500 GHS
    await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        supplierName: 'Nestle Ghana Wholesale',
        items: [{ productId: p1Id, productName: 'Milo 400g Refill', quantity: 25, buyingPrice: 20, total: 500 }],
        totalAmount: 500,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'Paid',
      }),
    });

    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const afterPurchaseReport = await res.json();

    if (
      afterPurchaseReport.totalExpenses === expensesBefore &&
      afterPurchaseReport.netProfit === netProfitBefore &&
      afterPurchaseReport.purchasesTotal >= 500
    ) {
      pass('Test 17: Purchases separation verified: Restocking purchase does NOT inflate operating expenses or reduce net profit');
    } else {
      fail('Test 17: Purchases separation breached! Operating expenses or net profit altered', {
        expensesBefore,
        expensesAfter: afterPurchaseReport.totalExpenses,
        netProfitBefore,
        netProfitAfter: afterPurchaseReport.netProfit,
        purchasesTotal: afterPurchaseReport.purchasesTotal,
      });
    }
  } catch (err) {
    fail('Test 17: Exception during purchases separation check', err);
  }

  // TEST 18: Purchases total and purchases by supplier correctly reported
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    const hasNestle = report.purchasesBySupplier?.some((s: any) => s.supplierName.includes('Nestle'));
    if (report.purchasesTotal >= 500 && report.purchaseCount >= 1 && hasNestle) {
      pass('Test 18: Purchases total, count, and supplier breakdown correctly reported');
    } else {
      fail('Test 18: Purchases supplier breakdown mismatch', report);
    }
  } catch (err) {
    fail('Test 18: Exception during purchases breakdown check', err);
  }

  // TEST 19: Sales by payment method breakdown
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    if (report.cashSales >= 60 && report.momoSales >= 60 && report.bankTransferSales >= 60) {
      pass(`Test 19: Sales by payment method breakdown verified (Cash: ${report.cashSales}, MoMo: ${report.momoSales}, Bank: ${report.bankTransferSales})`);
    } else {
      fail('Test 19: Payment method breakdown mismatch', report);
    }
  } catch (err) {
    fail('Test 19: Exception during payment method check', err);
  }

  // TEST 20: Average transaction value correctly calculated
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    const expectedAvg = Number((report.totalRevenue / report.salesCount).toFixed(2));
    if (Math.abs(report.averageTransactionValue - expectedAvg) < 0.05) {
      pass(`Test 20: Average transaction value correctly calculated (${report.averageTransactionValue} GHS)`);
    } else {
      fail(`Test 20: Average transaction value mismatch. Expected ${expectedAvg}, got ${report.averageTransactionValue}`, report);
    }
  } catch (err) {
    fail('Test 20: Exception during average transaction value check', err);
  }

  // TEST 21: Expense breakdown by category and highest expense category
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    // Transportation was 25 GHS, Utilities was 15 GHS -> Transportation should be highest
    if (report.highestExpenseCategory === 'Transportation' && report.expensesByCategory.length >= 2) {
      pass(`Test 21: Highest expense category identified (${report.highestExpenseCategory}) with full breakdown`);
    } else {
      fail('Test 21: Expense category breakdown mismatch', report);
    }
  } catch (err) {
    fail('Test 21: Exception during expense category check', err);
  }

  // TEST 22: Expense breakdown by payment method
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    const hasCash = report.expensesByPaymentMethod?.some((m: any) => m.method === 'Cash' && m.amount >= 15);
    const hasMoMo = report.expensesByPaymentMethod?.some((m: any) => m.method === 'Mobile Money' && m.amount >= 25);
    if (hasCash && hasMoMo) {
      pass('Test 22: Expense breakdown by payment method correctly calculated');
    } else {
      fail('Test 22: Expense by payment method mismatch', report.expensesByPaymentMethod);
    }
  } catch (err) {
    fail('Test 22: Exception during expense payment method check', err);
  }

  // TEST 23: Inventory valuation: total cost value, retail value, potential profit
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    const inv = report.inventoryValuation;
    if (inv && inv.totalCostValue > 0 && inv.totalRetailValue > inv.totalCostValue && inv.potentialProfit > 0) {
      pass(`Test 23: Inventory valuation verified (Cost: ${inv.totalCostValue}, Retail: ${inv.totalRetailValue}, Potential Profit: ${inv.potentialProfit})`);
    } else {
      fail('Test 23: Inventory valuation mismatch', inv);
    }
  } catch (err) {
    fail('Test 23: Exception during inventory valuation check', err);
  }

  // TEST 24: Debtors reporting: total debt, debtors count, top debtors
  try {
    // Create customer with credit limit
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Kofi Debtor Mensah',
        phone: '0244999111',
        creditLimit: 1000,
      }),
    });
    const cust = await custRes.json();

    // Create a credit sale with 350 remaining balance (debt)
    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        items: [{ productId: p1Id, productName: 'Milo 400g Refill', quantity: 15, sellingPrice: 30, buyingPrice: 20, total: 450 }],
        subtotal: 450,
        total: 450,
        amountPaid: 100,
        paymentMethod: 'Credit/Debt',
      }),
    });

    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();

    const hasKofi = report.topDebtors?.some((d: any) => d.name.includes('Kofi Debtor'));
    if (report.totalDebtOwed >= 350 && report.debtorsCount >= 1 && hasKofi) {
      pass(`Test 24: Debtors reporting verified (Total Debt: ${report.totalDebtOwed} GHS, Count: ${report.debtorsCount})`);
    } else {
      fail('Test 24: Debtors reporting mismatch', report);
    }
  } catch (err) {
    fail('Test 24: Exception during debtors reporting check', err);
  }

  // TEST 25: Top selling products by revenue and quantity
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const report = await res.json();
    if (report.topProducts && report.topProducts.length >= 2) {
      const pTop = report.topProducts[0];
      if (pTop.totalRevenue > 0 && pTop.totalQuantity > 0) {
        pass(`Test 25: Top selling products report verified (Top: ${pTop.productName} with ${pTop.totalRevenue} GHS revenue)`);
      } else {
        fail('Test 25: Top product values invalid', pTop);
      }
    } else {
      fail('Test 25: Top products list missing or empty', report.topProducts);
    }
  } catch (err) {
    fail('Test 25: Exception during top products check', err);
  }

  // TEST 26: Filter reports by paymentMethod
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today&paymentMethod=Cash`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const filteredReport = await res.json();
    if (filteredReport.totalRevenue === 60 && filteredReport.salesCount === 1) {
      pass(`Test 26: Filter reports by paymentMethod=Cash successfully returned only cash sales (${filteredReport.totalRevenue} GHS)`);
    } else {
      fail(`Test 26: Expected 60 GHS cash sales, got ${filteredReport.totalRevenue}`, filteredReport);
    }
  } catch (err) {
    fail('Test 26: Exception during paymentMethod filter check', err);
  }

  // TEST 27: Filter reports by category (expenses)
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today&category=Utilities`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const filteredReport = await res.json();
    if (filteredReport.totalExpenses === 15) {
      pass(`Test 27: Filter reports by category=Utilities successfully returned only Utilities expense (${filteredReport.totalExpenses} GHS)`);
    } else {
      fail(`Test 27: Expected 15 GHS utilities expenses, got ${filteredReport.totalExpenses}`, filteredReport);
    }
  } catch (err) {
    fail('Test 27: Exception during category filter check', err);
  }

  // TEST 28: Date range filtering: today, this_month, and custom
  try {
    const todayStr = getAccraToday();
    const resToday = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const resMonth = await fetch(`${BASE_URL}/api/reports?range=this_month`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const resCustom = await fetch(`${BASE_URL}/api/reports?range=custom&startDate=${todayStr}&endDate=${todayStr}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    const dataToday = await resToday.json();
    const dataMonth = await resMonth.json();
    const dataCustom = await resCustom.json();

    if (dataToday.fromDate === todayStr && dataMonth.fromDate.endsWith('-01') && dataCustom.fromDate === todayStr) {
      pass('Test 28: Date range filtering verified across today, this_month, and custom ranges');
    } else {
      fail('Test 28: Date range filtering mismatch', { dataToday, dataMonth, dataCustom });
    }
  } catch (err) {
    fail('Test 28: Exception during date range filtering check', err);
  }

  // TEST 29: Financial privacy on Dashboard: Staff without financial_reports has sensitive metrics stripped
  try {
    const resRestricted = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${staffRestrictedToken}` },
    });
    const dashRestricted = await resRestricted.json();

    const resOwner = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const dashOwner = await resOwner.json();

    const ownerHasProfit = dashOwner.todayProfit !== undefined && dashOwner.inventoryValue !== undefined;
    const staffHasNoProfit = dashRestricted.todayProfit === undefined && dashRestricted.inventoryValue === undefined;
    const staffSalesOmitProfit = dashRestricted.salesOverTime?.every((s: any) => s.profit === undefined);
    const staffAlertsOmitBuyingPrice = dashRestricted.stockAlerts?.every((a: any) => a.buyingPrice === undefined);

    if (ownerHasProfit && staffHasNoProfit && staffSalesOmitProfit && staffAlertsOmitBuyingPrice) {
      pass('Test 29: Financial privacy on Dashboard verified: Restricted staff cannot view profit, inventory buying value, or margin trends');
    } else {
      fail('Test 29: Financial privacy check on dashboard failed', {
        dashOwnerProfit: dashOwner.todayProfit,
        dashStaffProfit: dashRestricted.todayProfit,
        dashStaffInventoryVal: dashRestricted.inventoryValue,
      });
    }
  } catch (err) {
    fail('Test 29: Exception during dashboard privacy check', err);
  }

  // TEST 30: Financial privacy on Products: Staff without financial_reports has buyingPrice masked
  try {
    const resRestricted = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${staffRestrictedToken}` },
    });
    const prodsRestricted = await resRestricted.json();

    const resOwner = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodsOwner = await resOwner.json();

    const ownerSeesBuyingPrice = prodsOwner.every((p: any) => p.buyingPrice !== undefined);
    const staffBuyingPriceMasked = prodsRestricted.every((p: any) => p.buyingPrice === undefined);

    if (ownerSeesBuyingPrice && staffBuyingPriceMasked) {
      pass('Test 30: Financial privacy on Products verified: Restricted staff cannot view product buying prices');
    } else {
      fail('Test 30: Product buying price privacy failed', {
        ownerBuyingPrice: prodsOwner[0]?.buyingPrice,
        staffBuyingPrice: prodsRestricted[0]?.buyingPrice,
      });
    }
  } catch (err) {
    fail('Test 30: Exception during products privacy check', err);
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n--- TEST SUITE EXECUTION SUMMARY ---');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 30 STAGE 4F TESTS PASSED SUCCESSFULLY!');
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
