import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Users,
  Calendar,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  CreditCard,
  Building2,
  Sparkles,
  ChevronRight,
  Filter,
  BarChart3,
  Layers,
  ShoppingBag,
  ExternalLink,
  Target,
  Flame,
  UserX,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  GrowthDecisionSupportPayload,
  ProductPerformanceIntelligenceItem,
  BusinessGrowthSignal,
  ManagementActionRecommendation,
  CategoryIntelligenceItem,
  BusinessHealthIndicator,
  Business,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { PlanningOutlookView } from './PlanningOutlookView.js';

interface GrowthIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onNavigate?: (view: string) => void;
  initialRange?: string;
}

const PRESET_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year', label: 'This Year' },
];

export const GrowthIntelligenceModal: React.FC<GrowthIntelligenceModalProps> = ({
  isOpen,
  onClose,
  business,
  onNavigate,
  initialRange = 'this_month',
}) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<string>(initialRange);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customMode, setCustomMode] = useState(false);

  const [data, setData] = useState<GrowthDecisionSupportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active section tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'planning' | 'products' | 'categories' | 'customers' | 'operations' | 'signals'
  >('overview');

  // Product cohort sub-tab
  const [productTab, setProductTab] = useState<
    'top_revenue' | 'fast_movers' | 'top_profit' | 'stock_risk' | 'declining' | 'slow' | 'never_sold'
  >('top_revenue');

  const currency = business?.currency || 'GH₵';

  const formatGHS = (val?: number) => {
    const num = Number(val) || 0;
    return `${currency} ${num.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { range?: string; startDate?: string; endDate?: string } = {};
      if (customMode && startDate && endDate) {
        params.range = 'custom';
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.range = selectedRange;
      }

      const res = await api.getGrowthIntelligence(params);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load business growth intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, selectedRange, customMode]);

  if (!isOpen) return null;

  const handleActionClick = (link?: string) => {
    if (!link || !onNavigate) return;
    const viewName = link.replace('/', '');
    onClose();
    onNavigate(viewName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="growth-modal-title"
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="growth-modal-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Decision Support & Growth Intelligence
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 uppercase tracking-wide">
                    Stage 4J
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authoritative decision-support analytics grounded strictly in Ghana business time (Africa/Accra)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DATE RANGE FILTER BAR */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setCustomMode(false);
                  setSelectedRange(r.id);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  !customMode && selectedRange === r.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setCustomMode(!customMode)}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                customMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Custom Range</span>
            </button>
          </div>

          {customMode && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white text-xs px-2 py-1 outline-none"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white text-xs px-2 py-1 outline-none"
              />
              <button
                onClick={fetchData}
                disabled={!startDate || !endDate}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 transition"
              >
                Apply
              </button>
            </div>
          )}

          {data && (
            <div className="text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Active Range: <strong className="text-slate-200">{data.dateRange.label}</strong>
              </span>
              {data.dateRange.hasComparison && data.dateRange.comparisonRange && (
                <span className="text-slate-500 text-[11px]">
                  (vs. {data.dateRange.comparisonRange.label})
                </span>
              )}
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 sm:px-6 border-b border-slate-800 bg-slate-900/60 flex space-x-1 sm:space-x-3 overflow-x-auto text-xs font-bold scrollbar-none">
          {[
            { id: 'overview', label: 'Executive Health & KPIs', icon: BarChart3 },
            { id: 'planning', label: 'Planning & Forecasting', icon: Sparkles },
            { id: 'signals', label: 'Growth Signals & Actions', icon: Target },
            { id: 'products', label: 'Product Velocity & Cohorts', icon: Package },
            { id: 'categories', label: 'Category Mix', icon: Layers },
            { id: 'customers', label: 'Customer Retention & VIPs', icon: Users },
            { id: 'operations', label: 'Operating Time & Overheads', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading && !data ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-300">
                Crunching authoritative Ghana sales intelligence...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
              <p className="text-sm text-rose-300 font-semibold">{error}</p>
              <button
                onClick={fetchData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Try Again
              </button>
            </div>
          ) : data ? (
            <>
              {/* TAB 1: EXECUTIVE HEALTH & KPIS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* BUSINESS HEALTH SUMMARY BANNER */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                            Comprehensive Business Health Index
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              data.healthSummary.overallHealth === 'Excellent'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : data.healthSummary.overallHealth === 'Good'
                                ? 'bg-blue-950 text-blue-300 border-blue-700'
                                : data.healthSummary.overallHealth === 'Attention Needed'
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-rose-950 text-rose-300 border-rose-700'
                            }`}
                          >
                            {data.healthSummary.overallHealth} ({data.healthSummary.score}/100)
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium mt-1">
                          {data.healthSummary.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-10 w-32 bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              data.healthSummary.score >= 80
                                ? 'bg-emerald-500'
                                : data.healthSummary.score >= 65
                                ? 'bg-blue-500'
                                : data.healthSummary.score >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${data.healthSummary.score}%` }}
                          />
                        </div>
                        <span className="text-base font-black text-white">
                          {data.healthSummary.score}%
                        </span>
                      </div>
                    </div>

                    {/* 7 HEALTH INDICATORS TILES */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2">
                      {(Object.values(data.healthSummary.indicators) as BusinessHealthIndicator[]).map((ind, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1 hover:border-slate-700 transition"
                        >
                          <span className="text-[10px] text-slate-400 font-bold block truncate">
                            {ind.name}
                          </span>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-black ${
                                ind.color === 'emerald'
                                  ? 'text-emerald-400'
                                  : ind.color === 'blue'
                                  ? 'text-blue-400'
                                  : ind.color === 'amber'
                                  ? 'text-amber-400'
                                  : ind.color === 'rose'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {ind.status}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {ind.score}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5" title={ind.insight}>
                            {ind.metric}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4 COMPARATIVE GROWTH KPI CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Card */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Sales Revenue
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-white">
                        {formatGHS(data.salesIntelligence.totalRevenue)}
                      </div>
                      {data.salesIntelligence.hasComparison ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          {data.salesIntelligence.revenueGrowthPct !== null &&
                          data.salesIntelligence.revenueGrowthPct >= 0 ? (
                            <span className="inline-flex items-center text-emerald-400 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              +{data.salesIntelligence.revenueGrowthPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {data.salesIntelligence.revenueGrowthPct?.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-slate-500 text-[11px]">
                            ({formatGHS(data.salesIntelligence.revenueGrowthDelta)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {data.dateRange.comparisonReason || 'Single period view'}
                        </span>
                      )}
                    </div>

                    {/* Transactions Card */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Completed Sales
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-white">
                        {data.salesIntelligence.transactionCount.toLocaleString()}
                      </div>
                      {data.salesIntelligence.hasComparison ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          {data.salesIntelligence.transactionGrowthPct !== null &&
                          data.salesIntelligence.transactionGrowthPct >= 0 ? (
                            <span className="inline-flex items-center text-emerald-400 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              +{data.salesIntelligence.transactionGrowthPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {data.salesIntelligence.transactionGrowthPct?.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-slate-500 text-[11px]">
                            vs. {data.salesIntelligence.previousTransactions ?? 0} prev
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Individual checkout receipts</span>
                      )}
                    </div>

                    {/* Units Sold Card */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Total Units Sold
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                          <Package className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-white">
                        {data.salesIntelligence.unitsSold.toLocaleString()}
                      </div>
                      {data.salesIntelligence.hasComparison ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          {data.salesIntelligence.unitsGrowthPct !== null &&
                          data.salesIntelligence.unitsGrowthPct >= 0 ? (
                            <span className="inline-flex items-center text-emerald-400 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              +{data.salesIntelligence.unitsGrowthPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {data.salesIntelligence.unitsGrowthPct?.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-slate-500 text-[11px]">items moved</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Total item volume</span>
                      )}
                    </div>

                    {/* Average Transaction Value (Basket Size) */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Avg Basket Size (ATV)
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-white">
                        {formatGHS(data.salesIntelligence.averageTransactionValue)}
                      </div>
                      {data.salesIntelligence.hasComparison ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          {data.salesIntelligence.atvGrowthDelta >= 0 ? (
                            <span className="inline-flex items-center text-emerald-400 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              +{formatGHS(data.salesIntelligence.atvGrowthDelta)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {formatGHS(data.salesIntelligence.atvGrowthDelta)}
                            </span>
                          )}
                          <span className="text-slate-500 text-[11px]">per sale</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Average spend per checkout</span>
                      )}
                    </div>
                  </div>

                  {/* FINANCIAL PROFITABILITY STATUS (PRIVACY RESPECTED) */}
                  <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Operating Profitability Summary
                        </h3>
                      </div>
                      {data.profitabilityIntelligence.isRestricted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                          Financial Privacy Restricted
                        </span>
                      )}
                    </div>

                    {!data.profitabilityIntelligence.isRestricted ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Gross Profit
                          </span>
                          <span className="text-base font-black text-emerald-400 mt-0.5 block">
                            {formatGHS(data.profitabilityIntelligence.grossProfit)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Margin: {data.profitabilityIntelligence.grossMargin}%
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Operating Expenses
                          </span>
                          <span className="text-base font-black text-rose-400 mt-0.5 block">
                            {formatGHS(data.profitabilityIntelligence.operatingExpenses)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {data.expenseIntelligence.expenseCount} recorded expenses
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Estimated Net Profit
                          </span>
                          <span
                            className={`text-base font-black mt-0.5 block ${
                              (data.profitabilityIntelligence.netProfit ?? 0) >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {formatGHS(data.profitabilityIntelligence.netProfit)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Net Margin: {data.profitabilityIntelligence.netMargin}%
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Profit Trend
                          </span>
                          <div className="mt-1">
                            {data.profitabilityIntelligence.profitGrowthPct !== null &&
                            data.profitabilityIntelligence.profitGrowthPct !== undefined ? (
                              <span
                                className={`text-xs font-bold inline-flex items-center ${
                                  data.profitabilityIntelligence.profitGrowthPct >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {data.profitabilityIntelligence.profitGrowthPct >= 0 ? '+' : ''}
                                {data.profitabilityIntelligence.profitGrowthPct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Stable Baseline</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            vs. {data.salesIntelligence.comparisonLabel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800/80">
                        Detailed COGS, Gross Profit, and Operating Margins are restricted to Business Owners and Authorized Managers.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 4K: PLANNING & FORECASTING OUTLOOK */}
              {activeTab === 'planning' && (
                <PlanningOutlookView
                  business={business}
                  onNavigate={(view) => {
                    onClose();
                    onNavigate?.(view);
                  }}
                  initialRange={selectedRange}
                />
              )}

              {/* TAB 2: GROWTH SIGNALS & ACTIONS */}
              {activeTab === 'signals' && (
                <div className="space-y-6">
                  {/* SIGNALS SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">
                          Active Business Growth Signals ({data.growthSignals.length})
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        Rule-based deterministic triggers from sales & inventory velocity
                      </span>
                    </div>

                    {data.growthSignals.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.growthSignals.map((sig) => (
                          <div
                            key={sig.id}
                            className={`p-4 rounded-2xl border transition ${
                              sig.severity === 'critical'
                                ? 'bg-rose-950/30 border-rose-800/60'
                                : sig.severity === 'warning'
                                ? 'bg-amber-950/30 border-amber-800/60'
                                : sig.severity === 'positive'
                                ? 'bg-emerald-950/30 border-emerald-800/60'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    sig.severity === 'critical'
                                      ? 'bg-rose-500 animate-ping'
                                      : sig.severity === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <h4 className="text-sm font-bold text-white">{sig.title}</h4>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  sig.severity === 'critical'
                                    ? 'bg-rose-900/60 text-rose-300'
                                    : sig.severity === 'warning'
                                    ? 'bg-amber-900/60 text-amber-300'
                                    : 'bg-emerald-900/60 text-emerald-300'
                                }`}
                              >
                                {sig.severity}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mt-2 font-medium">
                              {sig.reason}
                            </p>

                            <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-mono text-[11px]">
                                {sig.supportingMetric}
                              </span>
                              {sig.actionLink && (
                                <button
                                  onClick={() => handleActionClick(sig.actionLink)}
                                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-xs"
                                >
                                  <span>Review</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                        <p className="text-sm font-semibold text-slate-300 mt-2">
                          All operational signals nominal
                        </p>
                        <p className="text-xs text-slate-500">
                          No revenue contractions or stock risks detected for this range.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RECOMMENDATIONS SECTION (ADVISORY ONLY) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Management Action Recommendations ({data.recommendations.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 italic">
                        Advisory only — you retain full business control
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {rec.category.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {rec.urgency && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      rec.urgency === 'immediate'
                                        ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                        : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                    }`}
                                  >
                                    {rec.urgency}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                  {rec.impact} impact
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5">{rec.title}</h4>
                            <p className="text-xs text-slate-400 mt-1">{rec.description}</p>
                          </div>

                          {rec.actionLink && (
                            <div className="pt-2 mt-2 border-t border-slate-800/60">
                              <button
                                onClick={() => handleActionClick(rec.actionLink)}
                                className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-700 text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
                              >
                                <span>{rec.actionLabel || 'Take Action'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCT VELOCITY & COHORTS */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  {/* COHORT SUB-SELECTOR */}
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {[
                      { id: 'top_revenue', label: 'Top Revenue (Best Sellers)', count: data.topRevenueProducts.length },
                      { id: 'fast_movers', label: 'Fast Moving (Velocity)', count: data.fastestMovingProducts.length },
                      ...(data.topProfitProducts ? [{ id: 'top_profit', label: 'Top Gross Profit', count: data.topProfitProducts.length }] : []),
                      { id: 'stock_risk', label: 'Stock-Out Risk (Fast Movers)', count: data.lowStockFastMovers.length, badgeColor: 'rose' },
                      { id: 'declining', label: 'Declining Volume', count: data.decliningProducts.length },
                      { id: 'slow', label: 'Slow Moving', count: data.slowMovingProducts.length },
                      { id: 'never_sold', label: 'Zero Sales (Deadstock)', count: data.neverSoldProducts.length },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setProductTab(sub.id as any)}
                        className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                          productTab === sub.id
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{sub.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            sub.badgeColor === 'rose'
                              ? 'bg-rose-900/80 text-rose-200'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {sub.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* COHORT TABLE */}
                  {(() => {
                    let items: ProductPerformanceIntelligenceItem[] = [];
                    if (productTab === 'top_revenue') items = data.topRevenueProducts;
                    else if (productTab === 'fast_movers') items = data.fastestMovingProducts;
                    else if (productTab === 'top_profit') items = data.topProfitProducts || [];
                    else if (productTab === 'stock_risk') items = data.lowStockFastMovers;
                    else if (productTab === 'declining') items = data.decliningProducts;
                    else if (productTab === 'slow') items = data.slowMovingProducts;
                    else if (productTab === 'never_sold') items = data.neverSoldProducts;

                    if (items.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                          <Package className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="text-sm font-semibold text-slate-300 mt-2">
                            No products match this cohort
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="py-3 px-4">Product</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-3">Units Sold</th>
                              <th className="py-3 px-3">Velocity (Units/Day)</th>
                              <th className="py-3 px-3">Revenue</th>
                              {items[0].grossProfit !== undefined && (
                                <th className="py-3 px-3">Gross Profit</th>
                              )}
                              <th className="py-3 px-3">Stock Available</th>
                              <th className="py-3 px-3">Coverage (Days)</th>
                              <th className="py-3 px-3">Trend</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {items.map((p) => (
                              <tr key={p.productId} className="hover:bg-slate-900/40 transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white">{p.productName}</div>
                                  {p.sku && <div className="text-[10px] text-slate-500 font-mono">{p.sku}</div>}
                                </td>
                                <td className="py-3 px-3 text-slate-400">{p.category}</td>
                                <td className="py-3 px-3 font-bold text-slate-200">
                                  {p.unitsSold.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                                  {p.velocity.toFixed(1)}/day
                                </td>
                                <td className="py-3 px-3 font-bold text-white">
                                  {formatGHS(p.revenueGenerated)}
                                </td>
                                {p.grossProfit !== undefined && (
                                  <td className="py-3 px-3 font-bold text-emerald-400">
                                    {formatGHS(p.grossProfit)}
                                    <span className="text-[10px] text-slate-500 block">
                                      ({p.grossMargin}%)
                                    </span>
                                  </td>
                                )}
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                      p.stockCurrentlyAvailable <= p.minStockLevel
                                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {p.stockCurrentlyAvailable} units
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {p.stockCoverageDays !== null ? (
                                    <span
                                      className={`font-semibold ${
                                        p.stockCoverageDays <= 7
                                          ? 'text-rose-400'
                                          : p.stockCoverageDays <= 14
                                          ? 'text-amber-400'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      ~{p.stockCoverageDays} days
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Stable</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      p.trend === 'Growing'
                                        ? 'bg-emerald-950 text-emerald-400'
                                        : p.trend === 'Declining'
                                        ? 'bg-rose-950 text-rose-400'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {p.trend}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: CATEGORY MIX */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {data.strongestCategory && (
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">
                          Strongest Revenue Category
                        </span>
                        <div className="text-base font-black text-white">
                          {data.strongestCategory.category}
                        </div>
                        <div className="text-xs text-emerald-300 font-bold">
                          {formatGHS(data.strongestCategory.revenue)} ({data.strongestCategory.unitsSold} units)
                        </div>
                      </div>
                    )}
                    {data.fastestGrowingCategory && (
                      <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-400">
                          Fastest Growing Category
                        </span>
                        <div className="text-base font-black text-white">
                          {data.fastestGrowingCategory.category}
                        </div>
                        <div className="text-xs text-blue-300 font-bold">
                          +{data.fastestGrowingCategory.revenueGrowthPct?.toFixed(1)}% vs. previous
                        </div>
                      </div>
                    )}
                    {data.inventoryPressureCategory && (
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          Highest Stockout Exposure
                        </span>
                        <div className="text-base font-black text-white">
                          {data.inventoryPressureCategory.category}
                        </div>
                        <div className="text-xs text-amber-300">
                          Requires replenishment attention
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-3">Products</th>
                          <th className="py-3 px-3">Units Sold</th>
                          <th className="py-3 px-3">Transactions</th>
                          <th className="py-3 px-3">Revenue</th>
                          <th className="py-3 px-3">Stock Exposure</th>
                          <th className="py-3 px-3">Growth %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {data.categoryIntelligence.map((c) => (
                          <tr key={c.category} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-4 font-bold text-white">{c.category}</td>
                            <td className="py-3 px-3 text-slate-300">{c.productCount}</td>
                            <td className="py-3 px-3 text-slate-200 font-semibold">{c.unitsSold}</td>
                            <td className="py-3 px-3 text-slate-300">{c.transactionCount}</td>
                            <td className="py-3 px-3 font-bold text-white">{formatGHS(c.revenue)}</td>
                            <td className="py-3 px-3 text-slate-400">{c.stockExposure} in stock</td>
                            <td className="py-3 px-3">
                              {c.revenueGrowthPct !== null && c.revenueGrowthPct !== undefined ? (
                                <span
                                  className={`font-bold ${
                                    c.revenueGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {c.revenueGrowthPct >= 0 ? '+' : ''}
                                  {c.revenueGrowthPct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: CUSTOMER RETENTION & VIPS */}
              {activeTab === 'customers' && (
                <div className="space-y-6">
                  {/* METRICS TILES */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Active Buyers in Range
                      </span>
                      <span className="text-lg font-black text-white mt-1 block">
                        {data.customerIntelligence.activeCustomersCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        New Customers
                      </span>
                      <span className="text-lg font-black text-emerald-400 mt-1 block">
                        {data.customerIntelligence.newCustomersCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Returning Buyers
                      </span>
                      <span className="text-lg font-black text-blue-400 mt-1 block">
                        {data.customerIntelligence.returningCustomersCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Repeat Buyer Rate
                      </span>
                      <span className="text-lg font-black text-purple-400 mt-1 block">
                        {data.customerIntelligence.returningCustomerRatePct}%
                      </span>
                    </div>
                  </div>

                  {/* INACTIVE VALUABLE CUSTOMERS (RETENTION TARGETS) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-rose-400" />
                        <h3 className="text-sm font-bold text-white">
                          Inactive Valuable Clients (30+ Days Since Last Purchase)
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        Priority list for WhatsApp/Call reactivation
                      </span>
                    </div>

                    {data.customerIntelligence.inactiveValuableCustomers.length > 0 ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="py-3 px-4">Client Name</th>
                              <th className="py-3 px-3">Phone</th>
                              <th className="py-3 px-3">Lifetime Value (CLV)</th>
                              <th className="py-3 px-3">Past Orders</th>
                              <th className="py-3 px-3">Days Inactive</th>
                              <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {data.customerIntelligence.inactiveValuableCustomers.map((c) => (
                              <tr key={c.customerId} className="hover:bg-slate-900/40 transition">
                                <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                                <td className="py-3 px-3 text-slate-400 font-mono">{c.phone || '—'}</td>
                                <td className="py-3 px-3 font-bold text-emerald-400">{formatGHS(c.clv)}</td>
                                <td className="py-3 px-3 text-slate-300">{c.totalOrders} checkouts</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 font-bold text-[11px]">
                                    {c.daysSinceLastPurchase} days ago
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {c.phone && (
                                    <a
                                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900 transition"
                                    >
                                      <span>Message</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 text-xs">
                        All your high-value clients have shopped recently!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: OPERATIONS, TIME & EXPENSES */}
              {activeTab === 'operations' && (
                <div className="space-y-6">
                  {/* OPERATING TIME INSIGHTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">
                          Peak Hourly Traffic
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 font-bold text-xs">
                          {data.timeIntelligence.peakOperatingHours.peakHourLabel}
                        </span>
                      </div>
                      <div className="text-base font-black text-white">
                        {data.timeIntelligence.peakOperatingHours.busiestTimeOfDay}
                      </div>
                      <p className="text-xs text-slate-400">
                        Peak hour yielded {formatGHS(data.timeIntelligence.peakOperatingHours.totalRevenue)} across {data.timeIntelligence.peakOperatingHours.salesCount} customer sales.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">
                          Weekly Rhythm
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-400 font-bold text-xs">
                          Busiest: {data.timeIntelligence.busiestDay.dayName}
                        </span>
                      </div>
                      <div className="text-base font-black text-white">
                        Slowest Day: {data.timeIntelligence.slowestDay.dayName}
                      </div>
                      <p className="text-xs text-slate-400">
                        Plan restocking or promotional efforts around your slowest trading days.
                      </p>
                    </div>
                  </div>

                  {/* PAYMENT METHOD REALIZATION */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase">
                      Payment Channels Breakdown
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {data.paymentIntelligence.map((pm) => (
                        <div key={pm.method} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-xs font-bold text-slate-300 block">{pm.method}</span>
                          <span className="text-sm font-black text-white mt-1 block">
                            {formatGHS(pm.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {pm.percentage}% of sales ({pm.count} transactions)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EXPENSE CATEGORY BREAKDOWN */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">
                        Operating Expense Allocation
                      </h4>
                      <span className="text-xs font-bold text-rose-400">
                        Total: {formatGHS(data.expenseIntelligence.totalExpenses)}
                      </span>
                    </div>

                    {data.expenseIntelligence.categoryBreakdown.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {data.expenseIntelligence.categoryBreakdown.map((exp) => (
                          <div key={exp.category} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-xs font-bold text-slate-300 block">{exp.category}</span>
                            <span className="text-sm font-black text-rose-400 mt-1 block">
                              {formatGHS(exp.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400">{exp.percentage}% of expenses</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">
                        No expenses logged for this time range.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 text-center sm:text-left">
            Empowering Ghanaian businesses with actionable, privacy-guarded growth intelligence.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
