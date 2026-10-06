import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Boxes,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Calendar,
  Wallet,
  ShoppingBag,
  FileText,
  CreditCard,
  PackagePlus,
  Truck,
  CheckCircle2,
  Lock,
  Sparkles,
  RefreshCw,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../services/api.js';
import type { DashboardStats, Sale, Business } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  canAccessFeature,
  getEffectivePlan,
  PLAN_DISPLAY_NAMES,
  type FeatureKey,
} from '../utils/featureAccess.js';
import {
  formatAccraLongDate,
  formatAccraDateTime,
  getAccraToday,
  getAccraGreeting,
} from '../utils/date.js';
import { DecisionCenterWidget } from './DecisionCenterWidget.js';
import { GrowthIntelligenceModal } from './GrowthIntelligenceModal.js';
import { OperationsCenter } from './OperationsCenter.js';

interface DashboardViewProps {
  business: Business | null;
  onNavigate: (view: string) => void;
  onOpenNewSale: () => void;
  onOpenReceipt: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  business: propBusiness,
  onNavigate,
  onOpenNewSale,
  onOpenReceipt,
}) => {
  const { user, business: authBusiness, subscription } = useAuth();
  const business = propBusiness || authBusiness;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [performanceTab, setPerformanceTab] = useState<'sales' | 'comparison'>('sales');
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  const isMasterAdmin = user?.role === 'master_admin';
  const isStaff = user?.role === 'staff';
  const staffPerms = user?.permissions;
  const effectivePlan = getEffectivePlan(subscription, business);

  const currency = business?.currency || 'GH₵';

  // Permission checks
  const canDoPos = !isStaff || staffPerms?.pos_sales !== false;
  const canManageProducts = !isStaff || staffPerms?.manage_products !== false;
  const canViewProducts = !isStaff || (staffPerms?.view_products !== false || staffPerms?.manage_products !== false);
  const canDoCustomers = !isStaff || staffPerms?.customers !== false;
  const canDoExpenses = !isStaff || staffPerms?.expenses !== false;
  const canDoPurchases = !isStaff || staffPerms?.purchases !== false;
  const canDoInvoices = !isStaff || staffPerms?.invoices !== false;
  const canViewDebtors = !isStaff || staffPerms?.debtors !== false;
  const canViewReports = !isStaff || staffPerms?.financial_reports !== false;

  // Subscription checks
  const hasCustomerAccess = canAccessFeature(subscription, 'customers', isMasterAdmin, business);
  const hasPurchasesAccess = canAccessFeature(subscription, 'purchases', isMasterAdmin, business);
  const hasInvoicesAccess = canAccessFeature(subscription, 'invoices', isMasterAdmin, business);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve dashboard metrics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatGHS = (val?: number) => {
    const num = Number(val) || 0;
    return `${currency} ${num.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const todayDateFormatted = formatAccraLongDate(getAccraToday());
  const greeting = getAccraGreeting();
  const businessName = business?.name || 'My Business';

  // SKELETON LOADING STATE
  if (loading && !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-800 rounded w-32" />
            <div className="h-7 bg-slate-800 rounded w-64" />
            <div className="h-4 bg-slate-800/80 rounded w-48" />
          </div>
          <div className="h-10 bg-slate-800 rounded-xl w-36 self-start md:self-center" />
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/70 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-800 rounded w-20" />
                <div className="w-7 h-7 bg-slate-800 rounded-lg" />
              </div>
              <div className="h-6 bg-slate-800 rounded w-24" />
              <div className="h-2.5 bg-slate-800/60 rounded w-16" />
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="h-24 bg-slate-900/50 rounded-2xl border border-slate-800" />

        {/* Performance & Alerts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-900/40 rounded-3xl border border-slate-800" />
          <div className="h-72 bg-slate-900/40 rounded-3xl border border-slate-800" />
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error && !stats) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12 text-center">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Could Not Load Dashboard</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const lowStockCount = stats?.lowStockCount || 0;
  const outOfStockCount = stats?.outOfStockCount || 0;
  const totalNeedingAttention = lowStockCount + outOfStockCount;

  // Stock alerts list
  const stockAlerts = stats?.stockAlerts || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. DASHBOARD HEADER */}
      <div
        id="dashboard-header"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Building2 className="w-4 h-4" />
            <span className="uppercase tracking-wider font-bold">{businessName}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">{business?.location || 'Ghana'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {greeting}, {businessName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400">
            Here&apos;s your business overview for today.
          </p>

          <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-300">{todayDateFormatted}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-[11px] text-slate-400">Ghana Standard Time (Africa/Accra)</span>
          </div>
        </div>

        {/* Subscription Plan Badge & Header Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 md:pt-0">
          <div
            id="subscription-plan-badge"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shadow-inner"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                Plan
              </span>
              <span className="font-bold text-white leading-tight">
                {isMasterAdmin ? 'Master Admin' : PLAN_DISPLAY_NAMES[effectivePlan]}
              </span>
            </div>
            {!isMasterAdmin && effectivePlan !== 'business' && (
              <button
                onClick={() => onNavigate('settings')}
                className="ml-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline transition"
                title="Upgrade Subscription Plan"
              >
                Upgrade
              </button>
            )}
          </div>

          <button
            onClick={() => setShowGrowthModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 text-xs font-bold transition shadow-sm"
            title="Open Decision Support & Growth Intelligence"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Decision Support</span>
          </button>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Refresh metrics"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. KEY BUSINESS METRICS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Today&apos;s Business Metrics
          </h2>
          <span className="text-[11px] text-slate-500">Calculated in Africa/Accra business date</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Today's Sales */}
          <div
            id="metric-today-sales"
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Today&apos;s Sales
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatGHS(stats?.todaySales)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats?.todaySalesCount !== undefined
                  ? `${stats.todaySalesCount} completed sale${stats.todaySalesCount === 1 ? '' : 's'}`
                  : "From today's completed sales"}
              </p>
            </div>
          </div>

          {/* 2. Today's Profit */}
          <div
            id="metric-today-profit"
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Today&apos;s Profit
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {stats?.todayProfit !== undefined ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                    {formatGHS(stats?.todayProfit)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gross profit before expenses</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 py-1">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-400">Restricted</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Requires reports permission</p>
                </>
              )}
            </div>
          </div>

          {/* 3. Today's Expenses */}
          <div
            id="metric-today-expenses"
            onClick={() => canDoExpenses && onNavigate('expenses')}
            className={`p-4 rounded-2xl bg-slate-900 border border-slate-800/90 flex flex-col justify-between transition group shadow-sm ${
              canDoExpenses ? 'hover:border-rose-500/40 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Today&apos;s Expenses
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
                {formatGHS(stats?.todayExpenses)}
              </h3>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] text-slate-400">Recorded today</p>
                {canDoExpenses && (
                  <span className="text-[10px] text-rose-400 font-semibold group-hover:underline flex items-center">
                    Expenses <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Outstanding Debt */}
          <div
            id="metric-outstanding-debt"
            onClick={() => canViewDebtors && onNavigate('debtors')}
            className={`p-4 rounded-2xl bg-slate-900 border border-slate-800/90 flex flex-col justify-between transition group shadow-sm ${
              canViewDebtors ? 'hover:border-amber-500/40 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Outstanding Debt
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  (stats?.moneyOwedToYou || 0) > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {formatGHS(stats?.moneyOwedToYou)}
              </h3>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] text-slate-400">Money owed by customers</p>
                {canViewDebtors && (
                  <span className="text-[10px] text-amber-400 font-semibold group-hover:underline flex items-center">
                    Debtors <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Inventory Value */}
          <div
            id="metric-inventory-value"
            onClick={() => canViewProducts && onNavigate('products')}
            className={`p-4 rounded-2xl bg-slate-900 border border-slate-800/90 flex flex-col justify-between transition group shadow-sm ${
              canViewProducts ? 'hover:border-cyan-500/40 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Inventory Value
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {stats?.inventoryValue !== undefined ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {formatGHS(stats?.inventoryValue)}
                  </h3>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-slate-400">At buying cost</p>
                    {canViewProducts && (
                      <span className="text-[10px] text-cyan-400 font-semibold group-hover:underline flex items-center">
                        {stats?.totalProducts || 0} SKUs <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 py-1">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-400">Restricted</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {stats?.totalProducts || 0} Products in catalog
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 6. Low Stock Items */}
          <div
            id="metric-low-stock"
            onClick={() => canViewProducts && onNavigate('products')}
            className={`p-4 rounded-2xl border flex flex-col justify-between transition group shadow-sm ${
              totalNeedingAttention > 0
                ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-600 cursor-pointer'
                : 'bg-slate-900 border-slate-800/90 hover:border-slate-700 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Low Stock
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                  totalNeedingAttention > 0
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {totalNeedingAttention > 0 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <h3
                  className={`text-xl sm:text-2xl font-black tracking-tight ${
                    totalNeedingAttention > 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {lowStockCount}
                </h3>
                {outOfStockCount > 0 && (
                  <span className="text-xs font-semibold text-rose-400/90">
                    ({outOfStockCount} out)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] text-slate-400">
                  {totalNeedingAttention > 0 ? 'Needs restock' : 'Levels optimal'}
                </p>
                {canViewProducts && (
                  <span className="text-[10px] text-rose-400 font-semibold group-hover:underline flex items-center">
                    Alerts <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS */}
      <div id="quick-actions-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Business Operations
          </h2>
          <span className="text-[11px] text-slate-500">Actions respect role & plan permissions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: New Sale */}
          <button
            id="quick-action-new-sale"
            onClick={() => {
              if (canDoPos) {
                onOpenNewSale();
              }
            }}
            disabled={!canDoPos}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canDoPos
                ? 'bg-emerald-600/95 hover:bg-emerald-500 text-white border-emerald-500/50 hover:shadow-emerald-950/40 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mb-2">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">New Sale</span>
              <span className="text-[10px] text-emerald-100/80 block mt-0.5">
                {canDoPos ? 'Open POS Register' : 'Staff Restricted'}
              </span>
            </div>
          </button>

          {/* Action 2: Add Product */}
          <button
            id="quick-action-add-product"
            onClick={() => {
              if (canManageProducts) {
                onNavigate('products');
              }
            }}
            disabled={!canManageProducts}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canManageProducts
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Add Product</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {canManageProducts ? 'Update Catalog' : 'Staff Restricted'}
              </span>
            </div>
          </button>

          {/* Action 3: Add Customer */}
          <button
            id="quick-action-add-customer"
            onClick={() => {
              if (canDoCustomers) {
                onNavigate('customers');
              }
            }}
            disabled={!canDoCustomers}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canDoCustomers
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              {!hasCustomerAccess && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Starter
                </span>
              )}
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Add Customer</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {canDoCustomers
                  ? hasCustomerAccess
                    ? 'Client Directory'
                    : 'Upgrade Required'
                  : 'Staff Restricted'}
              </span>
            </div>
          </button>

          {/* Action 4: Add Expense */}
          <button
            id="quick-action-add-expense"
            onClick={() => {
              if (canDoExpenses) {
                onNavigate('expenses');
              }
            }}
            disabled={!canDoExpenses}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canDoExpenses
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Add Expense</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {canDoExpenses ? 'Record Outflow' : 'Staff Restricted'}
              </span>
            </div>
          </button>

          {/* Action 5: Add Purchase */}
          <button
            id="quick-action-add-purchase"
            onClick={() => {
              if (canDoPurchases) {
                onNavigate('purchases');
              }
            }}
            disabled={!canDoPurchases}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canDoPurchases
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <PackagePlus className="w-4 h-4" />
              </div>
              {!hasPurchasesAccess && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Starter
                </span>
              )}
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Add Purchase</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {canDoPurchases
                  ? hasPurchasesAccess
                    ? 'Stock Inflow'
                    : 'Upgrade Required'
                  : 'Staff Restricted'}
              </span>
            </div>
          </button>

          {/* Action 6: Create Invoice */}
          <button
            id="quick-action-create-invoice"
            onClick={() => {
              if (canDoInvoices) {
                onNavigate('invoices');
              }
            }}
            disabled={!canDoInvoices}
            className={`p-3.5 rounded-2xl flex flex-col items-start justify-between text-left transition border shadow-sm ${
              canDoInvoices
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              {!hasInvoicesAccess && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[9px] font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Business
                </span>
              )}
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Create Invoice</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {canDoInvoices
                  ? hasInvoicesAccess
                    ? 'Issue B2B Bill'
                    : 'Upgrade Required'
                  : 'Staff Restricted'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 4 & 5. STOCK ALERTS & TOP SELLING PRODUCTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6. STOCK ALERTS SECTION */}
        <div
          id="stock-alerts-section"
          className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Stock Alerts</h3>
                  <p className="text-[11px] text-slate-400">Items needing reorder</p>
                </div>
              </div>
              {canViewProducts && (
                <button
                  onClick={() => onNavigate('products')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Manage Stock
                </button>
              )}
            </div>

            {stockAlerts.length > 0 ? (
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {stockAlerts.map((item) => (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                      item.status === 'out_of_stock'
                        ? 'bg-rose-950/30 border-rose-800/60'
                        : 'bg-amber-950/20 border-amber-800/40'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-200 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Min level: {item.minStockLevel} units &bull; {item.category || 'General'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'out_of_stock'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.quantity === 0 ? 'Out of Stock' : `${item.quantity} left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.totalProducts && stats.totalProducts > 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-200">All stock levels look good.</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No products are currently at or below their minimum reorder thresholds.
                </p>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">No products added yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Add your first product to start tracking inventory.
                </p>
                {canManageProducts && (
                  <button
                    onClick={() => onNavigate('products')}
                    className="mt-2 text-xs font-bold text-emerald-400 hover:underline"
                  >
                    + Add First Product
                  </button>
                )}
              </div>
            )}
          </div>

          {canViewProducts && (
            <button
              onClick={() => onNavigate('products')}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700/60"
            >
              View Full Product Catalog
            </button>
          )}
        </div>

        {/* 5. TOP SELLING PRODUCTS */}
        <div
          id="top-products-section"
          className="lg:col-span-2 p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Top Selling Products</h3>
                <p className="text-[11px] text-slate-400">Based on total quantity sold</p>
              </div>
              {canViewProducts && (
                <button
                  onClick={() => onNavigate('products')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  View Inventory
                </button>
              )}
            </div>

            {stats?.bestSellingProducts && stats.bestSellingProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.bestSellingProducts.map((p, idx) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : idx === 1
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-slate-200 truncate block">
                          {p.productName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.totalQuantity} {p.totalQuantity === 1 ? 'unit' : 'units'} sold
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="font-bold text-emerald-400 block">{formatGHS(p.totalRevenue)}</span>
                      <span className="text-[10px] text-slate-500">Revenue</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Boxes className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">No sales recorded yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Products will rank automatically here once customer sales are processed.
                </p>
                {canDoPos && (
                  <button
                    onClick={onOpenNewSale}
                    className="mt-2 text-xs font-bold text-emerald-400 hover:underline"
                  >
                    + Record First Sale Now
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Tracking active sales transactions</span>
            {canViewReports && (
              <button
                onClick={() => onNavigate('reports')}
                className="text-emerald-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
              >
                Detailed Performance Report <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6B. BUSINESS INTELLIGENCE & DECISION CENTER (STAGE 4J) */}
      <DecisionCenterWidget
        business={business}
        onNavigate={onNavigate}
        onOpenDetailedIntelligence={() => setShowGrowthModal(true)}
      />

      {/* 6C. OPERATIONS CENTER & CONTROLLED WORKFLOWS (STAGE 4L) */}
      <OperationsCenter
        business={business}
        onNavigate={onNavigate}
      />

      {/* 7. BUSINESS PERFORMANCE SECTION */}
      <div id="business-performance-section" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Business Performance (Last 7 Days)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sales, profit, and operating expenses over the recent Ghana business days
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setPerformanceTab('sales')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  performanceTab === 'sales'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sales Trend
              </button>
              <button
                onClick={() => setPerformanceTab('comparison')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  performanceTab === 'comparison'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inflow vs Outflow
              </button>
            </div>

            {canViewReports && (
              <button
                onClick={() => onNavigate('reports')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Full Reports
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Performance Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              7-Day Revenue
            </span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">
              {formatGHS(stats?.past7DaysSales)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              7-Day Net Profit
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 block">
              {formatGHS(stats?.past7DaysProfit)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              7-Day Expenses
            </span>
            <span className="text-base sm:text-lg font-black text-rose-400 mt-0.5 block">
              {formatGHS(stats?.past7DaysExpenses)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Today vs Yesterday
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-200">
                {formatGHS(stats?.todaySales)}
              </span>
              <span className="text-[10px] text-slate-400">
                (Yest: {formatGHS(stats?.yesterdaySales)})
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Display */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {stats?.salesOverTime && stats.salesOverTime.some((d) => d.sales > 0 || d.expenses > 0) ? (
            performanceTab === 'sales' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.salesOverTime}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${currency} ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Daily Sales (GH₵)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Net Profit (GH₵)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.salesOverTime}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${currency} ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    dataKey="sales"
                    name="Gross Revenue (GH₵)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Total Expenses (GH₵)"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Calendar className="w-8 h-8 mb-2 text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">No transactions recorded yet this week</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                As transactions and expenses are entered, daily graphical trends will populate here.
              </p>
              {canDoPos && (
                <button
                  onClick={onOpenNewSale}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  + Record First Transaction
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. RECENT SALES SECTION */}
      <div id="recent-sales-section" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Sales & Receipts</h3>
            <p className="text-xs text-slate-400">Latest completed customer checkouts</p>
          </div>
          {canDoPos && (
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              View All Sales <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {stats?.recentSales && stats.recentSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Receipt / Ref</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono font-medium text-emerald-400">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-3 text-slate-300 whitespace-nowrap">
                      {formatAccraDateTime(sale.createdAt)}
                    </td>
                    <td className="py-3 font-medium text-slate-200">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white whitespace-nowrap">
                      {formatGHS(sale.total)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : sale.paymentStatus === 'Credit'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                        }`}
                      >
                        {sale.paymentStatus || 'Paid'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onOpenReceipt(sale)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-800 text-emerald-300 text-[11px] font-medium transition"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No sales recorded yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Your sales will appear here after your first transaction.
            </p>
            {canDoPos && (
              <button
                onClick={onOpenNewSale}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                + Start First Sale
              </button>
            )}
          </div>
        )}
      </div>

      {/* STAGE 4J: GROWTH & DECISION SUPPORT DETAILED MODAL */}
      <GrowthIntelligenceModal
        isOpen={showGrowthModal}
        onClose={() => setShowGrowthModal(false)}
        business={business}
        onNavigate={onNavigate}
      />
    </div>
  );
};
