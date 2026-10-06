/**
 * STAGE 4M COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Business Communications, Customer Engagement & Controlled Outreach
 * 105+ Assertions & Regression Tests
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
  console.log('--- STARTING STAGE 4M BUSINESS COMMUNICATIONS & ENGAGEMENT VERIFICATION SUITE ---\n');

  const BASE_URL = 'http://localhost:3000';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // SETUP: Register Business A and Business B
    // ----------------------------------------------------
    const ownerAEmail = `owner4m_a_${timestamp}@test.com`;
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerAEmail,
        password: 'password123',
        fullName: 'Kofi Mensah (Owner A)',
        phone: '0244123456',
        businessName: `Accra Mart ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerAData = await regARes.json();
    const ownerAToken = ownerAData.token;
    const bizAId = ownerAData.business?.id;

    assert(Boolean(ownerAToken && bizAId), 'Business A registration succeeds');

    const ownerBEmail = `owner4m_b_${timestamp}@test.com`;
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerBEmail,
        password: 'password123',
        fullName: 'Ama Serwaa (Owner B)',
        phone: '0209876543',
        businessName: `Kumasi Plaza ${timestamp}`,
        businessType: 'Wholesale',
      }),
    });
    const ownerBData = await regBRes.json();
    const ownerBToken = ownerBData.token;
    const bizBId = ownerBData.business?.id;

    assert(Boolean(ownerBToken && bizBId), 'Business B registration succeeds');

    // Upgrade Business A and Business B to business plan
    const upARes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upARes.ok, 'Business A upgraded to BUSINESS plan');

    const upBRes = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ plan: 'BUSINESS' }),
    });
    assert(upBRes.ok, 'Business B upgraded to BUSINESS plan');

    // Register Staff Member (Cashier with restricted financial privacy)
    const cashierEmail = `cashier4m_${timestamp}@test.com`;
    const addStaffRes = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Esi Cashier',
        email: cashierEmail,
        phone: '0240001122',
        password: 'password123',
        role: 'cashier',
        permissions: {
          dashboard: true,
          pos_sales: true,
          sales_history: true,
          customers: true,
          financial_reports: false,
          business_settings: false,
        },
      }),
    });
    const staffData = await addStaffRes.json();
    assert(Boolean(staffData?.staff?.id || staffData?.id), 'Cashier staff created in Business A');

    // Login as Cashier
    const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cashierEmail,
        password: 'password123',
      }),
    });
    const cashierData = await cashierLoginRes.json();
    const cashierToken = cashierData.token;
    assert(Boolean(cashierToken), 'Cashier logs in successfully');

    // ----------------------------------------------------
    // PART 1: DEFAULT COMMUNICATION TEMPLATES
    // ----------------------------------------------------
    const getTemplatesRes = await fetch(`${BASE_URL}/api/communications/templates`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const templates: any[] = await getTemplatesRes.json();
    assert(Array.isArray(templates), 'Templates endpoint returns an array');
    assert(templates.length >= 6, 'Contains default system communication templates (at least 6)');

    const debtTmpl = templates.find((t) => t.type === 'DEBT_REMINDER');
    assert(Boolean(debtTmpl), 'Debt reminder template exists');
    assert(debtTmpl?.isSystem === true, 'Default debt template is marked as isSystem');

    const receiptTmpl = templates.find((t) => t.type === 'PAYMENT_CONFIRMATION');
    assert(Boolean(receiptTmpl), 'Payment confirmation template exists');
    assert(receiptTmpl?.isSystem === true, 'Payment confirmation template is marked as isSystem');

    const followUpTmpl = templates.find((t) => t.type === 'PURCHASE_FOLLOW_UP');
    assert(Boolean(followUpTmpl), 'Purchase follow up template exists');
    assert(followUpTmpl?.isSystem === true, 'Purchase follow up template is marked as isSystem');

    const appreciationTmpl = templates.find((t) => t.type === 'CUSTOMER_APPRECIATION');
    assert(Boolean(appreciationTmpl), 'Customer appreciation template exists');
    assert(appreciationTmpl?.isSystem === true, 'Customer appreciation template is marked as isSystem');

    const inactiveTmpl = templates.find((t) => t.type === 'INACTIVE_CUSTOMER');
    assert(Boolean(inactiveTmpl), 'Inactive customer template exists');
    assert(inactiveTmpl?.isSystem === true, 'Inactive customer template is marked as isSystem');

    const vipTmpl = templates.find((t) => t.type === 'VIP_FOLLOW_UP');
    assert(Boolean(vipTmpl), 'VIP customer template exists');
    assert(vipTmpl?.isSystem === true, 'VIP customer template is marked as isSystem');

    // System templates are protected: cannot be deleted
    const delSysRes = await fetch(`${BASE_URL}/api/communications/templates/${debtTmpl.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(delSysRes.status === 403, 'System template deletion is blocked with 403 Forbidden');

    // System templates are protected: cannot be edited
    const editSysRes = await fetch(`${BASE_URL}/api/communications/templates/${debtTmpl.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Template' }),
    });
    assert(editSysRes.status === 403, 'System template modification is blocked with 403 Forbidden');

    // Create custom template
    const createTmplRes = await fetch(`${BASE_URL}/api/communications/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Flash Weekend Discount',
        type: 'MARKETING_PROMO',
        channel: 'whatsapp',
        content: 'Hi {{customerName}}, enjoy 10% off at {{businessName}} this weekend only!',
      }),
    });
    const customTmpl = await createTmplRes.json();
    assert(customTmpl?.id && customTmpl?.name === 'Flash Weekend Discount', 'Custom template created');
    assert(customTmpl?.isSystem === false, 'Custom template has isSystem: false');
    assert(customTmpl?.businessId === bizAId, 'Custom template belongs to Business A');

    // Update custom template
    const updateTmplRes = await fetch(`${BASE_URL}/api/communications/templates/${customTmpl.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Flash Weekend Discount 15%',
        content: 'Hi {{customerName}}, enjoy 15% off at {{businessName}} this weekend only!',
      }),
    });
    const updatedTmpl = await updateTmplRes.json();
    assert(updatedTmpl?.name === 'Flash Weekend Discount 15%', 'Custom template updated successfully');

    // Delete custom template
    const delCustomRes = await fetch(`${BASE_URL}/api/communications/templates/${customTmpl.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(delCustomRes.status === 200 || delCustomRes.status === 204, 'Custom template deleted successfully');

    // ----------------------------------------------------
    // PART 2: CUSTOMERS & PREFERENCES SETUP
    // ----------------------------------------------------
    // Create Customer 1: Normal with Debt
    const cust1Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Kwaku Osei',
        phone: '0241234567',
        email: 'kwaku@test.com',
      }),
    });
    const cust1 = await cust1Res.json();
    assert(Boolean(cust1?.id), 'Customer 1 created');
    assert(cust1?.phone === '0241234567', 'Customer 1 phone stored');

    // Create Customer 2: Opted Out
    const cust2Res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Akua Mansa',
        phone: '+233 20 999 8888',
        email: 'akua@test.com',
      }),
    });
    const cust2 = await cust2Res.json();
    assert(Boolean(cust2?.id), 'Customer 2 created');

    // Update Customer 2 Preferences: Opt Out
    const optOutRes = await fetch(`${BASE_URL}/api/customers/${cust2.id}/communication-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        optedOut: true,
      }),
    });
    const optOutCust = await optOutRes.json();
    assert(optOutCust?.communicationPreferences?.optedOut === true, 'Customer 2 opted out successfully');

    // Create Product with stock
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        name: 'Milo 400g Tin',
        buyingPrice: 25,
        sellingPrice: 40,
        quantity: 100,
        category: 'Beverages',
      }),
    });
    const prod = await prodRes.json();
    assert(prod?.id && prod?.quantity === 100, 'Product created with 100 stock quantity');

    // Create Sale with Debt for Customer 1 (Total: 200, Paid: 50, Debt: 150)
    const saleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        items: [{ productId: prod.id, productName: prod.name, quantity: 5, buyingPrice: 25, sellingPrice: 40, total: 200, profit: 75 }],
        subtotal: 200,
        discount: 0,
        total: 200,
        amountPaid: 50,
        paymentMethod: 'Cash',
      }),
    });
    const sale = await saleRes.json();
    assert(sale?.id && sale?.balance === 150, 'Sale with 150 debt recorded');

    // Verify Customer 1 Debt in customer profile
    const getCust1Res = await fetch(`${BASE_URL}/api/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const freshCust1 = await getCust1Res.json();
    assert(freshCust1?.currentDebt === 150, 'Customer 1 current debt accurately reflects 150.00 GHS');

    // ----------------------------------------------------
    // PART 3: COMMUNICATION OPPORTUNITIES & PRIVACY
    // ----------------------------------------------------
    const oppsRes = await fetch(`${BASE_URL}/api/communications/opportunities`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const opps: any[] = await oppsRes.json();
    assert(Array.isArray(opps), 'Opportunities endpoint returns array');

    const debtOpp = opps.find((o) => o.customerId === cust1.id && o.type === 'DEBT_REMINDER');
    assert(Boolean(debtOpp), 'Debt reminder opportunity detected for Customer 1');
    assert(debtOpp?.recommendedMessage.includes('150.00'), 'Debt reminder includes balance GH₵ 150.00 for Owner');
    assert(debtOpp?.customerPhone.replace(/\D/g, '').includes('241234567'), 'Debt reminder includes customer phone');

    // Verify Opted Out Customer has NO opportunities
    const optedOutOpp = opps.find((o) => o.customerId === cust2.id);
    assert(!optedOutOpp, 'Opted out Customer 2 is excluded from communication opportunities');

    // Cashier View: Financial Privacy redaction in opportunities
    const cashierOppsRes = await fetch(`${BASE_URL}/api/communications/opportunities`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const cashierOpps: any[] = await cashierOppsRes.json();
    const cashierDebtOpp = cashierOpps.find((o) => o.customerId === cust1.id && o.type === 'DEBT_REMINDER');
    assert(
      cashierDebtOpp?.recommendedMessage.includes('[Confidential]') || !cashierDebtOpp?.recommendedMessage.includes('150.00'),
      'Cashier without profit permission has debt amount redacted as [Confidential]'
    );

    // ----------------------------------------------------
    // PART 4: DISPATCH PREVENTION FOR OPTED OUT CUSTOMERS
    // ----------------------------------------------------
    const blockedDispatchRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust2.id,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        message: 'Thank you for your business!',
      }),
    });
    assert(blockedDispatchRes.status === 400, 'Sending communication to opted out customer is blocked (400)');

    // ----------------------------------------------------
    // PART 5: COMMUNICATION DRAFTING, APPROVAL & DISPATCH
    // ----------------------------------------------------
    // Step A: Create DRAFT communication
    const createDraftRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'DEBT_REMINDER',
        channel: 'whatsapp',
        message: debtOpp?.recommendedMessage || 'Please settle your balance of GH₵ 150.00',
        status: 'DRAFT',
      }),
    });
    const draftComm = await createDraftRes.json();
    assert(draftComm?.id && draftComm?.status === 'DRAFT', 'Communication created in DRAFT status');
    assert(draftComm?.customerPhone === '233241234567', 'Ghana phone number normalized to international 233 format');
    assert(draftComm?.createdBy === ownerAData.user?.id, 'Draft createdBy user recorded');

    // Step B: Approve the communication
    const approveRes = await fetch(`${BASE_URL}/api/communications/${draftComm.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const approvedComm = await approveRes.json();
    assert(approvedComm?.status === 'APPROVED', 'Communication transitioned to APPROVED status');
    assert(Boolean(approvedComm?.approvedBy), 'Approver user ID recorded');

    // Step C: Open in WhatsApp (/open)
    const openRes = await fetch(`${BASE_URL}/api/communications/${draftComm.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const openData = await openRes.json();
    assert(openData?.success === true, 'Communication opened endpoint returns success');
    assert(openData?.communication?.status === 'OPENED', 'Status updated to OPENED upon launching WhatsApp');
    assert(openData?.whatsappUrl?.startsWith('https://wa.me/233241234567'), 'Generated wa.me URL targeting customer phone');
    assert(openData?.whatsappUrl?.includes('text='), 'Generated wa.me URL contains encoded text message');

    // ----------------------------------------------------
    // PART 6: TASK SYNCHRONIZATION WITH OPERATIONS CENTER (CORRECTED BEHAVIOR)
    // ----------------------------------------------------
    // Create a task for customer debt collection
    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        title: `Follow up debt for ${cust1.name}`,
        description: 'Send reminder via WhatsApp',
        source: 'debtor_aging',
        sourceEntityId: cust1.id,
        priority: 'high',
        dedupKey: `task_debt_${cust1.id}_${timestamp}`,
      }),
    });
    const task = await taskRes.json();
    assert(task?.id && task?.status === 'pending', 'Business task created');

    // Send communication linked to task
    const linkedCommRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'DEBT_REMINDER',
        channel: 'whatsapp',
        message: 'Reminder regarding your account balance',
        relatedTaskId: task.id,
        status: 'APPROVED',
      }),
    });
    const linkedComm = await linkedCommRes.json();
    assert(linkedComm?.relatedTaskId === task.id, 'Communication linked to task ID');

    // TEST 1: Open WhatsApp link for the linked communication
    const openLinkedRes = await fetch(`${BASE_URL}/api/communications/${linkedComm.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const openLinkedData = await openLinkedRes.json();
    assert(openLinkedData?.success === true, 'Opening linked communication returns success');
    assert(openLinkedData?.communication?.status === 'OPENED', 'Linked communication status updated to OPENED');

    // TEST 2 & 3: Opening WhatsApp does NOT complete the linked task; task remains pending/active
    const getTasksAfterOpenRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const tasksAfterOpen: any[] = await getTasksAfterOpenRes.json();
    const taskAfterOpen = tasksAfterOpen.find((t) => t.id === task.id);
    assert(taskAfterOpen?.status === 'pending', 'Opening WhatsApp does NOT automatically complete the linked task (remains pending)');
    assert(taskAfterOpen?.completedAt === undefined, 'Task completion timestamp remains undefined after WhatsApp is opened');

    // TEST 5: Opening WhatsApp multiple times does not create duplicate tasks
    await fetch(`${BASE_URL}/api/communications/${linkedComm.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const getTasksAfterSecondOpenRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const tasksAfterSecondOpen: any[] = await getTasksAfterSecondOpenRes.json();
    const matchingTasks = tasksAfterSecondOpen.filter((t) => t.id === task.id);
    assert(matchingTasks.length === 1, 'Opening WhatsApp multiple times does not create duplicate tasks');

    // TEST 6: Opening WhatsApp does not create a payment record
    const cust1StatementRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const cust1Statement = await cust1StatementRes.json();
    assert(cust1Statement?.amountPaid === 50, 'Opening WhatsApp does not create a payment (amountPaid remains 50.00)');

    // TEST 7: Opening WhatsApp does not modify debt balance
    assert(cust1Statement?.currentDebt === 150, 'Opening WhatsApp does not modify debt balance (currentDebt remains 150.00)');

    // TEST 8: Opening WhatsApp does not modify sale status or balance
    const saleVerifyRes = await fetch(`${BASE_URL}/api/sales/${sale.id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const saleVerify = await saleVerifyRes.json();
    assert(saleVerify?.balance === 150, 'Opening WhatsApp does not modify sale balance (balance remains 150.00)');
    assert(saleVerify?.status !== 'CANCELLED', 'Opening WhatsApp does not cancel or modify sale status');

    // TEST 9: Unauthorized staff/tenant cannot complete or manipulate another tenant task
    const crossTenantCompleteRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(crossTenantCompleteRes.status === 404, 'Unauthorized staff from another tenant cannot complete task (404)');

    // TEST 4: Explicit existing task completion changes the task to COMPLETED
    const explicitCompleteRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(explicitCompleteRes.ok, 'Explicit task completion via POST /api/tasks/:id/complete succeeds');
    const completedTaskData = await explicitCompleteRes.json();
    assert(completedTaskData?.status === 'completed', 'Task status is now COMPLETED via explicit action');
    assert(Boolean(completedTaskData?.completedAt), 'Task completedAt timestamp recorded upon explicit completion');
    assert(
      completedTaskData?.completedBy === ownerAData.user?.id ||
        completedTaskData?.completedBy === ownerAData.user?.fullName,
      'Task completedBy records authorized user'
    );

    // TEST 10: Communication history accurately records WhatsApp opening without claiming delivery
    const cust1CommsVerifyRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const cust1CommsVerify: any[] = await cust1CommsVerifyRes.json();
    const verifiedOpenedComm = cust1CommsVerify.find((c) => c.id === linkedComm.id);
    assert(verifiedOpenedComm?.status === 'OPENED', 'Communication history records status as OPENED');
    assert(verifiedOpenedComm?.status !== 'SENT', 'Communication history does NOT falsely claim delivery (status !== SENT)');

    // ----------------------------------------------------
    // PART 7: TENANT ISOLATION
    // ----------------------------------------------------
    // Business B cannot view Business A communications
    const bizBListRes = await fetch(`${BASE_URL}/api/communications`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const bizBComms: any[] = await bizBListRes.json();
    assert(
      !bizBComms.some((c) => c.businessId === bizAId),
      'Tenant isolation: Business B cannot view Business A communications'
    );

    // Business B cannot access Business A communication by ID
    const bizBGetCommRes = await fetch(`${BASE_URL}/api/communications/${draftComm.id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(bizBGetCommRes.status === 404, 'Tenant isolation: Business B accessing Biz A comm returns 404');

    // Business B cannot update Business A customer preferences
    const bizBUpdatePref = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communication-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ optedOut: true }),
    });
    assert(bizBUpdatePref.status === 404, 'Tenant isolation: Business B cannot update Biz A customer preferences');

    // Business B cannot open Business A communication
    const bizBOpenCommRes = await fetch(`${BASE_URL}/api/communications/${draftComm.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(bizBOpenCommRes.status === 404, 'Tenant isolation: Business B cannot open Business A communication');

    // Business B cannot view Business A customer communication history
    const bizBCustComms = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communications`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert(bizBCustComms.status === 404, 'Tenant isolation: Business B accessing Biz A customer comms returns 404');

    // ----------------------------------------------------
    // PART 8: AUDIT LOGGING
    // ----------------------------------------------------
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const audits: any[] = await auditRes.json();
    const commAudits = audits.filter(
      (a) =>
        a.action === 'CREATE_COMMUNICATION' ||
        a.action === 'APPROVE_COMMUNICATION' ||
        a.action === 'WHATSAPP_COMMUNICATION_OPENED'
    );
    assert(commAudits.length >= 3, 'Audit logs properly record communication creation, approval, and opening');

    // ----------------------------------------------------
    // PART 9: COMMUNICATIONS SUMMARY & KPI AGGREGATION
    // ----------------------------------------------------
    const summaryRes = await fetch(`${BASE_URL}/api/communications/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const summary = await summaryRes.json();
    assert(typeof summary?.openedCount === 'number' && summary.openedCount >= 2, 'Summary tracks opened communications count');
    assert(typeof summary?.opportunitiesCount === 'number', 'Summary tracks opportunities count');
    assert(typeof summary?.optedOutCustomersCount === 'number' && summary.optedOutCustomersCount >= 1, 'Summary tracks opted-out count');
    assert(typeof summary?.totalCommunications === 'number' && summary.totalCommunications >= 2, 'Summary tracks total communications');
    assert(typeof summary?.byChannel?.whatsapp === 'number', 'Summary breaks down communications by whatsapp channel');
    assert(typeof summary?.byStatus?.OPENED === 'number', 'Summary breaks down communications by OPENED status');

    // ----------------------------------------------------
    // PART 10: CUSTOMER COMMUNICATIONS SUB-ENDPOINT
    // ----------------------------------------------------
    const custCommsRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communications`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const custComms: any[] = await custCommsRes.json();
    assert(Array.isArray(custComms) && custComms.length >= 2, 'Customer-specific communications endpoint returns log');
    assert(custComms.every((c) => c.customerId === cust1.id), 'All returned items match customer ID');

    // ----------------------------------------------------
    // PART 11: CHANNEL & PREFERENCE TOGGLES
    // ----------------------------------------------------
    // Disable WhatsApp for Customer 1
    const disableWaRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communication-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ whatsappAllowed: false }),
    });
    const cust1WaDisabled = await disableWaRes.json();
    assert(cust1WaDisabled?.communicationPreferences?.whatsappAllowed === false, 'WhatsApp disabled for Customer 1');

    // Attempting WhatsApp communication to Customer 1 is now blocked
    const blockWaCommRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        message: 'Thank you!',
      }),
    });
    assert(blockWaCommRes.status === 400, 'WhatsApp dispatch blocked when customer has disabled WhatsApp');

    // Re-enable WhatsApp for Customer 1
    const reEnableWaRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communication-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ whatsappAllowed: true }),
    });
    const cust1WaEnabled = await reEnableWaRes.json();
    assert(cust1WaEnabled?.communicationPreferences?.whatsappAllowed === true, 'WhatsApp re-enabled for Customer 1');

    // ----------------------------------------------------
    // PART 12: REGRESSION INTEGRITY (Stages 4B - 4L sanity)
    // ----------------------------------------------------
    // Stage 4B: POS Sale
    const posSaleRes = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prod.id, productName: prod.name, quantity: 1, buyingPrice: 25, sellingPrice: 40, total: 40, profit: 15 }],
        subtotal: 40,
        discount: 0,
        total: 40,
        amountPaid: 40,
        paymentMethod: 'Cash',
      }),
    });
    assert(posSaleRes.ok, 'Stage 4B Sales/POS regression intact');

    // Stage 4C: Sales History
    const salesHistRes = await fetch(`${BASE_URL}/api/sales`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(salesHistRes.ok, 'Stage 4C Sales History regression intact');

    // Stage 4D: Debtors list
    const debtorsRes = await fetch(`${BASE_URL}/api/debtors`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(debtorsRes.ok, 'Stage 4D Debtors regression intact');

    // Stage 4E: Expenses
    const expensesRes = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(expensesRes.ok, 'Stage 4E Expenses regression intact');

    // Stage 4F: Financial Profitability Reports
    const finReportsRes = await fetch(`${BASE_URL}/api/reports?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(finReportsRes.ok, 'Stage 4F Financial Reports regression intact');

    // Stage 4G: Inventory Intelligence
    const invIntelRes = await fetch(`${BASE_URL}/api/inventory/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(invIntelRes.ok, 'Stage 4G Inventory Intelligence regression intact');

    // Stage 4H: Customer Intelligence
    const custIntelRes = await fetch(`${BASE_URL}/api/customers/intelligence`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(custIntelRes.ok, 'Stage 4H Customer Intelligence regression intact');

    // Stage 4I: Staff Intelligence
    const staffIntelRes = await fetch(`${BASE_URL}/api/staff/intelligence?range=today`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(staffIntelRes.ok, 'Stage 4I Staff Intelligence regression intact');

    // Stage 4J: Admin SaaS Subscriptions
    const subCurrentRes = await fetch(`${BASE_URL}/api/subscriptions/current`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(subCurrentRes.ok, 'Stage 4J SaaS Subscription regression intact');

    // Stage 4K: Forecasting & Planning
    const forecastRes = await fetch(`${BASE_URL}/api/business/forecast?period=month`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(forecastRes.ok, 'Stage 4K Forecasting & Planning regression intact');

    // Stage 4L: Controlled Business Workflows & Operations Center
    const workflowSummaryRes = await fetch(`${BASE_URL}/api/workflows/summary`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(workflowSummaryRes.ok, 'Stage 4L Controlled Workflows regression intact');

    const opsTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert(opsTasksRes.ok, 'Stage 4L Operations Center tasks regression intact');

    // Additional Stage 4M Communication Filtering tests
    const filterByStatusRes = await fetch(`${BASE_URL}/api/communications?status=OPENED`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const openedComms = await filterByStatusRes.json();
    assert(
      Array.isArray(openedComms) && openedComms.every((c: any) => c.status === 'OPENED'),
      'Filtering communications by status=OPENED returns only OPENED records'
    );

    const filterByTypeRes = await fetch(`${BASE_URL}/api/communications?type=DEBT_REMINDER`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const debtComms = await filterByTypeRes.json();
    assert(
      Array.isArray(debtComms) && debtComms.every((c: any) => c.type === 'DEBT_REMINDER'),
      'Filtering communications by type=DEBT_REMINDER returns only debt reminders'
    );

    const filterByChannelRes = await fetch(`${BASE_URL}/api/communications?channel=whatsapp`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const waComms = await filterByChannelRes.json();
    assert(
      Array.isArray(waComms) && waComms.every((c: any) => c.channel === 'whatsapp'),
      'Filtering communications by channel=whatsapp returns only WhatsApp records'
    );

    // ----------------------------------------------------
    // PART 13: CANCELLATION FLOW & LIFECYCLE
    // ----------------------------------------------------
    const cancelDraftRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        message: 'A message that will be cancelled',
        status: 'DRAFT',
      }),
    });
    const toCancelComm = await cancelDraftRes.json();
    assert(toCancelComm?.id && toCancelComm.status === 'DRAFT', 'Created communication to test cancellation');

    const cancelRes = await fetch(`${BASE_URL}/api/communications/${toCancelComm.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const cancelledComm = await cancelRes.json();
    assert(cancelledComm?.status === 'CANCELLED', 'Communication status transitioned to CANCELLED');

    // ----------------------------------------------------
    // PART 14: VALIDATION, RATE LIMIT & EDGE CASE PREVENTION
    // ----------------------------------------------------
    // Empty message content validation
    const emptyMsgRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'GENERAL_CUSTOMER_MESSAGE',
        channel: 'whatsapp',
        message: '   ',
      }),
    });
    assert(emptyMsgRes.status === 400, 'Blank message communication blocked with 400 Bad Request');

    // Non-existent customer validation
    const badCustRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: 'non_existent_customer_id',
        type: 'GENERAL_CUSTOMER_MESSAGE',
        channel: 'whatsapp',
        message: 'Hello',
      }),
    });
    assert(badCustRes.status === 404, 'Communication for non-existent customer blocked with 404');

    // Missing customer ID validation
    const noCustRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'GENERAL_CUSTOMER_MESSAGE',
        channel: 'whatsapp',
        message: 'Hello',
      }),
    });
    assert(noCustRes.status === 400, 'Communication without customerId blocked with 400');

    // Unauthenticated access blocked
    const unauthCommRes = await fetch(`${BASE_URL}/api/communications`);
    assert(unauthCommRes.status === 401, 'Unauthenticated access to /api/communications returns 401');

    const unauthTmplRes = await fetch(`${BASE_URL}/api/communications/templates`);
    assert(unauthTmplRes.status === 401, 'Unauthenticated access to /api/communications/templates returns 401');

    const unauthSummaryRes = await fetch(`${BASE_URL}/api/communications/summary`);
    assert(unauthSummaryRes.status === 401, 'Unauthenticated access to /api/communications/summary returns 401');

    const unauthOppsRes = await fetch(`${BASE_URL}/api/communications/opportunities`);
    assert(unauthOppsRes.status === 401, 'Unauthenticated access to /api/communications/opportunities returns 401');

    // ----------------------------------------------------
    // PART 15: TEMPLATE PLACEHOLDER RENDERING VIA API
    // ----------------------------------------------------
    // Create communication using a template ID without manual message override
    const tmplRenderRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        templateId: debtTmpl.id,
        type: 'DEBT_REMINDER',
        channel: 'whatsapp',
      }),
    });
    const renderedComm = await tmplRenderRes.json();
    assert(Boolean(renderedComm?.id), 'Communication created using templateId successfully');
    assert(renderedComm?.message.includes(cust1.name), 'Template placeholder {{customerName}} rendered properly');
    assert(renderedComm?.message.includes('150.00'), 'Template placeholder {{amountDue}} rendered with current debt');
    assert(renderedComm?.message.includes('Accra Mart'), 'Template placeholder {{businessName}} rendered with business name');

    // ----------------------------------------------------
    // PART 16: PREFERRED CHANNEL PREFERENCE PERSISTENCE
    // ----------------------------------------------------
    const setPhonePrefRes = await fetch(`${BASE_URL}/api/customers/${cust1.id}/communication-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        preferredChannel: 'phone',
        marketingAllowed: false,
        operationalAllowed: true,
      }),
    });
    const updatedCust1Pref = await setPhonePrefRes.json();
    assert(updatedCust1Pref?.communicationPreferences?.preferredChannel === 'phone', 'Preferred channel updated to phone');
    assert(updatedCust1Pref?.communicationPreferences?.marketingAllowed === false, 'Marketing allowed set to false');
    assert(updatedCust1Pref?.communicationPreferences?.operationalAllowed === true, 'Operational allowed set to true');

    // ----------------------------------------------------
    // PART 17: FREE PLAN FEATURE GATING
    // ----------------------------------------------------
    // Register Business C (Free Plan)
    const ownerCEmail = `owner4m_c_${timestamp}@test.com`;
    const regCRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerCEmail,
        password: 'password123',
        fullName: 'Kojo Free (Owner C)',
        phone: '0245556677',
        businessName: `Free Retail ${timestamp}`,
        businessType: 'Retail',
      }),
    });
    const ownerCData = await regCRes.json();
    const ownerCToken = ownerCData.token;

    // Free plan access to /api/communications should be rejected with 403 FEATURE_LOCKED
    const freeCommsRes = await fetch(`${BASE_URL}/api/communications`, {
      headers: { Authorization: `Bearer ${ownerCToken}` },
    });
    assert(freeCommsRes.status === 403, 'Free plan rejected from /api/communications with 403');
    const freeJson = await freeCommsRes.json();
    assert(freeJson?.code === 'FEATURE_LOCKED', 'Returns FEATURE_LOCKED error code for free tier');

    // ----------------------------------------------------
    // PART 18: DEDUPLICATION KEY CONFLICT PREVENTION
    // ----------------------------------------------------
    const uniqueDedupKey = `dedup_test_${timestamp}`;
    const firstDedupRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        message: 'First unique communication',
        dedupKey: uniqueDedupKey,
      }),
    });
    assert(firstDedupRes.ok, 'First communication with dedupKey created successfully');

    const duplicateDedupRes = await fetch(`${BASE_URL}/api/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust1.id,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        message: 'Duplicate communication attempt',
        dedupKey: uniqueDedupKey,
      }),
    });
    assert(duplicateDedupRes.status === 409, 'Duplicate communication blocked with 409 Conflict');

  } catch (err: any) {
    console.error('Unhandled test suite error:', err);
    assert(false, 'Test suite completed without unhandled exceptions', err.message);
  }

  // Final Summary
  console.log('\n========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL ASSERTIONS: ${results.length}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
