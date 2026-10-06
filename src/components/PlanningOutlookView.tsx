import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Users,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Sliders,
  Layers,
  AlertCircle,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  BusinessForecastPayload,
  ProductDemandPlanningItem,
  BusinessPlanningScenario,
  Business,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

interface PlanningOutlookViewProps {
  business: Business | null;
  onNavigate?: (view: string) => void;
  initialRange?: string;
  isCompact?: boolean;
}

const PRESET_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year', label: 'This Year' },
];

export const PlanningOutlookView: React.FC<PlanningOutlookViewProps> = ({
  business,
  onNavigate,
  initialRange = 'this_month',
  isCompact = false,
}) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<string>(initialRange);
  const [forecast, setForecast] = useState<BusinessForecastPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive Scenario Simulator State
  const [customSalesPct, setCustomSalesPct] = useState<number>(10);
  const [customExpenseDelta, setCustomExpenseDelta] = useState<number>(0);

  // Sub-filter for Inventory Demand items
  const [stockFilter, setStockFilter] = useState<
    'all' | 'Critical' | 'Restock Soon' | 'Monitor' | 'Adequate' | 'No Current Demand'
  >('all');

  const currency = business?.currency || 'GH₵';

  const formatGHS = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    const num = Number(val) || 0;
    return `${currency} ${num.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const fetchForecast = async (salesPct = customSalesPct, expDelta = customExpenseDelta) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBusinessForecast({
        range: selectedRange,
        scenarioSalesPct: salesPct,
        scenarioExpenseDelta: expDelta,
      });
      setForecast(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load business forecasting and planning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(customSalesPct, customExpenseDelta);
  }, [selectedRange]);

  const handleApplyCustomScenario = () => {
    fetchForecast(customSalesPct, customExpenseDelta);
  };

  if (loading && !forecast) {
    return (
      <div className="py-12 text-center text-slate-500 space-y-2">
        <RefreshCw className="w-6 h-6 mx-auto text-emerald-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-300">
          Calculating evidence-based forecasts and operational outlook...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60 text-center text-xs text-rose-300 space-y-2">
        <AlertTriangle className="w-5 h-5 mx-auto text-rose-400" />
        <p>{error}</p>
        <button
          onClick={() => fetchForecast()}
          className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!forecast) return null;

  const {
    metadata,
    salesOutlook,
    inventoryOutlook,
    categoryOutlook,
    customerOutlook,
    receivablesOutlook,
    expenseOutlook,
    profitabilityOutlook,
    scenarios,
  } = forecast;

  const filteredProducts = inventoryOutlook.products.filter((p) => {
    if (stockFilter === 'all') return true;
    return p.restockAttentionLevel === stockFilter;
  });

  return (
    <div id="planning-outlook-view" className="space-y-6">
      {/* 1. METADATA & TRANSPARENCY BANNER */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Owner Planning & Forecast Center</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    metadata.confidenceIndicator === 'HIGH'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      : metadata.confidenceIndicator === 'MODERATE'
                      ? 'bg-blue-950 text-blue-400 border-blue-700'
                      : metadata.confidenceIndicator === 'LOW'
                      ? 'bg-amber-950 text-amber-400 border-amber-700'
                      : 'bg-rose-950 text-rose-400 border-rose-700'
                  }`}
                >
                  Confidence: {metadata.confidenceIndicator}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Period Analyzed: {metadata.periodAnalyzed.label} ({metadata.periodAnalyzed.daysCount}{' '}
                days) • {metadata.dataPointsUsed.salesCount} sales •{' '}
                {metadata.dataPointsUsed.activeDaysCount} active trading days
              </p>
            </div>
          </div>

          {/* Quick Range Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto">
            {PRESET_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                  selectedRange === r.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => fetchForecast()}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Transparent Limitations Bar */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-300">Methodology & Scope: </span>
            <span>{metadata.calculationMethod} </span>
            <span className="text-slate-500 italic">({metadata.disclaimer})</span>
          </div>
        </div>
      </div>

      {/* 2. SALES OUTLOOK & REVENUE RUN-RATES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sales Outlook & Run-Rates
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 uppercase">
            {salesOutlook.runRateLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Daily Run-Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Daily Run-Rate
            </span>
            <span className="text-base sm:text-lg font-black text-white block">
              {formatGHS(salesOutlook.dailyRunRate)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Avg daily velocity ({salesOutlook.transactionVelocity.toFixed(1)} sales/day)
            </span>
          </div>

          {/* Weekly Run-Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Weekly Run-Rate
            </span>
            <span className="text-base sm:text-lg font-black text-white block">
              {formatGHS(salesOutlook.weeklyRunRate)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Estimated 7-day volume
            </span>
          </div>

          {/* Monthly Run-Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Monthly Run-Rate
            </span>
            <span className="text-base sm:text-lg font-black text-white block">
              {formatGHS(salesOutlook.monthlyRunRate)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Estimated 30-day volume
            </span>
          </div>

          {/* Trend & Projected Comparable Period */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                Projected Next Horizon
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  salesOutlook.trendDirection === 'GROWING'
                    ? 'bg-emerald-950 text-emerald-400'
                    : salesOutlook.trendDirection === 'DECLINING'
                    ? 'bg-rose-950 text-rose-400'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {salesOutlook.trendDirection}
              </span>
            </div>
            <span className="text-base sm:text-lg font-black text-white block">
              {salesOutlook.projectedRevenue !== null
                ? formatGHS(salesOutlook.projectedRevenue)
                : 'Insufficient Data'}
            </span>
            <div className="text-[11px]">
              {salesOutlook.revenueGrowthPct !== null ? (
                <span
                  className={
                    salesOutlook.revenueGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {salesOutlook.revenueGrowthPct >= 0 ? '+' : ''}
                  {salesOutlook.revenueGrowthPct}% vs. prior
                </span>
              ) : (
                <span className="text-slate-500">Baseline established</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. INVENTORY DEMAND & RESTOCK PLANNING (Stage 4G Integration) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Inventory Demand & Restock Planning
            </h4>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            {[
              { id: 'all', label: `All (${inventoryOutlook.totalProductsAssessed})` },
              { id: 'Critical', label: `Critical (${inventoryOutlook.criticalCount})` },
              { id: 'Restock Soon', label: `Restock Soon (${inventoryOutlook.restockSoonCount})` },
              { id: 'Monitor', label: `Monitor (${inventoryOutlook.monitorCount})` },
              { id: 'Adequate', label: `Adequate (${inventoryOutlook.adequateCount})` },
              { id: 'No Current Demand', label: `No Demand (${inventoryOutlook.noDemandCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStockFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  stockFilter === f.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
            No products match the selected restock filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Units Sold (Rate)</th>
                  <th className="p-3">Stock Coverage</th>
                  <th className="p-3">Attention Level</th>
                  <th className="p-3">Demand Trend</th>
                  <th className="p-3 text-right">Reorder Buffer</th>
                  {profitabilityOutlook.isRestricted === false && (
                    <th className="p-3 text-right">Est. Restock Cost</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredProducts.slice(0, isCompact ? 5 : 25).map((prod) => (
                  <tr key={prod.productId} className="hover:bg-slate-900/40 transition">
                    <td className="p-3">
                      <div className="font-bold text-white">{prod.productName}</div>
                      <div className="text-[10px] text-slate-500">
                        {prod.category} {prod.sku ? `• SKU: ${prod.sku}` : ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-mono font-bold ${
                          prod.currentStock <= prod.minStockLevel
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {prod.currentStock} units
                      </span>
                      <div className="text-[10px] text-slate-500">Min: {prod.minStockLevel}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">
                        {prod.historicalUnitsSold} units
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {prod.averageDailyUnitsSold.toFixed(1)} units/day
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-semibold ${
                          prod.daysOfStockCoverage !== null && prod.daysOfStockCoverage <= 3
                            ? 'text-rose-400'
                            : prod.daysOfStockCoverage !== null && prod.daysOfStockCoverage <= 7
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {prod.daysOfStockCoverageLabel}
                      </span>
                      {prod.estimatedDepletionDate && (
                        <div className="text-[10px] text-slate-500">
                          Depletion est: {prod.estimatedDepletionDate}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          prod.restockAttentionLevel === 'Critical'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : prod.restockAttentionLevel === 'Restock Soon'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : prod.restockAttentionLevel === 'Monitor'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : prod.restockAttentionLevel === 'Adequate'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {prod.restockAttentionLevel}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-semibold text-[11px]">
                        {prod.demandTrend === 'INCREASING' && (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {prod.demandTrend === 'DECLINING' && (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{prod.demandTrend}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 max-w-[200px] truncate" title={prod.demandTrendExplanation}>
                        {prod.demandTrendExplanation}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {prod.recommendedReorderUnits > 0 ? (
                        <span className="font-bold text-amber-400">
                          +{prod.recommendedReorderUnits} units
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    {profitabilityOutlook.isRestricted === false && (
                      <td className="p-3 text-right font-mono text-slate-300">
                        {prod.estimatedRestockCost !== undefined
                          ? formatGHS(prod.estimatedRestockCost)
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. CUSTOMER RETENTION & RECEIVABLES OUTLOOK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Retention Outlook */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Customer Outlook & Retention
              </h4>
            </div>
            <span className="text-[10px] text-slate-500">
              {customerOutlook.totalCustomers} total customers
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">At-Risk VIPs</span>
              <span className="text-sm font-bold text-amber-400">
                {customerOutlook.inactiveValuableCount}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Declining Visits</span>
              <span className="text-sm font-bold text-rose-400">
                {customerOutlook.decliningFrequencyCount}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Debtors</span>
              <span className="text-sm font-bold text-blue-400">
                {customerOutlook.debtorsNeedingAttentionCount}
              </span>
            </div>
          </div>

          {customerOutlook.customers.slice(0, 3).map((c) => (
            <div
              key={c.customerId}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{c.customerName}</div>
                <div className="text-[10px] text-slate-400">{c.statusDescription}</div>
              </div>
              <div className="text-right">
                <span className="font-mono text-[11px] text-slate-300">
                  {formatGHS(c.totalHistoricalSpend)}
                </span>
                <div className="text-[10px] text-slate-500">
                  {c.daysSinceLastPurchase} days inactive
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Receivables Outlook */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Credit & Receivables Outlook
              </h4>
            </div>
            <span className="text-[10px] text-slate-500">
              {receivablesOutlook.debtorCount} debtors
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Receivables</span>
              <span className="text-sm font-bold text-white">
                {formatGHS(receivablesOutlook.totalOutstandingReceivables)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Overdue Exposure</span>
              <span className="text-sm font-bold text-rose-400">
                {formatGHS(receivablesOutlook.overdueReceivables)}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            {receivablesOutlook.collectionAttentionSummary}
          </div>

          {receivablesOutlook.topDebtors.slice(0, 2).map((d) => (
            <div
              key={d.customerId}
              className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-slate-200">{d.customerName}</span>
                {d.daysOverdue > 0 && (
                  <span className="ml-2 text-[10px] font-bold text-rose-400">
                    ({d.daysOverdue}d overdue)
                  </span>
                )}
              </div>
              <span className="font-bold text-rose-400">{formatGHS(d.amountOwed)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. EXPENSE & PROFITABILITY OUTLOOK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Outlook */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Operating Expense Outlook
              </h4>
            </div>
            <span className="text-xs font-bold text-white">
              {formatGHS(expenseOutlook.currentExpenses)}
            </span>
          </div>

          {expenseOutlook.trendingUpCategories.length > 0 ? (
            <div className="space-y-2">
              {expenseOutlook.trendingUpCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white">{cat.category}</span>
                    <p className="text-[11px] text-rose-300 mt-0.5">{cat.message}</p>
                  </div>
                  <span className="font-bold text-rose-400">+{cat.growthPct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
              Operating expenses are tracking in line with prior baseline.
            </div>
          )}
        </div>

        {/* Profitability Outlook */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Profitability Outlook
              </h4>
            </div>
            {profitabilityOutlook.isRestricted && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                Restricted (Staff)
              </span>
            )}
          </div>

          {profitabilityOutlook.isRestricted ? (
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <Shield className="w-6 h-6 mx-auto text-slate-500" />
              <p className="font-bold text-slate-300">Financial Privacy Enforced</p>
              <p className="text-[11px] text-slate-500">
                Cost of goods, net profit projections, and gross margins require authorized financial access.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Projected Gross Profit</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatGHS(profitabilityOutlook.projectedGrossProfit)}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    Margin: {profitabilityOutlook.projectedGrossMargin?.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Projected Net Profit</span>
                  <span
                    className={`text-sm font-bold ${
                      (profitabilityOutlook.projectedNetProfit || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatGHS(profitabilityOutlook.projectedNetProfit)}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    Trend: {profitabilityOutlook.marginTrend}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                {profitabilityOutlook.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. BUSINESS PLANNING SCENARIOS (Interactive What-If Modeling) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">Business Planning Scenarios</h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 uppercase">
                  SCENARIO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mathematical simulations for strategic planning. Not guaranteed outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Custom Simulator Controls */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Interactive Scenario Controls
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Simulate Sales Change:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {customSalesPct >= 0 ? `+${customSalesPct}%` : `${customSalesPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={customSalesPct}
                onChange={(e) => setCustomSalesPct(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Simulate Expense Delta:</span>
                <span className="font-bold text-rose-400 font-mono">
                  {customExpenseDelta >= 0
                    ? `+GH₵ ${customExpenseDelta}`
                    : `-GH₵ ${Math.abs(customExpenseDelta)}`}
                </span>
              </div>
              <input
                type="range"
                min="-2000"
                max="2000"
                step="100"
                value={customExpenseDelta}
                onChange={(e) => setCustomExpenseDelta(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleApplyCustomScenario}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-sm"
            >
              Recalculate Scenarios
            </button>
          </div>
        </div>

        {/* Scenarios Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Scenario</th>
                <th className="p-3">Sales Adj</th>
                <th className="p-3">Expense Delta</th>
                <th className="p-3 text-right">Est. Revenue</th>
                <th className="p-3 text-right">Est. Expenses</th>
                {profitabilityOutlook.isRestricted === false && (
                  <>
                    <th className="p-3 text-right">Est. Net Profit</th>
                    <th className="p-3 text-right">Est. Margin</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {scenarios.map((sc, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="p-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{sc.scenarioName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase">
                        SCENARIO
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{sc.description}</div>
                  </td>
                  <td className="p-3 font-mono font-semibold">
                    {sc.salesAdjustmentPct >= 0
                      ? `+${sc.salesAdjustmentPct}%`
                      : `${sc.salesAdjustmentPct}%`}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {sc.expenseDeltaGHS >= 0
                      ? `+GH₵ ${sc.expenseDeltaGHS}`
                      : `-GH₵ ${Math.abs(sc.expenseDeltaGHS)}`}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {formatGHS(sc.estimatedRevenue)}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">
                    {formatGHS(sc.estimatedExpenses)}
                  </td>
                  {profitabilityOutlook.isRestricted === false && (
                    <>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">
                        {formatGHS(sc.estimatedNetProfit)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        {sc.estimatedGrossMargin !== undefined
                          ? `${sc.estimatedGrossMargin.toFixed(1)}%`
                          : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
