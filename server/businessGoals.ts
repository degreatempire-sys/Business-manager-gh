/**
 * STAGE 4U — BUSINESS GOALS & ACTION TRACKER ENGINE
 * Server-authoritative calculation of actuals, progress, and statuses.
 * Strictly read-only against live financial data.
 */

import { db, DBUser } from './db.js';
import { getAccraToday, getAccraDateString } from './date.js';
import { canUserViewProfit } from './featureAccess.js';
import type { BusinessGoal, BusinessGoalStatus } from '../src/types/index.js';

export function calculateGoalActualAndStatus(
  goal: BusinessGoal,
  businessId: string,
  user: DBUser
): BusinessGoal {
  const allSales = db.getSales(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allCustomers = db.getCustomers(businessId);
  const allProducts = db.getProducts(businessId);
  const allPayments = db.getCustomerPayments(businessId);

  const start = goal.startDate || getAccraToday();
  const end = goal.endDate || getAccraToday();
  const today = getAccraToday();

  let actualValue = 0;

  switch (goal.type) {
    case 'sales_revenue': {
      let rev = 0;
      for (const s of allSales) {
        if (s.status === 'Cancelled') continue;
        const sDate = getAccraDateString(s.createdAt);
        if (sDate >= start && sDate <= end) {
          rev += Number(s.total || 0);
        }
      }
      actualValue = rev;
      break;
    }

    case 'net_profit': {
      if (!canUserViewProfit(user)) {
        actualValue = 0;
        break;
      }
      let rev = 0;
      let cogs = 0;
      let exp = 0;

      for (const s of allSales) {
        if (s.status === 'Cancelled') continue;
        const sDate = getAccraDateString(s.createdAt);
        if (sDate >= start && sDate <= end) {
          rev += Number(s.total || 0);
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
              cogs += unitCost * qty;
            }
          }
        }
      }

      for (const e of allExpenses) {
        const eDate = getAccraDateString(e.date || e.createdAt);
        if (eDate >= start && eDate <= end) {
          exp += Number(e.amount || 0);
        }
      }

      actualValue = rev - cogs - exp;
      break;
    }

    case 'expense_reduction': {
      // For expense reduction, actualValue tracks total expenses incurred in range
      let exp = 0;
      for (const e of allExpenses) {
        const eDate = getAccraDateString(e.date || e.createdAt);
        if (eDate >= start && eDate <= end) {
          exp += Number(e.amount || 0);
        }
      }
      actualValue = exp;
      break;
    }

    case 'revenue_growth': {
      let rev = 0;
      for (const s of allSales) {
        if (s.status === 'Cancelled') continue;
        const sDate = getAccraDateString(s.createdAt);
        if (sDate >= start && sDate <= end) {
          rev += Number(s.total || 0);
        }
      }
      actualValue = rev;
      break;
    }

    case 'customer_growth': {
      // Count customers created within date range or total active customers
      let count = 0;
      for (const c of allCustomers) {
        const cDate = getAccraDateString(c.createdAt);
        if (cDate >= start && cDate <= end) {
          count++;
        }
      }
      actualValue = count > 0 ? count : allCustomers.length;
      break;
    }

    case 'debt_collection': {
      let collected = 0;
      for (const p of allPayments) {
        const pDate = getAccraDateString(p.createdAt);
        if (pDate >= start && pDate <= end) {
          collected += Number(p.amount || 0);
        }
      }
      actualValue = collected;
      break;
    }

    case 'stock_value': {
      let val = 0;
      for (const p of allProducts) {
        val += Number(p.quantity || 0) * Number(p.buyingPrice || 0);
      }
      actualValue = val;
      break;
    }

    default:
      actualValue = 0;
      break;
  }

  // Calculate progress percent
  const target = Number(goal.targetValue || 0);
  let progressPercent = 0;
  if (target > 0) {
    if (goal.type === 'expense_reduction') {
      // For expense reduction, progress is how much expenses are below target or reduction achieved
      progressPercent = Math.round((Math.max(0, target - actualValue) / target) * 1000) / 10;
    } else {
      progressPercent = Math.round((actualValue / target) * 1000) / 10;
    }
  }

  const remainingValue = goal.type === 'expense_reduction'
    ? Math.max(0, actualValue - target)
    : Math.max(0, target - actualValue);

  // Determine Status
  let status: BusinessGoalStatus = 'IN PROGRESS';
  if (today < start) {
    status = 'NOT STARTED';
  } else if (progressPercent >= 100 || (goal.type !== 'expense_reduction' && actualValue >= target) || (goal.type === 'expense_reduction' && actualValue <= target)) {
    status = 'ACHIEVED';
  } else if (today > end) {
    status = 'OVERDUE';
  } else {
    status = 'IN PROGRESS';
  }

  return {
    ...goal,
    actualValue: Math.round(actualValue * 100) / 100,
    progressPercent: Math.min(999, Math.max(0, progressPercent)),
    remainingValue: Math.round(remainingValue * 100) / 100,
    status,
  };
}
