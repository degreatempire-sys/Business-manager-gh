// @ts-nocheck
import { db, DBUser } from './db.js';
import {
  getAccraToday,
  getAccraDateString,
  resolveAccraDateRangeWithComparison,
} from './date.js';
import { canUserViewProfit, calculateBusinessUsage } from './featureAccess.js';
import { computeBusinessGrowthIntelligence } from './growthIntelligence.js';
import { computeBusinessForecast } from './businessForecasting.js';
import { getOperationsCenterSummary } from './businessWorkflows.js';
import {
  computeLocationSummary,
  validateUserLocationAccess,
} from './locations.js';
import { getGovernanceSummary, getSystemHealth } from './governance.js';
import { runIntegrationDiagnostics } from './integrations.js';
import { calculateSaaSRevenueMetrics } from './billingOperations.js';
import type {
  ExecutiveCommandCenterPayload,
  ExecutiveKPIItem,
  ExecutiveAttentionItem,
  ExecutiveOpportunityItem,
  ExecutiveRiskItem,
  ExecutiveAnomalyItem,
  ExecutiveHealthDimension,
  ExecutiveExecutiveSummary,
  ExecutivePreferences,
  Sale,
  Expense,
  Product,
  Customer,
} from '../src/types/index.js';

export interface ComputeExecutiveCommandCenterParams {
  businessId: string;
  user: DBUser;
  range?: string;
  startDate?: string;
  endDate?: string;
  locationId?: string;
}

export function computeExecutiveCommandCenter(
  params: ComputeExecutiveCommandCenterParams
): ExecutiveCommandCenterPayload {
  const { businessId, user, range = 'this_month', startDate, endDate, locationId } = params;

  const business = db.getBusinessById(businessId);
  const businessName = business?.name || 'Business Manager GH';
  const currency = business?.currency || 'GH₵';

  // 1. Permission & Location Scoping
  const canViewFinancials = canUserViewProfit(user);

  // Validate location access if provided or if staff is restricted
  let effectiveLocationId = locationId;
  let targetLocationName: string | undefined = undefined;

  if (user.role === 'staff' && !user.allLocations && user.assignedLocationIds && user.assignedLocationIds.length > 0) {
    if (effectiveLocationId) {
      const accessCheck = validateUserLocationAccess(user, effectiveLocationId, businessId);
      if (!accessCheck.allowed) {
        throw new Error(accessCheck.reason || 'Unauthorized location access.');
      }
    } else {
      // Default to first assigned location if staff has no global access
      effectiveLocationId = user.assignedLocationIds[0];
    }
  } else if (effectiveLocationId) {
    const loc = db.getLocationById(effectiveLocationId, businessId);
    if (!loc) {
      throw new Error('Location not found or does not belong to this business.');
    }
    targetLocationName = loc.name;
  }

  if (effectiveLocationId && !targetLocationName) {
    const loc = db.getLocationById(effectiveLocationId, businessId);
    targetLocationName = loc?.name;
  }

  // 2. Date Range & Comparison Resolution (Accra Timezone)
  const dateResolution = resolveAccraDateRangeWithComparison({
    range,
    startDate,
    endDate,
  });

  const {
    current: { startDate: currentStart, endDate: currentEnd },
    comparison,
    hasComparison,
    comparisonReason,
  } = dateResolution;

  // 3. Fetch Authoritative Datasets
  let allSales: Sale[] = db.getSales(businessId);
  let allExpenses: Expense[] = db.getExpenses(businessId);
  let allProducts: Product[] = db.getProducts(businessId);
  const allCustomers: Customer[] = db.getCustomers(businessId);
  const allLocations = db.getLocations(businessId);
  const allUsers = db.getUsersByBusiness(businessId);

  // Filter by location if specified
  if (effectiveLocationId) {
    allSales = allSales.filter((s) => s.locationId === effectiveLocationId);
    allExpenses = allExpenses.filter((e) => (e as any).locationId === effectiveLocationId);
    allProducts = allProducts.filter((p) => !p.locationId || p.locationId === effectiveLocationId);
  }

  // Slice Current & Previous periods
  const currentSales = allSales.filter((s) => {
    const d = getAccraDateString(s.createdAt);
    return d >= currentStart && d <= currentEnd && s.status !== 'Cancelled';
  });

  const previousSales = hasComparison && comparison
    ? allSales.filter((s) => {
        const d = getAccraDateString(s.createdAt);
        return d >= comparison.startDate && d <= comparison.endDate && s.status !== 'Cancelled';
      })
    : [];

  const currentExpenses = allExpenses.filter((e) => {
    const d = e.date ? e.date.slice(0, 10) : getAccraDateString(e.createdAt);
    return d >= currentStart && d <= currentEnd;
  });

  const previousExpenses = hasComparison && comparison
    ? allExpenses.filter((e) => {
        const d = e.date ? e.date.slice(0, 10) : getAccraDateString(e.createdAt);
        return d >= comparison.startDate && d <= comparison.endDate;
      })
    : [];

  // 4. Financial Performance Calculations (Authoritative Formulas)
  const currentRevenue = currentSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const previousRevenue = previousSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

  const currentCogs = currentSales.reduce((acc, s) => {
    if (s.items && s.items.length > 0) {
      return acc + s.items.reduce((sum, item) => sum + (Number(item.buyingPrice) || 0) * (Number(item.quantity) || 0), 0);
    }
    return acc;
  }, 0);
  const previousCogs = previousSales.reduce((acc, s) => {
    if (s.items && s.items.length > 0) {
      return acc + s.items.reduce((sum, item) => sum + (Number(item.buyingPrice) || 0) * (Number(item.quantity) || 0), 0);
    }
    return acc;
  }, 0);

  const currentGrossProfit = currentRevenue - currentCogs;
  const previousGrossProfit = previousRevenue - previousCogs;

  const currentOperatingExpenses = currentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const previousOperatingExpenses = previousExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const currentNetProfit = currentGrossProfit - currentOperatingExpenses;
  const previousNetProfit = previousGrossProfit - previousOperatingExpenses;

  const grossMarginPercent = currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : 0;
  const netMarginPercent = currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : 0;

  const currentTransactions = currentSales.length;
  const previousTransactions = previousSales.length;

  const currentUnitsSold = currentSales.reduce((acc, s) => {
    return acc + (s.items ? s.items.reduce((sub, it) => sub + (Number(it.quantity) || 0), 0) : 0);
  }, 0);
  const previousUnitsSold = previousSales.reduce((acc, s) => {
    return acc + (s.items ? s.items.reduce((sub, it) => sub + (Number(it.quantity) || 0), 0) : 0);
  }, 0);

  const currentAtv = currentTransactions > 0 ? currentRevenue / currentTransactions : 0;
  const previousAtv = previousTransactions > 0 ? previousRevenue / previousTransactions : 0;

  const inventoryValuation = allProducts.reduce((acc, p) => {
    return acc + (Number(p.quantity) || 0) * (Number(p.buyingPrice) || 0);
  }, 0);

  // Growth / Comparison helpers
  const computeChange = (curr: number, prev: number) => {
    if (!hasComparison || prev === 0) return null;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const revenueChangePercent = computeChange(currentRevenue, previousRevenue);
  const grossProfitChangePercent = computeChange(currentGrossProfit, previousGrossProfit);
  const netProfitChangePercent = computeChange(currentNetProfit, previousNetProfit);
  const expensesChangePercent = computeChange(currentOperatingExpenses, previousOperatingExpenses);
  const transactionsChangePercent = computeChange(currentTransactions, previousTransactions);
  const unitsSoldChangePercent = computeChange(currentUnitsSold, previousUnitsSold);
  const atvChangePercent = computeChange(currentAtv, previousAtv);

  // 5. Existing Subsystems Orchestration (No duplication!)
  const growthIntel = computeBusinessGrowthIntelligence(
    businessId,
    range,
    startDate,
    endDate,
    canViewFinancials
  );

  const forecastData = computeBusinessForecast(
    businessId,
    range,
    startDate,
    endDate,
    canViewFinancials,
    effectiveLocationId
  );

  const opsSummary = getOperationsCenterSummary(businessId, user);
  const governanceSummary = getGovernanceSummary(businessId);
  const systemHealth = getSystemHealth(businessId);
  const integrationDiagnostics = runIntegrationDiagnostics(businessId);
  const usageSummary = calculateBusinessUsage(businessId);
  const subscription = db.getSubscription(businessId);

  // 6. Inventory Attention & Categorization
  const outOfStockItems = allProducts.filter((p) => Number(p.quantity) <= 0);
  const lowStockItems = allProducts.filter(
    (p) => Number(p.quantity) > 0 && Number(p.quantity) <= (Number(p.minStockLevel) || 5)
  );
  const inStockCount = allProducts.length - outOfStockItems.length - lowStockItems.length;

  const criticalRestockAlerts = [...outOfStockItems, ...lowStockItems].slice(0, 10).map((p) => ({
    id: p.id,
    name: p.name,
    quantity: Number(p.quantity) || 0,
    minStockLevel: Number(p.minStockLevel) || 5,
    status: Number(p.quantity) <= 0 ? 'out_of_stock' : 'low_stock',
  }));

  // 7. Customers & Debt Pulse
  const customerDebtors = allCustomers.filter((c) => (Number(c.balance) || 0) > 0);
  const totalDebtExposure = customerDebtors.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);

  // 8. Staff Performance
  const staffActivityMap = new Map<string, { staffId: string; staffName: string; count: number; rev: number }>();
  for (const s of currentSales) {
    const staffId = s.staffId || s.createdBy || 'unknown';
    const staffName = s.cashierName || 'Staff Member';
    const rec = staffActivityMap.get(staffId) || { staffId, staffName, count: 0, rev: 0 };
    rec.count += 1;
    rec.rev += Number(s.total) || 0;
    staffActivityMap.set(staffId, rec);
  }

  const staffActivityList = Array.from(staffActivityMap.values()).map((sa) => ({
    staffId: sa.staffId,
    staffName: sa.staffName,
    transactionCount: sa.count,
    revenueContribution: canViewFinancials ? sa.rev : undefined,
    salesSharePercent: canViewFinancials && currentRevenue > 0
      ? Number(((sa.rev / currentRevenue) * 100).toFixed(1))
      : undefined,
  }));

  // 9. Location Performance
  const isMultiLocation = allLocations.length > 1;
  const branchSummaries = allLocations.map((loc) => {
    const locSales = currentSales.filter((s) => s.locationId === loc.id);
    const locRevenue = locSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const locProducts = allProducts.filter((p) => !p.locationId || p.locationId === loc.id);
    const locLowStock = locProducts.filter((p) => Number(p.quantity) <= (Number(p.minStockLevel) || 5)).length;

    return {
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code || loc.name.slice(0, 3).toUpperCase(),
      salesCount: locSales.length,
      revenue: canViewFinancials ? locRevenue : undefined,
      activeProductsCount: locProducts.length,
      lowStockCount: locLowStock,
    };
  });

  // 10. KPI Scorecards with Deterministic Explanations
  const formatGHS = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0.00';
    return `${currency} ${Number(val).toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getDirection = (pct: number | null): 'up' | 'down' | 'flat' | 'insufficient_data' => {
    if (pct === null) return 'insufficient_data';
    if (pct > 0.05) return 'up';
    if (pct < -0.05) return 'down';
    return 'flat';
  };

  const getExplanation = (
    label: string,
    curr: number,
    prev: number,
    pct: number | null,
    driverText?: string
  ): string => {
    if (!hasComparison || pct === null) {
      return comparisonReason || 'Insufficient historical data for comparative explanation.';
    }
    const dir = pct > 0 ? 'increased' : pct < 0 ? 'decreased' : 'remained steady';
    const delta = Math.abs(curr - prev);
    const base = `${label} ${dir} by ${Math.abs(pct)}%`;
    if (driverText) {
      return `${base}, ${driverText}.`;
    }
    return `${base} compared to previous period (${curr >= prev ? '+' : '-'}${formatGHS(delta)}).`;
  };

  const kpiScorecards: ExecutiveKPIItem[] = [
    // 1. Revenue
    {
      key: 'revenue',
      label: 'Gross Revenue',
      category: 'financial',
      restricted: !canViewFinancials,
      value: canViewFinancials ? currentRevenue : null,
      formattedValue: canViewFinancials ? formatGHS(currentRevenue) : 'Restricted',
      hasComparison,
      previousValue: canViewFinancials && hasComparison ? previousRevenue : null,
      changePercent: canViewFinancials ? revenueChangePercent : null,
      changeDirection: canViewFinancials ? getDirection(revenueChangePercent) : 'insufficient_data',
      explanation: canViewFinancials
        ? getExplanation(
            'Revenue',
            currentRevenue,
            previousRevenue,
            revenueChangePercent,
            transactionsChangePercent !== null
              ? `primarily driven by a ${transactionsChangePercent >= 0 ? '+' : ''}${transactionsChangePercent}% shift in transaction volume`
              : undefined
          )
        : 'Financial metrics restricted. Requires financial reports permission.',
      calculationLogic: 'Sum of all completed customer sales totals in Africa/Accra business date window.',
      sourceModule: 'Sales & POS Ledger',
    },
    // 2. Gross Profit
    {
      key: 'gross_profit',
      label: 'Gross Profit',
      category: 'financial',
      restricted: !canViewFinancials,
      value: canViewFinancials ? currentGrossProfit : null,
      formattedValue: canViewFinancials ? formatGHS(currentGrossProfit) : 'Restricted',
      hasComparison,
      previousValue: canViewFinancials && hasComparison ? previousGrossProfit : null,
      changePercent: canViewFinancials ? grossProfitChangePercent : null,
      changeDirection: canViewFinancials ? getDirection(grossProfitChangePercent) : 'insufficient_data',
      explanation: canViewFinancials
        ? getExplanation(
            'Gross Profit',
            currentGrossProfit,
            previousGrossProfit,
            grossProfitChangePercent,
            `maintaining a ${grossMarginPercent.toFixed(1)}% gross margin on goods sold`
          )
        : 'Financial metrics restricted. Requires financial reports permission.',
      calculationLogic: 'Revenue minus authoritative inventory Cost of Goods Sold (buying price × quantity sold).',
      sourceModule: 'Sales & Inventory Cost Engine',
    },
    // 3. Operating Expenses
    {
      key: 'expenses',
      label: 'Operating Expenses',
      category: 'financial',
      restricted: !canViewFinancials,
      value: canViewFinancials ? currentOperatingExpenses : null,
      formattedValue: canViewFinancials ? formatGHS(currentOperatingExpenses) : 'Restricted',
      hasComparison,
      previousValue: canViewFinancials && hasComparison ? previousOperatingExpenses : null,
      changePercent: canViewFinancials ? expensesChangePercent : null,
      changeDirection: canViewFinancials ? getDirection(expensesChangePercent) : 'insufficient_data',
      explanation: canViewFinancials
        ? getExplanation(
            'Operating Expenses',
            currentOperatingExpenses,
            previousOperatingExpenses,
            expensesChangePercent
          )
        : 'Financial metrics restricted. Requires financial reports permission.',
      calculationLogic: 'Sum of recorded business operating expenses during the selected period.',
      sourceModule: 'Expense Ledger',
    },
    // 4. Net Profit
    {
      key: 'net_profit',
      label: 'Net Operating Profit',
      category: 'financial',
      restricted: !canViewFinancials,
      value: canViewFinancials ? currentNetProfit : null,
      formattedValue: canViewFinancials ? formatGHS(currentNetProfit) : 'Restricted',
      hasComparison,
      previousValue: canViewFinancials && hasComparison ? previousNetProfit : null,
      changePercent: canViewFinancials ? netProfitChangePercent : null,
      changeDirection: canViewFinancials ? getDirection(netProfitChangePercent) : 'insufficient_data',
      explanation: canViewFinancials
        ? getExplanation(
            'Net Profit',
            currentNetProfit,
            previousNetProfit,
            netProfitChangePercent,
            `delivering a net margin of ${netMarginPercent.toFixed(1)}%`
          )
        : 'Financial metrics restricted. Requires financial reports permission.',
      calculationLogic: 'Gross Profit minus Operating Expenses.',
      sourceModule: 'Financial Reports Engine',
    },
    // 5. Total Transactions
    {
      key: 'transactions',
      label: 'Sales Transactions',
      category: 'sales',
      value: currentTransactions,
      formattedValue: `${currentTransactions.toLocaleString()} orders`,
      hasComparison,
      previousValue: hasComparison ? previousTransactions : null,
      changePercent: transactionsChangePercent,
      changeDirection: getDirection(transactionsChangePercent),
      explanation: getExplanation(
        'Sales Transactions',
        currentTransactions,
        previousTransactions,
        transactionsChangePercent,
        `representing checkout volume across registers`
      ),
      calculationLogic: 'Count of completed sales receipts generated in Africa/Accra period.',
      sourceModule: 'POS Checkout System',
    },
    // 6. Units Sold
    {
      key: 'units_sold',
      label: 'Units Sold',
      category: 'sales',
      value: currentUnitsSold,
      formattedValue: `${currentUnitsSold.toLocaleString()} units`,
      hasComparison,
      previousValue: hasComparison ? previousUnitsSold : null,
      changePercent: unitsSoldChangePercent,
      changeDirection: getDirection(unitsSoldChangePercent),
      explanation: getExplanation(
        'Units Sold',
        currentUnitsSold,
        previousUnitsSold,
        unitsSoldChangePercent
      ),
      calculationLogic: 'Total physical quantity of items disbursed through completed sales.',
      sourceModule: 'Sales Item Breakdown',
    },
    // 7. Average Transaction Value (ATV)
    {
      key: 'atv',
      label: 'Average Order Value (ATV)',
      category: 'sales',
      restricted: !canViewFinancials,
      value: canViewFinancials ? currentAtv : null,
      formattedValue: canViewFinancials ? formatGHS(currentAtv) : 'Restricted',
      hasComparison,
      previousValue: canViewFinancials && hasComparison ? previousAtv : null,
      changePercent: canViewFinancials ? atvChangePercent : null,
      changeDirection: canViewFinancials ? getDirection(atvChangePercent) : 'insufficient_data',
      explanation: canViewFinancials
        ? getExplanation(
            'Average Transaction Value',
            currentAtv,
            previousAtv,
            atvChangePercent,
            `reflecting basket size and checkout value`
          )
        : 'Financial metrics restricted. Requires financial reports permission.',
      calculationLogic: 'Gross Revenue divided by Total Transactions.',
      sourceModule: 'Sales Analytics',
    },
    // 8. Inventory Stockout Count
    {
      key: 'stockouts',
      label: 'Out of Stock Items',
      category: 'inventory',
      value: outOfStockItems.length,
      formattedValue: `${outOfStockItems.length} SKUs`,
      hasComparison: false,
      explanation:
        outOfStockItems.length > 0
          ? `${outOfStockItems.length} product(s) currently at zero stock, preventing active customer sales.`
          : 'Zero stockouts recorded. Product availability is optimal.',
      calculationLogic: 'Count of catalog products with quantity <= 0.',
      sourceModule: 'Product Inventory Ledger',
    },
    // 9. Low Stock Count
    {
      key: 'low_stock',
      label: 'Low Stock Reorder Alerts',
      category: 'inventory',
      value: lowStockItems.length,
      formattedValue: `${lowStockItems.length} SKUs`,
      hasComparison: false,
      explanation:
        lowStockItems.length > 0
          ? `${lowStockItems.length} product(s) are at or below reorder threshold and require stock-in.`
          : 'All stocked items maintain healthy buffers above minimum thresholds.',
      calculationLogic: 'Count of products with quantity > 0 and <= minStockLevel.',
      sourceModule: 'Product Inventory Ledger',
    },
    // 10. Outstanding Customer Debt
    {
      key: 'debt',
      label: 'Outstanding Customer Debt',
      category: 'customer',
      restricted: !canViewFinancials,
      value: canViewFinancials ? totalDebtExposure : null,
      formattedValue: canViewFinancials ? formatGHS(totalDebtExposure) : `${customerDebtors.length} debtors`,
      hasComparison: false,
      explanation:
        customerDebtors.length > 0
          ? `${customerDebtors.length} debtor customer(s) carry unpaid balances requiring credit follow-up.`
          : 'No outstanding customer debts recorded on debtor ledger.',
      calculationLogic: 'Sum of unpaid balances across customer accounts.',
      sourceModule: 'Debtors & Credit Ledger',
    },
  ];

  // 11. Business Health Snapshot (Transparent 7 Dimensions)
  const healthDimensions: ExecutiveHealthDimension[] = [
    // Dimension 1: Financial
    {
      dimension: 'Financial',
      label: 'Financial Viability & Margins',
      status: !canViewFinancials
        ? 'GOOD'
        : netMarginPercent >= 15 && currentNetProfit > 0
        ? 'OPTIMAL'
        : currentNetProfit > 0
        ? 'GOOD'
        : currentGrossProfit > 0
        ? 'ATTENTION'
        : 'CRITICAL',
      methodology:
        'Evaluates net margin percentage, operational cost coverage, and gross profitability based on authoritative sales and expenses.',
      underlyingMetrics: [
        {
          metricName: 'Net Profit Margin',
          currentValue: canViewFinancials ? `${netMarginPercent.toFixed(1)}%` : 'Restricted',
          benchmark: '>= 15.0%',
          status: !canViewFinancials ? 'good' : netMarginPercent >= 15 ? 'good' : netMarginPercent > 0 ? 'warning' : 'alert',
          details: canViewFinancials
            ? `Net margin is ${netMarginPercent.toFixed(1)}% (${formatGHS(currentNetProfit)} net income on ${formatGHS(currentRevenue)} revenue).`
            : 'Permission restricted.',
        },
        {
          metricName: 'Gross Profit Margin',
          currentValue: canViewFinancials ? `${grossMarginPercent.toFixed(1)}%` : 'Restricted',
          benchmark: '>= 25.0%',
          status: !canViewFinancials ? 'good' : grossMarginPercent >= 25 ? 'good' : grossMarginPercent > 0 ? 'warning' : 'alert',
          details: canViewFinancials
            ? `Markup over inventory buying cost is ${grossMarginPercent.toFixed(1)}%.`
            : 'Permission restricted.',
        },
        {
          metricName: 'Operating Expense Ratio',
          currentValue: canViewFinancials && currentRevenue > 0
            ? `${((currentOperatingExpenses / currentRevenue) * 100).toFixed(1)}%`
            : canViewFinancials ? '0.0%' : 'Restricted',
          benchmark: '<= 30.0%',
          status: !canViewFinancials ? 'good' : (currentOperatingExpenses / (currentRevenue || 1)) <= 0.3 ? 'good' : 'warning',
          details: canViewFinancials
            ? `Expenses represent ${currentRevenue > 0 ? ((currentOperatingExpenses / currentRevenue) * 100).toFixed(1) : 0}% of gross sales.`
            : 'Permission restricted.',
        },
      ],
    },
    // Dimension 2: Sales
    {
      dimension: 'Sales',
      label: 'Sales Velocity & Consistency',
      status: currentTransactions === 0
        ? 'ATTENTION'
        : transactionsChangePercent !== null && transactionsChangePercent < -20
        ? 'ATTENTION'
        : 'OPTIMAL',
      methodology: 'Measures transaction frequency, order volumes, and comparative period trends.',
      underlyingMetrics: [
        {
          metricName: 'Period Transactions',
          currentValue: `${currentTransactions} sales`,
          benchmark: '>= 1 daily',
          status: currentTransactions > 0 ? 'good' : 'alert',
          details: `${currentTransactions} checkout transactions processed in selected date window.`,
        },
        {
          metricName: 'Sales Volume Change',
          currentValue: transactionsChangePercent !== null ? `${transactionsChangePercent > 0 ? '+' : ''}${transactionsChangePercent}%` : 'N/A',
          benchmark: '>= 0%',
          status: transactionsChangePercent === null || transactionsChangePercent >= 0 ? 'good' : 'warning',
          details: transactionsChangePercent !== null
            ? `Transaction velocity changed by ${transactionsChangePercent}% vs prior period.`
            : 'No comparative prior period data.',
        },
      ],
    },
    // Dimension 3: Inventory
    {
      dimension: 'Inventory',
      label: 'Catalog & Stock Availability',
      status: outOfStockItems.length > 5
        ? 'CRITICAL'
        : outOfStockItems.length > 0 || lowStockItems.length > 5
        ? 'ATTENTION'
        : 'OPTIMAL',
      methodology: 'Monitors out-of-stock ratios and catalog replenishment thresholds.',
      underlyingMetrics: [
        {
          metricName: 'Stockout Ratio',
          currentValue: `${outOfStockItems.length} / ${allProducts.length} items (${allProducts.length > 0 ? ((outOfStockItems.length / allProducts.length) * 100).toFixed(1) : 0}%)`,
          benchmark: '0%',
          status: outOfStockItems.length === 0 ? 'good' : outOfStockItems.length < 3 ? 'warning' : 'alert',
          details: `${outOfStockItems.length} product(s) are completely out of stock.`,
        },
        {
          metricName: 'Reorder Buffer Items',
          currentValue: `${lowStockItems.length} items`,
          benchmark: '< 5 items',
          status: lowStockItems.length <= 3 ? 'good' : 'warning',
          details: `${lowStockItems.length} product(s) require proactive supplier reordering.`,
        },
      ],
    },
    // Dimension 4: Customers
    {
      dimension: 'Customers',
      label: 'Customer Base & Credit Exposure',
      status: customerDebtors.length > 10 || (canViewFinancials && totalDebtExposure > currentRevenue && currentRevenue > 0)
        ? 'ATTENTION'
        : 'OPTIMAL',
      methodology: 'Analyzes debtor ratios, active client retention, and credit risk.',
      underlyingMetrics: [
        {
          metricName: 'Active Client Directory',
          currentValue: `${allCustomers.length} registered customers`,
          benchmark: 'Growing',
          status: allCustomers.length > 0 ? 'good' : 'warning',
          details: `${allCustomers.length} customer profile(s) stored on business directory.`,
        },
        {
          metricName: 'Outstanding Debt Exposure',
          currentValue: canViewFinancials ? formatGHS(totalDebtExposure) : `${customerDebtors.length} debtors`,
          benchmark: 'Controlled',
          status: customerDebtors.length === 0 ? 'good' : customerDebtors.length < 5 ? 'warning' : 'alert',
          details: `${customerDebtors.length} customer(s) with outstanding credit balances.`,
        },
      ],
    },
    // Dimension 5: Operations
    {
      dimension: 'Operations',
      label: 'Task Execution & Workflow Health',
      status: opsSummary.overdueCount > 3 || opsSummary.criticalCount > 1
        ? 'CRITICAL'
        : opsSummary.overdueCount > 0
        ? 'ATTENTION'
        : 'OPTIMAL',
      methodology: 'Monitors overdue operational workflows, due tasks, and fulfillment queues.',
      underlyingMetrics: [
        {
          metricName: 'Overdue Operational Tasks',
          currentValue: `${opsSummary.overdueCount} overdue`,
          benchmark: '0 overdue',
          status: opsSummary.overdueCount === 0 ? 'good' : opsSummary.overdueCount < 3 ? 'warning' : 'alert',
          details: `${opsSummary.overdueCount} task(s) past deadline requiring staff resolution.`,
        },
        {
          metricName: 'Critical Priority Tasks',
          currentValue: `${opsSummary.criticalCount} critical`,
          benchmark: '0 critical',
          status: opsSummary.criticalCount === 0 ? 'good' : 'alert',
          details: `${opsSummary.criticalCount} critical task(s) currently open.`,
        },
      ],
    },
    // Dimension 6: Staff
    {
      dimension: 'Staff',
      label: 'Staff Coverage & Accountability',
      status: allUsers.length > 0 ? 'OPTIMAL' : 'ATTENTION',
      methodology: 'Evaluates employee participation, attribution in POS transactions, and active duty.',
      underlyingMetrics: [
        {
          metricName: 'Active Cashiers in Period',
          currentValue: `${staffActivityList.length} active cashiers`,
          benchmark: '>= 1',
          status: staffActivityList.length > 0 ? 'good' : 'warning',
          details: `${staffActivityList.length} staff member(s) generated receipts during this period.`,
        },
      ],
    },
    // Dimension 7: Locations
    {
      dimension: 'Locations',
      label: 'Multi-Branch Readiness & Balance',
      status: isMultiLocation ? 'OPTIMAL' : 'GOOD',
      methodology: 'Checks branch health, location sales distribution, and stock coverage.',
      underlyingMetrics: [
        {
          metricName: 'Active Operating Locations',
          currentValue: `${allLocations.length} branch(es)`,
          benchmark: '>= 1',
          status: 'good',
          details: isMultiLocation
            ? `Multi-branch operations across ${allLocations.length} locations.`
            : 'Single central branch operation.',
        },
      ],
    },
  ];

  // Overall Health calculation
  const hasCritical = healthDimensions.some((d) => d.status === 'CRITICAL');
  const hasAttention = healthDimensions.some((d) => d.status === 'ATTENTION');
  const overallHealthStatus: 'OPTIMAL' | 'GOOD' | 'ATTENTION' | 'CRITICAL' = hasCritical
    ? 'CRITICAL'
    : hasAttention
    ? 'ATTENTION'
    : 'OPTIMAL';

  const overallHealthSummary =
    overallHealthStatus === 'OPTIMAL'
      ? 'All business systems operating smoothly across financial, inventory, and operational metrics.'
      : overallHealthStatus === 'ATTENTION'
      ? 'Minor operational or inventory items require management review to sustain peak performance.'
      : 'Critical attention required: stockouts, overdue debts, or operational bottlenecks detected.';

  // 12. Management Attention Center (Prioritized Alerts)
  const attentionCenter: ExecutiveAttentionItem[] = [];

  // Critical: Stockouts
  if (outOfStockItems.length > 0) {
    attentionCenter.push({
      id: 'att-inv-stockout',
      category: 'inventory',
      severity: 'critical',
      title: `${outOfStockItems.length} Products Completely Out of Stock`,
      message: `${outOfStockItems.slice(0, 3).map((p) => p.name).join(', ')}${outOfStockItems.length > 3 ? ` and ${outOfStockItems.length - 3} more` : ''} are at 0 quantity and cannot be sold.`,
      evidence: `${outOfStockItems.length} SKUs at zero stock level in inventory ledger.`,
      targetView: 'products',
      timestamp: new Date().toISOString(),
      metricValue: outOfStockItems.length,
    });
  }

  // Critical: Overdue Tasks
  if (opsSummary.overdueCount > 0) {
    attentionCenter.push({
      id: 'att-ops-overdue',
      category: 'operations',
      severity: opsSummary.overdueCount > 3 ? 'critical' : 'high',
      title: `${opsSummary.overdueCount} Overdue Operational Tasks`,
      message: `Operational tasks have missed their scheduled completion deadlines in Ghana Standard Time.`,
      evidence: `${opsSummary.overdueCount} task(s) overdue according to workflow manager.`,
      targetView: 'governance',
      timestamp: new Date().toISOString(),
      metricValue: opsSummary.overdueCount,
    });
  }

  // Critical / High: Debtor Exposure
  if (customerDebtors.length > 0) {
    attentionCenter.push({
      id: 'att-debt-exposure',
      category: 'debt',
      severity: totalDebtExposure > 1000 ? 'high' : 'informational',
      title: `${customerDebtors.length} Customers with Outstanding Debt`,
      message: canViewFinancials
        ? `Total unpaid customer debt stands at ${formatGHS(totalDebtExposure)}. Proactive follow-up recommended.`
        : `${customerDebtors.length} customers carry open balances on credit ledger.`,
      evidence: `${customerDebtors.length} customer balances > 0. Top debtor: ${customerDebtors[0]?.name || 'N/A'}.`,
      targetView: 'debtors',
      timestamp: new Date().toISOString(),
      metricValue: canViewFinancials ? totalDebtExposure : customerDebtors.length,
    });
  }

  // High: Low Stock items
  if (lowStockItems.length > 0) {
    attentionCenter.push({
      id: 'att-inv-lowstock',
      category: 'inventory',
      severity: 'high',
      title: `${lowStockItems.length} Products Approaching Depletion`,
      message: `Stock quantities have dropped below minimum reorder thresholds. Supplier purchases needed soon.`,
      evidence: `${lowStockItems.length} items <= minStockLevel.`,
      targetView: 'products',
      timestamp: new Date().toISOString(),
      metricValue: lowStockItems.length,
    });
  }

  // High: Integrations failures
  if (integrationDiagnostics.failedChecks > 0) {
    attentionCenter.push({
      id: 'att-int-failures',
      category: 'integrations',
      severity: 'high',
      title: `${integrationDiagnostics.failedChecks} Integration Health Warnings`,
      message: `External synchronization or payment provider diagnostics flagged connection alerts.`,
      evidence: `${integrationDiagnostics.failedChecks} failed check(s) in integration health report.`,
      targetView: 'integrations',
      timestamp: new Date().toISOString(),
      metricValue: integrationDiagnostics.failedChecks,
    });
  }

  // Informational: Loyalty & Milestone
  if (allCustomers.length > 0 && allCustomers.some((c) => (Number(c.loyaltyPoints) || 0) >= 100)) {
    const vipCount = allCustomers.filter((c) => (Number(c.loyaltyPoints) || 0) >= 100).length;
    attentionCenter.push({
      id: 'att-loyalty-milestone',
      category: 'customer',
      severity: 'informational',
      title: `${vipCount} Customer Loyalty Milestone(s) Reached`,
      message: `Customers have accumulated reward points eligible for VIP incentives or redemption.`,
      evidence: `${vipCount} customers with >= 100 loyalty points.`,
      targetView: 'loyalty',
      timestamp: new Date().toISOString(),
      metricValue: vipCount,
    });
  }

  // 13. Opportunities Engine (Traceable, Informational, Safe)
  const opportunities: ExecutiveOpportunityItem[] = [];

  // Opportunity 1: Fast moving products restock
  if (growthIntel.fastestMovingProducts && growthIntel.fastestMovingProducts.length > 0) {
    const topFast = growthIntel.fastestMovingProducts[0];
    opportunities.push({
      id: 'opp-fast-mover',
      title: `Capitalize on High Velocity: "${topFast.name}"`,
      reason: `Product demonstrates top sales velocity with ${topFast.unitsSold} units sold in the current period.`,
      supportingData: `Velocity: ${topFast.unitsSold} units sold. Current stock: ${topFast.stockQuantity} units.`,
      affectedEntity: topFast.name,
      confidence: 'Strong evidence',
      recommendedInvestigation: `Review supplier lead times and increase order buffer to prevent stockouts during peak demand.`,
      category: 'product',
      targetView: 'products',
    });
  }

  // Opportunity 2: Customer Re-engagement
  const dormantCustomers = allCustomers.filter((c) => (Number(c.totalPurchases) || 0) > 0 && (Number(c.balance) || 0) === 0);
  if (dormantCustomers.length > 0) {
    opportunities.push({
      id: 'opp-customer-reengage',
      title: `Re-engage ${Math.min(dormantCustomers.length, 5)} Satisfied Repeat Customers`,
      reason: `Customers have completed paid transactions without any pending debt and are prime candidates for repeat orders.`,
      supportingData: `${dormantCustomers.length} qualified debt-free customers in directory.`,
      affectedEntity: dormantCustomers[0]?.name || 'Customers',
      confidence: 'Moderate evidence',
      recommendedInvestigation: `Send personalized WhatsApp courtesy messages or promotions via the Communications Center.`,
      category: 'customer',
      targetView: 'communications',
    });
  }

  // Opportunity 3: Multi-Location Stock Transfer
  if (isMultiLocation && outOfStockItems.length > 0) {
    opportunities.push({
      id: 'opp-stock-rebalance',
      title: 'Inter-Branch Stock Transfer Opportunity',
      reason: `Certain products are depleted at one location but may be available in surplus at sister branches.`,
      supportingData: `${outOfStockItems.length} item(s) out of stock across active locations.`,
      affectedEntity: 'Branches',
      confidence: 'Moderate evidence',
      recommendedInvestigation: `Check stock levels across branches in Locations View and initiate an internal stock transfer.`,
      category: 'branch',
      targetView: 'locations',
    });
  }

  // 14. Risk Engine (Traceable, Severity Classified, Safe)
  const risks: ExecutiveRiskItem[] = [];

  // Risk 1: Margin Contraction
  if (canViewFinancials && currentRevenue > 0 && netMarginPercent < 5) {
    risks.push({
      id: 'risk-low-margin',
      title: 'Compressed Net Profit Margin',
      reason: `Net operating profit margin (${netMarginPercent.toFixed(1)}%) is below the healthy 10% benchmark.`,
      supportingData: `Revenue: ${formatGHS(currentRevenue)}, Expenses: ${formatGHS(currentOperatingExpenses)}, Net: ${formatGHS(currentNetProfit)}.`,
      affectedEntity: 'Profitability',
      severity: netMarginPercent < 0 ? 'critical' : 'high',
      recommendedAction: `Audit high operating expense categories and review retail pricing markup on catalog items.`,
      category: 'financial',
      targetView: 'reports',
    });
  }

  // Risk 2: Debtor Concentration
  if (canViewFinancials && totalDebtExposure > 0 && customerDebtors.length > 0) {
    const sortedDebtors = [...customerDebtors].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
    const topDebtor = sortedDebtors[0];
    const topDebtorShare = (Number(topDebtor.balance) / totalDebtExposure) * 100;
    if (topDebtorShare >= 40 && customerDebtors.length > 1) {
      risks.push({
        id: 'risk-debt-concentration',
        title: `Debt Concentration: "${topDebtor.name}" Holds ${topDebtorShare.toFixed(0)}% of Total Debt`,
        reason: `A single customer accounts for ${formatGHS(topDebtor.balance)} of the business's total credit exposure.`,
        supportingData: `Single debtor concentration at ${topDebtorShare.toFixed(1)}% of total receivables.`,
        affectedEntity: topDebtor.name,
        severity: 'high',
        recommendedAction: `Halt further credit approvals for this customer until an installment payment is received.`,
        category: 'debt',
        targetView: 'debtors',
      });
    }
  }

  // Risk 3: Stockout on Fast Movers
  if (growthIntel.fastestMovingProducts) {
    const criticalMovers = growthIntel.fastestMovingProducts.filter((p) => p.stockQuantity <= 0);
    if (criticalMovers.length > 0) {
      risks.push({
        id: 'risk-stockout-fast-mover',
        title: `Top-Selling Item "${criticalMovers[0].name}" is Out of Stock`,
        reason: `High customer demand exists, but zero inventory is available, leading to lost daily sales revenue.`,
        supportingData: `${criticalMovers[0].unitsSold} units previously sold. Current inventory: 0.`,
        affectedEntity: criticalMovers[0].name,
        severity: 'critical',
        recommendedAction: `Create an immediate purchase order with primary supplier via the Purchases module.`,
        category: 'inventory',
        targetView: 'purchases',
      });
    }
  }

  // 15. Anomaly Detection (Neutral Phrasing, Deterministic)
  const anomalies: ExecutiveAnomalyItem[] = [];

  // Check 1: Large Single Transaction Spike (> 3.5x ATV)
  if (currentAtv > 0 && currentSales.length >= 3) {
    const spikeSales = currentSales.filter((s) => Number(s.total) >= currentAtv * 3.5);
    if (spikeSales.length > 0) {
      const biggest = spikeSales.sort((a, b) => Number(b.total) - Number(a.total))[0];
      anomalies.push({
        id: `anom-sale-${biggest.id}`,
        type: 'High-Value Transaction Spike',
        description: `Receipt #${biggest.receiptNumber || biggest.id} totals ${formatGHS(biggest.total)}, which is ${(Number(biggest.total) / currentAtv).toFixed(1)}x greater than your average order value.`,
        detectedAt: biggest.createdAt,
        neutralNotice: 'Unusual activity detected — review recommended.',
        affectedEntity: `Receipt #${biggest.receiptNumber || biggest.id}`,
        metricDetails: `Transaction: ${formatGHS(biggest.total)} vs Period ATV: ${formatGHS(currentAtv)}.`,
        severity: 'moderate',
      });
    }
  }

  // Check 2: Expense Surge
  if (currentOperatingExpenses > 0 && previousOperatingExpenses > 0 && currentOperatingExpenses > previousOperatingExpenses * 2.5) {
    anomalies.push({
      id: 'anom-expense-surge',
      type: 'Significant Expense Increase',
      description: `Operating expenses in this period (${formatGHS(currentOperatingExpenses)}) increased by ${expensesChangePercent}% compared to prior baseline.`,
      detectedAt: new Date().toISOString(),
      neutralNotice: 'Unusual activity detected — review recommended.',
      affectedEntity: 'Operating Expenses',
      metricDetails: `Current: ${formatGHS(currentOperatingExpenses)} vs Prior: ${formatGHS(previousOperatingExpenses)}.`,
      severity: 'high',
    });
  }

  // 16. Executive Summary Generation
  const periodLabel = dateResolution.current.label;
  const financialSummary = canViewFinancials
    ? currentRevenue > 0
      ? `Generated ${formatGHS(currentRevenue)} in revenue with a gross profit of ${formatGHS(currentGrossProfit)} (${grossMarginPercent.toFixed(1)}% margin) and net income of ${formatGHS(currentNetProfit)}.`
      : `No revenue recorded yet in ${periodLabel}.`
    : 'Financial metrics are restricted for this user role.';

  const salesSummary =
    currentTransactions > 0
      ? `Completed ${currentTransactions} checkout transactions dispensing ${currentUnitsSold} item units${canViewFinancials ? ` at an average of ${formatGHS(currentAtv)} per transaction` : ''}.`
      : `0 sales transactions recorded in ${periodLabel}.`;

  const inventorySummary =
    outOfStockItems.length > 0 || lowStockItems.length > 0
      ? `Catalog contains ${allProducts.length} items. ${outOfStockItems.length} item(s) are completely out of stock and ${lowStockItems.length} require restock.`
      : `All ${allProducts.length} catalog items are comfortably stocked above reorder thresholds.`;

  const customerSummary =
    customerDebtors.length > 0
      ? `${allCustomers.length} total customers registered; ${customerDebtors.length} debtor(s) currently owe ${canViewFinancials ? formatGHS(totalDebtExposure) : 'unpaid balances'}.`
      : `${allCustomers.length} customers registered with zero outstanding debt balances.`;

  const operationsSummary =
    opsSummary.overdueCount > 0
      ? `${opsSummary.pendingCount} pending task(s), with ${opsSummary.overdueCount} overdue task(s) requiring immediate staff intervention.`
      : `${opsSummary.pendingCount} pending task(s), all on schedule with 0 overdue items.`;

  const forecastSummary = forecastData?.salesOutlook?.forecastSalesGhs !== undefined
    ? `Projected outlook indicates ${canViewFinancials ? formatGHS(forecastData.salesOutlook.forecastSalesGhs) : 'continued activity'} over the next period (${forecastData.salesOutlook.confidence} confidence).`
    : 'Projections are awaiting further historical sales baseline data.';

  const risksAndOpportunitiesSummary =
    risks.length > 0 || opportunities.length > 0
      ? `${opportunities.length} business opportunity(ies) identified and ${risks.length} operational risk(s) flagged for management review.`
      : 'No critical operational risks or immediate opportunities flagged.';

  const headline =
    overallHealthStatus === 'OPTIMAL'
      ? `Business operations are performing solidly for ${periodLabel}.`
      : overallHealthStatus === 'ATTENTION'
      ? `Steady performance with specific inventory and operational attention items.`
      : `Action required: critical stockouts or workflow delays detected for ${periodLabel}.`;

  const executiveSummary: ExecutiveExecutiveSummary = {
    headline,
    periodLabel,
    financialSummary,
    salesSummary,
    inventorySummary,
    customerSummary,
    operationsSummary,
    forecastSummary,
    risksAndOpportunitiesSummary,
    generatedAt: new Date().toISOString(),
  };

  // 17. Master Admin SaaS Metrics Isolation
  let platformMetrics: any = undefined;
  if (user.role === 'master_admin') {
    const saasMetrics = calculateSaaSRevenueMetrics();
    platformMetrics = {
      isMasterAdminView: true,
      totalBusinesses: saasMetrics.totalBusinesses,
      activeSubscriptions: saasMetrics.activeSubscriptions,
      trials: saasMetrics.trials,
      pastDue: saasMetrics.pastDue,
      mrr: saasMetrics.mrrGhs,
      arr: saasMetrics.arrGhs,
      planDistribution: saasMetrics.planDistribution,
    };
  }

  // 18. Assemble Payload
  return {
    businessId,
    businessName,
    locationId: effectiveLocationId,
    locationName: targetLocationName,
    dateRange: {
      range,
      startDate: currentStart,
      endDate: currentEnd,
      label: periodLabel,
      hasComparison,
      comparisonRange: comparison
        ? {
            fromDate: comparison.startDate,
            toDate: comparison.endDate,
            label: comparison.label,
          }
        : null,
      comparisonReason,
    },
    canViewFinancials,
    executiveSummary,
    healthSnapshot: {
      overallStatus: overallHealthStatus,
      summary: overallHealthSummary,
      dimensions: healthDimensions,
    },
    kpiScorecards,
    financialPerformance: canViewFinancials
      ? {
          revenue: currentRevenue,
          cogs: currentCogs,
          grossProfit: currentGrossProfit,
          operatingExpenses: currentOperatingExpenses,
          netProfit: currentNetProfit,
          grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
          netMarginPercent: Number(netMarginPercent.toFixed(1)),
          atv: Number(currentAtv.toFixed(2)),
          inventoryValuation: Number(inventoryValuation.toFixed(2)),
          comparisons: {
            revenueChangePercent: revenueChangePercent ?? undefined,
            grossProfitChangePercent: grossProfitChangePercent ?? undefined,
            netProfitChangePercent: netProfitChangePercent ?? undefined,
            expensesChangePercent: expensesChangePercent ?? undefined,
          },
        }
      : { restricted: true },
    salesPerformance: {
      totalTransactions: currentTransactions,
      totalUnitsSold: currentUnitsSold,
      atv: canViewFinancials ? Number(currentAtv.toFixed(2)) : null,
      salesTrend: (growthIntel.salesTrend || []).map((t) => ({
        date: t.date,
        sales: canViewFinancials ? t.sales : 0,
        transactions: t.sales > 0 ? Math.max(1, Math.round(t.sales / (currentAtv || 1))) : 0,
        profit: canViewFinancials ? t.profit : undefined,
      })),
      paymentMethodDistribution: (growthIntel.paymentMethodDistribution || []).map((p) => ({
        method: p.method,
        count: p.count,
        total: canViewFinancials ? p.amount : 0,
        percent: Number(p.percentage.toFixed(1)),
      })),
      topProducts: (growthIntel.topRevenueProducts || []).slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        unitsSold: p.unitsSold,
        revenue: canViewFinancials ? p.revenue : undefined,
      })),
      topCustomers: (growthIntel.topCustomers || []).slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        transactionCount: c.purchasesCount,
        totalSpend: canViewFinancials ? c.totalSpent : undefined,
      })),
    },
    inventoryIntelligence: {
      totalCatalogProducts: allProducts.length,
      inStockCount,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      inventoryValuation: canViewFinancials ? Number(inventoryValuation.toFixed(2)) : undefined,
      fastMovingCount: (growthIntel.fastestMovingProducts || []).length,
      slowMovingCount: (growthIntel.slowMovingProducts || []).length,
      criticalRestockAlerts,
    },
    customerIntelligence: {
      totalCustomers: allCustomers.length,
      activeCount: growthIntel.customerIntelligence?.activeCustomersCount || 0,
      newCount: growthIntel.customerIntelligence?.newCustomersCount || 0,
      returningCount: growthIntel.customerIntelligence?.returningCustomersCount || 0,
      inactiveCount: growthIntel.customerIntelligence?.inactiveCustomersCount || 0,
      debtorCount: customerDebtors.length,
      totalDebtExposure: canViewFinancials ? totalDebtExposure : 0,
      retentionOpportunitiesCount: (growthIntel.customerIntelligence?.dormantVipsCount || 0),
    },
    staffIntelligence: {
      totalStaff: allUsers.filter((u) => u.role === 'staff').length,
      activeStaffInPeriod: staffActivityList.length,
      staffActivity: staffActivityList,
    },
    locationIntelligence: {
      isMultiLocation,
      locationsCount: allLocations.length,
      branches: branchSummaries,
    },
    operationsIntelligence: {
      pendingTasksCount: opsSummary.pendingCount,
      dueTodayTasksCount: opsSummary.dueTodayCount,
      overdueTasksCount: opsSummary.overdueCount,
      criticalTasksCount: opsSummary.criticalCount,
      completedTasksCount: opsSummary.completedCount,
    },
    forecastOutlook: forecastData
      ? {
          isAvailable: true,
          confidence: forecastData.confidence || 'MODERATE',
          salesOutlookSummary: canViewFinancials && forecastData.salesOutlook?.forecastSalesGhs !== undefined
            ? `Projected sales revenue: ${formatGHS(forecastData.salesOutlook.forecastSalesGhs)}.`
            : 'Projections indicate stable transaction volume over the next forecast horizon.',
          projectedDemandSummary: `${forecastData.projectedDemand?.length || 0} product(s) analyzed for future demand trajectory.`,
          inventoryCoverageSummary: `${forecastData.inventoryCoverage?.length || 0} product(s) mapped with inventory runout days.`,
          expenseTrendSummary: canViewFinancials && forecastData.expenseTrend?.projectedExpensesGhs !== undefined
            ? `Projected operating expenses: ${formatGHS(forecastData.expenseTrend.projectedExpensesGhs)}.`
            : 'Operating expense trends are monitored within baseline historical range.',
          note: 'Projections based on historical trends. Projections are estimates, not guaranteed outcomes.',
        }
      : undefined,
    attentionCenter,
    opportunities,
    risks,
    anomalies,
    integrationHealth: {
      totalProviders: integrationDiagnostics.totalChecks,
      connectedCount: integrationDiagnostics.passedChecks,
      healthyCount: integrationDiagnostics.passedChecks,
      statusSummary: integrationDiagnostics.healthy ? 'All integrations healthy' : 'Attention required on external services',
    },
    subscriptionStatus: {
      currentPlan: subscription?.plan || 'free',
      status: subscription?.status || 'ACTIVE',
      isTrialing: subscription?.status === 'TRIALING',
      usageSummary: {
        staffUsed: usageSummary.staffCount,
        staffLimit: usageSummary.maxStaff,
        locationsUsed: usageSummary.locationCount,
        locationsLimit: usageSummary.maxLocations,
        productsUsed: usageSummary.productCount,
        productsLimit: usageSummary.maxProducts,
        customersUsed: usageSummary.customerCount,
        customersLimit: usageSummary.maxCustomers,
      },
    },
    platformMetrics,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates CSV Export data for the Executive Command Center.
 * Strictly respects financial privacy.
 */
export function generateExecutiveExportCsv(
  payload: ExecutiveCommandCenterPayload
): string {
  const lines: string[] = [];

  lines.push(`"BUSINESS MANAGER GH - EXECUTIVE COMMAND CENTER REPORT"`);
  lines.push(`"Business Name","${payload.businessName.replace(/"/g, '""')}"`);
  lines.push(`"Date Range","${payload.dateRange.label}" ("${payload.dateRange.startDate}" to "${payload.dateRange.endDate}")`);
  if (payload.locationName) {
    lines.push(`"Branch/Location","${payload.locationName.replace(/"/g, '""')}"`);
  }
  lines.push(`"Generated At","${payload.generatedAt}"`);
  lines.push('');

  // 1. Executive Summary
  lines.push(`"EXECUTIVE SUMMARY"`);
  lines.push(`"Headline","${payload.executiveSummary.headline.replace(/"/g, '""')}"`);
  lines.push(`"Sales Summary","${payload.executiveSummary.salesSummary.replace(/"/g, '""')}"`);
  if (payload.canViewFinancials) {
    lines.push(`"Financial Summary","${payload.executiveSummary.financialSummary.replace(/"/g, '""')}"`);
  }
  lines.push(`"Inventory Summary","${payload.executiveSummary.inventorySummary.replace(/"/g, '""')}"`);
  lines.push(`"Operations Summary","${payload.executiveSummary.operationsSummary.replace(/"/g, '""')}"`);
  lines.push('');

  // 2. KPI Scorecards
  lines.push(`"KEY PERFORMANCE INDICATORS (KPIS)"`);
  lines.push(`"KPI","Value","Change vs Prior","Trend","Explanation","Calculation Logic"`);
  for (const kpi of payload.kpiScorecards) {
    if (kpi.restricted && !payload.canViewFinancials) {
      lines.push(`"${kpi.label}","Restricted","N/A","N/A","Requires financial permission","${kpi.calculationLogic.replace(/"/g, '""')}"`);
    } else {
      const changeStr = kpi.changePercent !== null && kpi.changePercent !== undefined
        ? `${kpi.changePercent > 0 ? '+' : ''}${kpi.changePercent}%`
        : 'N/A';
      lines.push(
        `"${kpi.label}","${kpi.formattedValue}","${changeStr}","${kpi.changeDirection}","${kpi.explanation.replace(/"/g, '""')}","${kpi.calculationLogic.replace(/"/g, '""')}"`
      );
    }
  }
  lines.push('');

  // 3. Management Attention Items
  lines.push(`"MANAGEMENT ATTENTION ITEMS"`);
  lines.push(`"Severity","Category","Title","Evidence","Action Required"`);
  for (const att of payload.attentionCenter) {
    lines.push(
      `"${att.severity.toUpperCase()}","${att.category}","${att.title.replace(/"/g, '""')}","${att.evidence.replace(/"/g, '""')}","${att.message.replace(/"/g, '""')}"`
    );
  }
  lines.push('');

  // 4. Opportunities & Risks
  lines.push(`"STRATEGIC OPPORTUNITIES"`);
  lines.push(`"Title","Confidence","Supporting Data","Recommended Investigation"`);
  for (const opp of payload.opportunities) {
    lines.push(
      `"${opp.title.replace(/"/g, '""')}","${opp.confidence}","${opp.supportingData.replace(/"/g, '""')}","${opp.recommendedInvestigation.replace(/"/g, '""')}"`
    );
  }
  lines.push('');

  lines.push(`"IDENTIFIED RISKS"`);
  lines.push(`"Severity","Title","Supporting Data","Recommended Action"`);
  for (const rsk of payload.risks) {
    lines.push(
      `"${rsk.severity.toUpperCase()}","${rsk.title.replace(/"/g, '""')}","${rsk.supportingData.replace(/"/g, '""')}","${rsk.recommendedAction.replace(/"/g, '""')}"`
    );
  }

  return lines.join('\n');
}
