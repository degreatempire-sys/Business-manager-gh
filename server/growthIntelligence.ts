/**
 * Server-Side Business Growth, Sales Intelligence & Decision Support Engine (Stage 4J)
 * Fully authoritative, deterministic, read-only analytics adhering to Africa/Accra business time.
 */

import { db } from './db.js';
import {
  getAccraToday,
  getAccraDateString,
  resolveAccraDateRangeWithComparison,
} from './date.js';
import type {
  Sale,
  Product,
  Customer,
  Expense,
  GrowthDecisionSupportPayload,
  GrowthSalesIntelligence,
  ProductPerformanceIntelligenceItem,
  ProductPerformanceTrend,
  CategoryIntelligenceItem,
  CustomerValueIntelligence,
  InactiveValuableCustomerItem,
  GrowthPaymentIntelligenceItem,
  ProfitabilityIntelligence,
  ExpenseIntelligence,
  BusinessGrowthSignal,
  ManagementActionRecommendation,
  BusinessHealthSummary,
  BusinessHealthIndicator,
  HourlyDistributionItem,
  DayOfWeekDistributionItem,
} from '../src/types/index.js';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDayHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${ampm}`;
}

export function computeBusinessGrowthIntelligence(
  businessId: string,
  range?: string,
  startDate?: string,
  endDate?: string,
  canViewFinancials: boolean = false
): GrowthDecisionSupportPayload {
  // 1. Resolve Ghana (Africa/Accra) date ranges with comparative period
  const dateRange = resolveAccraDateRangeWithComparison(range, startDate, endDate);
  const { fromDate, toDate, label, normalizedRange, hasComparison, previousRange, reasonIfUnavailable } = dateRange;

  const todayAccra = getAccraToday();

  // Calculate day span of current period
  const fDate = new Date(fromDate);
  const tDate = new Date(toDate);
  const diffDays = Math.round((tDate.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const currentPeriodDays = Math.max(1, isNaN(diffDays) ? 1 : diffDays);

  // 2. Load Authoritative Entities
  const allSales = db.getSales(businessId);
  const allProducts = db.getProducts(businessId);
  const allCustomers = db.getCustomers(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allPayments = db.getCustomerPayments(businessId);

  // Filter Completed Current Period Sales
  const currentSales = allSales.filter((s) => {
    if (s.status === 'Cancelled') return false;
    const sDate = getAccraDateString(s.createdAt);
    if (fromDate && sDate < fromDate) return false;
    if (toDate && sDate > toDate) return false;
    return true;
  });

  // Filter Completed Previous Period Sales (if comparative range exists)
  const previousSales = hasComparison && previousRange
    ? allSales.filter((s) => {
        if (s.status === 'Cancelled') return false;
        const sDate = getAccraDateString(s.createdAt);
        if (previousRange.fromDate && sDate < previousRange.fromDate) return false;
        if (previousRange.toDate && sDate > previousRange.toDate) return false;
        return true;
      })
    : [];

  // Filter Current Period Expenses
  const currentExpenses = allExpenses.filter((e) => {
    const eDate = getAccraDateString(e.date || e.createdAt);
    if (fromDate && eDate < fromDate) return false;
    if (toDate && eDate > toDate) return false;
    return true;
  });

  // Filter Previous Period Expenses
  const previousExpenses = hasComparison && previousRange
    ? allExpenses.filter((e) => {
        const eDate = getAccraDateString(e.date || e.createdAt);
        if (previousRange.fromDate && eDate < previousRange.fromDate) return false;
        if (previousRange.toDate && eDate > previousRange.toDate) return false;
        return true;
      })
    : [];

  // -------------------------------------------------------------------------
  // 3. REVENUE & SALES INTELLIGENCE
  // -------------------------------------------------------------------------
  const totalRevenue = currentSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const transactionCount = currentSales.length;
  const unitsSold = currentSales.reduce(
    (uSum, s) => uSum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0),
    0
  );
  const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  let previousRevenue: number | undefined = undefined;
  let previousTransactions: number | undefined = undefined;
  let previousUnits: number | undefined = undefined;
  let previousAverageTransactionValue: number | undefined = undefined;
  let revenueGrowthPct: number | null = null;
  let revenueGrowthDelta = 0;
  let transactionGrowthPct: number | null = null;
  let unitsGrowthPct: number | null = null;
  let atvGrowthDelta = 0;

  if (hasComparison && previousRange) {
    previousRevenue = previousSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    previousTransactions = previousSales.length;
    previousUnits = previousSales.reduce(
      (uSum, s) => uSum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0),
      0
    );
    previousAverageTransactionValue =
      previousTransactions > 0 ? previousRevenue / previousTransactions : 0;

    revenueGrowthDelta = totalRevenue - previousRevenue;
    revenueGrowthPct =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;

    transactionGrowthPct =
      previousTransactions > 0
        ? ((transactionCount - previousTransactions) / previousTransactions) * 100
        : transactionCount > 0
        ? 100
        : 0;

    unitsGrowthPct =
      previousUnits > 0
        ? ((unitsSold - previousUnits) / previousUnits) * 100
        : unitsSold > 0
        ? 100
        : 0;

    atvGrowthDelta = averageTransactionValue - previousAverageTransactionValue;
  }

  const salesIntelligence: GrowthSalesIntelligence = {
    totalRevenue,
    transactionCount,
    unitsSold,
    averageTransactionValue,
    hasComparison,
    comparisonLabel: previousRange?.label || 'Previous Period',
    previousRevenue,
    previousTransactions,
    previousUnits,
    previousAverageTransactionValue,
    revenueGrowthPct,
    revenueGrowthDelta,
    transactionGrowthPct,
    unitsGrowthPct,
    atvGrowthDelta,
  };

  // -------------------------------------------------------------------------
  // 4. PRODUCT PERFORMANCE & TREND INTELLIGENCE
  // -------------------------------------------------------------------------
  // Catalog map for fast product lookup
  const productCatalogMap = new Map<string, Product>();
  for (const p of allProducts) {
    productCatalogMap.set(p.id, p);
  }

  // Aggregation containers
  interface ProductAgg {
    productId: string;
    productName: string;
    sku?: string;
    category: string;
    unitsSold: number;
    revenueGenerated: number;
    salesFrequency: number;
    firstSaleDate?: string;
    mostRecentSaleDate?: string;
    cogs: number;
    buyingPrice?: number;
    previousUnitsSold: number;
    previousRevenue: number;
  }

  const productAggMap = new Map<string, ProductAgg>();

  // Initialize catalog entries
  for (const p of allProducts) {
    productAggMap.set(p.id, {
      productId: p.id,
      productName: p.name,
      sku: p.sku || '',
      category: p.category || 'General',
      unitsSold: 0,
      revenueGenerated: 0,
      salesFrequency: 0,
      firstSaleDate: undefined,
      mostRecentSaleDate: undefined,
      cogs: 0,
      buyingPrice: p.buyingPrice || 0,
      previousUnitsSold: 0,
      previousRevenue: 0,
    });
  }

  // Aggregate current sales
  for (const s of currentSales) {
    const sDate = s.createdAt;
    const seenInSale = new Set<string>();

    for (const item of s.items) {
      const pId = item.productId || (item as any).id || `unknown-${item.productName}`;
      let agg = productAggMap.get(pId);
      if (!agg) {
        agg = {
          productId: pId,
          productName: item.productName || 'Unnamed Item',
          sku: item.sku || '',
          category: (item as any).category || 'General',
          unitsSold: 0,
          revenueGenerated: 0,
          salesFrequency: 0,
          cogs: 0,
          buyingPrice: (item as any).buyingPrice || 0,
          previousUnitsSold: 0,
          previousRevenue: 0,
        };
        productAggMap.set(pId, agg);
      }

      const q = Number(item.quantity) || 0;
      const rev = Number((item as any).total ?? ((Number(item.sellingPrice) || 0) * q)) || 0;
      const bPrice = (item as any).buyingPrice ?? productCatalogMap.get(pId)?.buyingPrice ?? 0;

      agg.unitsSold += q;
      agg.revenueGenerated += rev;
      agg.cogs += bPrice * q;

      if (!seenInSale.has(pId)) {
        agg.salesFrequency += 1;
        seenInSale.add(pId);
      }

      if (!agg.firstSaleDate || new Date(sDate) < new Date(agg.firstSaleDate)) {
        agg.firstSaleDate = sDate;
      }
      if (!agg.mostRecentSaleDate || new Date(sDate) > new Date(agg.mostRecentSaleDate)) {
        agg.mostRecentSaleDate = sDate;
      }
    }
  }

  // Aggregate previous sales (if comparison exists)
  if (hasComparison) {
    for (const s of previousSales) {
      for (const item of s.items) {
        const pId = item.productId || (item as any).id || `unknown-${item.productName}`;
        let agg = productAggMap.get(pId);
        if (!agg) {
          agg = {
            productId: pId,
            productName: item.productName || 'Unnamed Item',
            sku: item.sku || '',
            category: (item as any).category || 'General',
            unitsSold: 0,
            revenueGenerated: 0,
            salesFrequency: 0,
            cogs: 0,
            buyingPrice: (item as any).buyingPrice || 0,
            previousUnitsSold: 0,
            previousRevenue: 0,
          };
          productAggMap.set(pId, agg);
        }
        const q = Number(item.quantity) || 0;
        const rev = Number((item as any).total ?? ((Number(item.sellingPrice) || 0) * q)) || 0;
        agg.previousUnitsSold += q;
        agg.previousRevenue += rev;
      }
    }
  }

  // Build final ProductPerformanceIntelligenceItem array
  const allProductsPerformance: ProductPerformanceIntelligenceItem[] = [];

  for (const agg of productAggMap.values()) {
    const catalogItem = productCatalogMap.get(agg.productId);
    const stockAvailable = catalogItem ? catalogItem.quantity : 0;
    const minStock = catalogItem ? (catalogItem.minStockLevel ?? 5) : 5;

    const velocity = agg.unitsSold / currentPeriodDays;
    const stockCoverageDays =
      velocity > 0
        ? Math.round(stockAvailable / velocity)
        : stockAvailable > 0
        ? 999
        : 0;

    const avgPrice =
      agg.unitsSold > 0
        ? agg.revenueGenerated / agg.unitsSold
        : catalogItem?.sellingPrice || 0;

    let trend: ProductPerformanceTrend = 'Insufficient Data';
    let unitsDelta: number | undefined = undefined;
    let revenueDelta: number | undefined = undefined;
    let unitsGrowthPct: number | null = null;
    let revenueGrowthPct: number | null = null;

    if (hasComparison) {
      unitsDelta = agg.unitsSold - agg.previousUnitsSold;
      revenueDelta = agg.revenueGenerated - agg.previousRevenue;

      if (agg.previousUnitsSold > 0) {
        unitsGrowthPct = ((agg.unitsSold - agg.previousUnitsSold) / agg.previousUnitsSold) * 100;
      } else if (agg.unitsSold > 0) {
        unitsGrowthPct = 100;
      } else {
        unitsGrowthPct = 0;
      }

      if (agg.previousRevenue > 0) {
        revenueGrowthPct = ((agg.revenueGenerated - agg.previousRevenue) / agg.previousRevenue) * 100;
      } else if (agg.revenueGenerated > 0) {
        revenueGrowthPct = 100;
      } else {
        revenueGrowthPct = 0;
      }

      if (agg.unitsSold === 0 && agg.previousUnitsSold === 0) {
        trend = 'Insufficient Data';
      } else if (agg.unitsSold >= 2 && unitsGrowthPct >= 10) {
        trend = 'Growing';
      } else if (agg.previousUnitsSold >= 2 && unitsGrowthPct <= -10) {
        trend = 'Declining';
      } else {
        trend = 'Stable';
      }
    }

    const grossProfit = agg.revenueGenerated - agg.cogs;
    const grossMargin = agg.revenueGenerated > 0 ? (grossProfit / agg.revenueGenerated) * 100 : 0;

    const perfItem: ProductPerformanceIntelligenceItem = {
      productId: agg.productId,
      productName: agg.productName,
      sku: agg.sku,
      category: agg.category,
      unitsSold: agg.unitsSold,
      revenueGenerated: agg.revenueGenerated,
      averageSellingPrice: avgPrice,
      salesFrequency: agg.salesFrequency,
      firstSaleDate: agg.firstSaleDate,
      mostRecentSaleDate: agg.mostRecentSaleDate,
      stockCurrentlyAvailable: stockAvailable,
      minStockLevel: minStock,
      velocity: Math.round(velocity * 100) / 100,
      stockCoverageDays: stockCoverageDays === 999 ? null : stockCoverageDays,
      trend,
      previousUnitsSold: hasComparison ? agg.previousUnitsSold : undefined,
      previousRevenue: hasComparison ? agg.previousRevenue : undefined,
      unitsDelta,
      revenueDelta,
      unitsGrowthPct,
      revenueGrowthPct,
    };

    // Financial Privacy Enforcement
    if (canViewFinancials) {
      perfItem.buyingPrice = agg.buyingPrice;
      perfItem.cogs = agg.cogs;
      perfItem.grossProfit = grossProfit;
      perfItem.grossMargin = Math.round(grossMargin * 10) / 10;
    }

    allProductsPerformance.push(perfItem);
  }

  // Sort and categorize product cohorts
  allProductsPerformance.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  const topRevenueProducts = allProductsPerformance
    .filter((p) => p.revenueGenerated > 0)
    .slice(0, 10);

  const topProfitProducts = canViewFinancials
    ? [...allProductsPerformance]
        .filter((p) => (p.grossProfit ?? 0) > 0)
        .sort((a, b) => (b.grossProfit ?? 0) - (a.grossProfit ?? 0))
        .slice(0, 10)
    : undefined;

  const topUnitsProducts = [...allProductsPerformance]
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);

  const fastestMovingProducts = [...allProductsPerformance]
    .filter((p) => p.velocity > 0)
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 10);

  const decliningProducts = [...allProductsPerformance]
    .filter((p) => p.trend === 'Declining')
    .sort((a, b) => (a.unitsDelta ?? 0) - (b.unitsDelta ?? 0))
    .slice(0, 10);

  const slowMovingProducts = allProductsPerformance
    .filter((p) => p.unitsSold > 0 && p.velocity < 0.2)
    .sort((a, b) => a.velocity - b.velocity)
    .slice(0, 10);

  const neverSoldProducts = allProductsPerformance
    .filter((p) => p.unitsSold === 0 && (p.previousUnitsSold ?? 0) === 0)
    .slice(0, 15);

  const lowStockFastMovers = allProductsPerformance
    .filter(
      (p) =>
        p.stockCurrentlyAvailable <= p.minStockLevel &&
        p.velocity > 0
    )
    .sort((a, b) => b.velocity - a.velocity);

  // -------------------------------------------------------------------------
  // 5. CATEGORY INTELLIGENCE
  // -------------------------------------------------------------------------
  interface CategoryAgg {
    category: string;
    productCount: number;
    revenue: number;
    unitsSold: number;
    transactionCount: number;
    stockExposure: number;
    cogs: number;
    previousRevenue: number;
  }

  const categoryAggMap = new Map<string, CategoryAgg>();

  for (const p of allProducts) {
    const cat = p.category || 'General';
    let cAgg = categoryAggMap.get(cat);
    if (!cAgg) {
      cAgg = {
        category: cat,
        productCount: 0,
        revenue: 0,
        unitsSold: 0,
        transactionCount: 0,
        stockExposure: 0,
        cogs: 0,
        previousRevenue: 0,
      };
      categoryAggMap.set(cat, cAgg);
    }
    cAgg.productCount += 1;
    cAgg.stockExposure += p.quantity || 0;
  }

  for (const s of currentSales) {
    const seenCats = new Set<string>();
    for (const item of s.items) {
      const p = productCatalogMap.get(item.productId || '');
      const cat = p?.category || (item as any).category || 'General';
      let cAgg = categoryAggMap.get(cat);
      if (!cAgg) {
        cAgg = {
          category: cat,
          productCount: 1,
          revenue: 0,
          unitsSold: 0,
          transactionCount: 0,
          stockExposure: 0,
          cogs: 0,
          previousRevenue: 0,
        };
        categoryAggMap.set(cat, cAgg);
      }
      const q = Number(item.quantity) || 0;
      const rev = Number((item as any).total ?? ((Number(item.sellingPrice) || 0) * q)) || 0;
      const bPrice = (item as any).buyingPrice ?? p?.buyingPrice ?? 0;

      cAgg.revenue += rev;
      cAgg.unitsSold += q;
      cAgg.cogs += bPrice * q;

      if (!seenCats.has(cat)) {
        cAgg.transactionCount += 1;
        seenCats.add(cat);
      }
    }
  }

  if (hasComparison) {
    for (const s of previousSales) {
      for (const item of s.items) {
        const p = productCatalogMap.get(item.productId || '');
        const cat = p?.category || (item as any).category || 'General';
        const cAgg = categoryAggMap.get(cat);
        if (cAgg) {
          const q = Number(item.quantity) || 0;
          const rev = Number((item as any).total ?? ((Number(item.sellingPrice) || 0) * q)) || 0;
          cAgg.previousRevenue += rev;
        }
      }
    }
  }

  const categoryIntelligence: CategoryIntelligenceItem[] = [];

  for (const cAgg of categoryAggMap.values()) {
    let trend: ProductPerformanceTrend = 'Insufficient Data';
    let revGrowthPct: number | null = null;

    if (hasComparison) {
      if (cAgg.previousRevenue > 0) {
        revGrowthPct = ((cAgg.revenue - cAgg.previousRevenue) / cAgg.previousRevenue) * 100;
      } else if (cAgg.revenue > 0) {
        revGrowthPct = 100;
      } else {
        revGrowthPct = 0;
      }

      if (cAgg.revenue === 0 && cAgg.previousRevenue === 0) {
        trend = 'Insufficient Data';
      } else if (revGrowthPct >= 10 && cAgg.revenue >= 10) {
        trend = 'Growing';
      } else if (revGrowthPct <= -10 && cAgg.previousRevenue >= 10) {
        trend = 'Declining';
      } else {
        trend = 'Stable';
      }
    }

    const grossProfit = cAgg.revenue - cAgg.cogs;
    const grossMargin = cAgg.revenue > 0 ? (grossProfit / cAgg.revenue) * 100 : 0;

    const item: CategoryIntelligenceItem = {
      category: cAgg.category,
      productCount: cAgg.productCount,
      revenue: cAgg.revenue,
      unitsSold: cAgg.unitsSold,
      transactionCount: cAgg.transactionCount,
      stockExposure: cAgg.stockExposure,
      trend,
      revenueGrowthPct: revGrowthPct,
      previousRevenue: hasComparison ? cAgg.previousRevenue : undefined,
    };

    if (canViewFinancials) {
      item.grossProfit = grossProfit;
      item.grossMargin = Math.round(grossMargin * 10) / 10;
    }

    categoryIntelligence.push(item);
  }

  categoryIntelligence.sort((a, b) => b.revenue - a.revenue);

  const strongestCategory = categoryIntelligence.length > 0 ? categoryIntelligence[0] : undefined;
  const fastestGrowingCategory = [...categoryIntelligence]
    .filter((c) => (c.revenueGrowthPct ?? 0) > 0 && c.revenue >= 10)
    .sort((a, b) => (b.revenueGrowthPct ?? 0) - (a.revenueGrowthPct ?? 0))[0];
  const decliningCategory = [...categoryIntelligence]
    .filter((c) => (c.revenueGrowthPct ?? 0) < 0 && (c.previousRevenue ?? 0) >= 10)
    .sort((a, b) => (a.revenueGrowthPct ?? 0) - (b.revenueGrowthPct ?? 0))[0];

  // Category with inventory pressure: highest ratio of low-stock products
  const categoryPressureMap = new Map<string, { total: number; low: number }>();
  for (const p of allProducts) {
    const cat = p.category || 'General';
    const entry = categoryPressureMap.get(cat) || { total: 0, low: 0 };
    entry.total += 1;
    if (p.quantity <= (p.minStockLevel ?? 5)) entry.low += 1;
    categoryPressureMap.set(cat, entry);
  }

  let maxPressureCat: string | undefined = undefined;
  let maxPressureScore = 0;
  for (const [cat, entry] of categoryPressureMap.entries()) {
    if (entry.total > 0 && entry.low > 0) {
      const score = (entry.low / entry.total) * 100;
      if (score > maxPressureScore) {
        maxPressureScore = score;
        maxPressureCat = cat;
      }
    }
  }
  const inventoryPressureCategory = maxPressureCat
    ? categoryIntelligence.find((c) => c.category === maxPressureCat)
    : undefined;

  // -------------------------------------------------------------------------
  // 6. CUSTOMER VALUE & RETENTION INTELLIGENCE
  // -------------------------------------------------------------------------
  const customerMap = new Map<string, Customer>();
  for (const c of allCustomers) {
    customerMap.set(c.id, c);
  }

  interface CustomerSpendAgg {
    customerId: string;
    name: string;
    phone?: string;
    totalSpendAllTime: number;
    orderCountAllTime: number;
    periodSpend: number;
    periodOrderCount: number;
    lastPurchaseDate?: string;
    currentDebt: number;
  }

  const customerSpendMap = new Map<string, CustomerSpendAgg>();

  // Process all-time sales for customer profiles
  for (const s of allSales) {
    if (s.status === 'Cancelled' || !s.customerId) continue;
    const cId = s.customerId;
    let entry = customerSpendMap.get(cId);
    if (!entry) {
      const c = customerMap.get(cId);
      entry = {
        customerId: cId,
        name: c?.name || s.customerName || 'Customer',
        phone: c?.phone || s.customerPhone,
        totalSpendAllTime: 0,
        orderCountAllTime: 0,
        periodSpend: 0,
        periodOrderCount: 0,
        lastPurchaseDate: undefined,
        currentDebt: (c as any)?.currentDebt ?? (c as any)?.debtBalance ?? (c as any)?.balance ?? 0,
      };
      customerSpendMap.set(cId, entry);
    }

    entry.totalSpendAllTime += Number(s.total) || 0;
    entry.orderCountAllTime += 1;

    if (!entry.lastPurchaseDate || new Date(s.createdAt) > new Date(entry.lastPurchaseDate)) {
      entry.lastPurchaseDate = s.createdAt;
    }
  }

  // Add current period activity
  for (const s of currentSales) {
    if (s.customerId) {
      const entry = customerSpendMap.get(s.customerId);
      if (entry) {
        entry.periodSpend += Number(s.total) || 0;
        entry.periodOrderCount += 1;
      }
    }
  }

  let activeCustomersCount = 0;
  let returningCustomersCount = 0;
  let newCustomersCount = 0;

  for (const c of customerSpendMap.values()) {
    if (c.periodOrderCount > 0) {
      activeCustomersCount += 1;
      if (c.orderCountAllTime > c.periodOrderCount) {
        returningCustomersCount += 1;
      } else {
        newCustomersCount += 1;
      }
    }
  }

  const returningCustomerRatePct =
    activeCustomersCount > 0
      ? (returningCustomersCount / activeCustomersCount) * 100
      : 0;

  // Inactive valuable customers (CLV >= 100 or orders >= 3, with no purchase in > 30 days)
  const inactiveValuableCustomers: InactiveValuableCustomerItem[] = [];
  const todayMs = new Date(todayAccra).getTime();

  for (const c of customerSpendMap.values()) {
    if ((c.totalSpendAllTime >= 100 || c.orderCountAllTime >= 3) && c.lastPurchaseDate) {
      const lastMs = new Date(c.lastPurchaseDate).getTime();
      const daysSince = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
      if (daysSince >= 30) {
        inactiveValuableCustomers.push({
          customerId: c.customerId,
          name: c.name,
          phone: c.phone,
          clv: c.totalSpendAllTime,
          totalOrders: c.orderCountAllTime,
          lastPurchaseDate: c.lastPurchaseDate,
          daysSinceLastPurchase: daysSince,
          currentDebt: c.currentDebt,
        });
      }
    }
  }

  inactiveValuableCustomers.sort((a, b) => b.clv - a.clv);

  const topCustomersByRevenue = [...customerSpendMap.values()]
    .map((c) => ({
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      totalSpend: c.totalSpendAllTime,
      orderCount: c.orderCountAllTime,
      lastPurchaseDate: c.lastPurchaseDate,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10);

  const customerIntelligence: CustomerValueIntelligence = {
    totalCustomers: allCustomers.length,
    activeCustomersCount,
    newCustomersCount,
    returningCustomersCount,
    returningCustomerRatePct: Math.round(returningCustomerRatePct * 10) / 10,
    inactiveValuableCustomers: inactiveValuableCustomers.slice(0, 10),
    topCustomersByRevenue,
  };

  // -------------------------------------------------------------------------
  // 7. TIME INTELLIGENCE (HOURLY & DAY-OF-WEEK)
  // -------------------------------------------------------------------------
  const hourlyDistribution: HourlyDistributionItem[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: formatDayHour(h),
    hourLabel: formatDayHour(h),
    salesCount: 0,
    totalRevenue: 0,
    averageTransactionValue: 0,
  }));

  const dayOfWeekDistribution: DayOfWeekDistributionItem[] = DAYS_OF_WEEK.map((dayName, index) => ({
    dayIndex: index,
    dayName,
    salesCount: 0,
    totalRevenue: 0,
    averageTransactionValue: 0,
  }));

  for (const s of currentSales) {
    const saleDate = new Date(s.createdAt);
    if (!isNaN(saleDate.getTime())) {
      const utcHour = saleDate.getUTCHours();
      if (utcHour >= 0 && utcHour < 24) {
        hourlyDistribution[utcHour].salesCount += 1;
        hourlyDistribution[utcHour].totalRevenue += s.total;
      }

      const utcDay = saleDate.getUTCDay();
      if (utcDay >= 0 && utcDay < 7) {
        dayOfWeekDistribution[utcDay].salesCount += 1;
        dayOfWeekDistribution[utcDay].totalRevenue += s.total;
      }
    }
  }

  for (const h of hourlyDistribution) {
    h.averageTransactionValue = h.salesCount > 0 ? h.totalRevenue / h.salesCount : 0;
  }
  for (const d of dayOfWeekDistribution) {
    d.averageTransactionValue = d.salesCount > 0 ? d.totalRevenue / d.salesCount : 0;
  }

  let peakHour = 12;
  let peakRevenue = -1;
  let peakCount = 0;

  for (const h of hourlyDistribution) {
    if (h.totalRevenue > peakRevenue) {
      peakRevenue = h.totalRevenue;
      peakHour = h.hour;
      peakCount = h.salesCount;
    }
  }

  let busiestTimeOfDay = 'Afternoon';
  if (peakHour >= 6 && peakHour < 12) busiestTimeOfDay = 'Morning (6 AM - 12 PM)';
  else if (peakHour >= 12 && peakHour < 17) busiestTimeOfDay = 'Afternoon (12 PM - 5 PM)';
  else if (peakHour >= 17 && peakHour < 22) busiestTimeOfDay = 'Evening (5 PM - 10 PM)';
  else busiestTimeOfDay = 'Night (10 PM - 6 AM)';

  const sortedDays = [...dayOfWeekDistribution].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const busiestDay = sortedDays[0] || { dayName: 'Monday', salesCount: 0, totalRevenue: 0 };
  const slowestDay = sortedDays[sortedDays.length - 1] || { dayName: 'Sunday', salesCount: 0, totalRevenue: 0 };

  const timeIntelligence = {
    hourlyDistribution,
    peakOperatingHours: {
      peakHour,
      peakHourLabel: formatDayHour(peakHour),
      salesCount: peakCount,
      totalRevenue: peakRevenue,
      busiestTimeOfDay,
    },
    dayOfWeekDistribution,
    busiestDay: {
      dayName: busiestDay.dayName,
      salesCount: busiestDay.salesCount,
      totalRevenue: busiestDay.totalRevenue,
    },
    slowestDay: {
      dayName: slowestDay.dayName,
      salesCount: slowestDay.salesCount,
      totalRevenue: slowestDay.totalRevenue,
    },
  };

  // -------------------------------------------------------------------------
  // 8. PAYMENT INTELLIGENCE
  // -------------------------------------------------------------------------
  const paymentMethodMap = new Map<string, { count: number; amount: number; prevAmount: number }>();

  for (const s of currentSales) {
    const method = s.paymentMethod || 'Cash';
    const entry = paymentMethodMap.get(method) || { count: 0, amount: 0, prevAmount: 0 };
    entry.count += 1;
    entry.amount += Number(s.total) || 0;
    paymentMethodMap.set(method, entry);
  }

  if (hasComparison) {
    for (const s of previousSales) {
      const method = s.paymentMethod || 'Cash';
      const entry = paymentMethodMap.get(method) || { count: 0, amount: 0, prevAmount: 0 };
      entry.prevAmount += Number(s.total) || 0;
      paymentMethodMap.set(method, entry);
    }
  }

  const paymentIntelligence: GrowthPaymentIntelligenceItem[] = [];
  for (const [method, entry] of paymentMethodMap.entries()) {
    const pct = totalRevenue > 0 ? (entry.amount / totalRevenue) * 100 : 0;
    let growthPct: number | null = null;

    if (hasComparison) {
      if (entry.prevAmount > 0) {
        growthPct = ((entry.amount - entry.prevAmount) / entry.prevAmount) * 100;
      } else if (entry.amount > 0) {
        growthPct = 100;
      } else {
        growthPct = 0;
      }
    }

    paymentIntelligence.push({
      method,
      count: entry.count,
      amount: entry.amount,
      percentage: Math.round(pct * 10) / 10,
      previousAmount: hasComparison ? entry.prevAmount : undefined,
      growthPct,
    });
  }

  paymentIntelligence.sort((a, b) => b.amount - a.amount);

  // Staff attribution & intelligence
  const staffSalesMap = new Map<string, { staffId: string; staffName: string; salesCount: number; totalRevenue: number }>();
  for (const s of currentSales) {
    const staffId = s.staffId || s.createdBy || 'unknown';
    const staffName = s.cashierName || s.createdBy || 'Staff';
    const existing = staffSalesMap.get(staffId) || { staffId, staffName, salesCount: 0, totalRevenue: 0 };
    existing.salesCount += 1;
    existing.totalRevenue += Number(s.total) || 0;
    staffSalesMap.set(staffId, existing);
  }
  const allStaff = db.getUsersByBusiness(businessId).filter((u) => u.role === 'staff');
  const staffLeaderboard = Array.from(staffSalesMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  const staffIntelligence = {
    staffCount: Math.max(allStaff.length, staffLeaderboard.length),
    staffLeaderboard,
  };

  // -------------------------------------------------------------------------
  // 9. PROFITABILITY & EXPENSE INTELLIGENCE
  // -------------------------------------------------------------------------
  const currentExpensesTotal = currentExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const previousExpensesTotal = hasComparison
    ? previousExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    : undefined;

  let profitabilityIntelligence: ProfitabilityIntelligence;

  if (canViewFinancials) {
    const totalCogs = currentSales.reduce((cSum, s) => {
      return (
        cSum +
        s.items.reduce((iSum, item) => {
          const q = Number(item.quantity) || 0;
          const bPrice =
            (item as any).buyingPrice ??
            productCatalogMap.get(item.productId || '')?.buyingPrice ??
            0;
          return iSum + bPrice * q;
        }, 0)
      );
    }, 0);

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - currentExpensesTotal;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    let previousNetProfit: number | undefined = undefined;
    let profitGrowthPct: number | null = null;

    if (hasComparison && previousRevenue !== undefined && previousExpensesTotal !== undefined) {
      const prevCogs = previousSales.reduce((cSum, s) => {
        return (
          cSum +
          s.items.reduce((iSum, item) => {
            const q = Number(item.quantity) || 0;
            const bPrice =
              (item as any).buyingPrice ??
              productCatalogMap.get(item.productId || '')?.buyingPrice ??
              0;
            return iSum + bPrice * q;
          }, 0)
        );
      }, 0);

      const prevGross = previousRevenue - prevCogs;
      previousNetProfit = prevGross - previousExpensesTotal;

      if (previousNetProfit !== 0) {
        profitGrowthPct = ((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100;
      } else if (netProfit !== 0) {
        profitGrowthPct = 100;
      } else {
        profitGrowthPct = 0;
      }
    }

    profitabilityIntelligence = {
      isRestricted: false,
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      grossMargin: Math.round(grossMargin * 10) / 10,
      operatingExpenses: currentExpensesTotal,
      netProfit,
      netMargin: Math.round(netMargin * 10) / 10,
      previousNetProfit,
      profitGrowthPct,
    };
  } else {
    profitabilityIntelligence = {
      isRestricted: true,
      revenue: totalRevenue,
    };
  }

  // Expense categories breakdown
  const expenseCatMap = new Map<string, number>();
  const expenseMethodMap = new Map<string, number>();

  for (const e of currentExpenses) {
    const cat = e.category || 'General Expense';
    const method = e.paymentMethod || 'Cash';
    const amt = Number(e.amount) || 0;

    expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + amt);
    expenseMethodMap.set(method, (expenseMethodMap.get(method) || 0) + amt);
  }

  const expenseCategoryBreakdown = [...expenseCatMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage:
        currentExpensesTotal > 0 ? Math.round((amount / currentExpensesTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expensePaymentBreakdown = [...expenseMethodMap.entries()]
    .map(([method, amount]) => ({
      method,
      amount,
      percentage:
        currentExpensesTotal > 0 ? Math.round((amount / currentExpensesTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  let expenseGrowthPct: number | null = null;
  if (hasComparison && previousExpensesTotal !== undefined) {
    if (previousExpensesTotal > 0) {
      expenseGrowthPct =
        ((currentExpensesTotal - previousExpensesTotal) / previousExpensesTotal) * 100;
    } else if (currentExpensesTotal > 0) {
      expenseGrowthPct = 100;
    } else {
      expenseGrowthPct = 0;
    }
  }

  const expenseIntelligence: ExpenseIntelligence = {
    totalExpenses: currentExpensesTotal,
    expenseCount: currentExpenses.length,
    previousTotalExpenses: previousExpensesTotal,
    expenseGrowthPct,
    highestExpenseCategory:
      expenseCategoryBreakdown.length > 0
        ? {
            category: expenseCategoryBreakdown[0].category,
            amount: expenseCategoryBreakdown[0].amount,
          }
        : undefined,
    categoryBreakdown: expenseCategoryBreakdown,
    paymentMethodBreakdown: expensePaymentBreakdown,
  };

  // -------------------------------------------------------------------------
  // 10. BUSINESS GROWTH SIGNALS (DETERMINISTIC RULES)
  // -------------------------------------------------------------------------
  const growthSignals: BusinessGrowthSignal[] = [];

  // Signal: Revenue Growth
  if (hasComparison && revenueGrowthPct !== null && revenueGrowthPct >= 15 && totalRevenue >= 50) {
    growthSignals.push({
      id: 'sig-rev-growth',
      signalType: 'revenue_growth',
      severity: 'positive',
      title: 'Strong Sales Momentum',
      reason: `Revenue expanded by ${revenueGrowthPct.toFixed(1)}% compared to ${previousRange?.label || 'previous period'}`,
      supportingMetric: `+GH₵ ${revenueGrowthDelta.toFixed(2)}`,
      dateRange: label,
      recommendedAction: 'Keep your top-selling products in stock and maintain customer engagement.',
    });
  }

  // Signal: Revenue Decline
  if (
    hasComparison &&
    revenueGrowthPct !== null &&
    revenueGrowthPct <= -15 &&
    (previousRevenue ?? 0) >= 50
  ) {
    growthSignals.push({
      id: 'sig-rev-decline',
      signalType: 'revenue_decline',
      severity: 'critical',
      title: 'Revenue Contraction Alert',
      reason: `Revenue decreased by ${Math.abs(revenueGrowthPct).toFixed(1)}% compared to ${previousRange?.label || 'previous period'}`,
      supportingMetric: `-GH₵ ${Math.abs(revenueGrowthDelta).toFixed(2)}`,
      dateRange: label,
      recommendedAction: 'Audit top product sales volume and contact your key clients.',
    });
  }

  // Signal: Stock Risk on Fast Movers
  if (lowStockFastMovers.length > 0) {
    const topNames = lowStockFastMovers
      .slice(0, 3)
      .map((p) => p.productName)
      .join(', ');
    growthSignals.push({
      id: 'sig-stock-risk',
      signalType: 'stock_risk',
      severity: 'critical',
      title: `${lowStockFastMovers.length} Fast-Moving Product${lowStockFastMovers.length > 1 ? 's' : ''} at Reorder Threshold`,
      reason: 'Key products with steady customer demand have reached or breached their minimum stock level.',
      supportingMetric: topNames,
      dateRange: label,
      recommendedAction: 'Issue purchase orders or restock from suppliers immediately to avoid stock-outs.',
      actionLink: '/products',
    });
  }

  // Signal: Product Opportunity
  if (fastestMovingProducts.length > 0 && fastestMovingProducts[0].velocity >= 1) {
    const topItem = fastestMovingProducts[0];
    growthSignals.push({
      id: 'sig-prod-opportunity',
      signalType: 'product_opportunity',
      severity: 'positive',
      title: `High Velocity: ${topItem.productName}`,
      reason: `Strongest sales turnover averaging ${topItem.velocity.toFixed(1)} units sold daily.`,
      supportingMetric: `${topItem.unitsSold} units (GH₵ ${topItem.revenueGenerated.toFixed(2)})`,
      dateRange: label,
      recommendedAction: 'Ensure healthy supplier replenishment and feature prominently at checkout.',
      actionLink: '/products',
    });
  }

  // Signal: Inactive High-Value Customers
  if (inactiveValuableCustomers.length > 0) {
    const topInactive = inactiveValuableCustomers[0];
    growthSignals.push({
      id: 'sig-customer-risk',
      signalType: 'customer_retention_risk',
      severity: 'warning',
      title: `${inactiveValuableCustomers.length} Valuable Client${inactiveValuableCustomers.length > 1 ? 's' : ''} Inactive (30+ Days)`,
      reason: 'Previously frequent or high-spending clients have not made any purchases recently.',
      supportingMetric: `${topInactive.name} (CLV GH₵ ${topInactive.clv.toFixed(2)})`,
      dateRange: label,
      recommendedAction: 'Reach out via phone or WhatsApp with a friendly check-in or loyalty incentive.',
      actionLink: '/customers',
    });
  }

  // Signal: Outstanding Debt Risk
  const totalOutstandingDebt = allCustomers.reduce(
    (sum, c) => sum + (Number(c.currentDebt ?? (c as any).debtBalance ?? (c as any).balance) || 0),
    0
  );
  if (totalOutstandingDebt >= 300) {
    growthSignals.push({
      id: 'sig-credit-risk',
      signalType: 'credit_risk',
      severity: 'warning',
      title: 'Customer Credit Exposure',
      reason: `Outstanding receivables owed to your business stand at GH₵ ${totalOutstandingDebt.toFixed(2)}.`,
      supportingMetric: `GH₵ ${totalOutstandingDebt.toFixed(2)} Total Debt`,
      dateRange: label,
      recommendedAction: 'Review the debtors ledger and initiate structured repayment collection.',
      actionLink: '/debtors',
    });
  }

  // Signal: Expense Pressure
  if (canViewFinancials && totalRevenue > 0 && currentExpensesTotal > 0) {
    const expRatio = (currentExpensesTotal / totalRevenue) * 100;
    if (expRatio >= 35) {
      growthSignals.push({
        id: 'sig-expense-pressure',
        signalType: 'expense_pressure',
        severity: 'warning',
        title: 'Elevated Expense Ratio',
        reason: `Operating expenses represent ${expRatio.toFixed(1)}% of sales revenue for this period.`,
        supportingMetric: `GH₵ ${currentExpensesTotal.toFixed(2)} expenses`,
        dateRange: label,
        recommendedAction: 'Review non-essential overheads and recurring operational expenditures.',
        actionLink: '/expenses',
      });
    }
  }

  // Signal: Margin Compression
  if (
    canViewFinancials &&
    hasComparison &&
    revenueGrowthPct !== null &&
    revenueGrowthPct >= 0 &&
    profitabilityIntelligence.profitGrowthPct !== null &&
    profitabilityIntelligence.profitGrowthPct !== undefined &&
    profitabilityIntelligence.profitGrowthPct <= -10
  ) {
    growthSignals.push({
      id: 'sig-profit-pressure',
      signalType: 'profit_pressure',
      severity: 'warning',
      title: 'Gross Margin Compression',
      reason: 'Sales revenue remained steady or grew, but net profits dipped due to higher costs or expenses.',
      supportingMetric: `${profitabilityIntelligence.profitGrowthPct.toFixed(1)}% profit delta`,
      dateRange: label,
      recommendedAction: 'Evaluate supplier buying prices and ensure markup percentages remain profitable.',
    });
  }

  // -------------------------------------------------------------------------
  // 11. MANAGEMENT ACTION RECOMMENDATIONS (ADVISORY ONLY)
  // -------------------------------------------------------------------------
  const recommendations: ManagementActionRecommendation[] = [];

  // Restock Recommendation
  if (lowStockFastMovers.length > 0) {
    const target = lowStockFastMovers[0];
    recommendations.push({
      id: 'rec-restock-top',
      category: 'restock',
      title: `Reorder Stock: ${target.productName}`,
      description: `Stock level is down to ${target.stockCurrentlyAvailable} units (${target.velocity.toFixed(1)} units/day velocity). Estimated coverage: ${target.stockCoverageDays ?? 0} day(s).`,
      impact: 'high',
      urgency: 'immediate',
      actionLabel: 'Go to Products',
      actionLink: '/products',
    });
  }

  // Customer Retention Recommendation
  if (inactiveValuableCustomers.length > 0) {
    const client = inactiveValuableCustomers[0];
    recommendations.push({
      id: 'rec-client-retention',
      category: 'customer_retention',
      title: `Follow Up: ${client.name}`,
      description: `Client spent GH₵ ${client.clv.toFixed(2)} over ${client.totalOrders} purchases but has not visited in ${client.daysSinceLastPurchase} days.`,
      impact: 'high',
      urgency: 'soon',
      actionLabel: 'View Customers',
      actionLink: '/customers',
    });
  }

  // Credit Collection Recommendation
  if (totalOutstandingDebt >= 200) {
    const debtorsCount = allCustomers.filter((c) => (Number(c.currentDebt ?? (c as any).debtBalance ?? (c as any).balance) || 0) > 0).length;
    recommendations.push({
      id: 'rec-debt-collection',
      category: 'credit_collection',
      title: 'Accelerate Outstanding Receivables',
      description: `You have GH₵ ${totalOutstandingDebt.toFixed(2)} owed across ${debtorsCount} customer(s). Prompt follow-up preserves working capital.`,
      impact: 'high',
      urgency: 'soon',
      actionLabel: 'Open Debtors Ledger',
      actionLink: '/debtors',
    });
  }

  // Promotion / Focus Recommendation
  if (fastestMovingProducts.length > 0) {
    const p = fastestMovingProducts[0];
    recommendations.push({
      id: 'rec-promo-fast-mover',
      category: 'promotion',
      title: `Promote Top Performer: ${p.productName}`,
      description: `Has generated GH₵ ${p.revenueGenerated.toFixed(2)} across ${p.unitsSold} units. Bundle or cross-sell with complementary items.`,
      impact: 'medium',
      urgency: 'optional',
      actionLabel: 'View Catalog',
      actionLink: '/products',
    });
  }

  // Expense Control Recommendation
  if (expenseCategoryBreakdown.length > 0 && currentExpensesTotal > 100) {
    const topExp = expenseCategoryBreakdown[0];
    recommendations.push({
      id: 'rec-expense-control',
      category: 'expense_control',
      title: `Review Overhead: ${topExp.category}`,
      description: `${topExp.category} accounted for ${topExp.percentage}% (GH₵ ${topExp.amount.toFixed(2)}) of your recorded operational expenses.`,
      impact: 'medium',
      urgency: 'optional',
      actionLabel: 'View Expenses',
      actionLink: '/expenses',
    });
  }

  // Pricing / Margin Recommendation (if authorized)
  if (canViewFinancials && allProductsPerformance.length > 0) {
    const thinMarginItems = allProductsPerformance.filter(
      (p) => p.unitsSold >= 3 && (p.grossMargin ?? 100) < 12
    );
    if (thinMarginItems.length > 0) {
      const target = thinMarginItems[0];
      recommendations.push({
        id: 'rec-pricing-margin',
        category: 'pricing_margin',
        title: `Protect Margins: ${target.productName}`,
        description: `Current gross margin is ${(target.grossMargin ?? 0).toFixed(1)}%. Review buying costs or adjust selling price to protect profitability.`,
        impact: 'medium',
        urgency: 'soon',
        actionLabel: 'Review Pricing',
        actionLink: '/products',
      });
    }
  }

  // -------------------------------------------------------------------------
  // 12. BUSINESS HEALTH SUMMARY (7 DETERMINISTIC INDICATORS)
  // -------------------------------------------------------------------------
  // 1. Sales Health
  let salesScore = 75;
  let salesStatus: BusinessHealthIndicator['status'] = 'Normal';
  let salesInsight = 'Sales volume is stable.';
  if (hasComparison && revenueGrowthPct !== null) {
    if (revenueGrowthPct >= 10) {
      salesScore = 95;
      salesStatus = 'Strong';
      salesInsight = `Revenue is up +${revenueGrowthPct.toFixed(1)}% vs previous period.`;
    } else if (revenueGrowthPct <= -15) {
      salesScore = 40;
      salesStatus = 'Needs Attention';
      salesInsight = `Revenue declined by ${revenueGrowthPct.toFixed(1)}% vs previous period.`;
    } else {
      salesScore = 75;
      salesStatus = 'Normal';
      salesInsight = 'Revenue trend is within normal operating variance.';
    }
  }

  // 2. Customer Health
  let custScore = 75;
  let custStatus: BusinessHealthIndicator['status'] = 'Normal';
  let custInsight = 'Customer transactions proceeding normally.';
  if (inactiveValuableCustomers.length >= 3) {
    custScore = 50;
    custStatus = 'Needs Attention';
    custInsight = `${inactiveValuableCustomers.length} top clients inactive over 30 days.`;
  } else if (returningCustomerRatePct >= 30 && activeCustomersCount >= 3) {
    custScore = 90;
    custStatus = 'Strong';
    custInsight = `Healthy ${returningCustomerRatePct.toFixed(0)}% repeat customer return rate.`;
  }

  // 3. Inventory Health
  let invScore = 85;
  let invStatus: BusinessHealthIndicator['status'] = 'Normal';
  let invInsight = 'Stock levels are balanced.';
  if (lowStockFastMovers.length >= 3) {
    invScore = 35;
    invStatus = 'Critical';
    invInsight = `${lowStockFastMovers.length} fast-selling products at stock-out risk.`;
  } else if (lowStockFastMovers.length > 0) {
    invScore = 60;
    invStatus = 'Caution';
    invInsight = `${lowStockFastMovers.length} popular item(s) near reorder threshold.`;
  } else {
    invScore = 95;
    invStatus = 'Healthy';
    invInsight = 'All fast-moving products have adequate stock coverage.';
  }

  // 4. Cash Flow Health
  const cashMomoRev = paymentIntelligence
    .filter((p) => p.method.toLowerCase().includes('cash') || p.method.toLowerCase().includes('momo') || p.method.toLowerCase().includes('mobile'))
    .reduce((sum, p) => sum + p.amount, 0);
  const immediateRealizationPct = totalRevenue > 0 ? (cashMomoRev / totalRevenue) * 100 : 100;
  let cashScore = 80;
  let cashStatus: BusinessHealthIndicator['status'] = 'Normal';
  let cashInsight = 'Immediate payment collection is satisfactory.';
  if (immediateRealizationPct >= 80) {
    cashScore = 95;
    cashStatus = 'Strong';
    cashInsight = `${immediateRealizationPct.toFixed(0)}% of sales realized via immediate Cash or MoMo.`;
  } else if (immediateRealizationPct < 55) {
    cashScore = 50;
    cashStatus = 'Needs Attention';
    cashInsight = 'High proportion of non-cash or delayed payment exposure.';
  }

  // 5. Debt Health
  let debtScore = 85;
  let debtStatus: BusinessHealthIndicator['status'] = 'Healthy';
  let debtInsight = 'Receivables exposure is low and manageable.';
  if (totalOutstandingDebt >= 1000) {
    debtScore = 40;
    debtStatus = 'High Risk';
    debtInsight = `Significant customer debt (GH₵ ${totalOutstandingDebt.toFixed(2)}) requires collection.`;
  } else if (totalOutstandingDebt >= 300) {
    debtScore = 65;
    debtStatus = 'Needs Attention';
    debtInsight = `GH₵ ${totalOutstandingDebt.toFixed(2)} in outstanding receivables.`;
  }

  // 6. Expense Health
  let expScore = 85;
  let expStatus: BusinessHealthIndicator['status'] = 'Controlled';
  let expInsight = 'Operating overhead is within standard parameters.';
  if (totalRevenue > 0 && currentExpensesTotal > 0) {
    const expRatio = (currentExpensesTotal / totalRevenue) * 100;
    if (expRatio >= 40) {
      expScore = 45;
      expStatus = 'High';
      expInsight = `Expenses represent ${expRatio.toFixed(0)}% of sales revenue.`;
    } else if (expRatio >= 25) {
      expScore = 70;
      expStatus = 'Elevated';
      expInsight = `Expenses represent ${expRatio.toFixed(0)}% of sales revenue.`;
    }
  }

  // 7. Profitability Health
  let profScore = 80;
  let profStatus: BusinessHealthIndicator['status'] = 'Normal';
  let profInsight = 'Profitability metrics are healthy.';
  if (canViewFinancials) {
    const netMargin = profitabilityIntelligence.netMargin ?? 0;
    if (netMargin >= 25) {
      profScore = 95;
      profStatus = 'Healthy';
      profInsight = `Strong net margin of ${netMargin.toFixed(1)}%.`;
    } else if (netMargin >= 10) {
      profScore = 75;
      profStatus = 'Normal';
      profInsight = `Net margin stands at ${netMargin.toFixed(1)}%.`;
    } else if (netMargin > 0) {
      profScore = 55;
      profStatus = 'Needs Attention';
      profInsight = `Tight net margin of ${netMargin.toFixed(1)}%.`;
    } else {
      profScore = 30;
      profStatus = 'Critical';
      profInsight = 'Operating at a net financial deficit for this period.';
    }
  } else {
    profScore = 75;
    profStatus = 'Restricted';
    profInsight = 'Access restricted by staff permission rules.';
  }

  // Weighted overall composite score (0 to 100)
  const weightedScore = Math.round(
    salesScore * 0.25 +
    invScore * 0.20 +
    custScore * 0.15 +
    cashScore * 0.15 +
    debtScore * 0.10 +
    expScore * 0.05 +
    profScore * 0.10
  );

  let overallHealth: BusinessHealthSummary['overallHealth'] = 'Good';
  let summaryText = 'Business performance is sound with stable trading conditions.';

  if (weightedScore >= 85) {
    overallHealth = 'Excellent';
    summaryText = 'Outstanding operational metrics across sales velocity, customer health, and stock management.';
  } else if (weightedScore >= 65) {
    overallHealth = 'Good';
    summaryText = 'Solid business health with minor areas identified for proactive attention.';
  } else if (weightedScore >= 50) {
    overallHealth = 'Attention Needed';
    summaryText = 'Key operational signals require management review, particularly around stock or collections.';
  } else {
    overallHealth = 'Critical';
    summaryText = 'Urgent operational attention required across stock levels, revenue, or receivables.';
  }

  const healthSummary: BusinessHealthSummary = {
    overallHealth,
    score: weightedScore,
    summary: summaryText,
    indicators: {
      salesHealth: {
        name: 'Sales Momentum',
        status: salesStatus,
        color: salesScore >= 80 ? 'emerald' : salesScore >= 60 ? 'blue' : salesScore >= 45 ? 'amber' : 'rose',
        score: salesScore,
        metric: `GH₵ ${totalRevenue.toFixed(2)} (${transactionCount} sales)`,
        insight: salesInsight,
      },
      customerHealth: {
        name: 'Customer Retention',
        status: custStatus,
        color: custScore >= 80 ? 'emerald' : custScore >= 60 ? 'blue' : custScore >= 45 ? 'amber' : 'rose',
        score: custScore,
        metric: `${activeCustomersCount} Active (${returningCustomerRatePct.toFixed(0)}% repeat)`,
        insight: custInsight,
      },
      inventoryHealth: {
        name: 'Stock Coverage',
        status: invStatus,
        color: invScore >= 80 ? 'emerald' : invScore >= 60 ? 'amber' : 'rose',
        score: invScore,
        metric: `${lowStockFastMovers.length} fast movers at risk`,
        insight: invInsight,
      },
      cashFlowHealth: {
        name: 'Cash Realization',
        status: cashStatus,
        color: cashScore >= 80 ? 'emerald' : cashScore >= 60 ? 'amber' : 'rose',
        score: cashScore,
        metric: `${immediateRealizationPct.toFixed(0)}% Cash / MoMo`,
        insight: cashInsight,
      },
      debtHealth: {
        name: 'Receivables Risk',
        status: debtStatus,
        color: debtScore >= 80 ? 'emerald' : debtScore >= 60 ? 'amber' : 'rose',
        score: debtScore,
        metric: `GH₵ ${totalOutstandingDebt.toFixed(2)} debt`,
        insight: debtInsight,
      },
      expenseHealth: {
        name: 'Operating Overheads',
        status: expStatus,
        color: expScore >= 80 ? 'emerald' : expScore >= 60 ? 'amber' : 'rose',
        score: expScore,
        metric: `GH₵ ${currentExpensesTotal.toFixed(2)} (${currentExpenses.length} entries)`,
        insight: expInsight,
      },
      profitabilityHealth: {
        name: 'Profit Margins',
        status: profStatus,
        color: profScore >= 80 ? 'emerald' : profScore >= 60 ? 'amber' : profScore === 75 ? 'slate' : 'rose',
        score: profScore,
        metric: canViewFinancials ? `GH₵ ${(profitabilityIntelligence.netProfit ?? 0).toFixed(2)} Net` : 'Restricted',
        insight: profInsight,
      },
    },
  };

  return {
    dateRange: {
      range: normalizedRange,
      startDate: fromDate,
      endDate: toDate,
      label,
      hasComparison,
      comparisonRange: previousRange,
      comparisonReason: reasonIfUnavailable,
    },
    salesIntelligence,
    topRevenueProducts,
    topProfitProducts,
    topUnitsProducts,
    fastestMovingProducts,
    decliningProducts,
    slowMovingProducts,
    neverSoldProducts,
    lowStockFastMovers,
    allProductsPerformance,
    categoryIntelligence,
    strongestCategory,
    fastestGrowingCategory,
    decliningCategory,
    inventoryPressureCategory,
    customerIntelligence,
    timeIntelligence,
    paymentIntelligence,
    paymentMethodIntelligence: paymentIntelligence,
    staffIntelligence,
    profitabilityIntelligence,
    expenseIntelligence,
    growthSignals,
    recommendations,
    healthSummary,
  };
}
