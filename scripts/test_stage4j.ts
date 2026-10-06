/**
 * STAGE 4J COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Business Growth, Sales Intelligence & Decision Support
 * 50+ Comprehensive Assertions & Regression Tests
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
  console.log('--- STARTING STAGE 4J BUSINESS GROWTH & DECISION SUPPORT VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // SETUP: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4j_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kofi Mensah (Owner A)',
        phone: '0244111222',
        businessName: `Accra Provisions Hub ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4j_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Serwaa (Owner B)',
        phone: '0244888999',
        businessName: `Kumasi Depot ${timestamp}`,
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

    // ----------------------------------------------------
    // Create Staff in Business A
    // ----------------------------------------------------
    // Staff 1: Cashier with POS access, NO financial reports access
    const staff1Email = `cashier_${timestamp}@test.com`;
    const staff1Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        fullName: 'Kwame Cashier',
        email: staff1Email,
        phone: '0200112233',
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
    const staff1 = staff1Data.staff;
    assert(Boolean(staff1 && staff1.id), 'Staff 1 created with restricted financial permissions');

    // Login Staff 1
    const staff1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff1Email, password: 'password123' }),
    });
    const staff1Token = (await staff1LoginRes.json()).token;
    assert(Boolean(staff1Token), 'Staff 1 authenticated successfully');

    // Staff 2: No POS or Dashboard permissions (should be 403)
    const staff2Email = `driver_${timestamp}@test.com`;
    const staff2Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        fullName: 'Yaw Driver',
        email: staff2Email,
        phone: '0200556677',
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
    const staff2 = staff2Data.staff;
    assert(Boolean(staff2 && staff2.id), 'Staff 2 created with zero dashboard/POS permissions');

    const staff2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff2Email, password: 'password123' }),
    });
    const staff2Token = (await staff2LoginRes.json()).token;
    assert(Boolean(staff2Token), 'Staff 2 authenticated successfully');

    // ----------------------------------------------------
    // SEED OPERATIONAL DATA IN BUSINESS A
    // ----------------------------------------------------
    // Products
    const prod1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Peak Evaporated Milk 170g',
        category: 'Dairy',
        sku: 'MLK-001',
        buyingPrice: 8,
        sellingPrice: 12,
        quantity: 15,
        minStockLevel: 20,
        unit: 'tin',
      }),
    });
    const prod1 = await prod1Res.json();

    const prod2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Royal Feast Jasmine Rice 5kg',
        category: 'Grains',
        sku: 'RCE-005',
        buyingPrice: 90,
        sellingPrice: 120,
        quantity: 60,
        minStockLevel: 10,
        unit: 'bag',
      }),
    });
    const prod2 = await prod2Res.json();

    const prod3Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Frytol Vegetable Oil 1L',
        category: 'Oils',
        sku: 'OIL-001',
        buyingPrice: 35,
        sellingPrice: 48,
        quantity: 40,
        minStockLevel: 5,
        unit: 'bottle',
      }),
    });
    const prod3 = await prod3Res.json();

    assert(Boolean(prod1?.id && prod2?.id && prod3?.id), 'Three test products created in Business A');

    // Customers
    const cust1Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Abena Danso',
        phone: '0244123456',
        email: 'abena@gmail.com',
      }),
    });
    const cust1 = await cust1Res.json();

    const cust2Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Kwadwo Boateng',
        phone: '0244987654',
        email: 'kwadwo@gmail.com',
        initialDebt: 450,
      }),
    });
    const cust2 = await cust2Res.json();
    assert(Boolean(cust1?.id && cust2?.id), 'Test customers created in Business A');

    // Operating Expense
    const expRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        title: 'ECG Electricity Prepaid',
        category: 'Utilities',
        description: 'ECG Electricity Prepaid',
        amount: 50,
        paymentMethod: 'momo',
      }),
    });
    const exp = await expRes.json();
    assert(Boolean(exp?.id), 'Operating expense recorded for Business A');

    // Sales:
    // Sale 1 by Owner: 10x Peak Milk = 120 GHS (Cash)
    const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [{ productId: prod1.id, productName: prod1.name, quantity: 10, unitPrice: 12, costPrice: 8, total: 120 }],
        subtotal: 120,
        total: 120,
        paymentMethod: 'Cash',
        amountPaid: 120,
        customerId: cust1.id,
        customerName: cust1.name,
      }),
    });
    const sale1 = await sale1Res.json();
    assert(Boolean(sale1?.id), 'Sale 1 created: 10x Milk for 120 GHS (Cash)');

    // Sale 2 by Staff 1: 2x Rice = 240 GHS (Mobile Money)
    const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staff1Token}` },
      body: JSON.stringify({
        items: [{ productId: prod2.id, productName: prod2.name, quantity: 2, unitPrice: 120, costPrice: 90, total: 240 }],
        subtotal: 240,
        total: 240,
        paymentMethod: 'Mobile Money',
        amountPaid: 240,
        customerId: cust1.id,
        customerName: cust1.name,
      }),
    });
    const sale2 = await sale2Res.json();
    assert(Boolean(sale2?.id), 'Sale 2 created: 2x Rice for 240 GHS (Mobile Money) by Staff 1');

    // Sale 3: Cancelled sale to verify cancellation exclusion (seeded through authoritative db as in Stage 4F)
    const sale3 = db.createSale({
      businessId: bizAId,
      items: [{ productId: prod1.id, productName: prod1.name, quantity: 5, sellingPrice: 12, buyingPrice: 8, total: 60, profit: 20 }],
      subtotal: 60,
      total: 60,
      discount: 0,
      balance: 0,
      profit: 20,
      amountPaid: 60,
      paymentMethod: 'Cash',
      status: 'Cancelled',
      createdBy: ownerAEmail,
    });
    // Since cancelled sale was voided, restore the 5 units back to prod1 inventory
    const p1 = db.getProductById(prod1.id, bizAId);
    if (p1) p1.quantity = 5;
    assert(Boolean(sale3?.id && sale3.status === 'Cancelled'), 'Sale 3 created and marked Cancelled in authoritative storage');

    // ----------------------------------------------------
    // TEST SECTION 1: AUTHENTICATION & RBAC
    // ----------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & RBAC ---');
    const unauthRes = await fetch(`${BASE_URL}/api/growth/intelligence`);
    assert(unauthRes.status === 401, 'Unauthenticated request is rejected with 401');

    const badJwtRes = await fetch(`${BASE_URL}/api/growth/intelligence`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert(badJwtRes.status === 401, 'Tampered/invalid JWT is rejected with 401');

    const staff2DeniedRes = await fetch(`${BASE_URL}/api/growth/intelligence`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert(staff2DeniedRes.status === 403, 'Staff without dashboard/pos permission is denied (403)');

    const staff1AllowedRes = await fetch(`${BASE_URL}/api/growth/intelligence`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(staff1AllowedRes.status === 200, 'Staff with POS permission is granted access (200)');

    const ownerAllowedRes = await fetch(`${BASE_URL}/api/growth/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(ownerAllowedRes.status === 200, 'Business Owner is granted full access (200)');

    // ----------------------------------------------------
    // TEST SECTION 2: TENANT ISOLATION & BOLA
    // ----------------------------------------------------
    console.log('\n--- 2. TENANT ISOLATION ---');
    const bizBIntelRes = await fetch(`${BASE_URL}/api/growth/intelligence`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBData = await bizBIntelRes.json();
    assert(bizBIntelRes.status === 200, 'Business B fetches its own intelligence successfully');
    assert(bizBData.salesIntelligence.totalRevenue === 0, 'Business B sees 0 revenue (isolated from Business A)');
    assert(bizBData.salesIntelligence.transactionCount === 0, 'Business B sees 0 transactions');
    assert(bizBData.topRevenueProducts.length === 0, 'Business B sees 0 products from Business A');
    assert(bizBData.customerIntelligence.activeCustomersCount === 0, 'Business B sees 0 customers from Business A');

    // Attempt BOLA query spoofing
    const bolaSpoofRes = await fetch(`${BASE_URL}/api/growth/intelligence?businessId=${bizAId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bolaData = await bolaSpoofRes.json();
    assert(bolaData.salesIntelligence.totalRevenue === 0, 'Spoofed query businessId is rejected; JWT tenant enforced');

    // ----------------------------------------------------
    // TEST SECTION 3: FINANCIAL PRIVACY AUDIT
    // ----------------------------------------------------
    console.log('\n--- 3. FINANCIAL PRIVACY ---');
    const ownerData = await ownerAllowedRes.json();
    const staffData = await staff1AllowedRes.json();

    // Owner checks
    assert(ownerData.profitabilityIntelligence.isRestricted === false, 'Owner profitability intelligence is unrestricted');
    assert(typeof ownerData.profitabilityIntelligence.grossProfit === 'number', 'Owner receives numeric grossProfit');
    assert(typeof ownerData.profitabilityIntelligence.cogs === 'number', 'Owner receives numeric COGS');
    assert(typeof ownerData.profitabilityIntelligence.netProfit === 'number', 'Owner receives numeric netProfit');
    assert(typeof ownerData.profitabilityIntelligence.grossMargin === 'number', 'Owner receives numeric grossMargin');

    // Staff checks (MUST NOT leak buying price or profit)
    assert(staffData.profitabilityIntelligence.isRestricted === true, 'Staff profitability intelligence isRestricted is true');
    assert(staffData.profitabilityIntelligence.grossProfit === undefined, 'Staff response omits grossProfit');
    assert(staffData.profitabilityIntelligence.cogs === undefined, 'Staff response omits COGS');
    assert(staffData.profitabilityIntelligence.netProfit === undefined, 'Staff response omits netProfit');
    assert(staffData.profitabilityIntelligence.grossMargin === undefined, 'Staff response omits grossMargin');

    // Product cohort items check for staff
    if (staffData.topRevenueProducts.length > 0) {
      assert(staffData.topRevenueProducts[0].grossProfit === undefined, 'Staff product items omit grossProfit');
      assert(staffData.topRevenueProducts[0].buyingPrice === undefined, 'Staff product items omit buyingPrice');
      assert(staffData.topRevenueProducts[0].cogs === undefined, 'Staff product items omit cogs');
    }

    // ----------------------------------------------------
    // TEST SECTION 4: SALES RECONCILIATION & ACCURACY
    // ----------------------------------------------------
    console.log('\n--- 4. SALES RECONCILIATION ---');
    // Active sales: Sale 1 (120) + Sale 2 (240) = 360 GHS. Units: 10 + 2 = 12. ATV: 360 / 2 = 180 GHS.
    assert(ownerData.salesIntelligence.totalRevenue === 360, 'Stage 4J totalRevenue equals 360 GHS');
    assert(ownerData.salesIntelligence.transactionCount === 2, 'Stage 4J transactionCount equals 2 (cancelled excluded)');
    assert(ownerData.salesIntelligence.unitsSold === 12, 'Stage 4J unitsSold equals 12');
    assert(ownerData.salesIntelligence.averageTransactionValue === 180, 'Stage 4J averageTransactionValue equals 180 GHS');

    // Reconcile with GET /api/sales
    const salesListRes = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const salesList = await salesListRes.json();
    const activeSales = salesList.filter((s: any) => s.status !== 'Cancelled');
    const directSalesSum = activeSales.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
    assert(ownerData.salesIntelligence.totalRevenue === directSalesSum, 'Stage 4J revenue matches active Sales History total exactly');

    // Reconcile with GET /api/reports?range=today
    const reportsRes = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const reportsData = await reportsRes.json();
    assert(ownerData.salesIntelligence.totalRevenue === (reportsData.totalRevenue ?? reportsData.revenue), 'Stage 4J revenue matches Stage 4F /api/reports');
    assert(ownerData.profitabilityIntelligence.grossProfit === reportsData.grossProfit, 'Stage 4J grossProfit matches Stage 4F /api/reports');
    assert(ownerData.profitabilityIntelligence.operatingExpenses === (reportsData.totalExpenses ?? reportsData.expenses), 'Stage 4J expenses match Stage 4F /api/reports');
    assert(ownerData.profitabilityIntelligence.netProfit === reportsData.netProfit, 'Stage 4J netProfit matches Stage 4F /api/reports');

    // ----------------------------------------------------
    // TEST SECTION 5: PRODUCT VELOCITY & COHORTS
    // ----------------------------------------------------
    console.log('\n--- 5. PRODUCT VELOCITY & COHORTS ---');
    assert(ownerData.topRevenueProducts.length >= 2, 'Top revenue products contains active sold products');
    assert(ownerData.topRevenueProducts[0].productName.includes('Rice'), '#1 Top revenue product is Rice');
    assert(ownerData.topRevenueProducts[0].revenueGenerated === 240, 'Rice generated 240 GHS');
    assert(ownerData.topRevenueProducts[1].productName.includes('Milk'), '#2 Top revenue product is Milk');
    assert(ownerData.topRevenueProducts[1].revenueGenerated === 120, 'Milk generated 120 GHS');

    // Velocity: Milk has 10 units sold
    assert(ownerData.fastestMovingProducts[0].productName.includes('Milk'), 'Milk is fastest moving product by velocity');
    assert(ownerData.fastestMovingProducts[0].unitsSold === 10, 'Milk sold 10 units');
    assert(ownerData.fastestMovingProducts[0].velocity > 0, 'Milk has positive daily velocity');

    // Deadstock / Never sold cohort: Oil was never sold
    const deadstockItem = ownerData.neverSoldProducts.find((p: any) => p.productName.includes('Oil'));
    assert(Boolean(deadstockItem), 'Oil is correctly identified in neverSoldProducts cohort');

    // Stockout risk: Milk available quantity 5 <= minStockLevel 20 and has positive velocity
    const stockRiskItem = ownerData.lowStockFastMovers.find((p: any) => p.productName.includes('Milk'));
    assert(Boolean(stockRiskItem), 'Low stock fast mover identified for Peak Milk');

    // ----------------------------------------------------
    // TEST SECTION 6: CATEGORY INTELLIGENCE
    // ----------------------------------------------------
    console.log('\n--- 6. CATEGORY DYNAMICS ---');
    assert(ownerData.categoryIntelligence.length >= 2, 'Category intelligence tracks active categories');
    assert(ownerData.strongestCategory?.category === 'Grains', 'Grains is the top category by revenue');
    assert(ownerData.strongestCategory?.revenue === 240, 'Grains revenue is 240 GHS');

    // ----------------------------------------------------
    // TEST SECTION 7: CUSTOMER RETENTION & DEBT
    // ----------------------------------------------------
    console.log('\n--- 7. CUSTOMER INTELLIGENCE INTEGRATION ---');
    assert(ownerData.customerIntelligence.activeCustomersCount >= 1, 'Active customers tracked');
    assert(ownerData.customerIntelligence.topCustomersByRevenue.length >= 1, 'Top spending VIP customer identified');
    assert(
      (ownerData.customerIntelligence.topCustomersByRevenue[0].name || ownerData.customerIntelligence.topCustomersByRevenue[0].customerName) === 'Abena Danso',
      'Abena Danso is #1 top spender'
    );
    assert(ownerData.customerIntelligence.topCustomersByRevenue[0].totalSpend >= 360, 'Abena Danso total spend is 360 GHS');

    // Reconcile with Stage 4H customer intelligence
    const custIntelRes = await fetch(`${BASE_URL}/api/customers/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custIntelData = await custIntelRes.json();
    assert(custIntelRes.status === 200, 'Stage 4H Customer Intelligence returns 200');
    const s4hActive = custIntelData.summary?.activeCustomersCount ?? custIntelData.activeCustomersCount ?? custIntelData.activeCustomers;
    assert(ownerData.customerIntelligence.activeCustomersCount === s4hActive, 'Active customer count reconciles with Stage 4H');

    // ----------------------------------------------------
    // TEST SECTION 8: STAFF INTEGRATION & ATTRIBUTION
    // ----------------------------------------------------
    console.log('\n--- 8. STAFF INTEGRATION ---');
    assert(ownerData.staffIntelligence.staffCount >= 1, 'Staff count is greater than 0');
    const staff1Leader = ownerData.staffIntelligence.staffLeaderboard.find((s: any) => s.staffId === staff1.id);
    assert(Boolean(staff1Leader), 'Staff 1 is present in staffLeaderboard');
    assert(staff1Leader?.salesCount === 1, 'Staff 1 salesCount equals 1');
    assert(staff1Leader?.totalRevenue === 240, 'Staff 1 totalRevenue equals 240 GHS');

    // Reconcile with Stage 4I staff intelligence
    const staffIntelRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const staffIntelData = await staffIntelRes.json();
    assert(staffIntelRes.status === 200, 'Stage 4I Staff Intelligence returns 200');
    const s4iStaff1 = (staffIntelData.staffPerformance || staffIntelData.staffMembers || []).find(
      (s: any) => s.id === staff1.id || s.staffId === staff1.id || s.staff?.id === staff1.id
    );
    assert((s4iStaff1?.totalSalesValue ?? s4iStaff1?.totalRevenue) === staff1Leader?.totalRevenue, 'Staff 1 revenue reconciles with Stage 4I staff intelligence');

    // ----------------------------------------------------
    // TEST SECTION 9: PAYMENT METHODS
    // ----------------------------------------------------
    console.log('\n--- 9. PAYMENT METHOD BREAKDOWN ---');
    const cashMethod = ownerData.paymentMethodIntelligence.find((m: any) => m.method.toLowerCase().includes('cash'));
    const momoMethod = ownerData.paymentMethodIntelligence.find((m: any) => m.method.toLowerCase().includes('momo') || m.method.toLowerCase().includes('mobile'));
    assert(Boolean(cashMethod), 'Cash payment method recorded');
    assert(cashMethod?.amount === 120, 'Cash revenue equals 120 GHS');
    assert(Boolean(momoMethod), 'Mobile Money payment method recorded');
    assert(momoMethod?.amount === 240, 'Mobile Money revenue equals 240 GHS');

    // ----------------------------------------------------
    // TEST SECTION 10: BUSINESS HEALTH INDEX (7 INDICATORS)
    // ----------------------------------------------------
    console.log('\n--- 10. BUSINESS HEALTH INDEX ---');
    assert(typeof ownerData.healthSummary.score === 'number', 'Health score is numeric');
    assert(ownerData.healthSummary.score >= 0 && ownerData.healthSummary.score <= 100, 'Health score is bounded between 0 and 100');
    assert(Boolean(ownerData.healthSummary.overallHealth), 'Overall health qualitative label assigned');

    const ind = ownerData.healthSummary.indicators;
    assert((ind.salesHealth?.score ?? (ind as any).salesMomentum?.score) >= 0, 'Indicator 1: salesHealth has valid score');
    assert((ind.customerHealth?.score ?? (ind as any).customerRetention?.score) >= 0, 'Indicator 2: customerHealth has valid score');
    assert((ind.inventoryHealth?.score ?? (ind as any).inventoryCoverage?.score) >= 0, 'Indicator 3: inventoryHealth has valid score');
    assert((ind.cashFlowHealth?.score ?? (ind as any).cashRealization?.score) >= 0, 'Indicator 4: cashFlowHealth has valid score');
    assert((ind.debtHealth?.score ?? (ind as any).receivablesRisk?.score) >= 0, 'Indicator 5: debtHealth has valid score');
    assert((ind.expenseHealth?.score ?? (ind as any).operatingOverheads?.score) >= 0, 'Indicator 6: expenseHealth has valid score');
    assert((ind.profitabilityHealth?.score ?? (ind as any).profitMargins?.score) >= 0, 'Indicator 7: profitabilityHealth has valid score');

    // ----------------------------------------------------
    // TEST SECTION 11: GROWTH SIGNALS & RECOMMENDATIONS
    // ----------------------------------------------------
    console.log('\n--- 11. GROWTH SIGNALS & RECOMMENDATIONS ---');
    const sigRes = await fetch(`${BASE_URL}/api/growth/signals`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const sigData = await sigRes.json();
    assert(sigRes.status === 200, 'GET /api/growth/signals returns 200');
    assert(Array.isArray(sigData.signals), 'Growth signals array returned');

    // Stockout risk signal trigger check
    const stockoutSig = sigData.signals.find(
      (s: any) => s.signalType === 'stock_risk' || s.type === 'stock_out_risk' || s.title.includes('Stock') || s.title.includes('Reorder')
    );
    assert(Boolean(stockoutSig), 'Low-stock fast mover signal triggered for Milk');

    const recRes = await fetch(`${BASE_URL}/api/growth/recommendations`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const recData = await recRes.json();
    assert(recRes.status === 200, 'GET /api/growth/recommendations returns 200');
    assert(Array.isArray(recData.recommendations), 'Recommendations array returned');
    assert(recData.recommendations.length > 0, 'At least 1 actionable advisory recommendation returned');

    const firstRec = recData.recommendations[0];
    assert(Boolean(firstRec.title && firstRec.description), 'Recommendation has title and description');
    assert(Boolean(firstRec.actionLink), 'Recommendation has direct operational link');

    // ----------------------------------------------------
    // TEST SECTION 12: ACCRA DATE TIME & RANGES
    // ----------------------------------------------------
    console.log('\n--- 12. ACCRA DATE TIME & RANGES ---');
    const todayRes = await fetch(`${BASE_URL}/api/growth/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const todayData = await todayRes.json();
    assert(todayData.dateRange.label.includes('Today'), 'Range today resolves with Today label');

    const yesterdayRes = await fetch(`${BASE_URL}/api/growth/intelligence?range=yesterday`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const yesterdayData = await yesterdayRes.json();
    assert(yesterdayData.salesIntelligence.totalRevenue === 0, 'Yesterday range returns 0 revenue for sales made today');

    const customRes = await fetch(`${BASE_URL}/api/growth/intelligence?range=custom&startDate=2026-01-01&endDate=2026-12-31`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const customData = await customRes.json();
    assert(customData.salesIntelligence.totalRevenue === 360, 'Custom annual range captures all today sales (360 GHS)');

    // ----------------------------------------------------
    // TEST SECTION 13: READ-ONLY INTEGRITY & ZERO MUTATION
    // ----------------------------------------------------
    console.log('\n--- 13. READ-ONLY INTEGRITY ---');
    const prodListBefore = await (await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const salesListBefore = await (await fetch(`${BASE_URL}/api/sales`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const custListBefore = await (await fetch(`${BASE_URL}/api/customers`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const expListBefore = await (await fetch(`${BASE_URL}/api/expenses`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();

    // Call all intelligence endpoints multiple times
    for (let i = 0; i < 5; i++) {
      await fetch(`${BASE_URL}/api/growth/intelligence?range=today`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
      await fetch(`${BASE_URL}/api/growth/signals`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
      await fetch(`${BASE_URL}/api/growth/recommendations`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
      await fetch(`${BASE_URL}/api/growth/decision-support`, { headers: { Authorization: `Bearer ${ownerAToken}` } });
    }

    const prodListAfter = await (await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const salesListAfter = await (await fetch(`${BASE_URL}/api/sales`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const custListAfter = await (await fetch(`${BASE_URL}/api/customers`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const expListAfter = await (await fetch(`${BASE_URL}/api/expenses`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();

    assert(JSON.stringify(prodListBefore) === JSON.stringify(prodListAfter), 'Product records completely unchanged');
    assert(JSON.stringify(salesListBefore) === JSON.stringify(salesListAfter), 'Sales records completely unchanged');
    assert(JSON.stringify(custListBefore) === JSON.stringify(custListAfter), 'Customer records completely unchanged');
    assert(JSON.stringify(expListBefore) === JSON.stringify(expListAfter), 'Expense records completely unchanged');

    // ----------------------------------------------------
    // TEST SECTION 14: ZERO DATA & EDGE CASE RESILIENCE
    // ----------------------------------------------------
    console.log('\n--- 14. ZERO DATA & EDGE CASE RESILIENCE ---');
    const futureRangeRes = await fetch(`${BASE_URL}/api/growth/intelligence?range=custom&startDate=2035-01-01&endDate=2035-01-02`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const futureData = await futureRangeRes.json();
    assert(futureRangeRes.status === 200, 'Future range returns 200 without throwing');
    assert(futureData.salesIntelligence.totalRevenue === 0, 'Zero-data period revenue is 0');
    assert(futureData.salesIntelligence.averageTransactionValue === 0, 'Zero-data period ATV is 0 without NaN');
    assert(futureData.profitabilityIntelligence.grossMargin === 0, 'Zero-data period grossMargin is 0 without NaN');
    assert(futureData.healthSummary.score >= 0, 'Zero-data health score calculates cleanly');

    // ----------------------------------------------------
    // TEST SECTION 15: DUPLICATE SYSTEM PREVENTION
    // ----------------------------------------------------
    console.log('\n--- 15. DUPLICATE SYSTEM PREVENTION ---');
    // Ensure aliases /api/growth/decision-support and /api/business/intelligence resolve to same engine
    const alias1 = await (await fetch(`${BASE_URL}/api/growth/decision-support`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const alias2 = await (await fetch(`${BASE_URL}/api/business/intelligence`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    assert(alias1.salesIntelligence.totalRevenue === ownerData.salesIntelligence.totalRevenue, 'Endpoint alias /api/growth/decision-support returns identical authoritative data');
    assert(alias2.salesIntelligence.totalRevenue === ownerData.salesIntelligence.totalRevenue, 'Endpoint alias /api/business/intelligence returns identical authoritative data');

  } catch (err: any) {
    assert(false, 'Unexpected suite exception', err?.message || String(err));
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`STAGE 4J RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
