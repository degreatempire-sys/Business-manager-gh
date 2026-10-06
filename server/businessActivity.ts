// @ts-nocheck
/**
 * STAGE 4X — BUSINESS ACTIVITY TIMELINE & AUDIT VIEW ENGINE
 * Server-authoritative chronological aggregation of business activities from
 * authoritative existing records (sales, customers, payments, expenses, purchases,
 * stock movements, goals, alerts, and audit logs). Read-only.
 */

import { db, DBUser } from './db.js';
import { resolveAccraDateRange, getAccraDateString } from './date.js';
import { canUserViewProfit } from './featureAccess.js';

export interface BusinessActivityEvent {
  id: string;
  tenantId: string;
  businessId: string;
  eventType:
    | 'SALE_COMPLETED'
    | 'CUSTOMER_ACTIVITY'
    | 'DEBT_RECORDED'
    | 'DEBT_PAYMENT'
    | 'EXPENSE_RECORDED'
    | 'PURCHASE_RECORDED'
    | 'INVENTORY_CHANGE'
    | 'GOAL_ACTIVITY'
    | 'ALERT_ACTIVITY'
    | 'STAFF_ACTIVITY';
  title: string;
  description: string;
  actor?: string;
  referenceId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export function getBusinessActivityTimeline(
  businessId: string,
  user: DBUser,
  filters?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    limit?: number;
  }
): BusinessActivityEvent[] {
  const raw = db.getRaw();
  const rangeInfo = resolveAccraDateRange(filters?.range, filters?.startDate, filters?.endDate);
  const { fromDate, toDate } = rangeInfo;

  const events: BusinessActivityEvent[] = [];
  const canViewProf = canUserViewProfit(user);

  // 1. Sales
  const sales = db.getSales(businessId);
  for (const s of sales) {
    if (s.status === 'Cancelled') continue;
    const sDate = getAccraDateString(s.createdAt);
    if (sDate >= fromDate && sDate <= toDate) {
      events.push({
        id: `act_sale_${s.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'SALE_COMPLETED',
        title: `Sale Completed (${s.receiptNumber})`,
        description: `Sale processed with total ${canViewProf ? 'GH₵ ' + Number(s.total || 0).toFixed(2) : '[Restricted Amount]'}. Payment method: ${s.paymentMethod}.`,
        actor: s.servedByName || 'Staff',
        referenceId: s.id,
        createdAt: s.createdAt,
      });
    }
  }

  // 2. Customers
  const customers = db.getCustomers(businessId);
  for (const c of customers) {
    const cDate = getAccraDateString(c.createdAt);
    if (cDate >= fromDate && cDate <= toDate) {
      events.push({
        id: `act_cust_${c.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'CUSTOMER_ACTIVITY',
        title: `Customer Registered: ${c.name}`,
        description: `New customer account created with phone ${c.phone || 'N/A'}.`,
        referenceId: c.id,
        createdAt: c.createdAt,
      });
    }
  }

  // 3. Customer Payments (Debt Payments)
  const payments = db.getCustomerPayments(businessId);
  for (const p of payments) {
    const pDate = getAccraDateString(p.createdAt);
    if (pDate >= fromDate && pDate <= toDate) {
      events.push({
        id: `act_pay_${p.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'DEBT_PAYMENT',
        title: `Debt Payment Recorded (${p.paymentNumber})`,
        description: `Received GH₵ ${Number(p.amount || 0).toFixed(2)} from ${p.customerName || 'Customer'} via ${p.paymentMethod}.`,
        referenceId: p.id,
        createdAt: p.createdAt,
      });
    }
  }

  // 4. Expenses
  const expenses = db.getExpenses(businessId);
  for (const e of expenses) {
    const eDate = getAccraDateString(e.date || e.createdAt);
    if (eDate >= fromDate && eDate <= toDate) {
      events.push({
        id: `act_exp_${e.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'EXPENSE_RECORDED',
        title: `Expense Recorded (${e.category})`,
        description: `Recorded expense of GH₵ ${Number(e.amount || 0).toFixed(2)}. Notes: ${e.notes || 'None'}.`,
        referenceId: e.id,
        createdAt: e.date ? `${e.date}T00:00:00.000Z` : e.createdAt,
      });
    }
  }

  // 5. Purchases / Stock-In
  const purchases = db.getPurchases ? db.getPurchases(businessId) : [];
  for (const pr of purchases) {
    const prDate = getAccraDateString(pr.createdAt);
    if (prDate >= fromDate && prDate <= toDate) {
      events.push({
        id: `act_pur_${pr.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'PURCHASE_RECORDED',
        title: `Purchase / Stock-In Recorded`,
        description: `Supplier purchase recorded with total GH₵ ${Number(pr.total || 0).toFixed(2)}. Status: ${pr.status || 'Completed'}.`,
        referenceId: pr.id,
        createdAt: pr.createdAt,
      });
    }
  }

  // 6. Stock Movements / Inventory Changes
  const stockMovements = db.getStockMovements ? db.getStockMovements(businessId) : [];
  for (const sm of stockMovements) {
    const smDate = getAccraDateString(sm.createdAt);
    if (smDate >= fromDate && smDate <= toDate) {
      events.push({
        id: `act_sm_${sm.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'INVENTORY_CHANGE',
        title: `Inventory Movement: ${sm.productName || 'Product'}`,
        description: `Movement type: ${sm.movementType}, quantity change: ${sm.quantity}.`,
        referenceId: sm.productId,
        createdAt: sm.createdAt,
      });
    }
  }

  // 7. Business Goals (Stage 4U)
  const goals = raw.business_goals ? raw.business_goals.filter((g) => g.businessId === businessId) : [];
  for (const g of goals) {
    const gDate = getAccraDateString(g.createdAt);
    if (gDate >= fromDate && gDate <= toDate) {
      events.push({
        id: `act_goal_${g.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'GOAL_ACTIVITY',
        title: `Business Goal Defined: ${g.name}`,
        description: `Goal type: ${g.type}, target: ${g.targetValue}, status: ${g.status}.`,
        referenceId: g.id,
        createdAt: g.createdAt,
      });
    }
  }

  // 8. Business Alerts (Stage 4W)
  const alerts = raw.business_alerts ? raw.business_alerts.filter((a) => a.businessId === businessId) : [];
  for (const a of alerts) {
    const aDate = getAccraDateString(a.createdAt);
    if (aDate >= fromDate && aDate <= toDate) {
      events.push({
        id: `act_alt_${a.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'ALERT_ACTIVITY',
        title: `Early-Warning Alert: ${a.title}`,
        description: `Severity: ${a.severity}, status: ${a.status}. Message: ${a.message}`,
        referenceId: a.id,
        createdAt: a.createdAt,
      });
    }
  }

  // 9. Audit Logs / Staff Activity
  const auditLogs = db.getAuditLogs ? db.getAuditLogs(businessId) : [];
  for (const al of auditLogs) {
    const alDate = getAccraDateString(al.timestamp || al.createdAt);
    if (alDate >= fromDate && alDate <= toDate) {
      events.push({
        id: `act_aud_${al.id}`,
        tenantId: businessId,
        businessId,
        eventType: 'STAFF_ACTIVITY',
        title: `Staff Action: ${al.action || al.module || 'Operation'}`,
        description: al.details || al.summary || `Activity logged in module ${al.module || 'general'}.`,
        actor: al.userName || 'Authorized Staff',
        referenceId: al.id,
        createdAt: al.timestamp || al.createdAt,
      });
    }
  }

  // Filter by eventType if specified
  let filtered = events;
  if (filters?.eventType) {
    filtered = events.filter((ev) => ev.eventType === filters.eventType);
  }

  // Sort newest first (descending timestamp)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply limit
  const limit = filters?.limit && filters.limit > 0 ? filters.limit : 200;
  return filtered.slice(0, limit);
}
