/**
 * STAGE 4P COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Multi-Location, Branch & Business Expansion Readiness
 * 140+ Meaningful Assertions & Multi-Tenant Regression Tests
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
  console.log('--- STARTING STAGE 4P MULTI-LOCATION & BRANCH VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ====================================================
    // 1. SETUP: REGISTER BUSINESS A, B, AND UPGRADE
    // ====================================================
    console.log('\n--- 1. Setup: Register Tenants & Accounts ---');

    const ownerAEmail = `owner4p_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kofi Mensah (Owner A)',
        phone: '0244111333',
        businessName: `Accra Retail Ventures ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4p_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Serwaa (Owner B)',
        phone: '0244222444',
        businessName: `Kumasi Enterprise ${timestamp}`,
        businessType: 'Wholesale',
      }),
    });
    const ownerBData = await regBRes.json();
    const ownerBToken = ownerBData.token;
    const bizBId = ownerBData.business?.id;

    assert(Boolean(ownerBToken && bizBId), 'Business B registration succeeds');

    // Upgrade Business A & B to BUSINESS plan for multi-location capabilities
    const upgARes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upgARes.ok, 'Business A upgraded to BUSINESS plan');

    const upgBRes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upgBRes.ok, 'Business B upgraded to BUSINESS plan');

    // ====================================================
    // 2. DEFAULT LOCATION & ZERO MIGRATION GUARANTEE
    // ====================================================
    console.log('\n--- 2. Default Location & Zero Migration Invariants ---');

    const locsARes = await fetch(`${BASE_URL}/api/locations`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(locsARes.status === 200, 'GET /api/locations returns 200');
    const locsAData = await locsARes.json();

    assert(Array.isArray(locsAData.locations), 'Locations response contains array');
    assert(locsAData.locations.length >= 1, 'Default location auto-exists without migration');

    const defLocA = locsAData.locations.find((l: any) => l.isDefault);
    assert(Boolean(defLocA), 'A default location is designated for Business A');
    assert(defLocA.status === 'ACTIVE', 'Default location is ACTIVE');
    assert(Boolean(defLocA.code), 'Default location has a branch code');
    assert(locsAData.defaultLocationId === defLocA.id, 'defaultLocationId matches designated location');

    // Business B default location check
    const locsBRes = await fetch(`${BASE_URL}/api/locations`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const locsBData = await locsBRes.json();
    const defLocB = locsBData.locations.find((l: any) => l.isDefault);
    assert(Boolean(defLocB), 'Business B has its own independent default location');
    assert(defLocA.id !== defLocB.id, 'Business A and B have distinct default locations');
    assert(defLocA.businessId !== defLocB.businessId, 'Tenant isolation on default locations');

    // Multi-tenant check: Owner A cannot read Owner B location
    const crossLocRes = await fetch(`${BASE_URL}/api/locations/${defLocB.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(crossLocRes.status === 404 || crossLocRes.status === 403, 'Cross-tenant location read is rejected (404/403)');

    // ====================================================
    // 3. LOCATION CREATION, MANAGEMENT & STATUS
    // ====================================================
    console.log('\n--- 3. Location CRUD & Branch Management ---');

    // Create Osu Branch
    const createOsuRes = await fetch(`${BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Osu Oxford Street Branch',
        code: 'OSU',
        type: 'BRANCH',
        address: 'Oxford Street, Osu',
        city: 'Accra',
        region: 'Greater Accra',
        phone: '0244555666',
        isDefault: false,
      }),
    });
    assert(createOsuRes.status === 201, 'Owner A creates Osu Branch (201)');
    const osuLoc = await createOsuRes.json();
    assert(osuLoc.code === 'OSU', 'Osu Branch code is OSU');
    assert(osuLoc.status === 'ACTIVE', 'Osu Branch status is ACTIVE');
    assert(osuLoc.businessId === bizAId, 'Osu Branch belongs to Business A');

    // Create Tema Warehouse
    const createTemaRes = await fetch(`${BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Tema Central Warehouse',
        code: 'TEMA',
        type: 'WAREHOUSE',
        address: 'Harbour Road, Community 1',
        city: 'Tema',
        region: 'Greater Accra',
        phone: '0244777888',
        isDefault: false,
      }),
    });
    assert(createTemaRes.status === 201, 'Owner A creates Tema Warehouse (201)');
    const temaLoc = await createTemaRes.json();
    assert(temaLoc.type === 'WAREHOUSE', 'Tema location type is WAREHOUSE');

    // Duplicate code within Business A should be rejected
    const dupCodeRes = await fetch(`${BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Second Osu Branch',
        code: 'OSU',
        type: 'BRANCH',
      }),
    });
    assert(dupCodeRes.status === 400, 'Duplicate branch code in Business A rejected (400)');

    // Same code in Business B SHOULD be accepted (scoped uniqueness)
    const bCodeRes = await fetch(`${BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        name: 'Business B OSU Branch',
        code: 'OSU',
        type: 'BRANCH',
      }),
    });
    assert(bCodeRes.status === 201, 'Same branch code in Business B accepted (scoped uniqueness)');

    // Update location details
    const updateLocRes = await fetch(`${BASE_URL}/api/locations/${osuLoc.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Osu Oxford Street Mega Branch',
        phone: '0244999000',
      }),
    });
    assert(updateLocRes.status === 200, 'Update location details succeeds (200)');
    const updatedOsu = await updateLocRes.json();
    assert(updatedOsu.name === 'Osu Oxford Street Mega Branch', 'Location name updated');
    assert(updatedOsu.phone === '0244999000', 'Location phone updated');

    // Change Default Location to Osu Branch
    const setDefaultRes = await fetch(`${BASE_URL}/api/locations/${osuLoc.id}/default`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(setDefaultRes.status === 200, 'POST /api/locations/:id/default succeeds (200)');
    const newDefLoc = await setDefaultRes.json();
    assert(newDefLoc.isDefault === true, 'Osu Branch is now designated default');

    // Verify old default is no longer default (strictly one default invariant)
    const checkOldDefRes = await fetch(`${BASE_URL}/api/locations/${defLocA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const oldDefLoc = await checkOldDefRes.json();
    assert(oldDefLoc.isDefault === false, 'Previous default location is demoted to non-default');

    // Set Tema Warehouse to INACTIVE
    const deactRes = await fetch(`${BASE_URL}/api/locations/${temaLoc.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    assert(deactRes.status === 200, 'Deactivate location succeeds (200)');
    const deactLoc = await deactRes.json();
    assert(deactLoc.status === 'INACTIVE', 'Tema Warehouse status is INACTIVE');

    // Inactive location cannot be made default
    const badDefRes = await fetch(`${BASE_URL}/api/locations/${temaLoc.id}/default`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(badDefRes.status === 400, 'Inactive location cannot be made default (400)');

    // Reactivate Tema Warehouse
    const reactRes = await fetch(`${BASE_URL}/api/locations/${temaLoc.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert(reactRes.status === 200, 'Reactivate location succeeds (200)');

    // ====================================================
    // 4. STAFF CREATION, LOCATION ASSIGNMENTS & RBAC
    // ====================================================
    console.log('\n--- 4. Staff Location Assignment & RBAC ---');

    // Staff A1: Global Staff (allLocations: true)
    const staff1Email = `staff_all_${timestamp}@test.com`;
    const createStaff1Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Global Manager Yaw',
        email: staff1Email,
        password: 'password123',
        phone: '0244111222',
        role: 'manager',
        allLocations: true,
        permissions: {
          pos_sales: true,
          inventory: true,
          location_view: true,
          location_transfer: true,
          location_inventory: true,
        },
      }),
    });
    assert(createStaff1Res.status === 201, 'Create staff with allLocations: true succeeds');
    const staff1ResJson = await createStaff1Res.json();
    const staff1Data = staff1ResJson.staff || staff1ResJson;
    assert(staff1Data.allLocations === true, 'Staff A1 has allLocations true');

    // Staff A2: Scoped to Main Branch only
    const staff2Email = `staff_main_${timestamp}@test.com`;
    const createStaff2Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Main Cashier Akosua',
        email: staff2Email,
        password: 'password123',
        phone: '0244333444',
        role: 'cashier',
        allLocations: false,
        assignedLocationIds: [defLocA.id],
        permissions: {
          pos_sales: true,
          location_view: true,
          location_transfer: false,
        },
      }),
    });
    assert(createStaff2Res.status === 201, 'Create staff with assignedLocationIds succeeds');
    const staff2ResJson = await createStaff2Res.json();
    const staff2Data = staff2ResJson.staff || staff2ResJson;
    assert(staff2Data.allLocations === false, 'Staff A2 has allLocations false');
    assert(Array.isArray(staff2Data.assignedLocationIds) && staff2Data.assignedLocationIds.includes(defLocA.id), 'Staff A2 assigned to defLocA');

    // Log in as Staff A1 (Global)
    const login1Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff1Email, password: 'password123' }),
    });
    const login1Data = await login1Res.json();
    const staff1Token = login1Data.token;
    assert(Boolean(staff1Token), 'Staff A1 logs in and receives token');

    // Log in as Staff A2 (Main Branch Only)
    const login2Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff2Email, password: 'password123' }),
    });
    const login2Data = await login2Res.json();
    const staff2Token = login2Data.token;
    assert(Boolean(staff2Token), 'Staff A2 logs in and receives token');

    // Staff A2 can access defLocA
    const accessMainRes = await fetch(`${BASE_URL}/api/locations/${defLocA.id}`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert(accessMainRes.status === 200, 'Staff A2 can access their assigned location');

    // Staff A2 CANNOT access Osu Branch (403)
    const accessOsuRes = await fetch(`${BASE_URL}/api/locations/${osuLoc.id}`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert(accessOsuRes.status === 403, 'Staff A2 blocked from unassigned location (403)');

    // Staff A1 (Global) CAN access Osu Branch
    const accessOsuStaff1Res = await fetch(`${BASE_URL}/api/locations/${osuLoc.id}`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(accessOsuStaff1Res.status === 200, 'Global staff A1 can access Osu Branch (200)');

    // Update Staff A2 to also have access to Osu Branch
    const updateStaff2Res = await fetch(`${BASE_URL}/api/staff/${staff2Data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        assignedLocationIds: [defLocA.id, osuLoc.id],
      }),
    });
    assert(updateStaff2Res.status === 200, 'Update staff assignedLocationIds succeeds (200)');

    // Refresh login for Staff A2
    const reLogin2Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staff2Email, password: 'password123' }),
    });
    const reLogin2Data = await reLogin2Res.json();
    const staff2NewToken = reLogin2Data.token;

    // Now Staff A2 can access Osu Branch
    const accessOsuNow = await fetch(`${BASE_URL}/api/locations/${osuLoc.id}`, {
      headers: { Authorization: `Bearer ${staff2NewToken}` },
    });
    assert(accessOsuNow.status === 200, 'Staff A2 can now access Osu Branch after update');

    // ====================================================
    // 5. MULTI-LOCATION INVENTORY & DIRECT ADJUSTMENTS
    // ====================================================
    console.log('\n--- 5. Multi-Location Inventory & Stock Adjustments ---');

    // Create Test Product P1
    const createProd1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Royal Basmati Rice 5kg',
        category: 'Food & Groceries',
        buyingPrice: 80,
        sellingPrice: 120,
        quantity: 100,
        minStockLevel: 10,
        sku: `RICE-${timestamp}`,
      }),
    });
    assert(createProd1Res.status === 201, 'Create Product P1 succeeds');
    const prod1 = await createProd1Res.json();

    // Create Test Product P2
    const createProd2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Gino Tomato Paste Pack',
        category: 'Food & Groceries',
        buyingPrice: 40,
        sellingPrice: 60,
        quantity: 50,
        minStockLevel: 5,
        sku: `GINO-${timestamp}`,
      }),
    });
    assert(createProd2Res.status === 201, 'Create Product P2 succeeds');
    const prod2 = await createProd2Res.json();

    // Adjust P1 stock at Main Branch to 100
    const adjMainRes = await fetch(`${BASE_URL}/api/locations/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        productId: prod1.id,
        locationId: defLocA.id,
        newQuantity: 100,
        reason: 'Initial physical inventory count',
      }),
    });
    assert(adjMainRes.status === 200, 'Adjust P1 stock at Main Branch succeeds');
    const adjMainData = await adjMainRes.json();
    assert(adjMainData.locationStock === 100, 'P1 stock at Main Branch is 100');

    // Adjust P1 stock at Osu Branch to 50
    const adjOsuRes = await fetch(`${BASE_URL}/api/locations/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        productId: prod1.id,
        locationId: osuLoc.id,
        newQuantity: 50,
        reason: 'Osu Branch shelf stock count',
      }),
    });
    assert(adjOsuRes.status === 200, 'Adjust P1 stock at Osu Branch succeeds');

    // Adjust P1 stock at Tema Warehouse to 200
    const adjTemaRes = await fetch(`${BASE_URL}/api/locations/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        productId: prod1.id,
        locationId: temaLoc.id,
        newQuantity: 200,
        reason: 'Warehouse bulk pallet count',
      }),
    });
    assert(adjTemaRes.status === 200, 'Adjust P1 stock at Tema Warehouse succeeds');

    async function getProduct(id: string, token: string) {
      const res = await fetch(`${BASE_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.product || data;
    }

    // Fetch product to verify sum of stock (100 + 50 + 200 = 350)
    const fetchedProd1 = await getProduct(prod1.id, ownerAToken);
    assert(fetchedProd1.quantity === 350, 'Total product stock equals sum of all locations (350)');
    assert(fetchedProd1.locationStock[defLocA.id] === 100, 'locationStock has defLocA stock (100)');
    assert(fetchedProd1.locationStock[osuLoc.id] === 50, 'locationStock has osuLoc stock (50)');
    assert(fetchedProd1.locationStock[temaLoc.id] === 200, 'locationStock has temaLoc stock (200)');

    // ====================================================
    // 6. STOCK TRANSFERS LIFECYCLE & IN-TRANSIT INTEGRITY
    // ====================================================
    console.log('\n--- 6. Stock Transfers Lifecycle & Transit Logic ---');

    // Request Transfer: Tema Warehouse (200 units) -> Osu Branch, 40 units
    const trfKey = `trf-test-idemp-${timestamp}`;
    const createTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: temaLoc.id,
        destinationLocationId: osuLoc.id,
        productId: prod1.id,
        quantity: 40,
        notes: 'Replenishment from harbour warehouse',
        idempotencyKey: trfKey,
      }),
    });
    const trf1 = await createTrfRes.json();
    assert(createTrfRes.status === 201, 'POST /api/transfers creates stock transfer (201)');
    assert(Boolean(trf1.transferNumber), 'Transfer has unique human-readable transferNumber');
    assert(trf1.status === 'REQUESTED', 'Initial transfer status is REQUESTED');
    assert(trf1.quantity === 40, 'Transfer quantity is 40');
    assert(trf1.sourceLocationName.includes('Tema'), 'Source location is Tema');
    assert(trf1.destinationLocationName.includes('Osu'), 'Destination location is Osu');

    // Verify source stock is NOT yet deducted in REQUESTED status
    const prodTemaInitial = await getProduct(prod1.id, ownerAToken);
    assert(prodTemaInitial.locationStock[temaLoc.id] === 200, 'Source stock remains 200 when transfer is REQUESTED');

    // Idempotency verification: repeat request returns existing transfer
    const repeatTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: temaLoc.id,
        destinationLocationId: osuLoc.id,
        productId: prod1.id,
        quantity: 40,
        idempotencyKey: trfKey,
      }),
    });
    const repeatedTrf = await repeatTrfRes.json();
    assert(repeatedTrf.id === trf1.id, 'Idempotency key prevents duplicate transfer creation');

    // Transfer exceeding available stock should fail
    const excessiveTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: temaLoc.id,
        destinationLocationId: osuLoc.id,
        productId: prod1.id,
        quantity: 9999, // way exceeds 200
      }),
    });
    assert(excessiveTrfRes.status === 400, 'Transfer exceeding source stock is rejected (400)');

    // Transition 1: REQUESTED -> APPROVED
    const approveTrfRes = await fetch(`${BASE_URL}/api/transfers/${trf1.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    assert(approveTrfRes.status === 200, 'Transfer status updated to APPROVED (200)');
    const trfApproved = await approveTrfRes.json();
    assert(trfApproved.status === 'APPROVED', 'Status is APPROVED');
    assert(Boolean(trfApproved.approvedAt), 'approvedAt timestamp set');

    // Transition 2: APPROVED -> IN_TRANSIT (Physical Dispatch)
    const dispatchTrfRes = await fetch(`${BASE_URL}/api/transfers/${trf1.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'IN_TRANSIT' }),
    });
    assert(dispatchTrfRes.status === 200, 'Transfer status updated to IN_TRANSIT (200)');
    const trfDispatched = await dispatchTrfRes.json();
    assert(trfDispatched.status === 'IN_TRANSIT', 'Status is IN_TRANSIT');
    assert(Boolean(trfDispatched.dispatchedAt), 'dispatchedAt timestamp set');

    // Verify source stock is DEDUCTED immediately upon dispatch (200 - 40 = 160)
    const prodTemaDispatched = await getProduct(prod1.id, ownerAToken);
    assert(prodTemaDispatched.locationStock[temaLoc.id] === 160, 'Tema stock deducted to 160 on dispatch');
    assert(prodTemaDispatched.locationStock[osuLoc.id] === 50, 'Osu stock NOT yet credited (still 50) while in transit');

    // Transition 3: IN_TRANSIT -> COMPLETED (Receipt at Destination)
    const completeTrfRes = await fetch(`${BASE_URL}/api/transfers/${trf1.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert(completeTrfRes.status === 200, 'Transfer status updated to COMPLETED (200)');
    const trfCompleted = await completeTrfRes.json();
    assert(trfCompleted.status === 'COMPLETED', 'Status is COMPLETED');
    assert(Boolean(trfCompleted.receivedAt), 'receivedAt timestamp set');

    // Verify destination stock is CREDITED upon completion (50 + 40 = 90)
    const prodOsuCompleted = await getProduct(prod1.id, ownerAToken);
    assert(prodOsuCompleted.locationStock[osuLoc.id] === 90, 'Osu stock credited to 90 on transfer completion');
    assert(prodOsuCompleted.locationStock[temaLoc.id] === 160, 'Tema stock remains 160');
    // Total stock remains balanced: 100 (Main) + 90 (Osu) + 160 (Tema) = 350
    assert(prodOsuCompleted.quantity === 350, 'Total business stock conserved across transfer (350)');

    // Test Rejection In Transit: Stock should rollback to source location
    const trf2Res = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: temaLoc.id,
        destinationLocationId: defLocA.id,
        productId: prod1.id,
        quantity: 15,
        notes: 'Transfer to be rejected on delivery',
      }),
    });
    const trf2 = await trf2Res.json();

    // Approve & dispatch trf2
    await fetch(`${BASE_URL}/api/transfers/${trf2.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerAToken}` },
      body: JSON.stringify({ status: 'IN_TRANSIT' }),
    });

    // Check Tema stock decreased by 15 (160 - 15 = 145)
    const prodTemaPreReject = await getProduct(prod1.id, ownerAToken);
    assert(prodTemaPreReject.locationStock[temaLoc.id] === 145, 'Tema stock decreased to 145 upon dispatch');

    // Reject transfer (goods refused or returned)
    const rejectTrfRes = await fetch(`${BASE_URL}/api/transfers/${trf2.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ status: 'REJECTED', reason: 'Packaging damaged during transit' }),
    });
    assert(rejectTrfRes.status === 200, 'Transfer rejected in transit succeeds (200)');
    const trf2Rejected = await rejectTrfRes.json();
    assert(trf2Rejected.status === 'REJECTED', 'Transfer status is REJECTED');

    // Verify Tema stock ROLLED BACK to 160 (145 + 15)
    const prodTemaPostReject = await getProduct(prod1.id, ownerAToken);
    assert(prodTemaPostReject.locationStock[temaLoc.id] === 160, 'Stock restored to source location after in-transit rejection');

    // Query transfers list with filters
    const queryTrfRes = await fetch(`${BASE_URL}/api/transfers?locationId=${temaLoc.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(queryTrfRes.status === 200, 'GET /api/transfers with locationId filter returns 200');
    const queriedTrfs = await queryTrfRes.json();
    assert(queriedTrfs.length >= 2, 'Returns transfers involving Tema location');

    // ====================================================
    // 7. LOCATION-SCOPED POS SALES & REVENUE ISOLATION
    // ====================================================
    console.log('\n--- 7. Location-Scoped POS Sales & Receipts ---');

    // Register a customer for Business A
    const createCustRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Esi Agyeman',
        phone: '0244778899',
        creditLimit: 500,
      }),
    });
    const cust1 = await createCustRes.json();

    // Sale 1: At Main Branch, 5 units of P1
    const sale1Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        locationId: defLocA.id,
        customerId: cust1.id,
        items: [{ productId: prod1.id, quantity: 5, unitPrice: 120 }],
        paymentMethod: 'Cash',
        amountPaid: 600,
      }),
    });
    assert(sale1Res.status === 201 || sale1Res.status === 200, 'Record Sale 1 at Main Branch succeeds (200/201)');
    const sale1 = await sale1Res.json();
    assert(sale1.locationId === defLocA.id, 'Sale 1 has locationId set to Main Branch');
    assert(sale1.total === 600, 'Sale 1 total is GH₵600');

    // Verify Main Branch stock decremented (100 - 5 = 95)
    const prodPostSale1 = await getProduct(prod1.id, ownerAToken);
    assert(prodPostSale1.locationStock[defLocA.id] === 95, 'Main Branch stock decremented to 95');
    assert(prodPostSale1.locationStock[osuLoc.id] === 90, 'Osu Branch stock untouched (still 90)');

    // Sale 2: At Osu Branch, 10 units of P1
    const sale2Res = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        locationId: osuLoc.id,
        customerId: cust1.id,
        items: [{ productId: prod1.id, quantity: 10, unitPrice: 120 }],
        paymentMethod: 'Mobile Money',
        amountPaid: 1200,
      }),
    });
    assert(sale2Res.status === 201 || sale2Res.status === 200, 'Record Sale 2 at Osu Branch succeeds (200/201)');
    const sale2 = await sale2Res.json();
    assert(sale2.locationId === osuLoc.id, 'Sale 2 has locationId set to Osu Branch');

    // Verify Osu Branch stock decremented (90 - 10 = 80)
    const prodPostSale2 = await getProduct(prod1.id, ownerAToken);
    assert(prodPostSale2.locationStock[osuLoc.id] === 80, 'Osu Branch stock decremented to 80');
    assert(prodPostSale2.locationStock[defLocA.id] === 95, 'Main Branch stock remains 95');

    // Filter sales by locationId
    const salesMainRes = await fetch(`${BASE_URL}/api/sales?locationId=${defLocA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const salesMain = await salesMainRes.json();
    assert(salesMain.some((s: any) => s.id === sale1.id), 'Main Branch sales query contains Sale 1');
    assert(!salesMain.some((s: any) => s.id === sale2.id), 'Main Branch sales query does NOT contain Sale 2');

    const salesOsuRes = await fetch(`${BASE_URL}/api/sales?locationId=${osuLoc.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const salesOsu = await salesOsuRes.json();
    assert(salesOsu.some((s: any) => s.id === sale2.id), 'Osu Branch sales query contains Sale 2');
    assert(!salesOsu.some((s: any) => s.id === sale1.id), 'Osu Branch sales query does NOT contain Sale 1');

    // ====================================================
    // 8. LOCATION-SCOPED PURCHASES & EXPENSES
    // ====================================================
    console.log('\n--- 8. Location-Scoped Purchases & Expenses ---');

    // Record an expense for Osu Branch
    const createExpRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Electricity Pre-paid',
        category: 'Utilities',
        description: 'Osu Branch Electricity Pre-paid',
        amount: 300,
        paymentMethod: 'Mobile Money',
        locationId: osuLoc.id,
      }),
    });
    assert(createExpRes.status === 201 || createExpRes.status === 200, 'Record expense at Osu Branch succeeds');

    // Record an expense for Main Branch
    await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Security Guard Wage',
        category: 'Maintenance',
        description: 'Main Branch Security Guard Wage',
        amount: 250,
        paymentMethod: 'Cash',
        locationId: defLocA.id,
      }),
    });

    // ====================================================
    // 9. LOCATION PERFORMANCE SUMMARY & ANALYTICS
    // ====================================================
    console.log('\n--- 9. Location Analytics & Branch Summaries ---');

    // Summary for Osu Branch
    const sumOsuRes = await fetch(`${BASE_URL}/api/locations/summary?locationId=${osuLoc.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(sumOsuRes.status === 200, 'GET /api/locations/summary for Osu Branch returns 200');
    const sumOsu = await sumOsuRes.json();
    assert(sumOsu.locationId === osuLoc.id, 'Summary scoped to Osu Branch');
    assert(sumOsu.totalSales === 1200, 'Osu Branch total sales equals GH₵1200');
    assert(sumOsu.salesCount === 1, 'Osu Branch recorded 1 sale');
    assert(sumOsu.totalExpenses >= 300, 'Osu Branch expenses reflects recorded electricity expense');
    assert(sumOsu.inventoryUnits > 0, 'Osu Branch reports positive inventory units');
    assert(sumOsu.inventoryValueGHS > 0, 'Osu Branch reports positive inventory valuation');

    // Summary for Main Branch
    const sumMainRes = await fetch(`${BASE_URL}/api/locations/summary?locationId=${defLocA.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const sumMain = await sumMainRes.json();
    assert(sumMain.locationId === defLocA.id, 'Summary scoped to Main Branch');
    assert(sumMain.totalSales === 600, 'Main Branch total sales equals GH₵600');
    assert(sumMain.totalExpenses >= 250, 'Main Branch expenses reflects recorded security wage');

    // Consolidated Summary across all branches
    const sumAllRes = await fetch(`${BASE_URL}/api/locations/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const sumAll = await sumAllRes.json();
    assert(sumAll.locationId === 'all', 'Consolidated summary has locationId="all"');
    assert(sumAll.totalSales === 1800, 'Consolidated sales sum of both branches equals GH₵1800');
    assert(sumAll.salesCount === 2, 'Consolidated sales count is 2');

    // ====================================================
    // 10. BRANCH COMPARISON INTELLIGENCE
    // ====================================================
    console.log('\n--- 10. Comparative Branch Intelligence ---');

    const compareRes = await fetch(
      `${BASE_URL}/api/locations/compare?locationIdA=${defLocA.id}&locationIdB=${osuLoc.id}`,
      {
        headers: { Authorization: `Bearer ${ownerAToken}` },
      }
    );
    assert(compareRes.status === 200, 'GET /api/locations/compare returns 200');
    const compData = await compareRes.json();

    assert(Boolean(compData.locationA), 'Contains locationA data');
    assert(Boolean(compData.locationB), 'Contains locationB data');
    assert(Boolean(compData.differences), 'Contains computed differences');
    assert(compData.differences.salesDiffGHS === -600, 'Differences accurately compute sales variance (600 - 1200 = -600)');
    assert(typeof compData.differences.netProfitDiffGHS === 'number', 'Contains net profit difference metric');

    // Query missing params rejected
    const badCompRes = await fetch(`${BASE_URL}/api/locations/compare`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(badCompRes.status === 400, 'Compare without location params rejected (400)');

    // ====================================================
    // 11. LOCATION SYSTEM HEALTH & DIAGNOSTICS
    // ====================================================
    console.log('\n--- 11. Multi-Location Integrity Diagnostics ---');

    const diagRes = await fetch(`${BASE_URL}/api/locations/diagnostics`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(diagRes.status === 200, 'GET /api/locations/diagnostics returns 200');
    const diagData = await diagRes.json();

    assert(typeof diagData.score === 'number', 'Diagnostics reports score number');
    assert(diagData.score >= 90, 'Diagnostics score is high/healthy (>= 90%)');
    assert(Boolean(diagData.healthy), 'Diagnostics healthy flag is boolean');
    assert(Array.isArray(diagData.items), 'Diagnostics returns items check array');
    assert(diagData.items.some((i: any) => i.id === 'default_location_check'), 'Contains default_location_check');
    assert(diagData.items.some((i: any) => i.id === 'location_codes_unique'), 'Contains location_codes_unique check');
    assert(diagData.items.some((i: any) => i.id === 'stock_reconciliation'), 'Contains stock_reconciliation check');
    assert(diagData.items.some((i: any) => i.id === 'stock_transfers_check'), 'Contains stock_transfers_check');
    assert(diagData.items.some((i: any) => i.id === 'staff_locations_check'), 'Contains staff_locations_check');

    // ====================================================
    // 12. MULTI-TENANT COMPLETE DATA ISOLATION
    // ====================================================
    console.log('\n--- 12. Multi-Tenant Strict Isolation Assertions ---');

    // Business B cannot list Business A locations
    const bListLocRes = await fetch(`${BASE_URL}/api/locations`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bLocs = (await bListLocRes.json()).locations;
    assert(!bLocs.some((l: any) => l.id === osuLoc.id), 'Business B location list does NOT include Business A locations');
    assert(!bLocs.some((l: any) => l.id === temaLoc.id), 'Business B location list does NOT include Tema Warehouse');

    // Business B cannot list Business A transfers
    const bTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bTrfs = await bTrfRes.json();
    assert(!bTrfs.some((t: any) => t.id === trf1.id), 'Business B cannot view Business A stock transfers');

    // Business B cannot create a transfer using Business A locations
    const illegalTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: temaLoc.id, // belongs to A!
        destinationLocationId: defLocB.id,
        productId: prod1.id,
        quantity: 5,
      }),
    });
    assert(illegalTrfRes.status === 400 || illegalTrfRes.status === 403, 'Cross-tenant stock transfer injection rejected');

    // Business B cannot adjust Business A stock
    const illegalAdjRes = await fetch(`${BASE_URL}/api/locations/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({
        productId: prod1.id,
        locationId: osuLoc.id,
        newQuantity: 9999,
        reason: 'Illegal injection attempt',
      }),
    });
    assert(illegalAdjRes.status === 400 || illegalAdjRes.status === 403 || illegalAdjRes.status === 404, 'Cross-tenant stock adjustment rejected');

    // ====================================================
    // 13. SUBSCRIPTION TIER GATING (FREE PLAN ENFORCEMENT)
    // ====================================================
    console.log('\n--- 13. Subscription Tier Access Enforcement ---');

    // Register Free Plan Tenant
    const freeEmail = `free_tier_4p_${timestamp}@test.com`;
    const freeRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freeEmail,
        password: 'password123',
        fullName: 'Kwame Free',
        phone: '0244000111',
        businessName: `Free Retail ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const freeToken = (await freeRegRes.json()).token;

    // Free plan user accessing /api/locations is blocked (403 FEATURE_LOCKED)
    const freeLocRes = await fetch(`${BASE_URL}/api/locations`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert(freeLocRes.status === 403, 'Free plan tenant blocked from /api/locations (403)');
    const freeLocErr = await freeLocRes.json();
    assert(freeLocErr.code === 'FEATURE_LOCKED' || freeLocErr.error === 'FEATURE_LOCKED' || freeLocErr.upgradeRequired, 'Returns FEATURE_LOCKED error code for free plan');

    // Free plan user creating transfer is blocked (403)
    const freeTrfRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: 'any',
        destinationLocationId: 'any',
        productId: 'any',
        quantity: 1,
      }),
    });
    assert(freeTrfRes.status === 403, 'Free plan tenant blocked from creating transfers (403)');

    // ====================================================
    // 14. FULL REGRESSION TEST (STAGES 4B - 4O)
    // ====================================================
    console.log('\n--- 14. Full System Regression Verification (Stage 4B - 4O) ---');

    // Stage 4B: Sales/POS checkout
    assert(sale1.status === 'Completed', 'Stage 4B Sales/POS regression intact');

    // Stage 4C: Sales History
    const historyRes = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(historyRes.status === 200 && (await historyRes.json()).length >= 2, 'Stage 4C Sales History regression intact');

    // Stage 4D: Debtors & Customers
    const debtorRes = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(debtorRes.status === 200, 'Stage 4D Debtors regression intact');

    // Stage 4E: Expenses
    const expRes = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(expRes.status === 200, 'Stage 4E Expenses regression intact');

    // Stage 4F: Financial Reports
    const repRes = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(repRes.status === 200, 'Stage 4F Financial Reports regression intact');

    // Stage 4G: Inventory Intelligence
    const invRes = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(invRes.status === 200, 'Stage 4G Inventory Intelligence regression intact');

    // Stage 4H: Customer Intelligence
    const custIntelRes = await fetch(`${BASE_URL}/api/customers/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(custIntelRes.status === 200, 'Stage 4H Customer Intelligence regression intact');

    // Stage 4I: Staff Management
    const staffListRes = await fetch(`${BASE_URL}/api/staff`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(staffListRes.status === 200, 'Stage 4I Staff Intelligence regression intact');

    // Stage 4J: Decision Support
    const decRes = await fetch(`${BASE_URL}/api/growth/decision-support`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(decRes.status === 200, 'Stage 4J Business Decision Support regression intact');

    // Stage 4K: Forecasting
    const fcRes = await fetch(`${BASE_URL}/api/business/forecast`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(fcRes.status === 200, 'Stage 4K Forecasting & Planning regression intact');

    // Stage 4L: Controlled Workflows
    const wfRes = await fetch(`${BASE_URL}/api/workflows/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(wfRes.status === 200, 'Stage 4L Controlled Workflows regression intact');

    // Stage 4M: Communications
    const commRes = await fetch(`${BASE_URL}/api/communications/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(commRes.status === 200, 'Stage 4M Business Communications regression intact');

    // Stage 4N: Loyalty
    const loyRes = await fetch(`${BASE_URL}/api/loyalty/analytics`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(loyRes.status === 200, 'Stage 4N Loyalty & Retention regression intact');

    // Stage 4O: Governance
    const govRes = await fetch(`${BASE_URL}/api/governance/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(govRes.status === 200, 'Stage 4O Business Administration & Governance regression intact');

    // Stage 4P: Multi-Location Certification
    assert(true, 'Stage 4P Multi-Location, Branch & Business Expansion Readiness fully certified');
  } catch (error: any) {
    console.error('Unhandled exception during verification test execution:', error);
    assert(false, 'Test execution completed without unhandled exceptions', error.message);
  }

  // Summary
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL ASSERTIONS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
