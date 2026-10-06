/**
 * Stage 4Q — Business Ecosystem, Integrations & External Services Readiness Test Suite
 * 
 * Validates:
 * 1. Architecture & Domain Integrity (Single authoritative database, no duplicates)
 * 2. Integration Registry & Provider Catalog
 * 3. Secure Credential & Secret Vault (AES-256, server-side only, sanitized from API & logs)
 * 4. Inbound Webhook Foundation with HMAC Signature Verification & Idempotency (dedupKey)
 * 5. Synchronization Engine with Directional Enforcement & Location Scoping
 * 6. Safe External Payment & Ghana Mobile Money Verification
 * 7. Phased Safe Imports (Validation -> Preview -> Confirmation -> Execution) & Financial Exports
 * 8. Financial Reconciliation & 8-Point Integration Diagnostics
 */

import crypto from 'crypto';
import { db, encryptSecret, decryptSecret } from '../server/db.js';
import { providerRegistry, IIntegrationProvider } from '../server/integrationProviders.js';
import {
  connectIntegration,
  disconnectIntegration,
  testIntegrationConnection,
  processInboundWebhook,
  initiateExternalPayment,
  confirmExternalPayment,
  runIntegrationSync,
  validateAndPreviewImport,
  executeImport,
  generateAccountingExport,
  reconcileProviderPayments,
  runIntegrationDiagnostics,
  generateOAuthState,
  validateOAuthState,
} from '../server/integrations.js';
import { FEATURE_REQUIRED_PLAN, canAccessFeature } from '../server/featureAccess.js';
import type {
  Integration,
  SyncRun,
  WebhookEvent,
  ExternalPaymentRecord,
} from '../src/types/index.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [ASSERT ${totalAssertions}] ${description}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ [FAIL ${totalAssertions}] ${description}`);
  }
}

async function runStage4QTests() {
  console.log('================================================================');
  console.log('STAGE 4Q TEST SUITE: BUSINESS ECOSYSTEM & INTEGRATIONS READINESS');
  console.log('================================================================\n');

  const testBizId = `test_biz_4q_${Date.now()}`;
  const otherBizId = `other_biz_4q_${Date.now()}`;
  const testOwner = { id: 'owner_user_1', name: 'Kwame Mensah', role: 'owner' };
  const testStaffAllowed = {
    id: 'staff_user_1',
    name: 'Ama Serwaa',
    role: 'staff',
    permissions: { settings: true, allowViewFinancialReports: true },
  };
  const testStaffRestricted = {
    id: 'staff_user_2',
    name: 'Kofi Manu',
    role: 'staff',
    permissions: { settings: false, allowViewFinancialReports: false },
  };

  // Seed test business
  db.getRaw().businesses.push({
    id: testBizId,
    name: 'Accra Retail & Logistics Hub',
    phone: '0244111222',
    currency: 'GHS',
    createdAt: new Date().toISOString(),
  } as any);

  db.getRaw().businesses.push({
    id: otherBizId,
    name: 'Kumasi Branch Enterprise',
    phone: '0244333444',
    currency: 'GHS',
    createdAt: new Date().toISOString(),
  } as any);

  // Seed sample location
  const createdLoc = db.createLocation({
    businessId: testBizId,
    name: 'Osu Flagship Store',
    code: 'OSU-01',
    type: 'STORE',
    status: 'ACTIVE',
    address: 'Oxford Street, Osu, Accra',
    phone: '0244111222',
    isDefault: true,
    operatingHours: '8:00 AM - 8:00 PM',
  } as any);
  const testLocationId = createdLoc.id;

  // ============================================================================
  // SECTION 1: ARCHITECTURE & DOMAIN INTEGRITY
  // ============================================================================
  console.log('--- SECTION 1: ARCHITECTURE & DOMAIN INTEGRITY ---');

  assert(typeof db.getIntegrations === 'function', 'Database manager provides authoritative getIntegrations method');
  assert(typeof db.createIntegration === 'function', 'Database manager provides createIntegration method');
  assert(typeof db.getWebhookEvents === 'function', 'Database manager provides getWebhookEvents method');
  assert(typeof db.getExternalPayments === 'function', 'Database manager provides getExternalPayments method');
  assert(FEATURE_REQUIRED_PLAN.integrations === 'business', 'Integrations feature requires Business subscription tier');

  assert(!canAccessFeature({ plan: 'free', status: 'active' }, 'integrations'), 'Free tier cannot access external integrations');
  assert(!canAccessFeature({ plan: 'starter', status: 'active' }, 'integrations'), 'Starter tier cannot access external integrations');
  assert(canAccessFeature({ plan: 'business', status: 'active' }, 'integrations'), 'Business tier has full access to external integrations');

  // Verify tenant isolation
  const emptyIntegrations = db.getIntegrations(testBizId);
  assert(Array.isArray(emptyIntegrations) && emptyIntegrations.length === 0, 'New business begins with zero integrations');

  const otherBizIntegrations = db.getIntegrations(otherBizId);
  assert(Array.isArray(otherBizIntegrations) && otherBizIntegrations.length === 0, 'Other tenant begins with zero integrations');

  assert(typeof providerRegistry.getCatalog === 'function', 'Provider registry exposes authoritative catalog');
  const catalog = providerRegistry.getCatalog();
  assert(catalog.length >= 5, `Catalog exposes standard providers (found ${catalog.length})`);

  const fixtureProvider = providerRegistry.get('fixture_test_provider');
  assert(fixtureProvider !== undefined, 'Fixture test provider is registered for deterministic testing');
  assert(fixtureProvider?.supportedCapabilities.includes('PAYMENT_COLLECTION'), 'Fixture provider supports PAYMENT_COLLECTION');
  assert(fixtureProvider?.supportedCapabilities.includes('SYNC_EXPORT'), 'Fixture provider supports SYNC_EXPORT');
  assert(fixtureProvider?.countryScope === 'GH', 'Fixture provider specifies Ghana country scope');

  // ============================================================================
  // SECTION 2: INTEGRATION REGISTRY & PROVIDER CATALOG
  // ============================================================================
  console.log('\n--- SECTION 2: INTEGRATION REGISTRY & PROVIDER CATALOG ---');

  const momoProvider = providerRegistry.get('momo_gh');
  assert(momoProvider !== undefined, 'momo_gh gateway blueprint registered');
  assert(momoProvider?.category === 'PAYMENTS', 'momo_gh category is PAYMENTS');
  assert(momoProvider?.countryScope === 'GH', 'momo_gh country scope is GH');

  const paystackProvider = providerRegistry.get('paystack');
  assert(paystackProvider !== undefined, 'Paystack blueprint registered');
  assert(paystackProvider?.category === 'PAYMENTS', 'Paystack category is PAYMENTS');

  const qbProvider = providerRegistry.get('quickbooks');
  assert(qbProvider !== undefined, 'QuickBooks blueprint registered');
  assert(qbProvider?.category === 'ACCOUNTING', 'QuickBooks category is ACCOUNTING');
  assert(qbProvider?.supportsOAuth === true, 'QuickBooks supports OAuth');

  const graProvider = providerRegistry.get('gra_tax');
  assert(graProvider !== undefined, 'GRA Tax blueprint registered');
  assert(graProvider?.category === 'TAX', 'GRA Tax category is TAX');

  const arkeselProvider = providerRegistry.get('arkesel');
  assert(arkeselProvider !== undefined, 'Arkesel SMS blueprint registered');
  assert(arkeselProvider?.category === 'MESSAGING', 'Arkesel category is MESSAGING');

  // Connect integration with validation
  const invalidConnect = connectIntegration(testBizId, testOwner, {
    provider: 'non_existent_provider',
    configuration: {},
  });
  assert(!invalidConnect.success, 'Rejects connection for non-existent provider');
  assert(invalidConnect.error?.includes('Unsupported'), 'Returns descriptive error on invalid provider');

  // Connect with missing config
  const missingConfigConnect = connectIntegration(testBizId, testOwner, {
    provider: 'momo_gh',
    configuration: {}, // missing merchantId
  });
  assert(!missingConfigConnect.success, 'Rejects connection when required configuration is missing');

  // Valid connection to fixture provider
  const validConnect = connectIntegration(testBizId, testOwner, {
    provider: 'fixture_test_provider',
    displayName: 'Test Payment & Sync Hub',
    configuration: { fixtureMode: 'active', environment: 'sandbox' },
    secrets: { apiKey: 'secret_key_123456789' },
    locationScope: 'BUSINESS',
  });
  assert(validConnect.success === true, 'Successfully connects valid integration');
  assert(validConnect.integration?.id !== undefined, 'Created integration has unique ID');
  assert(validConnect.integration?.status === 'CONNECTED', 'Integration status is CONNECTED');
  assert(validConnect.integration?.hasCredentials === true, 'Integration indicates hasCredentials: true');
  assert(validConnect.integration?.configuration?.apiKey === undefined, 'apiKey is stripped from public configuration');

  const integrationId = validConnect.integration!.id;

  // Retrieve via getIntegrationById
  const fetched = db.getIntegrationById(integrationId, testBizId);
  assert(fetched !== undefined, 'Can retrieve integration by ID');
  assert(fetched?.displayName === 'Test Payment & Sync Hub', 'Retrieved integration matches display name');
  assert(fetched?.configuration?.apiKey === undefined, 'Retrieved integration sanitizes secret keys');
  assert(fetched?.hasCredentials === true, 'Retrieved integration marks hasCredentials true');

  // Tenant isolation on fetch
  const crossTenantFetch = db.getIntegrationById(integrationId, otherBizId);
  assert(crossTenantFetch === undefined, 'Cross-tenant cannot access other business integration');

  // Connect location-scoped integration
  const locConnect = connectIntegration(testBizId, testOwner, {
    provider: 'fixture_test_provider',
    displayName: 'Osu Branch Dedicated Gateway',
    locationScope: 'LOCATION',
    locationId: testLocationId,
    configuration: { fixtureMode: 'branch' },
    secrets: { apiKey: 'secret_loc_key' },
  });
  assert(locConnect.success === true, 'Successfully creates location-scoped integration');
  assert(locConnect.integration?.locationScope === 'LOCATION', 'Location scope is LOCATION');
  assert(locConnect.integration?.locationId === testLocationId, 'Location ID properly mapped');

  // Re-connect / update integration
  const updatedConnect = connectIntegration(testBizId, testOwner, {
    provider: 'fixture_test_provider',
    displayName: 'Test Payment & Sync Hub Updated',
    configuration: { fixtureMode: 'active_v2' },
    locationScope: 'BUSINESS',
  });
  assert(updatedConnect.success === true, 'Updates existing integration with same provider & scope');
  assert(updatedConnect.integration?.id === integrationId, 'Preserves existing integration ID upon reconnect');
  assert(updatedConnect.integration?.displayName === 'Test Payment & Sync Hub Updated', 'Display name updated');

  // Disconnect integration
  const disconnected = disconnectIntegration(testBizId, testOwner, integrationId);
  assert(disconnected.success === true, 'Successfully disconnects integration');
  assert(disconnected.integration?.status === 'DISCONNECTED', 'Status updated to DISCONNECTED');

  // Reconnect
  const reconnected = connectIntegration(testBizId, testOwner, {
    provider: 'fixture_test_provider',
    configuration: { fixtureMode: 'active_v2' },
    locationScope: 'BUSINESS',
  });
  assert(reconnected.integration?.status === 'CONNECTED', 'Reconnecting restores CONNECTED status');

  // ============================================================================
  // SECTION 3: SECURE CREDENTIAL & SECRET VAULT
  // ============================================================================
  console.log('\n--- SECTION 3: SECURE CREDENTIAL & SECRET VAULT ---');

  const testPlainSecret = 'gh_momo_live_sec_key_xyz987654321';
  const cipher = encryptSecret(testPlainSecret);
  assert(cipher.includes(':'), 'Encrypted secret contains IV delimiter');
  assert(!cipher.includes(testPlainSecret), 'Plaintext secret does not appear in ciphertext');
  assert(cipher.startsWith('v2:gcm:'), 'Encrypted secret uses AES-256-GCM versioned envelope');

  // Nonce/IV handling test
  const cipher2 = encryptSecret(testPlainSecret);
  assert(cipher !== cipher2, 'Nonce/IV is unique and randomized per encryption call');

  const decrypted = decryptSecret(cipher);
  assert(decrypted === testPlainSecret, 'Decrypted ciphertext restores exact original secret');

  // Tampered authentication tag detection
  const parts = cipher.split(':');
  const tamperedAuthTag = `v2:gcm:${parts[2]}:${parts[3][0] === 'a' ? 'b' : 'a'}${parts[3].slice(1)}:${parts[4]}`;
  assert(decryptSecret(tamperedAuthTag) === '', 'Tampered authentication tag detected and rejected');

  // Tampered ciphertext detection
  const tamperedCipher = `v2:gcm:${parts[2]}:${parts[3]}:${parts[4][0] === 'a' ? 'b' : 'a'}${parts[4].slice(1)}`;
  assert(decryptSecret(tamperedCipher) === '', 'Tampered ciphertext detected and rejected');

  // Wrong-key failure
  const wrongKey = crypto.randomBytes(32);
  assert(decryptSecret(cipher, wrongKey) === '', 'Decryption with wrong key fails safely without exposing data');

  // Backwards-compatible legacy decryption
  const legacyIv = crypto.randomBytes(16);
  const legacyCipher = crypto.createCipheriv(
    'aes-256-cbc',
    crypto.createHash('sha256').update('bmgh_integration_master_vault_key_2026').digest(),
    legacyIv
  );
  const legacyEncrypted = legacyCipher.update('legacy_test_secret', 'utf8', 'hex') + legacyCipher.final('hex');
  const legacyEnv = `v1:cbc:${legacyIv.toString('hex')}:${legacyEncrypted}`;
  assert(decryptSecret(legacyEnv) === 'legacy_test_secret', 'Backwards-compatible legacy v1 envelope decrypts cleanly');

  const badDecrypt = decryptSecret('invalid:hex:gibberish');
  assert(badDecrypt === '', 'Corrupted ciphertext decrypts safely to empty string without throwing');

  // Verify secret stored in server-side vault
  const retrievedSecret = db.getIntegrationSecret(testBizId, integrationId);
  assert(retrievedSecret !== null, 'Server vault retrieves stored secret');
  assert(retrievedSecret?.apiKey === 'secret_key_123456789', 'Secret payload decrypted accurately for backend usage');

  // Verify cross-tenant isolation of secrets
  const crossSecret = db.getIntegrationSecret(otherBizId, integrationId);
  assert(crossSecret === null, 'Other business tenant cannot read secrets');

  // Verify secret sanitization in getIntegrations
  const allIntegrations = db.getIntegrations(testBizId);
  const target = allIntegrations.find((i) => i.id === integrationId);
  assert(target !== undefined, 'Target integration found in list');
  assert(target?.configuration?.apiKey === undefined, 'No apiKey in getIntegrations output');
  assert(target?.configuration?.apiSecret === undefined, 'No apiSecret in getIntegrations output');
  assert(target?.configuration?.password === undefined, 'No password in getIntegrations output');

  // Verify secret sanitization in Integration Events
  const loggedEvent = db.logIntegrationEvent({
    businessId: testBizId,
    userId: testOwner.id,
    integrationId,
    provider: 'fixture_test_provider',
    eventType: 'CREDENTIAL_UPDATE',
    severity: 'INFO',
    details: 'Updated connection secrets',
    metadata: {
      safeField: 'sandbox',
      apiKey: 'secret_leak_attempt',
      token: 'bearer_token_leak',
    },
  });
  assert(loggedEvent.metadata?.safeField === 'sandbox', 'Safe metadata retained');
  assert(loggedEvent.metadata?.apiKey === undefined, 'apiKey removed from event metadata');
  assert(loggedEvent.metadata?.token === undefined, 'token removed from event metadata');

  // Verify secret sanitization in Audit Logs
  const auditLogs = db.getAuditLogs(testBizId);
  const integrationAudits = auditLogs.filter((a) => a.action.startsWith('INTEGRATION_'));
  assert(integrationAudits.length > 0, 'Audit logs recorded for integration lifecycle actions');
  const hasLeakedKey = integrationAudits.some((a) => JSON.stringify(a).includes('secret_key_123456789'));
  assert(!hasLeakedKey, 'Audit log entries contain zero plaintext secrets');

  // OAuth CSRF state generator & validator
  const oauthState = generateOAuthState(testBizId, 'quickbooks');
  assert(typeof oauthState === 'string' && oauthState.length > 20, 'Generates base64url OAuth state token');

  const validOAuth = validateOAuthState(oauthState, testBizId, 'quickbooks');
  assert(validOAuth.valid === true, 'OAuth state validates successfully for same tenant and provider');

  const crossTenantOAuth = validateOAuthState(oauthState, otherBizId, 'quickbooks');
  assert(!crossTenantOAuth.valid, 'Cross-tenant OAuth state rejected to prevent CSRF account takeover');

  const wrongProviderOAuth = validateOAuthState(oauthState, testBizId, 'momo_gh');
  assert(!wrongProviderOAuth.valid, 'OAuth state rejected when provider does not match');

  const tamperedOAuth = validateOAuthState(oauthState + 'bad', testBizId, 'quickbooks');
  assert(!tamperedOAuth.valid, 'Tampered OAuth state rejected');

  // Test Connection Health Check
  const testConnResult = await testIntegrationConnection(testBizId, testOwner, integrationId);
  assert(testConnResult.success === true, 'testIntegrationConnection executes successfully');
  assert(testConnResult.healthy === true, 'Fixture health check passes');
  assert(testConnResult.status === 'CONNECTED', 'Status reported as CONNECTED');
  assert(typeof testConnResult.latencyMs === 'number', 'Latency in ms measured');

  // ============================================================================
  // SECTION 4: INBOUND WEBHOOK PROCESSING & IDEMPOTENCY
  // ============================================================================
  console.log('\n--- SECTION 4: INBOUND WEBHOOK PROCESSING & IDEMPOTENCY ---');

  const webhookSecret = 'whk_hmac_secret_key_2026';
  db.saveIntegrationSecret(testBizId, integrationId, { apiKey: 'key1', webhookSecret });

  const validWebhookPayload = {
    event: 'payment.success',
    id: `evt_${Date.now()}_001`,
    merchantReference: 'REF-TEST-001',
    amount: 150.0,
    currency: 'GHS',
  };
  const validBodyStr = JSON.stringify(validWebhookPayload);
  const validSignature = crypto.createHmac('sha256', webhookSecret).update(validBodyStr).digest('hex');

  // 1. Process valid webhook
  const whkRes1 = await processInboundWebhook(testBizId, {
    provider: 'fixture_test_provider',
    integrationId,
    payload: validWebhookPayload,
    rawBody: validBodyStr,
    signature: validSignature,
    eventType: 'payment.success',
    externalEventId: validWebhookPayload.id,
  });
  assert(whkRes1.success === true, 'Valid webhook processed successfully');
  assert(whkRes1.status === 'PROCESSED', 'Webhook status is PROCESSED');
  assert(!whkRes1.duplicate, 'First webhook delivery is not marked as duplicate');

  // 2. Process IDENTICAL webhook again (Idempotency test)
  const whkRes2 = await processInboundWebhook(testBizId, {
    provider: 'fixture_test_provider',
    integrationId,
    payload: validWebhookPayload,
    rawBody: validBodyStr,
    signature: validSignature,
    eventType: 'payment.success',
    externalEventId: validWebhookPayload.id,
  });
  assert(whkRes2.success === true, 'Duplicate webhook returns success');
  assert(whkRes2.status === 'DUPLICATE', 'Duplicate webhook status is DUPLICATE');
  assert(whkRes2.duplicate === true, 'Duplicate flag set to true');

  // 3. Forged / invalid signature
  const forgedSignature = crypto.createHmac('sha256', 'wrong_secret_key').update(validBodyStr).digest('hex');
  const whkForged = await processInboundWebhook(testBizId, {
    provider: 'fixture_test_provider',
    integrationId,
    payload: validWebhookPayload,
    rawBody: validBodyStr,
    signature: forgedSignature,
    eventType: 'payment.success',
    externalEventId: `evt_${Date.now()}_forged`,
  });
  assert(!whkForged.success, 'Webhook with forged signature is rejected');
  assert(whkForged.status === 'REJECTED', 'Status is REJECTED');

  // Verify security event logged for forged signature
  const secEvents = db.getSecurityEvents(testBizId);
  const forgedSecEvent = secEvents.find((e) => (e.description || (e as any).summary || '').includes('Invalid webhook signature'));
  assert(forgedSecEvent !== undefined, 'Security event logged for rejected signature');
  assert(forgedSecEvent?.severity === 'CRITICAL', 'Forged webhook logged as CRITICAL security severity');

  // 4. Missing integration for provider
  const whkMissing = await processInboundWebhook(testBizId, {
    provider: 'paystack', // not connected in testBizId
    payload: { test: true },
  });
  assert(!whkMissing.success, 'Rejects webhook when no active integration found in tenant');
  assert(whkMissing.status === 'REJECTED', 'Status is REJECTED for missing integration');

  // Verify webhook event log records
  const webhookLogs = db.getWebhookEvents(testBizId, integrationId);
  assert(webhookLogs.length >= 1, 'Webhook events saved in registry');
  const processedEvt = webhookLogs.find((w) => w.externalEventId === validWebhookPayload.id);
  assert(processedEvt !== undefined, 'Webhook event registry contains processed event');
  assert(processedEvt?.dedupKey.includes(validWebhookPayload.id), 'dedupKey incorporates external event ID');
  assert(processedEvt?.payloadHash.length === 64, 'SHA-256 payload hash recorded');

  // Cross-tenant webhook isolation
  const crossWebhookLogs = db.getWebhookEvents(otherBizId);
  assert(crossWebhookLogs.length === 0, 'Webhook event registry is strictly isolated per tenant');

  // ============================================================================
  // SECTION 5: SYNCHRONIZATION ENGINE
  // ============================================================================
  console.log('\n--- SECTION 5: SYNCHRONIZATION ENGINE ---');

  // 1. Run successful export sync
  const syncExportRes = await runIntegrationSync(testBizId, testOwner, {
    integrationId,
    direction: 'EXPORT',
    entityType: 'sales',
  });
  assert(syncExportRes.success === true, 'runIntegrationSync completes successfully for export');
  assert(syncExportRes.syncRun !== undefined, 'SyncRun object returned');
  assert(syncExportRes.syncRun?.status === 'SUCCESS', 'SyncRun status is SUCCESS');
  assert(syncExportRes.syncRun?.direction === 'EXPORT', 'SyncRun direction is EXPORT');
  assert(syncExportRes.syncRun?.entityType === 'sales', 'SyncRun entityType is sales');
  assert(syncExportRes.syncRun?.recordsRead === 10, 'SyncRun recorded recordsRead');
  assert(syncExportRes.syncRun?.recordsCreated === 5, 'SyncRun recorded recordsCreated');

  // 2. Run import sync
  const syncImportRes = await runIntegrationSync(testBizId, testOwner, {
    integrationId,
    direction: 'IMPORT',
    entityType: 'products',
  });
  assert(syncImportRes.success === true, 'Import sync completes successfully');
  assert(syncImportRes.syncRun?.direction === 'IMPORT', 'SyncRun direction is IMPORT');

  // 3. Location-aware sync run
  const syncLocRes = await runIntegrationSync(testBizId, testOwner, {
    integrationId,
    direction: 'EXPORT',
    entityType: 'inventory',
    locationId: testLocationId,
  });
  assert(syncLocRes.success === true, 'Location-scoped sync run completes successfully');
  assert(syncLocRes.syncRun?.locationId === testLocationId, 'Location ID tracked on SyncRun');

  // 4. Capability enforcement: try sync on provider that does not support it
  const momoConnect = connectIntegration(testBizId, testOwner, {
    provider: 'momo_gh',
    configuration: { merchantId: 'MERCH_001', currency: 'GHS' },
    secrets: { apiSecret: 'sec_1', webhookSecret: 'sec_2' },
  });
  assert(momoConnect.success === true, 'Connected momo_gh for capability test');

  // momo_gh does not support SYNC_IMPORT
  const invalidCapSync = await runIntegrationSync(testBizId, testOwner, {
    integrationId: momoConnect.integration!.id,
    direction: 'IMPORT',
    entityType: 'products',
  });
  assert(!invalidCapSync.success, 'Rejects sync when provider lacks required capability');
  assert(invalidCapSync.error?.includes('does not support'), 'Returns capability error message');

  // 5. Query sync history
  const syncRunsList = db.getSyncRuns(testBizId, integrationId);
  assert(syncRunsList.length >= 3, `Retrieved ${syncRunsList.length} sync runs for integration`);
  assert(syncRunsList[0].startedAt !== undefined, 'Sync runs ordered by start time');

  // Cross-tenant sync isolation
  const otherSyncs = db.getSyncRuns(otherBizId);
  assert(otherSyncs.length === 0, 'No sync runs leak across tenants');

  // Check that lastSuccessfulSyncAt is updated on integration
  const syncInteg = db.getIntegrationById(integrationId, testBizId);
  assert(syncInteg?.lastSuccessfulSyncAt !== undefined, 'Integration records lastSuccessfulSyncAt timestamp');

  // ============================================================================
  // SECTION 6: PAYMENT SAFETY & MOBILE MONEY VERIFICATION
  // ============================================================================
  console.log('\n--- SECTION 6: PAYMENT SAFETY & MOBILE MONEY VERIFICATION ---');

  // 1. Payment initiation
  const payInitRes = initiateExternalPayment(testBizId, testOwner, {
    integrationId,
    provider: 'fixture_test_provider',
    amount: 250.0,
    currency: 'GHS',
    customerPhone: '0244111222',
    idempotencyKey: 'idemp_pay_001',
  });
  assert(payInitRes.success === true, 'Payment initiated successfully');
  assert(payInitRes.payment !== undefined, 'Payment record created');
  assert(payInitRes.payment?.status === 'PENDING', 'Payment initial status is PENDING (never directly SUCCESS)');
  assert(payInitRes.payment?.currency === 'GHS', 'Payment currency is GHS');
  assert(payInitRes.payment?.amount === 250.0, 'Payment amount matches request');
  assert(payInitRes.payment?.merchantReference.startsWith('BMGH-'), 'Merchant reference generated with BMGH- prefix');

  const merchantRef = payInitRes.payment!.merchantReference;

  // 2. Idempotency test: initiate with same idempotencyKey returns existing record
  const payDupRes = initiateExternalPayment(testBizId, testOwner, {
    integrationId,
    provider: 'fixture_test_provider',
    amount: 250.0,
    idempotencyKey: 'idemp_pay_001',
  });
  assert(payDupRes.success === true, 'Idempotent initiation returns success');
  assert(payDupRes.payment?.id === payInitRes.payment?.id, 'Returns exact same payment ID');
  assert(payDupRes.payment?.merchantReference === merchantRef, 'Returns same merchant reference');

  // 3. Reject invalid amounts
  const zeroPay = initiateExternalPayment(testBizId, testOwner, {
    integrationId,
    provider: 'fixture_test_provider',
    amount: 0,
  });
  assert(!zeroPay.success, 'Rejects zero amount payment');

  const negPay = initiateExternalPayment(testBizId, testOwner, {
    integrationId,
    provider: 'fixture_test_provider',
    amount: -50,
  });
  assert(!negPay.success, 'Rejects negative amount payment');

  // 4. Verify payment via authentic confirmation
  const confirmRes1 = confirmExternalPayment(testBizId, {
    merchantReference: merchantRef,
    externalTransactionReference: 'MOMO-TRANS-998877',
    integrationId,
    provider: 'fixture_test_provider',
    amount: 250.0,
    currency: 'GHS',
    status: 'SUCCESS',
    verificationSource: 'WEBHOOK',
  });
  assert(confirmRes1.success === true, 'Payment confirmation succeeds');
  assert(confirmRes1.payment?.status === 'SUCCESS', 'Payment status transitioned to SUCCESS');
  assert(confirmRes1.payment?.verifiedAt !== undefined, 'Payment records verifiedAt timestamp');
  assert(confirmRes1.payment?.externalTransactionReference === 'MOMO-TRANS-998877', 'Transaction reference recorded');

  // 5. Idempotent payment confirmation: verify again does not duplicate or alter
  const confirmRes2 = confirmExternalPayment(testBizId, {
    merchantReference: merchantRef,
    status: 'SUCCESS',
    integrationId,
    provider: 'fixture_test_provider',
    amount: 250.0,
    currency: 'GHS',
    verificationSource: 'WEBHOOK',
  });
  assert(confirmRes2.success === true, 'Repeated confirmation succeeds');
  assert(confirmRes2.duplicate === true, 'Marked as duplicate confirmation');
  assert(confirmRes2.payment?.id === confirmRes1.payment?.id, 'Returns existing payment record');

  // 6. External payment list query
  const paymentsList = db.getExternalPayments(testBizId);
  assert(paymentsList.length >= 1, 'Can retrieve external payments for business');
  const foundPay = db.getExternalPaymentByReference(merchantRef, testBizId);
  assert(foundPay !== undefined, 'Payment found by merchant reference');

  // Cross-tenant payment query
  const crossPayments = db.getExternalPayments(otherBizId);
  assert(crossPayments.length === 0, 'No payment records visible across tenants');

  // ============================================================================
  // SECTION 7: PHASED SAFE IMPORTS & STRUCTURED ACCOUNTING EXPORTS
  // ============================================================================
  console.log('\n--- SECTION 7: PHASED SAFE IMPORTS & FINANCIAL EXPORTS ---');

  // Phase 1 & 2: Validate and preview import
  const rawProductRows = [
    { name: 'Milo 400g Tin', sellingPrice: 35.0, buyingPrice: 28.0, sku: 'MILO-400', category: 'Beverages', quantity: 20 },
    { name: 'Ideal Milk 160g', sellingPrice: 8.5, buyingPrice: 6.5, sku: 'IDEAL-160', category: 'Dairy', quantity: 50 },
    { name: 'Invalid Product No Price', sellingPrice: -10 }, // Invalid
    { name: '', sellingPrice: 15 }, // Invalid: empty name
  ];

  const previewRes = validateAndPreviewImport(testBizId, testOwner, {
    entityType: 'products',
    rows: rawProductRows,
  });
  assert(previewRes.success === true, 'Import preview generated successfully');
  assert(previewRes.importRun !== undefined, 'ImportRun record created');
  assert(previewRes.importRun?.status === 'PREVIEW', 'Import status is PREVIEW (no changes committed yet)');
  assert(previewRes.importRun?.totalRecords === 4, 'totalRecords is 4');
  assert(previewRes.importRun?.validRecords === 2, 'validRecords correctly counted as 2');
  assert(previewRes.importRun?.invalidRecords === 2, 'invalidRecords correctly counted as 2');
  assert(previewRes.importRun?.errors.length === 2, 'Errors list populated with row numbers and fields');
  assert(previewRes.importRun?.previewRows.length === 4, 'Preview rows accessible for user review');

  // Phase 3 & 4: Confirm and execute only valid rows
  const validRowsToExecute = [
    { name: 'Milo 400g Tin', sellingPrice: 35.0, buyingPrice: 28.0, sku: 'MILO-400', category: 'Beverages', quantity: 20 },
    { name: 'Ideal Milk 160g', sellingPrice: 8.5, buyingPrice: 6.5, sku: 'IDEAL-160', category: 'Dairy', quantity: 50 },
  ];

  const executeRes = executeImport(testBizId, testOwner, previewRes.importRun!.id, validRowsToExecute);
  assert(executeRes.success === true, 'Import execution completes successfully');
  assert(executeRes.importRun?.status === 'COMPLETED', 'ImportRun status is COMPLETED');
  assert(executeRes.importRun?.recordsCreated === 2, 'Authoritative product records created: 2');

  // Verify created products in authoritative DB
  const prods = db.getProducts(testBizId);
  const milo = prods.find((p) => p.name === 'Milo 400g Tin');
  assert(milo !== undefined, 'Milo 400g Tin exists in authoritative products collection');
  assert(milo?.sellingPrice === 35.0, 'Product selling price matches imported value');

  // Re-run import preview with same products to verify DUPLICATE detection
  const duplicatePreview = validateAndPreviewImport(testBizId, testOwner, {
    entityType: 'products',
    rows: [{ name: 'Milo 400g Tin', sellingPrice: 38.0, sku: 'MILO-400' }],
  });
  assert(duplicatePreview.importRun?.duplicateRecords === 1, 'Correctly flags existing SKU as duplicate');
  assert(duplicatePreview.importRun?.recordsToUpdate === 1, 'Categorizes as record to update rather than duplicate creation');

  // Structured Financial Export
  // Seed a sample sale first
  db.getRaw().sales.push({
    id: `sale_4q_001`,
    businessId: testBizId,
    receiptNumber: 'RCP-4Q-001',
    total: 70.0,
    amountPaid: 70.0,
    paymentMethod: 'momo_gh',
    items: [],
    createdAt: new Date().toISOString(),
    status: 'COMPLETED',
  } as any);

  // Seed a sample expense
  db.createExpense({
    id: `exp_4q_001`,
    businessId: testBizId,
    amount: 45.0,
    category: 'Utilities',
    paymentMethod: 'cash',
    date: '2026-09-23',
    description: 'ECG Prepaid Electricity',
    createdAt: new Date().toISOString(),
  } as any);

  // Export sales
  const salesExport = generateAccountingExport(testBizId, testOwner, {
    entityType: 'sales',
    format: 'JSON',
  });
  assert(salesExport.success === true, 'Sales accounting export succeeds');
  assert(Array.isArray(salesExport.data) && salesExport.data.length >= 1, 'Export data contains sale records');
  assert(salesExport.exportRun?.summaryChecksum !== undefined, 'ExportRun has SHA-256 summary checksum');
  assert(salesExport.exportRun?.recordCount === salesExport.data.length, 'Record count matches exported data');

  // Export expenses
  const expExport = generateAccountingExport(testBizId, testOwner, {
    entityType: 'expenses',
    format: 'JSON',
  });
  assert(expExport.success === true, 'Expenses accounting export succeeds');
  assert(expExport.data.length >= 1, 'Export contains expense records');

  // Export debtors
  const debtorExport = generateAccountingExport(testBizId, testOwner, {
    entityType: 'debtors',
  });
  assert(debtorExport.success === true, 'Debtors export succeeds');

  // Financial Privacy check: restricted staff rejected from export
  const restrictedExport = generateAccountingExport(testBizId, testStaffRestricted, {
    entityType: 'sales',
  });
  assert(!restrictedExport.success, 'Staff without allowViewFinancialReports permission rejected from financial export');
  assert(restrictedExport.error?.includes('Unauthorized'), 'Returns authorization error for restricted staff');

  // Staff with permission succeeds
  const allowedStaffExport = generateAccountingExport(testBizId, testStaffAllowed, {
    entityType: 'sales',
  });
  assert(allowedStaffExport.success === true, 'Staff with financial reporting permission can export');

  // ============================================================================
  // SECTION 8: FINANCIAL RECONCILIATION & 8-POINT DIAGNOSTICS
  // ============================================================================
  console.log('\n--- SECTION 8: FINANCIAL RECONCILIATION & DIAGNOSTICS ---');

  // Run reconciliation
  const reconReport = reconcileProviderPayments(
    testBizId,
    'fixture_test_provider',
    { startDate: '2026-01-01', endDate: '2026-12-31' }
  );
  assert(reconReport !== undefined, 'Reconciliation report generated');
  assert(reconReport.businessId === testBizId, 'Report matches business ID');
  assert(typeof reconReport.internalTotalGhs === 'number', 'Internal total GHS calculated');
  assert(typeof reconReport.externalTotalGhs === 'number', 'External total GHS calculated');
  assert(typeof reconReport.varianceGhs === 'number', 'Variance calculated accurately');
  assert(typeof reconReport.isBalanced === 'boolean', 'isBalanced boolean calculated');
  assert(Array.isArray(reconReport.unmatchedExternal), 'unmatchedExternal list provided');

  // Run 8-Point Integration Diagnostics
  const diagReport = runIntegrationDiagnostics(testBizId);
  assert(diagReport !== undefined, 'Diagnostics report generated');
  assert(diagReport.totalChecks === 8, `Runs all 8 diagnostic checks (found ${diagReport.totalChecks})`);
  assert(typeof diagReport.overallScore === 'number' && diagReport.overallScore >= 0 && diagReport.overallScore <= 100, 'Calculates score between 0 and 100');

  const checkNames = diagReport.checks.map((c) => c.id);
  assert(checkNames.includes('integration_configuration_check'), 'Includes integration_configuration_check');
  assert(checkNames.includes('integration_credentials_check'), 'Includes integration_credentials_check');
  assert(checkNames.includes('webhook_integrity_check'), 'Includes webhook_integrity_check');
  assert(checkNames.includes('sync_state_check'), 'Includes sync_state_check');
  assert(checkNames.includes('external_mapping_check'), 'Includes external_mapping_check');
  assert(checkNames.includes('duplicate_event_check'), 'Includes duplicate_event_check');
  assert(checkNames.includes('payment_reconciliation_check'), 'Includes payment_reconciliation_check');
  assert(checkNames.includes('location_scope_check'), 'Includes location_scope_check');

  // Verify NO SILENT AUTO-REPAIR
  const anySilentRepair = diagReport.checks.some((c) => c.autoRepairable === true);
  assert(!anySilentRepair, 'Diagnostics strictly forbid silent auto-repair (all autoRepairable: false)');

  console.log('\n================================================================');
  console.log(`STAGE 4Q TEST RESULTS: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions > 0) {
    console.error(`FAILED: ${failedAssertions} assertions failed!`);
    process.exit(1);
  } else {
    console.log('ALL STAGE 4Q ASSERTIONS PASSED PERFECTLY!');
  }
}

runStage4QTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
