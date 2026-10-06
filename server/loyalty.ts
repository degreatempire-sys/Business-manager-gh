/**
 * Server-Side Controlled Business Loyalty, Retention & Customer Growth Engine (Stage 4N)
 * Fully tenant-isolated, deterministic, idempotent, and financially safe.
 * Zero unverified mutations. Integrates with Stages 4B, 4C, 4D, 4H, 4L, and 4M.
 */

import { db } from './db.js';
import { getAccraToday } from './date.js';
import type {
  LoyaltyConfig,
  LoyaltyTier,
  LoyaltyLedgerEntry,
  LoyaltyMilestoneRecord,
  LoyaltyReferral,
  LoyaltyRewardRedemption,
  CustomerLoyaltyProfile,
  LoyaltyAnalytics,
  CustomerRetentionStatus,
  Sale,
  Customer,
} from '../src/types/index.js';

export interface RetentionOpportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  type: 'AT_RISK_VIP' | 'AT_RISK_LOYAL' | 'MILESTONE_APPROACHING' | 'REWARD_ELIGIBLE' | 'REFERRAL_QUALIFIED' | 'RE_ENGAGEMENT';
  title: string;
  description: string;
  suggestedAction: string;
  urgency: 'high' | 'normal' | 'low';
  dedupKey: string;
  metadata?: Record<string, any>;
}

/**
 * Deterministically calculates a customer's loyalty tier based on configured rules.
 */
export function determineCustomerTier(
  config: LoyaltyConfig,
  totalSpend: number,
  orderCount: number
): { tier: LoyaltyTier; perksDescription: string; multiplier: number; explanation: string } {
  // Sort tiers by minSpend and minOrders descending: VIP -> Gold -> Silver -> Standard
  const tiersDescending = [...(config.tiers || [])].sort((a, b) => {
    return b.minSpend - a.minSpend || b.minOrders - a.minOrders;
  });

  for (const t of tiersDescending) {
    if (t.tier === 'Standard') continue;
    const meetsSpend = t.minSpend > 0 ? totalSpend >= t.minSpend : true;
    const meetsOrders = t.minOrders > 0 ? orderCount >= t.minOrders : true;
    if (meetsSpend && meetsOrders) {
      const criteriaStr = `GH₵${totalSpend.toFixed(2)} lifetime spend (min: GH₵${t.minSpend})`;
      return {
        tier: t.tier,
        perksDescription: t.perksDescription,
        multiplier: t.multiplier,
        explanation: `${t.tier} tier — Qualified via ${criteriaStr}`,
      };
    }
  }

  return {
    tier: 'Standard',
    perksDescription: 'Base member earning rate',
    multiplier: 1.0,
    explanation: 'Standard tier — Base member',
  };
}

/**
 * Deterministically determines retention status and an explainable message.
 */
export function determineRetentionStatus(
  customer: Customer,
  completedSales: Sale[],
  todayAccra: string
): { status: CustomerRetentionStatus; explanation: string; daysSinceLastPurchase: number } {
  const orderCount = completedSales.length;

  if (orderCount === 0) {
    return {
      status: 'NEW',
      explanation: 'New customer — no completed transactions recorded yet.',
      daysSinceLastPurchase: 0,
    };
  }

  // Calculate days since last purchase
  const sortedSales = [...completedSales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestSale = sortedSales[0];
  const latestDateStr = latestSale.createdAt;
  const diffMs = new Date(todayAccra).getTime() - new Date(latestDateStr).getTime();
  const daysSinceLastPurchase = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const totalSpend = completedSales.reduce((sum, s) => sum + s.total, 0);

  if (orderCount === 1) {
    if (daysSinceLastPurchase <= 30) {
      return {
        status: 'NEW',
        explanation: `First-time customer — 1 completed purchase made ${daysSinceLastPurchase} days ago.`,
        daysSinceLastPurchase,
      };
    }
    return {
      status: 'AT_RISK',
      explanation: `Single-purchase customer with no return visit for ${daysSinceLastPurchase} days.`,
      daysSinceLastPurchase,
    };
  }

  // Order count >= 2: calculate average interval
  const oldestSale = sortedSales[sortedSales.length - 1];
  const oldestDateStr = oldestSale.createdAt;
  const spanMs = new Date(latestDateStr).getTime() - new Date(oldestDateStr).getTime();
  const spanDays = Math.max(1, Math.floor(spanMs / (1000 * 60 * 60 * 24)));
  const avgIntervalDays = Math.max(1, Math.round(spanDays / (orderCount - 1)));

  if (daysSinceLastPurchase <= 30) {
    if (orderCount >= 10 || totalSpend >= 2000) {
      return {
        status: 'HIGHLY_ENGAGED',
        explanation: `Highly engaged — ${orderCount} completed purchases, GH₵${totalSpend.toFixed(2)} lifetime spend, active ${daysSinceLastPurchase} days ago.`,
        daysSinceLastPurchase,
      };
    }
    if (orderCount >= 5) {
      return {
        status: 'LOYAL',
        explanation: `Loyal frequent buyer — ${orderCount} purchases, last visit ${daysSinceLastPurchase} days ago (avg interval: ${avgIntervalDays} days).`,
        daysSinceLastPurchase,
      };
    }
    return {
      status: 'RETURNING',
      explanation: `Active returning customer — ${orderCount} purchases, last visit ${daysSinceLastPurchase} days ago.`,
      daysSinceLastPurchase,
    };
  }

  if (daysSinceLastPurchase <= 60) {
    return {
      status: 'AT_RISK',
      explanation: `At risk — no purchase for ${daysSinceLastPurchase} days (previous average purchase interval was ${avgIntervalDays} days).`,
      daysSinceLastPurchase,
    };
  }

  if (daysSinceLastPurchase <= 90) {
    return {
      status: 'AT_RISK',
      explanation: `At risk — inactive for ${daysSinceLastPurchase} days across ${orderCount} historical orders.`,
      daysSinceLastPurchase,
    };
  }

  if (totalSpend >= 1000 || orderCount >= 5) {
    return {
      status: 'RE_ENGAGEMENT_OPPORTUNITY',
      explanation: `Re-engagement opportunity — formerly active customer (${orderCount} orders, GH₵${totalSpend.toFixed(2)} spend) inactive for ${daysSinceLastPurchase} days.`,
      daysSinceLastPurchase,
    };
  }

  return {
    status: 'INACTIVE',
    explanation: `Inactive — no purchase recorded for ${daysSinceLastPurchase} days.`,
    daysSinceLastPurchase,
  };
}

/**
 * Retrieves the full deterministic loyalty profile for a given customer.
 */
export function getCustomerLoyaltyProfile(
  businessId: string,
  customerId: string
): CustomerLoyaltyProfile | null {
  const customer = db.getCustomerById(customerId, businessId);
  if (!customer) return null;

  const config = db.getLoyaltyConfig(businessId);
  const todayAccra = getAccraToday();

  // Completed sales for this customer
  const allSales = db.getSales(businessId);
  const completedSales = allSales.filter(
    (s) => s.customerId === customerId && s.status !== 'Cancelled'
  );

  const completedPurchasesCount = completedSales.length;
  const totalPurchaseValue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const averageOrderValue = completedPurchasesCount > 0 ? totalPurchaseValue / completedPurchasesCount : 0;

  // Dates
  const sortedSales = [...completedSales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const firstPurchaseDate = sortedSales.length > 0 ? sortedSales[0].createdAt : undefined;
  const lastPurchaseDate = sortedSales.length > 0 ? sortedSales[sortedSales.length - 1].createdAt : undefined;

  // Retention status
  const retention = determineRetentionStatus(customer, completedSales, todayAccra);

  // Tier
  const tierInfo = determineCustomerTier(config, totalPurchaseValue, completedPurchasesCount);

  // Points balance & stats
  const pointsStats = db.getCustomerPointsBalance(businessId, customerId);

  // Milestones
  const milestones = db.getLoyaltyMilestones(businessId, customerId);

  // Referrals
  const referrals = db.getLoyaltyReferrals(businessId, { referrerCustomerId: customerId });

  // Eligible rewards
  const canRedeem = config.enabled && pointsStats.balance >= config.minimumPointsToRedeem;
  const estimatedValueGhs = pointsStats.balance * config.pointValue;

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    tier: tierInfo.tier,
    tierDescription: tierInfo.explanation,
    tierQualificationReason: tierInfo.explanation,
    pointsBalance: pointsStats.balance,
    lifetimePointsEarned: pointsStats.earned,
    lifetimePointsRedeemed: pointsStats.redeemed,
    completedPurchasesCount,
    totalPurchaseValue,
    averageOrderValue,
    firstPurchaseDate,
    lastPurchaseDate,
    daysSinceLastPurchase: retention.daysSinceLastPurchase,
    retentionStatus: retention.status,
    retentionExplanation: retention.explanation,
    milestones,
    referrals,
    eligibleRewards: {
      canRedeem,
      availablePoints: pointsStats.balance,
      estimatedValueGhs,
      minimumRequiredPoints: config.minimumPointsToRedeem,
    },
  };
}

/**
 * Processes loyalty points for a completed sale.
 * Fully idempotent: prevents duplicate points with deterministic dedupKey.
 */
export function processSaleLoyaltyPoints(
  sale: Sale,
  userId: string,
  userName?: string
): {
  pointsEarned: number;
  newMilestones: LoyaltyMilestoneRecord[];
  qualifiedReferrals: LoyaltyReferral[];
} {
  const result = {
    pointsEarned: 0,
    newMilestones: [] as LoyaltyMilestoneRecord[],
    qualifiedReferrals: [] as LoyaltyReferral[],
  };

  if (!sale.customerId || !sale.businessId) return result;
  if (sale.status === 'Cancelled') return result;

  const config = db.getLoyaltyConfig(sale.businessId);
  if (!config.enabled) return result;

  // 1. Check purchase points dedup
  const purchaseDedupKey = `purchase:${sale.businessId}:${sale.id}`;
  const existingEntry = db.findLedgerEntryByDedupKey(purchaseDedupKey);

  // Calculate prior sales to determine tier and order count
  const allSales = db.getSales(sale.businessId);
  const priorCompletedSales = allSales.filter(
    (s) => s.customerId === sale.customerId && s.status !== 'Cancelled' && s.id !== sale.id
  );
  const priorTotalSpend = priorCompletedSales.reduce((sum, s) => sum + s.total, 0);
  const orderCount = priorCompletedSales.length + 1; // Including current sale
  const newTotalSpend = priorTotalSpend + sale.total;

  const tierInfo = determineCustomerTier(config, priorTotalSpend, priorCompletedSales.length);

  // Award purchase points if eligible and not already awarded
  if (!existingEntry && sale.total >= config.minimumPurchaseForPoints) {
    const basePoints = sale.total * config.pointsPerCurrencyUnit;
    const pointsAwarded = Math.floor(basePoints * tierInfo.multiplier);

    if (pointsAwarded > 0) {
      db.addLoyaltyLedgerEntry({
        businessId: sale.businessId,
        customerId: sale.customerId,
        type: 'PURCHASE_EARNED',
        points: pointsAwarded,
        referenceId: sale.id,
        referenceType: 'sale',
        description: `Earned ${pointsAwarded} points for sale #${sale.receiptNumber} (${tierInfo.tier} tier: ${tierInfo.multiplier}x)`,
        createdBy: userId,
        createdByName: userName,
        dedupKey: purchaseDedupKey,
      });

      db.logAudit({
        businessId: sale.businessId,
        userId,
        userName: userName || 'Staff',
        action: 'LOYALTY_POINTS_EARNED',
        details: `Customer awarded ${pointsAwarded} loyalty points for sale #${sale.receiptNumber} (Amount: GH₵${sale.total.toFixed(2)}).`,
      });

      result.pointsEarned = pointsAwarded;
    }
  }

  // 2. Evaluate Milestones (deterministic, deduplicated)
  const milestoneCandidates = [
    { code: 'FIRST_PURCHASE', condition: orderCount === 1, title: 'First Purchase', desc: 'Completed first purchase', points: 10 },
    { code: 'PURCHASE_COUNT_5', condition: orderCount === 5, title: '5th Purchase Milestone', desc: 'Completed 5 lifetime purchases', points: 25 },
    { code: 'PURCHASE_COUNT_10', condition: orderCount === 10, title: '10th Purchase Milestone', desc: 'Completed 10 lifetime purchases', points: 50 },
    { code: 'PURCHASE_COUNT_20', condition: orderCount === 20, title: '20th Purchase Milestone', desc: 'Completed 20 lifetime purchases', points: 100 },
    { code: 'SPEND_1000', condition: newTotalSpend >= 1000, title: 'GH₵1,000 Spend Milestone', desc: 'Reached GH₵1,000 in lifetime spending', points: 50 },
    { code: 'SPEND_2500', condition: newTotalSpend >= 2500, title: 'GH₵2,500 Spend Milestone', desc: 'Reached GH₵2,500 in lifetime spending', points: 100 },
    { code: 'SPEND_5000', condition: newTotalSpend >= 5000, title: 'GH₵5,000 Spend Milestone', desc: 'Reached GH₵5,000 in lifetime spending', points: 200 },
  ];

  for (const mc of milestoneCandidates) {
    if (mc.condition) {
      const mDedupKey = `milestone:${sale.businessId}:${sale.customerId}:${mc.code}`;
      const existingM = db.getLoyaltyMilestones(sale.businessId, sale.customerId).find((m) => m.dedupKey === mDedupKey);
      if (!existingM) {
        const milestone = db.recordLoyaltyMilestone({
          businessId: sale.businessId,
          customerId: sale.customerId,
          milestoneCode: mc.code,
          title: mc.title,
          description: mc.desc,
          rewardPoints: mc.points,
          dedupKey: mDedupKey,
        });
        result.newMilestones.push(milestone);

        db.logAudit({
          businessId: sale.businessId,
          userId,
          userName: userName || 'System',
          action: 'LOYALTY_MILESTONE_COMPLETED',
          details: `Customer achieved milestone "${mc.title}" (${mc.points} points).`,
        });
      }
    }
  }

  // 3. Evaluate Referrals (qualifying purchase by referred customer)
  if (config.allowReferralRewards) {
    const pendingReferrals = db.getLoyaltyReferrals(sale.businessId, {
      referredCustomerId: sale.customerId,
    }).filter((r) => r.status === 'PENDING');

    for (const ref of pendingReferrals) {
      if (sale.total >= config.minimumPurchaseForPoints) {
        // Referral qualified
        const refRewardDedupKey = `referral:${sale.businessId}:${ref.id}:reward`;
        const updatedRef = db.updateLoyaltyReferral(ref.id, sale.businessId, {
          status: 'QUALIFIED',
          qualifyingSaleId: sale.id,
          qualifyingSaleTotal: sale.total,
          completedAt: new Date().toISOString(),
          rewardStatus: 'AWARDED',
        });

        if (updatedRef) {
          result.qualifiedReferrals.push(updatedRef);

          // Award referrer points
          db.addLoyaltyLedgerEntry({
            businessId: sale.businessId,
            customerId: ref.referrerCustomerId,
            type: 'REFERRAL_REWARD',
            points: ref.rewardPoints || config.referralRewardPoints,
            referenceId: ref.id,
            referenceType: 'referral',
            description: `Referral reward for introducing ${ref.referredCustomerName || 'new customer'}`,
            createdBy: userId,
            createdByName: userName,
            dedupKey: refRewardDedupKey,
          });

          db.logAudit({
            businessId: sale.businessId,
            userId,
            userName: userName || 'System',
            action: 'LOYALTY_REFERRAL_COMPLETED',
            details: `Referral qualified: ${ref.referrerCustomerName || ref.referrerCustomerId} referred ${ref.referredCustomerName || sale.customerId}. Awarded ${ref.rewardPoints} points.`,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Reverses loyalty points earned on a sale when the sale is cancelled or refunded.
 */
export function reverseSaleLoyaltyPoints(
  sale: Sale,
  userId: string,
  userName?: string
): { pointsReversed: number } {
  if (!sale.customerId || !sale.businessId) return { pointsReversed: 0 };

  const reversalDedupKey = `purchase_reversal:${sale.businessId}:${sale.id}`;
  const existingReversal = db.findLedgerEntryByDedupKey(reversalDedupKey);
  if (existingReversal) return { pointsReversed: 0 };

  const originalPurchaseEntry = db.findLedgerEntryByDedupKey(`purchase:${sale.businessId}:${sale.id}`);
  if (!originalPurchaseEntry || originalPurchaseEntry.points <= 0) return { pointsReversed: 0 };

  const pointsToReverse = originalPurchaseEntry.points;

  db.addLoyaltyLedgerEntry({
    businessId: sale.businessId,
    customerId: sale.customerId,
    type: 'PURCHASE_REVERSED',
    points: -pointsToReverse,
    referenceId: sale.id,
    referenceType: 'sale',
    description: `Reversal of ${pointsToReverse} points for cancelled sale #${sale.receiptNumber}`,
    createdBy: userId,
    createdByName: userName,
    dedupKey: reversalDedupKey,
  });

  db.logAudit({
    businessId: sale.businessId,
    userId,
    userName: userName || 'Staff',
    action: 'LOYALTY_POINTS_REVERSED',
    details: `Reversed ${pointsToReverse} points for cancelled sale #${sale.receiptNumber}.`,
  });

  return { pointsReversed: pointsToReverse };
}

/**
 * Redeems points for an authorized customer reward.
 * Financially safe: never mutates payment, sale, or cash accounts directly.
 */
export function redeemLoyaltyReward(
  businessId: string,
  customerId: string,
  points: number,
  requestedBy: { id: string; name: string },
  notes?: string
): { success: boolean; redemption?: LoyaltyRewardRedemption; error?: string } {
  const customer = db.getCustomerById(customerId, businessId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  const config = db.getLoyaltyConfig(businessId);
  if (!config.enabled) {
    return { success: false, error: 'Loyalty program is currently disabled.' };
  }

  if (points <= 0 || !Number.isInteger(points)) {
    return { success: false, error: 'Points to redeem must be a positive integer.' };
  }

  if (points < config.minimumPointsToRedeem) {
    return {
      success: false,
      error: `Minimum points required to redeem is ${config.minimumPointsToRedeem} points.`,
    };
  }

  const currentStats = db.getCustomerPointsBalance(businessId, customerId);
  if (currentStats.balance < points) {
    return {
      success: false,
      error: `Insufficient points balance. Available: ${currentStats.balance} points.`,
    };
  }

  const monetaryValueGhs = Number((points * config.pointValue).toFixed(2));
  const code = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const isApprovalRequired = config.requireApprovalForRewards;
  const status = isApprovalRequired ? 'PENDING_APPROVAL' : 'APPROVED';

  const redemption = db.createRedemption({
    businessId,
    customerId,
    customerName: customer.name,
    pointsRedeemed: points,
    monetaryValueGhs,
    status,
    code,
    notes,
    createdBy: requestedBy.id,
    approvedBy: isApprovalRequired ? undefined : requestedBy.id,
    approvedAt: isApprovalRequired ? undefined : new Date().toISOString(),
  });

  // Debit the ledger immediately (reserves the points so they cannot be double-spent)
  db.addLoyaltyLedgerEntry({
    businessId,
    customerId,
    type: 'REWARD_REDEEMED',
    points: -points,
    referenceId: redemption.id,
    referenceType: 'redemption',
    description: `Redeemed ${points} points for reward voucher ${code} (Value: GH₵${monetaryValueGhs.toFixed(2)})`,
    createdBy: requestedBy.id,
    createdByName: requestedBy.name,
    dedupKey: `redemption:${businessId}:${redemption.id}`,
  });

  db.logAudit({
    businessId,
    userId: requestedBy.id,
    userName: requestedBy.name,
    action: 'LOYALTY_REWARD_REDEEMED',
    details: `Customer "${customer.name}" redeemed ${points} points for voucher ${code} (GH₵${monetaryValueGhs.toFixed(2)}).`,
  });

  if (isApprovalRequired) {
    // Requires approval: create Operations Center task
    db.createTask({
      businessId,
      title: `Loyalty Reward Approval: ${customer.name}`,
      description: `Customer "${customer.name}" requested redemption of ${points} points (Voucher: ${code}, Value: GH₵${monetaryValueGhs.toFixed(2)}). Requires manager approval.`,
      source: 'Customer Intelligence',
      sourceEntityId: redemption.id,
      actionUrl: '/customers',
      actionLabel: 'Review Reward',
      status: 'pending',
      priority: 'normal',
      dueDate: getAccraToday(),
      dedupKey: `task:reward_approval:${businessId}:${redemption.id}`,
    });

    db.createNotification({
      businessId,
      type: 'workflow_alert',
      title: 'Reward Awaiting Approval',
      message: `${customer.name} requested reward redemption of ${points} points (${code}).`,
      link: '/customers',
    });
  }

  return { success: true, redemption };
}

/**
 * Approves a pending reward redemption.
 */
export function approveLoyaltyReward(
  businessId: string,
  redemptionId: string,
  approvedBy: { id: string; name: string }
): { success: boolean; redemption?: LoyaltyRewardRedemption; error?: string } {
  const redemptions = db.getRedemptions(businessId);
  const rwd = redemptions.find((r) => r.id === redemptionId);
  if (!rwd) return { success: false, error: 'Redemption request not found.' };

  if (rwd.status !== 'PENDING_APPROVAL') {
    return { success: false, error: `Cannot approve redemption with status "${rwd.status}".` };
  }

  const updated = db.updateRedemption(rwd.id, businessId, {
    status: 'COMPLETED',
    approvedBy: approvedBy.id,
    approvedAt: new Date().toISOString(),
  });

  db.logAudit({
    businessId,
    userId: approvedBy.id,
    userName: approvedBy.name,
    action: 'LOYALTY_REWARD_REDEEMED',
    details: `Approved reward redemption ${rwd.code} for ${rwd.customerName || rwd.customerId} (${rwd.pointsRedeemed} points).`,
  });

  return { success: true, redemption: updated };
}

/**
 * Manually adjusts customer loyalty points with strict audit tracking.
 */
export function adjustCustomerPoints(
  businessId: string,
  customerId: string,
  points: number,
  reason: string,
  performedBy: { id: string; name: string }
): { success: boolean; entry?: LoyaltyLedgerEntry; error?: string } {
  const customer = db.getCustomerById(customerId, businessId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  if (!points || !Number.isInteger(points)) {
    return { success: false, error: 'Adjustment points must be a non-zero integer.' };
  }

  if (!reason || !reason.trim()) {
    return { success: false, error: 'A clear reason is required for manual points adjustment.' };
  }

  const currentStats = db.getCustomerPointsBalance(businessId, customerId);
  if (points < 0 && currentStats.balance + points < 0) {
    return {
      success: false,
      error: `Cannot adjust below 0. Current balance is ${currentStats.balance} points.`,
    };
  }

  const entry = db.addLoyaltyLedgerEntry({
    businessId,
    customerId,
    type: 'MANUAL_ADJUSTMENT',
    points,
    referenceType: 'manual',
    description: `Manual adjustment: ${reason.trim()} (${points > 0 ? '+' : ''}${points} pts)`,
    createdBy: performedBy.id,
    createdByName: performedBy.name,
  });

  db.logAudit({
    businessId,
    userId: performedBy.id,
    userName: performedBy.name,
    action: 'LOYALTY_POINTS_ADJUSTED',
    details: `Manual loyalty points adjustment of ${points > 0 ? '+' : ''}${points} for "${customer.name}". Reason: ${reason}.`,
  });

  return { success: true, entry };
}

/**
 * Creates a referral record with validation against self-referral and duplicate referrals.
 */
export function createLoyaltyReferral(
  businessId: string,
  referrerCustomerId: string,
  referredCustomerId: string,
  createdBy: { id: string; name: string },
  notes?: string
): { success: boolean; referral?: LoyaltyReferral; error?: string } {
  if (referrerCustomerId === referredCustomerId) {
    return { success: false, error: 'A customer cannot refer themselves.' };
  }

  const referrer = db.getCustomerById(referrerCustomerId, businessId);
  if (!referrer) {
    return { success: false, error: 'Referrer customer not found.' };
  }

  const referred = db.getCustomerById(referredCustomerId, businessId);
  if (!referred) {
    return { success: false, error: 'Referred customer not found.' };
  }

  const config = db.getLoyaltyConfig(businessId);

  // Check for duplicate referral
  const existingReferrals = db.getLoyaltyReferrals(businessId, {
    referredCustomerId,
  });
  if (existingReferrals.length > 0) {
    return { success: false, error: 'This customer has already been referred.' };
  }

  const referral = db.createLoyaltyReferral({
    businessId,
    referrerCustomerId,
    referrerCustomerName: referrer.name,
    referredCustomerId,
    referredCustomerName: referred.name,
    referredCustomerPhone: referred.phone,
    status: 'PENDING',
    rewardPoints: config.referralRewardPoints,
    rewardStatus: 'PENDING',
    notes,
  });

  db.logAudit({
    businessId,
    userId: createdBy.id,
    userName: createdBy.name,
    action: 'LOYALTY_REFERRAL_CREATED',
    details: `Referral registered: ${referrer.name} referred ${referred.name}.`,
  });

  return { success: true, referral };
}

/**
 * Computes business-wide loyalty and retention analytics.
 */
export function calculateLoyaltyAnalytics(businessId: string): LoyaltyAnalytics {
  const config = db.getLoyaltyConfig(businessId);
  const customers = db.getCustomers(businessId);
  const allSales = db.getSales(businessId).filter((s) => s.status !== 'Cancelled');
  const ledger = db.getLoyaltyLedger(businessId);
  const milestones = db.getLoyaltyMilestones(businessId);
  const referrals = db.getLoyaltyReferrals(businessId);
  const todayAccra = getAccraToday();

  const totalMembers = customers.length;
  let activeMembers = 0;
  let membersWithPoints = 0;
  let repeatCustomersCount = 0;
  let atRiskCount = 0;
  let inactiveCount = 0;

  const byTier: Record<LoyaltyTier, number> = {
    Standard: 0,
    Silver: 0,
    Gold: 0,
    VIP: 0,
  };

  const byRetentionStatus: Record<CustomerRetentionStatus, number> = {
    NEW: 0,
    RETURNING: 0,
    LOYAL: 0,
    HIGHLY_ENGAGED: 0,
    AT_RISK: 0,
    INACTIVE: 0,
    RE_ENGAGEMENT_OPPORTUNITY: 0,
  };

  for (const c of customers) {
    const custSales = allSales.filter((s) => s.customerId === c.id);
    const orderCount = custSales.length;
    const totalSpend = custSales.reduce((sum, s) => sum + s.total, 0);

    if (orderCount >= 2) repeatCustomersCount++;

    const tierInfo = determineCustomerTier(config, totalSpend, orderCount);
    byTier[tierInfo.tier] = (byTier[tierInfo.tier] || 0) + 1;

    const ret = determineRetentionStatus(c, custSales, todayAccra);
    byRetentionStatus[ret.status] = (byRetentionStatus[ret.status] || 0) + 1;

    if (ret.daysSinceLastPurchase <= 60 && orderCount > 0) {
      activeMembers++;
    }

    if (ret.status === 'AT_RISK') atRiskCount++;
    if (ret.status === 'INACTIVE') inactiveCount++;

    const balance = db.getCustomerPointsBalance(businessId, c.id).balance;
    if (balance > 0) membersWithPoints++;
  }

  let pointsIssued = 0;
  let pointsRedeemed = 0;
  for (const entry of ledger) {
    if (entry.type === 'REWARD_REDEEMED') {
      pointsRedeemed += Math.abs(entry.points);
    } else if (entry.points > 0) {
      pointsIssued += entry.points;
    }
  }
  const pointsOutstanding = Math.max(0, pointsIssued - pointsRedeemed);

  const repeatCustomerRate = totalMembers > 0 ? Number(((repeatCustomersCount / totalMembers) * 100).toFixed(1)) : 0;
  const customersWithPurchases = customers.filter((c) => allSales.some((s) => s.customerId === c.id)).length;
  const retentionRate = customersWithPurchases > 0 ? Number(((activeMembers / customersWithPurchases) * 100).toFixed(1)) : 0;

  const referralConversionsCount = referrals.filter(
    (r) => r.status === 'QUALIFIED' || r.status === 'COMPLETED'
  ).length;

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    totalMembers,
    totalMembersCount: totalMembers,
    activeMembers,
    activeMembersCount: activeMembers,
    membersWithPoints,
    pointsIssued,
    pointsRedeemed,
    totalPointsRedeemed: pointsRedeemed,
    pointsOutstanding,
    totalPointsCirculating: pointsOutstanding,
    circulatingPointsMonetaryValueGhs: Number((pointsOutstanding * (config.pointValueGhs || config.pointValue || 0.05)).toFixed(2)),
    byTier,
    byRetentionStatus,
    repeatCustomerRate,
    repeatCustomerRatePercent: repeatCustomerRate,
    retentionRate,
    retentionRatePercent: retentionRate,
    atRiskCount,
    inactiveCount,
    milestoneCompletionsCount: milestones.length,
    referralCount: referrals.length,
    referralConversionsCount,
  };
}

/**
 * Scans customers and generates actionable retention opportunities.
 * Connects directly to the existing Operations Center / Communication workflows.
 */
export function getRetentionOpportunities(businessId: string): RetentionOpportunity[] {
  const config = db.getLoyaltyConfig(businessId);
  const customers = db.getCustomers(businessId);
  const allSales = db.getSales(businessId).filter((s) => s.status !== 'Cancelled');
  const todayAccra = getAccraToday();
  const opportunities: RetentionOpportunity[] = [];

  for (const c of customers) {
    const custSales = allSales.filter((s) => s.customerId === c.id);
    const orderCount = custSales.length;
    const totalSpend = custSales.reduce((sum, s) => sum + s.total, 0);
    const tierInfo = determineCustomerTier(config, totalSpend, orderCount);
    const ret = determineRetentionStatus(c, custSales, todayAccra);
    const pointsStats = db.getCustomerPointsBalance(businessId, c.id);

    // 1. VIP / High-tier at-risk customer
    if ((tierInfo.tier === 'VIP' || tierInfo.tier === 'Gold') && (ret.status === 'AT_RISK' || ret.daysSinceLastPurchase >= 35)) {
      opportunities.push({
        id: `opp_ret_vip_${c.id}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        type: 'AT_RISK_VIP',
        title: `VIP Inactivity Alert: ${c.name}`,
        description: `${c.name} (${tierInfo.tier} Tier, GH₵${totalSpend.toFixed(2)} spend) has not purchased in ${ret.daysSinceLastPurchase} days.`,
        suggestedAction: 'Send VIP check-in or personal appreciation via WhatsApp',
        urgency: 'high',
        dedupKey: `opp:ret:vip:${businessId}:${c.id}:${todayAccra.substring(0, 7)}`,
        metadata: {
          tier: tierInfo.tier,
          totalSpend,
          daysSinceLastPurchase: ret.daysSinceLastPurchase,
        },
      });
    }

    // 2. Loyal customer at risk
    else if (ret.status === 'AT_RISK' && orderCount >= 3) {
      opportunities.push({
        id: `opp_ret_loyal_${c.id}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        type: 'AT_RISK_LOYAL',
        title: `Loyal Customer Retention: ${c.name}`,
        description: `${c.name} has completed ${orderCount} purchases but has not visited in ${ret.daysSinceLastPurchase} days.`,
        suggestedAction: 'Reach out with a friendly re-engagement message',
        urgency: 'normal',
        dedupKey: `opp:ret:loyal:${businessId}:${c.id}:${todayAccra.substring(0, 7)}`,
        metadata: {
          orderCount,
          daysSinceLastPurchase: ret.daysSinceLastPurchase,
        },
      });
    }

    // 3. Reward Eligible Opportunity
    if (config.enabled && pointsStats.balance >= config.minimumPointsToRedeem) {
      const rewardValue = (pointsStats.balance * config.pointValue).toFixed(2);
      opportunities.push({
        id: `opp_rwd_avail_${c.id}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        type: 'REWARD_ELIGIBLE',
        title: `Reward Available: ${c.name}`,
        description: `${c.name} has accumulated ${pointsStats.balance} points (Worth approx. GH₵${rewardValue} in rewards).`,
        suggestedAction: 'Notify customer of available loyalty reward balance',
        urgency: 'low',
        dedupKey: `opp:ret:reward:${businessId}:${c.id}:${Math.floor(pointsStats.balance / 50)}`,
        metadata: {
          balance: pointsStats.balance,
          rewardValueGhs: rewardValue,
        },
      });
    }

    // 4. Re-engagement opportunity (formerly valuable, now inactive)
    if (ret.status === 'RE_ENGAGEMENT_OPPORTUNITY') {
      opportunities.push({
        id: `opp_reengage_${c.id}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        type: 'RE_ENGAGEMENT',
        title: `Re-engagement Opportunity: ${c.name}`,
        description: `Former active customer (${orderCount} orders, GH₵${totalSpend.toFixed(2)} total spend) inactive for ${ret.daysSinceLastPurchase} days.`,
        suggestedAction: 'Send special comeback greeting or discount',
        urgency: 'normal',
        dedupKey: `opp:ret:reengage:${businessId}:${c.id}:${todayAccra.substring(0, 7)}`,
        metadata: {
          orderCount,
          totalSpend,
          daysSinceLastPurchase: ret.daysSinceLastPurchase,
        },
      });
    }
  }

  return opportunities;
}

// Export aliases for flexible integration
export const calculateCustomerTier = determineCustomerTier;
export const evaluateCustomerRetention = determineRetentionStatus;
export const computeCustomerLoyaltyProfile = getCustomerLoyaltyProfile;
export const redeemLoyaltyPoints = redeemLoyaltyReward;
export const adjustLoyaltyPoints = adjustCustomerPoints;
export const registerCustomerReferral = createLoyaltyReferral;
export const getLoyaltyAnalytics = calculateLoyaltyAnalytics;
export const getLoyaltyOpportunities = getRetentionOpportunities;

