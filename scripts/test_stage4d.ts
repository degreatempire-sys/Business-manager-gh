/**
 * STAGE 4D AUTOMATED VERIFICATION SUITE
 * Customer & Debt Management System
 */

import { db } from '../server/db.js';
import { getAccraToday, formatAccraDate } from '../src/utils/date.js';
import {
  formatGhanaPhone,
  generateDebtReminderWhatsAppMessage,
  generateDebtPaymentReceiptWhatsAppMessage,
} from '../src/utils/whatsapp.js';

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
  console.log('--- STARTING STAGE 4D CUSTOMER & DEBT MANAGEMENT TEST SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // Setup: Register Business A and Business B
  // ----------------------------------------------------
  const ownerAEmail = `owner4d_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4D Accra',
      phone: '0244111222',
      businessName: `Accra Stores ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  const ownerBEmail = `owner4d_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4D Kumasi',
      phone: '0244999888',
      businessName: `Kumasi Retail ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerBData = await regBRes.json();
  const ownerBToken = ownerBData.token;
  const bizBId = ownerBData.business.id;

  // Upgrade both businesses to business plan using admin API
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@businessmanagergh.com', password: 'Admin@GH2026' }),
  });
  const adminToken = (await adminLoginRes.json()).token;

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

  // Create Staff in Biz A with no customers permission
  const staffNoCustEmail = `staff_nocust_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff No Customers',
      email: staffNoCustEmail,
      phone: '0244333555',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        customers: false,
        debtors: false,
      },
    }),
  });
  const loginNoCustRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffNoCustEmail, password: 'password123' }),
  });
  const staffNoCustToken = (await loginNoCustRes.json()).token;

  // Setup Product for Biz A
  const prodRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: `Test Rice Bag ${timestamp}`,
      sku: `RICE-${timestamp}`,
      buyingPrice: 80,
      sellingPrice: 100,
      quantity: 50,
      minStockLevel: 5,
      category: 'General',
    }),
  });
  const prodA = await prodRes.json();

  let customer1Id = '';
  let customer2Id = '';
  let sale1Id = '';
  let sale2Id = '';
  let sale3Id = '';

  // ----------------------------------------------------
  // Test 1: Customer Creation & Initial Balance Validation
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: `Kofi Mensah ${timestamp}`,
        phone: '0244123456',
        email: 'kofi@example.com',
        address: 'Osu, Accra',
        creditLimit: 500,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.id && data.currentDebt === 0) {
      customer1Id = data.id;
      pass('Test 1: Customer Creation & Initial Balance Validation');
    } else {
      fail('Test 1: Customer Creation & Initial Balance Validation', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 1: Customer Creation & Initial Balance Validation', err);
  }

  // ----------------------------------------------------
  // Test 2: Customer Search and Filtering
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/customers?search=Kofi`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const list = await res.json();
    if (res.status === 200 && Array.isArray(list) && list.some((c: any) => c.id === customer1Id)) {
      pass('Test 2: Customer Search and Filtering');
    } else {
      fail('Test 2: Customer Search and Filtering', `Expected customer in search results, got: ${JSON.stringify(list)}`);
    }
  } catch (err) {
    fail('Test 2: Customer Search and Filtering', err);
  }

  // ----------------------------------------------------
  // Test 3: Customer Detail / Profile Statement
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (
      res.status === 200 &&
      data.customer &&
      data.customer.id === customer1Id &&
      data.customer.availableCredit === 500 &&
      data.currentDebt === 0 &&
      Array.isArray(data.sales)
    ) {
      pass('Test 3: Customer Detail / Profile Statement');
    } else {
      fail('Test 3: Customer Detail / Profile Statement', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 3: Customer Detail / Profile Statement', err);
  }

  // ----------------------------------------------------
  // Test 4: Credit Sale Creation with Customer Linking
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prodA.id, quantity: 2 }],
        paymentMethod: 'Credit',
        amountPaid: 50, // Total is 200, paid 50, balance 150
        customerId: customer1Id,
        customerName: `Kofi Mensah ${timestamp}`,
        dueDate: '2026-03-25',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.total === 200 && data.balance === 150 && data.paymentStatus === 'Partial') {
      sale1Id = data.id;

      // Verify customer currentDebt updated
      const custRes = await fetch(`${BASE_URL}/api/customers/${customer1Id}`, {
        headers: { Authorization: `Bearer ${ownerAToken}` },
      });
      const custData = await custRes.json();
      if (custData.currentDebt === 150 && custData.customer.availableCredit === 350) {
        pass('Test 4: Credit Sale Creation with Customer Linking');
      } else {
        fail('Test 4: Credit Sale Creation with Customer Linking', `Unexpected customer debt: ${custData.currentDebt}`);
      }
    } else {
      fail('Test 4: Credit Sale Creation with Customer Linking', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 4: Credit Sale Creation with Customer Linking', err);
  }

  // ----------------------------------------------------
  // Test 5: Credit Limit Enforcement
  // ----------------------------------------------------
  try {
    // Current debt is 150, limit is 500, remaining credit is 350.
    // Try to buy 4 bags = 400 with 0 paid (debt would become 150 + 400 = 550 > 500 limit).
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prodA.id, quantity: 4 }],
        paymentMethod: 'Credit',
        amountPaid: 0,
        customerId: customer1Id,
      }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('credit limit')) {
      pass('Test 5: Credit Limit Enforcement');
    } else {
      fail('Test 5: Credit Limit Enforcement', `Expected 400 with credit limit error, got ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    fail('Test 5: Credit Limit Enforcement', err);
  }

  // ----------------------------------------------------
  // Test 6: Debtor Ledger Verification
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/debtors`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const list = await res.json();
    const debtor = list.find((d: any) => d.customerId === customer1Id);
    if (res.status === 200 && debtor && debtor.amountOwed === 150 && debtor.status) {
      pass('Test 6: Debtor Ledger Verification');
    } else {
      fail('Test 6: Debtor Ledger Verification', JSON.stringify(list));
    }
  } catch (err) {
    fail('Test 6: Debtor Ledger Verification', err);
  }

  // ----------------------------------------------------
  // Test 7: Debtor Profile Detail
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/debtors/${customer1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (
      res.status === 200 &&
      data.customer &&
      data.debtor &&
      data.debtor.amountOwed === 150 &&
      Array.isArray(data.creditSales) &&
      data.creditSales.length >= 1
    ) {
      pass('Test 7: Debtor Profile Detail');
    } else {
      fail('Test 7: Debtor Profile Detail', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 7: Debtor Profile Detail', err);
  }

  // ----------------------------------------------------
  // Test 8: Direct Debt Payment via POST /api/customers/:id/payment
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer1Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 50,
        paymentMethod: 'Mobile Money',
        notes: 'Part settlement via MTN MoMo',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.payment && data.receipt) {
      if (data.receipt.originalDebt === 150 && data.receipt.paymentAmount === 50 && data.receipt.remainingBalance === 100) {
        pass('Test 8: Direct Debt Payment via POST /api/customers/:id/payment');
      } else {
        fail('Test 8: Direct Debt Payment via POST /api/customers/:id/payment', `Unexpected receipt balance: ${JSON.stringify(data.receipt)}`);
      }
    } else {
      fail('Test 8: Direct Debt Payment via POST /api/customers/:id/payment', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 8: Direct Debt Payment via POST /api/customers/:id/payment', err);
  }

  // ----------------------------------------------------
  // Test 9: Debt Repayment Receipt Generation
  // ----------------------------------------------------
  try {
    const custRes = await fetch(`${BASE_URL}/api/customers/${customer1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custData = await custRes.json();
    const payments = custData.payments;
    const latestPayment = payments[payments.length - 1];
    if (latestPayment && latestPayment.amount === 50 && latestPayment.paymentNumber && latestPayment.paymentNumber.startsWith('PAY-')) {
      pass('Test 9: Debt Repayment Receipt Generation');
    } else {
      fail('Test 9: Debt Repayment Receipt Generation', JSON.stringify(latestPayment));
    }
  } catch (err) {
    fail('Test 9: Debt Repayment Receipt Generation', err);
  }

  // ----------------------------------------------------
  // Test 10: Subsequent Debt Payment via POST /api/debtors/:customerId/pay
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/debtors/${customer1Id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 100,
        paymentMethod: 'Cash',
        notes: 'Final debt clearance',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.receipt && data.receipt.remainingBalance === 0) {
      pass('Test 10: Subsequent Debt Payment via POST /api/debtors/:customerId/pay');
    } else {
      fail('Test 10: Subsequent Debt Payment via POST /api/debtors/:customerId/pay', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 10: Subsequent Debt Payment via POST /api/debtors/:customerId/pay', err);
  }

  // ----------------------------------------------------
  // Test 11: Full Debt Clearance Status Transition
  // ----------------------------------------------------
  try {
    const custRes = await fetch(`${BASE_URL}/api/customers/${customer1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custData = await custRes.json();
    const saleRes = await fetch(`${BASE_URL}/api/sales/${sale1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const saleData = await saleRes.json();

    if (
      custData.currentDebt === 0 &&
      custData.customer.availableCredit === 500 &&
      saleData.balance === 0 &&
      saleData.paymentStatus === 'Paid'
    ) {
      pass('Test 11: Full Debt Clearance Status Transition');
    } else {
      fail(
        'Test 11: Full Debt Clearance Status Transition',
        `Expected debt=0 & status=Paid, got debt=${custData.currentDebt}, status=${saleData.paymentStatus}`
      );
    }
  } catch (err) {
    fail('Test 11: Full Debt Clearance Status Transition', err);
  }

  // ----------------------------------------------------
  // Test 12: Multiple Unpaid Sales FIFO Allocation
  // ----------------------------------------------------
  try {
    // Create Customer 2
    const cust2Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: `Ama Boateng ${timestamp}`,
        phone: '0244777888',
        creditLimit: 1000,
      }),
    });
    customer2Id = (await cust2Res.json()).id;

    // Create Sale 2: 1 bag = 100 on credit (0 paid, balance 100)
    const s2Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prodA.id, quantity: 1 }],
        paymentMethod: 'Credit',
        amountPaid: 0,
        customerId: customer2Id,
      }),
    });
    sale2Id = (await s2Res.json()).id;

    // Create Sale 3: 2 bags = 200 with 50 paid (balance 150)
    const s3Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prodA.id, quantity: 2 }],
        paymentMethod: 'Credit',
        amountPaid: 50,
        customerId: customer2Id,
      }),
    });
    sale3Id = (await s3Res.json()).id;

    // Total debt for Ama is 100 + 150 = 250.
    // Pay 150 via FIFO.
    // Result expected:
    // Sale 2 (balance 100) should be fully paid (balance 0, status 'Paid').
    // Sale 3 (balance 150) should receive the remaining 50 payment (balance 100, amountPaid 100, status 'Partial').
    const payRes = await fetch(`${BASE_URL}/api/customers/${customer2Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 150,
        paymentMethod: 'Cash',
      }),
    });
    const payData = await payRes.json();

    const sale2Check = await (await fetch(`${BASE_URL}/api/sales/${sale2Id}`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();
    const sale3Check = await (await fetch(`${BASE_URL}/api/sales/${sale3Id}`, { headers: { Authorization: `Bearer ${ownerAToken}` } })).json();

    if (
      sale2Check.balance === 0 &&
      sale2Check.paymentStatus === 'Paid' &&
      sale3Check.balance === 100 &&
      sale3Check.amountPaid === 100 &&
      payData.receipt.remainingBalance === 100
    ) {
      pass('Test 12: Multiple Unpaid Sales FIFO Allocation');
    } else {
      fail(
        'Test 12: Multiple Unpaid Sales FIFO Allocation',
        `Sale 2: balance=${sale2Check.balance}, Sale 3: balance=${sale3Check.balance}, paid=${sale3Check.amountPaid}`
      );
    }
  } catch (err) {
    fail('Test 12: Multiple Unpaid Sales FIFO Allocation', err);
  }

  // ----------------------------------------------------
  // Test 13: Overpayment Rejection
  // ----------------------------------------------------
  try {
    // Ama Boateng current debt is now 100. Attempt to pay 101.
    const res = await fetch(`${BASE_URL}/api/customers/${customer2Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 101,
        paymentMethod: 'Cash',
      }),
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('cannot exceed')) {
      pass('Test 13: Overpayment Rejection');
    } else {
      fail('Test 13: Overpayment Rejection', `Expected 400 for overpayment, got ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    fail('Test 13: Overpayment Rejection', err);
  }

  // ----------------------------------------------------
  // Test 14: Non-Positive Payment Rejection
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/customers/${customer2Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: -25,
        paymentMethod: 'Cash',
      }),
    });
    const data = await res.json();
    if (res.status === 400) {
      pass('Test 14: Non-Positive Payment Rejection');
    } else {
      fail('Test 14: Non-Positive Payment Rejection', `Expected 400, got ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    fail('Test 14: Non-Positive Payment Rejection', err);
  }

  // ----------------------------------------------------
  // Test 15: Tenant Isolation - Customer List & Detail
  // ----------------------------------------------------
  try {
    // Owner B cannot see Customer 1 belonging to Biz A
    const resList = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bList = await resList.json();
    const hasCust1InList = bList.some((c: any) => c.id === customer1Id);

    const resDetail = await fetch(`${BASE_URL}/api/customers/${customer1Id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });

    if (!hasCust1InList && resDetail.status === 404) {
      pass('Test 15: Tenant Isolation - Customer List & Detail');
    } else {
      fail('Test 15: Tenant Isolation - Customer List & Detail', `Leaked to Biz B: inList=${hasCust1InList}, detailStatus=${resDetail.status}`);
    }
  } catch (err) {
    fail('Test 15: Tenant Isolation - Customer List & Detail', err);
  }

  // ----------------------------------------------------
  // Test 16: Tenant Isolation - Cross-Tenant Debt Settlement
  // ----------------------------------------------------
  try {
    // Owner B attempts to record payment for Customer 2 belonging to Biz A
    const res = await fetch(`${BASE_URL}/api/customers/${customer2Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        amount: 50,
        paymentMethod: 'Cash',
      }),
    });
    if (res.status === 404) {
      pass('Test 16: Tenant Isolation - Cross-Tenant Debt Settlement');
    } else {
      const data = await res.json();
      fail('Test 16: Tenant Isolation - Cross-Tenant Debt Settlement', `Expected 404, got ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    fail('Test 16: Tenant Isolation - Cross-Tenant Debt Settlement', err);
  }

  // ----------------------------------------------------
  // Test 17: Permission Enforcement - Access without permission
  // ----------------------------------------------------
  try {
    // Staff without 'customers' or 'debtors' permission tries to fetch customer list and post payment
    const listRes = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${staffNoCustToken}` },
    });
    const payRes = await fetch(`${BASE_URL}/api/customers/${customer2Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffNoCustToken}`,
      },
      body: JSON.stringify({ amount: 10, paymentMethod: 'Cash' }),
    });

    if (listRes.status === 403 && payRes.status === 403) {
      pass('Test 17: Permission Enforcement - Access without permission');
    } else {
      fail('Test 17: Permission Enforcement - Access without permission', `listStatus=${listRes.status}, payStatus=${payRes.status}`);
    }
  } catch (err) {
    fail('Test 17: Permission Enforcement - Access without permission', err);
  }

  // ----------------------------------------------------
  // Test 18: Unauthenticated Access Rejection
  // ----------------------------------------------------
  try {
    const res1 = await fetch(`${BASE_URL}/api/customers`);
    const res2 = await fetch(`${BASE_URL}/api/debtors`);
    const res3 = await fetch(`${BASE_URL}/api/customers/${customer1Id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10 }),
    });

    if (res1.status === 401 && res2.status === 401 && res3.status === 401) {
      pass('Test 18: Unauthenticated Access Rejection');
    } else {
      fail('Test 18: Unauthenticated Access Rejection', `res1=${res1.status}, res2=${res2.status}, res3=${res3.status}`);
    }
  } catch (err) {
    fail('Test 18: Unauthenticated Access Rejection', err);
  }

  // ----------------------------------------------------
  // Test 19: Ghana WhatsApp Phone Formatting & Message Generation
  // ----------------------------------------------------
  try {
    const rawLocal = '0244123456';
    const formatted = formatGhanaPhone(rawLocal);
    const reminderMsg = generateDebtReminderWhatsAppMessage(
      {
        id: customer2Id,
        businessId: 'bizA',
        name: 'Ama Boateng',
        phone: rawLocal,
        amountPaid: 200,
        currentDebt: 100,
        totalPurchases: 300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      100,
      { name: 'Accra Stores', currency: 'GH₵' } as any
    );
    const receiptMsg = generateDebtPaymentReceiptWhatsAppMessage(
      {
        paymentNumber: 'PAY-123456',
        date: '2026-03-10T14:30:00Z',
        customerName: 'Ama Boateng',
        originalDebt: 250,
        paymentAmount: 150,
        remainingBalance: 100,
        paymentMethod: 'Cash',
        businessName: 'Accra Stores',
      },
      'GH₵'
    );

    if (
      formatted === '233244123456' &&
      reminderMsg.includes('Ama Boateng') &&
      reminderMsg.includes('100.00') &&
      receiptMsg.includes('PAY-123456') &&
      receiptMsg.includes('150.00')
    ) {
      pass('Test 19: Ghana WhatsApp Phone Formatting & Message Generation');
    } else {
      fail('Test 19: Ghana WhatsApp Phone Formatting & Message Generation', `formatted=${formatted}, reminder=${reminderMsg.slice(0, 40)}`);
    }
  } catch (err) {
    fail('Test 19: Ghana WhatsApp Phone Formatting & Message Generation', err);
  }

  // ----------------------------------------------------
  // Test 20: Africa/Accra Date Consistency in Repayment Records
  // ----------------------------------------------------
  try {
    const accraToday = getAccraToday();
    const custRes = await fetch(`${BASE_URL}/api/customers/${customer2Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custData = await custRes.json();
    const payments = custData.payments;
    const latestPayment = payments[payments.length - 1];

    if (
      latestPayment &&
      latestPayment.date &&
      latestPayment.date.slice(0, 10) === accraToday
    ) {
      pass('Test 20: Africa/Accra Date Consistency in Repayment Records');
    } else {
      fail('Test 20: Africa/Accra Date Consistency in Repayment Records', `paymentDate=${latestPayment?.date}, accraToday=${accraToday}`);
    }
  } catch (err) {
    fail('Test 20: Africa/Accra Date Consistency in Repayment Records', err);
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n==================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount}/${results.length} PASSED`);
  console.log('==================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
