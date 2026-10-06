// @ts-nocheck
/**
 * STAGE 4U/4V — BUSINESS HEALTH DASHBOARD ENGINE
 * Server-authoritative calculation of business health indicators, status thresholds,
 * and factual action recommendations. Read-only against authoritative data.
 */

import { db, DBUser } from './db.js';
import { resolveAccraDateRangeWithComparison, getAccraDateString } from './date.js';
import { canUserViewProfit } from './featureAccess.js';

export interface HealthIndicatorResult {
  currentValue: number;
  previousValue: number;
  changePercent: number;
  status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  details: Record<string, any>;
  recommendation?: string;
}

export interface BusinessHealthReport {
  businessId: string;
  range: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  revenueHealth: HealthIndicatorResult;
  profitHealth: HealthIndicatorResult & { grossProfit: number; netProfit: number; netMargin: number };
  expenseHealth: HealthIndicatorResult;
  inventoryHealth: HealthIndicatorResult & { totalProducts: number; lowStockCount: number; outOfStockCount: number };
  customerHealth: HealthIndicatorResult & { totalCustomers: number; newCustomersCount: number };
  debtHealth: HealthIndicatorResult & { totalOutstandingDebt: number; totalCollected: number; unpaidCount: number };
  actionRecommendations: string[];
}

/**
 * Threshold Constants (Documented transparent business rules)
 */
const THRESHOLDS = {
  REVENUE_DECLINE_ATTENTION: -10, // %
  REVENUE_DECLINE_CRITICAL: -25,  // %
  EXPENSE_INCREASE_ATTENTION: 15, // %
  EXPENSE_INCREASE_CRITICAL: 30,  // %
  NET_MARGIN_ATTENTION: 5,        // %
  NET_MARGIN_CRITICAL: 0,         // % (negative)
};

export function computeBusinessHealth(
  businessId: string,
  user: DBUser,
  rangeParam: string = 'this_month',
  startDateParam?: string,
  endDateParam?: string
): BusinessHealthReport {
  const rangeInfo = resolveAccraDateRangeWithComparison(rangeParam, startDateParam, endDateParam);
  const { fromDate, toDate, normalizedRange, hasComparison, previousRange } = rangeInfo;
  const currentStart = fromDate;
  const currentEnd = toDate;
  const previousStart = hasComparison && previousRange ? previousRange.fromDate : fromDate;
  const previousEnd = hasComparison && previousRange ? previousRange.toDate : toDate;
  const rangeKey = normalizedRange;

  const allSales = db.getSales(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allCustomers = db.getCustomers(businessId);
  const allProducts = db.getProducts(businessId);
  const allPayments = db.getCustomerPayments(businessId);

  // 1. Revenue Health
  let currentRevenue = 0;
  let previousRevenue = 0;

  for (const s of allSales) {
    if (s.status === 'Cancelled') continue;
    const sDate = getAccraDateString(s.createdAt);
    const amt = Number(s.total || 0);
    if (sDate >= currentStart && sDate <= currentEnd) {
      currentRevenue += amt;
    } else if (sDate >= previousStart && sDate <= previousEnd) {
      previousRevenue += amt;
    }
  }

  const revenueChangePercent = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 1000) / 10
    : currentRevenue > 0 ? 100 : 0;

  let revenueStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (revenueChangePercent <= THRESHOLDS.REVENUE_DECLINE_CRITICAL) {
    revenueStatus = 'CRITICAL';
  } else if (revenueChangePercent <= THRESHOLDS.REVENUE_DECLINE_ATTENTION) {
    revenueStatus = 'ATTENTION';
  }

  // 2. Profit Health (respecting profit visibility)
  const canViewProf = canUserViewProfit(user);
  let currentGrossProfit = 0;
  let currentNetProfit = 0;
  let currentCogs = 0;
  let currentExp = 0;

  for (const s of allSales) {
    if (s.status === 'Cancelled') continue;
    const sDate = getAccraDateString(s.createdAt);
    if (sDate >= currentStart && sDate <= currentEnd) {
      const rev = Number(s.total || 0);
      let sCogs = 0;
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          const qty = Number(item.quantity || 0);
          const prod = allProducts.find((p) => p.id === item.productId);
          const unitCost = Number(
            (item as any).costPrice !== undefined
              ? (item as any).costPrice
              : (item as any).buyingPrice !== undefined
              ? (item as any).buyingPrice
              : prod?.buyingPrice || 0
          );
          sCogs += unitCost * qty;
        }
      }
      currentCogs += sCogs;
      currentGrossProfit += (rev - sCogs);
    }
  }

  for (const e of allExpenses) {
    const eDate = getAccraDateString(e.date || e.createdAt);
    if (eDate >= currentStart && eDate <= currentEnd) {
      currentExp += Number(e.amount || 0);
    }
  }

  currentNetProfit = currentGrossProfit - currentExp;
  const currentNetMargin = currentRevenue > 0
    ? Math.round((currentNetProfit / currentRevenue) * 1000) / 10
    : 0;

  const displayGrossProfit = canViewProf ? Math.round(currentGrossProfit * 100) / 100 : 0;
  const displayNetProfit = canViewProf ? Math.round(currentNetProfit * 100) / 100 : 0;
  const displayNetMargin = canViewProf ? currentNetMargin : 0;

  let profitStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (!canViewProf) {
    profitStatus = 'HEALTHY';
  } else if (currentNetProfit < 0) {
    profitStatus = 'CRITICAL';
  } else if (currentNetMargin < THRESHOLDS.NET_MARGIN_ATTENTION) {
    profitStatus = 'ATTENTION';
  }

  // 3. Expense Health
  let currentExpenses = 0;
  let previousExpenses = 0;

  for (const e of allExpenses) {
    const eDate = getAccraDateString(e.date || e.createdAt);
    const amt = Number(e.amount || 0);
    if (eDate >= currentStart && eDate <= currentEnd) {
      currentExpenses += amt;
    } else if (eDate >= previousStart && eDate <= previousEnd) {
      previousExpenses += amt;
    }
  }

  const expenseChangePercent = previousExpenses > 0
    ? Math.round(((currentExpenses - previousExpenses) / previousExpenses) * 1000) / 10
    : currentExpenses > 0 ? 100 : 0;

  let expenseStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (expenseChangePercent >= THRESHOLDS.EXPENSE_INCREASE_CRITICAL) {
    expenseStatus = 'CRITICAL';
  } else if (expenseChangePercent >= THRESHOLDS.EXPENSE_INCREASE_ATTENTION) {
    expenseStatus = 'ATTENTION';
  }

  // 4. Inventory Health
  const totalProducts = allProducts.length;
  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const p of allProducts) {
    const qty = Number(p.quantity || 0);
    const minStock = Number(p.minStockLevel || 5);
    if (qty <= 0) {
      outOfStockCount++;
    } else if (qty <= minStock) {
      lowStockCount++;
    }
  }

  let inventoryStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (outOfStockCount > 0) {
    inventoryStatus = 'CRITICAL';
  } else if (lowStockCount > 0) {
    inventoryStatus = 'ATTENTION';
  }

  // 5. Customer Health
  const totalCustomers = allCustomers.length;
  let newCustomersCount = 0;

  for (const c of allCustomers) {
    const cDate = getAccraDateString(c.createdAt);
    if (cDate >= currentStart && cDate <= currentEnd) {
      newCustomersCount++;
    }
  }

  let customerStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (totalCustomers === 0) {
    customerStatus = 'ATTENTION';
  }

  // 6. Debt Health
  let totalOutstandingDebt = 0;
  let unpaidCount = 0;
  for (const c of allCustomers) {
    const debt = Number(c.currentDebt || c.debtAmount || 0);
    if (debt > 0) {
      totalOutstandingDebt += debt;
      unpaidCount++;
    }
  }

  let totalCollected = 0;
  for (const p of allPayments) {
    const pDate = getAccraDateString(p.createdAt);
    if (pDate >= currentStart && pDate <= currentEnd) {
      totalCollected += Number(p.amount || 0);
    }
  }

  let debtStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (totalOutstandingDebt > 10000 && totalCollected === 0) {
    debtStatus = 'ATTENTION';
  }

  // Generate Factual Recommendations
  const actionRecommendations: string[] = [];
  if (outOfStockCount > 0) {
    actionRecommendations.push(`${outOfStockCount} product(s) are currently out of stock. Review inventory and restock.`);
  }
  if (lowStockCount > 0) {
    actionRecommendations.push(`${lowStockCount} product(s) are at or below minimum stock level.`);
  }
  if (expenseChangePercent > THRESHOLDS.EXPENSE_INCREASE_ATTENTION) {
    actionRecommendations.push(`Operating expenses increased by ${expenseChangePercent}% compared with the previous period. Review expense categories.`);
  }
  if (revenueChangePercent <= THRESHOLDS.REVENUE_DECLINE_ATTENTION) {
    actionRecommendations.push(`Revenue decreased by ${Math.abs(revenueChangePercent)}% compared with the previous period. Consider promotional activities.`);
  }
  if (canViewProf && currentNetProfit < 0) {
    actionRecommendations.push(`Net profit is negative for the current period. Evaluate pricing and overhead costs.`);
  }
  if (totalOutstandingDebt > 0) {
    actionRecommendations.push(`Outstanding debtor balances of GH₵${totalOutstandingDebt.toFixed(2)} require collection follow-up.`);
  }
  if (actionRecommendations.length === 0) {
    actionRecommendations.push(`All core business indicators are operating within healthy parameters.`);
  }

  return {
    businessId,
    range: rangeKey,
    startDate: currentStart,
    endDate: currentEnd,
    generatedAt: new Date().toISOString(),
    revenueHealth: {
      currentValue: Math.round(currentRevenue * 100) / 100,
      previousValue: Math.round(previousRevenue * 100) / 100,
      changePercent: revenueChangePercent,
      status: revenueStatus,
      details: { currentPeriodSalesCount: allSales.filter(s => s.status !== 'Cancelled').length },
    },
    profitHealth: {
      currentValue: displayNetProfit,
      previousValue: 0,
      changePercent: 0,
      status: profitStatus,
      grossProfit: displayGrossProfit,
      netProfit: displayNetProfit,
      netMargin: displayNetMargin,
      details: { canViewProfit: canViewProf },
    },
    expenseHealth: {
      currentValue: Math.round(currentExpenses * 100) / 100,
      previousValue: Math.round(previousExpenses * 100) / 100,
      changePercent: expenseChangePercent,
      status: expenseStatus,
      details: {},
    },
    inventoryHealth: {
      currentValue: totalProducts,
      previousValue: totalProducts,
      changePercent: 0,
      status: inventoryStatus,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      details: {},
    },
    customerHealth: {
      currentValue: totalCustomers,
      previousValue: totalCustomers - newCustomersCount,
      changePercent: totalCustomers > 0 ? Math.round((newCustomersCount / totalCustomers) * 1000) / 10 : 0,
      status: customerStatus,
      totalCustomers,
      newCustomersCount,
      details: {},
    },
    debtHealth: {
      currentValue: Math.round(totalOutstandingDebt * 100) / 100,
      previousValue: totalCollected,
      changePercent: 0,
      status: debtStatus,
      totalOutstandingDebt: Math.round(totalOutstandingDebt * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      unpaidCount,
      details: {},
    },
    actionRecommendations,
  };
}
