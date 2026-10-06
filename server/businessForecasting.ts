/**
 * Server-Side Business Forecasting, Planning & Proactive Operations Engine (Stage 4K)
 * Evidence-based, transparent, deterministic decision support using Africa/Accra business time.
 * Strictly non-autonomous: clearly distinguishes historical facts, current trends,
 * calculated estimates, scenarios, and important limitations.
 */

import { db } from './db.js';
import {
  getAccraToday,
  getAccraDateString,
  resolveAccraDateRangeWithComparison,
} from './date.js';
import type {
  BusinessForecastPayload,
  ForecastMetadata,
  SalesForecastOutlook,
  ProductDemandPlanningItem,
  InventoryDemandPlanningOutlook,
  CategoryPlanningItem,
  CustomerPlanningItem,
  CustomerPlanningOutlook,
  ReceivablesPlanningOutlook,
  ExpensePlanningOutlook,
  ProfitabilityPlanningOutlook,
  BusinessPlanningScenario,
  ForecastingConfidence,
  TrendDirection,
  DemandTrend,
  RestockAttentionLevel,
} from '../src/types/index.js';

function addDaysToAccraDate(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function computeBusinessForecast(
  businessId: string,
  range?: string,
  startDate?: string,
  endDate?: string,
  canViewFinancials: boolean = false,
  scenarioSalesPct?: number,
  scenarioExpenseDelta?: number
): BusinessForecastPayload {
  // 1. Resolve Ghana (Africa/Accra) date ranges with comparative period
  const dateRange = resolveAccraDateRangeWithComparison(range, startDate, endDate);
  const { fromDate, toDate, label, hasComparison, previousRange } = dateRange;
  const todayAccra = getAccraToday();

  // Calculate day span of current period
  const fDate = new Date(fromDate);
  const tDate = new Date(toDate);
  const rawDiffDays = Math.round((tDate.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const periodDays = Math.max(1, isNaN(rawDiffDays) ? 1 : rawDiffDays);

  // 2. Authoritative Tenant Entities
  const allSales = db.getSales(businessId);
  const allProducts = db.getProducts(businessId);
  const allCustomers = db.getCustomers(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allPayments = db.getCustomerPayments(businessId);
  const rawData = db.getRaw();
  const businessObj = rawData.businesses?.find((b) => b.id === businessId);
  const currency = businessObj?.currency || 'GH₵';

  // 3. Filter Active Sales for Current and Previous Periods
  const currentSales = allSales.filter((s) => {
    if (s.status === 'Cancelled') return false;
    const sDate = getAccraDateString(s.createdAt);
    if (fromDate && sDate < fromDate) return false;
    if (toDate && sDate > toDate) return false;
    return true;
  });

  const previousSales = hasComparison && previousRange
    ? allSales.filter((s) => {
        if (s.status === 'Cancelled') return false;
        const sDate = getAccraDateString(s.createdAt);
        if (previousRange.fromDate && sDate < previousRange.fromDate) return false;
        if (previousRange.toDate && sDate > previousRange.toDate) return false;
        return true;
      })
    : [];

  // Filter Active Expenses
  const currentExpenses = allExpenses.filter((e) => {
    const eDate = getAccraDateString(e.date || e.createdAt);
    if (fromDate && eDate < fromDate) return false;
    if (toDate && eDate > toDate) return false;
    return true;
  });

  const previousExpenses = hasComparison && previousRange
    ? allExpenses.filter((e) => {
        const eDate = getAccraDateString(e.date || e.createdAt);
        if (previousRange.fromDate && eDate < previousRange.fromDate) return false;
        if (previousRange.toDate && eDate > previousRange.toDate) return false;
        return true;
      })
    : [];

  // Unique active sales days
  const activeDaysSet = new Set<string>();
  currentSales.forEach((s) => activeDaysSet.add(getAccraDateString(s.createdAt)));
  const activeDaysCount = activeDaysSet.size;

  // 4. Data Points & Confidence Assessment
  let confidence: ForecastingConfidence = 'INSUFFICIENT DATA';
  if (currentSales.length === 0 || activeDaysCount === 0) {
    confidence = 'INSUFFICIENT DATA';
  } else if (currentSales.length < 3 || periodDays < 2) {
    confidence = 'LOW';
  } else if (currentSales.length >= 10 && activeDaysCount >= 3) {
    confidence = 'HIGH';
  } else {
    confidence = 'MODERATE';
  }

  const metadata: ForecastMetadata = {
    periodAnalyzed: {
      fromDate,
      toDate,
      label,
      daysCount: periodDays,
    },
    dataPointsUsed: {
      salesCount: currentSales.length,
      activeDaysCount,
      productsCount: allProducts.length,
      customersCount: allCustomers.length,
      expensesCount: currentExpenses.length,
    },
    calculationMethod:
      'Deterministic historical velocity extrapolation across comparable business day horizons with Africa/Accra calendar alignment.',
    confidenceIndicator: confidence,
    importantLimitations: [
      'Projections are calculated strictly from internal recorded sales velocity and do not incorporate external macroeconomic demand shifts.',
      'Unrecorded or off-ledger transactions cannot be reflected in mathematical run-rates.',
      'All projections and run-rates are calculated estimates intended for operational planning and do not guarantee future revenue or profits.',
    ],
    disclaimer:
      'Calculated estimates are provided solely as decision support. They do not represent guaranteed outcomes.',
  };

  // 5. SALES TREND FORECASTING & REVENUE RUN-RATE
  const currentPeriodRevenue = currentSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const previousPeriodRevenue = previousSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const revenueGrowthPct =
    previousPeriodRevenue > 0
      ? Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 1000) / 10
      : null;

  const totalUnitsSold = currentSales.reduce(
    (sum, s) => sum + (s.items || []).reduce((iSum: number, it: any) => iSum + (Number(it.quantity) || 0), 0),
    0
  );
  const prevUnitsSold = previousSales.reduce(
    (sum, s) => sum + (s.items || []).reduce((iSum: number, it: any) => iSum + (Number(it.quantity) || 0), 0),
    0
  );

  const averageDailyRevenue = Math.round((currentPeriodRevenue / periodDays) * 100) / 100;
  const averageTransactionValue =
    currentSales.length > 0 ? Math.round((currentPeriodRevenue / currentSales.length) * 100) / 100 : 0;
  const transactionVelocity = Math.round((currentSales.length / periodDays) * 100) / 100;
  const unitVelocity = Math.round((totalUnitsSold / periodDays) * 100) / 100;

  // Run-rates (labeled ESTIMATE)
  const dailyRunRate = averageDailyRevenue;
  const weeklyRunRate = Math.round(averageDailyRevenue * 7 * 100) / 100;
  const monthlyRunRate = Math.round(averageDailyRevenue * 30 * 100) / 100;

  // Projected comparable period
  let trendDirection: TrendDirection = 'INSUFFICIENT DATA';
  if (currentSales.length === 0) {
    trendDirection = 'INSUFFICIENT DATA';
  } else if (!hasComparison || previousPeriodRevenue === 0) {
    trendDirection = 'STABLE';
  } else if (revenueGrowthPct !== null && revenueGrowthPct > 5) {
    trendDirection = 'GROWING';
  } else if (revenueGrowthPct !== null && revenueGrowthPct < -5) {
    trendDirection = 'DECLINING';
  } else {
    trendDirection = 'STABLE';
  }

  const projectedRevenue =
    confidence === 'INSUFFICIENT DATA'
      ? null
      : Math.round(averageDailyRevenue * periodDays * 100) / 100;
  const projectedTransactions =
    confidence === 'INSUFFICIENT DATA'
      ? null
      : Math.round(transactionVelocity * periodDays);
  const projectedUnits =
    confidence === 'INSUFFICIENT DATA'
      ? null
      : Math.round(unitVelocity * periodDays);
  const projectedAverageTransactionValue =
    confidence === 'INSUFFICIENT DATA' ? null : averageTransactionValue;

  const salesOutlook: SalesForecastOutlook = {
    currentPeriodRevenue,
    previousPeriodRevenue,
    revenueGrowthPct,
    averageDailyRevenue,
    averageTransactionValue,
    transactionVelocity,
    unitVelocity,
    dailyRunRate,
    weeklyRunRate,
    monthlyRunRate,
    runRateLabel: 'ESTIMATE',
    projectedRevenue,
    projectedTransactions,
    projectedUnits,
    projectedAverageTransactionValue,
    trendDirection,
    isEstimate: true,
    confidence,
  };

  // 6. INVENTORY DEMAND PLANNING & RESTOCK PLANNING (Stage 4G direct consumption)
  const productPlanningItems: ProductDemandPlanningItem[] = [];
  let criticalCount = 0;
  let restockSoonCount = 0;
  let monitorCount = 0;
  let adequateCount = 0;
  let noDemandCount = 0;

  for (const prod of allProducts) {
    // Current period units
    let curUnits = 0;
    for (const s of currentSales) {
      for (const it of s.items || []) {
        if (String(it.productId) === String(prod.id)) {
          curUnits += Number(it.quantity) || 0;
        }
      }
    }

    // Previous period units
    let prevUnits = 0;
    for (const s of previousSales) {
      for (const it of s.items || []) {
        if (String(it.productId) === String(prod.id)) {
          prevUnits += Number(it.quantity) || 0;
        }
      }
    }

    const avgDailyUnits = Math.round((curUnits / periodDays) * 100) / 100;
    const salesVel = avgDailyUnits;

    // Days of stock coverage: Current Stock / Average Daily Units Sold
    // If average daily units sold is zero: NO CURRENT DEMAND. Do not divide by zero.
    let coverageDays: number | null = null;
    let coverageLabel = 'NO CURRENT DEMAND';
    let estDepletionDate: string | null = null;

    if (avgDailyUnits > 0) {
      coverageDays = Math.round((prod.quantity / avgDailyUnits) * 10) / 10;
      coverageLabel = `${coverageDays} days`;
      estDepletionDate = addDaysToAccraDate(todayAccra, Math.ceil(coverageDays));
    }

    // Restock attention level
    let restockAttention: RestockAttentionLevel = 'Adequate';
    if (prod.quantity <= 0) {
      restockAttention = 'Critical';
      criticalCount++;
    } else if (coverageDays !== null && coverageDays <= 3) {
      restockAttention = 'Critical';
      criticalCount++;
    } else if (coverageDays !== null && (coverageDays <= 7 || prod.quantity <= prod.minStockLevel)) {
      restockAttention = 'Restock Soon';
      restockSoonCount++;
    } else if (coverageDays !== null && coverageDays <= 14) {
      restockAttention = 'Monitor';
      monitorCount++;
    } else if (avgDailyUnits === 0) {
      if (prod.quantity <= prod.minStockLevel && prod.minStockLevel > 0) {
        restockAttention = 'Monitor';
        monitorCount++;
      } else {
        restockAttention = 'No Current Demand';
        noDemandCount++;
      }
    } else {
      restockAttention = 'Adequate';
      adequateCount++;
    }

    // Demand trend
    let demandTrend: DemandTrend = 'INSUFFICIENT_DATA';
    let demandTrendExplanation = 'Insufficient historical comparative periods to establish demand trend.';
    let unitChangePct: number | null = null;

    if (curUnits === 0 && prevUnits === 0) {
      demandTrend = 'NO_DEMAND';
      demandTrendExplanation = 'No recorded sales across the analyzed periods.';
    } else if (!hasComparison) {
      demandTrend = curUnits > 0 ? 'STABLE' : 'NO_DEMAND';
      demandTrendExplanation =
        curUnits > 0
          ? `Active demand established with ${curUnits} units sold in the current period.`
          : 'No sales recorded in current period.';
    } else if (prevUnits === 0 && curUnits > 0) {
      demandTrend = 'INCREASING';
      demandTrendExplanation = `Sales are increasing based on the selected historical periods (${curUnits} units sold vs 0 previously).`;
    } else if (prevUnits > 0) {
      unitChangePct = Math.round(((curUnits - prevUnits) / prevUnits) * 1000) / 10;
      if (unitChangePct > 5) {
        demandTrend = 'INCREASING';
        demandTrendExplanation = `Sales are increasing based on the selected historical periods (${curUnits} units vs ${prevUnits} units previously, +${unitChangePct}%).`;
      } else if (unitChangePct < -5) {
        demandTrend = 'DECLINING';
        demandTrendExplanation = `Sales are declining based on the selected historical periods (${curUnits} units vs ${prevUnits} units previously, ${unitChangePct}%).`;
      } else {
        demandTrend = 'STABLE';
        demandTrendExplanation = `Sales velocity is stable based on the selected historical periods (${curUnits} units vs ${prevUnits} units previously).`;
      }
    }

    // Recommended reorder buffer (e.g. 14 days coverage buffer)
    const targetBufferDays = 14;
    const neededUnits = Math.ceil(avgDailyUnits * targetBufferDays + prod.minStockLevel);
    const recommendedReorderUnits = Math.max(0, neededUnits - prod.quantity);

    // Financial privacy protection for unauthorized staff
    const itemBuyingPrice = canViewFinancials ? prod.buyingPrice : undefined;
    const estRestockCost =
      canViewFinancials && prod.buyingPrice ? Math.round(recommendedReorderUnits * prod.buyingPrice * 100) / 100 : undefined;

    productPlanningItems.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || '',
      category: prod.category || 'General',
      currentStock: prod.quantity,
      minStockLevel: prod.minStockLevel,
      historicalUnitsSold: curUnits,
      previousUnitsSold: prevUnits,
      unitChangePct,
      averageDailyUnitsSold: avgDailyUnits,
      salesVelocity: salesVel,
      daysOfStockCoverage: coverageDays,
      daysOfStockCoverageLabel: coverageLabel,
      estimatedDepletionDate: estDepletionDate,
      restockAttentionLevel: restockAttention,
      demandTrend,
      demandTrendExplanation,
      recommendedReorderUnits,
      supplierId: prod.supplierId,
      supplierName: prod.supplierName,
      buyingPrice: itemBuyingPrice,
      estimatedRestockCost: estRestockCost,
    });
  }

  // Sort: Critical first, then Restock Soon, then Monitor, then highest sales velocity
  productPlanningItems.sort((a, b) => {
    const priorityWeight: Record<RestockAttentionLevel, number> = {
      Critical: 5,
      'Restock Soon': 4,
      Monitor: 3,
      Adequate: 2,
      'No Current Demand': 1,
      'Insufficient Data': 0,
    };
    const diff = (priorityWeight[b.restockAttentionLevel] || 0) - (priorityWeight[a.restockAttentionLevel] || 0);
    if (diff !== 0) return diff;
    return b.historicalUnitsSold - a.historicalUnitsSold;
  });

  const inventoryOutlook: InventoryDemandPlanningOutlook = {
    totalProductsAssessed: allProducts.length,
    criticalCount,
    restockSoonCount,
    monitorCount,
    adequateCount,
    noDemandCount,
    products: productPlanningItems,
  };

  // 7. CATEGORY PLANNING (Consuming Stage 4J categories)
  const categoryMap = new Map<
    string,
    {
      currentRevenue: number;
      previousRevenue: number;
      currentUnits: number;
      previousUnits: number;
    }
  >();

  // Process current sales items
  for (const s of currentSales) {
    for (const it of s.items || []) {
      const prod = allProducts.find((p) => p.id === it.productId);
      const cat = prod?.category || (it as any).category || 'General';
      const existing = categoryMap.get(cat) || {
        currentRevenue: 0,
        previousRevenue: 0,
        currentUnits: 0,
        previousUnits: 0,
      };
      existing.currentRevenue += Number(it.total || it.quantity * (it.sellingPrice || 0)) || 0;
      existing.currentUnits += Number(it.quantity) || 0;
      categoryMap.set(cat, existing);
    }
  }

  // Process previous sales items
  for (const s of previousSales) {
    for (const it of s.items || []) {
      const prod = allProducts.find((p) => p.id === it.productId);
      const cat = prod?.category || (it as any).category || 'General';
      const existing = categoryMap.get(cat) || {
        currentRevenue: 0,
        previousRevenue: 0,
        currentUnits: 0,
        previousUnits: 0,
      };
      existing.previousRevenue += Number(it.total || it.quantity * (it.sellingPrice || 0)) || 0;
      existing.previousUnits += Number(it.quantity) || 0;
      categoryMap.set(cat, existing);
    }
  }

  const categoryOutlook: CategoryPlanningItem[] = Array.from(categoryMap.entries()).map(([category, stats]) => {
    const revGrowth =
      stats.previousRevenue > 0
        ? Math.round(((stats.currentRevenue - stats.previousRevenue) / stats.previousRevenue) * 1000) / 10
        : null;
    const unitGrowth =
      stats.previousUnits > 0
        ? Math.round(((stats.currentUnits - stats.previousUnits) / stats.previousUnits) * 1000) / 10
        : null;
    const contribution =
      currentPeriodRevenue > 0
        ? Math.round((stats.currentRevenue / currentPeriodRevenue) * 1000) / 10
        : 0;

    let dir: TrendDirection = 'STABLE';
    if (!hasComparison || stats.previousRevenue === 0) {
      dir = stats.currentRevenue > 0 ? 'STABLE' : 'INSUFFICIENT DATA';
    } else if (revGrowth !== null && revGrowth > 5) {
      dir = 'GROWING';
    } else if (revGrowth !== null && revGrowth < -5) {
      dir = 'DECLINING';
    }

    let operationalAttention = 'Category performing within standard baseline velocity.';
    if (contribution >= 40) {
      operationalAttention = 'High revenue concentration (>40% of total). Maintain priority supplier relationships to avoid stock interruptions.';
    } else if (dir === 'DECLINING') {
      operationalAttention = 'Category velocity declined compared with prior period. Review pricing and inventory mix.';
    } else if (dir === 'GROWING') {
      operationalAttention = 'Category velocity expanding. Ensure replenishment schedules stay ahead of demand.';
    }

    return {
      category,
      currentRevenue: Math.round(stats.currentRevenue * 100) / 100,
      previousRevenue: Math.round(stats.previousRevenue * 100) / 100,
      revenueGrowthPct: revGrowth,
      currentUnits: stats.currentUnits,
      previousUnits: stats.previousUnits,
      unitGrowthPct: unitGrowth,
      contributionPct: contribution,
      trendDirection: dir,
      operationalAttention,
    };
  });

  categoryOutlook.sort((a, b) => b.currentRevenue - a.currentRevenue);

  // 8. CUSTOMER PLANNING (Consuming Stage 4H customer CRM metrics)
  const customerPlanningItems: CustomerPlanningItem[] = [];
  let inactiveValuableCount = 0;
  let decliningFrequencyCount = 0;
  let debtorsNeedingAttentionCount = 0;

  for (const cust of allCustomers) {
    const custSales = allSales.filter((s) => s.customerId === cust.id && s.status !== 'Cancelled');
    const custCurrentSales = currentSales.filter((s) => s.customerId === cust.id);
    const custPrevSales = previousSales.filter((s) => s.customerId === cust.id);

    const totalSpend = custSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const periodSpend = custCurrentSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // Days since last purchase
    let daysSinceLast = 999;
    if (custSales.length > 0) {
      const sortedSales = [...custSales].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastDate = getAccraDateString(sortedSales[0].createdAt);
      const tNow = new Date(todayAccra).getTime();
      const tLast = new Date(lastDate).getTime();
      daysSinceLast = Math.max(0, Math.round((tNow - tLast) / (1000 * 60 * 60 * 24)));
    }

    let trend: CustomerPlanningItem['trend'] = 'ACTIVE';
    let statusDescription = 'Customer has consistent ongoing transaction activity.';

    const isHighValue = totalSpend >= 500 || (totalSpend > 0 && totalSpend >= currentPeriodRevenue * 0.1);
    const currentDebt = Number(cust.currentDebt) || 0;

    if (currentDebt > 0) {
      debtorsNeedingAttentionCount++;
    }

    if (custCurrentSales.length === 0 && custSales.length > 0) {
      if (isHighValue || daysSinceLast > 30) {
        trend = 'AT_RISK_INACTIVE';
        statusDescription = `Valuable customer activity has declined compared with the selected historical period (${daysSinceLast} days since last purchase).`;
        inactiveValuableCount++;
      }
    } else if (hasComparison && custPrevSales.length > custCurrentSales.length && custCurrentSales.length > 0) {
      trend = 'DECLINING_FREQUENCY';
      statusDescription = `Customer transaction frequency declined compared with the prior period (${custCurrentSales.length} vs ${custPrevSales.length} visits).`;
      decliningFrequencyCount++;
    } else if (custCurrentSales.length > 0 && custSales.length === custCurrentSales.length) {
      trend = 'NEW';
      statusDescription = 'First recorded transaction occurred within the current business period.';
    } else if (custCurrentSales.length > 0) {
      trend = 'RETURNING';
      statusDescription = 'Returning customer actively transacting in current period.';
    }

    customerPlanningItems.push({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      segment: cust.segment || (isHighValue ? 'VIP' : 'Regular'),
      totalHistoricalSpend: Math.round(totalSpend * 100) / 100,
      periodSpend: Math.round(periodSpend * 100) / 100,
      daysSinceLastPurchase: daysSinceLast,
      trend,
      statusDescription,
      outstandingDebt: currentDebt,
    });
  }

  // Sort customer planning items: At Risk Inactive first, then Declining, then highest spend
  customerPlanningItems.sort((a, b) => {
    if (a.trend === 'AT_RISK_INACTIVE' && b.trend !== 'AT_RISK_INACTIVE') return -1;
    if (b.trend === 'AT_RISK_INACTIVE' && a.trend !== 'AT_RISK_INACTIVE') return 1;
    return b.totalHistoricalSpend - a.totalHistoricalSpend;
  });

  const customerOutlook: CustomerPlanningOutlook = {
    totalCustomers: allCustomers.length,
    inactiveValuableCount,
    decliningFrequencyCount,
    debtorsNeedingAttentionCount,
    customers: customerPlanningItems,
  };

  // 9. CREDIT & RECEIVABLES PLANNING (Stage 4D / 4F direct consumption)
  const totalOutstandingReceivables = allCustomers.reduce((sum, c) => sum + (Number(c.currentDebt) || 0), 0);
  let overdueReceivables = 0;
  const topDebtors: ReceivablesPlanningOutlook['topDebtors'] = [];

  // Inspect sales with unpaid balances
  const allUnpaidSales = allSales.filter(
    (s) => s.status !== 'Cancelled' && (Number(s.balance) > 0 || s.paymentMethod === 'Credit')
  );

  for (const s of allUnpaidSales) {
    if (s.dueDate && s.dueDate < todayAccra) {
      overdueReceivables += Number(s.balance) || 0;
    }
  }

  for (const cust of allCustomers) {
    const debt = Number(cust.currentDebt) || 0;
    if (debt > 0) {
      // Find oldest unpaid sale due date
      const custUnpaid = allUnpaidSales.filter((s) => s.customerId === cust.id);
      let oldestDueDate: string | undefined;
      let maxDaysOverdue = 0;

      for (const s of custUnpaid) {
        if (s.dueDate) {
          if (!oldestDueDate || s.dueDate < oldestDueDate) oldestDueDate = s.dueDate;
          if (s.dueDate < todayAccra) {
            const diff = Math.round(
              (new Date(todayAccra).getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diff > maxDaysOverdue) maxDaysOverdue = diff;
          }
        }
      }

      topDebtors.push({
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        amountOwed: debt,
        daysOverdue: maxDaysOverdue,
        dueDate: oldestDueDate,
      });
    }
  }

  topDebtors.sort((a, b) => b.amountOwed - a.amountOwed);

  // Period debt repayments and new credit extended
  const currentPayments = allPayments.filter((p) => {
    const pDate = getAccraDateString(p.date || p.createdAt);
    if (fromDate && pDate < fromDate) return false;
    if (toDate && pDate > toDate) return false;
    return true;
  });
  const periodRepayments = currentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const periodCreditExtended = currentSales
    .filter((s) => (Number(s.balance) || 0) > 0 || s.paymentMethod === 'Credit')
    .reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  let collectionAttentionSummary = 'Outstanding receivables are within manageable bounds.';
  if (overdueReceivables > 0) {
    collectionAttentionSummary = `GH₵ ${overdueReceivables.toFixed(2)} in receivables is overdue. Follow up with debtors to accelerate working capital recovery.`;
  } else if (totalOutstandingReceivables > 0) {
    collectionAttentionSummary = `Total outstanding receivables stand at GH₵ ${totalOutstandingReceivables.toFixed(2)}. Monitor upcoming due dates closely.`;
  }

  const receivablesOutlook: ReceivablesPlanningOutlook = {
    totalOutstandingReceivables: Math.round(totalOutstandingReceivables * 100) / 100,
    overdueReceivables: Math.round(overdueReceivables * 100) / 100,
    debtorCount: topDebtors.length,
    periodRepayments: Math.round(periodRepayments * 100) / 100,
    periodCreditExtended: Math.round(periodCreditExtended * 100) / 100,
    collectionAttentionSummary,
    topDebtors,
  };

  // 10. EXPENSE PLANNING (Stage 4E / 4F direct consumption)
  const currentExpensesTotal = currentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const previousExpensesTotal = previousExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const expenseGrowthPct =
    previousExpensesTotal > 0
      ? Math.round(((currentExpensesTotal - previousExpensesTotal) / previousExpensesTotal) * 1000) / 10
      : null;

  // Breakdown by category
  const expenseCatMap = new Map<string, { current: number; previous: number }>();
  for (const e of currentExpenses) {
    const cat = e.category || 'General';
    const entry = expenseCatMap.get(cat) || { current: 0, previous: 0 };
    entry.current += Number(e.amount) || 0;
    expenseCatMap.set(cat, entry);
  }
  for (const e of previousExpenses) {
    const cat = e.category || 'General';
    const entry = expenseCatMap.get(cat) || { current: 0, previous: 0 };
    entry.previous += Number(e.amount) || 0;
    expenseCatMap.set(cat, entry);
  }

  const trendingUpCategories: ExpensePlanningOutlook['trendingUpCategories'] = [];
  const majorExpenseCategories: ExpensePlanningOutlook['majorExpenseCategories'] = [];

  for (const [category, val] of expenseCatMap.entries()) {
    const sharePct =
      currentExpensesTotal > 0 ? Math.round((val.current / currentExpensesTotal) * 1000) / 10 : 0;
    majorExpenseCategories.push({
      category,
      amount: Math.round(val.current * 100) / 100,
      sharePct,
    });

    if (val.current > val.previous && val.previous > 0) {
      const growth = Math.round(((val.current - val.previous) / val.previous) * 1000) / 10;
      if (growth > 10) {
        trendingUpCategories.push({
          category,
          currentAmount: Math.round(val.current * 100) / 100,
          previousAmount: Math.round(val.previous * 100) / 100,
          growthPct: growth,
          message: `Expense category "${category}" increased compared with the previous period (+${growth}%).`,
        });
      }
    }
  }

  majorExpenseCategories.sort((a, b) => b.amount - a.amount);
  trendingUpCategories.sort((a, b) => b.growthPct - a.growthPct);

  const expenseOutlook: ExpensePlanningOutlook = {
    currentExpenses: Math.round(currentExpensesTotal * 100) / 100,
    previousExpenses: Math.round(previousExpensesTotal * 100) / 100,
    expenseGrowthPct,
    trendingUpCategories,
    majorExpenseCategories,
  };

  // 11. PROFITABILITY PLANNING (Authoritative Server-Side Privacy Protection)
  let profitabilityOutlook: ProfitabilityPlanningOutlook = {
    isRestricted: true,
  };

  // Authoritative COGS and Profit Calculation
  let currentCOGS = 0;
  for (const s of currentSales) {
    for (const it of s.items || []) {
      const prod = allProducts.find((p) => p.id === it.productId);
      const buyingPrice = Number(prod?.buyingPrice || it.buyingPrice || 0);
      currentCOGS += buyingPrice * (Number(it.quantity) || 0);
    }
  }

  const currentGrossProfit = currentPeriodRevenue - currentCOGS;
  const currentNetProfit = currentGrossProfit - currentExpensesTotal;
  const currentGrossMargin =
    currentPeriodRevenue > 0 ? Math.round((currentGrossProfit / currentPeriodRevenue) * 1000) / 10 : 0;

  if (canViewFinancials) {
    // Extrapolate projected profitability for upcoming comparable period
    const cogsRatio = currentPeriodRevenue > 0 ? currentCOGS / currentPeriodRevenue : 0;
    const projRev = projectedRevenue ?? currentPeriodRevenue;
    const projectedCOGS = Math.round(projRev * cogsRatio * 100) / 100;
    const projectedGrossProfit = Math.round((projRev - projectedCOGS) * 100) / 100;
    const projectedExpenses = Math.round((currentExpensesTotal / periodDays) * periodDays * 100) / 100;
    const projectedNetProfit = Math.round((projectedGrossProfit - projectedExpenses) * 100) / 100;
    const projectedGrossMargin = projRev > 0 ? Math.round((projectedGrossProfit / projRev) * 1000) / 10 : 0;

    let marginTrend: ProfitabilityPlanningOutlook['marginTrend'] = 'STABLE';
    if (confidence === 'INSUFFICIENT DATA') {
      marginTrend = 'INSUFFICIENT DATA';
    } else if (projectedGrossMargin > currentGrossMargin + 1) {
      marginTrend = 'EXPANDING';
    } else if (projectedGrossMargin < currentGrossMargin - 1) {
      marginTrend = 'CONTRACTING';
    }

    profitabilityOutlook = {
      isRestricted: false,
      currentRevenue: Math.round(currentPeriodRevenue * 100) / 100,
      projectedRevenue: projectedRevenue ?? undefined,
      currentCOGS: Math.round(currentCOGS * 100) / 100,
      projectedCOGS,
      currentGrossProfit: Math.round(currentGrossProfit * 100) / 100,
      projectedGrossProfit,
      currentExpenses: Math.round(currentExpensesTotal * 100) / 100,
      projectedExpenses,
      currentNetProfit: Math.round(currentNetProfit * 100) / 100,
      projectedNetProfit,
      currentGrossMargin,
      projectedGrossMargin,
      marginTrend,
      notes: 'Profitability projections are calculated using historical COGS proportions and observed operating expenses.',
    };
  }

  // 12. BUSINESS PLANNING SCENARIOS (Section 15)
  const baseRevenue = projectedRevenue !== null && projectedRevenue > 0 ? projectedRevenue : currentPeriodRevenue;
  const cogsRatio = currentPeriodRevenue > 0 ? currentCOGS / currentPeriodRevenue : 0;
  const baseExpenses = currentExpensesTotal;

  const buildScenario = (
    name: string,
    type: BusinessPlanningScenario['scenarioType'],
    desc: string,
    salesAdjPct: number,
    expDelta: number
  ): BusinessPlanningScenario => {
    const estRev = Math.max(0, Math.round(baseRevenue * (1 + salesAdjPct / 100) * 100) / 100);
    const estCogs = Math.round(estRev * cogsRatio * 100) / 100;
    const estGrossProf = Math.round((estRev - estCogs) * 100) / 100;
    const estExp = Math.max(0, Math.round((baseExpenses + expDelta) * 100) / 100);
    const estNetProf = Math.round((estGrossProf - estExp) * 100) / 100;
    const estMargin = estRev > 0 ? Math.round((estGrossProf / estRev) * 1000) / 10 : 0;

    return {
      scenarioName: name,
      scenarioType: type,
      description: desc,
      isScenario: true,
      assumptions: [
        `Sales volume adjusts by ${salesAdjPct >= 0 ? `+${salesAdjPct}%` : `${salesAdjPct}%`} from current trend baseline.`,
        `Operating expenses adjust by ${expDelta >= 0 ? `+GH₵ ${expDelta}` : `-GH₵ ${Math.abs(expDelta)}`}.`,
        'COGS scales proportionally with sales volume while product unit cost structures remain constant.',
      ],
      salesAdjustmentPct: salesAdjPct,
      expenseDeltaGHS: expDelta,
      estimatedRevenue: estRev,
      estimatedCOGS: canViewFinancials ? estCogs : undefined,
      estimatedGrossProfit: canViewFinancials ? estGrossProf : undefined,
      estimatedExpenses: estExp,
      estimatedNetProfit: canViewFinancials ? estNetProf : undefined,
      estimatedGrossMargin: canViewFinancials ? estMargin : undefined,
      disclaimer: 'Mathematical planning scenario based on static cost assumptions. Not an assured forecast.',
    };
  };

  const scenarios: BusinessPlanningScenario[] = [
    buildScenario(
      'Current Trend Baseline',
      'current_trend',
      'Extrapolates existing average daily sales velocity and observed operating expenses without changes.',
      0,
      0
    ),
    buildScenario(
      'Moderate Growth (+10%)',
      'improved_sales',
      'Simulates business outcomes if sales increase by 10% through promotional initiatives or expanded traffic.',
      scenarioSalesPct && scenarioSalesPct > 0 ? scenarioSalesPct : 10,
      0
    ),
    buildScenario(
      'Conservative Contraction (-10%)',
      'reduced_sales',
      'Simulates impact of a 10% reduction in sales velocity to evaluate operational resilience.',
      scenarioSalesPct && scenarioSalesPct < 0 ? scenarioSalesPct : -10,
      0
    ),
    buildScenario(
      'Expense Adjustment Scenario',
      'expense_change',
      'Simulates net profit impact if operating overhead changes while sales volume remains constant.',
      0,
      scenarioExpenseDelta !== undefined ? scenarioExpenseDelta : 500
    ),
  ];

  // If custom parameters were provided, add custom scenario
  if (scenarioSalesPct !== undefined || scenarioExpenseDelta !== undefined) {
    const customSales = scenarioSalesPct || 0;
    const customExp = scenarioExpenseDelta || 0;
    scenarios.push(
      buildScenario(
        'Custom User Scenario',
        'custom',
        `User-defined simulation with ${customSales >= 0 ? `+${customSales}%` : `${customSales}%`} sales and ${customExp >= 0 ? `+GH₵ ${customExp}` : `-GH₵ ${Math.abs(customExp)}`} expense adjustment.`,
        customSales,
        customExp
      )
    );
  }

  // 13. PROACTIVE OPERATIONAL ALERTS (Section 17 & 18)
  // Check and trigger evidence-based alerts with server deduplication
  const proactiveAlertsCount = triggerProactiveOperationalAlerts(businessId, {
    criticalCount,
    revenueGrowthPct,
    overdueReceivables,
    trendingUpCategories,
    topCriticalProduct: productPlanningItems.find((p) => p.restockAttentionLevel === 'Critical'),
  });

  return {
    businessId,
    currency,
    metadata,
    salesOutlook,
    inventoryOutlook,
    categoryOutlook,
    customerOutlook,
    receivablesOutlook,
    expenseOutlook,
    profitabilityOutlook,
    scenarios,
    proactiveAlertsCount,
  };
}

/**
 * Isolated Product Demand Planning (for GET /api/products/planning)
 */
export function computeProductDemandPlanning(
  businessId: string,
  range?: string,
  startDate?: string,
  endDate?: string,
  canViewFinancials: boolean = false
): ProductDemandPlanningItem[] {
  const forecast = computeBusinessForecast(businessId, range, startDate, endDate, canViewFinancials);
  return forecast.inventoryOutlook.products;
}

/**
 * Evidence-based Proactive Alerts Generator (Section 17 & 18)
 * Leverages existing db.createNotification with strict deduplication
 */
function triggerProactiveOperationalAlerts(
  businessId: string,
  context: {
    criticalCount: number;
    revenueGrowthPct: number | null;
    overdueReceivables: number;
    trendingUpCategories: ExpensePlanningOutlook['trendingUpCategories'];
    topCriticalProduct?: ProductDemandPlanningItem;
  }
): number {
  let createdCount = 0;

  // 1. Critical Restock Alert
  if (context.topCriticalProduct && context.topCriticalProduct.currentStock <= 3) {
    db.createNotification({
      businessId,
      type: 'proactive_alert',
      title: `Restock Attention: ${context.topCriticalProduct.productName}`,
      message: `Product "${context.topCriticalProduct.productName}" has only ${context.topCriticalProduct.currentStock} units remaining (Estimated coverage: ${context.topCriticalProduct.daysOfStockCoverageLabel}).`,
      link: '/products',
    });
    createdCount++;
  }

  // 2. Sales Contraction Alert
  if (context.revenueGrowthPct !== null && context.revenueGrowthPct <= -20) {
    db.createNotification({
      businessId,
      type: 'proactive_alert',
      title: 'Sales Velocity Alert: Significant Decline',
      message: `Sales revenue is down by ${Math.abs(context.revenueGrowthPct)}% compared with the previous comparable period.`,
      link: '/dashboard',
    });
    createdCount++;
  }

  // 3. Overdue Receivables Alert
  if (context.overdueReceivables >= 500) {
    db.createNotification({
      businessId,
      type: 'proactive_alert',
      title: 'Receivables Alert: Overdue Exposure',
      message: `Overdue customer debt currently totals GH₵ ${context.overdueReceivables.toFixed(2)}. Consider initiating collection follow-ups.`,
      link: '/debtors',
    });
    createdCount++;
  }

  // 4. Rising Expense Category Alert
  if (context.trendingUpCategories.length > 0 && context.trendingUpCategories[0].growthPct >= 25) {
    const topExp = context.trendingUpCategories[0];
    db.createNotification({
      businessId,
      type: 'proactive_alert',
      title: `Expense Alert: ${topExp.category}`,
      message: `Operating expenses in category "${topExp.category}" rose by ${topExp.growthPct}% compared with the prior period.`,
      link: '/expenses',
    });
    createdCount++;
  }

  return createdCount;
}
