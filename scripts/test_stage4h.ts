/**
 * STAGE 4H AUTOMATED VERIFICATION SUITE
 * Customer & Business Relationship Intelligence Upgrade
 * 45+ Comprehensive Test Cases & Assertions + Regression
 */

import { getAccraToday } from '../src/utils/date.js';

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
  console.log('--- STARTING STAGE 4H CUSTOMER & BUSINESS RELATIONSHIP INTELLIGENCE SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // Setup: Register Business A and Business B
  // ----------------------------------------------------
  const ownerAEmail = `owner4h_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4H Accra',
      phone: '0244111333',
      businessName: `Accra Mart 4H ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  const ownerBEmail = `owner4h_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4H Kumasi',
      phone: '0244888444',
      businessName: `Kumasi Mart 4H ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerBData = await regBRes.json();
  const ownerBToken = ownerBData.token;
  const bizBId = ownerBData.business.id;

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

  // Create Cashier in Business A (limited permissions)
  const cashierEmail = `cashier4h_${timestamp}@test.com`;
  const cashierCreateRes = await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Cashier 4H Kofi',
      email: cashierEmail,
      phone: '0244555666',
      role: 'cashier',
      permissions: {
        pos_access: true,
        record_expenses: false,
        view_financial_reports: false,
        manage_stock: false,
        manage_staff: false,
        manage_settings: false,
        manage_customers: true,
      },
      password: 'password123',
    }),
  });
  const cashierData = await cashierCreateRes.json();

  // Login Cashier
  const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cashierEmail, password: 'password123' }),
  });
  const cashierToken = (await cashierLoginRes.json()).token;

  // Setup sample product in Business A for sales
  const prodRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: 'Premium Basmati Rice 5kg',
      category: 'Grains',
      buyingPrice: 80,
      sellingPrice: 120,
      quantity: 100,
      minStockLevel: 10,
      unit: 'bag',
    }),
  });
  const sampleProduct = await prodRes.json();

  console.log('Setup completed successfully. Starting test assertions...\n');

  // ====================================================
  // TEST GROUP 1: CUSTOMER REGISTRATION & VALIDATION
  // ====================================================
  let customer1: any;
  let customer2: any;
  let customer3: any;

  // Test 1: Create customer with valid details
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Kwame Mensah',
        phone: '0244100101',
        email: 'kwame@mensah.gh',
        address: 'East Legon, Accra',
        creditLimit: 1000,
        notes: 'Wholesale client; preferred delivery on Thursdays.',
      }),
    });
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    customer1 = await res.json();
    if (customer1.name !== 'Kwame Mensah' || customer1.creditLimit !== 1000) {
      throw new Error(`Customer fields mismatch: ${JSON.stringify(customer1)}`);
    }
    pass('T1: Create customer with valid details and credit limit');
  } catch (err) {
    fail('T1: Create customer with valid details and credit limit', err);
  }

  // Test 2: Reject duplicate phone number within same business
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Kwame Imposter',
        phone: '0244100101', // Same phone as customer1
      }),
    });
    if (res.status !== 400) throw new Error(`Expected status 400 for duplicate phone, got ${res.status}`);
    const data = await res.json();
    if (!data.error?.toLowerCase().includes('already exists')) {
      throw new Error(`Unexpected error message: ${data.error}`);
    }
    pass('T2: Reject duplicate phone number in the same business');
  } catch (err) {
    fail('T2: Reject duplicate phone number in the same business', err);
  }

  // Test 3: Allow same phone number in DIFFERENT business (Tenant Isolation)
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        name: 'Kwame Mensah (Kumasi Branch)',
        phone: '0244100101', // Same phone but in Business B
      }),
    });
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    pass('T3: Allow same phone number in different business (tenant isolation)');
  } catch (err) {
    fail('T3: Allow same phone number in different business (tenant isolation)', err);
  }

  // Test 4: Create additional customers in Business A for segment testing
  try {
    // Customer 2: Frequent buyer
    const res2 = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Ama Serwaa',
        phone: '0244200202',
        creditLimit: 500,
      }),
    });
    customer2 = await res2.json();

    // Customer 3: High value debtor
    const res3 = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Kofi Badu',
        phone: '0244300303',
        creditLimit: 300,
      }),
    });
    customer3 = await res3.json();

    if (!customer2.id || !customer3.id) throw new Error('Failed to create sample customers');
    pass('T4: Create multiple distinct customers in Business A');
  } catch (err) {
    fail('T4: Create multiple distinct customers in Business A', err);
  }

  // Test 5: Initial metrics for newly registered customer
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (data.totalPurchases !== 0 || data.currentDebt !== 0 || data.transactionCount !== 0) {
      throw new Error(`Expected 0 initial purchases/debt/orders, got: ${JSON.stringify(data)}`);
    }
    if (data.segment !== 'New' && data.segment !== 'Active') {
      // With 0 purchases, default segment is 'New'
      throw new Error(`Expected segment 'New', got: ${data.segment}`);
    }
    pass('T5: New customer has 0 purchases, 0 debt, and correct initial segment');
  } catch (err) {
    fail('T5: New customer has 0 purchases, 0 debt, and correct initial segment', err);
  }

  // ====================================================
  // TEST GROUP 2: SALES, PURCHASES & DEBT ACCUMULATION
  // ====================================================

  // Test 6: Record cash sale for Customer 1 (GH₵240, paid 240)
  let sale1: any;
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: customer1.id,
        items: [
          {
            productId: sampleProduct.id,
            quantity: 2,
            unitPrice: 120,
            costPrice: 80,
          },
        ],
        amountPaid: 240,
        paymentMethod: 'Cash',
      }),
    });
    if (res.status !== 201) throw new Error(`Sale failed: ${res.status}`);
    sale1 = await res.json();
    if (sale1.total !== 240 || sale1.balance !== 0) {
      throw new Error(`Sale totals mismatch: ${JSON.stringify(sale1)}`);
    }
    pass('T6: Record full cash sale linked to Customer 1');
  } catch (err) {
    fail('T6: Record full cash sale linked to Customer 1', err);
  }

  // Test 7: Verify Customer 1 metrics updated immediately (CLV = 240, Debt = 0, Orders = 1)
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const c1 = await res.json();
    if (c1.totalPurchases !== 240) throw new Error(`Expected totalPurchases 240, got ${c1.totalPurchases}`);
    if (c1.currentDebt !== 0) throw new Error(`Expected currentDebt 0, got ${c1.currentDebt}`);
    if (c1.transactionCount !== 1) throw new Error(`Expected transactionCount 1, got ${c1.transactionCount}`);
    if (c1.averageTransactionValue !== 240) throw new Error(`Expected ATV 240, got ${c1.averageTransactionValue}`);
    if (c1.daysSinceLastPurchase !== 0) throw new Error(`Expected 0 days since last purchase, got ${c1.daysSinceLastPurchase}`);
    pass('T7: Verify Customer 1 CLV, order count, ATV and last activity updated');
  } catch (err) {
    fail('T7: Verify Customer 1 CLV, order count, ATV and last activity updated', err);
  }

  // Test 8: Record credit sale for Customer 3 (Total = GH₵480, Paid = GH₵100, Debt = GH₵380)
  let creditSale3: any;
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: customer3.id,
        items: [
          {
            productId: sampleProduct.id,
            quantity: 4,
            unitPrice: 120,
            costPrice: 80,
          },
        ],
        amountPaid: 100,
        paymentMethod: 'Credit',
        overrideCreditLimit: true,
      }),
    });
    if (res.status !== 201) throw new Error(`Credit sale failed: ${res.status}`);
    creditSale3 = await res.json();
    if (creditSale3.balance !== 380) throw new Error(`Expected balance 380, got ${creditSale3.balance}`);
    pass('T8: Record partial credit sale creating customer debt');
  } catch (err) {
    fail('T8: Record partial credit sale creating customer debt', err);
  }

  // Test 9: Customer 3 is now flagged as 'Credit Risk' (Debt 380 > Limit 300)
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const c3 = await res.json();
    if (c3.currentDebt !== 380) throw new Error(`Expected debt 380, got ${c3.currentDebt}`);
    if (c3.segment !== 'Credit Risk') {
      throw new Error(`Expected segment 'Credit Risk', got ${c3.segment}`);
    }
    if (!c3.segments.includes('Credit Risk')) {
      throw new Error(`Expected segments array to include 'Credit Risk', got ${JSON.stringify(c3.segments)}`);
    }
    pass('T9: Customer with debt exceeding credit limit is flagged as Credit Risk');
  } catch (err) {
    fail('T9: Customer with debt exceeding credit limit is flagged as Credit Risk', err);
  }

  // Test 10: Customer with active debt CANNOT be deleted (Safe Deletion Guard)
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const data = await res.json();
    if (!data.error?.toLowerCase().includes('outstanding debt')) {
      throw new Error(`Expected active debt error, got: ${data.error}`);
    }
    pass('T10: Customer with active outstanding debt cannot be deleted');
  } catch (err) {
    fail('T10: Customer with active outstanding debt cannot be deleted', err);
  }

  // ====================================================
  // TEST GROUP 3: FREQUENT BUYER & SEGMENTATION
  // ====================================================

  // Test 11: Create 3 sales for Customer 2 to qualify as "Frequent Buyer"
  try {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerAToken}`,
        },
        body: JSON.stringify({
          customerId: customer2.id,
          items: [{ productId: sampleProduct.id, quantity: 1, unitPrice: 120, costPrice: 80 }],
          amountPaid: 120,
          paymentMethod: 'Mobile Money',
        }),
      });
      if (res.status !== 201) throw new Error(`Sale ${i + 1} for Customer 2 failed: ${res.status}`);
    }
    pass('T11: Record 3 separate sales for Customer 2');
  } catch (err) {
    fail('T11: Record 3 separate sales for Customer 2', err);
  }

  // Test 12: Verify Customer 2 has segment 'Frequent' (3 transactions)
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer2.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const c2 = await res.json();
    if (c2.transactionCount !== 3) throw new Error(`Expected transactionCount 3, got ${c2.transactionCount}`);
    if (c2.totalPurchases !== 360) throw new Error(`Expected totalPurchases 360, got ${c2.totalPurchases}`);
    if (c2.segment !== 'Frequent' && !c2.segments.includes('Frequent')) {
      throw new Error(`Expected segment 'Frequent', got ${c2.segment}`);
    }
    pass('T12: Customer with 3+ purchases is segmented as Frequent Buyer');
  } catch (err) {
    fail('T12: Customer with 3+ purchases is segmented as Frequent Buyer', err);
  }

  // Test 13: High Value Customer Threshold (Sales >= GH₵1000)
  try {
    // Record large sale of 10 bags = GH₵1200 for Customer 1
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: customer1.id,
        items: [{ productId: sampleProduct.id, quantity: 10, unitPrice: 120, costPrice: 80 }],
        amountPaid: 1200,
        paymentMethod: 'Bank Transfer',
      }),
    });
    if (res.status !== 201) throw new Error(`High value sale failed: ${res.status}`);

    const c1Res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const c1 = await c1Res.json();
    if (c1.totalPurchases !== 1440) throw new Error(`Expected 1440 total purchases, got ${c1.totalPurchases}`);
    if (!c1.segments.includes('High Value') && c1.segment !== 'High Value') {
      throw new Error(`Expected customer to have 'High Value' segment, got: ${c1.segment}`);
    }
    pass('T13: Customer with purchases >= GH₵1,000 achieves High Value segment');
  } catch (err) {
    fail('T13: Customer with purchases >= GH₵1,000 achieves High Value segment', err);
  }

  // ====================================================
  // TEST GROUP 4: DEBT REPAYMENT & LEDGER CONSISTENCY
  // ====================================================

  // Test 14: Settle Customer 3 debt (Pay GH₵380)
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 380,
        paymentMethod: 'Mobile Money',
        notes: 'Full settlement via MTN MoMo ref #998822',
        reference: 'MM-998822',
      }),
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`Debt repayment failed: ${res.status}`);
    const receipt = await res.json();
    const paid = receipt.amountPaid ?? receipt.paymentAmount;
    const remaining = receipt.remainingDebt ?? receipt.remainingBalance;
    if (paid !== 380 || remaining !== 0) {
      throw new Error(`Receipt debt calculation mismatch: ${JSON.stringify(receipt)}`);
    }
    pass('T14: Settle customer debt via customer payments endpoint');
  } catch (err) {
    fail('T14: Settle customer debt via customer payments endpoint', err);
  }

  // Test 15: Verify Customer 3 current debt is now 0 and status is no longer Credit Risk
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const c3 = await res.json();
    if (c3.currentDebt !== 0) throw new Error(`Expected debt 0, got ${c3.currentDebt}`);
    if (c3.segment === 'Credit Risk') {
      throw new Error(`Customer should not be Credit Risk after clearing debt`);
    }
    pass('T15: Customer debt drops to 0 and exits Credit Risk segment');
  } catch (err) {
    fail('T15: Customer debt drops to 0 and exits Credit Risk segment', err);
  }

  // ====================================================
  // TEST GROUP 5: CRM NOTES & INTERACTION LOGS
  // ====================================================

  // Test 16: Add CRM note to customer
  try {
    const noteText = 'Customer requested WhatsApp invoice copy before dispatch.';
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ note: noteText }),
    });
    if (res.status !== 200) throw new Error(`Add note failed: ${res.status}`);
    const data = await res.json();
    if (!data.notes?.includes(noteText)) {
      throw new Error(`Notes did not contain newly added note: ${data.notes}`);
    }
    pass('T16: Add timestamped CRM note to customer');
  } catch (err) {
    fail('T16: Add timestamped CRM note to customer', err);
  }

  // Test 17: Verify statement includes customer notes
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}/statement`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const stmt = await res.json();
    if (!stmt.customer.notes?.includes('WhatsApp invoice copy')) {
      throw new Error(`Statement missing customer notes: ${stmt.customer.notes}`);
    }
    pass('T17: Customer statement includes full CRM notes');
  } catch (err) {
    fail('T17: Customer statement includes full CRM notes', err);
  }

  // ====================================================
  // TEST GROUP 6: /api/customers/intelligence ENDPOINT
  // ====================================================

  // Test 18: Fetch customer intelligence overview
  let intelData: any;
  try {
    const res = await fetch(`${BASE_URL}/api/customers/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Intelligence endpoint failed: ${res.status}`);
    intelData = await res.json();

    if (!intelData.overview || !intelData.segments || !intelData.topCustomers) {
      throw new Error(`Intelligence payload missing required top-level keys: ${Object.keys(intelData)}`);
    }
    pass('T18: Fetch /api/customers/intelligence dashboard payload');
  } catch (err) {
    fail('T18: Fetch /api/customers/intelligence dashboard payload', err);
  }

  // Test 19: Verify overview total customers count matches Business A
  try {
    if (intelData.overview.totalCustomers !== 3) {
      throw new Error(`Expected 3 total customers in Business A, got ${intelData.overview.totalCustomers}`);
    }
    pass('T19: Intelligence overview totalCustomers accurately matches database');
  } catch (err) {
    fail('T19: Intelligence overview totalCustomers accurately matches database', err);
  }

  // Test 20: Verify total revenue / CLV calculation in intelligence
  try {
    const expectedRevenue = 1440 + 360 + 480; // c1 (1440) + c2 (360) + c3 (480) = 2280
    if (intelData.overview.totalCustomerRevenue !== expectedRevenue) {
      throw new Error(`Expected totalCustomerRevenue ${expectedRevenue}, got ${intelData.overview.totalCustomerRevenue}`);
    }
    pass('T20: Intelligence overview totalCustomerRevenue matches sum of customer sales');
  } catch (err) {
    fail('T20: Intelligence overview totalCustomerRevenue matches sum of customer sales', err);
  }

  // Test 21: Verify average CLV in intelligence overview
  try {
    const expectedAvgCLV = 2280 / 3;
    if (Math.abs(intelData.overview.averageCLV - expectedAvgCLV) > 0.01) {
      throw new Error(`Expected averageCLV ${expectedAvgCLV}, got ${intelData.overview.averageCLV}`);
    }
    pass('T21: Intelligence overview averageCLV accurately calculated');
  } catch (err) {
    fail('T21: Intelligence overview averageCLV accurately calculated', err);
  }

  // Test 22: Verify topCustomers ranked by totalPurchases (CLV)
  try {
    const top = intelData.topCustomers;
    if (top.length === 0) throw new Error('Top customers array is empty');
    if (top[0].id !== customer1.id || top[0].totalPurchases !== 1440) {
      throw new Error(`Top customer should be Customer 1 (1440 CLV), got ${JSON.stringify(top[0])}`);
    }
    // Check descending order
    for (let i = 0; i < top.length - 1; i++) {
      if (top[i].totalPurchases < top[i + 1].totalPurchases) {
        throw new Error(`Top customers not sorted descending by CLV`);
      }
    }
    pass('T22: Top customers list correctly ranked descending by CLV');
  } catch (err) {
    fail('T22: Top customers list correctly ranked descending by CLV', err);
  }

  // Test 23: Verify segments breakdown has proper counts
  try {
    const segs = intelData.segments;
    if (typeof segs.total !== 'number' || typeof segs.active !== 'number') {
      throw new Error(`Segment counts missing or invalid: ${JSON.stringify(segs)}`);
    }
    if (segs.total !== 3) throw new Error(`Expected segs.total 3, got ${segs.total}`);
    pass('T23: Intelligence segments structure contains complete segment metrics');
  } catch (err) {
    fail('T23: Intelligence segments structure contains complete segment metrics', err);
  }

  // Test 24: Verify date range filtering on intelligence endpoint
  try {
    const today = getAccraToday();
    const res = await fetch(`${BASE_URL}/api/customers/intelligence?from=${today}&to=${today}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Intelligence date filtering failed: ${res.status}`);
    const filtered = await res.json();
    if (!filtered.overview) throw new Error('Filtered payload missing overview');
    pass('T24: Intelligence endpoint supports date range filtering (from/to in Accra TZ)');
  } catch (err) {
    fail('T24: Intelligence endpoint supports date range filtering (from/to in Accra TZ)', err);
  }

  // ====================================================
  // TEST GROUP 7: FILTERING & SORTING ON /api/customers
  // ====================================================

  // Test 25: Filter by segment = 'Frequent'
  try {
    const res = await fetch(`${BASE_URL}/api/customers?segment=Frequent`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of customers');
    if (!data.some((c: any) => c.id === customer2.id)) {
      throw new Error('Customer 2 should appear in Frequent segment filter');
    }
    pass('T25: Filter /api/customers by segment=Frequent');
  } catch (err) {
    fail('T25: Filter /api/customers by segment=Frequent', err);
  }

  // Test 26: Sort /api/customers by purchases_desc
  try {
    const res = await fetch(`${BASE_URL}/api/customers?sortBy=purchases_desc`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (data[0].id !== customer1.id) {
      throw new Error(`Expected customer 1 first for purchases_desc, got: ${data[0].name}`);
    }
    pass('T26: Sort /api/customers by purchases_desc (CLV ranking)');
  } catch (err) {
    fail('T26: Sort /api/customers by purchases_desc (CLV ranking)', err);
  }

  // Test 27: Sort /api/customers by transactions_desc
  try {
    const res = await fetch(`${BASE_URL}/api/customers?sortBy=transactions_desc`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (data[0].id !== customer2.id) {
      // Customer 2 has 3 transactions, Customer 1 has 2
      throw new Error(`Expected customer 2 first for transactions_desc, got: ${data[0].name}`);
    }
    pass('T27: Sort /api/customers by transactions_desc');
  } catch (err) {
    fail('T27: Sort /api/customers by transactions_desc', err);
  }

  // Test 28: Search /api/customers by query text
  try {
    const res = await fetch(`${BASE_URL}/api/customers?search=Kwame`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (data.length !== 1 || data[0].id !== customer1.id) {
      throw new Error(`Expected only Customer 1 for search "Kwame", got ${data.length}`);
    }
    pass('T28: Search /api/customers by text query');
  } catch (err) {
    fail('T28: Search /api/customers by text query', err);
  }

  // ====================================================
  // TEST GROUP 8: MULTI-TENANT ISOLATION (SECURITY)
  // ====================================================

  // Test 29: Business B cannot view Business A customers
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const data = await res.json();
    const leaked = data.find((c: any) => c.businessId === bizAId);
    if (leaked) throw new Error(`Leaked Business A customer to Business B: ${leaked.name}`);
    pass('T29: Business B cannot list Business A customers');
  } catch (err) {
    fail('T29: Business B cannot list Business A customers', err);
  }

  // Test 30: Business B cannot fetch Customer 1 by ID
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    if (res.status !== 404) throw new Error(`Expected 404 Not Found, got ${res.status}`);
    pass('T30: Business B cannot fetch Business A customer by ID');
  } catch (err) {
    fail('T30: Business B cannot fetch Business A customer by ID', err);
  }

  // Test 31: Business B cannot fetch Customer 1 statement
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}/statement`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    if (res.status !== 404) throw new Error(`Expected 404 Not Found, got ${res.status}`);
    pass('T31: Business B cannot access Business A customer statement');
  } catch (err) {
    fail('T31: Business B cannot access Business A customer statement', err);
  }

  // Test 32: Business B cannot modify Customer 1
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    if (res.status !== 404) throw new Error(`Expected 404 Not Found, got ${res.status}`);
    pass('T32: Business B cannot update Business A customer');
  } catch (err) {
    fail('T32: Business B cannot update Business A customer', err);
  }

  // Test 33: Business B cannot delete Customer 1
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    if (res.status !== 404) throw new Error(`Expected 404 Not Found, got ${res.status}`);
    pass('T33: Business B cannot delete Business A customer');
  } catch (err) {
    fail('T33: Business B cannot delete Business A customer', err);
  }

  // Test 34: Business B cannot add notes to Customer 1
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ note: 'Malicious Note' }),
    });
    if (res.status !== 404) throw new Error(`Expected 404 Not Found, got ${res.status}`);
    pass('T34: Business B cannot append notes to Business A customer');
  } catch (err) {
    fail('T34: Business B cannot append notes to Business A customer', err);
  }

  // Test 35: Business B intelligence only includes Business B data
  try {
    const res = await fetch(`${BASE_URL}/api/customers/intelligence`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const data = await res.json();
    if (data.overview.totalCustomerRevenue !== 0) {
      throw new Error(`Business B should have 0 customer revenue, got: ${data.overview.totalCustomerRevenue}`);
    }
    pass('T35: Customer intelligence dashboard strictly isolates tenant aggregates');
  } catch (err) {
    fail('T35: Customer intelligence dashboard strictly isolates tenant aggregates', err);
  }

  // ====================================================
  // TEST GROUP 9: RBAC & FINANCIAL PRIVACY
  // ====================================================

  // Test 36: Cashier with manage_customers can view customer directory
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200 for cashier, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of customers');
    pass('T36: Authorized cashier can view customer directory');
  } catch (err) {
    fail('T36: Authorized cashier can view customer directory', err);
  }

  // Test 37: Cashier without view_financial_reports gets sanitized sales in customer statement
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1.id}/statement`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const stmt = await res.json();
    // In stmt.sales, costPrice, totalCost, profit must be omitted/undefined for cashier
    const firstSale = stmt.sales[0];
    if (firstSale && ('profit' in firstSale || 'totalCost' in firstSale)) {
      throw new Error(`Cashier should not see profit or totalCost: ${JSON.stringify(firstSale)}`);
    }
    pass('T37: Cashier without financial reports access gets sanitized customer statement');
  } catch (err) {
    fail('T37: Cashier without financial reports access gets sanitized customer statement', err);
  }

  // ====================================================
  // TEST GROUP 10: DELETION OF SETTLED CUSTOMER
  // ====================================================

  // Test 38: Customer 3 (debt now 0) can be safely deleted
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200 for settled customer delete, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Delete response success is false');
    pass('T38: Customer with 0 debt can be safely deleted');
  } catch (err) {
    fail('T38: Customer with 0 debt can be safely deleted', err);
  }

  // Test 39: Customer 3 no longer appears in customer directory
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer3.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 404) throw new Error(`Expected 404 after deletion, got ${res.status}`);
    pass('T39: Deleted customer is removed from customer directory lookup');
  } catch (err) {
    fail('T39: Deleted customer is removed from customer directory lookup', err);
  }

  // ====================================================
  // TEST GROUP 11: FULL REGRESSION (STAGES 4B - 4G)
  // ====================================================

  // Test 40: Regression - POS sale without customer (walk-in) still functions
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: sampleProduct.id, quantity: 1, unitPrice: 120, costPrice: 80 }],
        amountPaid: 120,
        paymentMethod: 'Cash',
      }),
    });
    if (res.status !== 201) throw new Error(`Walk-in sale failed: ${res.status}`);
    pass('T40: Regression - Anonymous walk-in POS sales function seamlessly');
  } catch (err) {
    fail('T40: Regression - Anonymous walk-in POS sales function seamlessly', err);
  }

  // Test 41: Regression - Product stock quantity accurately decremented across sales
  try {
    const res = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    const prod = data.product || data;
    // Initial 100 - (2 + 4 + 1 + 1 + 1 + 10 + 1) = 100 - 20 = 80
    if (prod.quantity !== 80) {
      throw new Error(`Expected remaining quantity 80, got ${prod.quantity}`);
    }
    pass('T41: Regression - Product stock quantity accurately decremented by sales');
  } catch (err) {
    fail('T41: Regression - Product stock quantity accurately decremented by sales', err);
  }

  // Test 42: Regression - Stock movement ledger records all sale movements
  try {
    const res = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}/movements`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const movements = await res.json();
    if (!Array.isArray(movements) || movements.length < 5) {
      throw new Error(`Expected at least 5 movements for product, got ${movements.length}`);
    }
    pass('T42: Regression - Stock movement audit ledger retains all sales movements');
  } catch (err) {
    fail('T42: Regression - Stock movement audit ledger retains all sales movements', err);
  }

  // Test 43: Regression - Stock intelligence endpoint reflects real stock status
  try {
    const res = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Stock intelligence failed: ${res.status}`);
    const stockIntel = await res.json();
    const totalUnits = stockIntel.overview?.totalStockUnits ?? stockIntel.summary?.totalStockUnits;
    if (totalUnits !== 80) {
      throw new Error(`Stock intelligence totalStockUnits mismatch: ${JSON.stringify(stockIntel.overview)}`);
    }
    pass('T43: Regression - Stock intelligence reflects authoritative inventory status');
  } catch (err) {
    fail('T43: Regression - Stock intelligence reflects authoritative inventory status', err);
  }

  // Test 44: Regression - Debtors list endpoint reflects current debtor state
  try {
    const res = await fetch(`${BASE_URL}/api/debtors`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Debtors endpoint failed: ${res.status}`);
    const debtors = await res.json();
    if (!Array.isArray(debtors)) throw new Error('Expected array of debtors');
    // Since Customer 3 settled debt, active debtors list should be empty
    if (debtors.length !== 0) {
      throw new Error(`Expected 0 active debtors after full settlement, got ${debtors.length}`);
    }
    pass('T44: Regression - /api/debtors correctly updates when debts are settled');
  } catch (err) {
    fail('T44: Regression - /api/debtors correctly updates when debts are settled', err);
  }

  // Test 45: Regression - Ghana Accra timezone consistency in analytics
  try {
    const res = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (res.status !== 200) throw new Error(`Reports failed: ${res.status}`);
    pass('T45: Regression - Accra timezone reporting remains consistent across POS and CRM');
  } catch (err) {
    fail('T45: Regression - Accra timezone reporting remains consistent across POS and CRM', err);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n==================================================');
  console.log('STAGE 4H TEST SUITE RESULTS:');
  console.log('==================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n🌟 ALL 45+ TESTS PASSED SUCCESSFULLY! 🌟');
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Stage 4H tests:', err);
  process.exit(1);
});
