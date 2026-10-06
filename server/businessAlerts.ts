// @ts-nocheck
/**
 * STAGE 4W — BUSINESS ALERTS & EARLY-WARNING SIGNALS ENGINE
 * Server-authoritative generation and management of business alerts based on
 * authoritative financial, inventory, debtor, customer, and goal data.
 */

import { db, DBUser } from './db.js';
import { computeBusinessHealth } from './businessHealth.js';
import { canUserViewProfit } from './featureAccess.js';
import type {
  BusinessAlert,
  BusinessAlertType,
  BusinessAlertSeverity,
  BusinessAlertStatus,
} from '../src/types/index.js';

export function generateBusinessAlerts(businessId: string, user: DBUser): BusinessAlert[] {
  const raw = db.getRaw();
  if (!raw.business_alerts) {
    raw.business_alerts = [];
  }

  const existingAlerts = raw.business_alerts.filter((a) => a.businessId === businessId);
  const nowIso = new Date().toISOString();
  const newAlerts: BusinessAlert[] = [];

  const health = computeBusinessHealth(businessId, user, 'this_month');
  const allProducts = db.getProducts(businessId);
  const allCustomers = db.getCustomers(businessId);
  const goals = raw.business_goals ? raw.business_goals.filter((g) => g.businessId === businessId) : [];

  // Helper to add unique active alert if not already present
  const addAlert = (
    alertType: BusinessAlertType,
    severity: BusinessAlertSeverity,
    title: string,
    message: string
  ) => {
    // Check if an active or un-dismissed alert of this type & title already exists
    const duplicate = existingAlerts.find(
      (a) => a.alertType === alertType && a.title === title && a.status === 'ACTIVE'
    );
    if (!duplicate) {
      const alert: BusinessAlert = {
        id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessId,
        tenantId: businessId,
        alertType,
        severity,
        title,
        message,
        createdAt: nowIso,
        status: 'ACTIVE',
      };
      newAlerts.push(alert);
      existingAlerts.push(alert);
    }
  };

  // A. OUT-OF-STOCK
  for (const p of allProducts) {
    const qty = Number(p.quantity || 0);
    if (qty <= 0) {
      addAlert(
        'OUT_OF_STOCK',
        'CRITICAL',
        `Product Out of Stock: ${p.name}`,
        `Current quantity is 0. Review inventory and restock ${p.name} immediately.`
      );
    }
  }

  // B. LOW-STOCK
  for (const p of allProducts) {
    const qty = Number(p.quantity || 0);
    const minStock = Number(p.minStockLevel || 5);
    if (qty > 0 && qty <= minStock) {
      addAlert(
        'LOW_STOCK',
        'WARNING',
        `Low Stock Warning: ${p.name}`,
        `Current quantity (${qty}) is at or below minimum stock level (${minStock}). Restock soon.`
      );
    }
  }

  // C. REVENUE DECLINE
  if (health.revenueHealth.changePercent <= -15) {
    const severity: BusinessAlertSeverity = health.revenueHealth.changePercent <= -25 ? 'CRITICAL' : 'WARNING';
    addAlert(
      'REVENUE_DECLINE',
      severity,
      'Revenue Decline Detected',
      `Revenue decreased by ${Math.abs(health.revenueHealth.changePercent)}% compared with the previous comparable period.`
    );
  }

  // D. EXPENSE INCREASE
  if (health.expenseHealth.changePercent >= 15) {
    const severity: BusinessAlertSeverity = health.expenseHealth.changePercent >= 30 ? 'CRITICAL' : 'WARNING';
    addAlert(
      'EXPENSE_INCREASE',
      severity,
      'Operating Expenses Increased',
      `Expenses increased by ${health.expenseHealth.changePercent}% compared with the previous comparable period. Review overhead costs.`
    );
  }

  // E. PROFIT DECLINE / NEGATIVE
  if (canUserViewProfit(user)) {
    if (health.profitHealth.netProfit < 0 || health.profitHealth.status === 'CRITICAL') {
      addAlert(
        'PROFIT_DECLINE',
        'CRITICAL',
        'Net Profit Deficit / Decline',
        `Net profit for the current period is negative (${health.profitHealth.netProfit.toFixed(2)}). Evaluate pricing and operating expenses.`
      );
    }
  }

  // F. DEBT ALERT
  if (health.debtHealth.totalOutstandingDebt > 5000 || health.debtHealth.unpaidCount >= 3) {
    addAlert(
      'DEBT_ALERT',
      'WARNING',
      'Outstanding Debtor Balances High',
      `Total outstanding debtor balances stand at GH₵${health.debtHealth.totalOutstandingDebt.toFixed(2)} across ${health.debtHealth.unpaidCount} unpaid/partial accounts. Follow up for collection.`
    );
  }

  // G. GOAL BEHIND / OVERDUE
  const todayStr = new Date().toISOString().split('T')[0];
  for (const g of goals) {
    if (g.status === 'OVERDUE') {
      addAlert(
        'GOAL_BEHIND',
        'WARNING',
        `Goal Overdue: ${g.name}`,
        `Goal target of ${g.targetValue} has passed its end date (${g.endDate}) without full achievement.`
      );
    } else if (g.status === 'IN PROGRESS' && g.progressPercent < 30 && g.endDate < todayStr) {
      addAlert(
        'GOAL_BEHIND',
        'WARNING',
        `Goal Progress Behind: ${g.name}`,
        `Current progress is ${g.progressPercent}% against target ${g.targetValue}.`
      );
    }
  }

  // H. CUSTOMER ACTIVITY ALERT
  if (allCustomers.length > 0 && health.customerHealth.newCount === 0 && health.revenueHealth.changePercent < 0) {
    addAlert(
      'CUSTOMER_ACTIVITY_ALERT',
      'INFO',
      'Customer Acquisition Slowing',
      `No new customer accounts recorded in the current period and sales growth is flat or declining.`
    );
  }

  if (newAlerts.length > 0) {
    raw.business_alerts.push(...newAlerts);
    db.saveRaw?.(); // persist if available or db saves automatically via other calls
  }

  return raw.business_alerts.filter((a) => a.businessId === businessId);
}

export function getBusinessAlerts(businessId: string): BusinessAlert[] {
  const raw = db.getRaw();
  if (!raw.business_alerts) raw.business_alerts = [];
  return raw.business_alerts.filter((a) => a.businessId === businessId);
}

export function updateAlertStatus(
  businessId: string,
  alertId: string,
  status: BusinessAlertStatus
): BusinessAlert | null {
  const raw = db.getRaw();
  if (!raw.business_alerts) raw.business_alerts = [];
  const alert = raw.business_alerts.find((a) => a.id === alertId && a.businessId === businessId);
  if (!alert) return null;

  alert.status = status;
  return alert;
}
