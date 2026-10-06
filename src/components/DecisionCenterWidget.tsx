import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  Target,
  Flame,
  Shield,
  RefreshCw,
  ExternalLink,
  Layers,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  GrowthDecisionSupportPayload,
  BusinessForecastPayload,
  Business,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

interface DecisionCenterWidgetProps {
  business: Business | null;
  onNavigate: (view: string) => void;
  onOpenDetailedIntelligence: () => void;
}

const QUICK_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year', label: 'This Year' },
];

export const DecisionCenterWidget: React.FC<DecisionCenterWidgetProps> = ({
  business,
  onNavigate,
  onOpenDetailedIntelligence,
}) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<string>('this_month');
  const [intelligence, setIntelligence] = useState<GrowthDecisionSupportPayload | null>(null);
  const [forecast, setForecast] = useState<BusinessForecastPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = business?.currency || 'GH₵';

  const formatGHS = (val?: number) => {
    const num = Number(val) || 0;
    return `${currency} ${num.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const fetchIntelligence = async (range: string) => {
    try {
      setLoading(true);
      setError(null);
      const [intelRes, forecastRes] = await Promise.allSettled([
        api.getGrowthIntelligence({ range }),
        api.getBusinessForecast({ range }),
      ]);

      if (intelRes.status === 'fulfilled') {
        setIntelligence(intelRes.value);
      } else {
        throw new Error(intelRes.reason?.message || 'Failed to load business intelligence.');
      }

      if (forecastRes.status === 'fulfilled') {
        setForecast(forecastRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load business intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence(selectedRange);
  }, [selectedRange]);

  const handleActionClick = (link?: string) => {
    if (!link) return;
    const viewName = link.replace('/', '');
    onNavigate(viewName);
  };

  return (
    <div
      id="decision-center-widget"
      className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm space-y-5"
    >
      {/* HEADER WITH TITLE & RANGE BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                Business Intelligence & Decision Center
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 uppercase">
                Decision Support
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sales velocity, growth signals, and advisory management actions
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  selectedRange === r.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchIntelligence(selectedRange)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !intelligence ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto text-emerald-400 animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Evaluating sales performance...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60 text-center text-xs text-rose-300">
          {error}
        </div>
      ) : intelligence ? (
        <div className="space-y-5">
          {/* COMPOSITE HEALTH SCORE BAR */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border ${
                  intelligence.healthSummary.overallHealth === 'Excellent'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : intelligence.healthSummary.overallHealth === 'Good'
                    ? 'bg-blue-950 text-blue-400 border-blue-700'
                    : intelligence.healthSummary.overallHealth === 'Attention Needed'
                    ? 'bg-amber-950 text-amber-400 border-amber-700'
                    : 'bg-rose-950 text-rose-400 border-rose-700'
                }`}
              >
                {intelligence.healthSummary.score}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    Overall Health: {intelligence.healthSummary.overallHealth}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({intelligence.dateRange.label})
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {intelligence.healthSummary.summary}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenDetailedIntelligence}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition whitespace-nowrap self-start sm:self-auto"
            >
              <span>Explore Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 COMPARATIVE TREND CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sales Revenue */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Revenue in Range
              </span>
              <span className="text-base sm:text-lg font-black text-white block">
                {formatGHS(intelligence.salesIntelligence.totalRevenue)}
              </span>
              <div className="text-[11px]">
                {intelligence.salesIntelligence.hasComparison &&
                intelligence.salesIntelligence.revenueGrowthPct !== null ? (
                  <span
                    className={`font-bold inline-flex items-center ${
                      intelligence.salesIntelligence.revenueGrowthPct >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {intelligence.salesIntelligence.revenueGrowthPct >= 0 ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {intelligence.salesIntelligence.revenueGrowthPct >= 0 ? '+' : ''}
                    {intelligence.salesIntelligence.revenueGrowthPct.toFixed(1)}% vs. prev
                  </span>
                ) : (
                  <span className="text-slate-500">Active period</span>
                )}
              </div>
            </div>

            {/* Completed Sales */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Sales Volume
              </span>
              <span className="text-base sm:text-lg font-black text-white block">
                {intelligence.salesIntelligence.transactionCount.toLocaleString()}
              </span>
              <div className="text-[11px]">
                {intelligence.salesIntelligence.hasComparison &&
                intelligence.salesIntelligence.transactionGrowthPct !== null ? (
                  <span
                    className={`font-bold inline-flex items-center ${
                      intelligence.salesIntelligence.transactionGrowthPct >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {intelligence.salesIntelligence.transactionGrowthPct >= 0 ? '+' : ''}
                    {intelligence.salesIntelligence.transactionGrowthPct.toFixed(1)}% count
                  </span>
                ) : (
                  <span className="text-slate-500">Transactions</span>
                )}
              </div>
            </div>

            {/* Units Sold */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Units Moved
              </span>
              <span className="text-base sm:text-lg font-black text-white block">
                {intelligence.salesIntelligence.unitsSold.toLocaleString()}
              </span>
              <div className="text-[11px]">
                {intelligence.salesIntelligence.hasComparison &&
                intelligence.salesIntelligence.unitsGrowthPct !== null ? (
                  <span
                    className={`font-bold inline-flex items-center ${
                      intelligence.salesIntelligence.unitsGrowthPct >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {intelligence.salesIntelligence.unitsGrowthPct >= 0 ? '+' : ''}
                    {intelligence.salesIntelligence.unitsGrowthPct.toFixed(1)}% units
                  </span>
                ) : (
                  <span className="text-slate-500">Total items</span>
                )}
              </div>
            </div>

            {/* Average Basket Size */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Avg Basket (ATV)
              </span>
              <span className="text-base sm:text-lg font-black text-white block">
                {formatGHS(intelligence.salesIntelligence.averageTransactionValue)}
              </span>
              <div className="text-[11px]">
                {intelligence.salesIntelligence.hasComparison ? (
                  <span
                    className={`font-bold ${
                      intelligence.salesIntelligence.atvGrowthDelta >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {intelligence.salesIntelligence.atvGrowthDelta >= 0 ? '+' : ''}
                    {formatGHS(intelligence.salesIntelligence.atvGrowthDelta)}
                  </span>
                ) : (
                  <span className="text-slate-500">Per transaction</span>
                )}
              </div>
            </div>
          </div>

          {/* STAGE 4K: OWNER PLANNING & FORECASTING OUTLOOK */}
          {forecast && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Sales Outlook & Run-Rate Projections
                  </h4>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 uppercase">
                    {forecast.salesOutlook.runRateLabel}
                  </span>
                </div>
                <button
                  onClick={onOpenDetailedIntelligence}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Open Full Planning Center</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Daily Run-Rate</span>
                  <span className="font-bold text-white text-sm">
                    {formatGHS(forecast.salesOutlook.dailyRunRate)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Avg daily rate</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Monthly Run-Rate</span>
                  <span className="font-bold text-white text-sm">
                    {formatGHS(forecast.salesOutlook.monthlyRunRate)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">30-day projection</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Trend Direction</span>
                  <span
                    className={`font-bold text-xs px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                      forecast.salesOutlook.trendDirection === 'GROWING'
                        ? 'bg-emerald-950 text-emerald-400'
                        : forecast.salesOutlook.trendDirection === 'DECLINING'
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {forecast.salesOutlook.trendDirection}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Confidence: {forecast.metadata.confidenceIndicator}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Restock Priority</span>
                  <span
                    className={`font-bold text-sm block ${
                      forecast.inventoryOutlook.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {forecast.inventoryOutlook.criticalCount} Critical
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {forecast.inventoryOutlook.restockSoonCount} Restock soon
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DUAL COLUMN: GROWTH SIGNALS & URGENT RECOMMENDATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GROWTH SIGNALS & ATTENTION NEEDED */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Attention & Signals ({intelligence.growthSignals.length})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500">Algorithmic</span>
              </div>

              {intelligence.growthSignals.length > 0 ? (
                <div className="space-y-2.5">
                  {intelligence.growthSignals.slice(0, 3).map((sig) => (
                    <div
                      key={sig.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        sig.severity === 'critical'
                          ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                          : sig.severity === 'warning'
                          ? 'bg-amber-950/20 border-amber-800/50 text-amber-300'
                          : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{sig.title}</span>
                        <span className="text-[10px] uppercase">{sig.severity}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{sig.reason}</p>
                      {sig.actionLink && (
                        <div className="pt-1 text-right">
                          <button
                            onClick={() => handleActionClick(sig.actionLink)}
                            className="text-emerald-400 hover:underline font-bold text-[11px] inline-flex items-center gap-0.5"
                          >
                            <span>Act Now</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No critical signals detected for this period.
                </div>
              )}
            </div>

            {/* TOP RECOMMENDED ACTIONS */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Recommended Actions ({intelligence.recommendations.length})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 italic">Advisory</span>
              </div>

              {intelligence.recommendations.length > 0 ? (
                <div className="space-y-2.5">
                  {intelligence.recommendations.slice(0, 3).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{rec.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                            {rec.impact}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{rec.description}</p>
                      </div>

                      {rec.actionLink && (
                        <button
                          onClick={() => handleActionClick(rec.actionLink)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold transition whitespace-nowrap"
                        >
                          {rec.actionLabel || 'Go'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Operations are currently running smoothly.
                </div>
              )}
            </div>
          </div>

          {/* QUICK PERFORMANCE PREVIEW: FASTEST MOVER & STOCKOUT RISK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {intelligence.fastestMovingProducts.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Highest Velocity Product
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block truncate max-w-[200px]">
                    {intelligence.fastestMovingProducts[0].productName}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    {intelligence.fastestMovingProducts[0].velocity.toFixed(1)} units/day sold
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('products')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="View Products"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {intelligence.lowStockFastMovers.length > 0 ? (
              <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase block">
                    Fast Mover At Reorder Threshold
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block truncate max-w-[200px]">
                    {intelligence.lowStockFastMovers[0].productName}
                  </span>
                  <span className="text-[11px] text-rose-300 font-semibold">
                    Only {intelligence.lowStockFastMovers[0].stockCurrentlyAvailable} units left
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('products')}
                  className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[11px] font-bold transition"
                >
                  Restock
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Stock Coverage
                  </span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                    Healthy inventory levels
                  </span>
                  <span className="text-[11px] text-slate-400">
                    No fast-moving items below minimum threshold
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('products')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="View Products"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
