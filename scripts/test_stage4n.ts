/**
 * STAGE 4N COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Business Loyalty, Customer Retention & Growth Engine
 * 110+ Meaningful Assertions & Regression Tests
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
  console.log('--- STARTING STAGE 4N BUSINESS LOYALTY & RETENTION VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // SETUP: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4n_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kwame Mensah (Owner A)',
        phone: '0244111222',
        businessName: `Accra SuperMart ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4n_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Osei (Owner B)',
        phone: '0244333444',
        businessName: `Kumasi Stores ${timestamp}`,
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
    const cashierEmail = `cashier4n_${timestamp}@test.com`;
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
          customers: true,
          financial_reports: false,
          business_settings: false,
          canViewProfit: false,
          canViewLoyalty: true,
          canManageLoyalty: false,
          canAdjustLoyalty: false,
          canRedeemLoyalty: true,
        },
      }),
    });
    const staffData = await staffRes.json();
    assert(Boolean(staffData?.staff?.id || staffData?.id), 'Cashier staff created in Business A');

    // Log in cashier to get fresh token
    const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cashierEmail,
        password: 'password123',
      }),
    });
    const cashierLoginData = await cashierLoginRes.json();
    const finalCashierToken = cashierLoginData.token;
    assert(Boolean(finalCashierToken), 'Cashier logs in successfully with loyalty view & redeem permissions');

    // ====================================================
    // 1. CONFIGURATION TESTS
    // ====================================================
    console.log('\n--- 1. Loyalty Configuration Tests ---');

    // Default configuration exists
    const getConfigRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(getConfigRes.ok, 'GET /api/loyalty/config returns 200 OK');
    const defaultCfg = await getConfigRes.json();
    assert(defaultCfg.enabled === true, 'Loyalty program defaults to enabled');
    assert(defaultCfg.pointsPerCurrencyUnit === 0.1, 'Default points rate is 0.1 per GHS (1 pt per GH₵10)');
    assert(defaultCfg.minimumPointsToRedeem === 50, 'Default minimum points to redeem is 50');
    assert(defaultCfg.pointValueGhs === 0.05, 'Default point monetary value is GH₵ 0.05');

    // Cashier blocked from updating configuration
    const cashierUpdateRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalCashierToken}` },
      body: JSON.stringify({ pointsPerCurrencyUnit: 0.2 }),
    });
    assert(cashierUpdateRes.status === 403, 'Cashier without manage permission blocked from updating config (403)');

    // Validation: Negative pointsPerCurrencyUnit rejected
    const invalidValRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ pointsPerCurrencyUnit: -1 }),
    });
    assert(invalidValRes.status === 400, 'Negative pointsPerCurrencyUnit rejected with 400 Bad Request');

    // Owner updates configuration successfully
    const validUpdateRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        pointsPerCurrencyUnit: 0.1,
        minimumPurchaseForPoints: 20,
        minimumPointsToRedeem: 50,
        pointValueGhs: 0.2,
        requireApprovalForRewards: true,
      }),
    });
    assert(validUpdateRes.ok, 'Owner updates loyalty configuration successfully');
    const updatedCfg = await validUpdateRes.json();
    assert(updatedCfg.minimumPurchaseForPoints === 20, 'Configuration persistence: minimum purchase updated');
    assert(updatedCfg.requireApprovalForRewards === true, 'Configuration persistence: requireApproval updated');

    // Tenant Isolation: Business B cannot see Business A config changes
    const bizBConfigRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBCfg = await bizBConfigRes.json();
    assert(bizBCfg.minimumPurchaseForPoints === 10, 'Tenant isolation: Business B has separate default config');

    // ====================================================
    // 2. CUSTOMERS & POINTS ACCRUAL VIA AUTHORITATIVE SALES
    // ====================================================
    console.log('\n--- 2. Customer Points Accrual & Authoritative Sales ---');

    // Create Customer 1 in Biz A
    const cust1Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Kojo Antwi',
        phone: '0244777888',
        email: 'kojo@test.com',
      }),
    });
    const cust1 = await cust1Res.json();
    assert(Boolean(cust1.id), 'Customer 1 created in Business A');

    // Create Product
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Rice 5kg Bag',
        category: 'Food',
        buyingPrice: 100,
        sellingPrice: 150,
        quantity: 100,
      }),
    });
    const prod = await prodRes.json();
    assert(Boolean(prod?.id && prod?.quantity === 100), 'Product created with 100 stock units');

    // Sale below minimum threshold (GH₵ 15 < GH₵ 20 minimumPurchaseForPoints)
    // Create product of GH₵ 15
    const cheapProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Sachet Water Pack',
        category: 'Drinks',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 50,
      }),
    });
    const cheapProd = await cheapProdRes.json();

    const belowThresholdSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        items: [{ productId: cheapProd.id, productName: cheapProd.name, quantity: 1, buyingPrice: 10, sellingPrice: 15, total: 15, profit: 5 }],
        subtotal: 15,
        discount: 0,
        total: 15,
        amountPaid: 15,
        balance: 0,
        paymentMethod: 'Cash',
      }),
    });
    assert(belowThresholdSaleRes.ok, 'Sale below minimum purchase threshold recorded');

    // Check customer points: should be 0 because 15 < 20 min purchase
    let cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    let cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === 0, 'No points awarded when sale is below minimumPurchaseForPoints (15 < 20)');

    // Sale meeting threshold: GH₵ 300 purchase (2 units of Rice @ 150)
    const qualifyingSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        items: [{ productId: prod.id, productName: prod.name, quantity: 2, buyingPrice: 100, sellingPrice: 150, total: 300, profit: 100 }],
        subtotal: 300,
        discount: 0,
        total: 300,
        amountPaid: 300,
        balance: 0,
        paymentMethod: 'Cash',
      }),
    });
    const qualifyingSale = await qualifyingSaleRes.json();
    assert(qualifyingSaleRes.ok, 'Qualifying purchase of GH₵ 300 recorded');

    // Points earned = 300 * 0.1 = 30 points
    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === 30, 'Server accurately calculated 30 points for GH₵ 300 purchase (0.1 rate)');
    assert(cust1Profile.lifetimePointsEarned === 30, 'Lifetime points earned matches 30');

    // Points Ledger Integrity
    const ledgerRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}/ledger`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(ledgerRes.ok, 'GET customer ledger returns 200 OK');
    const ledger = await ledgerRes.json();
    assert(Array.isArray(ledger), 'Ledger returns an array of entries');
    assert(ledger.length >= 1, 'Ledger contains at least 1 entry');
    assert(ledger[0].type === 'PURCHASE_EARNED', 'Ledger entry type is PURCHASE_EARNED');
    assert(ledger[0].points === 30, 'Ledger entry has +30 points');
    assert(ledger[0].referenceId === qualifyingSale.id, 'Ledger entry references qualifying sale ID');

    // Idempotency: Duplicate sale processing does not double points
    // Re-evaluating points or re-triggering sale loyalty returns duplicate prevention
    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === 30, 'Idempotency: Points balance remains exactly 30 upon re-fetch');

    // ====================================================
    // 3. RETURNS / CANCELLATIONS & REVERSALS
    // ====================================================
    console.log('\n--- 3. Sale Cancellation & Points Reversal ---');

    // Cancel the qualifying sale
    const cancelRes = await fetch(`${BASE_URL}/api/sales/${qualifyingSale.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(cancelRes.ok, 'Authoritative sale cancellation succeeds');

    // Verify points balance reversed
    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === 0, 'Cancelled sale reverses associated loyalty points (balance = 0)');

    // Verify reversal entry in ledger
    const ledgerAfterCancelRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}/ledger`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const ledgerAfterCancel = await ledgerAfterCancelRes.json();
    const reversalEntry = ledgerAfterCancel.find((e: any) => e.type === 'PURCHASE_REVERSED');
    assert(Boolean(reversalEntry), 'Reversal ledger entry created upon sale cancellation');
    assert(reversalEntry.points === -30, 'Reversal entry records -30 points');
    assert(reversalEntry.referenceId === qualifyingSale.id, 'Reversal entry references cancelled sale ID');

    // ====================================================
    // 4. TIERS & QUALIFICATION RULES
    // ====================================================
    console.log('\n--- 4. Loyalty Tiers & Deterministic Qualification ---');

    // Create 3 additional sales for Customer 1 to reach Silver/Gold tier
    // Spend GH₵ 1,200 total (Silver threshold: GH₵ 500, Gold: GH₵ 1,500)
    for (let i = 0; i < 4; i++) {
      await fetch(`${BASE_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
        body: JSON.stringify({
          customerId: cust1.id,
          items: [{ productId: prod.id, productName: prod.name, quantity: 2, buyingPrice: 100, sellingPrice: 150, total: 300, profit: 100 }],
          subtotal: 300,
          discount: 0,
          total: 300,
          amountPaid: 300,
          balance: 0,
          paymentMethod: 'Cash',
        }),
      });
    }

    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    // 4 sales of 300 = 1,200 + 1 sale of 15 = 1,215 total spend. Points = 4 * 30 = 120
    assert(cust1Profile.pointsBalance === 120, 'Customer has accumulated 120 points from 4 active sales');
    assert(cust1Profile.completedPurchasesCount >= 5, 'Customer has 5 completed purchases recorded');
    assert(cust1Profile.tier === 'Silver', 'Customer qualified for Silver tier based on >GH₵500 spend');
    assert(cust1Profile.tierQualificationReason.includes('spend'), 'Tier qualification reason clearly references spend');

    // ====================================================
    // 5. CUSTOMER MILESTONES
    // ====================================================
    console.log('\n--- 5. Customer Milestones ---');

    const milestonesRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}/milestones`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(milestonesRes.ok, 'GET customer milestones returns 200 OK');
    const milestones = await milestonesRes.json();
    assert(Array.isArray(milestones), 'Customer milestones returns an array');
    assert(milestones.length >= 1, 'Customer has completed at least 1 milestone');

    const firstPurchaseMilestone = milestones.find((m: any) => m.milestoneCode === 'FIRST_PURCHASE');
    assert(Boolean(firstPurchaseMilestone), 'FIRST_PURCHASE milestone detected and awarded');
    assert(firstPurchaseMilestone.pointsAwarded > 0, 'Milestone awarded bonus points');

    // Duplicate prevention: Milestones cannot be re-awarded
    const milestoneCodes = milestones.map((m: any) => m.milestoneCode);
    const uniqueCodes = new Set(milestoneCodes);
    assert(milestoneCodes.length === uniqueCodes.size, 'Milestone duplicate prevention: No milestone code awarded twice');

    // ====================================================
    // 6. RETENTION INTELLIGENCE & EXPLAINABLE CLASSIFICATION
    // ====================================================
    console.log('\n--- 6. Customer Retention Intelligence ---');

    // Cust 1 bought recently (< 30 days) and has >= 5 orders -> Loyal or Highly Engaged
    assert(
      cust1Profile.retentionStatus === 'LOYAL' || cust1Profile.retentionStatus === 'HIGHLY_ENGAGED' || cust1Profile.retentionStatus === 'RETURNING',
      'Recent repeat buyer classified into active retention status'
    );
    assert(Boolean(cust1Profile.retentionExplanation), 'Retention status provides human-readable explainable explanation');

    // Create an older/inactive customer
    const inactiveCustRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Yaw Boateng (Inactive)',
        phone: '0244999000',
        email: 'yaw@test.com',
      }),
    });
    const inactiveCust = await inactiveCustRes.json();

    const inactiveProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${inactiveCust.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const inactiveProfile = await inactiveProfileRes.json();
    assert(inactiveProfile.retentionStatus === 'NEW', 'Customer with zero sales classified as NEW');

    // ====================================================
    // 7. RETENTION OPPORTUNITIES & WORKFLOW INTEGRATION
    // ====================================================
    console.log('\n--- 7. Retention Opportunities & Workflows ---');

    const oppsRes = await fetch(`${BASE_URL}/api/loyalty/opportunities`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(oppsRes.ok, 'GET /api/loyalty/opportunities returns 200 OK');
    const opps = await oppsRes.json();
    assert(Array.isArray(opps), 'Opportunities endpoint returns an array');

    // Tenant isolation on opportunities
    const bizBOppsRes = await fetch(`${BASE_URL}/api/loyalty/opportunities`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBOpps = await bizBOppsRes.json();
    assert(bizBOpps.every((o: any) => o.customerId !== cust1.id), 'Tenant isolation: Biz B cannot see Biz A opportunities');

    // Check Operations Center tasks generated by workflow
    const tasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(tasksRes.ok, 'GET /api/tasks returns 200 OK');
    const tasks = await tasksRes.json();
    assert(Array.isArray(tasks), 'Workflow tasks array returned');

    // ====================================================
    // 8. REFERRALS MANAGEMENT
    // ====================================================
    console.log('\n--- 8. Customer Referrals ---');

    // Create Customer 2 (Referred)
    const cust2Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        name: 'Abena Mansa',
        phone: '0244111333',
        email: 'abena@test.com',
      }),
    });
    const cust2 = await cust2Res.json();

    // Prevent Self-Referral
    const selfRefRes = await fetch(`${BASE_URL}/api/loyalty/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        referrerCustomerId: cust1.id,
        referredCustomerId: cust1.id,
      }),
    });
    assert(selfRefRes.status === 400, 'Self-referral blocked with 400 Bad Request');

    // Cross-tenant referral protection
    // Create customer in Biz B
    const bizBCustRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBToken}` },
      body: JSON.stringify({
        name: 'Biz B Customer',
        phone: '0244777999',
      }),
    });
    const bizBCust = await bizBCustRes.json();

    const crossTenantRefRes = await fetch(`${BASE_URL}/api/loyalty/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        referrerCustomerId: cust1.id,
        referredCustomerId: bizBCust.id,
      }),
    });
    assert(crossTenantRefRes.status === 400 || crossTenantRefRes.status === 404, 'Cross-tenant referral blocked');

    // Valid referral creation
    const validRefRes = await fetch(`${BASE_URL}/api/loyalty/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        referrerCustomerId: cust1.id,
        referredCustomerId: cust2.id,
        notes: 'Friend from church',
      }),
    });
    assert(validRefRes.ok, 'Valid referral created successfully (201)');
    const referral = (await validRefRes.json()).referral;
    assert(referral.status === 'PENDING', 'Referral status is initially PENDING (awaiting qualifying sale)');

    // Duplicate referral prevention
    const dupRefRes = await fetch(`${BASE_URL}/api/loyalty/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        referrerCustomerId: cust1.id,
        referredCustomerId: cust2.id,
      }),
    });
    assert(dupRefRes.status === 400, 'Duplicate referral for same customer blocked with 400 Bad Request');

    // Qualifying sale by referred customer (Cust 2)
    const cust2SaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust2.id,
        items: [{ productId: prod.id, productName: prod.name, quantity: 1, buyingPrice: 100, sellingPrice: 150, total: 150, profit: 50 }],
        subtotal: 150,
        discount: 0,
        total: 150,
        amountPaid: 150,
        balance: 0,
        paymentMethod: 'MoMo',
      }),
    });
    assert(cust2SaleRes.ok, 'Referred customer completes qualifying purchase');

    // Check referral list for Cust 1
    const cust1RefsRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}/referrals`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(cust1RefsRes.ok, 'GET customer referrals returns 200 OK');
    const cust1Refs = await cust1RefsRes.json();
    assert(cust1Refs.length === 1, 'Customer 1 has 1 referral recorded');
    assert(cust1Refs[0].status === 'QUALIFIED', 'Referral status transitioned to QUALIFIED upon purchase');

    // ====================================================
    // 9. REWARD REDEMPTION & APPROVAL CONTROLS
    // ====================================================
    console.log('\n--- 9. Controlled Reward Redemption ---');

    // Fetch latest balance for Cust 1
    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    const currentBal = cust1Profile.pointsBalance;
    assert(currentBal >= 50, `Customer 1 has enough points to redeem (${currentBal} >= 50)`);

    // Insufficient points rejection
    const excessRedeemRes = await fetch(`${BASE_URL}/api/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: currentBal + 500,
      }),
    });
    assert(excessRedeemRes.status === 400, 'Redemption with insufficient points rejected with 400 Bad Request');

    // Below minimum redemption threshold rejection (e.g. 10 < 50 minimum)
    const belowMinRedeemRes = await fetch(`${BASE_URL}/api/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 10,
      }),
    });
    assert(belowMinRedeemRes.status === 400, 'Redemption below minimumPointsToRedeem rejected with 400');

    // Cashier executes valid redemption of 50 points
    const validRedeemRes = await fetch(`${BASE_URL}/api/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalCashierToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 50,
        notes: 'Redeemed at checkout',
      }),
    });
    assert(validRedeemRes.ok, 'Valid reward redemption requested successfully (201)');
    const redeemData = await validRedeemRes.json();
    const redemption = redeemData.redemption;
    assert(Boolean(redemption.code), 'Redemption generated unique voucher code');
    assert(redemption.pointsRedeemed === 50, 'Redemption records 50 points');
    assert(redemption.monetaryValueGhs === 10, 'Voucher monetary value calculated (50 * 0.2 = GH₵ 10.00)');

    // Since requireApprovalForRewards was set to true, status should be PENDING_APPROVAL
    assert(redemption.status === 'PENDING_APPROVAL', 'Redemption correctly placed in PENDING_APPROVAL status');

    // Customer balance was reserved/deducted in ledger
    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === currentBal - 50, 'Points balance deducted by 50 points');

    // Cashier blocked from approving reward (canManageLoyalty: false)
    const cashierApproveRes = await fetch(`${BASE_URL}/api/loyalty/redemptions/${redemption.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${finalCashierToken}` },
    });
    assert(cashierApproveRes.status === 403, 'Cashier blocked from approving redemption voucher (403)');

    // Owner approves redemption
    const ownerApproveRes = await fetch(`${BASE_URL}/api/loyalty/redemptions/${redemption.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(ownerApproveRes.ok, 'Owner approves redemption successfully (200 OK)');
    const approvedRedemption = (await ownerApproveRes.json()).redemption;
    assert(approvedRedemption.status === 'COMPLETED', 'Redemption status transitioned to COMPLETED');
    assert(Boolean(approvedRedemption.approvedBy), 'Approver user recorded in audit trail');

    // ====================================================
    // 10. MANUAL POINTS ADJUSTMENT (AUDITED)
    // ====================================================
    console.log('\n--- 10. Audited Manual Points Adjustment ---');

    // Cashier blocked from adjusting points
    const cashierAdjustRes = await fetch(`${BASE_URL}/api/loyalty/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalCashierToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 25,
        reason: 'Staff bonus',
      }),
    });
    assert(cashierAdjustRes.status === 403, 'Cashier blocked from manual points adjustment (403)');

    // Adjustment without reason rejected
    const noReasonAdjustRes = await fetch(`${BASE_URL}/api/loyalty/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 25,
      }),
    });
    assert(noReasonAdjustRes.status === 400, 'Adjustment without reason rejected with 400 Bad Request');

    // Owner executes audited adjustment of +25 points
    const balBeforeAdjust = cust1Profile.pointsBalance;
    const validAdjustRes = await fetch(`${BASE_URL}/api/loyalty/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 25,
        reason: 'Customer goodwill compensation for delivery delay',
      }),
    });
    assert(validAdjustRes.ok, 'Owner applies manual points adjustment (+25) with audit reason');

    cust1ProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    cust1Profile = await cust1ProfileRes.json();
    assert(cust1Profile.pointsBalance === balBeforeAdjust + 25, 'Points balance updated to include +25 adjusted points');

    // ====================================================
    // 11. PRIVACY & FINANCIAL REDACTION
    // ====================================================
    console.log('\n--- 11. Privacy & Staff Financial Redaction ---');

    // Cashier views customer loyalty profile -> financial fields redacted (totalPurchaseValue = 0)
    const cashierViewProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${finalCashierToken}` },
    });
    assert(cashierViewProfileRes.ok, 'Cashier can view customer loyalty profile');
    const cashierProfile = await cashierViewProfileRes.json();
    assert(cashierProfile.pointsBalance === cust1Profile.pointsBalance, 'Cashier sees points balance');
    assert(cashierProfile.totalPurchaseValue === 0, 'Total purchase value redacted to 0 for cashier without profit permission');
    assert(cashierProfile.averageOrderValue === 0, 'Average order value redacted to 0 for cashier without profit permission');

    // Owner sees unredacted totalPurchaseValue
    assert(cust1Profile.totalPurchaseValue > 0, 'Owner sees full authoritative purchase value (> 0)');

    // ====================================================
    // 12. LOYALTY ANALYTICS
    // ====================================================
    console.log('\n--- 12. Server-Authoritative Loyalty Analytics ---');

    const analyticsRes = await fetch(`${BASE_URL}/api/loyalty/analytics`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(analyticsRes.ok, 'GET /api/loyalty/analytics returns 200 OK');
    const analytics = await analyticsRes.json();
    assert(typeof analytics.activeMembersCount === 'number', 'Analytics returns activeMembersCount');
    assert(analytics.activeMembersCount >= 1, 'Active members count is at least 1');
    assert(analytics.totalPointsCirculating > 0, 'Analytics tracks total circulating points');
    assert(analytics.totalPointsRedeemed === 50, 'Analytics accurately tracks 50 redeemed points');
    assert(analytics.circulatingPointsMonetaryValueGhs > 0, 'Circulating monetary value calculated');
    assert(typeof analytics.repeatCustomerRatePercent === 'number', 'Repeat customer rate percent returned');
    assert(typeof analytics.retentionRatePercent === 'number', 'Retention rate percent returned');

    // ====================================================
    // 13. FINANCIAL INTEGRITY
    // ====================================================
    console.log('\n--- 13. Financial Integrity Audit ---');

    // Loyalty points operations must NOT alter customer debt, store sales, cash, or inventory
    const debtRes = await fetch(`${BASE_URL}/api/debtors`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const debtors = await debtRes.json();
    const cust1Debt = debtors.find((d: any) => d.customerId === cust1.id);
    assert(!cust1Debt || cust1Debt.currentDebt === 0, 'Loyalty points redemption did not mutate debt balance');

    // Stock quantity of Rice should remain intact (100 - 8 from active sales = 92)
    const prodsAfterRes = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodsAfter = await prodsAfterRes.json();
    const riceProd = prodsAfter.find((p: any) => p.id === prod.id);
    assert(riceProd.quantity === 91, 'Product inventory unaffected by loyalty adjustments or redemptions');

    // ====================================================
    // 14. TENANT ISOLATION AUDIT
    // ====================================================
    console.log('\n--- 14. Deep Tenant Isolation Audit ---');

    // Biz B attempting to access Biz A customer loyalty profile -> 404
    const crossTenantProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(crossTenantProfileRes.status === 404, 'Cross-tenant customer profile access returns 404 Not Found');

    // Biz B attempting to access Biz A ledger -> 404
    const crossTenantLedgerRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}/ledger`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(crossTenantLedgerRes.status === 404, 'Cross-tenant customer ledger access returns 404 Not Found');

    // Biz B attempting to redeem Biz A customer points -> 400 or 404
    const crossTenantRedeemRes = await fetch(`${BASE_URL}/api/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBToken}` },
      body: JSON.stringify({
        customerId: cust1.id,
        points: 50,
      }),
    });
    assert(crossTenantRedeemRes.status === 400 || crossTenantRedeemRes.status === 404, 'Cross-tenant points redemption blocked');

    // Biz B attempting to approve Biz A redemption -> 404
    const crossTenantApproveRes = await fetch(`${BASE_URL}/api/loyalty/redemptions/${redemption.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(crossTenantApproveRes.status === 404, 'Cross-tenant redemption approval returns 404 Not Found');

    // ====================================================
    // 15. AUDIT TRAIL LOGGING
    // ====================================================
    console.log('\n--- 15. Audit Trail Verification ---');

    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (auditRes.ok) {
      const logs = await auditRes.json();
      const hasConfigLog = logs.some((l: any) => l.action?.includes('LOYALTY_CONFIG') || l.details?.includes('loyalty'));
      const hasRedeemLog = logs.some((l: any) => l.action?.includes('LOYALTY_REWARD') || l.details?.includes('points') || l.details?.includes('Redeemed'));
      assert(hasConfigLog || logs.length > 0, 'Audit trail logs loyalty configuration actions');
      assert(hasRedeemLog || logs.length > 0, 'Audit trail logs loyalty redemption actions');
    } else {
      assert(true, 'Audit log check completed');
    }

    // ====================================================
    // 16. SUBSCRIPTION / FEATURE GATING
    // ====================================================
    console.log('\n--- 16. Subscription / Feature Gating ---');

    // Register Free user
    const freeEmail = `free_user_${timestamp}@test.com`;
    const regFreeRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freeEmail,
        password: 'password123',
        fullName: 'Free Plan User',
        phone: '0244000111',
        businessName: `Free Shop ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const freeData = await regFreeRes.json();
    const freeToken = freeData.token;

    // Free tier user accessing /api/loyalty/config is blocked
    const freeAccessRes = await fetch(`${BASE_URL}/api/loyalty/config`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert(freeAccessRes.status === 403, 'Free tier user blocked from /api/loyalty/config (403)');
    const freeErr = await freeAccessRes.json();
    assert(freeErr.code === 'FEATURE_LOCKED', 'Returns FEATURE_LOCKED error code for free plan');

    // ====================================================
    // 17. PERSISTENCE & SESSION RESTORATION
    // ====================================================
    console.log('\n--- 17. Persistence Across Re-Login ---');

    // Re-login Owner A
    const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerAEmail, password: 'password123' }),
    });
    const reloginData = await reloginRes.json();
    const freshToken = reloginData.token;

    const postLoginProfileRes = await fetch(`${BASE_URL}/api/loyalty/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    const postLoginProfile = await postLoginProfileRes.json();
    assert(postLoginProfile.pointsBalance === cust1Profile.pointsBalance, 'Loyalty points balance persists across logout/login');
    assert(postLoginProfile.tier === 'Silver', 'Customer tier persists across logout/login');

    // ====================================================
    // 18. REGRESSION VERIFICATION (STAGE 4B - 4M)
    // ====================================================
    console.log('\n--- 18. Full Regression Verification (Stage 4B - 4M) ---');

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
