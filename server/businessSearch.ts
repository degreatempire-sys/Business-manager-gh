/**
 * GLOBAL BUSINESS SEARCH & QUICK FIND (Stage 5X)
 * Server-authoritative read-only search engine across existing tenant-scoped records:
 * products, customers, sales, debts, suppliers, purchases, expenses, and invoices.
 */

import { db } from './db.js';

export interface SearchResultItem {
  id: string;
  type: 'product' | 'customer' | 'sale' | 'debt' | 'supplier' | 'purchase' | 'expense' | 'invoice';
  title: string;
  subtitle: string;
  referenceId?: string;
  createdAt?: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: {
    products: SearchResultItem[];
    customers: SearchResultItem[];
    sales: SearchResultItem[];
    debts: SearchResultItem[];
    suppliers: SearchResultItem[];
    purchases: SearchResultItem[];
    expenses: SearchResultItem[];
    invoices: SearchResultItem[];
  };
  totalCount: number;
}

export function searchBusinessRecords(businessId: string, query: string, permissions?: any): SearchResponse {
  const q = (query || '').trim().toLowerCase();
  const limit = 8; // max per category

  const products: SearchResultItem[] = [];
  const customers: SearchResultItem[] = [];
  const sales: SearchResultItem[] = [];
  const debts: SearchResultItem[] = [];
  const suppliers: SearchResultItem[] = [];
  const purchases: SearchResultItem[] = [];
  const expenses: SearchResultItem[] = [];
  const invoices: SearchResultItem[] = [];

  if (!q || q.length < 1) {
    return {
      success: true,
      query: q,
      results: { products, customers, sales, debts, suppliers, purchases, expenses, invoices },
      totalCount: 0,
    };
  }

  // 1. Products
  const allProducts = db.getProducts(businessId) || [];
  for (const p of allProducts) {
    if (products.length >= limit) break;
    const match = (p.name && p.name.toLowerCase().includes(q)) ||
                  (p.sku && p.sku.toLowerCase().includes(q)) ||
                  (p.category && p.category.toLowerCase().includes(q));
    if (match) {
      products.push({
        id: p.id,
        type: 'product',
        title: p.name || p.sku,
        subtitle: `SKU: ${p.sku} | Price: ${p.sellingPrice} | Stock: ${p.quantity}`,
        referenceId: p.sku,
        createdAt: p.createdAt,
      });
    }
  }

  // 2. Customers
  const allCustomers = db.getCustomers(businessId) || [];
  for (const c of allCustomers) {
    if (customers.length >= limit) break;
    const match = (c.name && c.name.toLowerCase().includes(q)) ||
                  (c.phone && c.phone.toLowerCase().includes(q));
    if (match) {
      customers.push({
        id: c.id,
        type: 'customer',
        title: c.name,
        subtitle: `Phone: ${c.phone || 'N/A'}`,
        createdAt: c.createdAt,
      });
    }
  }

  // 3. Sales
  const allSales = db.getSales(businessId) || [];
  for (const s of allSales) {
    if (sales.length >= limit) break;
    const match = (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q)) ||
                  (s.customerName && s.customerName.toLowerCase().includes(q)) ||
                  (s.cashierName && s.cashierName.toLowerCase().includes(q));
    if (match) {
      sales.push({
        id: s.id,
        type: 'sale',
        title: `Receipt: ${s.receiptNumber}`,
        subtitle: `Customer: ${s.customerName || 'Walk-in'} | Total: ${s.total} | Status: ${s.status}`,
        referenceId: s.receiptNumber,
        createdAt: s.createdAt,
      });
    }
  }

  // 4. Debts (sales with balance > 0)
  for (const s of allSales) {
    if (debts.length >= limit) break;
    if ((s.balance || 0) > 0) {
      const match = (s.customerName && s.customerName.toLowerCase().includes(q)) ||
                    (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q));
      if (match) {
        debts.push({
          id: s.id,
          type: 'debt',
          title: `Debt - ${s.customerName || 'Customer'}`,
          subtitle: `Balance Due: ${s.balance} | Receipt: ${s.receiptNumber}`,
          referenceId: s.receiptNumber,
          createdAt: s.createdAt,
        });
      }
    }
  }

  // 5. Suppliers
  const allSuppliers = db.getSuppliers(businessId) || [];
  for (const sup of allSuppliers) {
    if (suppliers.length >= limit) break;
    const match = (sup.name && sup.name.toLowerCase().includes(q)) ||
                  (sup.phone && sup.phone.toLowerCase().includes(q));
    if (match) {
      suppliers.push({
        id: sup.id,
        type: 'supplier',
        title: sup.name,
        subtitle: `Phone: ${sup.phone || 'N/A'}`,
        createdAt: sup.createdAt,
      });
    }
  }

  // 6. Purchases
  const allPurchases = db.getPurchases(businessId) || [];
  for (const pur of allPurchases) {
    if (purchases.length >= limit) break;
    const match = (pur.id && pur.id.toLowerCase().includes(q)) ||
                  (pur.supplierName && pur.supplierName.toLowerCase().includes(q)) ||
                  (pur.invoiceNumber && pur.invoiceNumber.toLowerCase().includes(q));
    if (match) {
      purchases.push({
        id: pur.id,
        type: 'purchase',
        title: `Purchase: ${pur.invoiceNumber || pur.id.slice(0, 8)}`,
        subtitle: `Supplier: ${pur.supplierName || 'N/A'} | Total: ${pur.totalAmount || 0}`,
        referenceId: pur.invoiceNumber,
        createdAt: pur.createdAt,
      });
    }
  }

  // 7. Expenses
  const allExpenses = db.getExpenses(businessId) || [];
  for (const ex of allExpenses) {
    if (expenses.length >= limit) break;
    const match = (ex.title && ex.title.toLowerCase().includes(q)) ||
                  (ex.category && ex.category.toLowerCase().includes(q)) ||
                  (ex.description && ex.description.toLowerCase().includes(q));
    if (match) {
      expenses.push({
        id: ex.id,
        type: 'expense',
        title: `Expense: ${ex.title}`,
        subtitle: `Category: ${ex.category} | Amount: ${ex.amount}`,
        createdAt: ex.createdAt,
      });
    }
  }

  // 8. Invoices
  const allInvoices = db.getInvoices(businessId) || [];
  for (const inv of allInvoices) {
    if (invoices.length >= limit) break;
    const match = (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
                  (inv.customerName && inv.customerName.toLowerCase().includes(q));
    if (match) {
      invoices.push({
        id: inv.id,
        type: 'invoice',
        title: `Invoice: ${inv.invoiceNumber}`,
        subtitle: `Customer: ${inv.customerName || 'N/A'} | Total: ${inv.total} | Status: ${inv.status}`,
        referenceId: inv.invoiceNumber,
        createdAt: inv.createdAt,
      });
    }
  }

  const totalCount = products.length + customers.length + sales.length + debts.length + suppliers.length + purchases.length + expenses.length + invoices.length;

  return {
    success: true,
    query: q,
    results: { products, customers, sales, debts, suppliers, purchases, expenses, invoices },
    totalCount,
  };
}
