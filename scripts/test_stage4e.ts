/**
 * STAGE 4E AUTOMATED VERIFICATION SUITE
 * Expenses, Suppliers & Purchases / Stock-In Management System
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
  console.log('--- STARTING STAGE 4E EXPENSES, SUPPLIERS & PURCHASES TEST SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // Setup: Register Business A and Business B
  // ----------------------------------------------------
  const ownerAEmail = `owner4e_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4E Accra',
      phone: '0244111333',
      businessName: `Accra Mart ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  const ownerBEmail = `owner4e_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4E Takoradi',
      phone: '0244999777',
      businessName: `Takoradi Mart ${timestamp}`,
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

  // Upgrade Business A to business plan so all features are enabled
  await fetch(`${BASE_URL}/api/admin/subscriptions/${bizAId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ plan: 'business' }),
  });

  // Keep Business B on Business plan for tenant isolation tests
  await fetch(`${BASE_URL}/api/admin/subscriptions/${bizBId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ plan: 'business' }),
  });

  // Create Staff in Biz A without expenses / suppliers / purchases permissions
  const staffRestrictedEmail = `staff_restricted_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff Restricted',
      email: staffRestrictedEmail,
      phone: '0244555111',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        expenses: false,
        suppliers: false,
        purchases: false,
        financial_reports: false,
      },
    }),
  });
  const loginRestrictedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffRestrictedEmail, password: 'password123' }),
  });
  const staffRestrictedToken = (await loginRestrictedRes.json()).token;

  // Create Staff in Biz A with expenses, suppliers, purchases permissions BUT NO financial_reports
  const staffAuthorizedEmail = `staff_authorized_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Staff Authorized',
      email: staffAuthorizedEmail,
      phone: '0244555222',
      password: 'password123',
      permissions: {
        dashboard: true,
        pos_sales: true,
        expenses: true,
        suppliers: true,
        purchases: true,
        financial_reports: false, // Protected financial data should be sanitized!
      },
    }),
  });
  const loginAuthorizedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffAuthorizedEmail, password: 'password123' }),
  });
  const staffAuthorizedToken = (await loginAuthorizedRes.json()).token;

  // Create a Product in Business A for purchase and inventory tests
  const prodARes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: `Milo 500g ${timestamp}`,
      sku: `MILO-${timestamp}`,
      buyingPrice: 40,
      sellingPrice: 55,
      quantity: 20, // Initial stock: 20
      minStockLevel: 5,
      category: 'Provisions',
    }),
  });
  const prodA = await prodARes.json();

  // Create a Product in Business B for cross-tenant injection test
  const prodBRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerBToken}`,
    },
    body: JSON.stringify({
      name: `Takoradi Product ${timestamp}`,
      sku: `TKO-${timestamp}`,
      buyingPrice: 15,
      sellingPrice: 25,
      quantity: 50,
      minStockLevel: 10,
      category: 'Provisions',
    }),
  });
  const prodB = await prodBRes.json();

  let expense1Id = '';
  let expense2Id = '';
  let supplierAId = '';
  let supplierBId = '';
  let purchase1Id = '';

  // =========================================================================
  // SECTION 1: EXPENSES TESTS (Tests 1 to 14)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 1: Expenses Creation with Positive Amount Validation
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Shop Electricity Pre-paid',
        category: 'Electricity',
        amount: 350.5,
        paymentMethod: 'Mobile Money',
        description: 'ECG monthly top up for shop',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.id && data.amount === 350.5 && data.title === 'Shop Electricity Pre-paid') {
      expense1Id = data.id;
      pass('Test 1: Expenses Creation with Positive Amount Validation');
    } else {
      fail('Test 1: Expenses Creation with Positive Amount Validation', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 1: Expenses Creation with Positive Amount Validation', err);
  }

  // -------------------------------------------------------------------------
  // Test 2: Expense Creation Rejects Negative or Zero Amount
  // -------------------------------------------------------------------------
  try {
    const resZero = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Zero Expense',
        category: 'Other',
        amount: 0,
      }),
    });
    const resNeg = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Negative Expense',
        category: 'Other',
        amount: -50,
      }),
    });

    if (resZero.status === 400 && resNeg.status === 400) {
      pass('Test 2: Expense Creation Rejects Negative or Zero Amount');
    } else {
      fail('Test 2: Expense Creation Rejects Negative or Zero Amount', `Zero: ${resZero.status}, Neg: ${resNeg.status}`);
    }
  } catch (err) {
    fail('Test 2: Expense Creation Rejects Negative or Zero Amount', err);
  }

  // -------------------------------------------------------------------------
  // Test 3: Expense Creation Rejects Missing/Empty Title or Category
  // -------------------------------------------------------------------------
  try {
    const resNoTitle = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: '   ',
        category: 'Supplies',
        amount: 100,
      }),
    });
    const resNoCat = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Valid Title',
        category: '',
        amount: 100,
      }),
    });

    if (resNoTitle.status === 400 && resNoCat.status === 400) {
      pass('Test 3: Expense Creation Rejects Missing/Empty Title or Category');
    } else {
      fail('Test 3: Expense Creation Rejects Missing/Empty Title or Category', `NoTitle: ${resNoTitle.status}, NoCat: ${resNoCat.status}`);
    }
  } catch (err) {
    fail('Test 3: Expense Creation Rejects Missing/Empty Title or Category', err);
  }

  // -------------------------------------------------------------------------
  // Test 4: Expenses Accra Date Handling
  // -------------------------------------------------------------------------
  try {
    const explicitDate = '2026-03-01';
    const res1 = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Generator Fuel',
        category: 'Transport',
        amount: 120,
        date: explicitDate,
        paymentMethod: 'Cash',
      }),
    });
    const data1 = await res1.json();
    expense2Id = data1.id;

    const res2 = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Shop Water Supply',
        category: 'Water',
        amount: 80,
      }),
    });
    const data2 = await res2.json();

    const todayAccra = getAccraToday();
    if (res1.status === 201 && data1.date === explicitDate && res2.status === 201 && data2.date === todayAccra) {
      pass('Test 4: Expenses Accra Date Handling');
    } else {
      fail('Test 4: Expenses Accra Date Handling', `Data1 Date: ${data1.date}, Data2 Date: ${data2.date}, Expected Today: ${todayAccra}`);
    }
  } catch (err) {
    fail('Test 4: Expenses Accra Date Handling', err);
  }

  // -------------------------------------------------------------------------
  // Test 5: Expenses Retrieval with Category Filtering
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses?category=Electricity`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const list = await res.json();
    if (res.status === 200 && Array.isArray(list) && list.length > 0 && list.every((e: any) => e.category === 'Electricity')) {
      pass('Test 5: Expenses Retrieval with Category Filtering');
    } else {
      fail('Test 5: Expenses Retrieval with Category Filtering', JSON.stringify(list));
    }
  } catch (err) {
    fail('Test 5: Expenses Retrieval with Category Filtering', err);
  }

  // -------------------------------------------------------------------------
  // Test 6: Expenses Retrieval with Payment Method Filtering
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses?paymentMethod=Mobile%20Money`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const list = await res.json();
    if (res.status === 200 && Array.isArray(list) && list.some((e: any) => e.id === expense1Id) && list.every((e: any) => e.paymentMethod === 'Mobile Money')) {
      pass('Test 6: Expenses Retrieval with Payment Method Filtering');
    } else {
      fail('Test 6: Expenses Retrieval with Payment Method Filtering', JSON.stringify(list));
    }
  } catch (err) {
    fail('Test 6: Expenses Retrieval with Payment Method Filtering', err);
  }

  // -------------------------------------------------------------------------
  // Test 7: Expenses Date Range and Search Query Filtering
  // -------------------------------------------------------------------------
  try {
    const resSearch = await fetch(`${BASE_URL}/api/expenses?search=Electricity`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const searchList = await resSearch.json();

    const resDateRange = await fetch(`${BASE_URL}/api/expenses?startDate=2026-03-01&endDate=2026-03-01`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const dateRangeList = await resDateRange.json();

    if (
      resSearch.status === 200 &&
      searchList.some((e: any) => e.id === expense1Id) &&
      resDateRange.status === 200 &&
      dateRangeList.some((e: any) => e.id === expense2Id)
    ) {
      pass('Test 7: Expenses Date Range and Search Query Filtering');
    } else {
      fail('Test 7: Expenses Date Range and Search Query Filtering', `Search: ${searchList.length}, DateRange: ${dateRangeList.length}`);
    }
  } catch (err) {
    fail('Test 7: Expenses Date Range and Search Query Filtering', err);
  }

  // -------------------------------------------------------------------------
  // Test 8: Expenses Summary Endpoint
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const summary = await res.json();
    if (
      res.status === 200 &&
      typeof summary.todayTotal === 'number' &&
      typeof summary.totalAmount === 'number' &&
      summary.count >= 3 &&
      summary.byCategory &&
      summary.byCategory['Electricity'] >= 350
    ) {
      pass('Test 8: Expenses Summary Endpoint');
    } else {
      fail('Test 8: Expenses Summary Endpoint', JSON.stringify(summary));
    }
  } catch (err) {
    fail('Test 8: Expenses Summary Endpoint', err);
  }

  // -------------------------------------------------------------------------
  // Test 9: Expense Retrieval by ID (GET /api/expenses/:id)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const exp = await res.json();
    if (res.status === 200 && exp.id === expense1Id && exp.amount === 350.5) {
      pass('Test 9: Expense Retrieval by ID (GET /api/expenses/:id)');
    } else {
      fail('Test 9: Expense Retrieval by ID (GET /api/expenses/:id)', JSON.stringify(exp));
    }
  } catch (err) {
    fail('Test 9: Expense Retrieval by ID (GET /api/expenses/:id)', err);
  }

  // -------------------------------------------------------------------------
  // Test 10: Expense Update (PUT /api/expenses/:id)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Shop Electricity ECG Units (Updated)',
        amount: 400,
        description: 'Updated top-up amount for March',
      }),
    });
    const updated = await res.json();

    const resInvalid = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ amount: -20 }),
    });

    if (res.status === 200 && updated.amount === 400 && updated.title.includes('Updated') && resInvalid.status === 400) {
      pass('Test 10: Expense Update (PUT /api/expenses/:id)');
    } else {
      fail('Test 10: Expense Update (PUT /api/expenses/:id)', `Update: ${res.status}, Invalid: ${resInvalid.status}`);
    }
  } catch (err) {
    fail('Test 10: Expense Update (PUT /api/expenses/:id)', err);
  }

  // -------------------------------------------------------------------------
  // Test 11: Expense Deletion (DELETE /api/expenses/:id)
  // -------------------------------------------------------------------------
  try {
    // Create a temporary expense to delete
    const tempRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Temporary Trash Bag',
        category: 'Supplies',
        amount: 25,
      }),
    });
    const tempExp = await tempRes.json();

    const delRes = await fetch(`${BASE_URL}/api/expenses/${tempExp.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    const getRes = await fetch(`${BASE_URL}/api/expenses/${tempExp.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    if (delRes.status === 200 && getRes.status === 404) {
      pass('Test 11: Expense Deletion (DELETE /api/expenses/:id)');
    } else {
      fail('Test 11: Expense Deletion (DELETE /api/expenses/:id)', `Del status: ${delRes.status}, Get status: ${getRes.status}`);
    }
  } catch (err) {
    fail('Test 11: Expense Deletion (DELETE /api/expenses/:id)', err);
  }

  // -------------------------------------------------------------------------
  // Test 12: Expenses Tenant Isolation
  // -------------------------------------------------------------------------
  try {
    // Business B tries to get, update, and delete Business A's expense
    const getOtherRes = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const putOtherRes = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ amount: 9999 }),
    });
    const delOtherRes = await fetch(`${BASE_URL}/api/expenses/${expense1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });

    const listBRes = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const listB = await listBRes.json();

    if (
      getOtherRes.status === 404 &&
      putOtherRes.status === 404 &&
      delOtherRes.status === 404 &&
      !listB.some((e: any) => e.id === expense1Id)
    ) {
      pass('Test 12: Expenses Tenant Isolation');
    } else {
      fail('Test 12: Expenses Tenant Isolation', `Get: ${getOtherRes.status}, Put: ${putOtherRes.status}, Del: ${delOtherRes.status}`);
    }
  } catch (err) {
    fail('Test 12: Expenses Tenant Isolation', err);
  }

  // -------------------------------------------------------------------------
  // Test 13: Expenses RBAC Staff Permission Check (Forbidden without permission)
  // -------------------------------------------------------------------------
  try {
    const resGet = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${staffRestrictedToken}` },
    });
    const resPost = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffRestrictedToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Coffee',
        category: 'Supplies',
        amount: 20,
      }),
    });

    if (resGet.status === 403 && resPost.status === 403) {
      pass('Test 13: Expenses RBAC Staff Permission Check (Forbidden without permission)');
    } else {
      fail('Test 13: Expenses RBAC Staff Permission Check (Forbidden without permission)', `Get: ${resGet.status}, Post: ${resPost.status}`);
    }
  } catch (err) {
    fail('Test 13: Expenses RBAC Staff Permission Check (Forbidden without permission)', err);
  }

  // -------------------------------------------------------------------------
  // Test 14: Expenses Staff with Permission Access
  // -------------------------------------------------------------------------
  try {
    const resPost = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffAuthorizedToken}`,
      },
      body: JSON.stringify({
        title: 'Staff Logged Transport',
        category: 'Transport',
        amount: 45,
        paymentMethod: 'Cash',
      }),
    });
    const resGet = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${staffAuthorizedToken}` },
    });

    if (resPost.status === 201 && resGet.status === 200) {
      pass('Test 14: Expenses Staff with Permission Access');
    } else {
      fail('Test 14: Expenses Staff with Permission Access', `Post: ${resPost.status}, Get: ${resGet.status}`);
    }
  } catch (err) {
    fail('Test 14: Expenses Staff with Permission Access', err);
  }

  // =========================================================================
  // SECTION 2: SUPPLIERS TESTS (Tests 15 to 22)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 15: Supplier Creation with Phone & Name Validation
  // -------------------------------------------------------------------------
  try {
    const resValid = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: `Accra Food Distributors ${timestamp}`,
        phone: '0244123888',
        email: 'sales@accrafoods.com',
        address: 'Makola Market Block B, Accra',
        notes: 'Delivers provisions on Mondays and Thursdays',
      }),
    });
    const supData = await resValid.json();
    supplierAId = supData.id;

    const resNoName = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: '',
        phone: '0244123888',
      }),
    });

    const resNoPhone = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Valid Name',
        phone: '',
      }),
    });

    if (resValid.status === 201 && supData.id && resNoName.status === 400 && resNoPhone.status === 400) {
      pass('Test 15: Supplier Creation with Phone & Name Validation');
    } else {
      fail('Test 15: Supplier Creation with Phone & Name Validation', `Valid: ${resValid.status}, NoName: ${resNoName.status}, NoPhone: ${resNoPhone.status}`);
    }
  } catch (err) {
    fail('Test 15: Supplier Creation with Phone & Name Validation', err);
  }

  // -------------------------------------------------------------------------
  // Test 16: Supplier Retrieval with Search by Name or Phone
  // -------------------------------------------------------------------------
  try {
    const resSearch = await fetch(`${BASE_URL}/api/suppliers?search=Accra%20Food`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const list = await resSearch.json();
    if (resSearch.status === 200 && Array.isArray(list) && list.some((s: any) => s.id === supplierAId)) {
      pass('Test 16: Supplier Retrieval with Search by Name or Phone');
    } else {
      fail('Test 16: Supplier Retrieval with Search by Name or Phone', JSON.stringify(list));
    }
  } catch (err) {
    fail('Test 16: Supplier Retrieval with Search by Name or Phone', err);
  }

  // -------------------------------------------------------------------------
  // Test 17: Supplier Update
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/suppliers/${supplierAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        address: 'Spintex Road, Accra - Warehouse 4',
        phone: '0244999111',
      }),
    });
    const updated = await res.json();
    if (res.status === 200 && updated.address === 'Spintex Road, Accra - Warehouse 4' && updated.phone === '0244999111') {
      pass('Test 17: Supplier Update');
    } else {
      fail('Test 17: Supplier Update', JSON.stringify(updated));
    }
  } catch (err) {
    fail('Test 17: Supplier Update', err);
  }

  // -------------------------------------------------------------------------
  // Test 18: Supplier Profile & Purchase History Endpoint (GET /api/suppliers/:id)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/suppliers/${supplierAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.supplier && data.supplier.id === supplierAId && Array.isArray(data.purchases)) {
      pass('Test 18: Supplier Profile & Purchase History Endpoint (GET /api/suppliers/:id)');
    } else {
      fail('Test 18: Supplier Profile & Purchase History Endpoint (GET /api/suppliers/:id)', JSON.stringify(data));
    }
  } catch (err) {
    fail('Test 18: Supplier Profile & Purchase History Endpoint (GET /api/suppliers/:id)', err);
  }

  // -------------------------------------------------------------------------
  // Test 19: Supplier Deletion
  // -------------------------------------------------------------------------
  try {
    // Create temporary supplier
    const tempRes = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Temporary Supplier To Delete',
        phone: '0200000000',
      }),
    });
    const tempSup = await tempRes.json();

    const delRes = await fetch(`${BASE_URL}/api/suppliers/${tempSup.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    const getRes = await fetch(`${BASE_URL}/api/suppliers/${tempSup.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    if (delRes.status === 200 && getRes.status === 404) {
      pass('Test 19: Supplier Deletion');
    } else {
      fail('Test 19: Supplier Deletion', `Del: ${delRes.status}, Get: ${getRes.status}`);
    }
  } catch (err) {
    fail('Test 19: Supplier Deletion', err);
  }

  // -------------------------------------------------------------------------
  // Test 20: Supplier Tenant Isolation
  // -------------------------------------------------------------------------
  try {
    // Create a supplier in Business B
    const supBRes = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        name: `Takoradi Timber Co ${timestamp}`,
        phone: '0312000111',
      }),
    });
    const supBData = await supBRes.json();
    supplierBId = supBData.id;

    // Business B attempts to access Business A's supplier
    const getRes = await fetch(`${BASE_URL}/api/suppliers/${supplierAId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const putRes = await fetch(`${BASE_URL}/api/suppliers/${supplierAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Supplier Name' }),
    });
    const delRes = await fetch(`${BASE_URL}/api/suppliers/${supplierAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });

    // Verify Business A cannot see Business B's supplier in list
    const listARes = await fetch(`${BASE_URL}/api/suppliers`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const listA = await listARes.json();

    if (
      getRes.status === 404 &&
      putRes.status === 404 &&
      delRes.status === 404 &&
      !listA.some((s: any) => s.id === supplierBId)
    ) {
      pass('Test 20: Supplier Tenant Isolation');
    } else {
      fail('Test 20: Supplier Tenant Isolation', `Get: ${getRes.status}, Put: ${putRes.status}, Del: ${delRes.status}`);
    }
  } catch (err) {
    fail('Test 20: Supplier Tenant Isolation', err);
  }

  // -------------------------------------------------------------------------
  // Test 21: Supplier RBAC Staff Permission Enforcement
  // -------------------------------------------------------------------------
  try {
    const resGet = await fetch(`${BASE_URL}/api/suppliers`, {
      headers: { Authorization: `Bearer ${staffRestrictedToken}` },
    });
    const resPost = await fetch(`${BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffRestrictedToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Supplier',
        phone: '0244111222',
      }),
    });

    if (resGet.status === 403 && resPost.status === 403) {
      pass('Test 21: Supplier RBAC Staff Permission Enforcement');
    } else {
      fail('Test 21: Supplier RBAC Staff Permission Enforcement', `Get: ${resGet.status}, Post: ${resPost.status}`);
    }
  } catch (err) {
    fail('Test 21: Supplier RBAC Staff Permission Enforcement', err);
  }

  // -------------------------------------------------------------------------
  // Test 22: Supplier Subscription Feature Gate
  // -------------------------------------------------------------------------
  try {
    // Create a Free plan business
    const freeEmail = `owner4e_free_${timestamp}@test.com`;
    const regFreeRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freeEmail,
        password: 'password123',
        fullName: 'Free Plan Owner',
        phone: '0244777666',
        businessName: `Free Shop ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const freeData = await regFreeRes.json();
    const freeToken = freeData.token;

    // Supplier is gated to Starter plan (free plan should be 403 FEATURE_UPGRADE_REQUIRED)
    const supFreeRes = await fetch(`${BASE_URL}/api/suppliers`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });

    if (supFreeRes.status === 403) {
      pass('Test 22: Supplier Subscription Feature Gate');
    } else {
      fail('Test 22: Supplier Subscription Feature Gate', `Expected 403 for Free plan on suppliers, got: ${supFreeRes.status}`);
    }
  } catch (err) {
    fail('Test 22: Supplier Subscription Feature Gate', err);
  }

  // =========================================================================
  // SECTION 3: PURCHASES & STOCK-IN TESTS (Tests 23 to 30)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 23: Purchase Creation / Stock-In Increases Product Inventory
  // -------------------------------------------------------------------------
  try {
    // Initial prodA quantity is 20. Let's purchase 15 units.
    const res = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [
          {
            productId: prodA.id,
            quantity: 15,
            buyingPrice: 42,
          },
        ],
        notes: 'Restocked 15 units of Milo from Accra Foods',
      }),
    });
    const purchaseData = await res.json();
    purchase1Id = purchaseData.id;

    // Verify product inventory in database
    const prodCheckRes = await fetch(`${BASE_URL}/api/products/${prodA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodPayload = await prodCheckRes.json();
    const updatedProd = prodPayload.product || prodPayload;

    if (res.status === 201 && purchaseData.id && updatedProd.quantity === 35) {
      pass('Test 23: Purchase Creation / Stock-In Increases Product Inventory (20 -> 35)');
    } else {
      fail('Test 23: Purchase Creation / Stock-In Increases Product Inventory', `Purchase status: ${res.status}, Prod Qty: ${updatedProd?.quantity}`);
    }
  } catch (err) {
    fail('Test 23: Purchase Creation / Stock-In Increases Product Inventory', err);
  }

  // -------------------------------------------------------------------------
  // Test 24: Stock Movement Created Exactly Once for Purchase
  // -------------------------------------------------------------------------
  try {
    const movementsRes = await fetch(`${BASE_URL}/api/products/${prodA.id}/movements`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const movements = await movementsRes.json();
    const purchaseMovements = (Array.isArray(movements) ? movements : []).filter(
      (m: any) => m.referenceId === purchase1Id && m.productId === prodA.id
    );

    if (purchaseMovements.length === 1 && purchaseMovements[0].quantity === 15 && purchaseMovements[0].movementType === 'purchase') {
      pass('Test 24: Stock Movement Created Exactly Once for Purchase');
    } else {
      fail('Test 24: Stock Movement Created Exactly Once for Purchase', `Found ${purchaseMovements.length} movements, expected 1`);
    }
  } catch (err) {
    fail('Test 24: Stock Movement Created Exactly Once for Purchase', err);
  }

  // -------------------------------------------------------------------------
  // Test 25: Purchase Server-Authoritative Total Calculation
  // -------------------------------------------------------------------------
  try {
    // 10 units at buying price GH₵42 = GH₵420 authoritative total.
    // Client sends spoofed totalAmount: 10
    const res = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [
          {
            productId: prodA.id,
            quantity: 10,
            buyingPrice: 42,
          },
        ],
        totalAmount: 10, // Spoofed total!
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.totalAmount === 420) {
      pass('Test 25: Purchase Server-Authoritative Total Calculation (10 * 42 = 420)');
    } else {
      fail('Test 25: Purchase Server-Authoritative Total Calculation', `Expected 420, got: ${data?.totalAmount}`);
    }
  } catch (err) {
    fail('Test 25: Purchase Server-Authoritative Total Calculation', err);
  }

  // -------------------------------------------------------------------------
  // Test 26: Purchase Rejects Negative or Zero Quantity
  // -------------------------------------------------------------------------
  try {
    const resZero = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodA.id, quantity: 0, buyingPrice: 40 }],
      }),
    });

    const resNeg = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodA.id, quantity: -5, buyingPrice: 40 }],
      }),
    });

    if (resZero.status === 400 && resNeg.status === 400) {
      pass('Test 26: Purchase Rejects Negative or Zero Quantity');
    } else {
      fail('Test 26: Purchase Rejects Negative or Zero Quantity', `Zero: ${resZero.status}, Neg: ${resNeg.status}`);
    }
  } catch (err) {
    fail('Test 26: Purchase Rejects Negative or Zero Quantity', err);
  }

  // -------------------------------------------------------------------------
  // Test 27: Purchase Rejects Negative Buying Price
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodA.id, quantity: 5, buyingPrice: -30 }],
      }),
    });

    if (res.status === 400) {
      pass('Test 27: Purchase Rejects Negative Buying Price');
    } else {
      fail('Test 27: Purchase Rejects Negative Buying Price', `Expected 400, got: ${res.status}`);
    }
  } catch (err) {
    fail('Test 27: Purchase Rejects Negative Buying Price', err);
  }

  // -------------------------------------------------------------------------
  // Test 28: Purchase Idempotency Key (Prevents Duplicate Restock)
  // -------------------------------------------------------------------------
  try {
    const idempotencyKey = `idemp_purchase_${timestamp}`;

    // Get current product stock before first call via HTTP API
    const p1Res = await fetch(`${BASE_URL}/api/products/${prodA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const p1Data = await p1Res.json();
    const initialQty = p1Data.product?.quantity ?? 0;

    // First call with idempotencyKey
    const res1 = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodA.id, quantity: 8, buyingPrice: 40 }],
        idempotencyKey,
      }),
    });
    const data1 = await res1.json();

    // Check stock after first call
    const p2Res = await fetch(`${BASE_URL}/api/products/${prodA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const p2Data = await p2Res.json();
    const qtyAfterFirst = p2Data.product?.quantity ?? 0;

    // Second duplicate call with same idempotencyKey
    const res2 = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodA.id, quantity: 8, buyingPrice: 40 }],
        idempotencyKey,
      }),
    });
    const data2 = await res2.json();

    // Check stock after second call
    const p3Res = await fetch(`${BASE_URL}/api/products/${prodA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const p3Data = await p3Res.json();
    const qtyAfterSecond = p3Data.product?.quantity ?? 0;

    if (
      res1.status === 201 &&
      res2.status === 200 &&
      data1.id === data2.id &&
      qtyAfterFirst === initialQty + 8 &&
      qtyAfterSecond === qtyAfterFirst
    ) {
      pass('Test 28: Purchase Idempotency Key (Prevents Duplicate Restock)');
    } else {
      fail(
        'Test 28: Purchase Idempotency Key (Prevents Duplicate Restock)',
        `Status1: ${res1.status}, Status2: ${res2.status}, QtyInit: ${initialQty}, Qty1: ${qtyAfterFirst}, Qty2: ${qtyAfterSecond}`
      );
    }
  } catch (err) {
    fail('Test 28: Purchase Idempotency Key (Prevents Duplicate Restock)', err);
  }

  // -------------------------------------------------------------------------
  // Test 29: Cross-Tenant Validation & Purchase Isolation
  // -------------------------------------------------------------------------
  try {
    // Attempt 1: Business A tries to purchase product belonging to Business B
    const resCrossProd = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierAId,
        items: [{ productId: prodB.id, quantity: 5, buyingPrice: 15 }],
      }),
    });

    // Attempt 2: Business A tries to link Business B's supplier
    const resCrossSup = await fetch(`${BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        supplierId: supplierBId,
        items: [{ productId: prodA.id, quantity: 5, buyingPrice: 40 }],
      }),
    });

    // Attempt 3: Business B tries to read Business A's purchase
    const resOtherPurchase = await fetch(`${BASE_URL}/api/purchases/${purchase1Id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });

    // Attempt 4: Business B purchases list does not include Business A's purchase
    const resListB = await fetch(`${BASE_URL}/api/purchases`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const listB = await resListB.json();

    if (
      resCrossProd.status === 400 &&
      resCrossSup.status === 400 &&
      resOtherPurchase.status === 404 &&
      !listB.some((p: any) => p.id === purchase1Id)
    ) {
      pass('Test 29: Cross-Tenant Validation & Purchase Isolation');
    } else {
      fail(
        'Test 29: Cross-Tenant Validation & Purchase Isolation',
        `CrossProd: ${resCrossProd.status}, CrossSup: ${resCrossSup.status}, OtherGet: ${resOtherPurchase.status}`
      );
    }
  } catch (err) {
    fail('Test 29: Cross-Tenant Validation & Purchase Isolation', err);
  }

  // -------------------------------------------------------------------------
  // Test 30: Financial Privacy / Masking for Staff on Purchases
  // -------------------------------------------------------------------------
  try {
    // Staff without financial_reports calls GET /api/purchases
    const staffListRes = await fetch(`${BASE_URL}/api/purchases`, {
      headers: { Authorization: `Bearer ${staffAuthorizedToken}` },
    });
    const staffList = await staffListRes.json();
    const staffPurchase = staffList.find((p: any) => p.id === purchase1Id);

    // Staff without financial_reports calls GET /api/purchases/:id
    const staffDetailRes = await fetch(`${BASE_URL}/api/purchases/${purchase1Id}`, {
      headers: { Authorization: `Bearer ${staffAuthorizedToken}` },
    });
    const staffDetail = await staffDetailRes.json();

    // Owner calls GET /api/purchases/:id
    const ownerDetailRes = await fetch(`${BASE_URL}/api/purchases/${purchase1Id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const ownerDetail = await ownerDetailRes.json();

    const isStaffMasked =
      staffPurchase &&
      staffPurchase.totalAmount === undefined &&
      staffPurchase.items.every((it: any) => it.buyingPrice === undefined && it.total === undefined) &&
      staffDetail.totalAmount === undefined &&
      staffDetail.items.every((it: any) => it.buyingPrice === undefined && it.total === undefined);

    const isOwnerAuthorized =
      ownerDetail &&
      typeof ownerDetail.totalAmount === 'number' &&
      ownerDetail.items.every((it: any) => typeof it.buyingPrice === 'number' && typeof it.total === 'number');

    if (isStaffMasked && isOwnerAuthorized) {
      pass('Test 30: Financial Privacy / Masking for Staff on Purchases');
    } else {
      fail(
        'Test 30: Financial Privacy / Masking for Staff on Purchases',
        `StaffMasked: ${isStaffMasked}, OwnerAuthorized: ${isOwnerAuthorized}`
      );
    }
  } catch (err) {
    fail('Test 30: Financial Privacy / Masking for Staff on Purchases', err);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} PASSED`);
  console.log('==================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
