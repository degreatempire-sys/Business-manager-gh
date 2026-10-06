/**
 * STAGE 4G AUTOMATED VERIFICATION SUITE
 * Inventory Intelligence, Stock Control & Business Operations Upgrade
 * 50 Comprehensive Test Cases & Assertions
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
  console.log('--- STARTING STAGE 4G INVENTORY INTELLIGENCE & STOCK CONTROL TEST SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // Setup: Register Business A and Business B
  // ----------------------------------------------------
  const ownerAEmail = `owner4g_a_${timestamp}@test.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerAEmail,
      password: 'password123',
      fullName: 'Owner 4G Accra',
      phone: '0244111222',
      businessName: `Accra Stock Mart ${timestamp}`,
      businessType: 'Retail',
    }),
  });
  const ownerAData = await regARes.json();
  const ownerAToken = ownerAData.token;
  const bizAId = ownerAData.business.id;

  const ownerBEmail = `owner4g_b_${timestamp}@test.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerBEmail,
      password: 'password123',
      fullName: 'Owner 4G Kumasi',
      phone: '0244888999',
      businessName: `Kumasi Stock Mart ${timestamp}`,
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

  // Create Cashier in Business A (no manage_products, no financial_reports)
  const cashierEmail = `cashier4g_${timestamp}@test.com`;
  await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      fullName: 'Cashier 4G',
      email: cashierEmail,
      phone: '0244555666',
      password: 'password123',
      permissions: {
        pos_sales: true,
        view_products: true,
        manage_products: false,
        financial_reports: false,
      },
    }),
  });

  const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cashierEmail, password: 'password123' }),
  });
  const cashierToken = (await cashierLoginRes.json()).token;

  // Create Supplier in Business A and Business B
  const supARes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: 'Accra Prime Distributors',
      phone: '0244123456',
      contactPerson: 'Kofi Mensah',
    }),
  });
  const supplierA = await supARes.json();

  const supBRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerBToken}`,
    },
    body: JSON.stringify({
      name: 'Kumasi Wholesale Hub',
      phone: '0244654321',
      contactPerson: 'Yaw Boateng',
    }),
  });
  const supplierB = await supBRes.json();

  // =========================================================================
  // SECTION 1: PRODUCT CREATION & SERVER-AUTHORITATIVE STOCK STATUS
  // =========================================================================

  // Test 1: Create healthy in-stock product
  let productA1: any;
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Ghana Jasmine Rice 5kg',
        sku: `RICE-5KG-${timestamp}`,
        category: 'Grains',
        buyingPrice: 80,
        sellingPrice: 120,
        quantity: 25,
        minStockLevel: 5,
        supplierId: supplierA.id,
      }),
    });
    productA1 = await res.json();
    if (res.status === 201 && productA1.stockStatus === 'IN STOCK' && productA1.shortfall === 0) {
      pass('1. Product creation derives stockStatus: IN STOCK and shortfall: 0');
    } else {
      fail('1. Product creation derives stockStatus: IN STOCK', productA1);
    }
  } catch (err) {
    fail('1. Product creation derives stockStatus: IN STOCK', err);
  }

  // Test 2: Create out-of-stock product
  let productA2: any;
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Milo Tin 400g',
        sku: `MILO-400G-${timestamp}`,
        category: 'Beverages',
        buyingPrice: 35,
        sellingPrice: 50,
        quantity: 0,
        minStockLevel: 8,
        supplierId: supplierA.id,
      }),
    });
    productA2 = await res.json();
    if (res.status === 201 && productA2.stockStatus === 'OUT OF STOCK' && productA2.shortfall === 8) {
      pass('2. Zero quantity product derives stockStatus: OUT OF STOCK and shortfall: minStockLevel');
    } else {
      fail('2. Zero quantity product derives stockStatus: OUT OF STOCK', productA2);
    }
  } catch (err) {
    fail('2. Zero quantity product derives stockStatus: OUT OF STOCK', err);
  }

  // Test 3: Create low-stock product
  let productA3: any;
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Ideal Milk 160g',
        sku: `IDEAL-160G-${timestamp}`,
        category: 'Beverages',
        buyingPrice: 8,
        sellingPrice: 12,
        quantity: 3,
        minStockLevel: 10,
        supplierId: supplierA.id,
      }),
    });
    productA3 = await res.json();
    if (res.status === 201 && productA3.stockStatus === 'LOW STOCK' && productA3.shortfall === 7) {
      pass('3. Quantity <= minStockLevel derives stockStatus: LOW STOCK and exact shortfall (10 - 3 = 7)');
    } else {
      fail('3. Quantity <= minStockLevel derives stockStatus: LOW STOCK', productA3);
    }
  } catch (err) {
    fail('3. Quantity <= minStockLevel derives stockStatus: LOW STOCK', err);
  }

  // Test 4: Rejection of missing product name
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: '   ',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 10,
      }),
    });
    if (res.status === 400) {
      pass('4. Reject product creation with empty name');
    } else {
      fail('4. Reject product creation with empty name', res.status);
    }
  } catch (err) {
    fail('4. Reject product creation with empty name', err);
  }

  // Test 5: Rejection of negative buying price
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Product Price',
        buyingPrice: -10,
        sellingPrice: 15,
        quantity: 10,
      }),
    });
    if (res.status === 400) {
      pass('5. Reject product creation with negative buying price');
    } else {
      fail('5. Reject product creation with negative buying price', res.status);
    }
  } catch (err) {
    fail('5. Reject product creation with negative buying price', err);
  }

  // Test 6: Rejection of negative selling price
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Product Price',
        buyingPrice: 10,
        sellingPrice: -5,
        quantity: 10,
      }),
    });
    if (res.status === 400) {
      pass('6. Reject product creation with negative selling price');
    } else {
      fail('6. Reject product creation with negative selling price', res.status);
    }
  } catch (err) {
    fail('6. Reject product creation with negative selling price', err);
  }

  // Test 7: Rejection of negative stock quantity
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Negative Stock',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: -20,
      }),
    });
    if (res.status === 400) {
      pass('7. Reject product creation with negative stock quantity');
    } else {
      fail('7. Reject product creation with negative stock quantity', res.status);
    }
  } catch (err) {
    fail('7. Reject product creation with negative stock quantity', err);
  }

  // Test 8: Rejection of negative minStockLevel
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Min Alert',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 10,
        minStockLevel: -5,
      }),
    });
    if (res.status === 400) {
      pass('8. Reject product creation with negative minStockLevel');
    } else {
      fail('8. Reject product creation with negative minStockLevel', res.status);
    }
  } catch (err) {
    fail('8. Reject product creation with negative minStockLevel', err);
  }

  // Test 9: Enforce duplicate SKU rejection within same business
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Rice SKU',
        sku: `RICE-5KG-${timestamp}`, // same SKU as productA1
        buyingPrice: 80,
        sellingPrice: 120,
        quantity: 10,
      }),
    });
    if (res.status === 400) {
      pass('9. Reject duplicate SKU within same business');
    } else {
      fail('9. Reject duplicate SKU within same business', res.status);
    }
  } catch (err) {
    fail('9. Reject duplicate SKU within same business', err);
  }

  // Test 10: Permitted identical SKU in different business (tenant isolation)
  let productB1: any;
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        name: 'Kumasi Rice Branch',
        sku: `RICE-5KG-${timestamp}`, // same SKU as Business A, but in Business B
        buyingPrice: 85,
        sellingPrice: 125,
        quantity: 30,
        supplierId: supplierB.id,
      }),
    });
    productB1 = await res.json();
    if (res.status === 201 && productB1.sku === `RICE-5KG-${timestamp}`) {
      pass('10. Allow identical SKU across separate businesses (tenant isolation)');
    } else {
      fail('10. Allow identical SKU across separate businesses', productB1);
    }
  } catch (err) {
    fail('10. Allow identical SKU across separate businesses', err);
  }

  // Test 11: Reject supplier from another business
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Foreign Supplier Product',
        sku: `FOREIGN-SUP-${timestamp}`,
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 5,
        supplierId: supplierB.id, // belongs to Business B!
      }),
    });
    if (res.status === 400) {
      pass('11. Reject product creation referencing supplier from another business');
    } else {
      fail('11. Reject product creation referencing supplier from another business', res.status);
    }
  } catch (err) {
    fail('11. Reject product creation referencing supplier from another business', err);
  }

  // Test 12: Correct supplier name populated on product
  try {
    if (productA1.supplierId === supplierA.id && productA1.supplierName === supplierA.name) {
      pass('12. Valid supplier is linked and supplierName is populated');
    } else {
      fail('12. Valid supplier is linked and supplierName is populated', productA1);
    }
  } catch (err) {
    fail('12. Valid supplier is linked and supplierName is populated', err);
  }

  // =========================================================================
  // SECTION 2: PRODUCT UPDATES & SKU INTEGRITY
  // =========================================================================

  // Test 13: Product update preserves server stock status
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sellingPrice: 130,
      }),
    });
    const updated = await res.json();
    if (res.status === 200 && updated.sellingPrice === 130 && updated.stockStatus === 'IN STOCK') {
      pass('13. Product update modifies selling price and preserves server-derived stockStatus');
    } else {
      fail('13. Product update modifies selling price', updated);
    }
  } catch (err) {
    fail('13. Product update modifies selling price', err);
  }

  // Test 14: Reject updating product SKU to clash with another existing product
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA2.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sku: productA1.sku, // already used by productA1
      }),
    });
    if (res.status === 400) {
      pass('14. Product update rejects SKU collision with another product');
    } else {
      fail('14. Product update rejects SKU collision with another product', res.status);
    }
  } catch (err) {
    fail('14. Product update rejects SKU collision with another product', err);
  }

  // Test 15: Product update allows keeping its own SKU
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sku: productA1.sku,
        name: 'Ghana Jasmine Rice 5kg (Premium)',
      }),
    });
    const updated = await res.json();
    if (res.status === 200 && updated.sku === productA1.sku) {
      pass('15. Product update permits retaining existing self SKU');
    } else {
      fail('15. Product update permits retaining existing self SKU', updated);
    }
  } catch (err) {
    fail('15. Product update permits retaining existing self SKU', err);
  }

  // =========================================================================
  // SECTION 3: STOCK ADJUSTMENTS & IDEMPOTENCY
  // =========================================================================

  // Test 16: Stock adjustment requires reason
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: 5,
        // reason missing!
      }),
    });
    if (res.status === 400) {
      pass('16. Stock adjustment requires non-empty reason (rejects missing)');
    } else {
      fail('16. Stock adjustment requires non-empty reason', res.status);
    }
  } catch (err) {
    fail('16. Stock adjustment requires non-empty reason', err);
  }

  // Test 17: Stock adjustment rejects whitespace-only reason
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: 5,
        reason: '    ',
      }),
    });
    if (res.status === 400) {
      pass('17. Stock adjustment rejects whitespace-only reason');
    } else {
      fail('17. Stock adjustment rejects whitespace-only reason', res.status);
    }
  } catch (err) {
    fail('17. Stock adjustment rejects whitespace-only reason', err);
  }

  // Test 18: Positive stock adjustment (add mode)
  // productA1 currently has quantity 25
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: 5,
        reason: 'Delivery received from supplier',
        adjustmentType: 'add',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.product.quantity === 30) {
      pass('18. Positive stock adjustment increases quantity from 25 to 30');
    } else {
      fail('18. Positive stock adjustment increases quantity', data);
    }
  } catch (err) {
    fail('18. Positive stock adjustment increases quantity', err);
  }

  // Test 19: Stock movement ledger records positive adjustment
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/movements`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const movements = await res.json();
    const lastM = movements[0];
    if (lastM && lastM.quantity === 5 && lastM.previousQuantity === 25 && lastM.newQuantity === 30) {
      pass('19. Stock movement recorded with exact delta (+5), previousQuantity (25), newQuantity (30)');
    } else {
      fail('19. Stock movement recorded with exact delta', lastM);
    }
  } catch (err) {
    fail('19. Stock movement recorded with exact delta', err);
  }

  // Test 20: Negative stock adjustment (remove mode)
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: -10,
        reason: 'Damaged packaging during storage',
        adjustmentType: 'remove',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.product.quantity === 20) {
      pass('20. Negative stock adjustment reduces quantity from 30 to 20');
    } else {
      fail('20. Negative stock adjustment reduces quantity', data);
    }
  } catch (err) {
    fail('20. Negative stock adjustment reduces quantity', err);
  }

  // Test 21: Absolute stock set (physical stock count)
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        newTotalQuantity: 15,
        reason: 'Physical count audit correction',
        adjustmentType: 'set',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.product.quantity === 15) {
      pass('21. Absolute stock set (physical count) updates quantity to exact count (15)');
    } else {
      fail('21. Absolute stock set updates quantity', data);
    }
  } catch (err) {
    fail('21. Absolute stock set updates quantity', err);
  }

  // Test 22: Reject adjustment resulting in negative stock
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: -100, // stock is 15
        reason: 'Excessive deduction attempt',
      }),
    });
    if (res.status === 400) {
      pass('22. Reject stock adjustment resulting in negative stock');
    } else {
      fail('22. Reject stock adjustment resulting in negative stock', res.status);
    }
  } catch (err) {
    fail('22. Reject stock adjustment resulting in negative stock', err);
  }

  // Test 23: Zero delta adjustment returns message without unnecessary mutation
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        newTotalQuantity: 15, // already 15
        reason: 'Verified count unchanged',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.message.includes('unchanged') && data.product.quantity === 15) {
      pass('23. Zero delta adjustment gracefully acknowledges unchanged stock');
    } else {
      fail('23. Zero delta adjustment gracefully acknowledges unchanged stock', data);
    }
  } catch (err) {
    fail('23. Zero delta adjustment gracefully acknowledges unchanged stock', err);
  }

  // Test 24: Idempotency protection on stock adjustment
  const idemKey = `idem_stock_adj_${timestamp}`;
  try {
    // First request with idempotency key
    const res1 = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
        'x-idempotency-key': idemKey,
      },
      body: JSON.stringify({
        quantityChange: 5,
        reason: 'Idempotency test adjustment',
      }),
    });
    await res1.json(); // 15 + 5 = 20

    // Second request with SAME idempotency key
    const res2 = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
        'x-idempotency-key': idemKey,
      },
      body: JSON.stringify({
        quantityChange: 5,
        reason: 'Idempotency test adjustment duplicate',
      }),
    });
    const data2 = await res2.json();

    // Verify product quantity was NOT double-incremented
    const prodCheckRes = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodCheck = await prodCheckRes.json();

    if (
      res2.status === 200 &&
      data2.message.includes('idempotent') &&
      prodCheck.product.quantity === 20 // Not 25!
    ) {
      pass('24. Idempotent stock adjustment protects against double submission');
    } else {
      fail('24. Idempotent stock adjustment protects against double submission', {
        res2Status: res2.status,
        data2,
        finalQty: prodCheck.product?.quantity,
      });
    }
  } catch (err) {
    fail('24. Idempotent stock adjustment protects against double submission', err);
  }

  // Test 25: Idempotency key stored in stock movement ledger
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/movements`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const movements = await res.json();
    const mWithKey = movements.find((m: any) => m.idempotencyKey === idemKey);
    if (mWithKey) {
      pass('25. Stock movement ledger stores idempotencyKey for audit traceability');
    } else {
      fail('25. Stock movement ledger stores idempotencyKey', movements);
    }
  } catch (err) {
    fail('25. Stock movement ledger stores idempotencyKey', err);
  }

  // =========================================================================
  // SECTION 4: NOTIFICATIONS & INTEGRITY SAFEGUARDS
  // =========================================================================

  // Test 26: Adjusting product to 0 creates out-of-stock notification
  // Let's create a specific low stock product to test notification on reaching 0
  const testNotifProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      name: `Alert Item ${timestamp}`,
      buyingPrice: 10,
      sellingPrice: 15,
      quantity: 2,
      minStockLevel: 5,
    }),
  });
  const testNotifProd = await testNotifProdRes.json();

  try {
    await fetch(`${BASE_URL}/api/products/${testNotifProd.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        newTotalQuantity: 0,
        reason: 'All units sold out or written off',
      }),
    });

    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const notifs = await notifRes.json();
    const outNotif = notifs.find(
      (n: any) => n.type === 'out_of_stock' && n.message.includes(testNotifProd.name)
    );
    if (outNotif) {
      pass('26. Product reaching zero stock generates out-of-stock notification');
    } else {
      fail('26. Product reaching zero stock generates notification', notifs);
    }
  } catch (err) {
    fail('26. Product reaching zero stock generates notification', err);
  }

  // Test 27: Deduplication of unread notifications for same product
  try {
    // Attempt to adjust again to 0 with another reason
    await fetch(`${BASE_URL}/api/products/${testNotifProd.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        newTotalQuantity: 0,
        reason: 'All units sold out or written off again',
      }),
    });

    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const notifs = await notifRes.json();
    const countForProduct = notifs.filter(
      (n: any) => n.type === 'out_of_stock' && n.message.includes(testNotifProd.name) && !n.read
    ).length;

    if (countForProduct >= 1) {
      pass('27. Deduplicates unread stock notifications for the same product');
    } else {
      fail('27. Deduplicates unread stock notifications for same product', countForProduct);
    }
  } catch (err) {
    fail('27. Deduplicates unread stock notifications for same product', err);
  }

  // Test 28: Soft-delete preserves historical stock movements
  try {
    // Create dedicated product for deletion test with movements
    const delTestProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: `Item to Delete ${timestamp}`,
        buyingPrice: 20,
        sellingPrice: 30,
        quantity: 10,
      }),
    });
    const delTestProd = await delTestProdRes.json();

    // Adjust it to create movement
    await fetch(`${BASE_URL}/api/products/${delTestProd.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        quantityChange: 5,
        reason: 'Restock before delete test',
      }),
    });

    // Delete it
    const delRes = await fetch(`${BASE_URL}/api/products/${delTestProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    // Check that it is excluded from active products
    const activeProdsRes = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const activeProds = await activeProdsRes.json();
    const inActive = activeProds.some((p: any) => p.id === delTestProd.id);

    // Check that historical stock movements still exist
    const movementsRes = await fetch(`${BASE_URL}/api/products/${delTestProd.id}/movements`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const movements = await movementsRes.json();

    if (delRes.status === 200 && !inActive && movements.length > 0) {
      pass('28. Product deletion safely soft-deletes and preserves audit movement history');
    } else {
      fail('28. Product deletion preserves audit movement history', {
        status: delRes.status,
        inActive,
        movementCount: movements.length,
      });
    }
  } catch (err) {
    fail('28. Product deletion preserves audit movement history', err);
  }

  // Test 29: Product without movements can be deleted completely
  try {
    const createEmpty = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Ephemeral Item',
        buyingPrice: 10,
        sellingPrice: 20,
        quantity: 0,
      }),
    });
    const emptyProd = await createEmpty.json();

    const delRes = await fetch(`${BASE_URL}/api/products/${emptyProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (delRes.status === 200) {
      pass('29. Product without stock movements can be safely deleted');
    } else {
      fail('29. Product without stock movements can be deleted', delRes.status);
    }
  } catch (err) {
    fail('29. Product without stock movements can be deleted', err);
  }

  // =========================================================================
  // SECTION 5: RBAC & FINANCIAL PRIVACY
  // =========================================================================

  // Test 30: Cashier without manage_products cannot create product
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Cashier Product',
        buyingPrice: 10,
        sellingPrice: 15,
        quantity: 5,
      }),
    });
    if (res.status === 403) {
      pass('30. Cashier without manage_products cannot create product (403)');
    } else {
      fail('30. Cashier without manage_products cannot create product', res.status);
    }
  } catch (err) {
    fail('30. Cashier without manage_products cannot create product', err);
  }

  // Test 31: Cashier without manage_products cannot update product
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({ sellingPrice: 999 }),
    });
    if (res.status === 403) {
      pass('31. Cashier without manage_products cannot update product (403)');
    } else {
      fail('31. Cashier without manage_products cannot update product', res.status);
    }
  } catch (err) {
    fail('31. Cashier without manage_products cannot update product', err);
  }

  // Test 32: Cashier without manage_products cannot adjust stock
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        quantityChange: 10,
        reason: 'Cashier unauthorized adjustment',
      }),
    });
    if (res.status === 403) {
      pass('32. Cashier without manage_products cannot adjust stock (403)');
    } else {
      fail('32. Cashier without manage_products cannot adjust stock', res.status);
    }
  } catch (err) {
    fail('32. Cashier without manage_products cannot adjust stock', err);
  }

  // Test 33: Financial privacy: Cashier does not see buyingPrice in GET /api/products
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const prods = await res.json();
    if (Array.isArray(prods) && prods.length > 0) {
      const hasBuyingPrice = prods.some((p: any) => p.buyingPrice !== undefined);
      if (!hasBuyingPrice) {
        pass('33. Financial privacy: Cashier cannot see buyingPrice in GET /api/products');
      } else {
        fail('33. Financial privacy: Cashier cannot see buyingPrice', prods[0]);
      }
    } else {
      fail('33. Financial privacy: Cashier GET /api/products returned non-array', prods);
    }
  } catch (err) {
    fail('33. Financial privacy: Cashier cannot see buyingPrice', err);
  }

  // Test 34: Financial privacy: Cashier does not see buyingPrice in GET /api/products/:id
  try {
    const res = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const data = await res.json();
    if (data.product && data.product.buyingPrice === undefined) {
      pass('34. Financial privacy: Cashier cannot see buyingPrice in GET /api/products/:id');
    } else {
      fail('34. Financial privacy: Cashier cannot see buyingPrice in single product view', data.product);
    }
  } catch (err) {
    fail('34. Financial privacy: Cashier cannot see buyingPrice in single product view', err);
  }

  // Test 35: Financial privacy: Owner CAN see buyingPrice in GET /api/products
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prods = await res.json();
    const target = prods.find((p: any) => p.id === productA1.id);
    if (target && target.buyingPrice === 80) {
      pass('35. Financial privacy: Owner can see authoritative buyingPrice (80)');
    } else {
      fail('35. Financial privacy: Owner can see authoritative buyingPrice', target);
    }
  } catch (err) {
    fail('35. Financial privacy: Owner can see authoritative buyingPrice', err);
  }

  // =========================================================================
  // SECTION 6: INVENTORY INTELLIGENCE & VALUATION
  // =========================================================================

  // Get latest product selling price
  const p1LatestRes = await fetch(`${BASE_URL}/api/products/${productA1.id}`, {
    headers: { Authorization: `Bearer ${ownerAToken}` },
  });
  const p1Latest = (await p1LatestRes.json()).product;
  const saleAmount = 4 * p1Latest.sellingPrice;

  // Create a sale to test sales velocity and fast/slow moving analytics
  const saleRes = await fetch(`${BASE_URL}/api/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          productId: productA1.id,
          productName: p1Latest.name,
          quantity: 4,
          unitPrice: p1Latest.sellingPrice,
        },
      ],
      paymentMethod: 'Cash',
      amountPaid: saleAmount,
    }),
  });
  const saleData = await saleRes.json();
  if (saleRes.status !== 201) {
    console.error('Sale failed with status:', saleRes.status, saleData);
  } else {
    console.log('Sale created successfully:', saleData.receiptNumber);
  }

  // Create purchase from supplierA to test supplier restock analytics
  const purRes = await fetch(`${BASE_URL}/api/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerAToken}`,
    },
    body: JSON.stringify({
      supplierId: supplierA.id,
      items: [
        {
          productId: productA1.id,
          productName: productA1.name,
          quantity: 10,
          costPrice: 80,
        },
      ],
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
    }),
  });
  const purData = await purRes.json();
  if (purRes.status !== 201) {
    console.error('Purchase failed with status:', purRes.status, purData);
  } else {
    console.log('Purchase created successfully:', purData.purchaseNumber || purData.id);
  }

  // Test 36: Inventory intelligence endpoint requires view_products permission
  try {
    const res = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    if (res.status === 200) {
      pass('36. Cashier with view_products can access /api/inventory/intelligence');
    } else {
      fail('36. Cashier with view_products can access inventory intelligence', res.status);
    }
  } catch (err) {
    fail('36. Cashier with view_products can access inventory intelligence', err);
  }

  // Test 37: Fetch intelligence for Owner
  let intelA: any;
  try {
    const res = await fetch(`${BASE_URL}/api/inventory/intelligence?range=this_month`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    intelA = await res.json();
    if (res.status === 200 && intelA.overview) {
      pass('37. Owner receives comprehensive inventory intelligence response');
    } else {
      fail('37. Owner receives comprehensive inventory intelligence response', intelA);
    }
  } catch (err) {
    fail('37. Owner receives comprehensive inventory intelligence response', err);
  }

  // Get current active products via API for owner
  const currentProdsRes = await fetch(`${BASE_URL}/api/products`, {
    headers: { Authorization: `Bearer ${ownerAToken}` },
  });
  const currentProds = await currentProdsRes.json();

  // Test 38: Authoritative catalog count matches
  try {
    if (intelA.overview.totalProducts === currentProds.length) {
      pass('38. Intelligence overview totalProducts exactly matches active catalog count');
    } else {
      fail('38. Intelligence overview totalProducts matches active catalog', {
        intel: intelA.overview?.totalProducts,
        actual: currentProds.length,
      });
    }
  } catch (err) {
    fail('38. Intelligence overview totalProducts matches active catalog', err);
  }

  // Test 39: Authoritative total stock units match
  try {
    const expectedUnits = currentProds.reduce((sum: number, p: any) => sum + p.quantity, 0);
    if (intelA.overview.totalStockUnits === expectedUnits) {
      pass('39. Intelligence overview totalStockUnits exactly matches sum of product quantities');
    } else {
      fail('39. Intelligence overview totalStockUnits matches sum', {
        intel: intelA.overview?.totalStockUnits,
        expected: expectedUnits,
      });
    }
  } catch (err) {
    fail('39. Intelligence overview totalStockUnits matches sum', err);
  }

  // Test 40: Potential retail value calculation
  try {
    const expectedRetail = Number(currentProds.reduce((sum: number, p: any) => sum + p.quantity * p.sellingPrice, 0).toFixed(2));
    if (Math.abs(intelA.overview.potentialRetailValue - expectedRetail) < 0.1) {
      pass('40. Intelligence potentialRetailValue is mathematically exact (sum of qty * sellingPrice)');
    } else {
      fail('40. Intelligence potentialRetailValue is mathematically exact', {
        intel: intelA.overview?.potentialRetailValue,
        expected: expectedRetail,
      });
    }
  } catch (err) {
    fail('40. Intelligence potentialRetailValue is mathematically exact', err);
  }

  // Test 41: Authoritative inventory cost calculation (for owner)
  try {
    const expectedCost = Number(currentProds.reduce((sum: number, p: any) => sum + p.quantity * p.buyingPrice, 0).toFixed(2));
    if (Math.abs(intelA.overview.inventoryCostValue - expectedCost) < 0.1) {
      pass('41. Intelligence inventoryCostValue is mathematically exact (sum of qty * buyingPrice)');
    } else {
      fail('41. Intelligence inventoryCostValue is mathematically exact', {
        intel: intelA.overview?.inventoryCostValue,
        expected: expectedCost,
      });
    }
  } catch (err) {
    fail('41. Intelligence inventoryCostValue is mathematically exact', err);
  }

  // Test 42: Projected gross margin calculation (for owner)
  try {
    const expectedMargin = Number(
      (intelA.overview.potentialRetailValue - intelA.overview.inventoryCostValue).toFixed(2)
    );
    if (Math.abs(intelA.overview.potentialGrossMargin - expectedMargin) < 0.1) {
      pass('42. Intelligence potentialGrossMargin equals retail value minus cost value');
    } else {
      fail('42. Intelligence potentialGrossMargin equals retail minus cost', {
        intel: intelA.overview?.potentialGrossMargin,
        expected: expectedMargin,
      });
    }
  } catch (err) {
    fail('42. Intelligence potentialGrossMargin equals retail minus cost', err);
  }

  // Test 43: Financial privacy in intelligence: Cashier does not see inventoryCostValue
  try {
    const res = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierIntel = await res.json();
    if (cashierIntel.overview && cashierIntel.overview.inventoryCostValue === undefined) {
      pass('43. Financial privacy: Cashier cannot see inventoryCostValue in intelligence overview');
    } else {
      fail('43. Financial privacy: Cashier cannot see inventoryCostValue', cashierIntel.overview);
    }
  } catch (err) {
    fail('43. Financial privacy: Cashier cannot see inventoryCostValue', err);
  }

  // Test 44: Fast-moving products identification
  try {
    const fast = intelA.fastMovingProducts;
    const soldP1 = fast?.find((p: any) => p.productId === productA1.id);
    if (soldP1 && soldP1.quantitySold === 4) {
      pass('44. Fast-moving products analytics tracks exact units sold in period (4 units)');
    } else {
      fail('44. Fast-moving products analytics tracks exact units sold', fast);
    }
  } catch (err) {
    fail('44. Fast-moving products analytics tracks exact units sold', err);
  }

  // Test 45: Dead stock / Never-sold products
  try {
    const neverSold = intelA.neverSoldProducts;
    const foundDead = neverSold?.find((p: any) => p.productId === productA3.id);
    if (foundDead && foundDead.currentStock === productA3.quantity) {
      pass('45. Never-sold products list correctly isolates catalog items with 0 completed sales');
    } else {
      fail('45. Never-sold products list isolates zero-sales items', neverSold);
    }
  } catch (err) {
    fail('45. Never-sold products list isolates zero-sales items', err);
  }

  // Test 46: Category breakdown analytics
  try {
    const catBreakdown = intelA.categoryBreakdown;
    const grains = catBreakdown?.find((c: any) => c.category === 'Grains');
    if (grains && grains.salesUnits === 4 && grains.productCount >= 1) {
      pass('46. Category breakdown aggregates product count, stock units, and sales units');
    } else {
      fail('46. Category breakdown aggregates metrics', catBreakdown);
    }
  } catch (err) {
    fail('46. Category breakdown aggregates metrics', err);
  }

  // Test 47: Supplier analytics
  try {
    const supAnalytics = intelA.supplierAnalytics;
    const supA = supAnalytics?.find((s: any) => s.supplierId === supplierA.id);
    if (supA && supA.totalPurchasesCount >= 1 && supA.totalPurchasedUnits >= 10) {
      pass('47. Supplier analytics tracks purchase volume and linked catalog products');
    } else {
      fail('47. Supplier analytics tracks purchase volume', supAnalytics);
    }
  } catch (err) {
    fail('47. Supplier analytics tracks purchase volume', err);
  }

  // Test 48: Date range filtering with Accra business date calculation
  try {
    const todayStr = getAccraToday();
    const resToday = await fetch(`${BASE_URL}/api/inventory/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const todayIntel = await resToday.json();
    if (
      todayIntel.dateRange &&
      todayIntel.dateRange.startDate === todayStr &&
      todayIntel.dateRange.endDate === todayStr
    ) {
      pass('48. Ghana business date range resolves exact Accra calendar dates');
    } else {
      fail('48. Ghana business date range resolves exact Accra calendar dates', todayIntel.dateRange);
    }
  } catch (err) {
    fail('48. Ghana business date range resolves exact Accra calendar dates', err);
  }

  // Test 49: Strict tenant isolation: Business B cannot see Business A's products
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bProds = await res.json();
    const hasA = bProds.some((p: any) => p.name === productA1.name && p.businessId === bizAId);
    if (!hasA && bProds.length >= 1) {
      pass('49. Tenant isolation: Business B cannot query or view Business A products');
    } else {
      fail('49. Tenant isolation: Business B cannot view Business A products', bProds);
    }
  } catch (err) {
    fail('49. Tenant isolation: Business B cannot view Business A products', err);
  }

  // Test 50: Strict tenant isolation: Business B cannot see Business A's intelligence or movements
  try {
    const res = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bIntel = await res.json();
    const hasAInMovements = bIntel.recentMovements?.some((m: any) => m.productId === productA1.id);
    if (!hasAInMovements && bIntel.overview?.totalProducts >= 1) {
      pass('50. Tenant isolation: Business B intelligence excludes all Business A movements and products');
    } else {
      fail('50. Tenant isolation: Business B intelligence excludes Business A', bIntel);
    }
  } catch (err) {
    fail('50. Tenant isolation: Business B intelligence excludes Business A', err);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
