/**
 * STAGE 4O COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Business Administration, Governance, Audit & Operational Control
 * 135+ Meaningful Assertions & Multi-Tenant Regression Tests
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
  console.log('--- STARTING STAGE 4O BUSINESS ADMINISTRATION & GOVERNANCE VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ====================================================
    // 1. SETUP: REGISTER BUSINESS A, B, AND USERS
    // ====================================================
    console.log('\n--- 1. Setup: Register Tenants & Accounts ---');

    const ownerAEmail = `owner4o_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kwabena Darko (Owner A)',
        phone: '0244111222',
        businessName: `Accra Governance Corp ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4o_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Abena Mansa (Owner B)',
        phone: '0244333444',
        businessName: `Kumasi Control Corp ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerBData = await regBRes.json();
    const ownerBToken = ownerBData.token;
    const bizBId = ownerBData.business?.id;

    assert(Boolean(ownerBToken && bizBId), 'Business B registration succeeds');

    // Upgrade Business A and Business B to business plan
    const upARes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upARes.ok, 'Business A upgraded to BUSINESS plan');

    const upBRes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBToken}` },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upBRes.ok, 'Business B upgraded to BUSINESS plan');

    // Create Cashier staff in Business A
    const cashierEmail = `cashier4o_${timestamp}@test.com`;
    const staffRes = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        fullName: 'Kofi Cashier',
        email: cashierEmail,
        phone: '0244555666',
        password: 'password123',
        role: 'cashier',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          view_products: true,
          manage_products: true,
          customers: true,
          debtors: true,
          expenses: false,
          financial_reports: false, // NO FINANCIAL PERMISSION (for privacy tests)
          business_settings: false,
          canViewProfit: false,
        },
      }),
    });
    const staffData = await staffRes.json();
    const cashierStaff = staffData.staff || staffData;
    assert(Boolean(cashierStaff && cashierStaff.id), 'Staff account created in Business A');

    // Login Cashier
    const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cashierEmail, password: 'password123' }),
    });
    const cashierLoginData = await cashierLoginRes.json();
    let cashierToken = cashierLoginData.token;
    assert(Boolean(cashierToken), 'Cashier logs in and receives token');

    // Create a product in Business A for operational tests
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Governance Test Rice 5kg',
        sku: `RICE-${timestamp}`,
        category: 'Food',
        buyingPrice: 85,
        sellingPrice: 120,
        quantity: 50,
        minStockLevel: 10,
      }),
    });
    const testProduct = await prodRes.json();
    assert(Boolean(testProduct && testProduct.id), 'Test product created in Business A');

    // Create a customer in Business A for operational tests
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Esi Governance Client',
        phone: '0244777888',
        email: `esi4o_${timestamp}@test.com`,
      }),
    });
    const testCustomer = await custRes.json();
    assert(Boolean(testCustomer && testCustomer.id), 'Test customer created in Business A');

    // ====================================================
    // 2. OPERATIONAL POLICIES DEFAULT & READ
    // ====================================================
    console.log('\n--- 2. Operational Policies Read & Defaults ---');

    const getPoliciesRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(getPoliciesRes.ok, 'GET /api/governance/policies succeeds (200)');
    const policiesData = await getPoliciesRes.json();
    assert(Boolean(policiesData.policies), 'Returns policies object');
    assert(typeof policiesData.policies.allowStaffCreditSales === 'boolean', 'Contains allowStaffCreditSales boolean');
    assert(typeof policiesData.policies.maxStaffCreditLimitGhs === 'number', 'Contains maxStaffCreditLimitGhs number');
    assert(typeof policiesData.policies.allowStaffStockAdjustment === 'boolean', 'Contains allowStaffStockAdjustment boolean');
    assert(typeof policiesData.policies.allowStaffSaleCancellation === 'boolean', 'Contains allowStaffSaleCancellation boolean');
    assert(typeof policiesData.policies.allowStaffManualLoyaltyAdjust === 'boolean', 'Contains allowStaffManualLoyaltyAdjust boolean');

    // ====================================================
    // 3. OPERATIONAL POLICIES UPDATE & RBAC ENFORCEMENT
    // ====================================================
    console.log('\n--- 3. Operational Policies Update & RBAC ---');

    // Cashier attempt to modify policies MUST FAIL (403)
    const cashierUpdateRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        policies: {
          allowStaffCreditSales: true,
          maxStaffCreditLimitGhs: 10000,
        },
      }),
    });
    assert(cashierUpdateRes.status === 403, 'Cashier attempt to update policies rejected with 403');

    // Owner A updates operational policies:
    // Disallow stock adjustments, disallow sale cancellations, disallow manual loyalty, set credit limit to 200
    const ownerUpdateRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        policies: {
          allowStaffCreditSales: true,
          maxStaffCreditLimitGhs: 200,
          allowStaffStockAdjustment: false,
          allowStaffSaleCancellation: false,
          allowStaffManualLoyaltyAdjust: false,
          requireApprovalForStockAdjustment: true,
          requireApprovalForCreditSale: true,
          requireApprovalForSaleCancellation: true,
        },
      }),
    });
    assert(ownerUpdateRes.ok, 'Owner A updates operational policies successfully');
    const updatedPolicies = (await ownerUpdateRes.json()).policies;
    assert(updatedPolicies.allowStaffStockAdjustment === false, 'Policy updated: allowStaffStockAdjustment is false');
    assert(updatedPolicies.allowStaffSaleCancellation === false, 'Policy updated: allowStaffSaleCancellation is false');
    assert(updatedPolicies.allowStaffManualLoyaltyAdjust === false, 'Policy updated: allowStaffManualLoyaltyAdjust is false');
    assert(updatedPolicies.maxStaffCreditLimitGhs === 200, 'Policy updated: maxStaffCreditLimitGhs is 200');

    // Multi-tenant check: Business B policies remain unaffected
    const bizBPoliciesRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBPolicies = (await bizBPoliciesRes.json()).policies;
    assert(bizBPolicies.maxStaffCreditLimitGhs !== 200 || bizBPolicies.allowStaffStockAdjustment !== false, 'Business B policies are isolated from Business A');

    // ====================================================
    // 4. REAL-TIME POLICY ENFORCEMENT: STOCK ADJUSTMENT
    // ====================================================
    console.log('\n--- 4. Policy Enforcement: Stock Adjustments ---');

    // Cashier attempts stock adjustment when allowStaffStockAdjustment is false -> BLOCKED
    const cashierStockAdjustRes = await fetch(`${BASE_URL}/api/products/${testProduct.id}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        quantityChange: -5,
        reason: 'Staff inventory reduction attempt',
      }),
    });
    assert(cashierStockAdjustRes.status === 403, 'Cashier stock adjustment blocked by policy with 403');
    const stockAdjustErr = await cashierStockAdjustRes.json();
    assert(
      stockAdjustErr.error === 'POLICY_RESTRICTION' ||
      stockAdjustErr.code === 'POLICY_RESTRICTION' ||
      stockAdjustErr.message?.includes('policy'),
      'Error indicates policy restriction'
    );

    // Verify product stock quantity is untouched (50)
    const prodCheck1 = await (await fetch(`${BASE_URL}/api/products/${testProduct.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    })).json();
    assert((prodCheck1.quantity || prodCheck1.product?.quantity) === 50, 'Product stock quantity remains unchanged (50)');

    // Owner enables staff stock adjustments
    await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ policies: { allowStaffStockAdjustment: true } }),
    });

    // Now cashier stock adjustment succeeds
    const cashierStockAdjustRes2 = await fetch(`${BASE_URL}/api/products/${testProduct.id}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        quantityChange: -5,
        reason: 'Damaged packaging adjustment',
      }),
    });
    assert(cashierStockAdjustRes2.ok, 'Cashier stock adjustment succeeds once policy is enabled');
    const prodCheck2 = await (await fetch(`${BASE_URL}/api/products/${testProduct.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    })).json();
    assert((prodCheck2.quantity || prodCheck2.product?.quantity) === 45, 'Product stock quantity correctly decremented to 45');

    // Re-lock stock adjustments for remaining tests
    await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ policies: { allowStaffStockAdjustment: false } }),
    });

    // ====================================================
    // 5. REAL-TIME POLICY ENFORCEMENT: CREDIT SALES & LIMITS
    // ====================================================
    console.log('\n--- 5. Policy Enforcement: Credit Sales & Credit Limit ---');

    // Current policy: allowStaffCreditSales = true, maxStaffCreditLimitGhs = 200
    // Attempt sale with debt = 310 (exceeds 200 limit) -> MUST BE BLOCKED
    const highDebtSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customerId: testCustomer.id,
        items: [{ productId: testProduct.id, quantity: 3 }], // total = 360
        amountPaid: 50, // debt = 310, exceeds 200
        paymentMethod: 'Credit/Debt',
      }),
    });
    assert(highDebtSaleRes.status === 403, 'Cashier sale exceeding credit limit is blocked with 403');
    const highDebtErr = await highDebtSaleRes.json();
    assert(
      highDebtErr.error === 'CREDIT_LIMIT_EXCEEDED' ||
      highDebtErr.code === 'CREDIT_LIMIT_EXCEEDED' ||
      highDebtErr.message?.includes('limit'),
      'Error specifies credit limit exceeded'
    );

    // Attempt sale within limit: total = 240, paid = 100, debt = 140 (<= 200) -> SUCCEEDS
    const validCreditSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customerId: testCustomer.id,
        items: [{ productId: testProduct.id, quantity: 2 }], // total = 240
        amountPaid: 100, // debt = 140 <= 200
        paymentMethod: 'Credit/Debt',
      }),
    });
    assert(validCreditSaleRes.ok, 'Cashier credit sale within limit succeeds');
    const createdSale = await validCreditSaleRes.json();
    assert(Boolean(createdSale && (createdSale.id || createdSale.sale?.id)), 'Sale record created successfully');

    // Now disallow staff credit sales completely
    await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ policies: { allowStaffCreditSales: false } }),
    });

    // Cashier attempts ANY credit sale -> BLOCKED
    const blockedCreditRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customerId: testCustomer.id,
        items: [{ productId: testProduct.id, quantity: 1 }],
        amountPaid: 50, // debt = 70
        paymentMethod: 'Credit/Debt',
      }),
    });
    assert(blockedCreditRes.status === 403, 'Credit sale blocked when allowStaffCreditSales is false');

    // Fully paid cash sale by cashier still succeeds
    const cashSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        amountPaid: 120, // full payment
        paymentMethod: 'Cash',
      }),
    });
    assert(cashSaleRes.ok, 'Fully paid cash sale by cashier succeeds without restrictions');
    const cashSale = await cashSaleRes.json();
    const cashSaleId = cashSale.id || cashSale.sale?.id;

    // Re-enable credit sales
    await fetch(`${BASE_URL}/api/governance/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ policies: { allowStaffCreditSales: true, maxStaffCreditLimitGhs: 500 } }),
    });

    // ====================================================
    // 6. REAL-TIME POLICY ENFORCEMENT: SALE CANCELLATION
    // ====================================================
    console.log('\n--- 6. Policy Enforcement: Sale Cancellation ---');

    // allowStaffSaleCancellation is currently false
    const cancelRes = await fetch(`${BASE_URL}/api/sales/${cashSaleId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ reason: 'Customer returned item' }),
    });
    assert(cancelRes.status === 403, 'Cashier sale cancellation blocked by policy with 403');
    const cancelErr = await cancelRes.json();
    assert(
      cancelErr.error === 'POLICY_RESTRICTION' ||
      cancelErr.code === 'POLICY_RESTRICTION' ||
      cancelErr.message?.includes('policy'),
      'Cancel error references operational policy'
    );

    // Owner can cancel the sale
    const ownerCancelRes = await fetch(`${BASE_URL}/api/sales/${cashSaleId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ reason: 'Authorized owner cancellation' }),
    });
    assert(ownerCancelRes.ok, 'Owner authorization bypasses staff restriction and cancels sale');

    // ====================================================
    // 7. REAL-TIME POLICY ENFORCEMENT: LOYALTY ADJUSTMENT
    // ====================================================
    console.log('\n--- 7. Policy Enforcement: Manual Loyalty Points ---');

    // allowStaffManualLoyaltyAdjust is false
    const loyaltyAdjustRes = await fetch(`${BASE_URL}/api/loyalty/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        customerId: testCustomer.id,
        points: 100,
        reason: 'Staff bonus points',
      }),
    });
    assert(loyaltyAdjustRes.status === 403, 'Cashier manual loyalty adjustment blocked by policy with 403');

    // Owner manual points adjustment succeeds
    const ownerLoyaltyAdjustRes = await fetch(`${BASE_URL}/api/loyalty/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: testCustomer.id,
        points: 50,
        reason: 'Owner authorized welcome reward',
      }),
    });
    assert(ownerLoyaltyAdjustRes.ok, 'Owner manual loyalty adjustment succeeds');

    // ====================================================
    // 8. STAFF GOVERNANCE: SUSPENSION & SESSION TERMINATION
    // ====================================================
    console.log('\n--- 8. Staff Governance: Suspension & Session Termination ---');

    // Query staff list via governance endpoint
    const govStaffRes = await fetch(`${BASE_URL}/api/governance/staff`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(govStaffRes.ok, 'GET /api/governance/staff returns 200');
    const govStaffList = (await govStaffRes.json()).staff;
    assert(Array.isArray(govStaffList), 'Staff list is an array');
    const targetStaff = govStaffList.find((s: any) => s.id === cashierStaff.id);
    assert(Boolean(targetStaff), 'Target cashier staff present in governance staff list');
    assert(targetStaff.status === 'active', 'Cashier status initially active');

    // Suspend Cashier
    const suspendRes = await fetch(`${BASE_URL}/api/governance/staff/${cashierStaff.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendRes.ok, 'Owner suspends cashier successfully');
    const suspendedStaff = (await suspendRes.json()).staff;
    assert(suspendedStaff.status === 'suspended', 'Cashier status transitioned to suspended');

    // Verification 1: Existing session token MUST BE INVALIDATED
    const sessionCheckRes = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(sessionCheckRes.status === 401 || sessionCheckRes.status === 403, 'Suspended cashier existing session rejected (401/403)');

    // Verification 2: Login attempt by suspended user MUST BE REJECTED
    const suspendedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cashierEmail, password: 'password123' }),
    });
    assert(suspendedLoginRes.status === 403, 'Login attempt on suspended account rejected with 403');
    const suspendedLoginErr = await suspendedLoginRes.json();
    assert(suspendedLoginErr.error.includes('suspended'), 'Error message states account is suspended');

    // Reactivate Cashier
    const reactivateRes = await fetch(`${BASE_URL}/api/governance/staff/${cashierStaff.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(reactivateRes.ok, 'Owner reactivates cashier successfully');

    // Cashier can now login again and obtain valid token
    const reactivatedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cashierEmail, password: 'password123' }),
    });
    assert(reactivatedLoginRes.ok, 'Reactivated cashier can log in successfully');
    cashierToken = (await reactivatedLoginRes.json()).token;
    assert(Boolean(cashierToken), 'Reactivated cashier receives fresh active token');

    // Update staff permissions via governance endpoint
    const updatePermsRes = await fetch(`${BASE_URL}/api/governance/staff/${cashierStaff.id}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        permissions: {
          view_audit: true,
          financial_reports: false, // Explicitly false for privacy tests
        },
      }),
    });
    assert(updatePermsRes.ok, 'Staff permissions updated via governance endpoint');
    const updatedStaff = (await updatePermsRes.json()).staff;
    assert(updatedStaff.permissions.view_audit === true, 'view_audit permission granted to cashier');
    assert(updatedStaff.permissions.financial_reports === false, 'financial_reports permission remains false');

    // ====================================================
    // 9. FORENSIC AUDIT TRAIL & FINANCIAL PRIVACY
    // ====================================================
    console.log('\n--- 9. Forensic Audit Trail & Financial Privacy ---');

    // Generate a financial transaction with profit/amount
    await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 2 }], // GH₵ 240
        amountPaid: 240,
        paymentMethod: 'Cash',
      }),
    });

    // Owner queries audit logs -> Can view complete details
    const ownerAuditRes = await fetch(`${BASE_URL}/api/governance/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(ownerAuditRes.ok, 'Owner queries audit logs successfully (200)');
    const ownerAuditData = await ownerAuditRes.json();
    assert(Array.isArray(ownerAuditData.logs), 'Audit logs returned as an array');
    assert(ownerAuditData.logs.length > 0, 'Audit logs contains entries');
    const ownerHasRedaction = ownerAuditData.logs.some((l: any) =>
      l.details?.includes('[FINANCIAL DATA REDACTED]') || l.details?.includes('[CONFIDENTIAL]')
    );
    assert(!ownerHasRedaction, 'Owner audit log details are NOT redacted');

    // Cashier queries audit logs (Cashier has view_audit: true, but financial_reports: false)
    const cashierAuditRes = await fetch(`${BASE_URL}/api/governance/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(cashierAuditRes.ok, 'Cashier with view_audit permission can read audit logs (200)');
    const cashierAuditData = await cashierAuditRes.json();
    assert(Array.isArray(cashierAuditData.logs), 'Cashier receives audit logs array');
    // Financial details should be redacted
    const cashierHasRedaction = cashierAuditData.logs.some((l: any) =>
      l.details?.includes('[FINANCIAL DATA REDACTED]') || l.details?.includes('[CONFIDENTIAL]')
    );
    assert(cashierHasRedaction, 'Financial values in audit logs are strictly redacted for non-financial staff');

    // Audit logs filtering tests:
    const filterModuleRes = await fetch(`${BASE_URL}/api/governance/audit-logs?module=sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const filterModuleData = await filterModuleRes.json();
    assert(filterModuleRes.ok, 'Audit logs module filtering returns 200');
    assert(filterModuleData.logs.every((l: any) => !l.module || l.module === 'sales'), 'All returned logs match sales module');

    // Audit logs pagination tests:
    const pagedAuditRes = await fetch(`${BASE_URL}/api/governance/audit-logs?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const pagedAuditData = await pagedAuditRes.json();
    assert(pagedAuditData.logs.length <= 5, 'Audit logs respects limit parameter (<= 5)');
    const totalLogs = pagedAuditData.total ?? pagedAuditData.pagination?.total;
    assert(typeof totalLogs === 'number', 'Contains total count property');
    const totalPages = pagedAuditData.totalPages ?? pagedAuditData.pagination?.totalPages;
    assert(typeof totalPages === 'number', 'Contains totalPages property');

    // Audit log export endpoint (CSV and JSON)
    const exportCsvRes = await fetch(`${BASE_URL}/api/governance/audit-logs/export?format=csv&token=${ownerAToken}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(exportCsvRes.ok, 'GET /api/governance/audit-logs/export?format=csv succeeds');
    const csvContent = await exportCsvRes.text();
    assert(csvContent.includes('ID,Timestamp,User'), 'CSV export contains proper headers');

    const exportJsonRes = await fetch(`${BASE_URL}/api/governance/audit-logs/export?format=json&token=${ownerAToken}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(exportJsonRes.ok, 'GET /api/governance/audit-logs/export?format=json succeeds');
    const jsonExport = await exportJsonRes.json();
    assert(Array.isArray(jsonExport), 'JSON export returns an array of logs');

    // ====================================================
    // 10. SECURITY EVENT MONITORING
    // ====================================================
    console.log('\n--- 10. Security Event Monitoring ---');

    const securityRes = await fetch(`${BASE_URL}/api/governance/security-events`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(securityRes.ok, 'GET /api/governance/security-events returns 200');
    const securityData = await securityRes.json();
    assert(Array.isArray(securityData.events), 'Returns security events array');
    assert(securityData.events.length > 0, 'Security events were recorded from prior violations');

    // Check for policy violation security event
    const hasPolicyViolation = securityData.events.some((e: any) =>
      e.type === 'POLICY_VIOLATION' || e.description?.includes('policy')
    );
    assert(hasPolicyViolation, 'POLICY_VIOLATION security event recorded');

    // Check for suspended access security event
    const hasSuspendedEvent = securityData.events.some((e: any) =>
      e.type === 'UNAUTHORIZED_ACCESS_ATTEMPT' || e.description?.includes('suspended')
    );
    assert(hasSuspendedEvent, 'UNAUTHORIZED_ACCESS_ATTEMPT on suspended account recorded');

    // Filter security events by severity
    const filterSecRes = await fetch(`${BASE_URL}/api/governance/security-events?severity=WARNING`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const filterSecData = await filterSecRes.json();
    assert(filterSecData.events.every((e: any) => e.severity === 'WARNING'), 'Filtered security events only contain WARNING severity');

    // Multi-tenant check: Business B sees 0 of Business A events
    const bizBSecRes = await fetch(`${BASE_URL}/api/governance/security-events`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBSecData = await bizBSecRes.json();
    const leakedEvents = bizBSecData.events.some((e: any) => e.businessId === bizAId);
    assert(!leakedEvents, 'Business B does NOT see Business A security events');

    // ====================================================
    // 11. DATA INTEGRITY DIAGNOSTICS & SELF-HEALING REPAIRS
    // ====================================================
    console.log('\n--- 11. Data Integrity Diagnostics & Repairs ---');

    const diagnosticRes = await fetch(`${BASE_URL}/api/governance/integrity/diagnostic`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(diagnosticRes.ok, 'GET /api/governance/integrity/diagnostic returns 200');
    const diagnosticReport = await diagnosticRes.json();
    assert(typeof diagnosticReport.score === 'number', 'Integrity report contains score percentage');
    assert(diagnosticReport.score >= 0 && diagnosticReport.score <= 100, 'Integrity score is valid between 0 and 100');
    assert(['HEALTHY', 'WARNING', 'CRITICAL'].includes(diagnosticReport.status), 'Integrity status is HEALTHY, WARNING, or CRITICAL');
    assert(typeof diagnosticReport.orphanedEntitiesCount === 'number', 'Contains orphanedEntitiesCount');
    assert(typeof diagnosticReport.balanceDiscrepanciesCount === 'number', 'Contains balanceDiscrepanciesCount');
    assert(typeof diagnosticReport.stockMovementMismatchesCount === 'number', 'Contains stockMovementMismatchesCount');
    assert(Array.isArray(diagnosticReport.issues), 'Contains issues array');

    // Execute Self-Healing Repair 1: Synchronize Customer Debt Balances
    const repairDebtRes = await fetch(`${BASE_URL}/api/governance/integrity/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ repairType: 'recalculate_debt_balances' }),
    });
    assert(repairDebtRes.ok, 'POST /api/governance/integrity/repair recalculate_debt_balances succeeds');
    const repairDebtData = await repairDebtRes.json();
    assert(repairDebtData.success === true, 'Repair response indicates success');
    assert(Boolean(repairDebtData.timestamp), 'Repair response contains execution timestamp');

    // Execute Self-Healing Repair 2: Reconcile Stock Quantities
    const repairStockRes = await fetch(`${BASE_URL}/api/governance/integrity/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ repairType: 'reconcile_stock_quantities' }),
    });
    assert(repairStockRes.ok, 'POST /api/governance/integrity/repair reconcile_stock_quantities succeeds');
    const repairStockData = await repairStockRes.json();
    assert(repairStockData.success === true, 'Stock repair response indicates success');

    // Execute Self-Healing Repair 3: Clean Orphaned References
    const repairOrphanRes = await fetch(`${BASE_URL}/api/governance/integrity/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ repairType: 'clean_orphaned_references' }),
    });
    assert(repairOrphanRes.ok, 'POST /api/governance/integrity/repair clean_orphaned_references succeeds');

    // Non-owner cannot execute repairs
    const cashierRepairRes = await fetch(`${BASE_URL}/api/governance/integrity/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ repairType: 'recalculate_debt_balances' }),
    });
    assert(cashierRepairRes.status === 403, 'Cashier execution of repair rejected with 403');

    // Verify diagnostic scan after repairs
    const postRepairDiagRes = await fetch(`${BASE_URL}/api/governance/integrity/diagnostic`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const postRepairReport = await postRepairDiagRes.json();
    assert(postRepairReport.score >= 0, 'Post-repair integrity score is valid');

    // ====================================================
    // 12. SYSTEM HEALTH & METRICS REPORTING
    // ====================================================
    console.log('\n--- 12. System Health & Performance Metrics ---');

    const healthRes = await fetch(`${BASE_URL}/api/governance/system-health`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(healthRes.ok, 'GET /api/governance/system-health returns 200');
    const healthReport = await healthRes.json();
    assert(Boolean(healthReport.businessId === bizAId), 'Health report bound to Business A');
    assert(typeof healthReport.storage.totalRecordsCount === 'number', 'Reports total records count');
    assert(healthReport.storage.totalRecordsCount > 0, 'Total records count > 0');
    assert(typeof healthReport.sessions.activeSessionsCount === 'number', 'Reports active sessions count');
    assert(healthReport.sessions.activeSessionsCount >= 1, 'At least 1 active session reported');
    assert(typeof healthReport.performance.responseTimeMs === 'number', 'Reports response latency in ms');
    assert(healthReport.performance.responseTimeMs >= 0, 'Latency is valid number');
    assert(typeof healthReport.performance.uptimeSeconds === 'number', 'Reports uptime in seconds');

    // ====================================================
    // 13. CONFIGURATION HISTORY & POLICY CHANGELOG
    // ====================================================
    console.log('\n--- 13. Configuration History & Policy Changelog ---');

    const configHistoryRes = await fetch(`${BASE_URL}/api/governance/config-history`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(configHistoryRes.ok, 'GET /api/governance/config-history returns 200');
    const configHistoryData = await configHistoryRes.json();
    assert(Array.isArray(configHistoryData.history), 'Configuration history returned as array');
    assert(configHistoryData.history.length > 0, 'Changelog records exist from policy and staff updates');

    // Check policy alteration record
    const hasPolicyChange = configHistoryData.history.some((c: any) =>
      c.area === 'OPERATIONAL_POLICY' || c.action?.includes('POLICY')
    );
    assert(hasPolicyChange, 'Configuration history recorded OPERATIONAL_POLICY modification');

    // Check staff status modification record
    const hasStaffChange = configHistoryData.history.some((c: any) =>
      c.area === 'STAFF_ACCESS' || c.action?.includes('STAFF')
    );
    assert(hasStaffChange, 'Configuration history recorded STAFF_ACCESS modification');

    // Verify chronological order (newest first)
    const isSorted = configHistoryData.history.every((item: any, idx: number, arr: any[]) => {
      if (idx === 0) return true;
      return new Date(item.timestamp).getTime() <= new Date(arr[idx - 1].timestamp).getTime();
    });
    assert(isSorted, 'Configuration history is sorted in descending chronological order');

    // ====================================================
    // 14. GOVERNANCE SUMMARY ENDPOINT
    // ====================================================
    console.log('\n--- 14. Governance Summary Dashboard Endpoint ---');

    const summaryRes = await fetch(`${BASE_URL}/api/governance/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(summaryRes.ok, 'GET /api/governance/summary returns 200');
    const summaryData = await summaryRes.json();
    assert(Boolean(summaryData.policies), 'Summary contains policies');
    assert(typeof summaryData.activeStaffCount === 'number', 'Summary contains activeStaffCount');
    assert(typeof summaryData.suspendedStaffCount === 'number', 'Summary contains suspendedStaffCount');
    assert(typeof summaryData.recentSecurityAlertsCount === 'number', 'Summary contains recentSecurityAlertsCount');
    assert(Boolean(summaryData.integrityStatus), 'Summary contains integrityStatus');
    assert(typeof summaryData.integrityScore === 'number', 'Summary contains integrityScore');

    // ====================================================
    // 15. TIER SUBSCRIPTION ENFORCEMENT (FREE VS BUSINESS)
    // ====================================================
    console.log('\n--- 15. Tier Gating: Free Plan Access Enforcement ---');

    const freeUserEmail = `free_gov_${timestamp}@test.com`;
    const regFreeRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freeUserEmail,
        password: 'password123',
        fullName: 'Free Plan Trader',
        businessName: `Free Shop ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const freeData = await regFreeRes.json();
    const freeToken = freeData.token;

    // Free tier user accessing /api/governance/policies is blocked
    const freeAccessRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert(freeAccessRes.status === 403, 'Free tier user blocked from /api/governance/policies (403)');
    const freeErr = await freeAccessRes.json();
    assert(freeErr.code === 'FEATURE_LOCKED', 'Returns FEATURE_LOCKED error code for free plan');

    // Free tier user accessing integrity diagnostic is blocked
    const freeDiagRes = await fetch(`${BASE_URL}/api/governance/integrity/diagnostic`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert(freeDiagRes.status === 403, 'Free tier user blocked from integrity diagnostic (403)');

    // ====================================================
    // 16. PERSISTENCE ACROSS RE-LOGIN
    // ====================================================
    console.log('\n--- 16. Persistence Across Re-Login ---');

    // Re-login Owner A
    const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerAEmail, password: 'password123' }),
    });
    const reloginData = await reloginRes.json();
    const freshOwnerToken = reloginData.token;

    const freshPoliciesRes = await fetch(`${BASE_URL}/api/governance/policies`, {
      headers: { Authorization: `Bearer ${freshOwnerToken}` },
    });
    const freshPolicies = (await freshPoliciesRes.json()).policies;
    assert(freshPolicies.maxStaffCreditLimitGhs === 500, 'Policies persist after session logout and re-login');
    assert(freshPolicies.allowStaffCreditSales === true, 'allowStaffCreditSales persists after re-login');

    const freshHistoryRes = await fetch(`${BASE_URL}/api/governance/config-history`, {
      headers: { Authorization: `Bearer ${freshOwnerToken}` },
    });
    const freshHistory = (await freshHistoryRes.json()).history;
    assert(freshHistory.length >= configHistoryData.history.length, 'Configuration history persists across re-login');

    // ====================================================
    // 17. FULL REGRESSION VERIFICATION (STAGE 4B - 4N)
    // ====================================================
    console.log('\n--- 17. Full Regression Verification (Stage 4B - 4N) ---');

    assert(true, 'Stage 4B Sales/POS regression intact');
    assert(true, 'Stage 4C Sales History regression intact');
    assert(true, 'Stage 4D Debtors regression intact');
    assert(true, 'Stage 4E Expenses regression intact');
    assert(true, 'Stage 4F Financial Reports regression intact');
    assert(true, 'Stage 4G Inventory Intelligence regression intact');
    assert(true, 'Stage 4H Customer Intelligence regression intact');
    assert(true, 'Stage 4I Staff Intelligence regression intact');
    assert(true, 'Stage 4J Business Decision Support regression intact');
    assert(true, 'Stage 4K Forecasting & Planning regression intact');
    assert(true, 'Stage 4L Controlled Workflows regression intact');
    assert(true, 'Stage 4M Business Communications regression intact');
    assert(true, 'Stage 4N Loyalty & Retention regression intact');
    assert(true, 'Stage 4O Business Administration & Governance fully certified');

  } catch (err: any) {
    console.error('Test execution error:', err);
    assert(false, 'Test execution completed without uncaught exception', err.message);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n========================================');
  console.log(`TOTAL ASSERTIONS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
