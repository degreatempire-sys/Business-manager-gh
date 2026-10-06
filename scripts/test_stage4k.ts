/**
 * STAGE 4K COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Business Forecasting, Planning & Proactive Operations
 * 70+ Comprehensive Assertions & Regression Tests
 */

import { db } from '../server/db.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`✅ [PASS] ${name}`);
  } else {
    results.push({ name, passed: false, error: detail || 'Assertion failed' });
    console.error(`❌ [FAIL] ${name}: ${detail || 'Assertion failed'}`);
  }
}

async function runTests() {
  console.log('--- STARTING STAGE 4K BUSINESS FORECASTING & PLANNING VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // SETUP: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4k_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kofi Mensah (Owner A)',
        phone: '0244111222',
        businessName: `Accra Logistics & Supplies ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4k_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Serwaa (Owner B)',
        phone: '0244888999',
        businessName: `Kumasi Enterprise ${timestamp}`,
        businessType: 'Wholesale',
      }),
    });
    const ownerBData = await regBRes.json();
    const ownerBToken = ownerBData.token;
    const bizBId = ownerBData.business?.id;

    assert(Boolean(ownerBToken && bizBId), 'Business B registration succeeds');

    // Upgrade both businesses via admin to allow multi-staff
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@businessmanagergh.com', password: 'Admin@GH2026' }),
    });
    const adminToken = (await adminLoginRes.json()).token;

    await fetch(`${BASE_URL}/api/admin/subscriptions/${bizAId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ plan: 'business' }),
    });
    await fetch(`${BASE_URL}/api/admin/subscriptions/${bizBId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ plan: 'business' }),
    });

    // Create Staff 1 (Restricted financial permissions)
    const staff1Email = `staff4k_1_${timestamp}@test.com`;
    const staff1Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Yaw Cashier',
        email: staff1Email,
        phone: '0244333444',
        password: 'password123',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          financial_reports: false,
        },
      }),
    });
    const staff1Data = await staff1Res.json();
    assert(Boolean(staff1Data.staff?.id), 'Staff 1 created with restricted financial permissions');

    // Authenticate Staff 1
    const staff1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff1Email, password: 'password123' }),
    });
    const staff1LoginData = await staff1LoginRes.json();
    const staff1Token = staff1LoginData.token;
    assert(Boolean(staff1Token), 'Staff 1 authenticated successfully');

    // Create Staff 2 (Zero POS / Dashboard permissions)
    const staff2Email = `staff4k_2_${timestamp}@test.com`;
    const staff2Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Esi Security',
        email: staff2Email,
        phone: '0244555666',
        password: 'password123',
        permissions: {
          dashboard: false,
          pos_sales: false,
          sales_history: false,
          financial_reports: false,
        },
      }),
    });
    const staff2Data = await staff2Res.json();
    assert(Boolean(staff2Data.staff?.id), 'Staff 2 created with zero dashboard/POS permissions');

    // Authenticate Staff 2
    const staff2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff2Email, password: 'password123' }),
    });
    const staff2LoginData = await staff2LoginRes.json();
    const staff2Token = staff2LoginData.token;
    assert(Boolean(staff2Token), 'Staff 2 authenticated successfully');

    // ----------------------------------------------------
    // SEED TEST DATA FOR BUSINESS A
    // ----------------------------------------------------
    // Product 1: High velocity, low stock after sale (quantity: 12, minStockLevel: 10)
    const prod1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Peak Milk Tin',
        category: 'Dairy',
        buyingPrice: 8.0,
        sellingPrice: 12.0,
        quantity: 12, // after selling 10, 2 will remain!
        minStockLevel: 10,
        sku: `MILK-${timestamp}`,
        unit: 'tin',
      }),
    });
    const prod1 = await prod1Res.json();

    // Product 2: Moderate velocity, adequate stock
    const prod2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Royal Aroma Rice 5kg',
        category: 'Grains',
        buyingPrice: 80.0,
        sellingPrice: 120.0,
        quantity: 50,
        minStockLevel: 5,
        sku: `RICE-${timestamp}`,
        unit: 'bag',
      }),
    });
    const prod2 = await prod2Res.json();

    // Product 3: Zero sales, zero demand
    const prod3Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Frytol Cooking Oil 1L',
        category: 'Oils',
        buyingPrice: 35.0,
        sellingPrice: 50.0,
        quantity: 20,
        minStockLevel: 5,
        sku: `OIL-${timestamp}`,
        unit: 'bottle',
      }),
    });
    const prod3 = await prod3Res.json();

    assert(
      Boolean(prod1?.id && prod2?.id && prod3?.id),
      'Three test products created in Business A'
    );

    // Create Customer with outstanding balance
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Abena Danso',
        phone: '0244777888',
        email: `abena_${timestamp}@example.com`,
      }),
    });
    const cust1 = await custRes.json();
    assert(Boolean(cust1?.id), 'Test customer created in Business A');

    // Record an Expense
    const expRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Store Electricity Bill',
        category: 'Utilities',
        amount: 80,
        description: 'Store Electricity Bill',
        paymentMethod: 'cash',
      }),
    });
    const exp = await expRes.json();
    assert(Boolean(exp?.id), 'Operating expense recorded for Business A');

    // Create Sales
    // Sale 1: 10 units of Peak Milk (120 GHS total, Cash)
    const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            productId: prod1.id,
            productName: prod1.name,
            quantity: 10,
            unitPrice: 12.0,
            costPrice: 8.0,
            total: 120.0,
          },
        ],
        subtotal: 120.0,
        total: 120.0,
        amountPaid: 120.0,
        paymentMethod: 'Cash',
        customerId: cust1.id,
        customerName: cust1.name,
      }),
    });
    const sale1 = await sale1Res.json();
    assert(Boolean(sale1?.id), 'Sale 1 created: 10x Milk for 120 GHS (Cash)');

    // Sale 2: 2 units of Rice (240 GHS total, 40 GHS credit unpaid)
    const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staff1Token}`,
      },
      body: JSON.stringify({
        items: [
          {
            productId: prod2.id,
            productName: prod2.name,
            quantity: 2,
            unitPrice: 120.0,
            costPrice: 80.0,
            total: 240.0,
          },
        ],
        subtotal: 240.0,
        total: 240.0,
        amountPaid: 200.0, // 40 GHS unpaid
        paymentMethod: 'Mobile Money',
        customerId: cust1.id,
        customerName: cust1.name,
      }),
    });
    const sale2 = await sale2Res.json();
    assert(Boolean(sale2?.id), 'Sale 2 created: 2x Rice for 240 GHS (40 GHS credit unpaid)');

    // ====================================================
    // SECTION 1: AUTHENTICATION & RBAC
    // ====================================================
    console.log('\n--- 1. AUTHENTICATION & RBAC ---');
    const noAuthRes = await fetch(`${BASE_URL}/api/business/forecast`);
    assert(noAuthRes.status === 401, 'Unauthenticated request to /api/business/forecast is rejected (401)');

    const badTokenRes = await fetch(`${BASE_URL}/api/business/forecast`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert(badTokenRes.status === 401, 'Tampered token is rejected (401)');

    const staff2Denied = await fetch(`${BASE_URL}/api/business/forecast`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert(staff2Denied.status === 403, 'Staff without dashboard/pos permission is forbidden (403)');

    const staff1Allowed = await fetch(`${BASE_URL}/api/business/forecast?range=today`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(staff1Allowed.status === 200, 'Staff with POS permission is allowed to view forecast (200)');

    const ownerAllowed = await fetch(`${BASE_URL}/api/business/forecast?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(ownerAllowed.status === 200, 'Business Owner is allowed to view forecast (200)');

    // ====================================================
    // SECTION 2: TENANT ISOLATION
    // ====================================================
    console.log('\n--- 2. TENANT ISOLATION ---');
    const bizBForecastRes = await fetch(`${BASE_URL}/api/business/forecast`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBForecast = await bizBForecastRes.json();
    assert(bizBForecastRes.status === 200, 'Business B fetches its own forecast successfully');
    assert(bizBForecast.salesOutlook.dailyRunRate === 0, 'Business B has 0 daily run-rate (isolated from Business A)');
    assert(bizBForecast.salesOutlook.weeklyRunRate === 0, 'Business B has 0 weekly run-rate');
    assert(bizBForecast.salesOutlook.monthlyRunRate === 0, 'Business B has 0 monthly run-rate');
    assert(bizBForecast.inventoryOutlook.products.length === 0, 'Business B sees 0 products from Business A');
    assert(bizBForecast.customerOutlook.totalCustomers === 0, 'Business B sees 0 customers from Business A');

    // Spoofed query businessId
    const spoofRes = await fetch(`${BASE_URL}/api/business/forecast?businessId=${bizAId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const spoofData = await spoofRes.json();
    assert(spoofData.salesOutlook.dailyRunRate === 0, 'Spoofed query businessId is ignored; JWT tenant strictly enforced');

    // ====================================================
    // SECTION 3: FINANCIAL PRIVACY & ACCESS CONTROL
    // ====================================================
    console.log('\n--- 3. FINANCIAL PRIVACY ---');
    const ownerForecastData = await ownerAllowed.json();
    const staff1ForecastData = await staff1Allowed.json();

    assert(ownerForecastData.profitabilityOutlook.isRestricted === false, 'Owner profitability outlook is unrestricted');
    assert(typeof ownerForecastData.profitabilityOutlook.projectedGrossProfit === 'number', 'Owner receives numeric projectedGrossProfit');
    assert(typeof ownerForecastData.profitabilityOutlook.projectedNetProfit === 'number', 'Owner receives numeric projectedNetProfit');
    assert(typeof ownerForecastData.profitabilityOutlook.projectedGrossMargin === 'number', 'Owner receives numeric projectedGrossMargin');

    // Staff check
    assert(staff1ForecastData.profitabilityOutlook.isRestricted === true, 'Staff profitability outlook isRestricted is true');
    assert(staff1ForecastData.profitabilityOutlook.projectedGrossProfit === undefined, 'Staff response omits projectedGrossProfit');
    assert(staff1ForecastData.profitabilityOutlook.projectedNetProfit === undefined, 'Staff response omits projectedNetProfit');
    assert(staff1ForecastData.profitabilityOutlook.projectedGrossMargin === undefined, 'Staff response omits projectedGrossMargin');

    // Staff inventory planning items must omit buying price & restock cost
    const staffPlanningProd = staff1ForecastData.inventoryOutlook.products[0];
    assert(staffPlanningProd.buyingPrice === undefined, 'Staff inventory product omits buyingPrice');
    assert(staffPlanningProd.estimatedRestockCost === undefined, 'Staff inventory product omits estimatedRestockCost');

    // Owner inventory planning items include buying price & restock cost
    const ownerPlanningProd = ownerForecastData.inventoryOutlook.products.find(
      (p: any) => p.productId === prod1.id
    );
    assert(typeof ownerPlanningProd?.buyingPrice === 'number', 'Owner inventory product includes numeric buyingPrice');
    assert(typeof ownerPlanningProd?.estimatedRestockCost === 'number', 'Owner inventory product includes numeric estimatedRestockCost');

    // ====================================================
    // SECTION 4: SALES OUTLOOK & RUN-RATES
    // ====================================================
    console.log('\n--- 4. SALES OUTLOOK & RUN-RATE CALCULATIONS ---');
    const salesOutlook = ownerForecastData.salesOutlook;
    assert(salesOutlook.runRateLabel === 'ESTIMATE', 'Run-rate is explicitly labeled ESTIMATE');
    assert(salesOutlook.dailyRunRate > 0, 'Daily run-rate is greater than 0');
    assert(
      Math.abs(salesOutlook.weeklyRunRate - Math.round(salesOutlook.dailyRunRate * 7 * 100) / 100) < 0.05,
      'Weekly run-rate is correctly calculated as dailyRunRate * 7'
    );
    assert(
      Math.abs(salesOutlook.monthlyRunRate - Math.round(salesOutlook.dailyRunRate * 30 * 100) / 100) < 0.05,
      'Monthly run-rate is correctly calculated as dailyRunRate * 30'
    );
    assert(
      ['GROWING', 'STABLE', 'DECLINING', 'INSUFFICIENT DATA'].includes(salesOutlook.trendDirection),
      'Trend direction is one of the valid enum states'
    );
    assert(salesOutlook.averageTransactionValue === 180, 'Average transaction value equals 180 GHS ((120 + 240) / 2)');
    assert(salesOutlook.transactionVelocity > 0, 'Transaction velocity is calculated');

    // Metadata transparency
    assert(Boolean(ownerForecastData.metadata.periodAnalyzed.label), 'Period analyzed label is provided');
    assert(ownerForecastData.metadata.dataPointsUsed.salesCount === 2, 'Data points used tracks 2 sales');
    assert(Boolean(ownerForecastData.metadata.calculationMethod), 'Calculation method is transparently exposed');
    assert(Boolean(ownerForecastData.metadata.disclaimer), 'Disclaimer is explicitly provided');
    assert(
      ['HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT DATA'].includes(ownerForecastData.metadata.confidenceIndicator),
      'Confidence indicator is valid'
    );

    // ====================================================
    // SECTION 5: INVENTORY DEMAND PLANNING (Stage 4G Integration)
    // ====================================================
    console.log('\n--- 5. INVENTORY DEMAND PLANNING ---');
    const inventoryOutlook = ownerForecastData.inventoryOutlook;
    assert(inventoryOutlook.totalProductsAssessed === 3, 'Inventory demand assessed 3 products');

    // Product 1 (Milk): 2 stock left, 10 units sold today, minStockLevel = 10 -> Critical!
    const milkItem = inventoryOutlook.products.find((p: any) => p.productId === prod1.id);
    assert(Boolean(milkItem), 'Peak Milk is found in inventory demand outlook');
    assert(milkItem.restockAttentionLevel === 'Critical', 'Peak Milk is correctly categorized as Critical restock');
    assert(milkItem.currentStock === 2, 'Current stock is 2');
    assert(milkItem.historicalUnitsSold === 10, 'Historical units sold is 10');
    assert(milkItem.averageDailyUnitsSold > 0, 'Average daily units sold is greater than 0');
    assert(typeof milkItem.daysOfStockCoverage === 'number', 'Days of stock coverage is calculated');
    assert(milkItem.daysOfStockCoverage <= 3, 'Days of stock coverage for Milk is <= 3 days');
    assert(Boolean(milkItem.estimatedDepletionDate), 'Estimated depletion date is provided');
    assert(milkItem.recommendedReorderUnits > 0, 'Recommended reorder units is positive');
    assert(Boolean(milkItem.demandTrendExplanation), 'Demand trend explanation is provided');

    // Product 3 (Oil): 0 units sold -> No Current Demand
    const oilItem = inventoryOutlook.products.find((p: any) => p.productId === prod3.id);
    assert(Boolean(oilItem), 'Frytol Oil is found in inventory demand outlook');
    assert(oilItem.historicalUnitsSold === 0, 'Frytol Oil has 0 historical units sold');
    assert(oilItem.restockAttentionLevel === 'No Current Demand', 'Frytol Oil is categorized as No Current Demand');
    assert(oilItem.daysOfStockCoverage === null, 'Days of stock coverage is null for un-moving product');
    assert(oilItem.daysOfStockCoverageLabel === 'NO CURRENT DEMAND', 'Days of stock coverage label is NO CURRENT DEMAND');

    // ====================================================
    // SECTION 6: PRODUCT PLANNING ENDPOINT
    // ====================================================
    console.log('\n--- 6. PRODUCT PLANNING ENDPOINT ---');
    const prodPlanningRes = await fetch(`${BASE_URL}/api/products/planning?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodPlanning = await prodPlanningRes.json();
    assert(prodPlanningRes.status === 200, 'GET /api/products/planning returns 200');
    assert(Array.isArray(prodPlanning.products), 'Product planning returns products array');
    assert(prodPlanning.summary.criticalCount >= 1, 'Product planning summary reports criticalCount >= 1');

    // Test status filter on product planning endpoint
    const criticalFilterRes = await fetch(`${BASE_URL}/api/products/planning?range=today&status=Critical`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const criticalFilter = await criticalFilterRes.json();
    assert(criticalFilter.products.every((p: any) => p.restockAttentionLevel === 'Critical'), 'Filter ?status=Critical returns only Critical products');

    // ====================================================
    // SECTION 7: CUSTOMER & RECEIVABLES OUTLOOK
    // ====================================================
    console.log('\n--- 7. CUSTOMER & RECEIVABLES OUTLOOK ---');
    const customerOutlook = ownerForecastData.customerOutlook;
    const receivablesOutlook = ownerForecastData.receivablesOutlook;

    assert(customerOutlook.totalCustomers === 1, 'Customer outlook tracks 1 customer');
    assert(receivablesOutlook.totalOutstandingReceivables === 40, 'Total outstanding receivables is 40 GHS');
    assert(receivablesOutlook.debtorCount === 1, 'Debtor count is 1');
    assert(receivablesOutlook.topDebtors.length === 1, 'Top debtors array contains 1 debtor');
    assert(receivablesOutlook.topDebtors[0].customerName === 'Abena Danso', 'Top debtor is Abena Danso');
    assert(receivablesOutlook.topDebtors[0].amountOwed === 40, 'Abena Danso amount owed is 40 GHS');
    assert(Boolean(receivablesOutlook.collectionAttentionSummary), 'Collection attention summary is provided');

    // ====================================================
    // SECTION 8: EXPENSE OUTLOOK
    // ====================================================
    console.log('\n--- 8. OPERATING EXPENSE OUTLOOK ---');
    const expenseOutlook = ownerForecastData.expenseOutlook;
    assert(expenseOutlook.currentExpenses === 80, 'Current expenses equal 80 GHS');
    assert(Array.isArray(expenseOutlook.trendingUpCategories), 'Trending up categories is an array');

    // ====================================================
    // SECTION 9: BUSINESS PLANNING SCENARIOS
    // ====================================================
    console.log('\n--- 9. BUSINESS PLANNING SCENARIOS ---');
    const scenarios = ownerForecastData.scenarios;
    assert(Array.isArray(scenarios) && scenarios.length >= 4, 'At least 4 planning scenarios generated');

    const baselineSc = scenarios.find((s: any) => s.scenarioType === 'current_trend' || s.scenarioName.includes('Current Trend Baseline'));
    const growthSc = scenarios.find((s: any) => s.scenarioType === 'improved_sales' || s.scenarioName.includes('Growth'));
    const contractionSc = scenarios.find((s: any) => s.scenarioType === 'reduced_sales' || s.scenarioName.includes('Contraction'));
    const expenseSc = scenarios.find((s: any) => s.scenarioType === 'expense_change' || s.scenarioName.includes('Expense Adjustment'));

    assert(Boolean(baselineSc), 'Current Trend Baseline scenario exists');
    assert(Boolean(growthSc), 'Sales Growth scenario exists');
    assert(Boolean(contractionSc), 'Sales Contraction scenario exists');
    assert(Boolean(expenseSc), 'Expense Adjustment scenario exists');

    assert(growthSc.estimatedRevenue > baselineSc.estimatedRevenue, 'Growth scenario projects higher revenue than baseline');
    assert(contractionSc.estimatedRevenue < baselineSc.estimatedRevenue, 'Contraction scenario projects lower revenue than baseline');
    assert(expenseSc.estimatedExpenses > baselineSc.estimatedExpenses, 'Expense scenario projects higher expenses than baseline');

    // Custom query scenario simulation
    const customScenarioRes = await fetch(
      `${BASE_URL}/api/business/forecast?range=today&scenarioSalesPct=25&scenarioExpenseDelta=500`,
      {
        headers: { Authorization: `Bearer ${ownerAToken}` },
      }
    );
    const customScenarioData = await customScenarioRes.json();
    const customSc = customScenarioData.scenarios.find((s: any) => s.scenarioType === 'custom' || s.scenarioName.includes('+25%') || s.scenarioName.includes('Custom'));
    assert(Boolean(customSc), 'Custom scenario (+25%) is dynamically computed from query parameters');
    assert(
      customSc.estimatedRevenue > baselineSc.estimatedRevenue,
      'Custom +25% scenario revenue is higher than baseline'
    );

    // ====================================================
    // SECTION 10: PROACTIVE OPERATIONAL ALERTS & NOTIFICATIONS
    // ====================================================
    console.log('\n--- 10. PROACTIVE OPERATIONAL ALERTS ---');
    // Fetch notifications to confirm proactive alerts were registered in authoritative storage
    const notifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const notifs = await notifsRes.json();
    assert(Array.isArray(notifs), 'GET /api/notifications returns array');

    const proactiveAlerts = notifs.filter((n: any) => n.type === 'proactive_alert');
    assert(proactiveAlerts.length >= 1, 'Proactive operational alerts generated and stored in notifications');

    // Critical stock alert check
    const stockAlert = proactiveAlerts.find((n: any) => n.title.includes('Restock Attention') || n.title.includes('Stock'));
    assert(Boolean(stockAlert), 'Critical stock depletion proactive alert was triggered');
    assert(stockAlert?.message.includes('Peak Milk Tin'), 'Stock alert mentions Peak Milk Tin specifically');

    // Deduplication check: calling forecast again should NOT spam notifications
    const initialAlertCount = proactiveAlerts.length;
    await fetch(`${BASE_URL}/api/business/forecast?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const notifsRes2 = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const notifs2 = await notifsRes2.json();
    const proactiveAlerts2 = notifs2.filter((n: any) => n.type === 'proactive_alert');
    assert(
      proactiveAlerts2.length === initialAlertCount,
      `Proactive alerts deduplicated properly (Initial: ${initialAlertCount}, After 2nd call: ${proactiveAlerts2.length})`
    );

    // ====================================================
    // SECTION 11: READ-ONLY INTEGRITY
    // ====================================================
    console.log('\n--- 11. READ-ONLY INTEGRITY ---');
    const prodListBefore = await (await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const salesListBefore = await (await fetch(`${BASE_URL}/api/sales`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const custListBefore = await (await fetch(`${BASE_URL}/api/customers`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const expListBefore = await (await fetch(`${BASE_URL}/api/expenses`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();

    // Call forecasting endpoints multiple times
    for (let i = 0; i < 3; i++) {
      await fetch(`${BASE_URL}/api/business/forecast?range=today`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
      await fetch(`${BASE_URL}/api/products/planning?range=today`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
    }

    const prodListAfter = await (await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const salesListAfter = await (await fetch(`${BASE_URL}/api/sales`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const custListAfter = await (await fetch(`${BASE_URL}/api/customers`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const expListAfter = await (await fetch(`${BASE_URL}/api/expenses`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();

    assert(JSON.stringify(prodListBefore) === JSON.stringify(prodListAfter), 'Product records completely unchanged by forecasting (read-only)');
    assert(JSON.stringify(salesListBefore) === JSON.stringify(salesListAfter), 'Sales records completely unchanged (read-only)');
    assert(JSON.stringify(custListBefore) === JSON.stringify(custListAfter), 'Customer records completely unchanged (read-only)');
    assert(JSON.stringify(expListBefore) === JSON.stringify(expListAfter), 'Expense records completely unchanged (read-only)');

    // ====================================================
    // SECTION 12: ZERO DATA & EDGE CASE RESILIENCE
    // ====================================================
    console.log('\n--- 12. ZERO DATA & EDGE CASES ---');
    // Future date range or completely empty business
    const futureForecastRes = await fetch(`${BASE_URL}/api/business/forecast?range=custom&startDate=2099-01-01&endDate=2099-01-07`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const futureForecast = await futureForecastRes.json();
    assert(futureForecastRes.status === 200, 'Future range with 0 data returns 200 without throwing');
    assert(futureForecast.salesOutlook.dailyRunRate === 0, 'Zero-data daily run-rate is 0');
    assert(futureForecast.salesOutlook.trendDirection === 'INSUFFICIENT DATA', 'Zero-data trend direction is INSUFFICIENT DATA');
    assert(futureForecast.metadata.confidenceIndicator === 'INSUFFICIENT DATA', 'Zero-data confidence indicator is INSUFFICIENT DATA');
    assert(!isNaN(futureForecast.salesOutlook.weeklyRunRate), 'Weekly run-rate is not NaN');
    assert(!isNaN(futureForecast.salesOutlook.monthlyRunRate), 'Monthly run-rate is not NaN');

    // ====================================================
    // SECTION 13: ENDPOINT ALIASES
    // ====================================================
    console.log('\n--- 13. ENDPOINT ALIASES ---');
    const alias1Res = await fetch(`${BASE_URL}/api/growth/forecast?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(alias1Res.status === 200, 'GET /api/growth/forecast returns 200');

    const alias2Res = await fetch(`${BASE_URL}/api/planning/forecast?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(alias2Res.status === 200, 'GET /api/planning/forecast returns 200');

    const alias1Data = await alias1Res.json();
    assert(
      alias1Data.salesOutlook.dailyRunRate === ownerForecastData.salesOutlook.dailyRunRate,
      'Alias /api/growth/forecast returns identical authoritative data'
    );

    // ====================================================
    // SUMMARY
    // ====================================================
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n========================================');
    console.log(`STAGE 4K RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${results.length})`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test run error:', err);
    process.exit(1);
  }
}

runTests();
