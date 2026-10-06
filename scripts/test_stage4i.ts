/**
 * STAGE 4I AUTOMATED VERIFICATION SUITE
 * Staff Performance, Business Operations & Management Intelligence Upgrade
 * 50+ Comprehensive Assertions & Regression Tests
 */

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
  console.log('--- STARTING STAGE 4I STAFF PERFORMANCE & OPERATIONS INTELLIGENCE SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // Setup: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4i_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Owner 4I Accra',
        phone: '0244111333',
        businessName: `Accra Mart 4I ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business.id;
    const ownerAUser = ownerAData.user;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4i_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Owner 4I Kumasi',
        phone: '0244888444',
        businessName: `Kumasi Mart 4I ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerBData = await regBRes.json();
    const ownerBToken = ownerBData.token;
    const bizBId = ownerBData.business.id;

    assert(Boolean(ownerBToken && bizBId), 'Business B registration succeeds');

    // Upgrade both businesses via admin
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
    // Create Cashier 1 and Cashier 2 for Business A
    // ----------------------------------------------------
    const staff1Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        fullName: 'Kofi Cashier A',
        email: `kofi_${timestamp}@test.com`,
        phone: '0244000111',
        password: 'password123',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          financial_reports: false, // Staff without financial reports permission
        },
      }),
    });
    const staff1Data = await staff1Res.json();
    const staff1 = staff1Data.staff;
    assert(Boolean(staff1 && staff1.id), 'Staff 1 (Kofi Cashier A) created successfully');

    const staff2Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        fullName: 'Ama Cashier B',
        email: `ama_${timestamp}@test.com`,
        phone: '0244000222',
        password: 'password123',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          financial_reports: true, // Staff with financial reports permission
        },
      }),
    });
    const staff2Data = await staff2Res.json();
    const staff2 = staff2Data.staff;
    assert(Boolean(staff2 && staff2.id), 'Staff 2 (Ama Cashier B) created successfully');

    // Login Cashier 1
    const staff1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `kofi_${timestamp}@test.com`, password: 'password123' }),
    });
    const staff1Token = (await staff1LoginRes.json()).token;
    assert(Boolean(staff1Token), 'Staff 1 successfully authenticated');

    // Login Cashier 2
    const staff2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `ama_${timestamp}@test.com`, password: 'password123' }),
    });
    const staff2Token = (await staff2LoginRes.json()).token;
    assert(Boolean(staff2Token), 'Staff 2 successfully authenticated');

    // ----------------------------------------------------
    // Add Products to Business A
    // ----------------------------------------------------
    const prod1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Milo 400g Tin',
        category: 'Beverages',
        buyingPrice: 40,
        sellingPrice: 55,
        quantity: 100,
        minStockLevel: 10,
        unit: 'tin',
      }),
    });
    const prod1 = await prod1Res.json();

    const prod2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Ideal Milk 160g',
        category: 'Dairy',
        buyingPrice: 8,
        sellingPrice: 12,
        quantity: 150,
        minStockLevel: 15,
        unit: 'can',
      }),
    });
    const prod2 = await prod2Res.json();

    assert(Boolean(prod1?.id && prod2?.id), 'Products created successfully for Business A');

    // Create a customer in Business A
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Kwame Mensah',
        phone: '0241000999',
        email: 'kwame@test.com',
      }),
    });
    const cust = await custRes.json();
    assert(Boolean(cust?.id), 'Customer Kwame Mensah created');

    // ----------------------------------------------------
    // Perform Sales Under Different Staff Members
    // ----------------------------------------------------
    // Staff 1 (Kofi) sells: 2x Milo = 110 GHS (Cash)
    const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staff1Token}` },
      body: JSON.stringify({
        items: [{ productId: prod1.id, productName: prod1.name, quantity: 2, unitPrice: 55, costPrice: 40, total: 110 }],
        subtotal: 110,
        total: 110,
        paymentMethod: 'Cash',
        amountPaid: 110,
        customerId: cust.id,
        customerName: cust.name,
      }),
    });
    const sale1 = await sale1Res.json();
    assert(sale1?.staffId === staff1.id, 'Sale 1 automatically captures staffId of authenticated staff');
    assert(sale1?.cashierName === staff1.fullName, 'Sale 1 automatically captures cashierName');

    // Staff 1 (Kofi) sells: 5x Ideal Milk = 60 GHS (Mobile Money)
    const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staff1Token}` },
      body: JSON.stringify({
        items: [{ productId: prod2.id, productName: prod2.name, quantity: 5, unitPrice: 12, costPrice: 8, total: 60 }],
        subtotal: 60,
        total: 60,
        paymentMethod: 'Mobile Money',
        amountPaid: 60,
      }),
    });
    const sale2 = await sale2Res.json();
    assert(sale2?.staffId === staff1.id, 'Sale 2 attributed to Kofi');

    // Staff 2 (Ama) sells: 4x Milo = 220 GHS (Cash)
    const sale3Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staff2Token}` },
      body: JSON.stringify({
        items: [{ productId: prod1.id, productName: prod1.name, quantity: 4, unitPrice: 55, costPrice: 40, total: 220 }],
        subtotal: 220,
        total: 220,
        paymentMethod: 'Cash',
        amountPaid: 220,
      }),
    });
    const sale3 = await sale3Res.json();
    assert(sale3?.staffId === staff2.id, 'Sale 3 attributed to Ama');

    // Staff 2 (Ama) sells: 10x Ideal Milk = 120 GHS (Credit/Debt, 0 paid)
    const sale4Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staff2Token}` },
      body: JSON.stringify({
        items: [{ productId: prod2.id, productName: prod2.name, quantity: 10, unitPrice: 12, costPrice: 8, total: 120 }],
        subtotal: 120,
        total: 120,
        paymentMethod: 'Credit/Debt',
        amountPaid: 0,
        customerId: cust.id,
        customerName: cust.name,
      }),
    });
    const sale4 = await sale4Res.json();
    assert(sale4?.staffId === staff2.id, 'Sale 4 attributed to Ama as credit');

    // Owner A sells directly: 1x Milo = 55 GHS (Cash)
    const sale5Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [{ productId: prod1.id, productName: prod1.name, quantity: 1, unitPrice: 55, costPrice: 40, total: 55 }],
        subtotal: 55,
        total: 55,
        paymentMethod: 'Cash',
        amountPaid: 55,
      }),
    });
    const sale5 = await sale5Res.json();
    assert(sale5?.staffId === ownerAUser.id, 'Sale 5 attributed to business owner');

    // ----------------------------------------------------
    // TEST 1: Staff Intelligence Endpoint Authorization & Shape
    // ----------------------------------------------------
    const intelRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(intelRes.status === 200, 'GET /api/staff/intelligence returns 200 for business owner');
    const intelData = await intelRes.json();

    assert(Boolean(intelData.staffSummary), 'Intelligence returns staffSummary object');
    assert(Array.isArray(intelData.staffPerformance), 'Intelligence returns staffPerformance array');
    assert(Array.isArray(intelData.hourlyDistribution), 'Intelligence returns hourlyDistribution array');
    assert(Boolean(intelData.peakOperatingHours), 'Intelligence returns peakOperatingHours');
    assert(Array.isArray(intelData.dayOfWeekDistribution), 'Intelligence returns dayOfWeekDistribution array');
    assert(Boolean(intelData.busiestDay), 'Intelligence returns busiestDay');
    assert(Array.isArray(intelData.paymentMethodMix), 'Intelligence returns paymentMethodMix array');
    assert(Boolean(intelData.debtVelocity), 'Intelligence returns debtVelocity');
    assert(Array.isArray(intelData.recommendations), 'Intelligence returns recommendations array');

    // ----------------------------------------------------
    // TEST 2: Staff Summary Verification
    // ----------------------------------------------------
    const summary = intelData.staffSummary;
    assert(summary.totalStaffCount >= 3, 'Total staff count includes owner and 2 cashiers', `Count: ${summary.totalStaffCount}`);
    assert(summary.activeStaffCount === 3, 'All 3 staff members made sales in period', `Active: ${summary.activeStaffCount}`);
    assert(summary.totalTransactions === 5, 'Total transactions equals 5', `Found: ${summary.totalTransactions}`);
    // Total revenue: 110 + 60 + 220 + 120 + 55 = 565 GHS
    assert(Math.abs(summary.totalSalesValue - 565) < 0.01, 'Total sales value equals 565 GHS', `Found: ${summary.totalSalesValue}`);
    // Total units sold: 2 + 5 + 4 + 10 + 1 = 22
    assert(summary.totalUnitsSold === 22, 'Total units sold equals 22', `Found: ${summary.totalUnitsSold}`);
    // Cash collected: 110 + 60 + 220 + 55 = 445 GHS
    assert(Math.abs(summary.totalCashCollected - 445) < 0.01, 'Total cash collected equals 445 GHS', `Found: ${summary.totalCashCollected}`);
    // Credit originated: 120 GHS
    assert(Math.abs(summary.totalCreditOriginated - 120) < 0.01, 'Total credit originated equals 120 GHS', `Found: ${summary.totalCreditOriginated}`);

    // ----------------------------------------------------
    // TEST 3: Staff Ranking & Attribution Calculations
    // ----------------------------------------------------
    const perfList = intelData.staffPerformance;
    assert(perfList.length >= 3, 'Staff performance list contains at least 3 entries');

    // Ama: 220 + 120 = 340 GHS (Rank 1)
    // Kofi: 110 + 60 = 170 GHS (Rank 2)
    // Owner: 55 GHS (Rank 3)
    const rank1Staff = perfList.find((s: any) => s.rank === 1);
    assert(rank1Staff?.staffId === staff2.id, 'Rank 1 staff member is Ama Cashier B');
    assert(Math.abs(rank1Staff?.totalSalesValue - 340) < 0.01, 'Ama total sales value is 340 GHS', `Found: ${rank1Staff?.totalSalesValue}`);
    assert(rank1Staff?.transactionCount === 2, 'Ama transaction count is 2');
    assert(rank1Staff?.unitsSold === 14, 'Ama sold 14 units (4 Milo + 10 Milk)');

    const rank2Staff = perfList.find((s: any) => s.rank === 2);
    assert(rank2Staff?.staffId === staff1.id, 'Rank 2 staff member is Kofi Cashier A');
    assert(Math.abs(rank2Staff?.totalSalesValue - 170) < 0.01, 'Kofi total sales value is 170 GHS', `Found: ${rank2Staff?.totalSalesValue}`);
    assert(rank2Staff?.transactionCount === 2, 'Kofi transaction count is 2');
    assert(rank2Staff?.unitsSold === 7, 'Kofi sold 7 units (2 Milo + 5 Milk)');

    // Check average transaction value
    assert(Math.abs(rank1Staff.averageTransactionValue - 170) < 0.01, 'Ama average transaction value is 170 GHS (340 / 2)');
    assert(Math.abs(rank2Staff.averageTransactionValue - 85) < 0.01, 'Kofi average transaction value is 85 GHS (170 / 2)');

    // ----------------------------------------------------
    // TEST 4: Payment Method Attribution Per Staff Member
    // ----------------------------------------------------
    const kofiPayments = rank2Staff.paymentMethodBreakdown;
    assert(Boolean(kofiPayments?.['Cash']), 'Kofi payment breakdown includes Cash');
    assert(kofiPayments?.['Cash']?.amount === 110, 'Kofi Cash amount is 110 GHS');
    assert(Boolean(kofiPayments?.['Mobile Money']), 'Kofi payment breakdown includes Mobile Money');
    assert(kofiPayments?.['Mobile Money']?.amount === 60, 'Kofi Mobile Money amount is 60 GHS');

    const amaPayments = rank1Staff.paymentMethodBreakdown;
    assert(amaPayments?.['Cash']?.amount === 220, 'Ama Cash amount is 220 GHS');
    assert(amaPayments?.['Credit/Debt']?.amount === 120 || amaPayments?.['Credit']?.amount === 120, 'Ama credit sales amount recorded');

    // ----------------------------------------------------
    // TEST 5: Top Products Per Staff Member
    // ----------------------------------------------------
    assert(Array.isArray(rank1Staff.topProducts), 'Top products is an array');
    const amaTopProduct = rank1Staff.topProducts[0];
    assert(Boolean(amaTopProduct), 'Ama has top products listed');
    assert(amaTopProduct.quantity > 0, 'Ama top product quantity is greater than 0');

    // ----------------------------------------------------
    // TEST 6: Operations & Peak Hours Analytics
    // ----------------------------------------------------
    const hourly = intelData.hourlyDistribution;
    assert(hourly.length === 24, 'Hourly distribution has exactly 24 hours (0-23)');

    const totalHourlySales = hourly.reduce((sum: number, h: any) => sum + h.salesCount, 0);
    assert(totalHourlySales === 5, 'Sum of hourly transactions matches total sales (5)');

    const totalHourlyRevenue = hourly.reduce((sum: number, h: any) => sum + h.totalRevenue, 0);
    assert(Math.abs(totalHourlyRevenue - 565) < 0.01, 'Sum of hourly revenue matches 565 GHS');

    const peak = intelData.peakOperatingHours;
    assert(typeof peak.peakHour === 'number' && peak.peakHour >= 0 && peak.peakHour <= 23, 'Peak hour is valid hour between 0 and 23');
    assert(peak.salesCount >= 1, 'Peak hour has at least 1 sale');
    assert(peak.totalRevenue > 0, 'Peak hour has revenue > 0');
    assert(typeof peak.peakHourLabel === 'string' && (peak.peakHourLabel.includes('AM') || peak.peakHourLabel.includes('PM')), 'Peak hour label formatted correctly (e.g. 11 AM - 12 PM)');

    // ----------------------------------------------------
    // TEST 7: Day of Week Distribution
    // ----------------------------------------------------
    const days = intelData.dayOfWeekDistribution;
    assert(days.length === 7, 'Day of week distribution has 7 days');
    const dayTotalSales = days.reduce((sum: number, d: any) => sum + d.salesCount, 0);
    assert(dayTotalSales === 5, 'Sum of day of week sales matches 5');

    const busiestDay = intelData.busiestDay;
    assert(Boolean(busiestDay?.dayName), 'Busiest day contains dayName');
    assert(busiestDay?.salesCount === 5, 'Busiest day contains all 5 sales recorded today');

    // ----------------------------------------------------
    // TEST 8: Debt Velocity & Payment Channels
    // ----------------------------------------------------
    const velocity = intelData.debtVelocity;
    assert(velocity.debtOriginated === 120, 'Debt originated is 120 GHS');
    assert(velocity.netDebtChange === 120, 'Net debt change is +120 GHS (no repayments yet in period)');

    const pmm = intelData.paymentMethodMix;
    assert(pmm.length >= 3, 'Payment mix captures Cash, Mobile Money, and Credit');
    const cashMethod = pmm.find((p: any) => p.method === 'Cash');
    assert(cashMethod?.amount === 385, 'Total cash method is 385 GHS (110 + 220 + 55)', `Found: ${cashMethod?.amount}`);
    assert(cashMethod?.count === 3, 'Cash payment count is 3');

    // ----------------------------------------------------
    // TEST 9: Management Recommendations Heuristics
    // ----------------------------------------------------
    const recs = intelData.recommendations;
    assert(Array.isArray(recs), 'Recommendations returned as array');
    assert(recs.length > 0, 'Recommendations generated from operations data');

    const topPerformerRec = recs.find((r: any) => r.category === 'performance' || r.type === 'praise');
    assert(Boolean(topPerformerRec), 'Staff praise recommendation created for top performer');

    const operationsRec = recs.find((r: any) => r.category === 'staffing' || r.id === 'rec_peak_rush');
    assert(Boolean(operationsRec), 'Operations recommendation created for peak rush window');

    const creditRec = recs.find((r: any) => r.category === 'credit');
    assert(Boolean(creditRec), 'Credit alert recommendation created for credit originated');

    // ----------------------------------------------------
    // TEST 10: Individual Staff Member Performance Endpoint
    // ----------------------------------------------------
    const staffDetailRes = await fetch(`${BASE_URL}/api/staff/${staff1.id}/performance?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(staffDetailRes.status === 200, 'GET /api/staff/:id/performance returns 200');
    const staffDetail = await staffDetailRes.json();
    assert(staffDetail?.staffMember?.staffId === staff1.id, 'Returns exact requested staff member');
    assert(staffDetail?.staffMember?.fullName === 'Kofi Cashier A', 'Returns correct staff full name');
    assert(staffDetail?.staffMember?.totalSalesValue === 170, 'Returns correct sales value for staff member');
    assert(Array.isArray(staffDetail?.hourlyDistribution), 'Returns staff hourly distribution');

    // ----------------------------------------------------
    // TEST 11: Financial Privacy & Sanitization for Staff
    // ----------------------------------------------------
    // Staff 1 (Kofi) does NOT have view_reports permission.
    // Call GET /api/staff/intelligence with Staff 1's token
    const staffIntelRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(staffIntelRes.status === 200, 'Staff member can view operational intelligence');
    const staffIntelData = await staffIntelRes.json();
    // Verify profit and cost are sanitized / not exposed to staff without permission
    assert(staffIntelData.staffSummary?.totalProfit === undefined, 'totalProfit is not exposed to staff without view_reports');
    assert(staffIntelData.staffSummary?.totalCost === undefined, 'totalCost is not exposed to staff without view_reports');

    // ----------------------------------------------------
    // TEST 12: Tenant Isolation Verification
    // ----------------------------------------------------
    // Business B owner requests staff intelligence: must NOT see Business A's staff or sales
    const bizBIntelRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(bizBIntelRes.status === 200, 'Business B can fetch its own intelligence');
    const bizBIntel = await bizBIntelRes.json();
    assert(bizBIntel.staffSummary?.totalSalesValue === 0, 'Business B has 0 sales in period (isolated from Business A)');
    assert(bizBIntel.staffPerformance.length <= 1, 'Business B has no Business A staff members');
    const foundKofiInBizB = bizBIntel.staffPerformance.some((s: any) => s.staffId === staff1.id);
    assert(!foundKofiInBizB, 'Business B staff list does not contain Business A staff');

    // Business B attempts to access Business A staff performance endpoint directly
    const crossTenantStaffRes = await fetch(`${BASE_URL}/api/staff/${staff1.id}/performance`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(crossTenantStaffRes.status === 404, 'Cross-tenant access to staff performance is rejected with 404');

    // ----------------------------------------------------
    // TEST 13: Read-Only Verification (No Mutation)
    // ----------------------------------------------------
    // Verify inventory quantities and product prices remain exactly intact after multiple intelligence calls
    const checkProdRes = await fetch(`${BASE_URL}/api/products/${prod1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const checkProd = (await checkProdRes.json()).product;
    // Initial stock was 100. Sold 2 (sale 1) + 4 (sale 3) + 1 (sale 5) = 7 units sold. Stock should be exactly 93.
    assert(checkProd.quantity === 93, 'Product stock remains exact at 93; analytics caused no side-effects');

    // ----------------------------------------------------
    // TEST 14: Date Range Filtering (all_time, yesterday)
    // ----------------------------------------------------
    const allTimeRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=all_time`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const allTimeData = await allTimeRes.json();
    assert(allTimeData.staffSummary?.totalTransactions >= 5, 'All-time range includes all transactions');

    const yesterdayRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=yesterday`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const yesterdayData = await yesterdayRes.json();
    assert(yesterdayData.staffSummary?.totalTransactions === 0, 'Yesterday range returns 0 transactions for freshly created test data');

    // ----------------------------------------------------
    // TEST 15: Backward Compatibility & Regression
    // ----------------------------------------------------
    // Check GET /api/reports still works seamlessly
    const reportRes = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(reportRes.status === 200, 'Existing Financial Reports endpoint functions without regression');

    // Check GET /api/debtors still works seamlessly
    const debtorsRes = await fetch(`${BASE_URL}/api/debtors`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(debtorsRes.status === 200, 'Debtors endpoint functions without regression');
    const debtorsData = await debtorsRes.json();
    assert(Array.isArray(debtorsData), 'Debtors list is returned as array');

    // Check GET /api/customers/intelligence (Stage 4H) still works seamlessly
    const custIntelRes = await fetch(`${BASE_URL}/api/customers/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(custIntelRes.status === 200, 'Stage 4H Customer Intelligence endpoint functions without regression');

  } catch (err: any) {
    assert(false, 'Unexpected suite exception', err?.message || String(err));
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`STAGE 4I RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
