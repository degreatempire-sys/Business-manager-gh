/**
 * STAGE 5A — BUSINESS DATA EXPORT & RECORDS ENGINE
 * Server-authoritative CSV data export for authorized tenants with RBAC, financial privacy,
 * and sensitive field exclusion. Read-only / Zero mutation.
 */

import { db, DBUser } from './db.js';
import { canUserViewProfit } from './featureAccess.js';
import { getBusinessActivityTimeline } from './businessActivity.js';
import { generateBusinessAlerts } from './businessAlerts.js';

export const ALLOWED_EXPORT_TYPES = [
  'sales',
  'products',
  'inventory',
  'customers',
  'debts',
  'expenses',
  'purchases',
  'goals',
  'decisions',
  'alerts',
  'activity',
] as const;

export type ExportType = (typeof ALLOWED_EXPORT_TYPES)[number];

export function arrayToCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((header) => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\n');
}

/**
 * Authoritatively extract sanitized, privacy-filtered business records for export/backup.
 */
export function getBusinessExportData(businessId: string, user: DBUser, rawType: string): Record<string, any>[] {
  const type = rawType.toLowerCase().trim() as ExportType;
  if (!ALLOWED_EXPORT_TYPES.includes(type)) {
    throw new Error(`Invalid export type: "${rawType}". Allowed types: ${ALLOWED_EXPORT_TYPES.join(', ')}`);
  }

  const canViewProf = canUserViewProfit(user);
  let rows: Record<string, any>[] = [];

  switch (type) {
    case 'sales': {
      const sales = typeof db.getSales === 'function' ? db.getSales(businessId) : ((db as any).data?.sales || []).filter((s: any) => s.businessId === businessId);
      rows = sales.map((s: any) => ({
        id: s.id,
        receiptNumber: s.receiptNumber || '',
        total: Number(s.total || 0),
        subtotal: Number(s.subtotal || 0),
        tax: Number(s.tax || 0),
        paymentMethod: s.paymentMethod || 'cash',
        status: s.status || 'Completed',
        cashierName: s.cashierName || s.cashierId || '',
        createdAt: s.createdAt || '',
      }));
      break;
    }
    case 'products':
    case 'inventory': {
      const products = typeof db.getProducts === 'function' ? db.getProducts(businessId) : ((db as any).data?.products || []).filter((p: any) => p.businessId === businessId);
      rows = products.map((p: any) => ({
        id: p.id,
        name: p.name || '',
        sku: p.sku || '',
        category: p.category || '',
        price: Number(p.price || p.sellingPrice || 0),
        costPrice: canViewProf ? Number(p.buyingPrice || p.costPrice || 0) : 0,
        quantity: Number(p.quantity || 0),
        minStockLevel: Number(p.minStockLevel || 0),
        unit: p.unit || 'pcs',
        createdAt: p.createdAt || '',
      }));
      break;
    }
    case 'customers': {
      const customers = typeof db.getCustomers === 'function' ? db.getCustomers(businessId) : ((db as any).data?.customers || []).filter((c: any) => c.businessId === businessId);
      rows = customers.map((c: any) => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        loyaltyPoints: Number(c.loyaltyPoints || 0),
        totalSpent: Number(c.totalSpent || 0),
        creditBalance: Number(c.creditBalance || c.debtBalance || c.debtAmount || 0),
        createdAt: c.createdAt || '',
      }));
      break;
    }
    case 'debts': {
      const customers = typeof db.getCustomers === 'function' ? db.getCustomers(businessId) : ((db as any).data?.customers || []).filter((c: any) => c.businessId === businessId);
      const debtors = customers.filter((c: any) => Number(c.creditBalance || c.debtBalance || c.debtAmount || 0) > 0);
      rows = debtors.map((d: any) => ({
        customerId: d.id,
        customerName: d.name || '',
        phone: d.phone || '',
        outstandingDebt: Number(d.creditBalance || d.debtBalance || d.debtAmount || 0),
        email: d.email || '',
        updatedAt: d.updatedAt || d.createdAt || '',
      }));
      break;
    }
    case 'expenses': {
      const expenses = typeof db.getExpenses === 'function' ? db.getExpenses(businessId) : ((db as any).data?.expenses || []).filter((e: any) => e.businessId === businessId);
      rows = expenses.map((e: any) => ({
        id: e.id,
        category: e.category || 'General',
        amount: Number(e.amount || 0),
        description: e.description || e.notes || '',
        paymentMethod: e.paymentMethod || 'cash',
        date: e.date || e.createdAt || '',
        reference: e.reference || '',
      }));
      break;
    }
    case 'purchases': {
      const purchases = typeof db.getPurchases === 'function' ? db.getPurchases(businessId) : ((db as any).data?.purchases || []).filter((p: any) => p.businessId === businessId);
      rows = purchases.map((p: any) => ({
        id: p.id,
        supplierId: p.supplierId || '',
        totalAmount: Number(p.totalAmount || p.total || 0),
        status: p.status || 'Received',
        date: p.date || p.createdAt || '',
        itemsCount: Array.isArray(p.items) ? p.items.length : 0,
      }));
      break;
    }
    case 'goals': {
      const goals = typeof db.getBusinessGoals === 'function' ? db.getBusinessGoals(businessId) : [];
      rows = goals.map((g: any) => ({
        id: g.id,
        title: g.title || g.name || '',
        targetType: g.targetType || g.type || '',
        targetValue: Number(g.targetValue || 0),
        startDate: g.startDate || '',
        endDate: g.endDate || '',
        status: g.status || 'IN_PROGRESS',
      }));
      break;
    }
    case 'decisions': {
      const decisions = typeof db.getBusinessDecisions === 'function' ? db.getBusinessDecisions(businessId) : [];
      rows = decisions.map((d: any) => ({
        id: d.id,
        title: d.title || '',
        description: d.description || '',
        category: d.category || '',
        priority: d.priority || 'MEDIUM',
        status: d.status || 'OPEN',
        dueDate: d.dueDate || '',
        createdBy: d.createdBy || '',
        createdAt: d.createdAt || '',
        completedAt: d.completedAt || '',
      }));
      break;
    }
    case 'alerts': {
      const alerts = generateBusinessAlerts(businessId, user);
      rows = alerts.map((a: any) => ({
        id: a.id,
        type: a.type || a.alertType || '',
        severity: a.severity || 'INFO',
        title: a.title || '',
        message: a.message || '',
        status: a.status || 'ACTIVE',
        createdAt: a.createdAt || '',
      }));
      break;
    }
    case 'activity': {
      const timeline = getBusinessActivityTimeline(businessId, user, { limit: 1000 });
      rows = timeline.map((t: any) => ({
        id: t.id,
        eventType: t.eventType || '',
        title: t.title || '',
        description: t.description || '',
        createdAt: t.createdAt || '',
      }));
      break;
    }
  }

  return rows;
}

export function exportBusinessDataToCsv(businessId: string, user: DBUser, rawType: string): { filename: string; csv: string } {
  const type = rawType.toLowerCase().trim() as ExportType;
  const rows = getBusinessExportData(businessId, user, type);
  const csv = arrayToCsv(rows);
  const filenamePrefix = type === 'products' ? 'inventory' : type;
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_export_${businessId}_${dateStr}.csv`;

  return { filename, csv };
}
