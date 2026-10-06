/**
 * STAGE 4Y — BUSINESS DAILY BRIEF & EXECUTIVE SUMMARY ENGINE
 * Server-authoritative aggregation of daily business metrics, health, alerts, goals,
 * and recent activity into a concise executive daily brief. Read-only.
 */

import { db, DBUser } from './db.js';
import { getAccraToday, getAccraDateString } from './date.js';
import { computeBusinessHealth } from './businessHealth.js';
import { generateBusinessAlerts } from './businessAlerts.js';
import { getBusinessActivityTimeline } from './businessActivity.js';
import { canUserViewProfit } from './featureAccess.js';
import { calculateGoalActualAndStatus } from './businessGoals.js';

export interface BusinessDailyBriefResponse {
  businessId: string;
  generatedAt: string;
  date: string;
  headline: string;
  salesSummary: {
    todaySalesCount: number;
    todayRevenue: number;
    periodRevenue: number;
  };
  profitSummary: {
    grossProfit: number;
    netProfit: number;
    netMargin: number;
  };
  expenseSummary: {
    todayExpenses: number;
    periodExpenses: number;
  };
  inventorySummary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  customerSummary: {
    totalCustomers: number;
    newCustomersToday: number;
  };
  debtSummary: {
    totalOutstandingDebt: number;
    unpaidAccountsCount: number;
  };
  goalsSummary: {
    totalGoals: number;
    activeGoals: number;
    behindOrOverdueGoals: number;
  };
  alertsSummary: {
    activeCount: number;
    criticalCount: number;
    warningCount: number;
  };
  recentActivity: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export function computeBusinessDailyBrief(businessId: string, user: DBUser): BusinessDailyBriefResponse {
  const today = getAccraToday();
  const canViewProf = canUserViewProfit(user);

  // 1. Sales summary (today & health period)
  const allSales = db.getSales(businessId);
  let todaySalesCount = 0;
  let todayRevenue = 0;

  for (const s of allSales) {
    if (s.status === 'Cancelled') continue;
    const sDate = getAccraDateString(s.createdAt);
    if (sDate === today) {
      todaySalesCount++;
      todayRevenue += Number(s.total || 0);
    }
  }

  const health = computeBusinessHealth(businessId, user, 'this_month');

  // 2. Profit summary
  const grossProfit = canViewProf ? health.profitHealth.grossProfit : 0;
  const netProfit = canViewProf ? health.profitHealth.netProfit : 0;
  const netMargin = canViewProf ? health.profitHealth.netMargin : 0;

  // 3. Expense summary
  const allExpenses = db.getExpenses(businessId);
  let todayExpenses = 0;
  for (const e of allExpenses) {
    const eDate = getAccraDateString(e.date || e.createdAt);
    if (eDate === today) {
      todayExpenses += Number(e.amount || 0);
    }
  }
  const periodExpenses = health.expenseHealth.currentValue;

  // 4. Inventory summary
  const products = db.getProducts(businessId);
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => Number(p.quantity || 0) <= 0).length;
  const lowStockCount = products.filter((p) => {
    const q = Number(p.quantity || 0);
    const m = Number(p.minStockLevel || 5);
    return q > 0 && q <= m;
  }).length;

  // 5. Customer summary
  const customers = db.getCustomers(businessId);
  const totalCustomers = customers.length;
  const newCustomersToday = customers.filter((c) => getAccraDateString(c.createdAt) === today).length;

  // 6. Debt summary
  const totalOutstandingDebt = health.debtHealth.totalOutstandingDebt;
  const unpaidAccountsCount = health.debtHealth.unpaidCount;

  // 7. Goals summary
  const rawGoals = db.getBusinessGoals ? db.getBusinessGoals(businessId) : [];
  const evaluatedGoals = rawGoals.map((g) => calculateGoalActualAndStatus(g, businessId, user));
  const activeGoals = evaluatedGoals.filter((g) => g.status === 'IN PROGRESS' || g.status === 'NOT STARTED').length;
  const behindOrOverdueGoals = evaluatedGoals.filter((g) => g.status === 'OVERDUE' || (g.status === 'IN PROGRESS' && g.progressPercent < 30)).length;

  // 8. Alerts summary
  const alerts = generateBusinessAlerts(businessId, user);
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'WARNING').length;

  // 9. Recent Activity
  const timeline = getBusinessActivityTimeline(businessId, user, { range: 'today', limit: 5 });
  const recentActivity = timeline.slice(0, 5).map((t) => ({
    id: t.id,
    eventType: t.eventType,
    title: t.title,
    description: t.description,
    createdAt: t.createdAt,
  }));

  // 10. Headline
  let headline = `Business Daily Brief for ${today}: Today's revenue GH₵ ${todayRevenue.toFixed(2)} (${todaySalesCount} sales).`;
  if (criticalCount > 0) {
    headline += ` ⚠️ ${criticalCount} critical alert(s) require attention.`;
  } else if (warningCount > 0) {
    headline += ` ℹ️ ${warningCount} warning(s) active.`;
  } else {
    headline += ` ✅ Operations operating within normal parameters.`;
  }

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    date: today,
    headline,
    salesSummary: {
      todaySalesCount,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      periodRevenue: health.revenueHealth.currentValue,
    },
    profitSummary: {
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin,
    },
    expenseSummary: {
      todayExpenses: Math.round(todayExpenses * 100) / 100,
      periodExpenses,
    },
    inventorySummary: {
      totalProducts,
      lowStockCount,
      outOfStockCount,
    },
    customerSummary: {
      totalCustomers,
      newCustomersToday,
    },
    debtSummary: {
      totalOutstandingDebt: Math.round(totalOutstandingDebt * 100) / 100,
      unpaidAccountsCount,
    },
    goalsSummary: {
      totalGoals: evaluatedGoals.length,
      activeGoals,
      behindOrOverdueGoals,
    },
    alertsSummary: {
      activeCount: activeAlerts.length,
      criticalCount,
      warningCount,
    },
    recentActivity,
  };
}
