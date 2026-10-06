import { db } from './db.js';
import { getAccraToday } from './date.js';
import type {
  CommunicationRecord,
  CommunicationTemplate,
  CommunicationOpportunity,
  CommunicationSummary,
  CommunicationType,
  Customer,
} from '../src/types/index.js';

/**
 * Standard Ghanaian phone number normalizer for WhatsApp.
 * Strips non-digits, converts leading '0' to '233', ensures proper format.
 */
export function formatGhanaPhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('233') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '233' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '233' + digits;
  }
  return digits;
}

export const normalizeGhanaPhone = formatGhanaPhoneForWhatsApp;

/**
 * Generates an official WhatsApp web/mobile link.
 * Link-based trigger — does NOT claim direct automated API sending.
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const normalizedPhone = formatGhanaPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text || '');
  if (!normalizedPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

/**
 * Replaces {{variable}} placeholders with actual contextual values.
 */
export function renderCommunicationTemplate(
  templateContent: string,
  variables: Record<string, any>
): string {
  if (!templateContent) return '';
  let rendered = templateContent;

  for (const [key, val] of Object.entries(variables)) {
    const stringVal = val !== undefined && val !== null ? String(val) : '';
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, stringVal);
  }

  return rendered;
}

/**
 * Sanitizes communication content when viewed by staff without financial view permissions.
 * Redacts debt amounts and financial figures if the user lacks financial permission.
 */
export function sanitizeCommunicationForStaff(
  comm: CommunicationRecord,
  canViewFinancial: boolean
): CommunicationRecord {
  if (canViewFinancial) return comm;

  if (comm.type === 'DEBT_REMINDER') {
    const sanitizedMsg = comm.message.replace(/GH[₵c]\s*[\d,]+(\.\d{2})?/gi, 'GH₵ [Confidential]');
    return {
      ...comm,
      message: sanitizedMsg,
    };
  }

  return comm;
}

/**
 * Discovers and surfaces actionable customer communication opportunities based on
 * real authoritative debt, purchase history, customer segmentation, and preferences.
 */
export function generateCommunicationOpportunities(
  businessId: string,
  canViewFinancial: boolean
): CommunicationOpportunity[] {
  const business = db.getBusiness(businessId);
  const businessName = business?.name || 'Our Shop';
  const customers = db.getCustomers(businessId);
  const sales = db.getSales(businessId);
  const allTasks = db.getTasks(businessId);
  const tasks = allTasks.filter((t) => t.status === 'pending');
  const templates = db.getCommunicationTemplates(businessId);
  const today = getAccraToday();

  const debtTemplate = templates.find((t) => t.type === 'DEBT_REMINDER' && t.isSystem);
  const followUpTemplate = templates.find((t) => t.type === 'PURCHASE_FOLLOW_UP' && t.isSystem);
  const appreciationTemplate = templates.find((t) => t.type === 'CUSTOMER_APPRECIATION' && t.isSystem);
  const inactiveTemplate = templates.find((t) => t.type === 'INACTIVE_CUSTOMER' && t.isSystem);
  const vipTemplate = templates.find((t) => t.type === 'VIP_FOLLOW_UP' && t.isSystem);
  const loyaltyRewardTemplate = templates.find((t) => t.type === 'LOYALTY_REWARD' && t.isSystem);
  const loyaltyMilestoneTemplate = templates.find((t) => t.type === 'LOYALTY_MILESTONE' && t.isSystem);

  const opportunities: CommunicationOpportunity[] = [];

  // Helper to find associated pending task
  const findTaskForCustomer = (custId: string) => {
    return tasks.find((t) => t.sourceEntityId === custId || t.dedupKey.includes(custId));
  };

  for (const customer of customers) {
    if (customer.isDeleted) continue;
    const prefs = customer.communicationPreferences;
    const isOptedOut = prefs?.optedOut === true;
    const whatsappAllowed = prefs ? prefs.whatsappAllowed : true;

    if (!customer.phone || !whatsappAllowed) {
      continue;
    }

    const customerSales = sales
      .filter((s) => s.customerId === customer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latestSale = customerSales[0];
    const totalSpent = customer.totalPurchases || 0;
    const debtBalance = customer.currentDebt || customer.debtBalance || 0;

    // 1. DEBT REMINDER OPPORTUNITY
    const debtAllowed = prefs ? prefs.debtRemindersAllowed : true;
    if (debtBalance > 0 && debtAllowed && !isOptedOut) {
      const activeTask = findTaskForCustomer(customer.id);
      const displayAmount = canViewFinancial ? debtBalance.toFixed(2) : '[Confidential]';
      const msg = debtTemplate
        ? renderCommunicationTemplate(debtTemplate.content, {
            customerName: customer.name,
            businessName,
            amountDue: displayAmount,
          })
        : `Hello ${customer.name}, friendly reminder from ${businessName} regarding your outstanding balance of GH₵ ${displayAmount}. Thank you.`;

      opportunities.push({
        id: `opp_debt_${customer.id}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: 'DEBT_REMINDER',
        channel: 'whatsapp',
        reason: `Outstanding debt balance of GH₵ ${displayAmount}`,
        recommendedMessage: msg,
        suggestedTemplateId: debtTemplate?.id,
        urgency: debtBalance > 500 ? 'high' : 'normal',
        relatedEntityId: customer.id,
        dedupKey: `opp_debt_${customer.id}_${today}`,
        hasActiveTask: !!activeTask,
        relatedTaskId: activeTask?.id,
        metadata: {
          debtAmount: canViewFinancial ? debtBalance : undefined,
        },
      });
    }

    // 2. POST-PURCHASE FOLLOW UP (Within last 3 days)
    const operationalAllowed = prefs ? prefs.operationalAllowed : true;
    if (latestSale && operationalAllowed && !isOptedOut) {
      const saleDate = new Date(latestSale.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        const msg = followUpTemplate
          ? renderCommunicationTemplate(followUpTemplate.content, {
              customerName: customer.name,
              businessName,
            })
          : `Hello ${customer.name}, thank you for shopping with ${businessName}! Let us know if you need any assistance.`;

        opportunities.push({
          id: `opp_post_purchase_${customer.id}_${latestSale.id}`,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: 'PURCHASE_FOLLOW_UP',
          channel: 'whatsapp',
          reason: `Recent purchase completed ${diffDays === 0 ? 'today' : `${diffDays} day(s) ago`}`,
          recommendedMessage: msg,
          suggestedTemplateId: followUpTemplate?.id,
          urgency: 'normal',
          relatedEntityId: latestSale.id,
          dedupKey: `opp_purchase_${latestSale.id}`,
          metadata: {
            saleId: latestSale.id,
            saleTotal: latestSale.total,
          },
        });
      }
    }

    // 3. VIP CUSTOMER CHECK-IN (High value, no purchase in 14+ days)
    const marketingAllowed = prefs ? prefs.marketingAllowed : false;
    const isVip = (customer.segments && customer.segments.includes('High Value')) ||
      customer.segment === 'High Value' ||
      totalSpent >= 2000;

    if (isVip && !isOptedOut) {
      const daysSince = customer.daysSinceLastPurchase !== undefined
        ? customer.daysSinceLastPurchase
        : (latestSale
          ? Math.floor((new Date().getTime() - new Date(latestSale.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999);

      if (daysSince >= 14 && daysSince <= 60) {
        const msg = vipTemplate
          ? renderCommunicationTemplate(vipTemplate.content, {
              customerName: customer.name,
              businessName,
            })
          : `Hello ${customer.name}, as one of our most valued customers at ${businessName}, we wanted to check in. Warm regards!`;

        opportunities.push({
          id: `opp_vip_${customer.id}`,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: 'VIP_FOLLOW_UP',
          channel: 'whatsapp',
          reason: `High-value customer inactive for ${daysSince} days`,
          recommendedMessage: msg,
          suggestedTemplateId: vipTemplate?.id,
          urgency: 'normal',
          relatedEntityId: customer.id,
          dedupKey: `opp_vip_${customer.id}_${today.substring(0, 7)}`,
          metadata: {
            totalSpent: canViewFinancial ? totalSpent : undefined,
            daysSinceLastPurchase: daysSince,
          },
        });
      }
    }

    // 4. INACTIVE CUSTOMER RE-ENGAGEMENT (Inactive segment, 30+ days)
    const isInactive = (customer.segments && customer.segments.includes('Inactive')) ||
      customer.segment === 'Inactive' ||
      (customer.daysSinceLastPurchase !== undefined && customer.daysSinceLastPurchase > 30);

    if (isInactive && marketingAllowed && !isOptedOut) {
      const daysSince = customer.daysSinceLastPurchase || 45;
      const msg = inactiveTemplate
        ? renderCommunicationTemplate(inactiveTemplate.content, {
            customerName: customer.name,
            businessName,
          })
        : `Hello ${customer.name}, we miss you at ${businessName}! We'd love to welcome you back soon.`;

      opportunities.push({
        id: `opp_inactive_${customer.id}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: 'INACTIVE_CUSTOMER',
        channel: 'whatsapp',
        reason: `Customer inactive for ${daysSince} days`,
        recommendedMessage: msg,
        suggestedTemplateId: inactiveTemplate?.id,
        urgency: 'low',
        relatedEntityId: customer.id,
        dedupKey: `opp_inactive_${customer.id}_${today.substring(0, 7)}`,
        metadata: {
          daysSinceLastPurchase: daysSince,
        },
      });
    }

    // 5. CUSTOMER APPRECIATION (Frequent buyers with 5+ orders and 0 debt)
    const isFrequent = (customer.segments && customer.segments.includes('Frequent')) ||
      customer.segment === 'Frequent' ||
      (customer.salesCount && customer.salesCount >= 5);

    if (isFrequent && debtBalance === 0 && !isOptedOut) {
      const msg = appreciationTemplate
        ? renderCommunicationTemplate(appreciationTemplate.content, {
            customerName: customer.name,
            businessName,
          })
        : `Dear ${customer.name}, ${businessName} appreciates your continued loyalty and trust!`;

      opportunities.push({
        id: `opp_appreciation_${customer.id}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: 'CUSTOMER_APPRECIATION',
        channel: 'whatsapp',
        reason: `Loyal customer with ${customer.salesCount || customerSales.length} purchases and no debt`,
        recommendedMessage: msg,
        suggestedTemplateId: appreciationTemplate?.id,
        urgency: 'low',
        relatedEntityId: customer.id,
        dedupKey: `opp_appreciation_${customer.id}_${today.substring(0, 7)}`,
        metadata: {
          purchaseCount: customer.salesCount || customerSales.length,
        },
      });
    }

    // 6. LOYALTY REWARD OPPORTUNITY (Has redeemable points and 0 debt)
    const pointsBalance = db.getCustomerPointsBalance(businessId, customer.id).balance;
    if (pointsBalance >= 50 && debtBalance === 0 && !isOptedOut) {
      const msg = loyaltyRewardTemplate
        ? renderCommunicationTemplate(loyaltyRewardTemplate.content, {
            customerName: customer.name,
            businessName,
          })
        : `Hello ${customer.name}, you have accumulated ${pointsBalance} loyalty points at ${businessName}! Visit us to redeem your reward.`;

      opportunities.push({
        id: `opp_loyalty_${customer.id}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: 'LOYALTY_REWARD',
        channel: 'whatsapp',
        reason: `Customer has ${pointsBalance} redeemable loyalty points`,
        recommendedMessage: msg,
        suggestedTemplateId: loyaltyRewardTemplate?.id,
        urgency: 'low',
        relatedEntityId: customer.id,
        dedupKey: `opp_loyalty_${customer.id}_${today.substring(0, 7)}`,
        metadata: {
          pointsBalance,
        },
      });
    }
  }

  // Deduplicate against already prepared or sent communications today
  const existingComms = db.getCommunications(businessId);
  const activeDedupKeys = new Set(
    existingComms
      .filter((c) => c.status !== 'CANCELLED' && c.status !== 'SKIPPED')
      .map((c) => c.dedupKey)
      .filter(Boolean)
  );

  return opportunities.filter((opp) => !activeDedupKeys.has(opp.dedupKey));
}

/**
 * Returns summary counts of communications and opportunities.
 */
export function getCommunicationSummary(
  businessId: string,
  canViewFinancial = true
): CommunicationSummary {
  const comms = db.getCommunications(businessId);
  const opportunities = generateCommunicationOpportunities(businessId, canViewFinancial);

  let draftsCount = 0;
  let pendingApprovalCount = 0;
  let approvedCount = 0;
  let openedCount = 0;

  const byType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const c of comms) {
    if (c.status === 'DRAFT') draftsCount++;
    if (c.status === 'PENDING_APPROVAL') pendingApprovalCount++;
    if (c.status === 'APPROVED' || c.status === 'READY') approvedCount++;
    if (c.status === 'OPENED' || c.status === 'SENT') openedCount++;

    byType[c.type] = (byType[c.type] || 0) + 1;
    byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }

  const customers = db.getCustomers(businessId);
  const optedOutCustomersCount = customers.filter(
    (c) => c.communicationPreferences?.optedOut === true
  ).length;

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    totalCommunications: comms.length,
    draftsCount,
    pendingApprovalCount,
    approvedCount,
    openedCount,
    opportunitiesCount: opportunities.length,
    optedOutCustomersCount,
    byType,
    byChannel,
    byStatus,
  };
}
