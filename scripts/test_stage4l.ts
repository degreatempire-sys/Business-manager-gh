/**
 * STAGE 4L COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Controlled Business Automation, Workflows & Operational Assistance
 * 100+ Assertions & Regression Tests
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
  console.log('--- STARTING STAGE 4L CONTROLLED AUTOMATION & WORKFLOWS VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // SETUP: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4l_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kwame Asante (Owner A)',
        phone: '0244999111',
        businessName: `Accra Central Supermarket ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4l_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Serwaa (Owner B)',
        phone: '0244999222',
        businessName: `Kumasi Enterprise Supplies ${timestamp}`,
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

    // Create Staff 1 for Business A (Restricted financial reports)
    const staff1Email = `staff4l_1_${timestamp}@test.com`;
    const staff1Res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Yaw Osei (Staff Restricted)',
        email: staff1Email,
        phone: '0244999333',
        password: 'password123',
        role: 'cashier',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          financial_reports: false,
          business_settings: false,
        },
      }),
    });
    const staff1Data = await staff1Res.json();
    const staff1Id = staff1Data.staff?.id || staff1Data.id;
    assert(Boolean(staff1Id), 'Staff 1 created with restricted financial permissions');

    // Authenticate Staff 1
    const staff1Auth = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staff1Email,
        password: 'password123',
      }),
    });
    const staff1AuthData = await staff1Auth.json();
    const staff1Token = staff1AuthData.token;
    assert(Boolean(staff1Token), 'Staff 1 authenticated successfully');

    // Seed Business A with Inventory (one low stock, one normal)
    const prod1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Ideal Milk 160g',
        category: 'Dairy',
        buyingPrice: 8.0,
        sellingPrice: 12.0,
        quantity: 2,
        minStockLevel: 10,
        unit: 'tin',
      }),
    });
    const prod1 = await prod1Res.json();

    const prod2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Gino Tomato Paste 70g',
        category: 'Groceries',
        buyingPrice: 3.5,
        sellingPrice: 5.0,
        quantity: 50,
        minStockLevel: 10,
        unit: 'sachet',
      }),
    });
    const prod2 = await prod2Res.json();
    assert(Boolean(prod1?.id && prod2?.id), 'Test products seeded in Business A');

    // Seed a Customer with overdue debt
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Sister Mansa',
        phone: '0201112233',
        email: `mansa_${timestamp}@example.com`,
        address: 'Madina Market',
      }),
    });
    const cust = await custRes.json();
    assert(Boolean(cust?.id), 'Test customer Sister Mansa created');

    // Record a credit sale (unpaid) to Sister Mansa
    const saleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        items: [
          {
            productId: prod2.id,
            name: prod2.name,
            price: 5.0,
            quantity: 20,
            subtotal: 100.0,
          },
        ],
        subtotal: 100.0,
        discount: 0,
        tax: 0,
        total: 100.0,
        paymentMethod: 'Credit',
        amountPaid: 0,
        paymentStatus: 'Credit',
      }),
    });
    const sale = await saleRes.json();
    assert(Boolean(sale?.id), 'Credit sale recorded for Sister Mansa (100 GHS unpaid debt)');

    // ----------------------------------------------------
    // 1. AUTHENTICATION & RBAC
    // ----------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & RBAC ---');
    const unauthTasks = await fetch(`${BASE_URL}/api/tasks`);
    assert(unauthTasks.status === 401, 'Unauthenticated request to /api/tasks is rejected (401)');

    const unauthRules = await fetch(`${BASE_URL}/api/workflows/rules`);
    assert(unauthRules.status === 401, 'Unauthenticated request to /api/workflows/rules is rejected (401)');

    const badTokenRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: 'Bearer invalid_garbage_token' },
    });
    assert(badTokenRes.status === 401, 'Tampered token is rejected (401)');

    // Staff without business_settings cannot update rules
    const staffRulesPut = await fetch(`${BASE_URL}/api/workflows/rules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staff1Token}`,
      },
      body: JSON.stringify({
        stockCoverageDaysThreshold: 15,
      }),
    });
    assert(staffRulesPut.status === 403, 'Restricted staff cannot update automation rules (403)');

    // Owner CAN update rules
    const ownerRulesPut = await fetch(`${BASE_URL}/api/workflows/rules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        stockCoverageDaysThreshold: 12,
        minStockRestockAlert: true,
      }),
    });
    assert(ownerRulesPut.status === 200, 'Business owner can update automation rules (200)');
    const updatedRules = await ownerRulesPut.json();
    assert(updatedRules.stockCoverageDaysThreshold === 12, 'Updated rule value is reflected');

    // ----------------------------------------------------
    // 2. TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- 2. TENANT ISOLATION ---');

    // Business B evaluates workflows
    const bizBEval = await fetch(`${BASE_URL}/api/workflows/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(bizBEval.status === 200, 'Business B can evaluate its own workflows');

    const bizBTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBTasks = await bizBTasksRes.json();
    assert(Array.isArray(bizBTasks), 'Business B returns tasks array');

    // Verify Business B tasks do not mention Business A products or customers
    const hasAInB = bizBTasks.some(
      (t: any) =>
        t.title.includes('Ideal Milk') ||
        t.title.includes('Sister Mansa') ||
        t.description.includes('Ideal Milk')
    );
    assert(!hasAInB, 'Business B task list is completely isolated from Business A data');

    // Business B summary is isolated
    const bizBSummaryRes = await fetch(`${BASE_URL}/api/workflows/summary`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBSummary = await bizBSummaryRes.json();
    assert(bizBSummary.businessId === bizBId, 'Business B summary strictly scoped to Business B');

    // ----------------------------------------------------
    // 3. WORKFLOW EVALUATION ENGINE (BUSINESS A)
    // ----------------------------------------------------
    console.log('\n--- 3. WORKFLOW EVALUATION ENGINE ---');

    const evalRes = await fetch(`${BASE_URL}/api/workflows/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(evalRes.status === 200, 'POST /api/workflows/evaluate succeeds (200)');
    const evalData = await evalRes.json();
    assert(evalData.success === true, 'Workflow evaluation reports success === true');
    assert(typeof evalData.generatedCount === 'number', 'generatedCount is returned');
    assert(evalData.generatedCount >= 2, 'Generated at least 2 operational tasks (low stock + scheduled review)');

    // Verify tasks generated in Business A
    const tasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const tasks = await tasksRes.json();
    assert(Array.isArray(tasks), 'GET /api/tasks returns array');
    assert(tasks.length >= 2, 'Tasks array contains generated tasks');

    // Check Inventory Intelligence Task for Ideal Milk
    const milkTask = tasks.find((t: any) => t.source === 'Inventory Intelligence' && t.title.includes('Ideal Milk'));
    assert(Boolean(milkTask), 'Low stock task for "Ideal Milk 160g" was generated');
    if (milkTask) {
      assert(milkTask.priority === 'critical' || milkTask.priority === 'high', 'Low stock task has high/critical priority');
      assert(milkTask.sourceEntityId === prod1.id, 'Task correctly references product ID');
      assert(milkTask.actionUrl === '/products', 'Task provides actionUrl to /products');
      assert(Boolean(milkTask.actionLabel), 'Task provides descriptive actionLabel');
      assert(Boolean(milkTask.evidence), 'Task includes structured evidence object');
      assert(milkTask.evidence.currentValue === 2, 'Evidence accurately states current stock of 2');
    }

    // Check Scheduled Review Task
    const reviewTask = tasks.find((t: any) => t.source === 'Scheduled Review');
    assert(Boolean(reviewTask), 'Daily Operations Review task was generated');
    if (reviewTask) {
      assert(reviewTask.priority === 'normal', 'Daily review task has normal priority');
      assert(reviewTask.actionUrl === '/dashboard', 'Daily review task directs to /dashboard');
    }

    // ----------------------------------------------------
    // 4. DEDUPLICATION & IDEMPOTENCY
    // ----------------------------------------------------
    console.log('\n--- 4. DEDUPLICATION & IDEMPOTENCY ---');

    const countBefore = tasks.length;
    // Run evaluation again immediately
    const eval2Res = await fetch(`${BASE_URL}/api/workflows/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const eval2Data = await eval2Res.json();
    assert(eval2Data.generatedCount === 0, 'Successive evaluation generates 0 duplicate tasks (idempotent)');

    const tasks2Res = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const tasks2 = await tasks2Res.json();
    assert(tasks2.length === countBefore, 'Active task count remains exactly identical after duplicate run');

    // ----------------------------------------------------
    // 5. FINANCIAL PRIVACY FOR RESTRICTED STAFF
    // ----------------------------------------------------
    console.log('\n--- 5. FINANCIAL PRIVACY ---');

    // Staff 1 fetches tasks
    const staffTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(staffTasksRes.status === 200, 'Staff can access /api/tasks (200)');
    const staffTasks = await staffTasksRes.json();

    // Check that financial task amounts or debt details are sanitized for staff
    const debtTaskStaff = staffTasks.find((t: any) => t.source === 'Debt Management');
    if (debtTaskStaff) {
      assert(!debtTaskStaff.title.includes('GH₵'), 'Staff debt task title does not expose exact amount');
      assert(debtTaskStaff.evidence?.currentValue === undefined, 'Staff debt task evidence strips numeric debt balance');
    } else {
      const hasUnmaskedAmounts = staffTasks.some((t: any) => t.description.includes('Gross Profit'));
      assert(!hasUnmaskedAmounts, 'Restricted staff task descriptions contain no confidential profit data');
    }

    // ----------------------------------------------------
    // 6. TASK LIFECYCLE & MUTATIONS
    // ----------------------------------------------------
    console.log('\n--- 6. TASK LIFECYCLE & MUTATIONS ---');

    // Create a manual task
    const createManualRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Inspect Freezer Temperature',
        description: 'Verify temperature is below -18C at 10 AM',
        priority: 'high',
        dueDate: '2026-09-20',
      }),
    });
    assert(createManualRes.status === 201, 'POST /api/tasks creates manual task (201)');
    const manualTask = await createManualRes.json();
    assert(manualTask.title === 'Inspect Freezer Temperature', 'Task title matches');
    assert(manualTask.source === 'Manual', 'Source is set to Manual');
    assert(manualTask.status === 'pending', 'Initial status is pending');
    assert(manualTask.priority === 'high', 'Priority matches');

    // Fetch single task by ID
    const getSingleRes = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(getSingleRes.status === 200, 'GET /api/tasks/:id retrieves task (200)');
    const singleTask = await getSingleRes.json();
    assert(singleTask.id === manualTask.id, 'Retrieved task ID matches');

    // Update task
    const updateRes = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        description: 'Updated: verify freezer and chiller temperatures',
        priority: 'critical',
      }),
    });
    assert(updateRes.status === 200, 'PUT /api/tasks/:id updates task (200)');
    const updatedTask = await updateRes.json();
    assert(updatedTask.description.includes('chiller'), 'Description updated');
    assert(updatedTask.priority === 'critical', 'Priority updated to critical');

    // Snooze task
    const snoozeRes = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ hours: 48 }),
    });
    assert(snoozeRes.status === 200, 'POST /api/tasks/:id/snooze succeeds (200)');
    const snoozedTask = await snoozeRes.json();
    assert(snoozedTask.status === 'snoozed', 'Status is snoozed');
    assert(Boolean(snoozedTask.snoozedUntil), 'snoozedUntil timestamp is set');

    // Complete task
    const completeRes = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(completeRes.status === 200, 'POST /api/tasks/:id/complete succeeds (200)');
    const completedTask = await completeRes.json();
    assert(completedTask.status === 'completed', 'Task status is completed');
    assert(Boolean(completedTask.completedAt), 'completedAt timestamp is recorded');
    assert(Boolean(completedTask.completedBy), 'completedBy user is recorded');

    // Delete task
    const deleteRes = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(deleteRes.status === 200, 'DELETE /api/tasks/:id succeeds (200)');
    const deleteData = await deleteRes.json();
    assert(deleteData.success === true, 'Task deletion confirmed');

    // Confirm task is deleted
    const verifyDeleted = await fetch(`${BASE_URL}/api/tasks/${manualTask.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(verifyDeleted.status === 404, 'Deleted task returns 404 on subsequent get');

    // ----------------------------------------------------
    // 7. OPERATIONS CENTER SUMMARY & METRICS
    // ----------------------------------------------------
    console.log('\n--- 7. OPERATIONS CENTER SUMMARY & METRICS ---');

    const summaryRes = await fetch(`${BASE_URL}/api/workflows/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(summaryRes.status === 200, 'GET /api/workflows/summary returns 200');
    const summary = await summaryRes.json();

    assert(summary.businessId === bizAId, 'Summary belongs to Business A');
    assert(typeof summary.totalPending === 'number', 'totalPending is a valid number');
    assert(typeof summary.dueToday === 'number', 'dueToday is a valid number');
    assert(typeof summary.overdue === 'number', 'overdue is a valid number');
    assert(typeof summary.critical === 'number', 'critical count is a valid number');
    assert(typeof summary.completedCount === 'number', 'completedCount is a valid number');
    assert(typeof summary.bySource === 'object', 'bySource breakdown exists');
    assert(typeof summary.byPriority === 'object', 'byPriority breakdown exists');
    assert(summary.generatedAt !== undefined, 'generatedAt timestamp exists');

    // ----------------------------------------------------
    // 8. READ-ONLY SAFETY (NO UNINTENDED MUTATIONS)
    // ----------------------------------------------------
    console.log('\n--- 8. READ-ONLY SAFETY ---');

    // Verify products quantity and prices are completely untouched by workflows
    const prodCheckRes = await fetch(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const prodsAfter = await prodCheckRes.json();
    const prod1After = prodsAfter.find((p: any) => p.id === prod1.id);
    assert(prod1After.quantity === 2, 'Product quantity remained exactly 2 (no unrequested stock change)');
    assert(prod1After.sellingPrice === 12.0, 'Product selling price remained untouched');

    // Verify customer balance remains untouched
    const custCheckRes = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custsAfter = await custCheckRes.json();
    const cust1After = custsAfter.find((c: any) => c.id === cust.id);
    assert(Boolean(cust1After), 'Customer record intact');

    // ----------------------------------------------------
    // 9. FILTERING CAPABILITIES
    // ----------------------------------------------------
    console.log('\n--- 9. FILTERING CAPABILITIES ---');

    // Filter by priority
    const criticalFilterRes = await fetch(`${BASE_URL}/api/tasks?priority=critical`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const criticalTasks = await criticalFilterRes.json();
    assert(
      criticalTasks.every((t: any) => t.priority === 'critical'),
      'Filter ?priority=critical returns only critical tasks'
    );

    // Filter by source
    const inventoryFilterRes = await fetch(`${BASE_URL}/api/tasks?source=Inventory%20Intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const inventoryTasks = await inventoryFilterRes.json();
    assert(
      inventoryTasks.every((t: any) => t.source === 'Inventory Intelligence'),
      'Filter ?source=Inventory Intelligence returns only inventory tasks'
    );

    // Filter active
    const activeFilterRes = await fetch(`${BASE_URL}/api/tasks?status=active`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const activeTasks = await activeFilterRes.json();
    assert(
      activeTasks.every((t: any) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'snoozed'),
      'Filter ?status=active returns only pending, in_progress, or snoozed tasks'
    );

    // ----------------------------------------------------
    // 10. ADVANCED WORKFLOW SCENARIOS & FILTERING
    // ----------------------------------------------------
    console.log('\n--- 10. ADVANCED WORKFLOW SCENARIOS & FILTERING ---');

    // Create another task assigned specifically to Staff 1
    const staffTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: 'Count Bakery Shelf Inventory',
        description: 'Take physical count of rolls and pastries',
        priority: 'normal',
        assignedToId: staff1Id,
        dueDate: '2026-01-01', // intentionally past date to test overdue
      }),
    });
    assert(staffTaskRes.status === 201, 'Task created with staff assignment and past due date');
    const staffTask = await staffTaskRes.json();
    assert(staffTask.assignedToId === staff1Id, 'Task assignedToId is preserved');
    assert(staffTask.assignedToName?.includes('Yaw'), 'Task assignedToName is populated');

    // Test filter ?assignedTo=me when logged in as staff 1
    const myTasksRes = await fetch(`${BASE_URL}/api/tasks?assignedTo=me`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert(myTasksRes.status === 200, 'GET /api/tasks?assignedTo=me returns 200');
    const myTasks = await myTasksRes.json();
    assert(
      myTasks.every((t: any) => t.assignedToId === staff1Id),
      'Filter ?assignedTo=me returns only tasks assigned to the logged-in staff'
    );
    assert(myTasks.some((t: any) => t.id === staffTask.id), 'Assigned task appears in myTasks');

    // Test search filter
    const searchRes = await fetch(`${BASE_URL}/api/tasks?search=Bakery`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(searchRes.status === 200, 'GET /api/tasks?search=Bakery returns 200');
    const searchTasks = await searchRes.json();
    assert(
      searchTasks.length >= 1 && searchTasks.every((t: any) => t.title.toLowerCase().includes('bakery')),
      'Search query filter correctly returns matched tasks'
    );

    // Test overdue filter
    const overdueRes = await fetch(`${BASE_URL}/api/tasks?overdue=true`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(overdueRes.status === 200, 'GET /api/tasks?overdue=true returns 200');
    const overdueTasks = await overdueRes.json();
    assert(
      overdueTasks.some((t: any) => t.id === staffTask.id),
      'Past due date task correctly returned by ?overdue=true'
    );

    // Test dismiss task
    const dismissRes = await fetch(`${BASE_URL}/api/tasks/${staffTask.id}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(dismissRes.status === 200, 'POST /api/tasks/:id/dismiss succeeds (200)');
    const dismissedTask = await dismissRes.json();
    assert(dismissedTask.status === 'dismissed', 'Task status changed to dismissed');
    assert(Boolean(dismissedTask.dismissedAt), 'dismissedAt is populated');
    assert(Boolean(dismissedTask.dismissedBy), 'dismissedBy is populated');

    // ----------------------------------------------------
    // 11. AUDIT TRAIL LOGGING
    // ----------------------------------------------------
    console.log('\n--- 11. AUDIT TRAIL LOGGING ---');

    const adminAuditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAuditRes.status === 200, 'Admin can access audit logs');
    const auditLogs = await adminAuditRes.json();
    assert(Array.isArray(auditLogs), 'Audit logs is an array');

    const bizAAudits = auditLogs.filter((l: any) => l.businessId === bizAId);
    assert(bizAAudits.length >= 4, 'Audit logs recorded multiple operational actions for Business A');

    const hasCreateTask = bizAAudits.some((l: any) => l.action === 'CREATE_TASK');
    assert(hasCreateTask, 'Audit trail contains CREATE_TASK record');

    const hasCompleteTask = bizAAudits.some((l: any) => l.action === 'COMPLETE_TASK');
    assert(hasCompleteTask, 'Audit trail contains COMPLETE_TASK record');

    const hasUpdateRules = bizAAudits.some((l: any) => l.action === 'UPDATE_AUTOMATION_RULES');
    assert(hasUpdateRules, 'Audit trail contains UPDATE_AUTOMATION_RULES record');

    const hasDeleteTask = bizAAudits.some((l: any) => l.action === 'DELETE_TASK');
    assert(hasDeleteTask, 'Audit trail contains DELETE_TASK record');

    // ----------------------------------------------------
    // 12. ACCRA DATE TIME INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- 12. ACCRA DATE TIME INTEGRITY ---');

    const allTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const allTasks = await allTasksRes.json();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const validDueDates = allTasks.filter((t: any) => t.dueDate).every((t: any) => dateRegex.test(t.dueDate));
    assert(validDueDates, 'All task dueDate values strictly adhere to YYYY-MM-DD Accra calendar format');

    const validCreatedAts = allTasks.every((t: any) => !isNaN(new Date(t.createdAt).getTime()));
    assert(validCreatedAts, 'All task createdAt timestamps are valid ISO dates');
  } catch (err: any) {
    console.error('Test suite caught exception:', err);
    assert(false, 'Test suite run without uncaught exceptions', err?.message);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`STAGE 4L RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
