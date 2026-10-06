/**
 * STAGE 4T — LIGHTWEIGHT BUSINESS SCENARIO SIMULATOR & PLANNING ENGINE
 * Server-authoritative, strict read-only against live data, robust input validation.
 */

import { db, DBUser } from './db.js';
import { resolveAccraDateRangeWithComparison } from './date.js';
import { canUserViewProfit } from './featureAccess.js';
import type {
  SimulationScenarioType,
  SimulationFinancialMetrics,
  SimulationComparisonDelta,
  SimulationExplanation,
  SimulationRunResult,
  Product,
  Customer,
  BusinessPlanningTargets,
} from '../src/types/index.js';

export interface RunSimulationParams {
  businessId: string;
  user: DBUser;
  scenarioType: SimulationScenarioType;
  scenarioName?: string;
  range?: string;
  startDate?: string;
  endDate?: string;
  locationId?: string;
  assumptions: Record<string, any>;
}

export function computeBaselineFinancials(
  businessId: string,
  range?: string,
  startDate?: string,
  endDate?: string,
  locationId?: string
): {
  metrics: SimulationFinancialMetrics;
  dateRange: { range: string; startDate: string; endDate: string; label: string };
  currency: string;
  allProducts: Product[];
  allCustomers: Customer[];
} {
  const dateRangeResolved = resolveAccraDateRangeWithComparison(range || 'this_month', startDate, endDate);
  const { fromDate, toDate, label, normalizedRange } = dateRangeResolved;

  const raw = db.getRaw();
  const business = raw.businesses?.find((b) => b.id === businessId);
  const currency = business?.currency || 'GH₵';

  const allSales = db.getSales(businessId);
  const allProducts = db.getProducts(businessId);
  const allExpenses = db.getExpenses(businessId);
  const allCustomers = db.getCustomers(businessId);

  const periodSales = allSales.filter((s) => {
    if (s.status === 'Cancelled') return false;
    if (locationId && s.locationId && s.locationId !== locationId) return false;
    return true;
  });

  const periodExpenses = allExpenses.filter((e) => {
    if (locationId && e.locationId && e.locationId !== locationId) return false;
    return true;
  });

  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let totalCOGS = 0;

  for (const sale of periodSales) {
    totalRevenue += Number(sale.total || 0);
    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        const qty = Number(item.quantity || 0);
        totalUnitsSold += qty;
        const prod = allProducts.find((p) => p.id === item.productId);
        const unitCost = Number(
          (item as any).costPrice !== undefined
            ? (item as any).costPrice
            : (item as any).buyingPrice !== undefined
            ? (item as any).buyingPrice
            : prod?.buyingPrice || 0
        );
        totalCOGS += unitCost * qty;
      }
    }
  }

  let totalOperatingExpenses = 0;
  for (const exp of periodExpenses) {
    totalOperatingExpenses += Number(exp.amount || 0);
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalOperatingExpenses;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const atv = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const metrics: SimulationFinancialMetrics = {
    revenue: roundMoney(totalRevenue),
    cogs: roundMoney(totalCOGS),
    grossProfit: roundMoney(grossProfit),
    operatingExpenses: roundMoney(totalOperatingExpenses),
    netProfit: roundMoney(netProfit),
    grossMarginPercent: roundPercent(grossMarginPercent),
    netMarginPercent: roundPercent(netMarginPercent),
    unitsSold: totalUnitsSold,
    averageTransactionValue: roundMoney(atv),
    cashImpactGHS: 0,
  };

  return {
    metrics,
    dateRange: {
      range: normalizedRange,
      startDate: fromDate,
      endDate: toDate,
      label,
    },
    currency,
    allProducts,
    allCustomers,
  };
}

export function calculateComparisonDelta(
  baseline: SimulationFinancialMetrics,
  simulated: SimulationFinancialMetrics
): SimulationComparisonDelta {
  const revenueDelta = roundMoney(simulated.revenue - baseline.revenue);
  const revenueDeltaPercent = baseline.revenue > 0
    ? roundPercent((revenueDelta / baseline.revenue) * 100)
    : simulated.revenue > 0 ? 100 : 0;

  const cogsDelta = roundMoney(simulated.cogs - baseline.cogs);
  const cogsDeltaPercent = baseline.cogs > 0
    ? roundPercent((cogsDelta / baseline.cogs) * 100)
    : simulated.cogs > 0 ? 100 : 0;

  const grossProfitDelta = roundMoney(simulated.grossProfit - baseline.grossProfit);
  const grossProfitDeltaPercent = baseline.grossProfit !== 0
    ? roundPercent((grossProfitDelta / Math.abs(baseline.grossProfit)) * 100)
    : simulated.grossProfit > 0 ? 100 : 0;

  const expensesDelta = roundMoney(simulated.operatingExpenses - baseline.operatingExpenses);
  const expensesDeltaPercent = baseline.operatingExpenses > 0
    ? roundPercent((expensesDelta / baseline.operatingExpenses) * 100)
    : simulated.operatingExpenses > 0 ? 100 : 0;

  const netProfitDelta = roundMoney(simulated.netProfit - baseline.netProfit);
  const netProfitDeltaPercent = baseline.netProfit !== 0
    ? roundPercent((netProfitDelta / Math.abs(baseline.netProfit)) * 100)
    : simulated.netProfit > 0 ? 100 : 0;

  const grossMarginPpDelta = roundPercent(simulated.grossMarginPercent - baseline.grossMarginPercent);
  const netMarginPpDelta = roundPercent(simulated.netMarginPercent - baseline.netMarginPercent);

  const isProfitImprovement = netProfitDelta > 0;

  let viability: SimulationComparisonDelta['viability'] = 'neutral';
  if (simulated.netProfit < 0 && baseline.netProfit >= 0) {
    viability = 'high_risk';
  } else if (netProfitDeltaPercent >= 15 || netProfitDelta > 500) {
    viability = 'highly_favorable';
  } else if (netProfitDelta > 0) {
    viability = 'favorable';
  } else if (netProfitDelta < 0) {
    viability = netProfitDeltaPercent <= -20 ? 'high_risk' : 'unfavorable';
  }

  return {
    revenueDelta,
    revenueDeltaPercent,
    cogsDelta,
    cogsDeltaPercent,
    grossProfitDelta,
    grossProfitDeltaPercent,
    expensesDelta,
    expensesDeltaPercent,
    netProfitDelta,
    netProfitDeltaPercent,
    grossMarginPpDelta,
    netMarginPpDelta,
    isProfitImprovement,
    viability,
  };
}

export function executeScenarioSimulation(params: RunSimulationParams): SimulationRunResult {
  const { businessId, user, scenarioType, range, startDate, endDate, locationId, assumptions } = params;

  const { metrics: baseline, dateRange, currency, allProducts, allCustomers } = computeBaselineFinancials(
    businessId,
    range,
    startDate,
    endDate,
    locationId
  );

  const canViewFinancials = canUserViewProfit(user);

  let simulated: SimulationFinancialMetrics;
  let explanation: SimulationExplanation;
  let scenarioName = params.scenarioName || getDefaultScenarioName(scenarioType);
  let details: SimulationRunResult['details'] = {};

  switch (scenarioType) {
    case 'price_change': {
      const productId = assumptions.productId;
      const product = allProducts.find((p) => p.id === productId);
      const currentPrice = Number(assumptions.currentPrice ?? product?.sellingPrice ?? 50);
      const proposedPrice = Math.max(0, Number(assumptions.proposedPrice ?? currentPrice));
      const expectedQuantity = Math.max(0, Number(assumptions.expectedSalesQuantity ?? 100));
      const costPrice = Number(product?.buyingPrice ?? assumptions.costPrice ?? 30);

      const simProductRevenue = proposedPrice * expectedQuantity;
      const simProductCOGS = costPrice * expectedQuantity;
      const simProductGrossProfit = simProductRevenue - simProductCOGS;

      const baseProductRevenue = currentPrice * expectedQuantity;
      const baseProductGrossProfit = baseProductRevenue - simProductCOGS;
      const profitImpact = simProductGrossProfit - baseProductGrossProfit;

      const newRevenue = Math.max(0, baseline.revenue + (simProductRevenue - baseProductRevenue));
      const newGrossProfit = newRevenue - baseline.cogs;
      const newNetProfit = newGrossProfit - baseline.operatingExpenses;
      const newGrossMargin = newRevenue > 0 ? (newGrossProfit / newRevenue) * 100 : 0;
      const newNetMargin = newRevenue > 0 ? (newNetProfit / newRevenue) * 100 : 0;

      simulated = {
        revenue: roundMoney(newRevenue),
        cogs: baseline.cogs,
        grossProfit: roundMoney(newGrossProfit),
        operatingExpenses: baseline.operatingExpenses,
        netProfit: roundMoney(newNetProfit),
        grossMarginPercent: roundPercent(newGrossMargin),
        netMarginPercent: roundPercent(newNetMargin),
        unitsSold: baseline.unitsSold,
        averageTransactionValue: baseline.averageTransactionValue,
        cashImpactGHS: roundMoney(profitImpact),
      };

      explanation = {
        headline: `Price adjustment for ${product?.name || 'Selected Product'} to ${currency} ${proposedPrice.toFixed(2)}`,
        whatChanged: `Selling price changed to ${currency} ${proposedPrice.toFixed(2)} with expected quantity of ${expectedQuantity} units.`,
        assumptions: [
          `Selling price of ${currency} ${proposedPrice.toFixed(2)} per unit.`,
          `Cost price remains static at ${currency} ${costPrice.toFixed(2)} per unit.`,
          `Expected volume set at ${expectedQuantity} units.`,
        ],
        revenueImpact: `Estimated revenue impact: ${currency} ${simProductRevenue.toFixed(2)}.`,
        costImpact: `COGS for batch: ${currency} ${simProductCOGS.toFixed(2)}.`,
        expenseImpact: `Operating expenses unchanged.`,
        profitImpact: `Estimated net profit impact: ${profitImpact >= 0 ? '+' : ''}${currency} ${profitImpact.toFixed(2)}.`,
        marginImpact: `Gross margin estimated at ${newGrossMargin.toFixed(1)}%.`,
        cashFlowImpact: `Incremental cash flow: ${currency} ${profitImpact.toFixed(2)}.`,
        limitations: ['Assumes static customer demand and constant supplier cost.'],
        labels: {
          projected: 'PROJECTED ESTIMATE',
          simulated: 'SIMULATED SCENARIO',
          actual: 'ACTUAL BASELINE',
        },
      };

      details.product = {
        id: productId || 'custom',
        name: product?.name || 'Custom Product',
        currentPrice: roundMoney(currentPrice),
        currentCost: roundMoney(costPrice),
        newPrice: roundMoney(proposedPrice),
        expectedQuantity,
      };
      break;
    }

    case 'sales_volume_change': {
      const volumePct = Number(assumptions.volumeChangePercent ?? 10);
      const clampedPct = Math.max(-100, Math.min(1000, volumePct));
      const multiplier = 1 + clampedPct / 100;

      const simRevenue = baseline.revenue * multiplier;
      const simCOGS = baseline.cogs * multiplier;
      const simGrossProfit = simRevenue - simCOGS;
      const simExpenses = baseline.operatingExpenses;
      const simNetProfit = simGrossProfit - simExpenses;
      const simGrossMargin = simRevenue > 0 ? (simGrossProfit / simRevenue) * 100 : 0;
      const simNetMargin = simRevenue > 0 ? (simNetProfit / simRevenue) * 100 : 0;

      simulated = {
        revenue: roundMoney(simRevenue),
        cogs: roundMoney(simCOGS),
        grossProfit: roundMoney(simGrossProfit),
        operatingExpenses: baseline.operatingExpenses,
        netProfit: roundMoney(simNetProfit),
        grossMarginPercent: roundPercent(simGrossMargin),
        netMarginPercent: roundPercent(simNetMargin),
        unitsSold: Math.round((baseline.unitsSold || 0) * multiplier),
        averageTransactionValue: baseline.averageTransactionValue,
        cashImpactGHS: roundMoney(simNetProfit - baseline.netProfit),
      };

      explanation = {
        headline: `Sales Volume ${clampedPct >= 0 ? '+' : ''}${clampedPct}% Scenario`,
        whatChanged: `Sales volume varied by ${clampedPct >= 0 ? '+' : ''}${clampedPct}% against baseline.`,
        assumptions: [`Volume scaling factor: ${multiplier}x.`, `Fixed overhead held constant at ${currency} ${baseline.operatingExpenses.toFixed(2)}`],
        revenueImpact: `Projected revenue: ${currency} ${simRevenue.toFixed(2)}.`,
        costImpact: `Projected COGS: ${currency} ${simCOGS.toFixed(2)}.`,
        expenseImpact: `Overhead unchanged.`,
        profitImpact: `Net profit projected at ${currency} ${simNetProfit.toFixed(2)}.`,
        marginImpact: `Net margin: ${simNetMargin.toFixed(1)}%.`,
        cashFlowImpact: `Cash flow variance: ${currency} ${(simNetProfit - baseline.netProfit).toFixed(2)}.`,
        limitations: ['Assumes linear variable cost scaling.'],
        labels: {
          projected: 'PROJECTED ESTIMATE',
          simulated: 'SIMULATED SCENARIO',
          actual: 'ACTUAL BASELINE',
        },
      };
      break;
    }

    case 'expense_change': {
      const category = assumptions.category || 'Operating Expenses';
      let delta = 0;
      if (assumptions.proposedChangeAmount !== undefined) {
        delta = Number(assumptions.proposedChangeAmount);
      } else if (assumptions.proposedChangePercent !== undefined) {
        delta = baseline.operatingExpenses * (Number(assumptions.proposedChangePercent) / 100);
      } else {
        delta = 500;
      }

      const simExpenses = Math.max(0, baseline.operatingExpenses + delta);
      const simNetProfit = baseline.grossProfit - simExpenses;
      const simNetMargin = baseline.revenue > 0 ? (simNetProfit / baseline.revenue) * 100 : 0;

      simulated = {
        revenue: baseline.revenue,
        cogs: baseline.cogs,
        grossProfit: baseline.grossProfit,
        operatingExpenses: roundMoney(simExpenses),
        netProfit: roundMoney(simNetProfit),
        grossMarginPercent: baseline.grossMarginPercent,
        netMarginPercent: roundPercent(simNetMargin),
        unitsSold: baseline.unitsSold,
        averageTransactionValue: baseline.averageTransactionValue,
        cashImpactGHS: roundMoney(-delta),
      };

      explanation = {
        headline: `Expense Adjustment (${delta >= 0 ? '+' : ''}${currency} ${Math.abs(delta).toFixed(2)}) for ${category}`,
        whatChanged: `Operating expenses for ${category} simulated to adjust by ${delta >= 0 ? '+' : '-'}${currency} ${Math.abs(delta).toFixed(2)}.`,
        assumptions: [`Expense delta of ${currency} ${delta.toFixed(2)} applied.`, `Revenues remain static.`],
        revenueImpact: `Revenues static at ${currency} ${baseline.revenue.toFixed(2)}.`,
        costImpact: `COGS static.`,
        expenseImpact: `New overhead: ${currency} ${simExpenses.toFixed(2)}.`,
        profitImpact: `Net profit impact: ${-delta >= 0 ? '+' : ''}${currency} ${(-delta).toFixed(2)}.`,
        marginImpact: `Net margin shifts to ${simNetMargin.toFixed(1)}%.`,
        cashFlowImpact: `Net liquidity impact: ${currency} ${(-delta).toFixed(2)}.`,
        limitations: ['Assumes no secondary sales impact.'],
        labels: {
          projected: 'PROJECTED ESTIMATE',
          simulated: 'SIMULATED SCENARIO',
          actual: 'ACTUAL BASELINE',
        },
      };
      break;
    }

    case 'cost_change': {
      const productId = assumptions.productId;
      const product = allProducts.find((p) => p.id === productId);
      const currentCost = Number(assumptions.currentCost ?? product?.buyingPrice ?? 30);
      const proposedCost = Math.max(0, Number(assumptions.proposedCost ?? (currentCost * 1.1)));
      const expectedVolume = Math.max(1, Number(assumptions.expectedSalesVolume ?? 100));

      let costDelta = (proposedCost - currentCost) * expectedVolume;
      let simCOGS = Math.max(0, baseline.cogs + costDelta);

      const simGrossProfit = baseline.revenue - simCOGS;
      const simNetProfit = simGrossProfit - baseline.operatingExpenses;
      const simGrossMargin = baseline.revenue > 0 ? (simGrossProfit / baseline.revenue) * 100 : 0;
      const simNetMargin = baseline.revenue > 0 ? (simNetProfit / baseline.revenue) * 100 : 0;

      simulated = {
        revenue: baseline.revenue,
        cogs: roundMoney(simCOGS),
        grossProfit: roundMoney(simGrossProfit),
        operatingExpenses: baseline.operatingExpenses,
        netProfit: roundMoney(simNetProfit),
        grossMarginPercent: roundPercent(simGrossMargin),
        netMarginPercent: roundPercent(simNetMargin),
        unitsSold: baseline.unitsSold,
        averageTransactionValue: baseline.averageTransactionValue,
        cashImpactGHS: roundMoney(-costDelta),
      };

      explanation = {
        headline: `Purchase Unit Cost Shift to ${currency} ${proposedCost.toFixed(2)}`,
        whatChanged: `Unit cost changed from ${currency} ${currentCost.toFixed(2)} to ${currency} ${proposedCost.toFixed(2)}.`,
        assumptions: [`Unit cost shift of ${currency} ${(proposedCost - currentCost).toFixed(2)}.`, `Volume: ${expectedVolume} units.`],
        revenueImpact: `Revenues static.`,
        costImpact: `COGS expands by ${currency} ${costDelta.toFixed(2)}.`,
        expenseImpact: `Overhead unchanged.`,
        profitImpact: `Net profit changes by -${currency} ${costDelta.toFixed(2)}.`,
        marginImpact: `Gross margin contracts to ${simGrossMargin.toFixed(1)}%.`,
        cashFlowImpact: `Working capital requirement increases by ${currency} ${costDelta.toFixed(2)}.`,
        limitations: ['Assumes retail prices unchanged.'],
        labels: {
          projected: 'PROJECTED ESTIMATE',
          simulated: 'SIMULATED SCENARIO',
          actual: 'ACTUAL BASELINE',
        },
      };

      details.product = {
        id: productId || 'general',
        name: product?.name || 'General Inventory Cost',
        currentPrice: Number(product?.sellingPrice || 50),
        currentCost: roundMoney(currentCost),
        newCost: roundMoney(proposedCost),
        expectedQuantity: expectedVolume,
      };
      break;
    }

    case 'target_profit': {
      const targetProfit = Math.max(0, Number(assumptions.targetMonthlyProfit ?? 5000));
      const avgSellingPrice = Math.max(0.01, Number(assumptions.averageSellingPrice ?? 50));
      const avgUnitCost = Math.max(0, Number(assumptions.averageUnitCost ?? 30));
      const estExpenses = Math.max(0, Number(assumptions.estimatedOperatingExpenses ?? baseline.operatingExpenses ?? 2000));

      const unitContributionMargin = avgSellingPrice - avgUnitCost;
      const isAttainable = unitContributionMargin > 0;

      const requiredGrossProfit = targetProfit + estExpenses;
      const requiredSalesUnits = isAttainable ? Math.ceil(requiredGrossProfit / unitContributionMargin) : 0;
      const requiredRevenue = requiredSalesUnits * avgSellingPrice;
      const requiredCOGS = requiredSalesUnits * avgUnitCost;

      const breakEvenUnits = isAttainable ? Math.ceil(estExpenses / unitContributionMargin) : 0;
      const breakEvenRevenue = breakEvenUnits * avgSellingPrice;

      const simGrossMargin = requiredRevenue > 0 ? (requiredGrossProfit / requiredRevenue) * 100 : 0;
      const simNetMargin = requiredRevenue > 0 ? (targetProfit / requiredRevenue) * 100 : 0;

      simulated = {
        revenue: roundMoney(requiredRevenue),
        cogs: roundMoney(requiredCOGS),
        grossProfit: roundMoney(requiredGrossProfit),
        operatingExpenses: roundMoney(estExpenses),
        netProfit: roundMoney(targetProfit),
        grossMarginPercent: roundPercent(simGrossMargin),
        netMarginPercent: roundPercent(simNetMargin),
        unitsSold: requiredSalesUnits,
        averageTransactionValue: roundMoney(avgSellingPrice),
        cashImpactGHS: roundMoney(targetProfit - baseline.netProfit),
      };

      explanation = {
        headline: `Target Profit Roadmap: ${currency} ${targetProfit.toFixed(2)} / Month`,
        whatChanged: `Required sales volume and revenue computed to achieve ${currency} ${targetProfit.toFixed(2)} net profit.`,
        assumptions: [
          `Target profit: ${currency} ${targetProfit.toFixed(2)}`,
          `Avg selling price: ${currency} ${avgSellingPrice.toFixed(2)}`,
          `Avg unit cost: ${currency} ${avgUnitCost.toFixed(2)}`,
          `Overhead: ${currency} ${estExpenses.toFixed(2)}`,
        ],
        revenueImpact: `Required revenue: ${currency} ${requiredRevenue.toFixed(2)}.`,
        costImpact: `Required COGS: ${currency} ${requiredCOGS.toFixed(2)}.`,
        expenseImpact: `Overhead budget: ${currency} ${estExpenses.toFixed(2)}.`,
        profitImpact: `Achieves exact target profit of ${currency} ${targetProfit.toFixed(2)}.`,
        marginImpact: `Target net margin: ${simNetMargin.toFixed(1)}%.`,
        cashFlowImpact: `Break-even at ${breakEvenUnits} units (${currency} ${breakEvenRevenue.toFixed(2)}).`,
        limitations: ['Assumes constant contribution margin.'],
        labels: {
          target: 'TARGET GOAL',
          projected: 'REQUIRED PROJECTION',
          simulated: 'SIMULATED PATHWAY',
          actual: 'CURRENT ACTUAL',
        },
      };

      details.targetProfitCalculation = {
        targetProfit: roundMoney(targetProfit),
        unitContributionMargin: roundMoney(unitContributionMargin),
        requiredGrossProfit: roundMoney(requiredGrossProfit),
        requiredSalesVolumeUnits: requiredSalesUnits,
        requiredRevenueGHS: roundMoney(requiredRevenue),
        breakEvenUnits,
        breakEvenRevenueGHS: roundMoney(breakEvenRevenue),
        isAttainable,
      };
      break;
    }

    case 'sales_target':
    case 'expense_reduction':
    case 'debt_collection':
    case 'discount_scenario':
    case 'custom_multi_variable':
    default: {
      const volumePct = Number(assumptions.volumeChangePercent ?? 10);
      const multiplier = 1 + volumePct / 100;
      const simRevenue = baseline.revenue * multiplier;
      const simCOGS = baseline.cogs * multiplier;
      const simGrossProfit = simRevenue - simCOGS;
      const simNetProfit = simGrossProfit - baseline.operatingExpenses;

      simulated = {
        revenue: roundMoney(simRevenue),
        cogs: roundMoney(simCOGS),
        grossProfit: roundMoney(simGrossProfit),
        operatingExpenses: baseline.operatingExpenses,
        netProfit: roundMoney(simNetProfit),
        grossMarginPercent: simRevenue > 0 ? (simGrossProfit / simRevenue) * 100 : 0,
        netMarginPercent: simRevenue > 0 ? (simNetProfit / simRevenue) * 100 : 0,
        unitsSold: baseline.unitsSold,
        averageTransactionValue: baseline.averageTransactionValue,
        cashImpactGHS: roundMoney(simNetProfit - baseline.netProfit),
      };

      explanation = {
        headline: `Scenario Simulation Result`,
        whatChanged: `Simulated scenario execution.`,
        assumptions: [`Baseline parameters loaded successfully.`],
        revenueImpact: `Revenue: ${currency} ${simRevenue.toFixed(2)}`,
        costImpact: `COGS: ${currency} ${simCOGS.toFixed(2)}`,
        expenseImpact: `Overhead: ${currency} ${baseline.operatingExpenses.toFixed(2)}`,
        profitImpact: `Net profit: ${currency} ${simNetProfit.toFixed(2)}`,
        marginImpact: `Net margin: ${simulated.netMarginPercent.toFixed(1)}%`,
        cashFlowImpact: `Cash flow variance: ${currency} ${(simNetProfit - baseline.netProfit).toFixed(2)}`,
        limitations: ['Model estimates based on static assumptions.'],
        labels: {
          projected: 'PROJECTED ESTIMATE',
          simulated: 'SIMULATED SCENARIO',
          actual: 'ACTUAL BASELINE',
        },
      };
      break;
    }
  }

  const comparison = calculateComparisonDelta(baseline, simulated);

  let finalBaseline = baseline;
  let finalSimulated = simulated;
  let isFinancialsRestricted = false;

  if (!canViewFinancials) {
    isFinancialsRestricted = true;
    finalBaseline = {
      ...baseline,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      grossMarginPercent: 0,
      netMarginPercent: 0,
    };
    finalSimulated = {
      ...simulated,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      grossMarginPercent: 0,
      netMarginPercent: 0,
    };
  }

  return {
    scenarioType,
    scenarioName,
    dateRange,
    assumptions,
    baseline: finalBaseline,
    simulated: finalSimulated,
    comparison: isFinancialsRestricted
      ? {
          ...comparison,
          cogsDelta: 0,
          grossProfitDelta: 0,
          expensesDelta: 0,
          netProfitDelta: 0,
          grossMarginPpDelta: 0,
          netMarginPpDelta: 0,
        }
      : comparison,
    explanation,
    metadata: {
      generatedAt: new Date().toISOString(),
      currency,
      businessId,
      locationId,
      isFinancialsRestricted,
    },
    details,
  };
}

function roundMoney(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}

function roundPercent(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(val * 10) / 10;
}

function getDefaultScenarioName(type: SimulationScenarioType): string {
  switch (type) {
    case 'price_change':
      return 'Price Adjustment What-If';
    case 'sales_volume_change':
      return 'Sales Volume Growth / Contraction';
    case 'expense_change':
      return 'Operating Overhead Modification';
    case 'cost_change':
      return 'COGS & Supplier Cost Fluctuation';
    case 'target_profit':
      return 'Required Volume for Target Profit';
    default:
      return 'Strategic Scenario Simulation';
  }
}

export function computePlanningTargetsProgress(
  businessId: string,
  user: DBUser,
  targets: BusinessPlanningTargets
): BusinessPlanningTargets {
  return targets;
}

