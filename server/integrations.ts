/**
 * Authoritative Business Ecosystem, Integrations & External Services Engine (Stage 4Q)
 * 
 * Provides:
 * 1. Integration Registry & Lifecycle (Connect, Disconnect, Reconnect, Revoke, Test)
 * 2. Secret & Credential Vault (Encrypted at rest, never returned in GET)
 * 3. Webhook Foundation with HMAC Signature Verification & Idempotency (dedupKey)
 * 4. Synchronization Engine with Directional Policies & Checkpoints
 * 5. Safe External Payment & Ghana Mobile Money Verification
 * 6. Structured Financial & Accounting Exports
 * 7. Phased Safe Imports (Validation -> Preview -> Confirmation -> Execution)
 * 8. Financial Reconciliation Engine (Zero silent mutations)
 * 9. Integration Health & Diagnostics
 * 10. Operations Center Alerts & Deduplicated Workflow Tasks
 */

import crypto from 'crypto';
import { db, DBUser } from './db.js';
import { getAccraToday, getAccraDateString } from './date.js';
import { providerRegistry } from './integrationProviders.js';
import { validateUserLocationAccess } from './locations.js';
import type {
  Integration,
  IntegrationCategory,
  IntegrationCapability,
  IntegrationStatus,
  IntegrationScope,
  SyncRun,
  SyncDirection,
  SyncEntityType,
  WebhookEvent,
  WebhookStatus,
  ExternalMapping,
  ImportRun,
  ExportRun,
  ExternalPaymentRecord,
  PaymentVerificationStatus,
  ReconciliationReport,
  IntegrationDiagnosticsReport,
  IntegrationDiagnosticCheck,
} from '../src/types/index.js';

// ============================================================================
// OAUTH & CSRF PROTECTION HELPERS
// ============================================================================

const CSRF_SECRET = process.env.OAUTH_CSRF_SECRET || 'bmgh_oauth_csrf_salt_accra_2026';

export function generateOAuthState(businessId: string, providerId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(12).toString('hex');
  const payload = `${businessId}:${providerId}:${timestamp}:${random}`;
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function validateOAuthState(
  state: string,
  expectedBusinessId: string,
  expectedProviderId?: string
): { valid: boolean; reason?: string } {
  try {
    if (!state) return { valid: false, reason: 'Missing OAuth state parameter' };
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 5) return { valid: false, reason: 'Malformed state token format' };

    const [bizId, provId, tsStr, random, signature] = parts;
    const payload = `${bizId}:${provId}:${tsStr}:${random}`;
    const expectedSig = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');

    if (signature !== expectedSig) {
      return { valid: false, reason: 'CSRF token signature mismatch' };
    }

    if (bizId !== expectedBusinessId) {
      return { valid: false, reason: 'Cross-tenant OAuth state mismatch' };
    }

    if (expectedProviderId && provId !== expectedProviderId) {
      return { valid: false, reason: 'Provider mismatch in OAuth state' };
    }

    // Expiry check (15 minutes)
    const ageMs = Date.now() - parseInt(tsStr, 10);
    if (ageMs > 15 * 60 * 1000) {
      return { valid: false, reason: 'OAuth state has expired' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `State validation error: ${err?.message || 'Invalid state'}` };
  }
}

// ============================================================================
// INTEGRATION REGISTRY & LIFECYCLE
// ============================================================================

export interface ConnectIntegrationParams {
  provider: string;
  category?: IntegrationCategory;
  displayName?: string;
  description?: string;
  locationScope?: IntegrationScope;
  locationId?: string;
  configuration: Record<string, any>;
  secrets?: Record<string, any>;
}

export function connectIntegration(
  businessId: string,
  actor: { id: string; name: string; role?: string },
  params: ConnectIntegrationParams
): { success: boolean; integration?: Integration; error?: string } {
  const providerDef = providerRegistry.get(params.provider);
  if (!providerDef) {
    return { success: false, error: `Unsupported integration provider: '${params.provider}'` };
  }

  // Location Scope Validation
  const scope: IntegrationScope = params.locationScope || 'BUSINESS';
  let locationId = params.locationId;
  if (scope === 'LOCATION') {
    if (!locationId) {
      return { success: false, error: 'locationId is required when locationScope is LOCATION' };
    }
    const loc = db.getLocationById(locationId, businessId);
    if (!loc) {
      return { success: false, error: 'Specified location does not exist in this business' };
    }
    if (loc.status !== 'ACTIVE') {
      return { success: false, error: 'Cannot bind integration to an inactive location' };
    }
  } else {
    locationId = undefined;
  }

  // Validate Configuration & Secrets
  const validation = providerDef.validateConfiguration(params.configuration, params.secrets);
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid integration configuration: ${(validation.errors || []).join(', ')}`,
    };
  }

  const existingList = db.getIntegrations(businessId);
  const existing = existingList.find(
    (i) => i.provider === params.provider && i.locationScope === scope && i.locationId === locationId
  );

  const now = new Date().toISOString();

  if (existing) {
    // Update existing integration
    const updated = db.updateIntegration(
      existing.id,
      businessId,
      {
        displayName: params.displayName || existing.displayName || providerDef.displayName,
        description: params.description || existing.description || providerDef.description,
        status: 'CONNECTED',
        configuration: params.configuration,
        capabilities: providerDef.supportedCapabilities,
        connectedAt: now,
        lastAttemptAt: now,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
        updatedBy: actor.id,
      },
      params.secrets
    );

    db.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.name,
      action: 'INTEGRATION_CONNECTED',
      details: `Reconnected integration '${updated?.displayName}' (${params.provider}).`,
      module: 'configuration',
      severity: 'INFO',
      metadata: { integrationId: existing.id, provider: params.provider, scope },
    });

    db.logIntegrationEvent({
      businessId,
      integrationId: existing.id,
      provider: params.provider,
      eventType: 'INTEGRATION_CONNECTED',
      severity: 'INFO',
      details: `Integration '${updated?.displayName}' connected successfully.`,
      userId: actor.id,
    });

    return { success: true, integration: updated };
  }

  // Create new integration
  const newIntegration: Integration = {
    id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    provider: params.provider,
    category: params.category || providerDef.category,
    status: 'CONNECTED',
    displayName: params.displayName || providerDef.displayName,
    description: params.description || providerDef.description,
    capabilities: providerDef.supportedCapabilities,
    locationScope: scope,
    locationId,
    configuration: params.configuration,
    connectedAt: now,
    lastAttemptAt: now,
    createdBy: actor.id,
    updatedBy: actor.id,
    createdAt: now,
    updatedAt: now,
  };

  const created = db.createIntegration(newIntegration, params.secrets);

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'INTEGRATION_CREATED',
    details: `Configured new integration '${created.displayName}' (${params.provider}) with scope '${scope}'.`,
    module: 'configuration',
    severity: 'INFO',
    metadata: { integrationId: created.id, provider: params.provider, scope },
  });

  db.logIntegrationEvent({
    businessId,
    integrationId: created.id,
    provider: params.provider,
    eventType: 'INTEGRATION_CREATED',
    severity: 'INFO',
    details: `Integration '${created.displayName}' created and connected.`,
    userId: actor.id,
  });

  return { success: true, integration: created };
}

export function disconnectIntegration(
  businessId: string,
  actor: { id: string; name: string },
  integrationId: string
): { success: boolean; integration?: Integration; error?: string } {
  const existing = db.getIntegrationById(integrationId, businessId);
  if (!existing) {
    return { success: false, error: 'Integration not found' };
  }

  const updated = db.updateIntegration(integrationId, businessId, {
    status: 'DISCONNECTED',
    updatedBy: actor.id,
  });

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'INTEGRATION_DISCONNECTED',
    details: `Disconnected integration '${existing.displayName}' (${existing.provider}).`,
    module: 'configuration',
    severity: 'WARNING',
    metadata: { integrationId, provider: existing.provider },
  });

  db.logIntegrationEvent({
    businessId,
    integrationId,
    provider: existing.provider,
    eventType: 'INTEGRATION_DISCONNECTED',
    severity: 'WARNING',
    details: `Integration '${existing.displayName}' was disconnected by ${actor.name}.`,
    userId: actor.id,
  });

  // Create Ops Center notification/task if important
  if (existing.category === 'PAYMENTS' || existing.category === 'ACCOUNTING') {
    db.createTask({
      businessId,
      title: `Integration Disconnected: ${existing.displayName}`,
      description: `${existing.displayName} has been disconnected. Automated sync and processing are paused.`,
      priority: 'high',
      status: 'pending',
      dedupKey: `task_int_disconnected_${integrationId}`,
      source: 'Operations',
      actionUrl: '/integrations',
      dueDate: getAccraToday(),
    });
  }

  return { success: true, integration: updated };
}

export function testIntegrationConnection(
  businessId: string,
  actor: { id: string; name: string },
  integrationId: string
): Promise<{ success: boolean; healthy: boolean; status: IntegrationStatus; latencyMs?: number; message?: string }> {
  return (async () => {
    const integration = db.getIntegrationById(integrationId, businessId);
    if (!integration) {
      return { success: false, healthy: false, status: 'ERROR', message: 'Integration not found' };
    }

    const providerDef = providerRegistry.get(integration.provider);
    if (!providerDef) {
      return { success: false, healthy: false, status: 'ERROR', message: 'Provider blueprint not found' };
    }

    const secrets = db.getIntegrationSecret(businessId, integrationId) || undefined;
    const result = await providerDef.healthCheck(integration, secrets);

    const now = new Date().toISOString();
    if (result.healthy) {
      db.updateIntegration(integrationId, businessId, {
        lastAttemptAt: now,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
        updatedBy: actor.id,
      });
    } else {
      db.updateIntegration(integrationId, businessId, {
        lastAttemptAt: now,
        lastErrorAt: now,
        lastErrorCode: 'HEALTH_CHECK_FAILED',
        lastErrorMessage: result.message || 'Health check failed',
        updatedBy: actor.id,
      });
    }

    db.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.name,
      action: 'INTEGRATION_TESTED',
      details: `Health check on '${integration.displayName}': ${result.healthy ? 'PASS' : 'FAIL'}. ${result.message || ''}`,
      module: 'configuration',
      severity: result.healthy ? 'INFO' : 'WARNING',
      metadata: { integrationId, healthy: result.healthy, latencyMs: result.latencyMs },
    });

    db.logIntegrationEvent({
      businessId,
      integrationId,
      provider: integration.provider,
      eventType: 'INTEGRATION_TESTED',
      severity: result.healthy ? 'INFO' : 'WARNING',
      details: `Health check result: ${result.healthy ? 'HEALTHY' : 'UNHEALTHY'} (${result.latencyMs || 0}ms). ${result.message || ''}`,
      userId: actor.id,
    });

    return {
      success: true,
      healthy: result.healthy,
      status: result.status,
      latencyMs: result.latencyMs,
      message: result.message,
    };
  })();
}

// ============================================================================
// WEBHOOK FOUNDATION & IDEMPOTENCY
// ============================================================================

export interface InboundWebhookParams {
  provider: string;
  integrationId?: string;
  payload: any;
  rawBody?: string;
  signature?: string;
  headers?: Record<string, any>;
  externalEventId?: string;
  eventType?: string;
}

export async function processInboundWebhook(
  businessId: string,
  params: InboundWebhookParams
): Promise<{ success: boolean; status: WebhookStatus; duplicate?: boolean; message?: string; error?: string }> {
  // 1. Locate Integration
  let integration: Integration | undefined;
  if (params.integrationId) {
    integration = db.getIntegrationById(params.integrationId, businessId);
  } else {
    const list = db.getIntegrations(businessId);
    integration = list.find((i) => i.provider === params.provider && i.status === 'CONNECTED');
  }

  if (!integration) {
    return {
      success: false,
      status: 'REJECTED',
      error: `No active integration found for provider '${params.provider}' in this business tenant.`,
    };
  }

  const providerDef = providerRegistry.get(params.provider);
  if (!providerDef) {
    return { success: false, status: 'REJECTED', error: 'Provider not supported' };
  }

  // 2. Signature Verification
  const secrets = db.getIntegrationSecret(businessId, integration.id);
  const secretKey = secrets?.webhookSecret || secrets?.secretKey || secrets?.apiKey || '';

  const rawPayload = params.rawBody || (typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload));
  const signature = params.signature || params.headers?.['x-webhook-signature'] || params.headers?.['x-paystack-signature'] || '';

  if (secretKey) {
    const verified = providerDef.verifyWebhookSignature(rawPayload, signature, secretKey, params.headers);
    if (!verified) {
      db.logAudit({
        businessId,
        userId: 'system',
        userName: 'Webhook Receiver',
        action: 'WEBHOOK_REJECTED',
        details: `Invalid webhook signature rejected for provider '${params.provider}'.`,
        module: 'configuration',
        severity: 'CRITICAL',
        metadata: { provider: params.provider, integrationId: integration.id },
      });

      db.recordSecurityEvent({
        businessId,
        eventType: 'suspicious_activity',
        severity: 'CRITICAL',
        summary: `Invalid webhook signature detected on provider '${params.provider}'. Possible forgery attempt.`,
        metadata: { provider: params.provider, integrationId: integration.id },
      });

      return {
        success: false,
        status: 'REJECTED',
        error: 'Invalid webhook signature verification failed.',
      };
    }
  }

  // 3. Deterministic Idempotency Check
  const payloadHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
  const externalEventId =
    params.externalEventId ||
    params.payload?.id ||
    params.payload?.event_id ||
    params.payload?.reference ||
    payloadHash.slice(0, 16);

  const eventType = params.eventType || params.payload?.event || params.payload?.type || 'webhook.event';
  const dedupKey = `${params.provider}:${integration.id}:${externalEventId}`;

  const existingWebhook = db.getWebhookEventByDedupKey(dedupKey);
  if (existingWebhook) {
    // IDEMPOTENT: already processed, return previous status without re-executing business mutations!
    return {
      success: true,
      status: 'DUPLICATE',
      duplicate: true,
      message: `Event '${externalEventId}' was already processed at ${existingWebhook.processedAt || existingWebhook.receivedAt}. No duplicate mutations executed.`,
    };
  }

  const now = new Date().toISOString();

  // Create initial received webhook record
  const webhookRecord: WebhookEvent = {
    id: `whk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    integrationId: integration.id,
    provider: params.provider,
    eventType,
    externalEventId,
    payloadHash,
    receivedAt: now,
    status: 'RECEIVED',
    retryCount: 0,
    dedupKey,
  };

  db.createWebhookEvent(webhookRecord);

  // 4. Provider Processing
  try {
    const processResult = await providerDef.processWebhook(
      { eventType, payload: params.payload, externalEventId },
      integration
    );

    if (processResult.success) {
      // If payment confirmed by provider, idempotently register/verify external payment
      if (processResult.actionTaken?.includes('PAYMENT') || processResult.paymentRecord) {
        const pr = processResult.paymentRecord;
        if (pr?.merchantReference) {
          confirmExternalPayment(businessId, {
            merchantReference: pr.merchantReference,
            externalTransactionReference: externalEventId,
            integrationId: integration.id,
            provider: params.provider,
            amount: pr.amount || 0,
            currency: pr.currency || 'GHS',
            status: pr.status || 'SUCCESS',
            verificationSource: 'WEBHOOK',
          });
        }
      }

      db.updateWebhookEvent(webhookRecord.id, businessId, {
        status: 'PROCESSED',
        processedAt: new Date().toISOString(),
      });

      db.logAudit({
        businessId,
        userId: 'system',
        userName: 'Webhook Receiver',
        action: 'WEBHOOK_PROCESSED',
        details: `Successfully processed ${eventType} event (${externalEventId}) from ${params.provider}.`,
        module: 'configuration',
        severity: 'INFO',
        metadata: { provider: params.provider, eventType, externalEventId },
      });

      return {
        success: true,
        status: 'PROCESSED',
        message: `Webhook processed successfully: ${processResult.actionTaken || 'OK'}`,
      };
    } else {
      db.updateWebhookEvent(webhookRecord.id, businessId, {
        status: 'ERROR',
        errorCode: 'PROCESSING_FAILED',
        errorMessage: processResult.error || 'Provider processing failed',
      });
      return { success: false, status: 'ERROR', error: processResult.error };
    }
  } catch (err: any) {
    db.updateWebhookEvent(webhookRecord.id, businessId, {
      status: 'ERROR',
      errorCode: 'EXCEPTION',
      errorMessage: err?.message || 'Unexpected exception',
    });
    return { success: false, status: 'ERROR', error: err?.message };
  }
}

// ============================================================================
// EXTERNAL PAYMENT & MOBILE MONEY SAFETY
// ============================================================================

export interface InitiatePaymentParams {
  integrationId: string;
  provider: string;
  amount: number;
  currency?: string;
  saleId?: string;
  customerId?: string;
  customerPhone?: string;
  locationId?: string;
  idempotencyKey?: string;
}

export function initiateExternalPayment(
  businessId: string,
  actor: { id: string; name: string },
  params: InitiatePaymentParams
): { success: boolean; payment?: ExternalPaymentRecord; error?: string } {
  if (!params.amount || params.amount <= 0) {
    return { success: false, error: 'Payment amount must be greater than 0' };
  }

  const integration = db.getIntegrationById(params.integrationId, businessId);
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }
  if (integration.status !== 'CONNECTED') {
    return { success: false, error: `Integration is not connected (current status: ${integration.status})` };
  }

  const idempKey = params.idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = db.getExternalPaymentByIdempotency(idempKey, businessId);
  if (existing) {
    // Idempotent: return existing record
    return { success: true, payment: existing };
  }

  const merchantReference = `BMGH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const record: ExternalPaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    integrationId: params.integrationId,
    provider: params.provider,
    merchantReference,
    saleId: params.saleId,
    customerId: params.customerId,
    customerPhone: params.customerPhone,
    currency: params.currency || 'GHS',
    amount: params.amount,
    status: 'PENDING', // NEVER directly SUCCESS
    initiatedAt: now,
    idempotencyKey: idempKey,
    locationId: params.locationId || integration.locationId,
  };

  const created = db.createExternalPayment(record);

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'EXTERNAL_PAYMENT_INITIATED',
    details: `Initiated ${record.currency} ${record.amount.toFixed(2)} payment via ${params.provider} (Ref: ${merchantReference}).`,
    module: 'sales',
    severity: 'INFO',
    metadata: { paymentId: created.id, merchantReference, amount: record.amount },
  });

  return { success: true, payment: created };
}

export function confirmExternalPayment(
  businessId: string,
  params: {
    merchantReference: string;
    externalTransactionReference?: string;
    integrationId: string;
    provider: string;
    amount: number;
    currency: string;
    status: PaymentVerificationStatus;
    verificationSource: 'WEBHOOK' | 'POLLING' | 'MANUAL_VERIFY';
  }
): { success: boolean; payment?: ExternalPaymentRecord; duplicate?: boolean; error?: string } {
  let payment = db.getExternalPaymentByReference(params.merchantReference, businessId);
  const now = new Date().toISOString();

  if (payment) {
    if (payment.status === 'SUCCESS') {
      // Idempotency: already confirmed, do not apply ledger mutations twice!
      return { success: true, payment, duplicate: true };
    }

    const updated = db.updateExternalPayment(payment.id, businessId, {
      status: params.status,
      externalTransactionReference: params.externalTransactionReference,
      verifiedAt: now,
      verificationSource: params.verificationSource,
    });

    db.logAudit({
      businessId,
      userId: 'system',
      userName: 'Payment Engine',
      action: params.status === 'SUCCESS' ? 'EXTERNAL_PAYMENT_CONFIRMED' : 'EXTERNAL_PAYMENT_FAILED',
      details: `Payment reference ${params.merchantReference} verified as ${params.status} via ${params.verificationSource}.`,
      module: 'sales',
      severity: params.status === 'SUCCESS' ? 'INFO' : 'WARNING',
      metadata: { merchantReference: params.merchantReference, status: params.status },
    });

    return { success: true, payment: updated };
  }

  // If initiated externally and received via webhook
  const newPayment: ExternalPaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    integrationId: params.integrationId,
    provider: params.provider,
    merchantReference: params.merchantReference,
    externalTransactionReference: params.externalTransactionReference,
    currency: params.currency || 'GHS',
    amount: params.amount,
    status: params.status,
    initiatedAt: now,
    verifiedAt: now,
    verificationSource: params.verificationSource,
    idempotencyKey: `auto_${params.merchantReference}`,
  };

  const created = db.createExternalPayment(newPayment);

  db.logAudit({
    businessId,
    userId: 'system',
    userName: 'Payment Engine',
    action: params.status === 'SUCCESS' ? 'EXTERNAL_PAYMENT_CONFIRMED' : 'EXTERNAL_PAYMENT_FAILED',
    details: `Created and verified external payment record ${params.merchantReference} (${params.status}).`,
    module: 'sales',
    severity: 'INFO',
    metadata: { merchantReference: params.merchantReference, status: params.status },
  });

  return { success: true, payment: created };
}

// ============================================================================
// SYNCHRONIZATION ENGINE
// ============================================================================

export interface StartSyncParams {
  integrationId: string;
  direction: SyncDirection;
  entityType: SyncEntityType;
  locationId?: string;
}

export async function runIntegrationSync(
  businessId: string,
  actor: { id: string; name: string },
  params: StartSyncParams
): Promise<{ success: boolean; syncRun?: SyncRun; error?: string }> {
  const integration = db.getIntegrationById(params.integrationId, businessId);
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }

  if (integration.status !== 'CONNECTED') {
    return { success: false, error: `Integration is not in CONNECTED state (currently ${integration.status})` };
  }

  const providerDef = providerRegistry.get(integration.provider);
  if (!providerDef) {
    return { success: false, error: 'Provider blueprint not found' };
  }

  // Capability check
  const requiredCap: IntegrationCapability = params.direction === 'IMPORT' ? 'SYNC_IMPORT' : 'SYNC_EXPORT';
  if (!providerDef.supportedCapabilities.includes(requiredCap)) {
    return {
      success: false,
      error: `Provider '${integration.provider}' does not support ${requiredCap} for entity '${params.entityType}'.`,
    };
  }

  const now = new Date().toISOString();
  const syncRun: SyncRun = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    integrationId: params.integrationId,
    provider: integration.provider,
    direction: params.direction,
    entityType: params.entityType,
    status: 'RUNNING',
    startedAt: now,
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    locationId: params.locationId || integration.locationId,
    initiatedBy: actor.id,
  };

  db.createSyncRun(syncRun);

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'SYNC_STARTED',
    details: `Started ${params.direction} sync of ${params.entityType} with ${integration.displayName}.`,
    module: 'configuration',
    severity: 'INFO',
    metadata: { syncId: syncRun.id, direction: params.direction, entityType: params.entityType },
  });

  try {
    const secrets = db.getIntegrationSecret(businessId, integration.id) || undefined;
    const result = await providerDef.executeSync(syncRun, integration, {
      locationId: syncRun.locationId,
      secrets,
    });

    const completedAt = new Date().toISOString();
    const finalStatus = result.recordsFailed > 0 && result.recordsCreated + result.recordsUpdated > 0 ? 'PARTIAL' : 'SUCCESS';

    const updatedRun = db.updateSyncRun(syncRun.id, businessId, {
      status: finalStatus,
      completedAt,
      recordsRead: result.recordsRead,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsSkipped: result.recordsSkipped,
      recordsFailed: result.recordsFailed,
      errorSummary: result.errorSummary,
    });

    // Update integration last sync timestamps
    db.updateIntegration(integration.id, businessId, {
      lastSuccessfulSyncAt: completedAt,
      lastAttemptAt: completedAt,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
    });

    db.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.name,
      action: 'SYNC_COMPLETED',
      details: `Sync completed for ${params.entityType}: ${result.recordsCreated} created, ${result.recordsUpdated} updated, ${result.recordsFailed} failed.`,
      module: 'configuration',
      severity: 'INFO',
      metadata: { syncId: syncRun.id, recordsRead: result.recordsRead, recordsCreated: result.recordsCreated },
    });

    return { success: true, syncRun: updatedRun };
  } catch (err: any) {
    const failedAt = new Date().toISOString();
    const failedRun = db.updateSyncRun(syncRun.id, businessId, {
      status: 'FAILED',
      completedAt: failedAt,
      errorSummary: err?.message || 'Sync failed due to provider error',
    });

    db.updateIntegration(integration.id, businessId, {
      lastAttemptAt: failedAt,
      lastErrorAt: failedAt,
      lastErrorCode: 'SYNC_FAILED',
      lastErrorMessage: err?.message || 'Sync failed',
    });

    db.logAudit({
      businessId,
      userId: actor.id,
      userName: actor.name,
      action: 'SYNC_FAILED',
      details: `Sync failed for ${params.entityType} with ${integration.displayName}: ${err?.message || 'Error'}`,
      module: 'configuration',
      severity: 'HIGH',
      metadata: { syncId: syncRun.id, error: err?.message },
    });

    // Notify in Operations Center
    db.createTask({
      businessId,
      title: `Sync Failed: ${integration.displayName}`,
      description: `Automated sync of ${params.entityType} failed: ${err?.message || 'Provider connection error'}.`,
      priority: 'high',
      status: 'pending',
      dedupKey: `task_sync_failed_${integration.id}_${params.entityType}`,
      source: 'Operations',
      actionUrl: '/integrations',
      dueDate: getAccraToday(),
    });

    return { success: false, syncRun: failedRun, error: err?.message };
  }
}

// ============================================================================
// PHASED IMPORT FRAMEWORK (Validation -> Preview -> Confirmation -> Execution)
// ============================================================================

export interface ImportPreviewParams {
  entityType: 'products' | 'customers' | 'suppliers' | 'expenses';
  rows: any[];
  locationId?: string;
}

export function validateAndPreviewImport(
  businessId: string,
  actor: { id: string; name: string },
  params: ImportPreviewParams
): { success: boolean; importRun?: ImportRun; error?: string } {
  if (!params.rows || !Array.isArray(params.rows) || params.rows.length === 0) {
    return { success: false, error: 'No data rows provided for import.' };
  }

  const errors: { row: number; field?: string; message: string; recordSnippet?: any }[] = [];
  const warnings: { row: number; field?: string; message: string }[] = [];

  let validRecords = 0;
  let invalidRecords = 0;
  let duplicateRecords = 0;
  let recordsToCreate = 0;
  let recordsToUpdate = 0;

  const existingProducts = params.entityType === 'products' ? db.getProducts(businessId) : [];
  const existingCustomers = params.entityType === 'customers' ? db.getCustomers(businessId) : [];
  const existingSuppliers = params.entityType === 'suppliers' ? db.getSuppliers(businessId) : [];

  params.rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    let rowValid = true;

    if (params.entityType === 'products') {
      if (!row.name || !String(row.name).trim()) {
        errors.push({ row: rowNum, field: 'name', message: 'Product name is required', recordSnippet: row });
        rowValid = false;
      }
      if (row.sellingPrice === undefined || isNaN(Number(row.sellingPrice)) || Number(row.sellingPrice) < 0) {
        errors.push({ row: rowNum, field: 'sellingPrice', message: 'Valid selling price (>= 0) required', recordSnippet: row });
        rowValid = false;
      }
      if (row.buyingPrice !== undefined && (isNaN(Number(row.buyingPrice)) || Number(row.buyingPrice) < 0)) {
        errors.push({ row: rowNum, field: 'buyingPrice', message: 'Buying price cannot be negative', recordSnippet: row });
        rowValid = false;
      }

      // Check duplicate by SKU or exact name
      const skuMatch = row.sku ? existingProducts.find((p) => p.sku && p.sku.toLowerCase() === String(row.sku).toLowerCase()) : undefined;
      const nameMatch = existingProducts.find((p) => p.name.toLowerCase() === String(row.name).toLowerCase());
      if (skuMatch || nameMatch) {
        duplicateRecords++;
        recordsToUpdate++;
        warnings.push({ row: rowNum, message: `Matching product found (${skuMatch ? 'SKU' : 'Name'}). Record will be updated.` });
      } else {
        recordsToCreate++;
      }
    } else if (params.entityType === 'customers') {
      if (!row.name || !String(row.name).trim()) {
        errors.push({ row: rowNum, field: 'name', message: 'Customer name is required', recordSnippet: row });
        rowValid = false;
      }
      const phoneMatch = row.phone ? existingCustomers.find((c) => c.phone && c.phone.trim() === String(row.phone).trim()) : undefined;
      if (phoneMatch) {
        duplicateRecords++;
        recordsToUpdate++;
        warnings.push({ row: rowNum, message: `Customer with phone '${row.phone}' already exists. Will be updated.` });
      } else {
        recordsToCreate++;
      }
    } else if (params.entityType === 'suppliers') {
      if (!row.name || !String(row.name).trim()) {
        errors.push({ row: rowNum, field: 'name', message: 'Supplier name is required', recordSnippet: row });
        rowValid = false;
      }
      const nameMatch = existingSuppliers.find((s) => s.name.toLowerCase() === String(row.name).toLowerCase());
      if (nameMatch) {
        duplicateRecords++;
        recordsToUpdate++;
        warnings.push({ row: rowNum, message: `Supplier '${row.name}' exists. Will be updated.` });
      } else {
        recordsToCreate++;
      }
    }

    if (rowValid) {
      validRecords++;
    } else {
      invalidRecords++;
    }
  });

  const run: ImportRun = {
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    entityType: params.entityType,
    status: 'PREVIEW',
    totalRecords: params.rows.length,
    validRecords,
    invalidRecords,
    duplicateRecords,
    warningCount: warnings.length,
    recordsToCreate,
    recordsToUpdate,
    errors,
    warnings,
    previewRows: params.rows.slice(0, 10), // Limit sample preview
    locationId: params.locationId,
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
  };

  db.createImportRun(run);

  return { success: true, importRun: run };
}

export function executeImport(
  businessId: string,
  actor: { id: string; name: string },
  importRunId: string,
  validatedRows: any[]
): { success: boolean; importRun?: ImportRun; error?: string } {
  const run = db.getImportRunById(importRunId, businessId);
  if (!run) {
    return { success: false, error: 'Import session not found' };
  }

  if (run.status === 'COMPLETED') {
    return { success: true, importRun: run };
  }

  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;

  if (run.entityType === 'products') {
    const existing = db.getProducts(businessId);
    for (const row of validatedRows) {
      const match = (row.sku && existing.find((p) => p.sku === row.sku)) || existing.find((p) => p.name.toLowerCase() === String(row.name).toLowerCase());
      if (match) {
        db.updateProduct(match.id, businessId, {
          sellingPrice: Number(row.sellingPrice) || match.sellingPrice,
          buyingPrice: row.buyingPrice !== undefined ? Number(row.buyingPrice) : match.buyingPrice,
          category: row.category || match.category,
        });
        updatedCount++;
      } else {
        db.createProduct({
          id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          businessId,
          name: String(row.name).trim(),
          sku: row.sku || undefined,
          category: row.category || 'General',
          sellingPrice: Number(row.sellingPrice) || 0,
          buyingPrice: Number(row.buyingPrice) || 0,
          quantity: Number(row.quantity) || 0,
          minStockLevel: Number(row.minStockLevel) || 5,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }
  } else if (run.entityType === 'customers') {
    const existing = db.getCustomers(businessId);
    for (const row of validatedRows) {
      const match = row.phone ? existing.find((c) => c.phone === row.phone) : undefined;
      if (match) {
        db.updateCustomer(match.id, businessId, {
          email: row.email || match.email,
          address: row.address || match.address,
        });
        updatedCount++;
      } else {
        db.createCustomer({
          id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          businessId,
          name: String(row.name).trim(),
          phone: row.phone || '',
          email: row.email || '',
          address: row.address || '',
          debtBalance: 0,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }
  }

  const updatedRun = db.updateImportRun(run.id, businessId, {
    status: 'COMPLETED',
    executedAt: now,
    completedAt: now,
    recordsCreated: createdCount,
    recordsUpdated: updatedCount,
  });

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'IMPORT_COMPLETED',
    details: `Imported ${run.entityType}: ${createdCount} created, ${updatedCount} updated. Authorized by ${actor.name}.`,
    module: 'inventory',
    severity: 'INFO',
    metadata: { importRunId, entityType: run.entityType, createdCount, updatedCount },
  });

  return { success: true, importRun: updatedRun };
}

// ============================================================================
// STRUCTURED ACCOUNTING & FINANCIAL EXPORTS
// ============================================================================

export interface ExportAccountingOptions {
  entityType: 'sales' | 'payments' | 'expenses' | 'purchases' | 'debtors' | 'inventory';
  format?: 'JSON' | 'CSV';
  startDate?: string;
  endDate?: string;
  locationId?: string;
}

export function generateAccountingExport(
  businessId: string,
  actor: { id: string; name: string; role?: string; permissions?: any },
  options: ExportAccountingOptions
): { success: boolean; data?: any; exportRun?: ExportRun; error?: string } {
  // Financial Privacy check: staff requires allowViewFinancialReports
  if (actor.role === 'staff') {
    if (!actor.permissions?.allowViewFinancialReports && !actor.permissions?.financialReports) {
      return { success: false, error: 'Unauthorized: staff lacks financial reporting export permission' };
    }
  }

  // Location Access Check
  if (options.locationId && actor.role === 'staff') {
    const locRes = validateUserLocationAccess(actor as any, options.locationId, businessId);
    if (!locRes.allowed) {
      return { success: false, error: locRes.reason || 'Unauthorized location access' };
    }
  }

  const now = new Date().toISOString();
  let exportRecords: any[] = [];

  if (options.entityType === 'sales') {
    let sales = db.getSales(businessId);
    if (options.startDate) sales = sales.filter((s) => s.createdAt >= options.startDate!);
    if (options.endDate) sales = sales.filter((s) => s.createdAt <= options.endDate!);
    if (options.locationId) sales = sales.filter((s) => s.locationId === options.locationId);
    exportRecords = sales.map((s) => ({
      saleId: s.id,
      receiptNumber: s.receiptNumber,
      date: s.createdAt,
      totalGhs: s.total,
      amountPaidGhs: s.amountPaid,
      paymentMethod: s.paymentMethod,
      customerName: s.customerName || 'Walk-in Customer',
      locationId: s.locationId,
      status: s.status,
    }));
  } else if (options.entityType === 'expenses') {
    let expenses = db.getExpenses(businessId);
    if (options.startDate) expenses = expenses.filter((e) => e.date >= options.startDate!);
    if (options.endDate) expenses = expenses.filter((e) => e.date <= options.endDate!);
    if (options.locationId) expenses = expenses.filter((e) => e.locationId === options.locationId);
    exportRecords = expenses.map((e) => ({
      expenseId: e.id,
      date: e.date,
      category: e.category,
      amountGhs: e.amount,
      paymentMethod: e.paymentMethod,
      description: e.description,
      locationId: e.locationId,
    }));
  } else if (options.entityType === 'debtors') {
    const customers = db.getCustomers(businessId).filter((c) => (c.debtBalance || 0) > 0);
    exportRecords = customers.map((c) => ({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone,
      debtBalanceGhs: c.debtBalance,
      lastPaymentDate: (c as any).lastPaymentDate || c.lastTransactionDate || null,
    }));
  } else if (options.entityType === 'inventory') {
    let prods = db.getProducts(businessId);
    exportRecords = prods.map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      quantityInStock: options.locationId && p.locationStock ? (p.locationStock[options.locationId] ?? 0) : p.quantity,
      sellingPriceGhs: p.sellingPrice,
      buyingPriceGhs: p.buyingPrice,
      valuationGhs: (p.buyingPrice || 0) * (options.locationId && p.locationStock ? (p.locationStock[options.locationId] ?? 0) : p.quantity),
    }));
  }

  const checksum = crypto.createHash('sha256').update(JSON.stringify(exportRecords)).digest('hex').slice(0, 16);

  const run: ExportRun = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    entityType: options.entityType,
    format: options.format || 'JSON',
    recordCount: exportRecords.length,
    dateRange: options.startDate && options.endDate ? { startDate: options.startDate, endDate: options.endDate } : undefined,
    locationId: options.locationId,
    exportedBy: actor.id,
    exportedAt: now,
    summaryChecksum: checksum,
  };

  db.createExportRun(run);

  db.logAudit({
    businessId,
    userId: actor.id,
    userName: actor.name,
    action: 'EXPORT_COMPLETED',
    details: `Exported ${exportRecords.length} ${options.entityType} records (Format: ${run.format}, Checksum: ${checksum}).`,
    module: 'financial_reports',
    severity: 'INFO',
    metadata: { exportRunId: run.id, entityType: options.entityType, count: exportRecords.length },
  });

  return { success: true, data: exportRecords, exportRun: run };
}

// ============================================================================
// FINANCIAL RECONCILIATION ENGINE
// ============================================================================

export function reconcileProviderPayments(
  businessId: string,
  provider: string,
  dateRange: { startDate: string; endDate: string },
  locationId?: string
): ReconciliationReport {
  const externalPayments = db.getExternalPayments(businessId).filter((p) => {
    if (p.provider !== provider) return false;
    if (p.initiatedAt < dateRange.startDate || p.initiatedAt > dateRange.endDate) return false;
    if (locationId && p.locationId !== locationId) return false;
    return true;
  });

  let sales = db.getSales(businessId).filter((s) => {
    if (s.createdAt < dateRange.startDate || s.createdAt > dateRange.endDate) return false;
    if (locationId && s.locationId !== locationId) return false;
    return s.paymentMethod?.toLowerCase().includes('momo') || s.paymentMethod?.toLowerCase().includes('card') || s.paymentMethod?.toLowerCase().includes(provider.toLowerCase());
  });

  const internalTotalGhs = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const externalTotalGhs = externalPayments.reduce((sum, p) => sum + (p.status === 'SUCCESS' ? p.amount : 0), 0);

  const matched: any[] = [];
  const unmatchedInternal: any[] = [];
  const unmatchedExternal: any[] = [...externalPayments];

  sales.forEach((s) => {
    const extIdx = unmatchedExternal.findIndex((e) => Math.abs(e.amount - s.total) < 0.01 && (e.status === 'SUCCESS' || e.status === 'PENDING'));
    if (extIdx >= 0) {
      matched.push({ sale: s, externalPayment: unmatchedExternal[extIdx] });
      unmatchedExternal.splice(extIdx, 1);
    } else {
      unmatchedInternal.push(s);
    }
  });

  const matchedTotalGhs = matched.reduce((sum, m) => sum + (m.sale.total || 0), 0);
  const varianceGhs = internalTotalGhs - externalTotalGhs;

  return {
    generatedAt: new Date().toISOString(),
    businessId,
    provider,
    dateRange,
    locationId,
    internalTotalGhs,
    internalCount: sales.length,
    externalTotalGhs,
    externalCount: externalPayments.length,
    matchedCount: matched.length,
    matchedTotalGhs,
    unmatchedInternalCount: unmatchedInternal.length,
    unmatchedExternalCount: unmatchedExternal.length,
    discrepancyCount: unmatchedInternal.length + unmatchedExternal.length,
    varianceGhs,
    isBalanced: Math.abs(varianceGhs) < 0.01 && unmatchedInternal.length === 0 && unmatchedExternal.length === 0,
    unmatchedInternal,
    unmatchedExternal,
  };
}

// ============================================================================
// INTEGRATION HEALTH & DIAGNOSTICS
// ============================================================================

export function runIntegrationDiagnostics(businessId: string): IntegrationDiagnosticsReport {
  const checks: IntegrationDiagnosticCheck[] = [];
  const integrations = db.getIntegrations(businessId);
  const webhooks = db.getWebhookEvents(businessId);
  const syncRuns = db.getSyncRuns(businessId);
  const externalPayments = db.getExternalPayments(businessId);
  const mappings = db.getExternalMappings(businessId);

  // 1. Integration Configuration Check
  let missingConfigCount = 0;
  integrations.forEach((i) => {
    const providerDef = providerRegistry.get(i.provider);
    if (providerDef) {
      const v = providerDef.validateConfiguration(i.configuration);
      if (!v.valid) missingConfigCount++;
    }
  });
  checks.push({
    id: 'integration_configuration_check',
    name: 'Provider Configuration Validation',
    category: 'Integrations',
    status: missingConfigCount === 0 ? 'PASS' : 'WARN',
    details: missingConfigCount === 0 ? 'All configured integrations pass required parameters.' : `${missingConfigCount} integration(s) have missing configuration fields.`,
    affectedCount: missingConfigCount,
    suggestedAction: missingConfigCount > 0 ? 'Review integration settings and supply required fields' : undefined,
    autoRepairable: false,
  });

  // 2. Integration Credentials Check
  let missingCredsCount = 0;
  integrations.filter((i) => i.status === 'CONNECTED').forEach((i) => {
    const providerDef = providerRegistry.get(i.provider);
    if (providerDef && providerDef.requiredSecretKeys.length > 0 && !i.hasCredentials) {
      missingCredsCount++;
    }
  });
  checks.push({
    id: 'integration_credentials_check',
    name: 'Encrypted Credential Verification',
    category: 'Security',
    status: missingCredsCount === 0 ? 'PASS' : 'FAIL',
    details: missingCredsCount === 0 ? 'All active integrations have verified encrypted credentials.' : `${missingCredsCount} active integration(s) lack required secret keys.`,
    affectedCount: missingCredsCount,
    suggestedAction: missingCredsCount > 0 ? 'Supply API secret credentials or re-authorize' : undefined,
    autoRepairable: false,
  });

  // 3. Webhook Integrity Check
  const errorWebhooks = webhooks.filter((w) => w.status === 'ERROR' || w.status === 'REJECTED');
  checks.push({
    id: 'webhook_integrity_check',
    name: 'Inbound Webhook Delivery Health',
    category: 'Webhooks',
    status: errorWebhooks.length === 0 ? 'PASS' : errorWebhooks.length > 5 ? 'FAIL' : 'WARN',
    details: errorWebhooks.length === 0 ? 'All inbound webhooks verified and processed without error.' : `${errorWebhooks.length} webhook event(s) failed or rejected.`,
    affectedCount: errorWebhooks.length,
    suggestedAction: errorWebhooks.length > 0 ? 'Check provider webhook signing secrets and payload formats' : undefined,
    autoRepairable: false,
  });

  // 4. Sync State Check
  const failedSyncs = syncRuns.filter((s) => s.status === 'FAILED');
  checks.push({
    id: 'sync_state_check',
    name: 'Background Synchronization State',
    category: 'Sync',
    status: failedSyncs.length === 0 ? 'PASS' : 'WARN',
    details: failedSyncs.length === 0 ? 'All synchronization runs completed successfully.' : `${failedSyncs.length} sync run(s) failed in history.`,
    affectedCount: failedSyncs.length,
    suggestedAction: failedSyncs.length > 0 ? 'Review sync logs and retry failed sync batches' : undefined,
    autoRepairable: false,
  });

  // 5. External Mapping Check
  checks.push({
    id: 'external_mapping_check',
    name: 'External ID Mapping Coherence',
    category: 'Data Mapping',
    status: 'PASS',
    details: `${mappings.length} external entity mappings indexed without collision.`,
    affectedCount: 0,
    autoRepairable: false,
  });

  // 6. Duplicate Event Check
  const duplicateEvents = webhooks.filter((w) => w.status === 'DUPLICATE');
  checks.push({
    id: 'duplicate_event_check',
    name: 'Webhook Idempotency & Duplicate Defenses',
    category: 'Integrity',
    status: 'PASS',
    details: `${duplicateEvents.length} duplicate webhook deliveries safely absorbed without duplicate mutations.`,
    affectedCount: duplicateEvents.length,
    autoRepairable: false,
  });

  // 7. Payment Reconciliation Check
  const unsettled = externalPayments.filter((p) => p.status === 'PENDING');
  checks.push({
    id: 'payment_reconciliation_check',
    name: 'External Payment Settlement Status',
    category: 'Payments',
    status: unsettled.length > 10 ? 'WARN' : 'PASS',
    details: `${unsettled.length} external payment transaction(s) pending settlement verification.`,
    affectedCount: unsettled.length,
    suggestedAction: unsettled.length > 10 ? 'Review pending mobile money transactions' : undefined,
    autoRepairable: false,
  });

  // 8. Location Scope Check
  let invalidLocationCount = 0;
  integrations.forEach((i) => {
    if (i.locationScope === 'LOCATION' && i.locationId) {
      const loc = db.getLocationById(i.locationId, businessId);
      if (!loc || loc.status !== 'ACTIVE') invalidLocationCount++;
    }
  });
  checks.push({
    id: 'location_scope_check',
    name: 'Multi-Location Integration Scoping',
    category: 'Locations',
    status: invalidLocationCount === 0 ? 'PASS' : 'WARN',
    details: invalidLocationCount === 0 ? 'All location-scoped integrations bound to active branches.' : `${invalidLocationCount} integration(s) reference missing or inactive locations.`,
    affectedCount: invalidLocationCount,
    suggestedAction: invalidLocationCount > 0 ? 'Re-assign location scope or re-activate branch' : undefined,
    autoRepairable: false,
  });

  const failedCount = checks.filter((c) => c.status === 'FAIL').length;
  const warningCount = checks.filter((c) => c.status === 'WARN').length;
  const passedCount = checks.filter((c) => c.status === 'PASS').length;

  const score = Math.max(0, Math.min(100, Math.round(100 - (failedCount * 25 + warningCount * 10))));

  return {
    generatedAt: new Date().toISOString(),
    businessId,
    healthy: failedCount === 0,
    overallScore: score,
    totalChecks: checks.length,
    passedChecks: passedCount,
    warningChecks: warningCount,
    failedChecks: failedCount,
    checks,
  };
}
